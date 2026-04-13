import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createEnrollment } from "@/lib/users/user-storage";
import { getCourse } from "@/lib/courses/course-storage";

// POST /api/learner/enroll — Self-enroll in a published course
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    const { courseId } = await request.json();
    if (!courseId) return NextResponse.json({ error: true, message: "courseId is required" }, { status: 400 });

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

    return NextResponse.json(enrollment, { status: 201 });
  } catch (e) {
    console.error("POST /api/learner/enroll error:", e);
    return NextResponse.json({ error: true, message: "Failed to enroll" }, { status: 500 });
  }
}
