import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserEnrollments } from "@/lib/users/user-storage";
import { getCourse } from "@/lib/courses/course-storage";
import { getExpirationStatus, daysUntilExpiry } from "@/lib/courses/expiration";

// GET /api/learner/completions — Current user's completed courses (with CE expiration)
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    const enrollments = await getUserEnrollments(session.userId);
    const completed = enrollments.filter((e) => e.status === "completed");

    const completions = [];
    for (const enrollment of completed) {
      const course = await getCourse(enrollment.courseId);
      completions.push({
        id: enrollment.courseId,
        title: enrollment.courseTitle || course?.title || "Unknown",
        category: course?.category || "",
        completedDate: enrollment.completedDate,
        score: enrollment.score,
        credits: course?.credits || 0,
        duration: course?.duration || "",
        accreditation: course?.accreditation || "",
        timeSpent: enrollment.timeSpent,
        // CE credit expiration
        expiresDate: enrollment.expiresAt || "",
        expirationStatus: getExpirationStatus(enrollment.expiresAt),
        daysUntilExpiry: daysUntilExpiry(enrollment.expiresAt),
        validityPeriodMonths: course?.validityPeriodMonths || 0,
      });
    }

    completions.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());

    // Summary: counts by expiration status
    const summary = {
      total: completions.length,
      valid: completions.filter((c) => c.expirationStatus === "valid").length,
      expiringSoon: completions.filter((c) => c.expirationStatus === "expiring_soon").length,
      expired: completions.filter((c) => c.expirationStatus === "expired").length,
      noExpiry: completions.filter((c) => c.expirationStatus === "no_expiry").length,
    };

    return NextResponse.json({ completions, summary });
  } catch (e) {
    const { logger } = await import("@/lib/logger");
    logger.error("GET /api/learner/completions failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to load completions" }, { status: 500 });
  }
}
