import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import { getTableClient } from "@/lib/azure/table-client";
import { getContainerClient } from "@/lib/azure/blob-client";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/purge — Purge test/conformance data from the LRS.
 *
 * Body: { target: "statements" | "documents" | "all", confirm: true }
 *
 * Deletes all xAPI statements, documents (state/profile), and related
 * blob storage. Does NOT touch users, courses, enrollments, or credentials.
 *
 * Admin-only. Requires { confirm: true } as a safety check.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    const body = await request.json();

    if (!body.confirm) {
      return NextResponse.json(
        { error: true, message: "Must include { confirm: true } to purge data" },
        { status: 400 }
      );
    }

    const target = body.target || "all";
    const results: Record<string, number> = {};

    if (target === "statements" || target === "all") {
      // Purge statements table
      const stmtTable = await getTableClient("statements");
      let stmtCount = 0;
      const stmtIter = stmtTable.listEntities({ queryOptions: { select: ["partitionKey", "rowKey"] } });
      for await (const entity of stmtIter) {
        await stmtTable.deleteEntity(entity.partitionKey!, entity.rowKey!);
        stmtCount++;
      }
      results.statements = stmtCount;

      // Purge statement index
      const indexTable = await getTableClient("statementIndex");
      let indexCount = 0;
      const indexIter = indexTable.listEntities({ queryOptions: { select: ["partitionKey", "rowKey"] } });
      for await (const entity of indexIter) {
        await indexTable.deleteEntity(entity.partitionKey!, entity.rowKey!);
        indexCount++;
      }
      results.statementIndex = indexCount;

      // Purge statement blobs
      try {
        const container = await getContainerClient("statements");
        let blobCount = 0;
        for await (const blob of container.listBlobsFlat()) {
          await container.deleteBlob(blob.name);
          blobCount++;
        }
        results.statementBlobs = blobCount;
      } catch { results.statementBlobs = 0; }

      // Purge attachment blobs
      try {
        const attContainer = await getContainerClient("attachments");
        let attCount = 0;
        for await (const blob of attContainer.listBlobsFlat()) {
          await attContainer.deleteBlob(blob.name);
          attCount++;
        }
        results.attachmentBlobs = attCount;
      } catch { results.attachmentBlobs = 0; }
    }

    if (target === "documents" || target === "all") {
      // Purge documents table
      const docTable = await getTableClient("documents");
      let docCount = 0;
      const docIter = docTable.listEntities({ queryOptions: { select: ["partitionKey", "rowKey"] } });
      for await (const entity of docIter) {
        await docTable.deleteEntity(entity.partitionKey!, entity.rowKey!);
        docCount++;
      }
      results.documents = docCount;

      // Purge document blobs
      try {
        const docContainer = await getContainerClient("documents");
        let docBlobCount = 0;
        for await (const blob of docContainer.listBlobsFlat()) {
          await docContainer.deleteBlob(blob.name);
          docBlobCount++;
        }
        results.documentBlobs = docBlobCount;
      } catch { results.documentBlobs = 0; }
    }

    audit({
      action: "lrs.purge",
      actorId: auth.session.userId,
      actorName: auth.session.userName,
      actorRole: auth.session.role,
      targetType: "lrs",
      targetId: target,
      summary: `Purged LRS ${target} data: ${JSON.stringify(results)}`,
      details: results,
      ip: getClientIp(request),
    });

    return NextResponse.json({
      message: `LRS ${target} data purged successfully`,
      purged: results,
    });
  } catch (e) {
    const authResp = handleAuthError(e);
    if (authResp) return authResp;
    logger.error("POST /api/admin/purge failed", { error: e });
    return NextResponse.json(
      { error: true, message: "Failed to purge data" },
      { status: 500 }
    );
  }
}
