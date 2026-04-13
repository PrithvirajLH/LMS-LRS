import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listCourses, getCourselaunchUrl } from "@/lib/courses/course-storage";
import { getUserEnrollments } from "@/lib/users/user-storage";

// GET /api/learner/courses — Published courses for catalog
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    // Get all published courses
    const allCourses = await listCourses("published");

    // Get user's enrollments to check enrollment status
    const enrollments = await getUserEnrollments(session.userId);
    const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
    const completedCourseIds = new Set(enrollments.filter((e) => e.status === "completed").map((e) => e.courseId));

    const courses = allCourses.map((c) => ({
      id: c.rowKey,
      title: c.title,
      description: c.description,
      category: c.category,
      duration: c.duration,
      credits: c.credits,
      modules: c.moduleCount,
      accreditation: c.accreditation,
      color: c.color || "from-[#445A73] to-[#A8BDD4]",
      enrollStatus: completedCourseIds.has(c.rowKey) ? "completed" : enrolledCourseIds.has(c.rowKey) ? "enrolled" : "available",
      launchUrl: getCourselaunchUrl(c.blobBasePath, c.launchFile),
    }));

    return NextResponse.json({ courses });
  } catch (e) {
    console.error("GET /api/learner/courses error:", e);
    return NextResponse.json({ error: true, message: "Failed to load courses" }, { status: 500 });
  }
}
