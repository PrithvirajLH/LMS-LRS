import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserEnrollments, markEnrollmentCompleted } from "@/lib/users/user-storage";
import { getAllCoursesMap, getCourselaunchUrl } from "@/lib/courses/course-storage";
import { evaluateCompletion } from "@/lib/courses/completion";
import { getTableClient } from "@/lib/azure/table-client";
import { downloadBlob } from "@/lib/azure/blob-client";
import { logger } from "@/lib/logger";
import type { StatementEntity, XAPIStatement } from "@/lib/lrs/types";

// GET /api/learner/dashboard — Current user's dashboard data
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    // ── Batch: load enrollments, xAPI progress, and ALL courses in parallel ──
    const [enrollments, xapiProgress, courseMap] = await Promise.all([
      getUserEnrollments(session.userId),
      getXapiProgress(session.email),
      getAllCoursesMap(), // Single scan, cached 5 min — replaces N getCourse() calls
    ]);

    // Build course data from enrollments + cached course map
    const courses = [];
    for (const enrollment of enrollments) {
      const course = courseMap.get(enrollment.courseId) || null;
      const launchUrl = course ? getCourselaunchUrl(course.blobBasePath, course.launchFile) : "";

      // Check xAPI for this course's status (sub-activity coverage stats)
      const activityId = course?.activityId || "";
      const xapi = xapiProgress[activityId];
      let status = enrollment.status;
      let progress = 0;
      let score = enrollment.score;
      let completedDate = enrollment.completedDate;

      // Re-evaluate completion server-side. The score gate (per-course or
      // org-wide passing threshold) lives in evaluateCompletion — we no
      // longer trust whatever score the client put on the verbs/completed
      // statement.
      const decision = course
        ? await evaluateCompletion(course, session.email)
        : null;

      if (decision?.shouldComplete) {
        status = "completed";
        progress = 100;
        score = decision.score || score;
        completedDate = decision.completedDate || completedDate;

        // Auto-sync: mark enrollment as completed once the gate passes
        if (enrollment.status !== "completed") {
          try {
            await markEnrollmentCompleted(
              enrollment.userId,
              enrollment.courseId,
              completedDate,
              score,
              xapi?.timeSpent || 0
            );
          } catch { /* ignore sync errors */ }
        }
      } else if (xapi?.hasStatements || decision?.hasStatements) {
        if (status === "assigned") status = "in_progress";

        const totalModules = course?.moduleCount || 0;
        const touchedModules = decision?.uniqueModules || xapi?.uniqueModules || 0;

        if (totalModules > 0 && touchedModules > 0) {
          progress = Math.min(Math.round((touchedModules / totalModules) * 100), 99);
        } else {
          progress = 5;
        }
      }

      if (status === "completed") progress = 100;

      courses.push({
        id: enrollment.courseId,
        title: enrollment.courseTitle || course?.title || "Unknown Course",
        description: course?.description || "",
        category: course?.category || "",
        duration: course?.duration || "",
        credits: course?.credits || 0,
        creditsEarned: status === "completed" ? (course?.credits || 0) : 0,
        progress,
        status,
        dueDate: enrollment.dueDate,
        assignedDate: enrollment.assignedDate,
        completedDate,
        score,
        timeSpent: xapi?.timeSpent || enrollment.timeSpent,
        completedOnTime: enrollment.completedOnTime,
        launchUrl,
        color: course?.color || "from-[#445A73] to-[#A8BDD4]",
        thumbnailUrl: course?.thumbnailUrl || "",
        totalModules: course?.moduleCount || 0,
        completedModules: xapi?.uniqueModules || 0,
      });
    }

    // Get last xAPI statement for "continue where you left off"
    // Uses a single lightweight query — no blob downloads unless we find one
    let lastActivity = null;
    try {
      const stmtTable = await getTableClient("statements");
      const actorIfiValue = `https://lms.creativeminds.com::${session.email}`.replace(/'/g, "''");
      const now = new Date();
      const pk = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

      const iter = stmtTable.listEntities<StatementEntity>({
        queryOptions: {
          filter: `PartitionKey eq '${pk}' and actorIfiType eq 'account' and actorIfiValue eq '${actorIfiValue}'`,
        },
      });

      for await (const entity of iter) {
        if (!lastActivity) {
          try {
            const json = await downloadBlob("statements", `${entity.statementId}.json`);
            const stmt = JSON.parse(json) as XAPIStatement;
            const objName = (stmt.object as { definition?: { name?: Record<string, string> } }).definition?.name;
            const moduleName = objName ? Object.values(objName)[0] : null;

            const activityId = entity.objectId;
            let courseTitle = moduleName || activityId;
            let moduleLabel = "";
            let resumeCourseId: string | undefined;

            // Match against cached course map (no extra DB calls)
            for (const [cId, c] of courseMap) {
              if (c.activityId && activityId.startsWith(c.activityId)) {
                courseTitle = c.title;
                resumeCourseId = cId;
                if (moduleName && moduleName !== courseTitle) {
                  moduleLabel = moduleName;
                }
                break;
              }
            }

            lastActivity = {
              courseTitle,
              moduleName: moduleLabel,
              courseId: resumeCourseId,
              activityId,
              timestamp: entity.stored,
              verb: entity.verbId.split("/").pop(),
            };
          } catch { /* skip */ }
        }
        break;
      }
    } catch { /* no xAPI data yet */ }

    // Calculate stats
    const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
    const earnedCredits = courses.reduce((s, c) => s + c.creditsEarned, 0);
    const completed = courses.filter((c) => c.status === "completed").length;
    const inProgress = courses.filter((c) => c.status === "in_progress").length;
    const overdue = courses.filter((c) => c.dueDate && new Date(c.dueDate) < new Date() && c.status !== "completed").length;

    // CE credit expiration counts (only completed enrollments with expiresAt)
    const { getExpirationStatus } = await import("@/lib/courses/expiration");
    let expiringSoon = 0;
    let expired = 0;
    for (const enr of enrollments) {
      if (enr.status !== "completed" || !enr.expiresAt) continue;
      const status = getExpirationStatus(enr.expiresAt);
      if (status === "expiring_soon") expiringSoon++;
      else if (status === "expired") expired++;
    }

    const upcoming = courses
      .filter((c) => c.dueDate && c.status !== "completed")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const nextDeadline = upcoming[0] || null;
    const daysUntilDeadline = nextDeadline
      ? Math.ceil((new Date(nextDeadline.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return NextResponse.json({
      user: {
        name: session.userName,
        email: session.email,
        role: session.role,
        facility: session.facility,
      },
      courses,
      stats: {
        totalCourses: courses.length,
        completed,
        inProgress,
        overdue,
        totalCredits,
        earnedCredits,
        expiringSoon,
        expired,
      },
      lastActivity,
      nextDeadline: nextDeadline ? {
        courseTitle: nextDeadline.title,
        daysRemaining: daysUntilDeadline,
      } : null,
    });
  } catch (e) {
    logger.error("GET /api/learner/dashboard failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to load dashboard" }, { status: 500 });
  }
}

/**
 * Query xAPI statements to determine per-course progress for a learner.
 */
async function getXapiProgress(email: string): Promise<Record<string, {
  hasStatements: boolean;
  completed: boolean;
  score: number;
  completedDate: string;
  timeSpent: number;
  progress: number;
  uniqueModules: number;
}>> {
  const result: Record<string, {
    hasStatements: boolean;
    completed: boolean;
    score: number;
    completedDate: string;
    timeSpent: number;
    progress: number;
    uniqueModules: number;
    moduleIds: Set<string>;
  }> = {};

  try {
    const stmtTable = await getTableClient("statements");
    const actorIfiValue = `https://lms.creativeminds.com::${email.replace(/'/g, "''")}`;
    const now = new Date();

    // Scan last 3 months
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

      const filter = `PartitionKey eq '${pk}' and actorIfiType eq 'account' and actorIfiValue eq '${actorIfiValue}'`;
      const iter = stmtTable.listEntities<StatementEntity>({
        queryOptions: { filter },
      });

      for await (const entity of iter) {
        const activityId = entity.objectId;
        if (!activityId) continue;

        let courseRootId = activityId;
        let isSubActivity = false;

        if (activityId.includes("urn:articulate:storyline:")) {
          const storylineBase = activityId.match(/(urn:articulate:storyline:[^/]+)/);
          if (storylineBase) {
            courseRootId = storylineBase[1];
            isSubActivity = activityId !== courseRootId;
          }
        }

        if (!result[courseRootId]) {
          result[courseRootId] = {
            hasStatements: false,
            completed: false,
            score: 0,
            completedDate: "",
            timeSpent: 0,
            progress: 0,
            uniqueModules: 0,
            moduleIds: new Set(),
          };
        }

        result[courseRootId].hasStatements = true;

        if (isSubActivity) {
          result[courseRootId].moduleIds.add(activityId);
        }

        // Check for completion on the course root
        if (entity.verbId === "http://adlnet.gov/expapi/verbs/completed" && activityId === courseRootId) {
          result[courseRootId].completed = true;
          result[courseRootId].completedDate = entity.stored;
          result[courseRootId].progress = 100;

          try {
            const json = await downloadBlob("statements", `${entity.statementId}.json`);
            const stmt = JSON.parse(json) as XAPIStatement;
            if (stmt.result?.score?.scaled) result[courseRootId].score = Math.round(stmt.result.score.scaled * 100);
            if (stmt.result?.score?.raw) result[courseRootId].score = stmt.result.score.raw;
          } catch { /* skip */ }
        }
      }
    }

    for (const key of Object.keys(result)) {
      result[key].uniqueModules = result[key].moduleIds.size;
    }
  } catch {
    // No xAPI data — return empty
  }

  const clean: Record<string, { hasStatements: boolean; completed: boolean; score: number; completedDate: string; timeSpent: number; progress: number; uniqueModules: number }> = {};
  for (const [key, val] of Object.entries(result)) {
    clean[key] = {
      hasStatements: val.hasStatements,
      completed: val.completed,
      score: val.score,
      completedDate: val.completedDate,
      timeSpent: val.timeSpent,
      progress: val.progress,
      uniqueModules: val.uniqueModules,
    };
  }
  return clean;
}
