import type {
  XAPIStatement,
  Actor,
  Agent,
  Group,
  Verb,
  StatementObject,
  Activity,
  StatementRef,
  SubStatement,
  Result,
  Score,
  Context,
  ContextActivities,
} from "./types";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// ── Helpers: strict type assertions ──

function assertIsObject(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new ValidationError(`${path}: must be a non-null object`);
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${path}: must be a non-null object`);
  }
}

function assertIsString(value: unknown, path: string): asserts value is string {
  if (value === null || value === undefined || typeof value !== "string") {
    throw new ValidationError(`${path}: must be a string`);
  }
}

function assertIsBoolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${path}: must be a boolean`);
  }
}

function assertIsNumber(value: unknown, path: string): asserts value is number {
  if (typeof value !== "number" || isNaN(value)) {
    throw new ValidationError(`${path}: must be a number`);
  }
}

// ── IRI validation (loose — must be a URI-like string) ──
function isValidIRI(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    // Also allow mailto: URIs
    if (value.startsWith("mailto:")) return true;
    return false;
  }
}

// ── UUID validation ──
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

// ── ISO 8601 timestamp validation ──
// Strict ISO 8601 with explicit UTC offset. Per xAPI 1.0.3 §4.6:
// timestamps MUST be in UTC and the "-00:00" / "-0000" offsets are rejected
// (they signify "UTC equivalent with unknown origin" per ISO 8601, which the
// conformance suite treats as ambiguous).
const TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

function isValidTimestamp(value: string): boolean {
  const m = TIMESTAMP_RE.exec(value);
  if (!m) return false;
  const offset = m[1];
  // Reject "-00:00" and "-0000" — ambiguous in ISO 8601
  if (offset === "-00:00" || offset === "-0000") return false;
  // Make sure Date.parse also accepts it (catches edge cases like Feb 30)
  return !isNaN(Date.parse(value));
}

// ── ISO 8601 duration validation ──
// xAPI accepts standard ISO 8601 durations. Per ISO 8601:2004 §4.4.3.2,
// the "weeks" form (PnW) is mutually exclusive with the other date components.
// So P4W is valid; P4W1D is NOT.
const DURATION_FULL_RE =
  /^P(\d+(?:\.\d+)?Y)?(\d+(?:\.\d+)?M)?(\d+(?:\.\d+)?D)?(T(\d+(?:\.\d+)?H)?(\d+(?:\.\d+)?M)?(\d+(?:\.\d+)?S)?)?$/;
const DURATION_WEEKS_RE = /^P\d+(?:\.\d+)?W$/;

function isValidDuration(value: string): boolean {
  if (!value.startsWith("P")) return false;
  if (value === "P") return false; // bare P with nothing

  // Weeks form: PnW. Per ISO 8601, weeks cannot be combined with other units.
  if (DURATION_WEEKS_RE.test(value)) return true;

  const match = DURATION_FULL_RE.exec(value);
  if (!match) return false;
  // Must have at least one component after P
  // groups 1-3 are date (Y, M, D); group 4 is the T-section; 5-7 are time (H, M, S)
  const hasDate = match[1] || match[2] || match[3];
  const hasTime = match[5] || match[6] || match[7];
  const hasT = value.includes("T");
  // If T is present, there must be at least one time component
  if (hasT && !hasTime) return false;
  if (!hasDate && !hasTime) return false;
  return true;
}

// ── BCP47 language tag validation ──
const BCP47_RE = /^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/;

function isValidLanguageTag(tag: string): boolean {
  if (!tag || !BCP47_RE.test(tag)) return false;
  // Check for repeated singleton subtags (single-letter/digit subtags that appear more than once)
  const parts = tag.split("-");
  const singletons: Set<string> = new Set();
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].length === 1) {
      const lower = parts[i].toLowerCase();
      if (singletons.has(lower)) return false; // duplicate singleton
      singletons.add(lower);
    }
  }
  return true;
}

// ── Unknown property rejection helper ──
function rejectUnknownProperties(
  obj: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new ValidationError(`${path}: unknown property "${key}"`);
    }
  }
}

// ── Known property sets per xAPI spec ──
const STATEMENT_PROPS = new Set(["id", "actor", "verb", "object", "result", "context", "timestamp", "stored", "authority", "version", "attachments"]);
const AGENT_PROPS = new Set(["objectType", "name", "mbox", "mbox_sha1sum", "openid", "account"]);
const GROUP_PROPS = new Set(["objectType", "name", "mbox", "mbox_sha1sum", "openid", "account", "member"]);
const VERB_PROPS = new Set(["id", "display"]);
const ACTIVITY_PROPS = new Set(["objectType", "id", "definition"]);
const ACTIVITY_DEF_PROPS = new Set(["name", "description", "type", "moreInfo", "interactionType", "correctResponsesPattern", "choices", "scale", "source", "target", "steps", "extensions"]);
const RESULT_PROPS = new Set(["score", "success", "completion", "response", "duration", "extensions"]);
const SCORE_PROPS = new Set(["scaled", "raw", "min", "max"]);
const CONTEXT_PROPS = new Set(["registration", "instructor", "team", "contextActivities", "revision", "platform", "language", "statement", "extensions"]);
const CONTEXT_ACTIVITIES_PROPS = new Set(["parent", "grouping", "category", "other"]);
const STATEMENT_REF_PROPS = new Set(["objectType", "id"]);
const SUB_STATEMENT_PROPS = new Set(["objectType", "actor", "verb", "object", "result", "context", "timestamp", "attachments"]);
const ACCOUNT_PROPS = new Set(["homePage", "name"]);
const ATTACHMENT_PROPS = new Set(["usageType", "display", "description", "contentType", "length", "sha2", "fileUrl"]);

// ── Mbox email validation ──
const MBOX_RE = /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isValidMbox(value: string): boolean {
  return MBOX_RE.test(value);
}

// ── Validate Extensions ──
// xAPI spec: extension keys MUST be valid IRIs
function validateExtensions(extensions: unknown, path: string): void {
  if (extensions === undefined) return;
  assertIsObject(extensions, path);
  const ext = extensions as Record<string, unknown>;
  for (const key of Object.keys(ext)) {
    if (!isValidIRI(key)) {
      throw new ValidationError(`${path}["${key}"]: extension keys must be valid IRIs`);
    }
  }
}

// ── Validate a LanguageMap ──
function validateLanguageMap(value: unknown, path: string): void {
  assertIsObject(value, path);
  const map = value as Record<string, unknown>;
  for (const key of Object.keys(map)) {
    if (!isValidLanguageTag(key)) {
      throw new ValidationError(`${path}["${key}"]: invalid language tag`);
    }
    if (typeof map[key] !== "string") {
      throw new ValidationError(`${path}["${key}"]: language map values must be strings`);
    }
  }
}

// ── Count Inverse Functional Identifiers on an agent/group ──
function countIFIs(
  obj: Record<string, unknown>
): number {
  let count = 0;
  if (obj.mbox !== undefined) count++;
  if (obj.mbox_sha1sum !== undefined) count++;
  if (obj.openid !== undefined) count++;
  if (obj.account !== undefined) count++;
  return count;
}

// ── Valid interaction types (case-sensitive) ──
const VALID_INTERACTION_TYPES = new Set([
  "true-false",
  "choice",
  "fill-in",
  "long-fill-in",
  "matching",
  "performance",
  "sequencing",
  "likert",
  "numeric",
  "other",
]);

// ── Validate Agent ──
function validateAgent(agent: unknown, path: string): void {
  assertIsObject(agent, path);
  const a = agent as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(a, AGENT_PROPS, path);

  // name must be a string if present
  if (a.name !== undefined) {
    assertIsString(a.name, `${path}.name`);
  }

  const ifiCount = countIFIs(a);
  if (ifiCount === 0) {
    throw new ValidationError(
      `${path}: must have exactly one IFI (mbox, mbox_sha1sum, openid, or account), found none`
    );
  }
  if (ifiCount > 1) {
    throw new ValidationError(
      `${path}: must have exactly one IFI, found ${ifiCount}`
    );
  }

  if (a.mbox !== undefined) {
    assertIsString(a.mbox, `${path}.mbox`);
    if (!isValidMbox(a.mbox as string)) {
      throw new ValidationError(`${path}.mbox: must be a valid mailto: IRI (mailto:user@example.com)`);
    }
  }
  if (a.mbox_sha1sum !== undefined) {
    assertIsString(a.mbox_sha1sum, `${path}.mbox_sha1sum`);
  }
  if (a.openid !== undefined) {
    assertIsString(a.openid, `${path}.openid`);
    if (!isValidIRI(a.openid as string)) {
      throw new ValidationError(`${path}.openid: must be a valid URI`);
    }
  }
  if (a.account !== undefined) {
    assertIsObject(a.account, `${path}.account`);
    const acct = a.account as Record<string, unknown>;
    rejectUnknownProperties(acct, ACCOUNT_PROPS, `${path}.account`);
    if (acct.homePage === undefined || acct.homePage === null) {
      throw new ValidationError(`${path}.account.homePage: required and must be a string`);
    }
    assertIsString(acct.homePage, `${path}.account.homePage`);
    if (!isValidIRI(acct.homePage as string)) {
      throw new ValidationError(`${path}.account.homePage: must be a valid IRL`);
    }
    if (acct.name === undefined || acct.name === null) {
      throw new ValidationError(`${path}.account.name: required and must be a string`);
    }
    assertIsString(acct.name, `${path}.account.name`);
  }

  if (a.objectType !== undefined && a.objectType !== "Agent") {
    throw new ValidationError(
      `${path}.objectType: if present on an agent, must be "Agent"`
    );
  }
}

// ── Validate Group ──
function validateGroup(group: unknown, path: string): void {
  assertIsObject(group, path);
  const g = group as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(g, GROUP_PROPS, path);

  if (g.objectType !== "Group") {
    throw new ValidationError(`${path}.objectType: must be "Group"`);
  }

  // name must be a string if present
  if (g.name !== undefined) {
    assertIsString(g.name, `${path}.name`);
  }

  const ifiCount = countIFIs(g);
  // Identified group has IFI, anonymous group has member array
  if (ifiCount === 0) {
    // Anonymous group — must have member array
    if (!g.member || !Array.isArray(g.member) || g.member.length === 0) {
      throw new ValidationError(
        `${path}: anonymous group must have a non-empty member array`
      );
    }
  }
  if (ifiCount > 1) {
    throw new ValidationError(
      `${path}: group must have at most one IFI, found ${ifiCount}`
    );
  }

  // Validate IFI fields on the group itself (same rules as agent)
  if (g.mbox !== undefined) {
    assertIsString(g.mbox, `${path}.mbox`);
    if (!isValidMbox(g.mbox as string)) {
      throw new ValidationError(`${path}.mbox: must be a valid mailto: IRI (mailto:user@example.com)`);
    }
  }
  if (g.mbox_sha1sum !== undefined) {
    assertIsString(g.mbox_sha1sum, `${path}.mbox_sha1sum`);
  }
  if (g.openid !== undefined) {
    assertIsString(g.openid, `${path}.openid`);
    if (!isValidIRI(g.openid as string)) {
      throw new ValidationError(`${path}.openid: must be a valid URI`);
    }
  }
  if (g.account !== undefined) {
    assertIsObject(g.account, `${path}.account`);
    const acct = g.account as Record<string, unknown>;
    rejectUnknownProperties(acct, ACCOUNT_PROPS, `${path}.account`);
    if (acct.homePage === undefined || acct.homePage === null) {
      throw new ValidationError(`${path}.account.homePage: required and must be a string`);
    }
    assertIsString(acct.homePage, `${path}.account.homePage`);
    if (!isValidIRI(acct.homePage as string)) {
      throw new ValidationError(`${path}.account.homePage: must be a valid IRL`);
    }
    if (acct.name === undefined || acct.name === null) {
      throw new ValidationError(`${path}.account.name: required and must be a string`);
    }
    assertIsString(acct.name, `${path}.account.name`);
  }

  if (g.member !== undefined) {
    if (!Array.isArray(g.member)) {
      throw new ValidationError(`${path}.member: must be an array`);
    }
    for (let i = 0; i < g.member.length; i++) {
      validateAgent(g.member[i], `${path}.member[${i}]`);
    }
  }
}

// ── Validate Actor (Agent or Group) ──
function validateActor(actor: unknown, path: string): void {
  // Explicit null/undefined check BEFORE typeof (typeof null === 'object' in JS)
  if (actor === null || actor === undefined) {
    throw new ValidationError(`${path}: must be a non-null object`);
  }
  assertIsObject(actor, path);
  const a = actor as Record<string, unknown>;
  if (a.objectType === "Group") {
    validateGroup(actor, path);
  } else {
    validateAgent(actor, path);
  }
}

// ── Validate Verb ──
function validateVerb(verb: unknown, path: string): void {
  assertIsObject(verb, path);
  const v = verb as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(v, VERB_PROPS, path);

  if (v.id === undefined || v.id === null) {
    throw new ValidationError(`${path}.id: required`);
  }
  assertIsString(v.id, `${path}.id`);
  if (!isValidIRI(v.id as string)) {
    throw new ValidationError(`${path}.id: must be a valid IRI`);
  }
  if (v.display !== undefined) {
    validateLanguageMap(v.display, `${path}.display`);
  }
}

// ── Validate Activity ──
function validateActivity(activity: unknown, path: string): void {
  assertIsObject(activity, path);
  const act = activity as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(act, ACTIVITY_PROPS, path);

  if (act.id === undefined || act.id === null) {
    throw new ValidationError(`${path}.id: required for Activity`);
  }
  assertIsString(act.id, `${path}.id`);
  if (!isValidIRI(act.id as string)) {
    throw new ValidationError(`${path}.id: must be a valid IRI`);
  }

  if (act.definition !== undefined) {
    assertIsObject(act.definition, `${path}.definition`);
    const def = act.definition as Record<string, unknown>;

    // Reject unknown properties on definition
    rejectUnknownProperties(def, ACTIVITY_DEF_PROPS, `${path}.definition`);

    if (def.name !== undefined) {
      validateLanguageMap(def.name, `${path}.definition.name`);
    }
    if (def.description !== undefined) {
      validateLanguageMap(def.description, `${path}.definition.description`);
    }
    if (def.interactionType !== undefined) {
      assertIsString(def.interactionType, `${path}.definition.interactionType`);
      if (!VALID_INTERACTION_TYPES.has(def.interactionType as string)) {
        throw new ValidationError(
          `${path}.definition.interactionType: invalid value "${def.interactionType}". Must be one of: ${Array.from(VALID_INTERACTION_TYPES).join(", ")}`
        );
      }
    }
    if (def.type !== undefined) {
      assertIsString(def.type, `${path}.definition.type`);
      if (!isValidIRI(def.type as string)) {
        throw new ValidationError(`${path}.definition.type: must be a valid IRI`);
      }
    }
    if (def.moreInfo !== undefined) {
      assertIsString(def.moreInfo, `${path}.definition.moreInfo`);
      if (!isValidIRI(def.moreInfo as string)) {
        throw new ValidationError(`${path}.definition.moreInfo: must be a valid IRL`);
      }
    }

    // correctResponsesPattern requires interactionType per xAPI spec
    if (def.correctResponsesPattern !== undefined && def.interactionType === undefined) {
      throw new ValidationError(
        `${path}.definition: correctResponsesPattern requires interactionType to be present`
      );
    }

    // Validate extension keys are valid IRIs
    validateExtensions(def.extensions, `${path}.definition.extensions`);
  }
}

// ── Validate StatementRef ──
function validateStatementRef(ref: unknown, path: string): void {
  assertIsObject(ref, path);
  const r = ref as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(r, STATEMENT_REF_PROPS, path);

  // objectType is case-sensitive per xAPI spec — reject "statementref" etc.
  if (r.objectType !== undefined && r.objectType !== "StatementRef") {
    throw new ValidationError(
      `${path}.objectType: must be exactly "StatementRef" (case-sensitive), got "${r.objectType}"`
    );
  }

  if (r.id === undefined || r.id === null) {
    throw new ValidationError(`${path}.id: required for StatementRef`);
  }
  assertIsString(r.id, `${path}.id`);
  if (!isValidUUID(r.id as string)) {
    throw new ValidationError(`${path}.id: must be a valid UUID`);
  }
}

// ── Validate SubStatement ──
function validateSubStatement(sub: unknown, path: string): void {
  assertIsObject(sub, path);
  const s = sub as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(s, SUB_STATEMENT_PROPS, path);

  if (s.id !== undefined) {
    throw new ValidationError(`${path}: SubStatement must not have an id`);
  }
  if (s.stored !== undefined) {
    throw new ValidationError(
      `${path}: SubStatement must not have a stored property`
    );
  }
  if (s.authority !== undefined) {
    throw new ValidationError(
      `${path}: SubStatement must not have an authority property`
    );
  }
  if (s.version !== undefined) {
    throw new ValidationError(
      `${path}: SubStatement must not have a version property`
    );
  }

  // Required: actor
  if (s.actor === undefined) {
    throw new ValidationError(`${path}.actor: required`);
  }
  validateActor(s.actor, `${path}.actor`);

  // Required: verb
  if (s.verb === undefined) {
    throw new ValidationError(`${path}.verb: required`);
  }
  validateVerb(s.verb, `${path}.verb`);

  // Required: object
  if (s.object === undefined) {
    throw new ValidationError(`${path}.object: required`);
  }
  validateStatementObject(s.object, `${path}.object`, true);

  // Optional: result (full validation)
  if (s.result !== undefined) {
    validateResult(s.result, `${path}.result`);
  }

  // Optional: context (full validation)
  if (s.context !== undefined) {
    const subObjType = (s.object as Record<string, unknown>).objectType as string || "Activity";
    validateContext(s.context, `${path}.context`, subObjType);
  }

  // Optional: timestamp
  if (s.timestamp !== undefined) {
    assertIsString(s.timestamp, `${path}.timestamp`);
    if (!isValidTimestamp(s.timestamp as string)) {
      throw new ValidationError(
        `${path}.timestamp: must be a valid ISO 8601 timestamp`
      );
    }
  }

  // Optional: attachments
  if (s.attachments !== undefined) {
    if (!Array.isArray(s.attachments)) {
      throw new ValidationError(`${path}.attachments: must be an array`);
    }
    for (let i = 0; i < s.attachments.length; i++) {
      validateAttachment(s.attachments[i], `${path}.attachments[${i}]`);
    }
  }
}

// ── Validate Statement Object ──
function validateStatementObject(
  obj: unknown,
  path: string,
  insideSubStatement = false
): void {
  assertIsObject(obj, path);
  const o = obj as Record<string, unknown>;

  const objectType = (o.objectType as string) || "Activity";

  switch (objectType) {
    case "Activity":
      validateActivity(obj, path);
      break;
    case "Agent":
      validateAgent(obj, path);
      break;
    case "Group":
      validateGroup(obj, path);
      break;
    case "StatementRef":
      validateStatementRef(obj, path);
      break;
    case "SubStatement":
      if (insideSubStatement) {
        throw new ValidationError(
          `${path}: SubStatement cannot contain another SubStatement`
        );
      }
      validateSubStatement(obj, path);
      break;
    default:
      throw new ValidationError(
        `${path}.objectType: invalid value "${objectType}"`
      );
  }
}

// ── Validate Score ──
function validateScore(score: unknown, path: string): void {
  assertIsObject(score, path);
  const s = score as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(s, SCORE_PROPS, path);

  if (s.scaled !== undefined) {
    assertIsNumber(s.scaled, `${path}.scaled`);
    if ((s.scaled as number) < -1 || (s.scaled as number) > 1) {
      throw new ValidationError(
        `${path}.scaled: must be a number between -1.0 and 1.0`
      );
    }
  }
  if (s.raw !== undefined) {
    assertIsNumber(s.raw, `${path}.raw`);
  }
  if (s.min !== undefined) {
    assertIsNumber(s.min, `${path}.min`);
  }
  if (s.max !== undefined) {
    assertIsNumber(s.max, `${path}.max`);
  }
  if (s.min !== undefined && s.max !== undefined) {
    if ((s.min as number) > (s.max as number)) {
      throw new ValidationError(`${path}: min must be <= max`);
    }
  }
  if (s.raw !== undefined) {
    if (s.min !== undefined && (s.raw as number) < (s.min as number)) {
      throw new ValidationError(
        `${path}.raw: must be >= min (${s.min})`
      );
    }
    if (s.max !== undefined && (s.raw as number) > (s.max as number)) {
      throw new ValidationError(
        `${path}.raw: must be <= max (${s.max})`
      );
    }
  }
}

// ── Validate Result ──
function validateResult(result: unknown, path: string): void {
  assertIsObject(result, path);
  const r = result as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(r, RESULT_PROPS, path);

  if (r.score !== undefined) {
    validateScore(r.score, `${path}.score`);
  }
  if (r.success !== undefined) {
    assertIsBoolean(r.success, `${path}.success`);
  }
  if (r.completion !== undefined) {
    assertIsBoolean(r.completion, `${path}.completion`);
  }
  if (r.response !== undefined) {
    assertIsString(r.response, `${path}.response`);
  }
  if (r.duration !== undefined) {
    assertIsString(r.duration, `${path}.duration`);
    if (!isValidDuration(r.duration as string)) {
      throw new ValidationError(
        `${path}.duration: must be a valid ISO 8601 duration`
      );
    }
  }

  // Validate extension keys are valid IRIs
  validateExtensions(r.extensions, `${path}.extensions`);
}

// ── Validate Context Activities ──
// Accepts single Activity objects or arrays. Validation only -- normalization
// (wrapping singles into arrays) is done separately by normalizeStatement.
function validateContextActivities(
  ca: unknown,
  path: string
): void {
  assertIsObject(ca, path);
  const c = ca as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(c, CONTEXT_ACTIVITIES_PROPS, path);

  const keys = ["parent", "grouping", "category", "other"] as const;
  for (const key of keys) {
    if (c[key] !== undefined) {
      if (c[key] === null) {
        throw new ValidationError(`${path}.${key}: must be an Activity object or array of Activity objects`);
      }
      if (Array.isArray(c[key])) {
        const arr = c[key] as unknown[];
        for (let i = 0; i < arr.length; i++) {
          validateActivity(arr[i], `${path}.${key}[${i}]`);
        }
      } else if (typeof c[key] === "object") {
        // Single Activity object — valid per spec, will be wrapped by normalizeStatement
        validateActivity(c[key], `${path}.${key}`);
      } else {
        throw new ValidationError(
          `${path}.${key}: must be an Activity object or array of Activity objects`
        );
      }
    }
  }
}

// ── Validate Context ──
// objectType: the objectType of the Statement's Object (default "Activity").
// Per xAPI 4.1.6, "revision" and "platform" MUST only be used when object is Activity.
function validateContext(ctx: unknown, path: string, objectType: string = "Activity"): void {
  assertIsObject(ctx, path);
  const c = ctx as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(c, CONTEXT_PROPS, path);

  if (c.registration !== undefined) {
    assertIsString(c.registration, `${path}.registration`);
    if (!isValidUUID(c.registration as string)) {
      throw new ValidationError(
        `${path}.registration: must be a valid UUID`
      );
    }
  }
  if (c.instructor !== undefined) {
    validateActor(c.instructor, `${path}.instructor`);
  }
  if (c.team !== undefined) {
    validateGroup(c.team, `${path}.team`);
  }
  if (c.contextActivities !== undefined) {
    validateContextActivities(
      c.contextActivities,
      `${path}.contextActivities`
    );
  }
  if (c.revision !== undefined) {
    if (objectType !== "Activity") {
      throw new ValidationError(
        `${path}.revision: revision is not allowed when the Statement's Object is a ${objectType}`
      );
    }
    assertIsString(c.revision, `${path}.revision`);
  }
  if (c.platform !== undefined) {
    if (objectType !== "Activity") {
      throw new ValidationError(
        `${path}.platform: platform is not allowed when the Statement's Object is a ${objectType}`
      );
    }
    assertIsString(c.platform, `${path}.platform`);
  }
  if (c.language !== undefined) {
    assertIsString(c.language, `${path}.language`);
    if (!isValidLanguageTag(c.language as string)) {
      throw new ValidationError(`${path}.language: must be a valid BCP47 language tag`);
    }
  }
  if (c.statement !== undefined) {
    // xAPI §4.1.6.4: context.statement MUST NOT be present when the
    // Statement Object is a SubStatement or StatementRef.
    if (objectType === "SubStatement" || objectType === "StatementRef") {
      throw new ValidationError(
        `${path}.statement: not allowed when the Statement's Object is a ${objectType}`
      );
    }
    validateStatementRef(c.statement, `${path}.statement`);
  }

  // Validate extension keys are valid IRIs
  validateExtensions(c.extensions, `${path}.extensions`);
}

// ── Validate Authority ──
function validateAuthority(authority: unknown, path: string): void {
  // Explicit null check
  if (authority === null || authority === undefined) {
    throw new ValidationError(`${path}: must be a non-null object`);
  }
  assertIsObject(authority, path);
  const a = authority as Record<string, unknown>;

  const objectType = a.objectType as string | undefined;

  if (objectType !== undefined && objectType !== "Agent" && objectType !== "Group") {
    throw new ValidationError(
      `${path}.objectType: must be "Agent" or "Group"`
    );
  }

  if (objectType === "Group") {
    // Per xAPI §4.1.10.5: authority Group MUST be an Anonymous Group —
    // it represents an OAuth client + user pair and MUST NOT itself carry
    // any IFI (mbox / mbox_sha1sum / openid / account).
    const groupIfis = countIFIs(a);
    if (groupIfis > 0) {
      throw new ValidationError(
        `${path}: authority Group MUST be an Anonymous Group (no IFI on the group itself)`
      );
    }
    // OAuth consumer: Group with exactly 2 members
    if (!a.member || !Array.isArray(a.member)) {
      throw new ValidationError(
        `${path}: authority Group must have a member array`
      );
    }
    if ((a.member as unknown[]).length !== 2) {
      throw new ValidationError(
        `${path}: authority Group must have exactly 2 members (OAuth scenario)`
      );
    }
    // Each member must be an Agent with exactly 1 IFI
    for (let i = 0; i < (a.member as unknown[]).length; i++) {
      const member = (a.member as unknown[])[i];
      assertIsObject(member, `${path}.member[${i}]`);
      const m = member as Record<string, unknown>;
      if (m.objectType !== undefined && m.objectType !== "Agent") {
        throw new ValidationError(
          `${path}.member[${i}].objectType: authority group members must be Agents`
        );
      }
      const mifiCount = countIFIs(m);
      if (mifiCount !== 1) {
        throw new ValidationError(
          `${path}.member[${i}]: must have exactly one IFI, found ${mifiCount}`
        );
      }
      // Validate the agent fields
      validateAgent(member, `${path}.member[${i}]`);
    }
  } else {
    // Agent authority — must have exactly 1 IFI
    const ifiCount = countIFIs(a);
    if (ifiCount !== 1) {
      throw new ValidationError(
        `${path}: authority Agent must have exactly one IFI, found ${ifiCount}`
      );
    }
    validateAgent(authority, path);
  }
}

// ── Validate Attachment ──
function validateAttachment(att: unknown, path: string): void {
  assertIsObject(att, path);
  const a = att as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(a, ATTACHMENT_PROPS, path);

  if (a.usageType === undefined) {
    throw new ValidationError(`${path}.usageType: required`);
  }
  assertIsString(a.usageType, `${path}.usageType`);
  if (!isValidIRI(a.usageType as string)) {
    throw new ValidationError(`${path}.usageType: must be a valid IRI`);
  }

  if (a.display === undefined) {
    throw new ValidationError(`${path}.display: required`);
  }
  validateLanguageMap(a.display, `${path}.display`);

  if (a.description !== undefined) {
    validateLanguageMap(a.description, `${path}.description`);
  }

  if (a.contentType === undefined) {
    throw new ValidationError(`${path}.contentType: required`);
  }
  assertIsString(a.contentType, `${path}.contentType`);

  if (a.length === undefined) {
    throw new ValidationError(`${path}.length: required`);
  }
  assertIsNumber(a.length, `${path}.length`);

  if (a.sha2 === undefined) {
    throw new ValidationError(`${path}.sha2: required`);
  }
  assertIsString(a.sha2, `${path}.sha2`);

  if (a.fileUrl !== undefined) {
    assertIsString(a.fileUrl, `${path}.fileUrl`);
    if (!isValidIRI(a.fileUrl as string)) {
      throw new ValidationError(`${path}.fileUrl: must be a valid IRL`);
    }
  }
}

// ── Validate a single statement ──
export function validateStatement(stmt: unknown, index?: number): void {
  const prefix = index !== undefined ? `statements[${index}]` : "statement";

  // Must be a non-null object
  if (stmt === null || stmt === undefined) {
    throw new ValidationError(`${prefix}: must be a non-null object`);
  }
  assertIsObject(stmt, prefix);
  const s = stmt as Record<string, unknown>;

  // Reject unknown properties
  rejectUnknownProperties(s, STATEMENT_PROPS, prefix);

  // ID validation (if provided)
  if (s.id !== undefined) {
    if (s.id === null) {
      throw new ValidationError(`${prefix}.id: must be a valid UUID`);
    }
    assertIsString(s.id, `${prefix}.id`);
    if (!isValidUUID(s.id as string)) {
      throw new ValidationError(`${prefix}.id: must be a valid UUID`);
    }
  }

  // Required: actor
  if (s.actor === undefined || s.actor === null) {
    throw new ValidationError(`${prefix}.actor: required`);
  }
  validateActor(s.actor, `${prefix}.actor`);

  // Required: verb
  if (s.verb === undefined || s.verb === null) {
    throw new ValidationError(`${prefix}.verb: required`);
  }
  validateVerb(s.verb, `${prefix}.verb`);

  // Required: object
  if (s.object === undefined || s.object === null) {
    throw new ValidationError(`${prefix}.object: required`);
  }
  validateStatementObject(s.object, `${prefix}.object`);

  // Optional: result
  if (s.result !== undefined) {
    validateResult(s.result, `${prefix}.result`);
  }

  // Optional: context
  if (s.context !== undefined) {
    const objType = (s.object as Record<string, unknown>).objectType as string || "Activity";
    validateContext(s.context, `${prefix}.context`, objType);
  }

  // Optional: authority
  if (s.authority !== undefined) {
    validateAuthority(s.authority, `${prefix}.authority`);
  }

  // Optional: timestamp
  if (s.timestamp !== undefined) {
    assertIsString(s.timestamp, `${prefix}.timestamp`);
    if (!isValidTimestamp(s.timestamp as string)) {
      throw new ValidationError(
        `${prefix}.timestamp: must be a valid ISO 8601 timestamp`
      );
    }
  }

  // Optional: version — per xAPI 1.0.3 §4.1.10, MUST match "1.0.x" semver
  // (we accept any 1.0.x patch level; 0.x and 1.1+ are rejected).
  if (s.version !== undefined) {
    assertIsString(s.version, `${prefix}.version`);
    if (!/^1\.0(?:\.\d+)?$/.test(s.version as string)) {
      throw new ValidationError(
        `${prefix}.version: must be "1.0" or "1.0.x" (got "${s.version}")`
      );
    }
  }

  // Optional: attachments
  if (s.attachments !== undefined) {
    if (!Array.isArray(s.attachments)) {
      throw new ValidationError(`${prefix}.attachments: must be an array`);
    }
    for (let i = 0; i < s.attachments.length; i++) {
      validateAttachment(s.attachments[i], `${prefix}.attachments[${i}]`);
    }
  }

  // Voiding checks
  const verb = s.verb as Record<string, unknown>;
  if (verb.id === "http://adlnet.gov/expapi/verbs/voided") {
    const obj = s.object as Record<string, unknown>;
    if (obj.objectType !== "StatementRef") {
      throw new ValidationError(
        `${prefix}: voiding statement object must be a StatementRef`
      );
    }
  }
}

// ── Validate an array of statements ──
export function validateStatements(stmts: unknown): void {
  if (!Array.isArray(stmts)) {
    throw new ValidationError(
      "Request body must be a statement object or array"
    );
  }
  for (let i = 0; i < stmts.length; i++) {
    validateStatement(stmts[i], stmts.length > 1 ? i : undefined);
  }
}

// ── Normalize contextActivities — wrap single objects into arrays ──
function normalizeContextActivities(
  ca: Record<string, unknown>
): { normalized: Record<string, unknown>; modified: boolean } {
  const keys = ["parent", "grouping", "category", "other"] as const;
  let modified = false;
  const normalizedCA: Record<string, unknown> = { ...ca };

  for (const key of keys) {
    if (ca[key] !== undefined && !Array.isArray(ca[key])) {
      // Single Activity object — wrap in array
      normalizedCA[key] = [ca[key]];
      modified = true;
    }
  }

  return { normalized: normalizedCA, modified };
}

// ── Normalize a statement ──
// Auto-wraps single contextActivities objects into arrays per the xAPI spec.
// Call this AFTER validation but BEFORE storage.
// Also normalizes substatement contextActivities.
export function normalizeStatement(stmt: XAPIStatement): XAPIStatement {
  let result = stmt;
  let modified = false;

  // Normalize top-level contextActivities
  if (result.context?.contextActivities) {
    const ca = result.context.contextActivities as Record<string, unknown>;
    const { normalized, modified: caModified } = normalizeContextActivities(ca);
    if (caModified) {
      result = {
        ...result,
        context: {
          ...result.context,
          contextActivities: normalized as unknown as ContextActivities,
        },
      };
      modified = true;
    }
  }

  // Normalize substatement contextActivities
  const obj = result.object as Record<string, unknown>;
  if (obj && obj.objectType === "SubStatement") {
    const sub = obj as Record<string, unknown>;
    const subCtx = sub.context as Record<string, unknown> | undefined;
    if (subCtx?.contextActivities) {
      const subCA = subCtx.contextActivities as Record<string, unknown>;
      const { normalized, modified: subModified } = normalizeContextActivities(subCA);
      if (subModified) {
        result = {
          ...result,
          object: {
            ...sub,
            context: {
              ...subCtx,
              contextActivities: normalized as unknown as ContextActivities,
            },
          } as unknown as XAPIStatement["object"],
        };
        modified = true;
      }
    }
  }

  return modified ? result : stmt;
}
