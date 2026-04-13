import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserEnrollments } from "@/lib/users/user-storage";
import { getCourse } from "@/lib/courses/course-storage";

// GET /api/learner/completions — Current user's completed courses
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
      });
    }

    completions.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());

    return NextResponse.json({ completions });
  } catch (e) {
    console.error("GET /api/learner/completions error:", e);
    return NextResponse.json({ error: true, message: "Failed to load completions" }, { status: 500 });
  }
}
