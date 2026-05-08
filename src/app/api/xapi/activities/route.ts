import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/lrs/auth";
import { validateVersionHeader, xapiResponse, xapiError } from "@/lib/lrs/headers";
import { getTableClient } from "@/lib/azure/table-client";
import { downloadBlob } from "@/lib/azure/blob-client";
import type { StatementEntity, XAPIStatement } from "@/lib/lrs/types";

// GET /api/xapi/activities?activityId=... — Return full activity definition
export async function GET(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const activityId = request.nextUrl.searchParams.get("activityId");
    if (!activityId) return xapiError("activityId parameter is required", 400);

    // Per xAPI 1.0.3 §4.1.13.1 / XAPI-00254: the Activity Object returned from
    // GET /activities MUST contain ALL available information about that activity
    // collected from ANY statement that targets it. In particular, language maps
    // (name, description) MUST be merged so every locale ever supplied appears.
    const stmtTable = await getTableClient("statements");
    const now = new Date();
    const merged: Record<string, unknown> = {};

    function mergeDefinition(into: Record<string, unknown>, src: Record<string, unknown>) {
      for (const [key, value] of Object.entries(src)) {
        const existing = into[key];
        // Language maps (name, description) and the like — merge by locale.
        if (
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          existing !== null &&
          typeof existing === "object" &&
          !Array.isArray(existing)
        ) {
          mergeDefinition(existing as Record<string, unknown>, value as Record<string, unknown>);
        } else if (existing === undefined) {
          into[key] = value;
        }
        // For scalar/array values that already exist, keep the first one we saw.
      }
    }

    // Scan last 6 months for any statement that targets this activityId
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

      const filter = `PartitionKey eq '${pk}' and objectId eq '${activityId.replace(/'/g, "''")}'`;
      const iter = stmtTable.listEntities<StatementEntity>({
        queryOptions: { filter },
      });

      for await (const entity of iter) {
        const json = await downloadBlob("statements", `${entity.statementId}.json`);
        const stmt = JSON.parse(json) as XAPIStatement;
        const obj = stmt.object as { id?: string; definition?: Record<string, unknown> };
        if (obj.definition) {
          mergeDefinition(merged, obj.definition);
        }
      }
    }

    const bestDefinition = Object.keys(merged).length > 0 ? merged : null;

    return xapiResponse({
      id: activityId,
      objectType: "Activity",
      definition: bestDefinition || {},
    });
  } catch (e) {
    console.error("GET /xapi/activities error:", e);
    return xapiError("Internal server error", 500);
  }
}
