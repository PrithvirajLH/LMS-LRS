import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import { listUsers, getAllEnrollments, type UserEntity, type EnrollmentEntity } from "@/lib/users/user-storage";
import { getTableClient } from "@/lib/azure/table-client";
import { downloadBlob } from "@/lib/azure/blob-client";
import type { StatementEntity, XAPIStatement } from "@/lib/lrs/types";
import { listCourses } from "@/lib/courses/course-storage";

interface ReportRow {
  userName: string;
  email: string;
  employeeId: string;
  provider: string;
  estDuration: number;
  actualTimeSpent: number;
  durationFinal: number;
  coursesAssigned: number;
  coursesCompleted: number;
  completedOnTime: number;
  assignedDate: string;
  dueDate: string;
  completedDate: string;
  completePercent: number;
  compliantPercent: number;
  userStatus: string;
  registrationStep: string;
  tags: string[];
}

// GET /api/admin/reports — Generate training compliance report
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const facility = request.nextUrl.searchParams.get("facility") || undefined;
    const dateFrom = request.nextUrl.searchParams.get("dateFrom") || undefined;
    const dateTo = request.nextUrl.searchParams.get("dateTo") || undefined;

    // 1. Get all users
    const users = await listUsers(facility);

    // 2. Get all enrollments
    const allEnrollments = await getAllEnrollments();

    // 3. Get course metadata for durations
    const courses = await listCourses();
    const courseDurations: Record<string, number> = {};
    for (const course of courses) {
      const mins = parseInt(course.duration) || 0;
      courseDurations[course.rowKey] = mins;
    }

    // 4. Get xAPI completion data from LRS
    const completionMap = await getCompletionData(dateFrom, dateTo);

    // 5. Build report rows — one per user
    const rows: ReportRow[] = [];

    for (const user of users) {
      const userEnrollments = allEnrollments.filter((e) => e.userId === user.rowKey);

      if (userEnrollments.length === 0) continue;

      const coursesAssigned = userEnrollments.length;
      const completedEnrollments = userEnrollments.filter((e) => e.status === "completed");
      const coursesCompleted = completedEnrollments.length;
      const completedOnTimeCount = completedEnrollments.filter((e) => e.completedOnTime).length;

      // Check xAPI for any completions not yet synced to enrollments
      const xapiKey = `account::${user.email}`;
      const xapiCompletions = completionMap[xapiKey] || completionMap[`account::${user.employeeId}`] || [];

      // Calculate durations
      const estDuration = userEnrollments.reduce((sum, e) => sum + (courseDurations[e.courseId] || 0), 0);
      const actualTimeSpent = userEnrollments.reduce((sum, e) => sum + (e.timeSpent || 0), 0);
      const durationFinal = completedEnrollments.reduce((sum, e) => sum + (courseDurations[e.courseId] || 0), 0);

      // Earliest assigned, latest due, latest completed
      const assignedDates = userEnrollments.map((e) => e.assignedDate).filter(Boolean).sort();
      const dueDates = userEnrollments.map((e) => e.dueDate).filter(Boolean).sort();
      const completedDates = completedEnrollments.map((e) => e.completedDate).filter(Boolean).sort();

      const completePercent = coursesAssigned > 0 ? Math.round((coursesCompleted / coursesAssigned) * 100) : 0;
      // Compliant % = completed on time / total assigned
      const compliantPercent = coursesAssigned > 0 ? Math.round((completedOnTimeCount / coursesAssigned) * 100) : 0;

      rows.push({
        userName: user.name,
        email: user.email,
        employeeId: user.employeeId,
        provider: user.facility,
        estDuration,
        actualTimeSpent,
        durationFinal,
        coursesAssigned,
        coursesCompleted,
        completedOnTime: completedOnTimeCount,
        assignedDate: assignedDates[0] || "",
        dueDate: dueDates[dueDates.length - 1] || "",
        completedDate: completedDates[completedDates.length - 1] || "",
        completePercent,
        compliantPercent,
        userStatus: user.status,
        registrationStep: coursesCompleted === coursesAssigned ? "complete" : "in_progress",
        tags: user.tags ? user.tags.split(",") : [],
      });
    }

    // Sort by name
    rows.sort((a, b) => a.userName.localeCompare(b.userName));

    return NextResponse.json({
      rows,
      summary: {
        totalLearners: rows.length,
        totalCompliant: rows.filter((r) => r.compliantPercent === 100).length,
        totalComplete: rows.filter((r) => r.completePercent === 100).length,
        avgCompletePercent: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.completePercent, 0) / rows.length) : 0,
        avgCompliantPercent: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.compliantPercent, 0) / rows.length) : 0,
      },
      facilities: [...new Set(rows.map((r) => r.provider))],
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    console.error("GET /api/admin/reports error:", e);
    return NextResponse.json({ error: true, message: "Failed to generate report" }, { status: 500 });
  }
}

/**
 * Query xAPI statements for completion data.
 * Returns a map of actor IFI → [{ courseId, completedDate, score, duration }]
 */
async function getCompletionData(
  dateFrom?: string,
  dateTo?: string
): Promise<Record<string, Array<{ activityId: string; completedDate: string; score: number; duration: number }>>> {
  const stmtTable = await getTableClient("statements");
  const result: Record<string, Array<{ activityId: string; completedDate: string; score: number; duration: number }>> = {};

  // Query for completed and passed verbs
  const now = new Date();
  const partitions: string[] = [];
  const start = dateFrom ? new Date(dateFrom) : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const end = dateTo ? new Date(dateTo) : now;

  const current = new Date(start.getUTCFullYear(), start.getUTCMonth(), 1);
  const endMonth = new Date(end.getUTCFullYear(), end.getUTCMonth(), 1);

  while (current <= endMonth) {
    const pk = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`;
    partitions.push(pk);
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  for (const pk of partitions) {
    const filter = `PartitionKey eq '${pk}' and (verbId eq 'http://adlnet.gov/expapi/verbs/completed' or verbId eq 'http://adlnet.gov/expapi/verbs/passed')`;

    const iter = stmtTable.listEntities<StatementEntity>({
      queryOptions: { filter },
    });

    for await (const entity of iter) {
      const key = `${entity.actorIfiType}::${entity.actorIfiValue}`;

      if (!result[key]) result[key] = [];

      // Get score from blob if available
      let score = 0;
      let duration = 0;
      try {
        const json = await downloadBlob("statements", `${entity.statementId}.json`);
        const stmt = JSON.parse(json) as XAPIStatement;
        if (stmt.result?.score?.scaled) score = Math.round(stmt.result.score.scaled * 100);
        if (stmt.result?.score?.raw) score = stmt.result.score.raw;
        // Parse duration if available
        if (stmt.result?.duration) {
          const durMatch = stmt.result.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (durMatch) {
            duration = (parseInt(durMatch[1] || "0") * 60) + parseInt(durMatch[2] || "0") + Math.round(parseInt(durMatch[3] || "0") / 60);
          }
        }
      } catch {
        // Skip blob read errors
      }

      result[key].push({
        activityId: entity.objectId,
        completedDate: entity.stored,
        score,
        duration,
      });
    }
  }

  return result;
}
