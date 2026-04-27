import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import { getTableClient } from "@/lib/azure/table-client";
import { logger } from "@/lib/logger";
import type { AuditEntry } from "@/lib/audit";
import { AuditQuerySchema } from "@/lib/schemas";

/**
 * GET /api/admin/audit — Query the audit trail.
 *
 * Query params:
 *   action   — filter by action (e.g. "user.create", "course.publish")
 *   actorId  — filter by who performed the action
 *   limit    — max results (default 50, max 200)
 *   months   — how many months back to scan (default 1, max 12)
 *
 * Returns entries in reverse chronological order (newest first).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);

    const parsed = AuditQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const actionFilter = parsed.data.action;
    const actorFilter = parsed.data.actorId;
    const limit = parsed.data.limit ?? 50;
    const months = parsed.data.months ?? 1;

    const table = await getTableClient("auditLog");
    const entries: AuditEntry[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      if (entries.length >= limit) break;

      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

      let filter = `PartitionKey eq '${pk}'`;
      if (actionFilter) {
        filter += ` and action eq '${actionFilter.replace(/'/g, "''")}'`;
      }
      if (actorFilter) {
        filter += ` and actorId eq '${actorFilter.replace(/'/g, "''")}'`;
      }

      const iter = table.listEntities<AuditEntry>({
        queryOptions: { filter },
      });

      for await (const entity of iter) {
        entries.push({
          partitionKey: entity.partitionKey,
          rowKey: entity.rowKey,
          action: entity.action,
          actorId: entity.actorId,
          actorName: entity.actorName,
          actorRole: entity.actorRole,
          targetType: entity.targetType,
          targetId: entity.targetId,
          summary: entity.summary,
          details: entity.details,
          timestamp: entity.timestamp,
          ip: entity.ip,
        });
        if (entries.length >= limit) break;
      }
    }

    return NextResponse.json({ entries, count: entries.length });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("GET /api/admin/audit failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to query audit log" }, { status: 500 });
  }
}
