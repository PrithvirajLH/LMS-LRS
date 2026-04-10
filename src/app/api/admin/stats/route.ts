import { NextResponse } from "next/server";
import { getTableClient } from "@/lib/azure/table-client";
import type { StatementEntity } from "@/lib/lrs/types";
import type { CredentialEntity } from "@/lib/lrs/types";

export async function GET() {
  try {
    // Count credentials
    const credTable = await getTableClient("credentials");
    let credentialCount = 0;
    const credIter = credTable.listEntities<CredentialEntity>({
      queryOptions: { filter: "PartitionKey eq 'credential'" },
    });
    for await (const _ of credIter) {
      credentialCount++;
    }

    // Count statements in current month partition
    const stmtTable = await getTableClient("statements");
    const now = new Date();
    const pk = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    let totalStatements = 0;
    let voidedCount = 0;
    const recentVerbs: Record<string, number> = {};
    const recentActors: Record<string, number> = {};

    const stmtIter = stmtTable.listEntities<StatementEntity>({
      queryOptions: { filter: `PartitionKey eq '${pk}'` },
    });

    for await (const entity of stmtIter) {
      totalStatements++;
      if (entity.isVoided) voidedCount++;

      // Count by verb
      const verbShort = entity.verbId.split("/").pop() || entity.verbId;
      recentVerbs[verbShort] = (recentVerbs[verbShort] || 0) + 1;

      // Count by actor
      const actorKey = entity.actorIfiValue.split("::").pop() || entity.actorIfiValue;
      recentActors[actorKey] = (recentActors[actorKey] || 0) + 1;
    }

    // Sort verbs and actors by count
    const topVerbs = Object.entries(recentVerbs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([verb, count]) => ({ verb, count }));

    const topActors = Object.entries(recentActors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([actor, count]) => ({ actor, count }));

    return NextResponse.json({
      currentMonth: pk,
      totalStatements,
      voidedCount,
      activeStatements: totalStatements - voidedCount,
      credentialCount,
      topVerbs,
      topActors,
    });
  } catch (e) {
    console.error("GET /api/admin/stats error:", e);
    return NextResponse.json(
      { error: true, message: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
