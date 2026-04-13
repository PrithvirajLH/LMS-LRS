import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getTableClient } from "@/lib/azure/table-client";
import { downloadBlob } from "@/lib/azure/blob-client";
import { getUserEnrollments } from "@/lib/users/user-storage";
import { listCourses } from "@/lib/courses/course-storage";
import type { StatementEntity, XAPIStatement } from "@/lib/lrs/types";

// GET /api/learner/reports — Current user's training activity data
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    const stmtTable = await getTableClient("statements");
    const actorIfiValue = `https://lms.creativeminds.com::${session.email}`.replace(/'/g, "''");
    const now = new Date();

    // Build a map of activityId prefix → course title for parent course lookup
    const courses = await listCourses();
    const courseMap: Record<string, string> = {};
    for (const c of courses) {
      if (c.activityId) courseMap[c.activityId] = c.title;
    }

    function findParentCourse(activityId: string): string | undefined {
      // Direct match
      if (courseMap[activityId]) return courseMap[activityId];
      // Storyline: urn:articulate:storyline:{courseId}/{moduleId}
      for (const [prefix, title] of Object.entries(courseMap)) {
        if (activityId.startsWith(prefix)) return title;
      }
      return undefined;
    }

    // Collect all statements for this user across last 12 months
    const statements: Array<{
      verb: string;
      activityId: string;
      activityName: string;
      parentCourse?: string;
      stored: string;
      score?: number;
      duration?: string;
    }> = [];

    const monthlyCompletions: Record<string, number> = {};
    const categoryCompletions: Record<string, number> = {};
    const scores: number[] = [];

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleString("en-US", { month: "short" });

      const filter = `PartitionKey eq '${pk}' and actorIfiType eq 'account' and actorIfiValue eq '${actorIfiValue}'`;
      const iter = stmtTable.listEntities<StatementEntity>({
        queryOptions: { filter },
      });

      for await (const entity of iter) {
        const verbShort = entity.verbId.split("/").pop() || entity.verbId;
        let activityName = entity.objectId;
        let score: number | undefined;
        let duration: string | undefined;

        // Get details from blob
        try {
          const json = await downloadBlob("statements", `${entity.statementId}.json`);
          const stmt = JSON.parse(json) as XAPIStatement;
          const objDef = (stmt.object as { definition?: { name?: Record<string, string> } }).definition;
          if (objDef?.name) activityName = Object.values(objDef.name)[0] || activityName;
          if (stmt.result?.score?.scaled) score = Math.round(stmt.result.score.scaled * 100);
          if (stmt.result?.score?.raw) score = stmt.result.score.raw;
          if (stmt.result?.duration) duration = stmt.result.duration;
        } catch { /* skip blob read */ }

        statements.push({
          verb: verbShort,
          activityId: entity.objectId,
          activityName,
          parentCourse: findParentCourse(entity.objectId),
          stored: entity.stored,
          score,
          duration,
        });

        // Track monthly completions
        if (verbShort === "completed") {
          monthlyCompletions[monthLabel] = (monthlyCompletions[monthLabel] || 0) + 1;
        }

        // Track scores
        if (score !== undefined && (verbShort === "completed" || verbShort === "passed")) {
          scores.push(score);
        }
      }
    }

    // Get enrollments for category data
    const enrollments = await getUserEnrollments(session.userId);
    const completedEnrollments = enrollments.filter(e => e.status === "completed");

    // Build monthly chart data (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("en-US", { month: "short" });
      monthlyData.push({ label, value: monthlyCompletions[label] || 0, max: Math.max(...Object.values(monthlyCompletions), 1) });
    }

    // Score distribution
    const scoreDistribution = [
      { label: "90–100%", value: scores.filter(s => s >= 90).length, max: Math.max(scores.length, 1) },
      { label: "80–89%", value: scores.filter(s => s >= 80 && s < 90).length, max: Math.max(scores.length, 1) },
      { label: "70–79%", value: scores.filter(s => s >= 70 && s < 80).length, max: Math.max(scores.length, 1) },
      { label: "Below 70%", value: scores.filter(s => s < 70).length, max: Math.max(scores.length, 1), color: "var(--amber-400)" },
    ];

    // Activity log (most recent 30)
    const activityLog = statements
      .sort((a, b) => new Date(b.stored).getTime() - new Date(a.stored).getTime())
      .slice(0, 30)
      .map(s => ({
        course: s.activityName,
        parentCourse: s.parentCourse,
        action: s.verb,
        date: s.stored,
        detail: s.score !== undefined ? `Score: ${s.score}%` : undefined,
      }));

    // Calculate actual training time from xAPI durations + session gaps
    let totalTrainingSeconds = 0;

    // Method 1: Sum all result.duration values from statements
    for (const s of statements) {
      if (s.duration) {
        const match = s.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
        if (match) {
          totalTrainingSeconds += (parseInt(match[1] || "0") * 3600) + (parseInt(match[2] || "0") * 60) + parseFloat(match[3] || "0");
        }
      }
    }

    // Method 2: If no durations found, estimate from session time spans
    // Group statements by date, measure time between first and last per session
    if (totalTrainingSeconds === 0 && statements.length > 1) {
      const byDate: Record<string, number[]> = {};
      for (const s of statements) {
        const dateKey = new Date(s.stored).toISOString().slice(0, 10);
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(new Date(s.stored).getTime());
      }
      for (const timestamps of Object.values(byDate)) {
        if (timestamps.length >= 2) {
          timestamps.sort((a, b) => a - b);
          const sessionDuration = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
          // Cap individual sessions at 2 hours to avoid overnight gaps
          totalTrainingSeconds += Math.min(sessionDuration, 7200);
        } else {
          // Single statement — assume 2 minutes minimum
          totalTrainingSeconds += 120;
        }
      }
    } else if (totalTrainingSeconds === 0 && statements.length === 1) {
      totalTrainingSeconds = 120; // Single statement, assume 2 min
    }

    const totalTrainingMins = Math.round(totalTrainingSeconds / 60);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

    // Format training time nicely
    let trainingTimeDisplay: string;
    if (totalTrainingMins >= 60) {
      const hours = Math.floor(totalTrainingMins / 60);
      const mins = totalTrainingMins % 60;
      trainingTimeDisplay = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      trainingTimeDisplay = `${totalTrainingMins}m`;
    }

    return NextResponse.json({
      monthlyData,
      scoreDistribution,
      activityLog,
      summary: {
        totalTrainingTime: trainingTimeDisplay,
        coursesCompleted: completedEnrollments.length,
        avgScore: `${avgScore}%`,
        creditsEarned: completedEnrollments.reduce((s, e) => s + (e.score || 0), 0), // placeholder
        totalStatements: statements.length,
        streak: `${Math.min(Object.keys(monthlyCompletions).length, 12)} months`,
      },
    });
  } catch (e) {
    console.error("GET /api/learner/reports error:", e);
    return NextResponse.json({ error: true, message: "Failed to load reports" }, { status: 500 });
  }
}
