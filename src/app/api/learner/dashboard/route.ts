import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserEnrollments } from "@/lib/users/user-storage";
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

    // Get course details for each enrollment
    const courses = [];
    for (const enrollment of enrollments) {
      const course = await getCourse(enrollment.courseId);
      const launchUrl = course ? getCourselaunchUrl(course.blobBasePath, course.launchFile) : "";

      courses.push({
        id: enrollment.courseId,
        title: enrollment.courseTitle || course?.title || "Unknown Course",
        description: course?.description || "",
        category: course?.category || "",
        duration: course?.duration || "",
        credits: course?.credits || 0,
        creditsEarned: enrollment.status === "completed" ? (course?.credits || 0) : 0,
        progress: enrollment.status === "completed" ? 100 : enrollment.status === "in_progress" ? 50 : 0,
        status: enrollment.status,
        dueDate: enrollment.dueDate,
        assignedDate: enrollment.assignedDate,
        completedDate: enrollment.completedDate,
        score: enrollment.score,
        timeSpent: enrollment.timeSpent,
        completedOnTime: enrollment.completedOnTime,
        launchUrl,
        color: course?.color || "from-[#445A73] to-[#A8BDD4]",
      });
    }

    // Get last xAPI statement for "continue where you left off"
    let lastActivity = null;
    try {
      const stmtTable = await getTableClient("statements");
      const actorIfi = `account::https://lms.creativeminds.com::${session.email}`;
      const now = new Date();
      const pk = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

      const iter = stmtTable.listEntities<StatementEntity>({
        queryOptions: {
          filter: `PartitionKey eq '${pk}' and actorIfiValue eq '${actorIfi.replace(/'/g, "''")}'`,
        },
      });

      for await (const entity of iter) {
        if (!lastActivity) {
          try {
            const json = await downloadBlob("statements", `${entity.statementId}.json`);
            const stmt = JSON.parse(json) as XAPIStatement;
            const objName = (stmt.object as { definition?: { name?: Record<string, string> } }).definition?.name;
            lastActivity = {
              courseTitle: objName ? Object.values(objName)[0] : entity.objectId,
              activityId: entity.objectId,
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
