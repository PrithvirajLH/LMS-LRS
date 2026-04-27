import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import {
  createEnrollment,
  bulkEnroll,
  getUserEnrollments,
  getAllEnrollments,
  markEnrollmentCompleted,
} from "@/lib/users/user-storage";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  BulkEnrollSchema,
  CreateEnrollmentSchema,
  CompleteEnrollmentSchema,
} from "@/lib/schemas";

// POST /api/admin/enrollments — Enroll user(s) in a course
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const body = await request.json();

    // Bulk enroll: { userIds: [...], courseId, courseTitle, assignedDate, dueDate }
    if (body && Array.isArray(body.userIds)) {
      const parsed = BulkEnrollSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: true, message: "Validation failed", issues: parsed.error.issues },
          { status: 400 }
        );
      }
      const data = parsed.data;
      const count = await bulkEnroll({
        userIds: data.userIds,
        courseId: data.courseId,
        courseTitle: data.courseTitle || "",
        assignedDate: data.assignedDate || new Date().toISOString().slice(0, 10),
        dueDate: data.dueDate || "",
      });

      audit({
        action: "enrollment.bulk_create",
        actorId: auth.session.userId, actorName: auth.session.userName, actorRole: auth.session.role,
        targetType: "course", targetId: data.courseId,
        summary: `Bulk enrolled ${count} users in ${data.courseTitle || data.courseId}`,
        details: { userIds: data.userIds, courseId: data.courseId, dueDate: data.dueDate },
        ip: getClientIp(request),
      });

      return NextResponse.json({ enrolled: count }, { status: 201 });
    }

    // Single enroll: { userId, courseId, courseTitle, assignedDate, dueDate }
    const parsed = CreateEnrollmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { userId, courseId, courseTitle, assignedDate, dueDate } = parsed.data;

    const enrollment = await createEnrollment({
      userId,
      courseId,
      courseTitle: courseTitle || "",
      assignedDate: assignedDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || "",
    });

    audit({
      action: "enrollment.create",
      actorId: auth.session.userId, actorName: auth.session.userName, actorRole: auth.session.role,
      targetType: "enrollment", targetId: `${userId}:${courseId}`,
      summary: `Enrolled user ${userId} in ${courseTitle || courseId}`,
      details: { userId, courseId, dueDate },
      ip: getClientIp(request),
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("POST /api/admin/enrollments failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to create enrollment" }, { status: 500 });
  }
}

// GET /api/admin/enrollments — List enrollments (optionally by userId)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const userId = request.nextUrl.searchParams.get("userId");

    if (userId) {
      const enrollments = await getUserEnrollments(userId);
      return NextResponse.json({ enrollments });
    }

    const enrollments = await getAllEnrollments();
    return NextResponse.json({ enrollments });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("GET /api/admin/enrollments failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to list enrollments" }, { status: 500 });
  }
}

// PATCH /api/admin/enrollments — Mark enrollment as completed
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const parsed = CompleteEnrollmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { userId, courseId, completedDate, score, timeSpent } = parsed.data;

    const effectiveCompletedDate = completedDate || new Date().toISOString();
    const effectiveScore = score || 0;
    const effectiveTimeSpent = timeSpent || 0;

    await markEnrollmentCompleted(
      userId,
      courseId,
      effectiveCompletedDate,
      effectiveScore,
      effectiveTimeSpent
    );

    audit({
      action: "enrollment.complete",
      actorId: auth.session.userId,
      actorName: auth.session.userName,
      actorRole: auth.session.role,
      targetType: "enrollment",
      targetId: `${userId}:${courseId}`,
      summary: `Marked enrollment ${userId}:${courseId} completed (score=${effectiveScore})`,
      details: {
        userId,
        courseId,
        score: effectiveScore,
        timeSpent: effectiveTimeSpent,
        completedDate: effectiveCompletedDate,
      },
      ip: getClientIp(request),
    });

    return NextResponse.json({ userId, courseId, status: "completed" });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("PATCH /api/admin/enrollments failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to update enrollment" }, { status: 500 });
  }
}
