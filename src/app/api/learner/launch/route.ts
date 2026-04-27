import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCourse, getCourselaunchUrl, getCourselaunchUrlWithSas, type CourseEntity } from "@/lib/courses/course-storage";
import { evaluateCompletion } from "@/lib/courses/completion";
import { updateEnrollment } from "@/lib/users/user-storage";
import { mintLaunchToken } from "@/lib/lrs/launch-tokens";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { LaunchQuerySchema } from "@/lib/schemas";

/**
 * Calculate course progress from xAPI statements.
 * Progress is the fraction of the course's modules the learner has touched,
 * capped at 99% unless the server-side evaluator says the learner has
 * actually completed the course (verbs/completed AND the score gate, when
 * the course has an assessment).
 */
async function getCourseProgress(email: string, course: CourseEntity): Promise<number> {
  const activityId = course.activityId;
  if (!activityId) return 0;
  try {
    const decision = await evaluateCompletion(course, email);
    if (decision.shouldComplete) return 100;

    const moduleCount = course.moduleCount || 0;
    if (moduleCount > 0 && decision.uniqueModules > 0) {
      return Math.min(Math.round((decision.uniqueModules / moduleCount) * 100), 99);
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

    const parsed = LaunchQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { courseId } = parsed.data;

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

    // Audit course launch (HIPAA: who accessed what training, when)
    audit({
      action: "course.launch",
      actorId: session.userId,
      actorName: session.userName,
      actorRole: session.role,
      targetType: "course",
      targetId: courseId,
      summary: `${session.userName} launched "${course.title}"`,
      details: { courseId, activityId: course.activityId },
      ip: getClientIp(request),
    });

    // Generate both URLs — player will try public first, SAS as fallback
    const publicUrl = getCourselaunchUrl(course.blobBasePath, course.launchFile);
    const sasUrl = getCourselaunchUrlWithSas(course.blobBasePath, course.launchFile);

    // Proxy URL — serves files through Next.js, no public blob access needed
    const proxyUrl = `/api/courses/${course.blobBasePath}${course.launchFile}`;

    // Current progress from xAPI statements (so the player starts at the right %)
    const progress = await getCourseProgress(session.email, course);

    // Mint a per-launch token. The browser uses this — instead of a shared
    // API key — to write statements. The server enforces the bound user,
    // course, and registration on every statement (see
    // src/app/api/xapi/statements/route.ts → bindStatementToToken).
    const launchToken = await mintLaunchToken({
      userId: session.userId,
      email: session.email,
      userName: session.userName,
      courseId: course.rowKey as string,
      activityId: course.activityId,
    });
    const auth =
      "Basic " + Buffer.from(`lt:${launchToken.rowKey}`).toString("base64");

    return NextResponse.json({
      courseId: course.rowKey,
      title: course.title,
      category: course.category,
      activityId: course.activityId,
      launchFile: course.launchFile,
      moduleCount: course.moduleCount || 0,
      credits: course.credits || 0,
      progress,
      publicUrl,
      sasUrl,
      proxyUrl,
      auth,
      registration: launchToken.registration,
      tokenExpiresAt: launchToken.expiresAt,
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
