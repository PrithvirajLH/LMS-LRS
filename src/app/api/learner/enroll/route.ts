import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createEnrollment } from "@/lib/users/user-storage";
import { getCourse } from "@/lib/courses/course-storage";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { EnrollSchema } from "@/lib/schemas";

// POST /api/learner/enroll — Self-enroll in a published course
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    const parsed = EnrollSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { courseId } = parsed.data;

    // Verify course exists and is published
    const course = await getCourse(courseId);
    if (!course || course.status !== "published") {
      return NextResponse.json({ error: true, message: "Course not found or not available" }, { status: 404 });
    }

    // Create enrollment with 14-day due date
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const enrollment = await createEnrollment({
      userId: session.userId,
      courseId,
      courseTitle: course.title,
      assignedDate: new Date().toISOString().slice(0, 10),
      dueDate,
    });

    audit({
      action: "enrollment.self_enroll",
      actorId: session.userId,
      actorName: session.userName,
      actorRole: session.role,
      targetType: "enrollment",
      targetId: `${session.userId}:${courseId}`,
      summary: `${session.userName} self-enrolled in "${course.title}"`,
      details: { courseId, dueDate },
      ip: getClientIp(request),
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (e) {
    logger.error("POST /api/learner/enroll failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to enroll" }, { status: 500 });
  }
}
