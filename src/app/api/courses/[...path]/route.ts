import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";
import { getSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;

// CSP for course content. Storyline needs inline scripts + eval, so we keep
// those, but block all external network access (img/connect/frame/form/font
// to 'self' only) so a malicious course can't exfiltrate data anywhere.
// Note: a malicious course can still call our same-origin APIs via
// `window.parent.fetch` because the iframe uses sandbox="allow-same-origin"
// (required for cookie-based auth on this proxy). Full containment requires
// serving courses from a separate subdomain.
const COURSE_CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; " +
  "media-src 'self' blob:; " +
  "font-src 'self' data:; " +
  "connect-src 'self'; " +
  "frame-src 'self'; " +
  "frame-ancestors 'self'; " +
  "form-action 'self'; " +
  "base-uri 'self'; " +
  "object-src 'none'";

/**
 * GET /api/courses/{courseId}/{...filePath}
 *
 * Proxies course files from Azure Blob Storage.
 * CDN-ready: supports ETag conditional requests (304 Not Modified),
 * long-lived immutable caching, and streaming for large files.
 *
 * To add a CDN: point Azure CDN or Cloudflare at this endpoint.
 * The ETag + Cache-Control headers ensure proper cache revalidation.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Require an authenticated session. Course content is no longer
    // available to anonymous internet visitors.
    const sessionId = request.cookies.get("lms_session")?.value;
    if (!sessionId) {
      return new NextResponse("Authentication required", { status: 401 });
    }
    const session = await getSession(sessionId);
    if (!session) {
      return new NextResponse("Session expired", { status: 401 });
    }

    const { path } = await params;
    if (!path || path.length < 2) {
      return NextResponse.json({ error: true, message: "Invalid path" }, { status: 400 });
    }

    // Reject path-traversal attempts. Azure Blob Storage treats ".." as a
    // literal path component (not filesystem traversal), but blocking these
    // is cheap defense-in-depth and stops cross-course access via odd paths.
    if (path.some((seg) => seg === ".." || seg.includes("\\") || seg.includes("\x00"))) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    const blobPath = path.join("/");
    const blobService = BlobServiceClient.fromConnectionString(connectionString);
    const container = blobService.getContainerClient("courses");
    const blob = container.getBlockBlobClient(blobPath);

    // Get blob properties (lightweight — no download)
    let properties;
    try {
      properties = await blob.getProperties();
    } catch (e: unknown) {
      const err = e as { statusCode?: number };
      if (err.statusCode === 404) {
        return new NextResponse("Not Found", { status: 404 });
      }
      throw e;
    }

    const etag = properties.etag || "";
    const contentType = properties.contentType || getContentType(blobPath);
    const contentLength = properties.contentLength || 0;

    // ── ETag-based conditional request (304 Not Modified) ──
    // If the client (or CDN) already has this version, skip the download.
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=604800, immutable", // 7 days
          "Content-Security-Policy": COURSE_CSP,
        },
      });
    }

    // ── Download and stream the blob ──
    const downloadResponse = await blob.download(0);
    const readableStream = downloadResponse.readableStreamBody;
    if (!readableStream) {
      return new NextResponse("Empty blob", { status: 404 });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of readableStream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(contentLength || body.length),
        ETag: etag,
        // Course files are immutable once uploaded — cache for 7 days.
        // CDN or browser revalidates via If-None-Match after expiry.
        "Cache-Control": "public, max-age=604800, immutable",
        // Vary on encoding so CDN can cache gzipped + uncompressed separately
        Vary: "Accept-Encoding",
        // Block exfiltration to external origins from inside the course iframe
        "Content-Security-Policy": COURSE_CSP,
      },
    });
  } catch (e) {
    logger.error("Course proxy error", { error: e });
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
