import { NextRequest, NextResponse } from "next/server";
import { getTableClient } from "@/lib/azure/table-client";
import { downloadBlob } from "@/lib/azure/blob-client";
import type { StatementEntity, XAPIStatement } from "@/lib/lrs/types";

// GET /api/admin/statements — Browse statements for admin UI
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "25", 10), 100);
    const verb = url.searchParams.get("verb") || undefined;
    const actor = url.searchParams.get("actor") || undefined;
    const activity = url.searchParams.get("activity") || undefined;
    const showVoided = url.searchParams.get("voided") === "true";

    const stmtTable = await getTableClient("statements");
    const now = new Date();

    // Scan last 3 months
    const partitions: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      partitions.push(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      );
    }

    const filters: string[] = [];
    if (!showVoided) filters.push("isVoided eq false");
    if (verb) filters.push(`verbId eq '${verb.replace(/'/g, "''")}'`);
    if (actor) filters.push(`actorIfiValue eq '${actor.replace(/'/g, "''")}'`);
    if (activity) filters.push(`objectId eq '${activity.replace(/'/g, "''")}'`);

    const filterStr = filters.length > 0 ? filters.join(" and ") : undefined;

    const entities: StatementEntity[] = [];

    for (const pk of partitions) {
      if (entities.length >= limit) break;

      const fullFilter = filterStr
        ? `PartitionKey eq '${pk}' and ${filterStr}`
        : `PartitionKey eq '${pk}'`;

      const iter = stmtTable.listEntities<StatementEntity>({
        queryOptions: { filter: fullFilter },
      });

      for await (const entity of iter) {
        entities.push(entity);
        if (entities.length >= limit) break;
      }
    }

    // Fetch full statements
    const statements: (XAPIStatement & { _meta: Record<string, unknown> })[] = [];
    for (const entity of entities) {
      const json = await downloadBlob("statements", `${entity.statementId}.json`);
      const stmt = JSON.parse(json) as XAPIStatement;
      statements.push({
        ...stmt,
        _meta: {
          isVoided: entity.isVoided,
          credentialId: entity.credentialId,
          partitionKey: entity.partitionKey,
        },
      });
    }

    return NextResponse.json({ statements, count: statements.length });
  } catch (e) {
    console.error("GET /api/admin/statements error:", e);
    return NextResponse.json(
      { error: true, message: "Failed to fetch statements" },
      { status: 500 }
    );
  }
}
