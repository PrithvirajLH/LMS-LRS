import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCourse, getCourselaunchUrl, getCourselaunchUrlWithSas } from "@/lib/courses/course-storage";
import { updateEnrollment } from "@/lib/users/user-storage";

/**
 * GET /api/learner/launch?courseId=xxx
 *
 * Returns the launch URL for a course.
 * Tries public blob URL first, falls back to SAS-signed URL.
 * Also returns the activity ID and course metadata for the player.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });

    const session = await getSession(sessionId);
    if (!session) return NextResponse.json({ error: true, message: "Session expired" }, { status: 401 });

    const courseId = request.nextUrl.searchParams.get("courseId");
    if (!courseId) return NextResponse.json({ error: true, message: "courseId required" }, { status: 400 });

    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json({ error: true, message: "Course not found" }, { status: 404 });
    }

    // Mark enrollment as in_progress when course is launched
    try {
      await updateEnrollment(session.userId, courseId, { status: "in_progress" });
    } catch {
      // Enrollment might not exist (legacy courses) — ignore
    }

    // Generate both URLs — player will try public first, SAS as fallback
    const publicUrl = getCourselaunchUrl(course.blobBasePath, course.launchFile);
    const sasUrl = getCourselaunchUrlWithSas(course.blobBasePath, course.launchFile);

    // Proxy URL — serves files through Next.js, no public blob access needed
    const proxyUrl = `/api/courses/${course.blobBasePath}${course.launchFile}`;

    return NextResponse.json({
      courseId: course.rowKey,
      title: course.title,
      category: course.category,
      activityId: course.activityId,
      launchFile: course.launchFile,
      publicUrl,
      sasUrl,
      proxyUrl,
      actor: {
        account: {
          homePage: "https://lms.creativeminds.com",
          name: session.email,
        },
        name: session.userName,
      },
    });
  } catch (e) {
    console.error("GET /api/learner/launch error:", e);
    return NextResponse.json({ error: true, message: "Failed to get launch URL" }, { status: 500 });
  }
}
