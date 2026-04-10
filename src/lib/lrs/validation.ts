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
function isValidTimestamp(value: string): boolean {
  return !isNaN(Date.parse(value));
}

// ── ISO 8601 duration validation (loose) ──
const DURATION_RE = /^P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;

function isValidDuration(value: string): boolean {
  return DURATION_RE.test(value);
}

// ── Count Inverse Functional Identifiers on an agent/group ──
function countIFIs(
  obj: { mbox?: string; mbox_sha1sum?: string; openid?: string; account?: unknown }
): number {
  let count = 0;
  if (obj.mbox !== undefined) count++;
  if (obj.mbox_sha1sum !== undefined) count++;
  if (obj.openid !== undefined) count++;
  if (obj.account !== undefined) count++;
  return count;
}

// ── Validate Actor ──
function validateAgent(agent: Agent, path: string): void {
  const ifiCount = countIFIs(agent);
  if (ifiCount === 0) {
    throw new ValidationError(`${path}: must have exactly one IFI (mbox, mbox_sha1sum, openid, or account), found none`);
  }
  if (ifiCount > 1) {
    throw new ValidationError(`${path}: must have exactly one IFI, found ${ifiCount}`);
  }

  if (agent.mbox && !agent.mbox.startsWith("mailto:")) {
    throw new ValidationError(`${path}.mbox: must be a mailto: URI`);
  }
  if (agent.account) {
    if (!agent.account.homePage || typeof agent.account.homePage !== "string") {
      throw new ValidationError(`${path}.account.homePage: required and must be a string`);
    }
    if (!agent.account.name || typeof agent.account.name !== "string") {
      throw new ValidationError(`${path}.account.name: required and must be a string`);
    }
  }
  if (agent.objectType && agent.objectType !== "Agent") {
    throw new ValidationError(`${path}.objectType: if present on an agent, must be "Agent"`);
  }
}

function validateGroup(group: Group, path: string): void {
  if (group.objectType !== "Group") {
    throw new ValidationError(`${path}.objectType: must be "Group"`);
  }
  const ifiCount = countIFIs(group);
  // Identified group has IFI, anonymous group has member array
  if (ifiCount === 0) {
    // Anonymous group — must have member array
    if (!group.member || !Array.isArray(group.member) || group.member.length === 0) {
      throw new ValidationError(`${path}: anonymous group must have a non-empty member array`);
    }
  }
  if (ifiCount > 1) {
    throw new ValidationError(`${path}: group must have at most one IFI, found ${ifiCount}`);
  }
  if (group.member) {
    for (let i = 0; i < group.member.length; i++) {
      validateAgent(group.member[i], `${path}.member[${i}]`);
    }
  }
}

function validateActor(actor: Actor, path: string): void {
  if (!actor || typeof actor !== "object") {
    throw new ValidationError(`${path}: must be an object`);
  }
  if ((actor as Group).objectType === "Group") {
    validateGroup(actor as Group, path);
  } else {
    validateAgent(actor as Agent, path);
  }
}

// ── Validate Verb ──
function validateVerb(verb: Verb, path: string): void {
  if (!verb || typeof verb !== "object") {
    throw new ValidationError(`${path}: must be an object`);
  }
  if (!verb.id || typeof verb.id !== "string") {
    throw new ValidationError(`${path}.id: required`);
  }
  if (!isValidIRI(verb.id)) {
    throw new ValidationError(`${path}.id: must be a valid IRI`);
  }
  if (verb.display && typeof verb.display !== "object") {
    throw new ValidationError(`${path}.display: must be a language map object`);
  }
}

// ── Validate Object ──
function validateActivity(activity: Activity, path: string): void {
  if (!activity.id || typeof activity.id !== "string") {
    throw new ValidationError(`${path}.id: required for Activity`);
  }
  if (!isValidIRI(activity.id)) {
    throw new ValidationError(`${path}.id: must be a valid IRI`);
  }
}

function validateStatementRef(ref: StatementRef, path: string): void {
  if (!ref.id || typeof ref.id !== "string") {
    throw new ValidationError(`${path}.id: required for StatementRef`);
  }
  if (!isValidUUID(ref.id)) {
    throw new ValidationError(`${path}.id: must be a valid UUID`);
  }
}

function validateSubStatement(sub: SubStatement, path: string): void {
  if ((sub as unknown as { id?: string }).id) {
    throw new ValidationError(`${path}: SubStatement must not have an id`);
  }
  if ((sub as unknown as { stored?: string }).stored) {
    throw new ValidationError(`${path}: SubStatement must not have a stored property`);
  }
  if ((sub as unknown as { authority?: unknown }).authority) {
    throw new ValidationError(`${path}: SubStatement must not have an authority property`);
  }
  if ((sub as unknown as { version?: string }).version) {
    throw new ValidationError(`${path}: SubStatement must not have a version property`);
  }
  validateActor(sub.actor, `${path}.actor`);
  validateVerb(sub.verb, `${path}.verb`);
  validateStatementObject(sub.object, `${path}.object`, true);
}

function validateStatementObject(
  obj: StatementObject,
  path: string,
  insideSubStatement = false
): void {
  if (!obj || typeof obj !== "object") {
    throw new ValidationError(`${path}: must be an object`);
  }

  const objectType = (obj as { objectType?: string }).objectType || "Activity";

  switch (objectType) {
    case "Activity":
      validateActivity(obj as Activity, path);
      break;
    case "Agent":
      validateAgent(obj as Agent, path);
      break;
    case "Group":
      validateGroup(obj as Group, path);
      break;
    case "StatementRef":
      validateStatementRef(obj as StatementRef, path);
      break;
    case "SubStatement":
      if (insideSubStatement) {
        throw new ValidationError(`${path}: SubStatement cannot contain another SubStatement`);
      }
      validateSubStatement(obj as SubStatement, path);
      break;
    default:
      throw new ValidationError(`${path}.objectType: invalid value "${objectType}"`);
  }
}

// ── Validate Score ──
function validateScore(score: Score, path: string): void {
  if (score.scaled !== undefined) {
    if (typeof score.scaled !== "number" || score.scaled < -1 || score.scaled > 1) {
      throw new ValidationError(`${path}.scaled: must be a number between -1.0 and 1.0`);
    }
  }
  if (score.min !== undefined && score.max !== undefined) {
    if (score.min > score.max) {
      throw new ValidationError(`${path}: min must be <= max`);
    }
  }
  if (score.raw !== undefined) {
    if (score.min !== undefined && score.raw < score.min) {
      throw new ValidationError(`${path}.raw: must be >= min (${score.min})`);
    }
    if (score.max !== undefined && score.raw > score.max) {
      throw new ValidationError(`${path}.raw: must be <= max (${score.max})`);
    }
  }
}

// ── Validate Result ──
function validateResult(result: Result, path: string): void {
  if (result.score) {
    validateScore(result.score, `${path}.score`);
  }
  if (result.duration !== undefined) {
    if (typeof result.duration !== "string" || !isValidDuration(result.duration)) {
      throw new ValidationError(`${path}.duration: must be a valid ISO 8601 duration`);
    }
  }
}

// ── Validate Context Activities ──
function validateContextActivities(
  ca: ContextActivities,
  path: string
): void {
  const keys: (keyof ContextActivities)[] = ["parent", "grouping", "category", "other"];
  for (const key of keys) {
    if (ca[key]) {
      if (!Array.isArray(ca[key])) {
        throw new ValidationError(`${path}.${key}: must be an array`);
      }
      for (let i = 0; i < ca[key]!.length; i++) {
        validateActivity(ca[key]![i], `${path}.${key}[${i}]`);
      }
    }
  }
}

// ── Validate Context ──
function validateContext(ctx: Context, path: string): void {
  if (ctx.registration !== undefined) {
    if (!isValidUUID(ctx.registration)) {
      throw new ValidationError(`${path}.registration: must be a valid UUID`);
    }
  }
  if (ctx.instructor) {
    validateActor(ctx.instructor, `${path}.instructor`);
  }
  if (ctx.team) {
    validateGroup(ctx.team, `${path}.team`);
  }
  if (ctx.contextActivities) {
    validateContextActivities(ctx.contextActivities, `${path}.contextActivities`);
  }
  if (ctx.statement) {
    validateStatementRef(ctx.statement, `${path}.statement`);
  }
}

// ── Validate a single statement ──
export function validateStatement(stmt: XAPIStatement, index?: number): void {
  const prefix = index !== undefined ? `statements[${index}]` : "statement";

  if (!stmt || typeof stmt !== "object") {
    throw new ValidationError(`${prefix}: must be an object`);
  }

  // ID validation (if provided)
  if (stmt.id !== undefined) {
    if (!isValidUUID(stmt.id)) {
      throw new ValidationError(`${prefix}.id: must be a valid UUID`);
    }
  }

  // Required: actor
  if (!stmt.actor) {
    throw new ValidationError(`${prefix}.actor: required`);
  }
  validateActor(stmt.actor, `${prefix}.actor`);

  // Required: verb
  if (!stmt.verb) {
    throw new ValidationError(`${prefix}.verb: required`);
  }
  validateVerb(stmt.verb, `${prefix}.verb`);

  // Required: object
  if (!stmt.object) {
    throw new ValidationError(`${prefix}.object: required`);
  }
  validateStatementObject(stmt.object, `${prefix}.object`);

  // Optional: result
  if (stmt.result) {
    validateResult(stmt.result, `${prefix}.result`);
  }

  // Optional: context
  if (stmt.context) {
    validateContext(stmt.context, `${prefix}.context`);
  }

  // Optional: timestamp
  if (stmt.timestamp !== undefined) {
    if (!isValidTimestamp(stmt.timestamp)) {
      throw new ValidationError(`${prefix}.timestamp: must be a valid ISO 8601 timestamp`);
    }
  }

  // Voiding checks
  if (stmt.verb.id === "http://adlnet.gov/expapi/verbs/voided") {
    const obj = stmt.object as { objectType?: string };
    if (obj.objectType !== "StatementRef") {
      throw new ValidationError(
        `${prefix}: voiding statement object must be a StatementRef`
      );
    }
  }
}

// ── Validate an array of statements ──
export function validateStatements(stmts: XAPIStatement[]): void {
  if (!Array.isArray(stmts)) {
    throw new ValidationError("Request body must be a statement object or array");
  }
  for (let i = 0; i < stmts.length; i++) {
    validateStatement(stmts[i], stmts.length > 1 ? i : undefined);
  }
}
