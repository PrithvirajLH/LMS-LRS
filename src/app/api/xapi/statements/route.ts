import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/lrs/auth";
import { validateVersionHeader, xapiResponse, xapiError } from "@/lib/lrs/headers";
import { storeStatements, getStatements } from "@/lib/lrs/statements";
import { ValidationError } from "@/lib/lrs/validation";
import { getEffectiveMethod } from "@/lib/lrs/method-override";
import { parseMultipartMixed, storeAttachment, validateAttachments, buildMultipartResponse } from "@/lib/lrs/attachments";
import { xapiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { XAPIStatement, StatementQueryParams } from "@/lib/lrs/types";

// POST /api/xapi/statements — Store statements (or dispatch method override)
export async function POST(request: NextRequest) {
  const effective = getEffectiveMethod(request);
  if (effective === "PUT") return PUT(request);
  if (effective === "GET") return GET(request);

  try {
    const versionError = validateVersionHeader(
      request.headers.get("X-Experience-API-Version")
    );
    if (versionError) return xapiError(versionError, 400);

    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    // Rate limit per credential (uses credential's own rateLimitPerMinute or default 300)
    const limit = xapiLimiter.check(auth.credential.rowKey as string);
    if (!limit.allowed) {
      logger.warn("xAPI rate limit exceeded", { credential: auth.credential.rowKey });
      return xapiError("Rate limit exceeded", 429);
    }

    const contentType = request.headers.get("Content-Type") || "";
    let statements: XAPIStatement[];

    if (contentType.includes("multipart/mixed")) {
      // Parse multipart/mixed with attachments
      const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
      if (!boundaryMatch) {
        return xapiError("multipart/mixed requires a boundary parameter", 400);
      }

      const rawBody = Buffer.from(await request.arrayBuffer());
      const { statementsJson, attachments } = parseMultipartMixed(rawBody, boundaryMatch[1]);

      let parsed: unknown;
      try {
        parsed = JSON.parse(statementsJson);
      } catch {
        return xapiError("Invalid JSON in multipart statement part", 400);
      }

      statements = Array.isArray(parsed) ? parsed : [parsed as XAPIStatement];

      // Validate attachment references
      const attError = validateAttachments(statements, attachments);
      if (attError) return xapiError(attError, 400);

      // Store attachments in Blob Storage
      for (const att of attachments) {
        await storeAttachment(att);
      }
    } else {
      // Standard JSON body
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return xapiError("Invalid JSON in request body", 400);
      }

      statements = Array.isArray(body) ? body : [body as XAPIStatement];
    }

    if (statements.length === 0) {
      return xapiError("Request body must contain at least one statement", 400);
    }

    const { ids, conflicts } = await storeStatements(statements, auth.credential);

    if (conflicts.length > 0) {
      return xapiError(
        `Conflict: statement ID(s) ${conflicts.join(", ")} already exist with different content`,
        409
      );
    }

    return xapiResponse(ids, 200);
  } catch (e) {
    if (e instanceof ValidationError) return xapiError(e.message, 400);
    logger.error("POST /xapi/statements failed", { error: e });
    return xapiError("Internal server error", 500);
  }
}

// PUT /api/xapi/statements?statementId=X — Store a single statement with explicit ID
export async function PUT(request: NextRequest) {
  try {
    const versionError = validateVersionHeader(
      request.headers.get("X-Experience-API-Version")
    );
    if (versionError) return xapiError(versionError, 400);

    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const statementId = request.nextUrl.searchParams.get("statementId");
    if (!statementId) {
      return xapiError("statementId query parameter is required for PUT", 400);
    }

    let body: unknown;
    const contentType = request.headers.get("Content-Type") || "";
    try {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        // Method override: PUT-as-POST with url-encoded body
        const formData = await request.formData();
        // Reject extra form fields beyond "content" per xAPI alternate request syntax
        const allowedFields = new Set(["content"]);
        for (const key of formData.keys()) {
          if (!allowedFields.has(key)) {
            return xapiError("Alternate request syntax must not contain extra information beyond 'content'", 400);
          }
        }
        const content = formData.get("content") as string;
        body = content ? JSON.parse(content) : null;
      } else {
        body = await request.json();
      }
    } catch {
      return xapiError("Invalid JSON in request body", 400);
    }

    const stmt = body as XAPIStatement;
    if (Array.isArray(body)) {
      return xapiError("PUT accepts a single statement, not an array", 400);
    }

    // Set the statement ID from the query parameter
    stmt.id = statementId;

    const { ids, conflicts } = await storeStatements([stmt], auth.credential);

    if (conflicts.length > 0) {
      return xapiError(
        `Conflict: statement ${statementId} already exists with different content`,
        409
      );
    }

    // PUT returns 204 No Content on success
    return xapiResponse(null, 204);
  } catch (e) {
    if (e instanceof ValidationError) return xapiError(e.message, 400);
    logger.error("PUT /xapi/statements failed", { error: e });
    return xapiError("Internal server error", 500);
  }
}

// Known xAPI GET query parameters
const KNOWN_GET_PARAMS = new Set([
  "statementId", "voidedStatementId", "agent", "verb", "activity",
  "registration", "related_activities", "related_agents", "since",
  "until", "limit", "format", "ascending", "attachments", "from",
]);

// Parameters that CANNOT be combined with statementId / voidedStatementId
const SINGLE_STMT_FORBIDDEN_PARAMS = new Set([
  "agent", "verb", "activity", "registration", "since", "until",
  "limit", "ascending", "related_activities", "related_agents",
]);

// GET /api/xapi/statements — Query statements
export async function GET(request: NextRequest) {
  try {
    const versionError = validateVersionHeader(
      request.headers.get("X-Experience-API-Version")
    );
    if (versionError) return xapiError(versionError, 400);

    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const url = request.nextUrl;

    // Reject unknown query parameters
    for (const key of url.searchParams.keys()) {
      if (!KNOWN_GET_PARAMS.has(key)) {
        return xapiError(`Unknown query parameter: ${key}`, 400);
      }
    }

    const params: StatementQueryParams = {
      statementId: url.searchParams.get("statementId") || undefined,
      voidedStatementId: url.searchParams.get("voidedStatementId") || undefined,
      agent: url.searchParams.get("agent") || undefined,
      verb: url.searchParams.get("verb") || undefined,
      activity: url.searchParams.get("activity") || undefined,
      registration: url.searchParams.get("registration") || undefined,
      since: url.searchParams.get("since") || undefined,
      until: url.searchParams.get("until") || undefined,
      limit: url.searchParams.get("limit")
        ? parseInt(url.searchParams.get("limit")!, 10)
        : undefined,
      format:
        (url.searchParams.get("format") as "ids" | "exact" | "canonical") ||
        undefined,
      ascending: url.searchParams.get("ascending") === "true",
      related_activities: url.searchParams.get("related_activities") === "true",
      related_agents: url.searchParams.get("related_agents") === "true",
      from: url.searchParams.get("from") || undefined,
    };

    if (params.statementId && params.voidedStatementId) {
      return xapiError("Cannot use both statementId and voidedStatementId", 400);
    }

    // When statementId or voidedStatementId is present, only format and attachments
    // are allowed as additional parameters per xAPI spec
    if (params.statementId || params.voidedStatementId) {
      for (const key of url.searchParams.keys()) {
        if (key === "statementId" || key === "voidedStatementId" || key === "format" || key === "attachments") {
          continue;
        }
        if (SINGLE_STMT_FORBIDDEN_PARAMS.has(key)) {
          return xapiError(
            `Parameter "${key}" cannot be used with ${params.statementId ? "statementId" : "voidedStatementId"}`,
            400
          );
        }
      }
    }

    const acceptLanguage = request.headers.get("Accept-Language") || undefined;
    const result = await getStatements(params, acceptLanguage);

    // Check if attachments=true was requested
    const wantsAttachments = url.searchParams.get("attachments") === "true";

    // Single statement by ID returns unwrapped
    if (params.statementId || params.voidedStatementId) {
      if (result.statements.length === 0) {
        return xapiError("Statement not found", 404);
      }
      const stmt = result.statements[0];

      if (wantsAttachments) {
        // Collect all attachment hashes from the statement
        const hashes: string[] = [];
        const s = stmt as XAPIStatement;
        if (s.attachments) {
          for (const att of s.attachments) {
            if (!att.fileUrl && att.sha2) hashes.push(att.sha2);
          }
        }
        if (hashes.length > 0) {
          try {
            const multipart = await buildMultipartResponse(stmt, hashes);
            if (multipart) {
              const { NextResponse: NR } = await import("next/server");
              const resp = new NR(new Uint8Array(multipart.body), {
                status: 200,
                headers: {
                  "Content-Type": `multipart/mixed; boundary=${multipart.boundary}`,
                  "X-Experience-API-Version": "1.0.3",
                  "X-Experience-API-Consistent-Through": new Date().toISOString(),
                },
              });
              return resp;
            }
          } catch (err) {
            logger.error("Failed to build multipart response for single statement", { error: err });
            // Fall through to normal JSON response
          }
        }
      }

      return xapiResponse(stmt, 200);
    }

    if (wantsAttachments) {
      // Collect all attachment hashes from all statements
      const hashes: string[] = [];
      for (const s of (result.statements as XAPIStatement[])) {
        if (s.attachments) {
          for (const att of s.attachments) {
            if (!att.fileUrl && att.sha2) hashes.push(att.sha2);
          }
        }
      }
      if (hashes.length > 0) {
        try {
          const multipart = await buildMultipartResponse(result, hashes);
          if (multipart) {
            const { NextResponse: NR } = await import("next/server");
            const resp = new NR(new Uint8Array(multipart.body), {
              status: 200,
              headers: {
                "Content-Type": `multipart/mixed; boundary=${multipart.boundary}`,
                "X-Experience-API-Version": "1.0.3",
                "X-Experience-API-Consistent-Through": new Date().toISOString(),
              },
            });
            return resp;
          }
        } catch (err) {
          logger.error("Failed to build multipart response", { error: err });
          // Fall through to normal JSON response
        }
      }
    }

    return xapiResponse(result, 200);
  } catch (e) {
    if (e instanceof ValidationError) return xapiError(e.message, 400);
    logger.error("GET /xapi/statements failed", { error: e });
    return xapiError("Internal server error", 500);
  }
}
