import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCourse, getCourselaunchUrl, getCourselaunchUrlWithSas } from "@/lib/courses/course-storage";
import { updateEnrollment } from "@/lib/users/user-storage";
import { getTableClient } from "@/lib/azure/table-client";
import type { StatementEntity } from "@/lib/lrs/types";

/**
 * Calculate course progress from xAPI statements.
 * Progress = (unique modules/interactions with statements) / (total modules in course) * 100
 * Capped at 99 unless verb:completed has been received for the course root.
 */
async function getCourseProgress(email: string, activityId: string, moduleCount: number): Promise<number> {
  if (!activityId) return 0;
  try {
    const stmtTable = await getTableClient("statements");
    const actorIfiValue = `https://lms.creativeminds.com::${email}`.replace(/'/g, "''");
    const uniqueModules = new Set<string>();
    let hasCompleted = false;
    const now = new Date();

    // Scan last 3 months for this learner's statements
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const filter = `PartitionKey eq '${pk}' and actorIfiType eq 'account' and actorIfiValue eq '${actorIfiValue}'`;

      const iter = stmtTable.listEntities<StatementEntity>({ queryOptions: { filter } });
      for await (const entity of iter) {
        const objId = entity.objectId;
        if (!objId || !objId.startsWith(activityId)) continue;

        // Course root completion
        if (objId === activityId && entity.verbId === "http://adlnet.gov/expapi/verbs/completed") {
          hasCompleted = true;
        }

        // Track unique sub-activities (modules/interactions)
        if (objId !== activityId) {
          uniqueModules.add(objId);
        }
      }
    }

    if (hasCompleted) return 100;
    if (moduleCount > 0 && uniqueModules.size > 0) {
      return Math.min(Math.round((uniqueModules.size / moduleCount) * 100), 99);
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * GET /api/learner/launch?courseId=xxx
 *
 * Returns the launch URL for a course.
 * Tries public blob URL first, falls back to SAS-signed URL.
 * Also returns the activity ID and course metadata for the player.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    const courseId = request.nextUrl.searchParams.get("courseId");
    if (!courseId) return NextResponse.json({ error: true, message: "courseId required" }, { status: 400 });

    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json({ error: true, message: "Course not found" }, { status: 404 });
    }

    // Mark enrollment as in_progress when course is launched
    try {
      await updateEnrollment(session.userId, courseId, { status: "in_progress" });
    } catch {
      // Enrollment might not exist (legacy courses) — ignore
    }

    // Generate both URLs — player will try public first, SAS as fallback
    const publicUrl = getCourselaunchUrl(course.blobBasePath, course.launchFile);
    const sasUrl = getCourselaunchUrlWithSas(course.blobBasePath, course.launchFile);

    // Proxy URL — serves files through Next.js, no public blob access needed
    const proxyUrl = `/api/courses/${course.blobBasePath}${course.launchFile}`;

    // Current progress from xAPI statements (so the player starts at the right %)
    const progress = await getCourseProgress(session.email, course.activityId, course.moduleCount || 0);

    return NextResponse.json({
      courseId: course.rowKey,
      title: course.title,
      category: course.category,
      activityId: course.activityId,
      launchFile: course.launchFile,
      moduleCount: course.moduleCount || 0,
      progress,
      publicUrl,
      sasUrl,
      proxyUrl,
      actor: {
        account: {
          homePage: "https://lms.creativeminds.com",
          name: session.email,
        },
        name: session.userName,
      },
    });
  } catch (e) {
    const { logger } = await import("@/lib/logger");
    logger.error("GET /api/learner/launch failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to get launch URL" }, { status: 500 });
  }
}
