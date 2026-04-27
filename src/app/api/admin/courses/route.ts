import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import {
  saveCourseMetadata,
  listCourses,
  updateCourse,
  deleteCourse,
  getCourselaunchUrl,
} from "@/lib/courses/course-storage";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  SaveCourseSchema,
  UpdateCourseSchema,
  DeleteCourseQuerySchema,
} from "@/lib/schemas";

// POST /api/admin/courses — Save course metadata (after upload)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const parsed = SaveCourseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const {
      courseId,
      title,
      description,
      category,
      activityId,
      launchFile,
      blobBasePath,
      credits,
      duration,
      accreditation,
      moduleCount,
      interactionCount,
      totalActivities,
      color,
    } = parsed.data;

    const now = new Date().toISOString();
    const course = await saveCourseMetadata({
      rowKey: courseId,
      title: title || "",
      description: description || "",
      category: category || "Compliance",
      activityId,
      launchFile: launchFile || "index_lms.html",
      blobBasePath,
      credits: credits || 0,
      duration: duration || "",
      accreditation: accreditation || "",
      moduleCount: moduleCount || 0,
      interactionCount: interactionCount || 0,
      totalActivities: totalActivities || 0,
      status: "draft",
      color: color || "from-[#445A73] to-[#A8BDD4]",
      createdAt: now,
      updatedAt: now,
      publishedAt: "",
    });

    // Generate launch URL
    const launchUrl = getCourselaunchUrl(course.blobBasePath, course.launchFile);

    audit({
      action: "course.create",
      actorId: auth.session.userId, actorName: auth.session.userName, actorRole: auth.session.role,
      targetType: "course", targetId: courseId,
      summary: `Created course "${title}"`,
      details: { courseId, title, category, activityId },
      ip: getClientIp(request),
    });

    return NextResponse.json({
      ...course,
      launchUrl,
    }, { status: 201 });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("POST /api/admin/courses failed", { error: e });
    return NextResponse.json(
      { error: true, message: "Failed to save course" },
      { status: 500 }
    );
  }
}

// GET /api/admin/courses — List all courses
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const courses = await listCourses(status);

    // Add launch URLs
    const withUrls = courses.map((c) => ({
      ...c,
      launchUrl: getCourselaunchUrl(c.blobBasePath, c.launchFile),
    }));

    return NextResponse.json({ courses: withUrls });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("GET /api/admin/courses failed", { error: e });
    return NextResponse.json(
      { error: true, message: "Failed to list courses" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/courses — Update course (publish, edit metadata)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const parsed = UpdateCourseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { courseId, ...updates } = parsed.data;

    if (!courseId) {
      return NextResponse.json(
        { error: true, message: "courseId is required" },
        { status: 400 }
      );
    }

    // If publishing, set publishedAt
    if (updates.status === "published" && !updates.publishedAt) {
      updates.publishedAt = new Date().toISOString();
    }

    updates.updatedAt = new Date().toISOString();

    // `updates` may contain `null` for completion-policy fields (clears the
    // override on Azure Table Storage). The CourseEntity types these as
    // `T | undefined`, so cast through the storage layer's loose Partial.
    await updateCourse(courseId, updates as Parameters<typeof updateCourse>[1]);

    audit({
      action: updates.status === "published" ? "course.publish" : "course.update",
      actorId: auth.session.userId, actorName: auth.session.userName, actorRole: auth.session.role,
      targetType: "course", targetId: courseId,
      summary: updates.status === "published" ? `Published course ${courseId}` : `Updated course ${courseId}`,
      details: updates,
      ip: getClientIp(request),
    });

    return NextResponse.json({ courseId, ...updates });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("PATCH /api/admin/courses failed", { error: e });
    return NextResponse.json(
      { error: true, message: "Failed to update course" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/courses — Delete a course (metadata + blobs + enrollments)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    const parsed = DeleteCourseQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { courseId } = parsed.data;

    const result = await deleteCourse(courseId);

    audit({
      action: "course.delete",
      actorId: auth.session.userId,
      actorName: auth.session.userName,
      actorRole: auth.session.role,
      targetType: "course",
      targetId: courseId,
      summary: `Deleted course ${courseId} (${result.blobsDeleted} blobs, ${result.enrollmentsDeleted} enrollments removed)`,
      details: result,
      ip: getClientIp(request),
    });

    return NextResponse.json({
      message: "Course deleted successfully",
      courseId,
      ...result,
    });
  } catch (e) {
    const authResp = handleAuthError(e);
    if (authResp) return authResp;
    const message = e instanceof Error ? e.message : "Failed to delete course";
    logger.error("DELETE /api/admin/courses failed", { error: e });
    return NextResponse.json({ error: true, message }, { status: 500 });
  }
}
