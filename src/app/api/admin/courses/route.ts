import { NextRequest, NextResponse } from "next/server";
import {
  saveCourseMetadata,
  listCourses,
  updateCourse,
  getCourselaunchUrl,
  type CourseEntity,
} from "@/lib/courses/course-storage";

// POST /api/admin/courses — Save course metadata (after upload)
export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({
      ...course,
      launchUrl,
    }, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/courses error:", e);
    return NextResponse.json(
      { error: true, message: "Failed to save course" },
      { status: 500 }
    );
  }
}

// GET /api/admin/courses — List all courses
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const courses = await listCourses(status);

    // Add launch URLs
    const withUrls = courses.map((c) => ({
      ...c,
      launchUrl: getCourselaunchUrl(c.blobBasePath, c.launchFile),
    }));

    return NextResponse.json({ courses: withUrls });
  } catch (e) {
    console.error("GET /api/admin/courses error:", e);
    return NextResponse.json(
      { error: true, message: "Failed to list courses" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/courses — Update course (publish, edit metadata)
export async function PATCH(request: NextRequest) {
  try {
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

    return NextResponse.json({ courseId, ...updates });
  } catch (e) {
    console.error("PATCH /api/admin/courses error:", e);
    return NextResponse.json(
      { error: true, message: "Failed to update course" },
      { status: 500 }
    );
  }
}
