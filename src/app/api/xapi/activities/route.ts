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

    // Find the most recent statement referencing this activity to get the best definition
    const stmtTable = await getTableClient("statements");
    const now = new Date();

    // Scan last 6 months for this activity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bestDefinition: Record<string, any> | null = null;

    for (let i = 0; i < 6; i++) {
      if (bestDefinition) break;
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
          // Merge definitions — later ones fill in gaps
          if (!bestDefinition) {
            bestDefinition = { ...(obj.definition as Record<string, unknown>) };
          } else {
            const def = obj.definition as Record<string, unknown>;
            for (const key of Object.keys(def)) {
              if (!(key in bestDefinition)) {
                (bestDefinition as Record<string, unknown>)[key] = def[key];
              }
            }
          }
        }
        break; // One statement with a definition is enough
      }
    }

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
