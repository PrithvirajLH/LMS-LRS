/**
 * One-off: deactivate the shared LRS API key that used to live in the
 * browser bundle (src/app/play/page.tsx). The browser-side player now
 * authenticates with per-launch tokens issued by /api/learner/launch, so
 * this credential should never be presented again.
 *
 * Run once after deploying the launch-token change:
 *   node scripts/disable-legacy-shared-credential.mjs
 *
 * Requires AZURE_STORAGE_CONNECTION_STRING in the environment (load .env
 * yourself or use `npx dotenv -e .env.local -- node ...`).
 */
import { TableClient } from "@azure/data-tables";

const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!conn) {
  console.error("AZURE_STORAGE_CONNECTION_STRING is not set");
  process.exit(1);
}

const LEGACY_KEY = "ak_54583e3537ec75a878be7823f5d2aca0e2df4b60bbe6bc33";

const client = TableClient.fromConnectionString(conn, "credentials");

try {
  await client.updateEntity(
    {
      partitionKey: "credential",
      rowKey: LEGACY_KEY,
      isActive: false,
    },
    "Merge"
  );
  console.log(`Deactivated legacy shared credential: ${LEGACY_KEY}`);
  console.log("Existing in-memory caches expire within 60 seconds.");
} catch (e) {
  if (e?.statusCode === 404) {
    console.log(`Credential ${LEGACY_KEY} not found — already gone.`);
  } else {
    console.error("Failed to deactivate credential:", e?.message || e);
    process.exit(1);
  }
}
