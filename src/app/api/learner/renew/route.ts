import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserEnrollments, updateEnrollment } from "@/lib/users/user-storage";
import { getCourse } from "@/lib/courses/course-storage";
import { getExpirationStatus } from "@/lib/courses/expiration";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { RenewSchema } from "@/lib/schemas";

/**
 * POST /api/learner/renew — Re-enroll the current user in a course whose
 * CE credit has expired (or is expiring soon).
 *
 * This resets the enrollment back to "assigned" with a fresh due date,
 * clears the prior completion fields, and computes a new dueDate based on
 * the course's standard 14-day window.
 *
 * The audit trail still preserves the original completion via xAPI statements
 * — the LRS retains the historical credit record.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    const parsed = RenewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { courseId } = parsed.data;

    // Verify course exists
    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json({ error: true, message: "Course not found" }, { status: 404 });
    }

    // Find the existing enrollment
    const enrollments = await getUserEnrollments(session.userId);
    const existing = enrollments.find((e) => e.courseId === courseId);
    if (!existing) {
      return NextResponse.json({ error: true, message: "You are not enrolled in this course" }, { status: 404 });
    }

    // Only allow renewal of expired or expiring-soon enrollments
    const status = getExpirationStatus(existing.expiresAt);
    if (status === "valid") {
      return NextResponse.json(
        { error: true, message: "Credit is still valid — renewal not needed yet" },
        { status: 400 }
      );
    }
    if (status === "no_expiry") {
      return NextResponse.json(
        { error: true, message: "This course's credit does not expire" },
        { status: 400 }
      );
    }

    // Reset enrollment to assigned, with fresh dueDate (14 days)
    const today = new Date();
    const newDueDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    await updateEnrollment(session.userId, courseId, {
      status: "assigned",
      assignedDate: today.toISOString().slice(0, 10),
      dueDate: newDueDate,
      completedDate: "",
      score: 0,
      timeSpent: 0,
      completedOnTime: false,
      expiresAt: "",
    });

    audit({
      action: "enrollment.renew",
      actorId: session.userId,
      actorName: session.userName,
      actorRole: session.role,
      targetType: "enrollment",
      targetId: `${session.userId}:${courseId}`,
      summary: `${session.userName} renewed enrollment in "${course.title}" (was ${status})`,
      details: { courseId, previousStatus: status, newDueDate },
      ip: getClientIp(request),
    });

    return NextResponse.json({
      message: "Enrollment renewed. You can now retake the course.",
      courseId,
      dueDate: newDueDate,
    });
  } catch (e) {
    logger.error("POST /api/learner/renew failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to renew enrollment" }, { status: 500 });
  }
}
