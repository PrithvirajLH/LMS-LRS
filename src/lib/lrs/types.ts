// ── Language Map ──
export type LanguageMap = Record<string, string>;

// ── Score ──
export interface Score {
  scaled?: number;
  raw?: number;
  min?: number;
  max?: number;
}

// ── Extensions ──
export type Extensions = Record<string, unknown>;

// ── Account ──
export interface Account {
  homePage: string;
  name: string;
}

// ── Actor (Agent / Group) ──
export interface Agent {
  objectType?: "Agent";
  name?: string;
  mbox?: string;
  mbox_sha1sum?: string;
  openid?: string;
  account?: Account;
}

export interface Group {
  objectType: "Group";
  name?: string;
  mbox?: string;
  mbox_sha1sum?: string;
  openid?: string;
  account?: Account;
  member?: Agent[];
}

export type Actor = Agent | Group;

// ── Verb ──
export interface Verb {
  id: string;
  display?: LanguageMap;
}

// ── Activity Definition ──
export interface ActivityDefinition {
  name?: LanguageMap;
  description?: LanguageMap;
  type?: string;
  moreInfo?: string;
  interactionType?: string;
  correctResponsesPattern?: string[];
  choices?: InteractionComponent[];
  scale?: InteractionComponent[];
  source?: InteractionComponent[];
  target?: InteractionComponent[];
  steps?: InteractionComponent[];
  extensions?: Extensions;
}

export interface InteractionComponent {
  id: string;
  description?: LanguageMap;
}

// ── Activity ──
export interface Activity {
  objectType?: "Activity";
  id: string;
  definition?: ActivityDefinition;
}

// ── Statement Ref ──
export interface StatementRef {
  objectType: "StatementRef";
  id: string;
}

// ── Sub-Statement ──
export interface SubStatement {
  objectType: "SubStatement";
  actor: Actor;
  verb: Verb;
  object: Activity | Agent | Group | StatementRef;
  result?: Result;
  context?: Context;
  timestamp?: string;
  attachments?: Attachment[];
}

// ── Statement Object ──
export type StatementObject =
  | Activity
  | Agent
  | Group
  | StatementRef
  | SubStatement;

// ── Result ──
export interface Result {
  score?: Score;
  success?: boolean;
  completion?: boolean;
  response?: string;
  duration?: string;
  extensions?: Extensions;
}

// ── Context Activities ──
export interface ContextActivities {
  parent?: Activity[];
  grouping?: Activity[];
  category?: Activity[];
  other?: Activity[];
}

// ── Context ──
export interface Context {
  registration?: string;
  instructor?: Actor;
  team?: Group;
  contextActivities?: ContextActivities;
  revision?: string;
  platform?: string;
  language?: string;
  statement?: StatementRef;
  extensions?: Extensions;
}

// ── Attachment ──
export interface Attachment {
  usageType: string;
  display: LanguageMap;
  description?: LanguageMap;
  contentType: string;
  length: number;
  sha2: string;
  fileUrl?: string;
}

// ── Full Statement ──
export interface XAPIStatement {
  id?: string;
  actor: Actor;
  verb: Verb;
  object: StatementObject;
  result?: Result;
  context?: Context;
  timestamp?: string;
  stored?: string;
  authority?: Agent;
  version?: string;
  attachments?: Attachment[];
}

// ── Statement Query Params ──
export interface StatementQueryParams {
  statementId?: string;
  voidedStatementId?: string;
  agent?: string; // JSON-encoded agent
  verb?: string;
  activity?: string;
  registration?: string;
  since?: string;
  until?: string;
  limit?: number;
  format?: "ids" | "exact" | "canonical";
  ascending?: boolean;
  related_activities?: boolean;
  related_agents?: boolean;
  from?: string; // pagination cursor
}

// ── Statement Result (GET response) ──
export interface StatementResult {
  statements: XAPIStatement[];
  more: string;
}

// ── Credential Entity (Table Storage) ──
export interface CredentialEntity {
  partitionKey: string;
  rowKey: string;
  apiSecretHash: string;
  displayName: string;
  authorityAgent: string; // JSON string
  scopes: string;
  rateLimitPerMinute: number;
  isActive: boolean;
}

// ── Statement Table Entity ──
export interface StatementEntity {
  partitionKey: string;
  rowKey: string;
  statementId: string;
  actorIfiType: string;
  actorIfiValue: string;
  verbId: string;
  objectType: string;
  objectId: string;
  registration: string;
  timestamp: string;
  stored: string;
  isVoided: boolean;
  voidingStatementId: string;
  credentialId: string;
}

// ── Statement Index Entity ──
export interface StatementIndexEntity {
  partitionKey: string;
  rowKey: string;
  statementsPartitionKey: string;
  statementsRowKey: string;
}
