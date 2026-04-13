import { NextRequest, NextResponse } from "next/server";
import { uploadCourseZip } from "@/lib/courses/course-storage";

// POST /api/admin/courses/upload — Upload a Storyline ZIP
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: true, message: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json({ error: true, message: "File must be a .zip" }, { status: 400 });
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload and parse
    const { courseId, blobBasePath, manifest } = await uploadCourseZip(buffer);

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
    console.error("Course upload error:", e);
    const message = e instanceof Error ? e.message : "Failed to upload course";
    return NextResponse.json({ error: true, message }, { status: 500 });
  }
}
