import { NextResponse } from "next/server";

const SUPPORTED_VERSIONS = ["1.0.0", "1.0.1", "1.0.2", "1.0.3"];
const LRS_VERSION = "1.0.3";

export function validateVersionHeader(
  version: string | null
): string | null {
  if (!version) {
    return "X-Experience-API-Version header is required";
  }
  if (!SUPPORTED_VERSIONS.includes(version)) {
    return `Unsupported X-Experience-API-Version: ${version}. Supported: ${SUPPORTED_VERSIONS.join(", ")}`;
  }
  return null;
}

export function addXAPIHeaders(headers: Headers): void {
  headers.set("X-Experience-API-Version", LRS_VERSION);
  // Consistent-Through: required by spec on statement responses.
  // Indicates the server's consistency point — since we write synchronously
  // (or near-real-time via queue), the current timestamp is accurate.
  headers.set("X-Experience-API-Consistent-Through", new Date().toISOString());
}

export function xapiResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): NextResponse {
  // 204 No Content must not have a body
  if (status === 204) {
    const response = new NextResponse(null, { status: 204 });
    addXAPIHeaders(response.headers);
    if (extraHeaders) {
      for (const [key, value] of Object.entries(extraHeaders)) {
        response.headers.set(key, value);
      }
    }
    return response;
  }

  const response = NextResponse.json(body, { status });
  addXAPIHeaders(response.headers);
  response.headers.set("Content-Type", "application/json");
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      response.headers.set(key, value);
    }
  }
  return response;
}

export function xapiError(message: string, status: number): NextResponse {
  return xapiResponse({ error: true, message }, status);
}
