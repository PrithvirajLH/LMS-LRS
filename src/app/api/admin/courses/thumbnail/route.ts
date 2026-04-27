import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";
import { getCourse, updateCourse } from "@/lib/courses/course-storage";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;

// Allowed MIME types and their canonical file extensions.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Max thumbnail size — 2 MB.
const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024;

/**
 * Validate that a courseId is safe to use as a blob path component.
 * Blocks path traversal, slashes, null bytes, etc. Course IDs in this
 * codebase are uuid slices (8 chars, hex), so we allow [a-zA-Z0-9_-]+.
 */
function isValidCourseId(courseId: string): boolean {
  if (!courseId || courseId.length > 64) return false;
  return /^[a-zA-Z0-9_-]+$/.test(courseId);
}

async function getCoursesContainer() {
  const blobService = BlobServiceClient.fromConnectionString(connectionString);
  return blobService.getContainerClient("courses");
}

/**
 * Delete any existing _thumbnail.* blobs for this course so we don't
 * leave orphans when a learner re-uploads a different format.
 */
async function deleteExistingThumbnails(courseId: string): Promise<void> {
  const container = await getCoursesContainer();
  const prefix = `${courseId}/_thumbnail.`;
  for await (const blob of container.listBlobsFlat({ prefix })) {
    try {
      await container.deleteBlob(blob.name);
    } catch {
      // best-effort cleanup
    }
  }
}

// POST /api/admin/courses/thumbnail — Upload a course thumbnail
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const formData = await request.formData();
    const courseId = formData.get("courseId");
    const file = formData.get("file");

    if (typeof courseId !== "string" || !isValidCourseId(courseId)) {
      return NextResponse.json(
        { error: true, message: "Invalid or missing courseId" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: true, message: "No file uploaded" },
        { status: 400 }
      );
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: true, message: "File must be a JPEG, PNG, or WebP image" },
        { status: 400 }
      );
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      return NextResponse.json(
        {
          error: true,
          message: `File too large (${Math.round(file.size / 1024)}KB). Maximum is 2MB.`,
        },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: true, message: "File is empty" },
        { status: 400 }
      );
    }

    // Verify the course exists before writing anything.
    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json(
        { error: true, message: "Course not found" },
        { status: 404 }
      );
    }

    // Read the file into a buffer.
    const buffer = Buffer.from(await file.arrayBuffer());

    // Remove any prior thumbnail (different ext) before writing the new one.
    await deleteExistingThumbnails(courseId);

    const blobName = `${courseId}/_thumbnail.${ext}`;
    const container = await getCoursesContainer();
    const blockBlob = container.getBlockBlobClient(blobName);
    await blockBlob.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: file.type },
    });

    // Use the proxy URL so access still requires auth via /api/courses/...
    const thumbnailUrl = `/api/courses/${courseId}/_thumbnail.${ext}`;
    await updateCourse(courseId, {
      thumbnailUrl,
      updatedAt: new Date().toISOString(),
    });

    audit({
      action: "course.thumbnail_upload",
      actorId: auth.session.userId,
      actorName: auth.session.userName,
      actorRole: auth.session.role,
      targetType: "course",
      targetId: courseId,
      summary: `Uploaded thumbnail for course "${course.title}"`,
      details: {
        courseId,
        contentType: file.type,
        size: file.size,
        thumbnailUrl,
      },
      ip: getClientIp(request),
    });

    return NextResponse.json({ thumbnailUrl });
  } catch (e) {
    const authResp = handleAuthError(e);
    if (authResp) return authResp;
    logger.error("POST /api/admin/courses/thumbnail failed", { error: e });
    return NextResponse.json(
      { error: true, message: "Failed to upload thumbnail" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/courses/thumbnail?courseId=X — Remove course thumbnail
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const courseId = request.nextUrl.searchParams.get("courseId") || "";

    if (!isValidCourseId(courseId)) {
      return NextResponse.json(
        { error: true, message: "Invalid or missing courseId" },
        { status: 400 }
      );
    }

    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json(
        { error: true, message: "Course not found" },
        { status: 404 }
      );
    }

    await deleteExistingThumbnails(courseId);

    // Clear the field. Azure Tables doesn't support deleting a property via
    // Merge — set it to empty string so the UI can treat falsy as "no thumb".
    await updateCourse(courseId, {
      thumbnailUrl: "",
      updatedAt: new Date().toISOString(),
    });

    audit({
      action: "course.thumbnail_delete",
      actorId: auth.session.userId,
      actorName: auth.session.userName,
      actorRole: auth.session.role,
      targetType: "course",
      targetId: courseId,
      summary: `Removed thumbnail for course "${course.title}"`,
      details: { courseId },
      ip: getClientIp(request),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const authResp = handleAuthError(e);
    if (authResp) return authResp;
    logger.error("DELETE /api/admin/courses/thumbnail failed", { error: e });
    return NextResponse.json(
      { error: true, message: "Failed to delete thumbnail" },
      { status: 500 }
    );
  }
}
