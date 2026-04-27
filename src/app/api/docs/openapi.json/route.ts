/**
 * GET /api/docs/openapi.json
 *
 * Serves the OpenAPI 3.0 spec generated from the project's Zod schemas.
 * Admin-only — internal API surface, not for public discovery.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { generateOpenApiDocument } from "@/lib/openapi";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ["admin"]);
    const doc = generateOpenApiDocument();
    return NextResponse.json(doc);
  } catch (e) {
    const authResp = handleAuthError(e);
    if (authResp) return authResp;
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    logger.error("GET /api/docs/openapi.json failed", { error: msg, stack });
    return NextResponse.json(
      { error: true, message: `OpenAPI generation failed: ${msg}`, stack },
      { status: 500 }
    );
  }
}
