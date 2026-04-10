import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/lrs/auth";
import { validateVersionHeader, xapiResponse, xapiError } from "@/lib/lrs/headers";
import {
  putDocument,
  postDocument,
  getDocument,
  deleteDocument,
  deleteAllDocuments,
  listDocumentIds,
} from "@/lib/lrs/documents";
import { getEffectiveMethod } from "@/lib/lrs/method-override";
import type { Actor } from "@/lib/lrs/types";

function parseAgent(agentStr: string | null): Actor | null {
  if (!agentStr) return null;
  try {
    return JSON.parse(agentStr) as Actor;
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
  return _postHandler(request);
}

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

    const agent = parseAgent(agentStr);
    if (!agent) return xapiError("agent must be a valid JSON agent object", 400);

    const content = await request.text();
    const contentType = request.headers.get("Content-Type") || "application/octet-stream";

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

    const agent = parseAgent(agentStr);
    if (!agent) return xapiError("agent must be a valid JSON agent object", 400);

    // Without stateId — list all stateIds
    if (!stateId) {
      const ids = await listDocumentIds({
        docType: "state",
        activityId,
        agent,
        registration,
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

    if (!doc) return xapiError("State document not found", 404);

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
