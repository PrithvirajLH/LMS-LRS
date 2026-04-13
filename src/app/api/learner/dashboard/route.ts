import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserEnrollments, markEnrollmentCompleted } from "@/lib/users/user-storage";
import { getCourse, getCourselaunchUrl } from "@/lib/courses/course-storage";
import { getTableClient } from "@/lib/azure/table-client";
import { downloadBlob } from "@/lib/azure/blob-client";
import type { StatementEntity, XAPIStatement } from "@/lib/lrs/types";

// GET /api/learner/dashboard — Current user's dashboard data
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    // Get enrollments
    const enrollments = await getUserEnrollments(session.userId);

    // Check xAPI for completions and progress per course
    const xapiProgress = await getXapiProgress(session.email);

    // Get course details for each enrollment
    const courses = [];
    for (const enrollment of enrollments) {
      const course = await getCourse(enrollment.courseId);
      const launchUrl = course ? getCourselaunchUrl(course.blobBasePath, course.launchFile) : "";
      const activityId = course?.activityId || "";

      // Check xAPI for this course's status
      const xapi = xapiProgress[activityId];
      let status = enrollment.status;
      let progress = 0;
      let score = enrollment.score;
      let completedDate = enrollment.completedDate;

      if (xapi?.completed) {
        status = "completed";
        progress = 100;
        score = xapi.score || score;
        completedDate = xapi.completedDate || completedDate;

        // Auto-sync: mark enrollment as completed if xAPI says so
        if (enrollment.status !== "completed") {
          try {
            await markEnrollmentCompleted(
              enrollment.userId,
              enrollment.courseId,
              completedDate,
              score,
              xapi.timeSpent || 0
            );
          } catch { /* ignore sync errors */ }
        }
      } else if (xapi?.hasStatements) {
        if (status === "assigned") status = "in_progress";

        // Calculate progress from unique modules interacted with vs total modules in course
        const totalModules = course?.moduleCount || 0;
        const touchedModules = xapi.uniqueModules || 0;

        if (totalModules > 0 && touchedModules > 0) {
          progress = Math.min(Math.round((touchedModules / totalModules) * 100), 99); // Cap at 99 — 100 is only for verb:completed
        } else {
          progress = 5; // Minimal — at least launched
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
        totalModules: course?.moduleCount || 0,
        completedModules: xapi?.uniqueModules || 0,
      });
    }

    // Get last xAPI statement for "continue where you left off"
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

            // Find the parent course title from enrollments
            // Storyline IDs: urn:articulate:storyline:{courseId}/{moduleId}
            const activityId = entity.objectId;
            let courseTitle = moduleName || activityId;
            let moduleLabel = "";

            // Match to an enrolled course by checking if the activity ID starts with the course's activity ID
            const matchedCourse = courses.find((c) => {
              const course = c as { id: string; title: string };
              // Check if this xAPI activity belongs to any enrolled course
              return activityId.startsWith(activityId.split("/")[0]);
            });

            // Better: look through enrolled courses to find one whose activityId is a prefix
            for (const c of courses) {
              const enrolledCourse = await getCourse(c.id);
              if (enrolledCourse?.activityId && activityId.startsWith(enrolledCourse.activityId)) {
                courseTitle = c.title;
                if (moduleName && moduleName !== courseTitle) {
                  moduleLabel = moduleName;
                }
                break;
              }
            }

            // Find the enrollment courseId for the resume button
            let resumeCourseId: string | undefined;
            for (const c of courses) {
              const enrolledCourse = await getCourse(c.id);
              if (enrolledCourse?.activityId && activityId.startsWith(enrolledCourse.activityId)) {
                resumeCourseId = c.id;
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

    // Next deadline
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
      },
      lastActivity,
      nextDeadline: nextDeadline ? {
        courseTitle: nextDeadline.title,
        daysRemaining: daysUntilDeadline,
      } : null,
    });
  } catch (e) {
    console.error("GET /api/learner/dashboard error:", e);
    return NextResponse.json({ error: true, message: "Failed to load dashboard" }, { status: 500 });
  }
}

/**
 * Query xAPI statements to determine per-course progress for a learner.
 * Progress = unique modules with statements / total modules in course.
 *
 * Storyline activity IDs follow: urn:articulate:storyline:{courseId}/{moduleId}
 * So a statement for urn:articulate:storyline:ABC/XYZ means module XYZ of course ABC.
 * We group by course root ID and count unique sub-activity IDs.
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

        // Determine the root course activity ID
        // Storyline format: urn:articulate:storyline:{courseId}/{moduleId}/{interactionId}
        // The course root is everything before the first /moduleId
        const parts = activityId.split("/");
        // Root course ID is the base (e.g., urn:articulate:storyline:ABC)
        // If it has sub-parts, first part is the course
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

        // Track unique module/interaction IDs for progress calculation
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

    // Calculate uniqueModules count from sets
    for (const key of Object.keys(result)) {
      result[key].uniqueModules = result[key].moduleIds.size;
    }
  } catch {
    // No xAPI data — return empty
  }

  // Strip the Set before returning (not serializable)
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
