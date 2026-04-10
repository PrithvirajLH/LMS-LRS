import { v4 as uuidv4 } from "uuid";
import { getTableClient } from "@/lib/azure/table-client";
import { uploadBlob, downloadBlob } from "@/lib/azure/blob-client";
import { validateStatement, ValidationError } from "./validation";
import type {
  XAPIStatement,
  Actor,
  Agent,
  Group,
  Activity,
  CredentialEntity,
  StatementEntity,
  StatementIndexEntity,
  StatementQueryParams,
  StatementResult,
} from "./types";

// ── Escape single quotes in OData string values ──
function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

// ── Reverse timestamp for Table Storage RowKey ordering ──
const MAX_TICKS = 9999999999999;

function reverseTimestamp(date: Date): string {
  return String(MAX_TICKS - date.getTime()).padStart(13, "0");
}

// ── Extract the single IFI from an actor ──
export function extractActorIFI(actor: Actor): { type: string; value: string } {
  const a = actor as Agent;
  if (a.mbox) return { type: "mbox", value: a.mbox };
  if (a.mbox_sha1sum) return { type: "mbox_sha1sum", value: a.mbox_sha1sum };
  if (a.openid) return { type: "openid", value: a.openid };
  if (a.account) return { type: "account", value: `${a.account.homePage}::${a.account.name}` };

  const g = actor as Group;
  if (g.mbox) return { type: "mbox", value: g.mbox };
  if (g.mbox_sha1sum) return { type: "mbox_sha1sum", value: g.mbox_sha1sum };
  if (g.openid) return { type: "openid", value: g.openid };
  if (g.account) return { type: "account", value: `${g.account.homePage}::${g.account.name}` };

  return { type: "anonymous", value: "anonymous-group" };
}

// ── Extract object info ──
function extractObjectInfo(obj: XAPIStatement["object"]): {
  objectType: string;
  objectId: string;
} {
  const objectType =
    (obj as { objectType?: string }).objectType || "Activity";
  let objectId = "";

  if (objectType === "Activity" || objectType === "Agent" || objectType === "Group") {
    objectId = (obj as { id?: string }).id || "";
  } else if (objectType === "StatementRef") {
    objectId = (obj as { id: string }).id;
  }

  return { objectType, objectId };
}

// ── Partition key from date: "YYYY-MM" ──
function partitionKeyFromDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ── Check for duplicate statement ID ──
async function findExistingStatement(
  statementId: string
): Promise<StatementIndexEntity | null> {
  const indexTable = await getTableClient("statementIndex");
  try {
    const entity = await indexTable.getEntity<StatementIndexEntity>(
      "sid",
      statementId
    );
    return entity;
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 404) return null;
    throw e;
  }
}

// ── Pagination cursor encoding/decoding ──
interface PaginationCursor {
  pk: string;
  rk: string;
  filters: string;
  ascending: boolean;
}

function encodeCursor(cursor: PaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(encoded: string): PaginationCursor | null {
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

// ── Format statement for response ──
function formatStatement(
  stmt: XAPIStatement,
  format: "exact" | "ids" | "canonical",
  acceptLanguage?: string
): XAPIStatement | Record<string, unknown> {
  if (format === "exact" || !format) return stmt;

  if (format === "ids") {
    return {
      id: stmt.id,
      timestamp: stmt.timestamp,
      stored: stmt.stored,
      authority: stmt.authority,
      version: stmt.version,
      verb: { id: stmt.verb.id },
      object: {
        objectType: (stmt.object as { objectType?: string }).objectType || "Activity",
        id: (stmt.object as { id?: string }).id,
      },
    };
  }

  if (format === "canonical") {
    return filterLanguageMaps(stmt, acceptLanguage || "en") as Record<string, unknown>;
  }

  return stmt;
}

// ── Filter language maps for canonical format ──
function filterLanguageMaps(
  obj: unknown,
  preferredLang: string
): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => filterLanguageMaps(item, preferredLang));

  const record = obj as Record<string, unknown>;

  // Detect if this is a language map (keys look like language tags)
  const keys = Object.keys(record);
  if (keys.length > 0 && keys.every((k) => /^[a-z]{2}(-[A-Za-z]+)*$/.test(k))) {
    // This looks like a language map — pick the best match
    const exact = record[preferredLang];
    if (exact !== undefined) return { [preferredLang]: exact };
    const prefix = preferredLang.split("-")[0];
    const prefixMatch = keys.find((k) => k.startsWith(prefix));
    if (prefixMatch) return { [prefixMatch]: record[prefixMatch] };
    // Fall back to first key
    return { [keys[0]]: record[keys[0]] };
  }

  // Recurse into object properties
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = filterLanguageMaps(value, preferredLang);
  }
  return result;
}

// ── Extract all agent IFIs from a statement (for related_agents) ──
function extractAllAgentIFIs(stmt: XAPIStatement): Array<{ type: string; value: string }> {
  const ifis: Array<{ type: string; value: string }> = [];

  // Primary actor
  ifis.push(extractActorIFI(stmt.actor));

  // Object as agent/group
  const objType = (stmt.object as { objectType?: string }).objectType || "Activity";
  if (objType === "Agent" || objType === "Group") {
    ifis.push(extractActorIFI(stmt.object as Actor));
  }

  // Context instructor
  if (stmt.context?.instructor) {
    ifis.push(extractActorIFI(stmt.context.instructor));
  }

  // Context team members
  if (stmt.context?.team?.member) {
    for (const member of stmt.context.team.member) {
      ifis.push(extractActorIFI(member));
    }
  }

  // Context team itself
  if (stmt.context?.team) {
    ifis.push(extractActorIFI(stmt.context.team));
  }

  return ifis;
}

// ── Extract all activity IDs from a statement (for related_activities) ──
function extractAllActivityIds(stmt: XAPIStatement): string[] {
  const ids: string[] = [];

  // Primary object
  const objType = (stmt.object as { objectType?: string }).objectType || "Activity";
  if (objType === "Activity") {
    const id = (stmt.object as Activity).id;
    if (id) ids.push(id);
  }

  // Context activities
  if (stmt.context?.contextActivities) {
    const ca = stmt.context.contextActivities;
    for (const group of [ca.parent, ca.grouping, ca.category, ca.other]) {
      if (group) {
        for (const act of group) {
          if (act.id) ids.push(act.id);
        }
      }
    }
  }

  return ids;
}

// ── Store statements ──
export async function storeStatements(
  incoming: XAPIStatement[],
  credential: CredentialEntity
): Promise<{ ids: string[]; conflicts: string[] }> {
  const statementsTable = await getTableClient("statements");
  const indexTable = await getTableClient("statementIndex");

  const authority: Agent = JSON.parse(credential.authorityAgent);
  const ids: string[] = [];
  const conflicts: string[] = [];

  for (let i = 0; i < incoming.length; i++) {
    const stmt = incoming[i];

    // Validate
    validateStatement(stmt, incoming.length > 1 ? i : undefined);

    // Assign server fields
    const statementId = stmt.id || uuidv4();
    const now = new Date();
    const stored = now.toISOString();
    const timestamp = stmt.timestamp || stored;

    // Check duplicate
    const existing = await findExistingStatement(statementId);
    if (existing) {
      const existingJson = await downloadBlob("statements", `${statementId}.json`);
      const existingStmt = JSON.parse(existingJson);
      const incomingCore = { actor: stmt.actor, verb: stmt.verb, object: stmt.object };
      const existingCore = {
        actor: existingStmt.actor,
        verb: existingStmt.verb,
        object: existingStmt.object,
      };
      if (JSON.stringify(incomingCore) === JSON.stringify(existingCore)) {
        ids.push(statementId);
        continue;
      } else {
        conflicts.push(statementId);
        continue;
      }
    }

    // Build the full statement with server-assigned fields
    const fullStatement: XAPIStatement = {
      ...stmt,
      id: statementId,
      stored,
      timestamp,
      authority,
      version: "1.0.3",
    };

    // Extract indexed fields
    const actorIFI = extractActorIFI(stmt.actor);
    const { objectType, objectId } = extractObjectInfo(stmt.object);
    const registration = stmt.context?.registration || "";

    // Write full JSON to Blob Storage
    await uploadBlob(
      "statements",
      `${statementId}.json`,
      JSON.stringify(fullStatement)
    );

    // Write metadata to Table Storage
    const pk = partitionKeyFromDate(now);
    const rk = `${reverseTimestamp(now)}-${statementId}`;

    const entity: StatementEntity = {
      partitionKey: pk,
      rowKey: rk,
      statementId,
      actorIfiType: actorIFI.type,
      actorIfiValue: actorIFI.value,
      verbId: stmt.verb.id,
      objectType,
      objectId,
      registration,
      timestamp,
      stored,
      isVoided: false,
      voidingStatementId: "",
      credentialId: credential.rowKey,
    };

    await statementsTable.createEntity(entity);

    // Write index entry
    const indexEntity: StatementIndexEntity = {
      partitionKey: "sid",
      rowKey: statementId,
      statementsPartitionKey: pk,
      statementsRowKey: rk,
    };

    await indexTable.createEntity(indexEntity);

    // Handle voiding: if this is a voiding statement, mark the target
    if (
      stmt.verb.id === "http://adlnet.gov/expapi/verbs/voided" &&
      (stmt.object as { objectType?: string }).objectType === "StatementRef"
    ) {
      const targetId = (stmt.object as { id: string }).id;
      await voidStatement(targetId, statementId);
    }

    ids.push(statementId);
  }

  return { ids, conflicts };
}

// ── Void a statement ──
async function voidStatement(
  targetStatementId: string,
  voidingStatementId: string
): Promise<void> {
  const statementsTable = await getTableClient("statements");
  const index = await findExistingStatement(targetStatementId);
  if (!index) return; // Target doesn't exist — spec says store the voiding statement anyway

  // Fetch the target metadata
  const entity = await statementsTable.getEntity<StatementEntity>(
    index.statementsPartitionKey,
    index.statementsRowKey
  );

  // Don't void already-voided statements
  if (entity.isVoided) return;

  // Don't void a voiding statement
  if (entity.verbId === "http://adlnet.gov/expapi/verbs/voided") return;

  // Update the target row to mark as voided
  await statementsTable.updateEntity(
    {
      partitionKey: index.statementsPartitionKey,
      rowKey: index.statementsRowKey,
      isVoided: true,
      voidingStatementId,
    },
    "Merge"
  );
}

// ── Query statements ──
export async function getStatements(
  params: StatementQueryParams,
  acceptLanguage?: string
): Promise<StatementResult> {
  // Single statement lookup by ID
  if (params.statementId) {
    return getStatementById(params.statementId, false, params.format, acceptLanguage);
  }
  if (params.voidedStatementId) {
    return getStatementById(params.voidedStatementId, true, params.format, acceptLanguage);
  }

  const statementsTable = await getTableClient("statements");
  const limit = Math.min(params.limit || 100, 500);
  const format = params.format || "exact";

  // Check if resuming from a pagination cursor
  let resumeCursor: PaginationCursor | null = null;
  if (params.from) {
    resumeCursor = decodeCursor(params.from);
  }

  // Build OData filter
  const filters: string[] = [];

  // Time range
  const now = new Date();
  const sinceDate = params.since ? new Date(params.since) : null;
  const untilDate = params.until ? new Date(params.until) : now;

  // Determine partition keys to scan
  const partitions = getPartitionRange(sinceDate, untilDate);

  // Voided filter
  filters.push("isVoided eq false");

  // Agent filter
  if (params.agent) {
    try {
      const agentObj = JSON.parse(params.agent) as Actor;
      const ifi = extractActorIFI(agentObj);
      filters.push(`actorIfiType eq '${escapeOData(ifi.type)}'`);
      filters.push(`actorIfiValue eq '${escapeOData(ifi.value)}'`);
    } catch {
      throw new ValidationError("agent parameter must be a valid JSON agent object");
    }
  }

  // Verb filter
  if (params.verb) {
    filters.push(`verbId eq '${escapeOData(params.verb)}'`);
  }

  // Activity filter
  if (params.activity) {
    filters.push(`objectId eq '${escapeOData(params.activity)}'`);
  }

  // Registration filter
  if (params.registration) {
    filters.push(`registration eq '${escapeOData(params.registration)}'`);
  }

  // Time filters
  if (params.since) {
    filters.push(`stored gt '${escapeOData(params.since)}'`);
  }
  if (params.until) {
    filters.push(`stored le '${escapeOData(params.until)}'`);
  }

  const filterString = filters.join(" and ");

  // Query across partitions
  const matchedEntities: StatementEntity[] = [];
  const orderedPartitions = params.ascending
    ? partitions
    : [...partitions].reverse();

  // If resuming, skip partitions we've already scanned
  let startFromPartition = false;
  const shouldSkipToResume = resumeCursor !== null;

  for (const pk of orderedPartitions) {
    if (matchedEntities.length >= limit + 1) break; // fetch one extra to detect more

    // Skip partitions before the resume point
    if (shouldSkipToResume && !startFromPartition) {
      if (pk === resumeCursor!.pk) {
        startFromPartition = true;
      } else {
        continue;
      }
    }

    let fullFilter = `PartitionKey eq '${escapeOData(pk)}' and ${filterString}`;

    // If resuming within this partition, add RowKey filter
    if (shouldSkipToResume && pk === resumeCursor!.pk) {
      if (params.ascending) {
        fullFilter += ` and RowKey lt '${escapeOData(resumeCursor!.rk)}'`;
      } else {
        fullFilter += ` and RowKey gt '${escapeOData(resumeCursor!.rk)}'`;
      }
    }

    const iterator = statementsTable.listEntities<StatementEntity>({
      queryOptions: { filter: fullFilter },
    });

    for await (const entity of iterator) {
      matchedEntities.push(entity);
      if (matchedEntities.length >= limit + 1) break;
    }
  }

  // Determine if there's a next page
  const hasMore = matchedEntities.length > limit;
  const resultEntities = hasMore ? matchedEntities.slice(0, limit) : matchedEntities;

  // Fetch full statements from Blob Storage
  const statements: (XAPIStatement | Record<string, unknown>)[] = [];
  for (const entity of resultEntities) {
    const json = await downloadBlob("statements", `${entity.statementId}.json`);
    let stmt: XAPIStatement = JSON.parse(json);

    // Apply related_activities / related_agents post-filtering
    if (params.related_activities && params.activity) {
      const allActivities = extractAllActivityIds(stmt);
      if (!allActivities.includes(params.activity)) continue;
    }
    if (params.related_agents && params.agent) {
      const agentObj = JSON.parse(params.agent) as Actor;
      const targetIfi = extractActorIFI(agentObj);
      const allIfis = extractAllAgentIFIs(stmt);
      const matches = allIfis.some(
        (ifi) => ifi.type === targetIfi.type && ifi.value === targetIfi.value
      );
      if (!matches) continue;
    }

    statements.push(formatStatement(stmt, format, acceptLanguage));
  }

  // Build `more` URL
  let more = "";
  if (hasMore) {
    const lastEntity = resultEntities[resultEntities.length - 1];
    const cursor = encodeCursor({
      pk: lastEntity.partitionKey,
      rk: lastEntity.rowKey,
      filters: filterString,
      ascending: params.ascending || false,
    });
    more = `/api/xapi/statements?from=${cursor}`;
  }

  return { statements: statements as XAPIStatement[], more };
}

// ── Get a single statement by ID ──
async function getStatementById(
  statementId: string,
  voided: boolean,
  format?: "exact" | "ids" | "canonical",
  acceptLanguage?: string
): Promise<StatementResult> {
  const index = await findExistingStatement(statementId);
  if (!index) {
    return { statements: [], more: "" };
  }

  const statementsTable = await getTableClient("statements");
  const entity = await statementsTable.getEntity<StatementEntity>(
    index.statementsPartitionKey,
    index.statementsRowKey
  );

  if (!voided && entity.isVoided) {
    return { statements: [], more: "" };
  }
  if (voided && !entity.isVoided) {
    return { statements: [], more: "" };
  }

  const json = await downloadBlob("statements", `${statementId}.json`);
  const stmt: XAPIStatement = JSON.parse(json);
  const formatted = formatStatement(stmt, format || "exact", acceptLanguage);
  return { statements: [formatted as XAPIStatement], more: "" };
}

// ── Generate "YYYY-MM" partition keys between two dates ──
function getPartitionRange(
  since: Date | null,
  until: Date
): string[] {
  const start = since || new Date(until.getTime() - 365 * 24 * 60 * 60 * 1000);
  const partitions: string[] = [];

  const current = new Date(start.getUTCFullYear(), start.getUTCMonth(), 1);
  const end = new Date(until.getUTCFullYear(), until.getUTCMonth(), 1);

  while (current <= end) {
    partitions.push(partitionKeyFromDate(current));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return partitions;
}
