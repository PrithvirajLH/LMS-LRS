import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/lrs/auth";
import { validateVersionHeader, xapiResponse, xapiError } from "@/lib/lrs/headers";
import {
  putDocument,
  postDocument,
  getDocument,
  deleteDocument,
  listDocumentIds,
} from "@/lib/lrs/documents";
import { getEffectiveMethod } from "@/lib/lrs/method-override";

// POST dispatches method overrides
export { _POST as POST };
async function _POST(request: NextRequest) {
  const effective = getEffectiveMethod(request);
  if (effective === "PUT") return PUT(request);
  if (effective === "GET") return GET(request);
  if (effective === "DELETE") return DELETE(request);
  return _postHandler(request);
}

// PUT /api/xapi/activities/profile
export async function PUT(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const activityId = request.nextUrl.searchParams.get("activityId");
    const profileId = request.nextUrl.searchParams.get("profileId");
    if (!activityId) return xapiError("activityId parameter is required", 400);
    if (!profileId) return xapiError("profileId parameter is required", 400);

    const content = await request.text();
    const contentType = request.headers.get("Content-Type") || "application/octet-stream";

    const result = await putDocument({
      docType: "activity_profile",
      activityId,
      profileId,
      content,
      contentType,
      ifMatch: request.headers.get("If-Match") || undefined,
      ifNoneMatch: request.headers.get("If-None-Match") || undefined,
    });

    if (result.error) return xapiError(result.error, result.status);
    return xapiResponse(null, 204, { ETag: `"${result.etag}"` });
  } catch (e) {
    console.error("PUT /xapi/activities/profile error:", e);
    return xapiError("Internal server error", 500);
  }
}

// POST /api/xapi/activities/profile — merge
async function _postHandler(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const activityId = request.nextUrl.searchParams.get("activityId");
    const profileId = request.nextUrl.searchParams.get("profileId");
    if (!activityId) return xapiError("activityId parameter is required", 400);
    if (!profileId) return xapiError("profileId parameter is required", 400);

    const content = await request.text();
    const contentType = request.headers.get("Content-Type") || "application/json";

    const result = await postDocument({
      docType: "activity_profile",
      activityId,
      profileId,
      content,
      contentType,
    });

    if (result.error) return xapiError(result.error, result.status);
    return xapiResponse(null, 204, { ETag: `"${result.etag}"` });
  } catch (e) {
    console.error("POST /xapi/activities/profile error:", e);
    return xapiError("Internal server error", 500);
  }
}

// GET /api/xapi/activities/profile
export async function GET(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const activityId = request.nextUrl.searchParams.get("activityId");
    const profileId = request.nextUrl.searchParams.get("profileId");
    if (!activityId) return xapiError("activityId parameter is required", 400);

    // Without profileId — list all profileIds
    if (!profileId) {
      const since = request.nextUrl.searchParams.get("since") || undefined;
      const ids = await listDocumentIds({
        docType: "activity_profile",
        activityId,
        since,
      });
      return xapiResponse(ids, 200);
    }

    const doc = await getDocument({
      docType: "activity_profile",
      activityId,
      profileId,
    });

    if (!doc) return xapiError("Activity profile document not found", 404);

    return new NextResponse(doc.content, {
      status: 200,
      headers: {
        "Content-Type": doc.contentType,
        "ETag": `"${doc.etag}"`,
        "Last-Modified": new Date(doc.updatedAt).toUTCString(),
        "X-Experience-API-Version": "1.0.3",
      },
    });
  } catch (e) {
    console.error("GET /xapi/activities/profile error:", e);
    return xapiError("Internal server error", 500);
  }
}

// DELETE /api/xapi/activities/profile
export async function DELETE(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const activityId = request.nextUrl.searchParams.get("activityId");
    const profileId = request.nextUrl.searchParams.get("profileId");
    if (!activityId) return xapiError("activityId parameter is required", 400);
    if (!profileId) return xapiError("profileId parameter is required", 400);

    const result = await deleteDocument({
      docType: "activity_profile",
      activityId,
      profileId,
      ifMatch: request.headers.get("If-Match") || undefined,
    });

    if (result.error) return xapiError(result.error, result.status);
    return xapiResponse(null, 204);
  } catch (e) {
    console.error("DELETE /xapi/activities/profile error:", e);
    return xapiError("Internal server error", 500);
  }
}
