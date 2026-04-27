import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import { getTableClient } from "@/lib/azure/table-client";
import { getContainerClient } from "@/lib/azure/blob-client";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { PurgeSchema } from "@/lib/schemas";

/**
 * POST /api/admin/purge — Purge test/conformance data from the LRS.
 *
 * Body: { target: "statements" | "documents" | "all", confirm: true }
 *
 * Each operation is isolated so one failing doesn't abort the others.
 * Returns per-resource counts and any errors encountered.
 */

async function purgeTable(tableName: "statements" | "statementIndex" | "documents"): Promise<{ deleted: number; error?: string }> {
  try {
    const table = await getTableClient(tableName);
    // Collect all keys first (avoids iterator issues during concurrent delete)
    const keys: Array<{ pk: string; rk: string }> = [];
    const iter = table.listEntities();
    for await (const entity of iter) {
      if (entity.partitionKey && entity.rowKey) {
        keys.push({ pk: entity.partitionKey, rk: entity.rowKey });
      }
    }

    // Delete in parallel batches of 20
    let deleted = 0;
    const BATCH = 20;
    for (let i = 0; i < keys.length; i += BATCH) {
      const batch = keys.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map((k) => table.deleteEntity(k.pk, k.rk).then(() => { deleted++; }))
      );
    }
    return { deleted };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { deleted: 0, error: msg };
  }
}

async function purgeBlobContainer(container: "statements" | "documents" | "attachments"): Promise<{ deleted: number; error?: string }> {
  try {
    const client = await getContainerClient(container);
    const names: string[] = [];
    for await (const blob of client.listBlobsFlat()) {
      names.push(blob.name);
    }

    let deleted = 0;
    const BATCH = 20;
    for (let i = 0; i < names.length; i += BATCH) {
      const batch = names.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map((n) => client.deleteBlob(n).then(() => { deleted++; }))
      );
    }
    return { deleted };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { deleted: 0, error: msg };
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    const parsed = PurgeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const target = parsed.data.target || "all";
    const results: Record<string, { deleted: number; error?: string }> = {};

    if (target === "statements" || target === "all") {
      results.statements = await purgeTable("statements");
      results.statementIndex = await purgeTable("statementIndex");
      results.statementBlobs = await purgeBlobContainer("statements");
      results.attachmentBlobs = await purgeBlobContainer("attachments");
    }

    if (target === "documents" || target === "all") {
      results.documents = await purgeTable("documents");
      results.documentBlobs = await purgeBlobContainer("documents");
    }

    // Aggregate error messages from any failed resource
    const errors = Object.entries(results)
      .filter(([, r]) => r.error)
      .map(([name, r]) => `${name}: ${r.error}`);

    audit({
      action: "lrs.purge",
      actorId: auth.session.userId,
      actorName: auth.session.userName,
      actorRole: auth.session.role,
      targetType: "lrs",
      targetId: target,
      summary: `Purged LRS ${target} data`,
      details: results as unknown as Record<string, unknown>,
      ip: getClientIp(request),
    });

    return NextResponse.json({
      message: errors.length > 0 ? `Purge completed with ${errors.length} errors` : `LRS ${target} data purged successfully`,
      purged: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    const authResp = handleAuthError(e);
    if (authResp) return authResp;
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("POST /api/admin/purge failed", { error: msg, stack: e instanceof Error ? e.stack : undefined });
    return NextResponse.json(
      { error: true, message: `Failed to purge data: ${msg}` },
      { status: 500 }
    );
  }
}
