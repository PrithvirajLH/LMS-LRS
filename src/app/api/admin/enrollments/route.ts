import { requireAuth, isAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import {
  createEnrollment,
  bulkEnroll,
  getUserEnrollments,
  getAllEnrollments,
  markEnrollmentCompleted,
} from "@/lib/users/user-storage";

// POST /api/admin/enrollments — Enroll user(s) in a course
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const body = await request.json();

    // Bulk enroll: { userIds: [...], courseId, courseTitle, assignedDate, dueDate }
    if (body.userIds && Array.isArray(body.userIds)) {
      const count = await bulkEnroll({
        userIds: body.userIds,
        courseId: body.courseId,
        courseTitle: body.courseTitle,
        assignedDate: body.assignedDate || new Date().toISOString().slice(0, 10),
        dueDate: body.dueDate,
      });
      return NextResponse.json({ enrolled: count }, { status: 201 });
    }

    // Single enroll: { userId, courseId, courseTitle, assignedDate, dueDate }
    const { userId, courseId, courseTitle, assignedDate, dueDate } = body;
    if (!userId || !courseId) {
      return NextResponse.json({ error: true, message: "userId and courseId are required" }, { status: 400 });
    }

    const enrollment = await createEnrollment({
      userId,
      courseId,
      courseTitle: courseTitle || "",
      assignedDate: assignedDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || "",
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/enrollments error:", e);
    return NextResponse.json({ error: true, message: "Failed to create enrollment" }, { status: 500 });
  }
}

// GET /api/admin/enrollments — List enrollments (optionally by userId)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const userId = request.nextUrl.searchParams.get("userId");

    if (userId) {
      const enrollments = await getUserEnrollments(userId);
      return NextResponse.json({ enrollments });
    }

    const enrollments = await getAllEnrollments();
    return NextResponse.json({ enrollments });
  } catch (e) {
    console.error("GET /api/admin/enrollments error:", e);
    return NextResponse.json({ error: true, message: "Failed to list enrollments" }, { status: 500 });
  }
}

// PATCH /api/admin/enrollments — Mark enrollment as completed
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const body = await request.json();
    const { userId, courseId, completedDate, score, timeSpent } = body;

    if (!userId || !courseId) {
      return NextResponse.json({ error: true, message: "userId and courseId are required" }, { status: 400 });
    }

    await markEnrollmentCompleted(
      userId,
      courseId,
      completedDate || new Date().toISOString(),
      score || 0,
      timeSpent || 0
    );

    return NextResponse.json({ userId, courseId, status: "completed" });
  } catch (e) {
    console.error("PATCH /api/admin/enrollments error:", e);
    return NextResponse.json({ error: true, message: "Failed to update enrollment" }, { status: 500 });
  }
}
