import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;

/**
 * GET /api/courses/{courseId}/{...filePath}
 *
 * Proxies course files from Azure Blob Storage.
 * No public blob access needed — server reads with connection string.
 * Caches aggressively since course content is immutable once uploaded.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    if (!path || path.length < 2) {
      return NextResponse.json({ error: true, message: "Invalid path" }, { status: 400 });
    }

    const blobPath = path.join("/");
    const blobService = BlobServiceClient.fromConnectionString(connectionString);
    const container = blobService.getContainerClient("courses");
    const blob = container.getBlockBlobClient(blobPath);

    // Check if blob exists
    const exists = await blob.exists();
    if (!exists) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Download blob
    const downloadResponse = await blob.download(0);
    const properties = await blob.getProperties();

    // Read stream to buffer
    const chunks: Buffer[] = [];
    const readableStream = downloadResponse.readableStreamBody;
    if (!readableStream) {
      return new NextResponse("Empty blob", { status: 404 });
    }

    for await (const chunk of readableStream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    // Determine content type
    const contentType = properties.contentType || getContentType(blobPath);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.length),
        "Cache-Control": "public, max-age=86400, immutable", // 24h cache — course files don't change
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("Course proxy error:", e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

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
    ico: "image/x-icon",
    webp: "image/webp",
  };
  return types[ext || ""] || "application/octet-stream";
}
