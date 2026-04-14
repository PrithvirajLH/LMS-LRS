import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/lrs/auth";
import { validateVersionHeader, xapiResponse, xapiError } from "@/lib/lrs/headers";
import {
  putDocument,
  postDocument,
  getDocument,
  getDocumentMetaOnly,
  deleteDocument,
  deleteAllDocuments,
  listDocumentIds,
} from "@/lib/lrs/documents";
import { getEffectiveMethod } from "@/lib/lrs/method-override";
import type { Actor } from "@/lib/lrs/types";

function parseAgent(agentStr: string | null): Actor | null {
  if (!agentStr) return null;
  try {
    const parsed = JSON.parse(agentStr);
    // Must be a non-null object (not an array, string, number, etc.)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Actor;
  } catch {
    return null;
  }
}

// POST dispatches method overrides
export { _POST as POST };
async function _POST(request: NextRequest) {
  const effective = getEffectiveMethod(request);
  if (effective === "PUT") return PUT(request);
  if (effective === "GET") return GET(request);
  if (effective === "DELETE") return DELETE(request);
  if (effective === "HEAD") return HEAD(request);
  return _postHandler(request);
}

// HEAD /api/xapi/activities/state — same as GET but no body
export async function HEAD(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const url = request.nextUrl;
    const activityId = url.searchParams.get("activityId");
    const stateId = url.searchParams.get("stateId");
    const agentStr = url.searchParams.get("agent");
    const registration = url.searchParams.get("registration") || undefined;

    if (!activityId) return xapiError("activityId parameter is required", 400);
    if (!agentStr) return xapiError("agent parameter is required", 400);
    if (registration && !UUID_RE.test(registration)) return xapiError("registration must be a valid UUID", 400);

    const agent = parseAgent(agentStr);
    if (!agent) return xapiError("agent must be a valid JSON agent object", 400);

    if (!stateId) {
      // List mode — return 200 with JSON content-type headers, no body
      const { NextResponse: NR } = await import("next/server");
      return new NR(null, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Experience-API-Version": "1.0.3",
        },
      });
    }

    const meta = await getDocumentMetaOnly({
      docType: "state",
      activityId,
      agent,
      stateId,
      registration,
    });

    if (!meta) {
      // Storyline compat — return empty 200 instead of 404
      const { NextResponse: NR } = await import("next/server");
      return new NR(null, { status: 200, headers: { "X-Experience-API-Version": "1.0.3" } });
    }

    const { NextResponse } = await import("next/server");
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": meta.contentType,
        "ETag": `"${meta.etag}"`,
        "Last-Modified": new Date(meta.updatedAt).toUTCString(),
        "X-Experience-API-Version": "1.0.3",
      },
    });
  } catch (e) {
    console.error("HEAD /xapi/activities/state error:", e);
    return xapiError("Internal server error", 500);
  }
}

// UUID validation for registration parameter
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PUT /api/xapi/activities/state
export async function PUT(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const url = request.nextUrl;
    const activityId = url.searchParams.get("activityId");
    const stateId = url.searchParams.get("stateId");
    const agentStr = url.searchParams.get("agent");
    const registration = url.searchParams.get("registration") || undefined;

    if (!activityId) return xapiError("activityId parameter is required", 400);
    if (!stateId) return xapiError("stateId parameter is required", 400);
    if (!agentStr) return xapiError("agent parameter is required", 400);
    if (registration && !UUID_RE.test(registration)) return xapiError("registration must be a valid UUID", 400);

    const agent = parseAgent(agentStr);
    if (!agent) return xapiError("agent must be a valid JSON agent object", 400);

    let content: string;
    const rawContentType = request.headers.get("Content-Type") || "application/octet-stream";
    // For method-override POST-as-PUT with url-encoded bodies, read content from the
    // "content" form field. The actual content-type of the document is passed via the
    // Content-Type query parameter or defaults based on the form field.
    if (rawContentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      // xAPI alternate request syntax allows: content, Authorization, Content-Type,
      // X-Experience-API-Version, method, plus all query parameters as form fields.
      // We only extract "content" and ignore the rest — no strict rejection.
      content = (formData.get("content") as string) || "";
    } else {
      content = await request.text();
    }
    const contentType = rawContentType.includes("application/x-www-form-urlencoded")
      ? "application/octet-stream"
      : rawContentType;

    const result = await putDocument({
      docType: "state",
      activityId,
      agent,
      stateId,
      registration,
      content,
      contentType,
      ifMatch: request.headers.get("If-Match") || undefined,
      ifNoneMatch: request.headers.get("If-None-Match") || undefined,
    });

    if (result.error) return xapiError(result.error, result.status);
    return xapiResponse(null, 204, { ETag: `"${result.etag}"` });
  } catch (e) {
    console.error("PUT /xapi/activities/state error:", e);
    return xapiError("Internal server error", 500);
  }
}

// POST /api/xapi/activities/state — merge
async function _postHandler(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const url = request.nextUrl;
    const activityId = url.searchParams.get("activityId");
    const stateId = url.searchParams.get("stateId");
    const agentStr = url.searchParams.get("agent");
    const registration = url.searchParams.get("registration") || undefined;

    if (!activityId) return xapiError("activityId parameter is required", 400);
    if (!stateId) return xapiError("stateId parameter is required", 400);
    if (!agentStr) return xapiError("agent parameter is required", 400);
    if (registration && !UUID_RE.test(registration)) return xapiError("registration must be a valid UUID", 400);

    const agent = parseAgent(agentStr);
    if (!agent) return xapiError("agent must be a valid JSON agent object", 400);

    const content = await request.text();
    const contentType = request.headers.get("Content-Type") || "application/json";

    const result = await postDocument({
      docType: "state",
      activityId,
      agent,
      stateId,
      registration,
      content,
      contentType,
    });

    if (result.error) return xapiError(result.error, result.status);
    return xapiResponse(null, 204, { ETag: `"${result.etag}"` });
  } catch (e) {
    console.error("POST /xapi/activities/state error:", e);
    return xapiError("Internal server error", 500);
  }
}

// GET /api/xapi/activities/state
export async function GET(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const url = request.nextUrl;
    const activityId = url.searchParams.get("activityId");
    const stateId = url.searchParams.get("stateId");
    const agentStr = url.searchParams.get("agent");
    const registration = url.searchParams.get("registration") || undefined;

    if (!activityId) return xapiError("activityId parameter is required", 400);
    if (!agentStr) return xapiError("agent parameter is required", 400);
    if (registration && !UUID_RE.test(registration)) return xapiError("registration must be a valid UUID", 400);

    const agent = parseAgent(agentStr);
    if (!agent) return xapiError("agent must be a valid JSON agent object", 400);

    // Without stateId — list all stateIds
    if (!stateId) {
      const sinceRaw = url.searchParams.get("since") || undefined;
      if (sinceRaw && isNaN(Date.parse(sinceRaw))) {
        return xapiError("since parameter must be a valid ISO 8601 timestamp", 400);
      }
      const since = sinceRaw;
      const ids = await listDocumentIds({
        docType: "state",
        activityId,
        agent,
        registration,
        since,
      });
      return xapiResponse(ids, 200);
    }

    // With stateId — return the document
    const doc = await getDocument({
      docType: "state",
      activityId,
      agent,
      stateId,
      registration,
    });

    if (!doc) {
      // Return empty 200 instead of 404 — Storyline expects this for first-time resume checks
      const { NextResponse: NR } = await import("next/server");
      return new NR(null, { status: 200, headers: { "X-Experience-API-Version": "1.0.3" } });
    }

    const { NextResponse } = await import("next/server");
    const response = new NextResponse(doc.content, {
      status: 200,
      headers: {
        "Content-Type": doc.contentType,
        "ETag": `"${doc.etag}"`,
        "Last-Modified": new Date(doc.updatedAt).toUTCString(),
        "X-Experience-API-Version": "1.0.3",
      },
    });
    return response;
  } catch (e) {
    console.error("GET /xapi/activities/state error:", e);
    return xapiError("Internal server error", 500);
  }
}

// DELETE /api/xapi/activities/state
export async function DELETE(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const url = request.nextUrl;
    const activityId = url.searchParams.get("activityId");
    const stateId = url.searchParams.get("stateId");
    const agentStr = url.searchParams.get("agent");
    const registration = url.searchParams.get("registration") || undefined;

    if (!activityId) return xapiError("activityId parameter is required", 400);
    if (!agentStr) return xapiError("agent parameter is required", 400);
    if (registration && !UUID_RE.test(registration)) return xapiError("registration must be a valid UUID", 400);

    const agent = parseAgent(agentStr);
    if (!agent) return xapiError("agent must be a valid JSON agent object", 400);

    if (!stateId) {
      // Delete all state documents for this agent+activity
      await deleteAllDocuments({ docType: "state", activityId, agent, registration });
      return xapiResponse(null, 204);
    }

    const result = await deleteDocument({
      docType: "state",
      activityId,
      agent,
      stateId,
      registration,
      ifMatch: request.headers.get("If-Match") || undefined,
    });

    if (result.error) return xapiError(result.error, result.status);
    return xapiResponse(null, 204);
  } catch (e) {
    console.error("DELETE /xapi/activities/state error:", e);
    return xapiError("Internal server error", 500);
  }
}
