/**
 * Reactivate the legacy credential for ADL conformance testing.
 * Run before each conformance run; pair with disable-legacy-shared-credential.mjs after.
 *
 * Usage:
 *   npx dotenv -e .env.local -- node scripts/reactivate-conformance-credential.mjs
 */
import { TableClient } from "@azure/data-tables";

const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!conn) {
  console.error("AZURE_STORAGE_CONNECTION_STRING is not set");
  process.exit(1);
}

const KEY = "ak_54583e3537ec75a878be7823f5d2aca0e2df4b60bbe6bc33";
const client = TableClient.fromConnectionString(conn, "credentials");

try {
  await client.updateEntity(
    { partitionKey: "credential", rowKey: KEY, isActive: true },
    "Merge"
  );
  console.log(`Reactivated conformance credential: ${KEY}`);
  console.log("Wait ~60s for in-memory credential cache to expire, or restart the dev server.");
} catch (e) {
  console.error("Failed:", e?.message || e);
  process.exit(1);
}
