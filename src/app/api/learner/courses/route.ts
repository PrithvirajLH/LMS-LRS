import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listCourses, getCourse, getCourselaunchUrl } from "@/lib/courses/course-storage";
import { getUserEnrollments } from "@/lib/users/user-storage";

// GET /api/learner/courses — Published courses for catalog
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    // Get all published courses (for catalog browsing)
    const publishedCourses = await listCourses("published");

    // Get user's enrollments — includes courses that may have been unpublished
    const enrollments = await getUserEnrollments(session.userId);
    const enrollmentMap = new Map(enrollments.map((e) => [e.courseId, e.status]));

    // Also fetch any unpublished courses the user is enrolled in
    const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
    const publishedIds = new Set(publishedCourses.map((c) => c.rowKey));

    // Merge: published courses + enrolled-but-unpublished courses
    const allCourses = [...publishedCourses];
    for (const enrollment of enrollments) {
      if (!publishedIds.has(enrollment.courseId)) {
        // User is enrolled in an unpublished course — still show it
        const course = await getCourse(enrollment.courseId);
        if (course) allCourses.push(course);
      }
    }

    const courses = allCourses.map((c) => {
      const status = enrollmentMap.get(c.rowKey);
      let enrollStatus: string;
      if (!status) enrollStatus = "available";
      else if (status === "completed") enrollStatus = "completed";
      else if (status === "in_progress") enrollStatus = "in_progress";
      else enrollStatus = "enrolled"; // "assigned"

      return {
      id: c.rowKey,
      title: c.title,
      description: c.description,
      category: c.category,
      duration: c.duration,
      credits: c.credits,
      modules: c.moduleCount,
      accreditation: c.accreditation,
      color: c.color || "from-[#445A73] to-[#A8BDD4]",
      enrollStatus,
      launchUrl: getCourselaunchUrl(c.blobBasePath, c.launchFile),
    };
    });

    return NextResponse.json({ courses });
  } catch (e) {
    console.error("GET /api/learner/courses error:", e);
    return NextResponse.json({ error: true, message: "Failed to load courses" }, { status: 500 });
  }
}
