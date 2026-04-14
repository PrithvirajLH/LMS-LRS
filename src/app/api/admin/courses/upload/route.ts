import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import { uploadCourseZip } from "@/lib/courses/course-storage";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// POST /api/admin/courses/upload — Upload a Storyline ZIP
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: true, message: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json({ error: true, message: "File must be a .zip" }, { status: 400 });
    }

    // Enforce file size limit: 500 MB max
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: true, message: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 500MB.` },
        { status: 413 }
      );
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload and parse
    const { courseId, blobBasePath, manifest } = await uploadCourseZip(buffer);

    audit({
      action: "course.upload",
      actorId: auth.session.userId, actorName: auth.session.userName, actorRole: auth.session.role,
      targetType: "course", targetId: courseId,
      summary: `Uploaded course ZIP "${file.name}" (${Math.round(file.size / 1024)}KB, ${manifest.modules.length} modules)`,
      details: { fileName: file.name, fileSize: file.size, courseId, activityId: manifest.courseActivityId },
      ip: getClientIp(request),
    });

    return NextResponse.json({
      courseId,
      blobBasePath,
      manifest: {
        activityId: manifest.courseActivityId,
        title: manifest.courseName,
        launchFile: manifest.launchFile,
        moduleCount: manifest.modules.length,
        interactionCount: manifest.interactions.length,
        totalActivities: manifest.totalActivities,
        modules: manifest.modules.map((m) => ({
          id: m.id,
          name: m.name,
          type: m.type,
        })),
        interactions: manifest.interactions.map((i) => ({
          id: i.id,
          name: i.name,
          type: i.interactionType,
        })),
      },
    });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("Course upload failed", { error: e });
    const message = e instanceof Error ? e.message : "Failed to upload course";
    return NextResponse.json({ error: true, message }, { status: 500 });
  }
}
