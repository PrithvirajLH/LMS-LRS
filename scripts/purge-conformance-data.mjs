/**
 * Purge xAPI test data from previous conformance runs.
 * Wipes: statements, statementIndex, documents tables + their blob containers.
 *
 * Usage: AZURE_STORAGE_CONNECTION_STRING="..." node scripts/purge-conformance-data.mjs
 */
import { TableClient } from "@azure/data-tables";
import { BlobServiceClient } from "@azure/storage-blob";

const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!conn) {
  console.error("AZURE_STORAGE_CONNECTION_STRING is not set");
  process.exit(1);
}

async function purgeTable(name) {
  const client = TableClient.fromConnectionString(conn, name);
  const keys = [];
  try {
    for await (const e of client.listEntities()) {
      if (e.partitionKey && e.rowKey) keys.push({ pk: e.partitionKey, rk: e.rowKey });
    }
  } catch (e) {
    if (e?.statusCode === 404) {
      console.log(`  ${name}: table doesn't exist (skipping)`);
      return;
    }
    throw e;
  }
  console.log(`  ${name}: ${keys.length} entities to delete`);
  let done = 0;
  const BATCH = 20;
  for (let i = 0; i < keys.length; i += BATCH) {
    const batch = keys.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map((k) => client.deleteEntity(k.pk, k.rk).then(() => done++))
    );
  }
  console.log(`  ${name}: deleted ${done}`);
}

async function purgeBlobs(container) {
  const svc = BlobServiceClient.fromConnectionString(conn);
  const c = svc.getContainerClient(container);
  const exists = await c.exists();
  if (!exists) {
    console.log(`  blob/${container}: container doesn't exist (skipping)`);
    return;
  }
  const names = [];
  for await (const b of c.listBlobsFlat()) names.push(b.name);
  console.log(`  blob/${container}: ${names.length} blobs to delete`);
  let done = 0;
  const BATCH = 20;
  for (let i = 0; i < names.length; i += BATCH) {
    const batch = names.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map((n) => c.deleteBlob(n).then(() => done++))
    );
  }
  console.log(`  blob/${container}: deleted ${done}`);
}

console.log("Purging xAPI test data...");
await purgeTable("statements");
await purgeTable("statementIndex");
await purgeTable("documents");
// Match the container names from src/lib/azure/blob-client.ts
await purgeBlobs("xapi-statements");
await purgeBlobs("xapi-documents");
await purgeBlobs("xapi-attachments");
console.log("Done.");
