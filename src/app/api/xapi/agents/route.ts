import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/lrs/auth";
import { validateVersionHeader, xapiResponse, xapiError } from "@/lib/lrs/headers";
import { getTableClient } from "@/lib/azure/table-client";
import { downloadBlob } from "@/lib/azure/blob-client";
import { extractActorIFI } from "@/lib/lrs/statements";
import type { Actor, Agent, StatementEntity, XAPIStatement } from "@/lib/lrs/types";

// GET /api/xapi/agents?agent=... — Return Person object with all known IFIs
export async function GET(request: NextRequest) {
  try {
    const vErr = validateVersionHeader(request.headers.get("X-Experience-API-Version"));
    if (vErr) return xapiError(vErr, 400);
    const auth = await authenticateRequest(request.headers.get("Authorization"));
    if (!auth.authenticated) return xapiError(auth.message, auth.status);

    const agentStr = request.nextUrl.searchParams.get("agent");
    if (!agentStr) return xapiError("agent parameter is required", 400);

    let agentObj: Actor;
    try {
      agentObj = JSON.parse(agentStr) as Actor;
    } catch {
      return xapiError("agent must be a valid JSON agent object", 400);
    }

    const ifi = extractActorIFI(agentObj);
    const stmtTable = await getTableClient("statements");
    const now = new Date();

    // Collect all known names and IFI values for this agent
    const names = new Set<string>();
    const mboxes = new Set<string>();
    const mboxSha1sums = new Set<string>();
    const openids = new Set<string>();
    const accounts: Array<{ homePage: string; name: string }> = [];
    const seenAccounts = new Set<string>();

    // Scan last 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

      const filter = `PartitionKey eq '${pk}' and actorIfiType eq '${ifi.type}' and actorIfiValue eq '${ifi.value.replace(/'/g, "''")}'`;
      const iter = stmtTable.listEntities<StatementEntity>({
        queryOptions: { filter },
      });

      let count = 0;
      for await (const entity of iter) {
        if (count >= 50) break; // Sample enough statements
        count++;

        const json = await downloadBlob("statements", `${entity.statementId}.json`);
        const stmt = JSON.parse(json) as XAPIStatement;
        const actor = stmt.actor as Agent;

        if (actor.name) names.add(actor.name);
        if (actor.mbox) mboxes.add(actor.mbox);
        if (actor.mbox_sha1sum) mboxSha1sums.add(actor.mbox_sha1sum);
        if (actor.openid) openids.add(actor.openid);
        if (actor.account) {
          const key = `${actor.account.homePage}::${actor.account.name}`;
          if (!seenAccounts.has(key)) {
            seenAccounts.add(key);
            accounts.push(actor.account);
          }
        }
      }
    }

    // Build Person object (arrays of all known values)
    const person: Record<string, unknown> = {
      objectType: "Person",
    };
    if (names.size > 0) person.name = [...names];
    if (mboxes.size > 0) person.mbox = [...mboxes];
    if (mboxSha1sums.size > 0) person.mbox_sha1sum = [...mboxSha1sums];
    if (openids.size > 0) person.openid = [...openids];
    if (accounts.length > 0) person.account = accounts;

    return xapiResponse(person);
  } catch (e) {
    console.error("GET /xapi/agents error:", e);
    return xapiError("Internal server error", 500);
  }
}
