import { v4 as uuidv4 } from "uuid";
import AdmZip from "adm-zip";
import { BlobServiceClient } from "@azure/storage-blob";
import { getTableClient } from "@/lib/azure/table-client";
import { parseTinCanXml, type TinCanManifest } from "./tincan-parser";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;

export interface CourseEntity {
  partitionKey: string;
  rowKey: string; // courseId
  title: string;
  description: string;
  category: string;
  activityId: string;
  launchFile: string;
  blobBasePath: string; // e.g. "courses/abc123/"
  credits: number;
  duration: string;
  accreditation: string;
  moduleCount: number;
  interactionCount: number;
  totalActivities: number;
  status: string; // "draft" | "published" | "archived"
  color: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Ensure the courses container exists
let coursesContainerEnsured = false;
async function getCoursesContainer() {
  const blobService = BlobServiceClient.fromConnectionString(connectionString);
  const container = blobService.getContainerClient("courses");
  if (!coursesContainerEnsured) {
    try {
      await container.createIfNotExists({ access: "blob" });
    } catch (e: unknown) {
      // If public access not allowed by storage account, try without
      try {
        await container.createIfNotExists();
      } catch {
        // Container likely exists already
      }
    }
    coursesContainerEnsured = true;
  }
  return container;
}

/**
 * Upload a Storyline ZIP to Blob Storage.
 * Returns the parsed tincan.xml manifest and the blob base path.
 */
export async function uploadCourseZip(
  zipBuffer: Buffer
): Promise<{ courseId: string; blobBasePath: string; manifest: TinCanManifest }> {
  const courseId = uuidv4().slice(0, 8);
  const blobBasePath = `${courseId}/`;
  const container = await getCoursesContainer();

  // Extract ZIP
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  // Find tincan.xml
  const tincanEntry = entries.find(
    (e) => e.entryName.toLowerCase().endsWith("tincan.xml") && !e.entryName.includes("__MACOSX")
  );

  if (!tincanEntry) {
    throw new Error("No tincan.xml found in ZIP. This does not appear to be a valid Storyline xAPI package.");
  }

  // Parse tincan.xml
  const tincanContent = tincanEntry.getData().toString("utf-8");
  const manifest = parseTinCanXml(tincanContent);

  // Determine the root folder inside the ZIP (if any)
  // Some ZIPs have all files in a subfolder, others at root
  const tincanPath = tincanEntry.entryName;
  const rootPrefix = tincanPath.includes("/")
    ? tincanPath.substring(0, tincanPath.lastIndexOf("/") + 1)
    : "";

  // Upload all files to Blob Storage
  let uploadCount = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (entry.entryName.includes("__MACOSX")) continue;

    // Strip the root prefix so files are at the courseId level
    let relativePath = entry.entryName;
    if (rootPrefix && relativePath.startsWith(rootPrefix)) {
      relativePath = relativePath.substring(rootPrefix.length);
    }

    const blobName = `${blobBasePath}${relativePath}`;
    const blockBlob = container.getBlockBlobClient(blobName);
    const data = entry.getData();

    // Guess content type
    const contentType = getContentType(relativePath);

    await blockBlob.upload(data, data.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    uploadCount++;
  }

  return { courseId, blobBasePath, manifest };
}

/**
 * Save course metadata to Azure Table Storage.
 */
export async function saveCourseMetadata(course: Omit<CourseEntity, "partitionKey">): Promise<CourseEntity> {
  const table = await getTableClient("courses");
  const entity: CourseEntity = {
    partitionKey: "course",
    ...course,
  };

  try {
    await table.createEntity(entity);
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 409) {
      // Already exists — update
      await table.updateEntity(entity, "Replace");
    } else {
      throw e;
    }
  }

  return entity;
}

/**
 * Get all courses from Table Storage.
 */
export async function listCourses(status?: string): Promise<CourseEntity[]> {
  const table = await getTableClient("courses");
  const courses: CourseEntity[] = [];

  let filter = "PartitionKey eq 'course'";
  if (status) {
    filter += ` and status eq '${status}'`;
  }

  const iter = table.listEntities<CourseEntity>({
    queryOptions: { filter },
  });

  for await (const entity of iter) {
    courses.push(entity);
  }

  return courses;
}

/**
 * Get a single course by ID.
 */
export async function getCourse(courseId: string): Promise<CourseEntity | null> {
  const table = await getTableClient("courses");
  try {
    return await table.getEntity<CourseEntity>("course", courseId);
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 404) return null;
    throw e;
  }
}

/**
 * Update course metadata.
 */
export async function updateCourse(courseId: string, updates: Partial<CourseEntity>): Promise<void> {
  const table = await getTableClient("courses");
  await table.updateEntity(
    { partitionKey: "course", rowKey: courseId, ...updates },
    "Merge"
  );
}

/**
 * Get the public blob URL for a course's launch file.
 */
export function getCourselaunchUrl(blobBasePath: string, launchFile: string): string {
  const accountName = connectionString.match(/AccountName=([^;]+)/)?.[1];
  return `https://${accountName}.blob.core.windows.net/courses/${blobBasePath}${launchFile}`;
}

// ── Helpers ──

function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: "text/html",
    htm: "text/html",
    js: "application/javascript",
    css: "text/css",
    json: "application/json",
    xml: "application/xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    webm: "video/webm",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
  };
  return types[ext || ""] || "application/octet-stream";
}
