import { requireAuth, isAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import {
  saveCourseMetadata,
  listCourses,
  updateCourse,
  getCourselaunchUrl,
  type CourseEntity,
} from "@/lib/courses/course-storage";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// POST /api/admin/courses — Save course metadata (after upload)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const body = await request.json();

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
    } = body;

    if (!courseId || !title || !activityId || !blobBasePath) {
      return NextResponse.json(
        { error: true, message: "courseId, title, activityId, and blobBasePath are required" },
        { status: 400 }
      );
    }

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
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const courses = await listCourses(status);

    // Add launch URLs
    const withUrls = courses.map((c) => ({
      ...c,
      launchUrl: getCourselaunchUrl(c.blobBasePath, c.launchFile),
    }));

    return NextResponse.json({ courses: withUrls });
  } catch (e) {
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
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const body = await request.json();
    const { courseId, ...updates } = body;

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

    await updateCourse(courseId, updates);

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
    logger.error("PATCH /api/admin/courses failed", { error: e });
    return NextResponse.json(
      { error: true, message: "Failed to update course" },
      { status: 500 }
    );
  }
}
