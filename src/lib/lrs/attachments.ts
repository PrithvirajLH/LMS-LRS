import { createHash } from "crypto";
import { uploadBlob, downloadBlob, blobExists } from "@/lib/azure/blob-client";

export interface ParsedAttachment {
  contentType: string;
  hash: string;
  content: Buffer;
}

/**
 * Parse a multipart/mixed xAPI request body.
 * First part is the statement JSON, subsequent parts are binary attachments.
 */
export function parseMultipartMixed(
  body: Buffer,
  boundary: string
): { statementsJson: string; attachments: ParsedAttachment[] } {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts: Buffer[] = [];

  let start = 0;
  while (true) {
    const idx = body.indexOf(boundaryBuffer, start);
    if (idx === -1) break;

    if (start > 0) {
      // Extract content between boundaries (strip trailing \r\n)
      let partContent = body.subarray(start, idx);
      // Remove trailing \r\n before boundary
      if (partContent.length >= 2 && partContent[partContent.length - 2] === 0x0d && partContent[partContent.length - 1] === 0x0a) {
        partContent = partContent.subarray(0, partContent.length - 2);
      }
      if (partContent.length > 0) {
        parts.push(partContent);
      }
    }

    start = idx + boundaryBuffer.length;
    // Skip -- at end (closing boundary)
    if (body[start] === 0x2d && body[start + 1] === 0x2d) break;
    // Skip \r\n after boundary
    if (body[start] === 0x0d && body[start + 1] === 0x0a) start += 2;
  }

  if (parts.length === 0) {
    throw new Error("No parts found in multipart/mixed body");
  }

  // First part: statement JSON
  const firstPart = parts[0];
  const { headers: firstHeaders, body: statementsBody } = splitHeadersAndBody(firstPart);
  const statementsJson = statementsBody.toString("utf-8");

  // Remaining parts: attachments
  const attachments: ParsedAttachment[] = [];
  for (let i = 1; i < parts.length; i++) {
    const { headers, body: attachBody } = splitHeadersAndBody(parts[i]);
    const contentType = getHeader(headers, "Content-Type") || "application/octet-stream";
    const hashHeader = getHeader(headers, "X-Experience-API-Hash");

    // Compute SHA-256 of the attachment content
    const computedHash = createHash("sha256").update(attachBody).digest("hex");
    const hash = hashHeader || computedHash;

    attachments.push({ contentType, hash, content: attachBody });
  }

  return { statementsJson, attachments };
}

/**
 * Split a MIME part into headers and body at the first blank line.
 */
function splitHeadersAndBody(part: Buffer): { headers: string; body: Buffer } {
  // Find \r\n\r\n (double CRLF)
  const separator = Buffer.from("\r\n\r\n");
  let idx = part.indexOf(separator);
  if (idx === -1) {
    // Try just \n\n
    const altSep = Buffer.from("\n\n");
    idx = part.indexOf(altSep);
    if (idx === -1) {
      // No headers, entire part is body
      return { headers: "", body: part };
    }
    return { headers: part.subarray(0, idx).toString("utf-8"), body: part.subarray(idx + 2) };
  }
  return { headers: part.subarray(0, idx).toString("utf-8"), body: part.subarray(idx + 4) };
}

function getHeader(headersStr: string, name: string): string | null {
  const lines = headersStr.split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).trim();
    if (key.toLowerCase() === name.toLowerCase()) {
      return line.substring(colonIdx + 1).trim();
    }
  }
  return null;
}

/**
 * Store attachment in Blob Storage, keyed by SHA-256 hash.
 */
export async function storeAttachment(attachment: ParsedAttachment): Promise<void> {
  const exists = await blobExists("attachments", attachment.hash);
  if (exists) return; // Content-addressed — already stored

  await uploadBlob(
    "attachments",
    attachment.hash,
    attachment.content.toString("binary"),
    attachment.contentType
  );
}

/**
 * Validate that all attachments referenced in statements have matching parts.
 */
export function validateAttachments(
  statementsJson: unknown[],
  attachments: ParsedAttachment[]
): string | null {
  const attachmentHashes = new Set(attachments.map((a) => a.hash));

  for (const stmt of statementsJson) {
    const s = stmt as { attachments?: Array<{ sha2: string; fileUrl?: string }> };
    if (!s.attachments) continue;

    for (const att of s.attachments) {
      // Attachments with fileUrl don't need a binary part
      if (att.fileUrl) continue;
      if (!attachmentHashes.has(att.sha2)) {
        return `Attachment with SHA-256 hash ${att.sha2} referenced in statement but not found in multipart parts`;
      }
    }
  }

  return null;
}

/**
 * Build a multipart/mixed response body for statements that have attachments.
 */
export async function buildMultipartResponse(
  statementsResult: unknown,
  attachmentHashes: string[]
): Promise<{ body: Buffer; boundary: string } | null> {
  if (attachmentHashes.length === 0) return null;

  const boundary = `xapi-boundary-${createHash("sha256").update(Date.now().toString()).digest("hex").slice(0, 16)}`;
  const parts: Buffer[] = [];

  // First part: statement JSON
  const jsonPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(statementsResult)}`
  );
  parts.push(jsonPart);

  // Attachment parts
  for (const hash of attachmentHashes) {
    const exists = await blobExists("attachments", hash);
    if (!exists) continue;

    const content = await downloadBlob("attachments", hash);
    const part = Buffer.from(
      `\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\nX-Experience-API-Hash: ${hash}\r\n\r\n${content}`
    );
    parts.push(part);
  }

  // Closing boundary
  parts.push(Buffer.from(`\r\n--${boundary}--`));

  return { body: Buffer.concat(parts), boundary };
}
