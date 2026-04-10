# xAPI Specification Guide for LRS Implementation

This reference covers the xAPI specification essentials needed to build a conformant LRS.
Based on xAPI v1.0.3 (IEEE 9274.1.1).

## Table of Contents
1. Statement Structure
2. Actor Validation Rules
3. Verb Validation Rules
4. Object Validation Rules
5. Result and Context
6. Statement Lifecycle
7. Database Schema Design
8. Query Implementation
9. Document API Details
10. Attachment Handling

---

## 1. Statement Structure

Every xAPI statement is a JSON object with this shape:

```json
{
  "id": "UUID (assigned by client or server)",
  "actor": { ... },
  "verb": { ... },
  "object": { ... },
  "result": { ... },
  "context": { ... },
  "timestamp": "ISO 8601 (when it happened)",
  "stored": "ISO 8601 (when LRS received it, server-assigned)",
  "authority": { ... },
  "version": "1.0.3",
  "attachments": [ ... ]
}
```

**Required fields:** `actor`, `verb`, `object`
**Server-assigned fields:** `id` (if not provided), `stored`, `authority`, `version`
**Optional fields:** `result`, `context`, `timestamp`, `attachments`

**Immutability rule:** Once a statement is stored, it must never be modified. The `stored` and `authority` fields are set by the server and are immutable once assigned. The only way to "undo" a statement is to void it with a separate voiding statement.

---

## 2. Actor Validation Rules

An actor represents the learner or entity performing the action. An actor MUST have exactly one Inverse Functional Identifier (IFI):

| IFI Type | Format | Example |
|----------|--------|---------|
| `mbox` | `mailto:` URI | `"mbox": "mailto:jane@example.com"` |
| `mbox_sha1sum` | SHA-1 hex of mailto URI | `"mbox_sha1sum": "ebd31e95054c..."` |
| `openid` | URI | `"openid": "https://example.com/user/123"` |
| `account` | Object with `homePage` + `name` | See below |

**Account IFI (most common for enterprise LMS):**
```json
{
  "objectType": "Agent",
  "name": "Jane Smith",
  "account": {
    "homePage": "https://yourlms.example.com",
    "name": "employee-12345"
  }
}
```

**Validation rules:**
- Exactly ONE IFI must be present. Zero = reject 400. Two or more = reject 400.
- `name` is optional (display only, not used for identification)
- `objectType` defaults to `"Agent"` if omitted. Only valid values: `"Agent"`, `"Group"`
- For Groups: `"identified"` groups have an IFI. `"anonymous"` groups have a `member` array but no IFI.
- Group `member` array must contain only Agents, not nested Groups.
- `mbox` must be a valid `mailto:` URI
- `account.homePage` must be a valid IRL (URL). `account.name` is a string.

**Agent comparison:** Two agents are "the same" if and only if they share the same IFI type and value. Name is ignored for comparison purposes.

---

## 3. Verb Validation Rules

```json
{
  "id": "http://adlnet.gov/expapi/verbs/completed",
  "display": {
    "en-US": "completed",
    "es": "completó"
  }
}
```

**Validation rules:**
- `id` is REQUIRED and must be a valid IRI
- `display` is optional. It's a language map (object with RFC 5646 language tags as keys)
- The LRS should NOT use `display` for querying — only `id` matters for filtering
- Common verb IRIs (ADL vocabulary):
  - `http://adlnet.gov/expapi/verbs/completed`
  - `http://adlnet.gov/expapi/verbs/passed`
  - `http://adlnet.gov/expapi/verbs/failed`
  - `http://adlnet.gov/expapi/verbs/attempted`
  - `http://adlnet.gov/expapi/verbs/experienced`
  - `http://adlnet.gov/expapi/verbs/answered`
  - `http://adlnet.gov/expapi/verbs/voided` (special — used to void other statements)

---

## 4. Object Validation Rules

The object (what was acted upon) can be one of four types:

### Activity (default, most common)
```json
{
  "objectType": "Activity",
  "id": "https://yourlms.example.com/courses/infection-control-101",
  "definition": {
    "name": { "en-US": "Infection Control 101" },
    "description": { "en-US": "Annual infection control training for clinical staff" },
    "type": "http://adlnet.gov/expapi/activities/course"
  }
}
```
- `id` is REQUIRED, must be a valid IRI
- `objectType` defaults to `"Activity"` if omitted
- `definition` is optional but recommended

### Agent or Group
Object can be an Agent/Group (e.g., "Jane mentored Bob"). Same validation as actor.

### StatementRef
References another statement (used for voiding and commenting on statements):
```json
{
  "objectType": "StatementRef",
  "id": "UUID of the referenced statement"
}
```

### SubStatement
An embedded statement (cannot contain another SubStatement):
```json
{
  "objectType": "SubStatement",
  "actor": { ... },
  "verb": { ... },
  "object": { ... }
}
```
- SubStatements must NOT have `id`, `stored`, `authority`, or `version`
- SubStatement objects cannot be another SubStatement (no nesting)

---

## 5. Result and Context

### Result (optional)
```json
{
  "result": {
    "score": {
      "scaled": 0.85,
      "raw": 85,
      "min": 0,
      "max": 100
    },
    "success": true,
    "completion": true,
    "duration": "PT1H30M",
    "response": "The learner selected option B",
    "extensions": {}
  }
}
```
- `score.scaled` must be between -1.0 and 1.0
- `score.raw` must be between `min` and `max` (if provided)
- `duration` uses ISO 8601 duration format
- `extensions` is a JSON object with IRI keys

### Context (optional)
```json
{
  "context": {
    "registration": "UUID (groups related statements)",
    "instructor": { "agent object" },
    "team": { "group object" },
    "contextActivities": {
      "parent": [{ "id": "..." }],
      "grouping": [{ "id": "..." }],
      "category": [{ "id": "..." }],
      "other": [{ "id": "..." }]
    },
    "revision": "2.1",
    "platform": "Your LMS Name",
    "language": "en-US",
    "statement": { "StatementRef" },
    "extensions": {}
  }
}
```
- `registration` is a UUID that ties together related statements (e.g., all attempts at one course)
- `contextActivities` arrays must contain Activity objects

---

## 6. Statement Lifecycle

### Storing a new statement
1. Validate the statement
2. If `id` is provided, check for duplicates:
   - If exact duplicate exists → return 200 with the existing ID (idempotent)
   - If same ID but different content → return 409 Conflict
3. If `id` is not provided, generate UUID v4
4. Set `stored` to current UTC timestamp
5. Set `authority` to the agent associated with the authenticated credential
6. Set `version` to `"1.0.3"`
7. Persist
8. Return statement ID(s) in a JSON array

### Voiding a statement
A voiding statement uses verb `http://adlnet.gov/expapi/verbs/voided` and references the target via StatementRef:
```json
{
  "actor": { "the authority voiding it" },
  "verb": { "id": "http://adlnet.gov/expapi/verbs/voided" },
  "object": {
    "objectType": "StatementRef",
    "id": "UUID of statement to void"
  }
}
```

**Rules:**
- You cannot void a voiding statement
- Voided statements are excluded from normal GET queries
- Voided statements can still be retrieved with `voidedStatementId` parameter
- The original statement is NOT deleted — it's marked as voided

---

## 7. Database Schema Design

### PostgreSQL Schema (recommended)

```sql
-- Credentials for activity providers
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key VARCHAR(64) UNIQUE NOT NULL,
    api_secret_hash VARCHAR(256) NOT NULL,
    display_name VARCHAR(255),
    authority_agent JSONB NOT NULL,
    scopes TEXT[] DEFAULT '{"statements/write","statements/read"}',
    rate_limit_per_minute INT DEFAULT 300,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core statement storage
CREATE TABLE statements (
    -- Primary key: server-assigned internal ID for ordering
    internal_id BIGSERIAL PRIMARY KEY,

    -- Statement ID (client or server assigned UUID)
    statement_id UUID UNIQUE NOT NULL,

    -- Extracted indexed fields for query performance
    actor_ifi_type VARCHAR(20) NOT NULL,
    actor_ifi_value VARCHAR(512) NOT NULL,
    verb_id VARCHAR(512) NOT NULL,
    object_type VARCHAR(20) NOT NULL DEFAULT 'Activity',
    object_id VARCHAR(512),
    registration UUID,

    -- Timestamps
    timestamp TIMESTAMPTZ NOT NULL,
    stored TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Authority (which credential stored this)
    credential_id UUID REFERENCES credentials(id),

    -- Voiding
    is_voided BOOLEAN DEFAULT false,
    voiding_statement_id UUID,

    -- Full statement JSON (source of truth)
    statement_json JSONB NOT NULL,

    -- Indexing support
    CONSTRAINT valid_actor_ifi CHECK (actor_ifi_type IN ('mbox', 'mbox_sha1sum', 'openid', 'account'))
);

-- Query performance indexes
CREATE INDEX idx_statements_actor ON statements (actor_ifi_type, actor_ifi_value);
CREATE INDEX idx_statements_verb ON statements (verb_id);
CREATE INDEX idx_statements_activity ON statements (object_id) WHERE object_type = 'Activity';
CREATE INDEX idx_statements_registration ON statements (registration) WHERE registration IS NOT NULL;
CREATE INDEX idx_statements_stored ON statements (stored DESC);
CREATE INDEX idx_statements_timestamp ON statements (timestamp DESC);
CREATE INDEX idx_statements_voided ON statements (is_voided);

-- Composite index for common multi-filter queries
CREATE INDEX idx_statements_agent_verb ON statements (actor_ifi_type, actor_ifi_value, verb_id);
CREATE INDEX idx_statements_agent_activity ON statements (actor_ifi_type, actor_ifi_value, object_id);

-- GIN index for deep JSON queries (related_activities, related_agents)
CREATE INDEX idx_statements_json ON statements USING GIN (statement_json jsonb_path_ops);

-- Document storage (State, Activity Profile, Agent Profile)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type VARCHAR(20) NOT NULL CHECK (doc_type IN ('state', 'activity_profile', 'agent_profile')),
    activity_id VARCHAR(512),
    agent_ifi_type VARCHAR(20),
    agent_ifi_value VARCHAR(512),
    state_id VARCHAR(512),
    profile_id VARCHAR(512),
    registration UUID,
    content_type VARCHAR(255) NOT NULL,
    content BYTEA NOT NULL,
    etag VARCHAR(64) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint depends on doc_type
    UNIQUE (doc_type, activity_id, agent_ifi_type, agent_ifi_value, state_id, profile_id, registration)
);

CREATE INDEX idx_documents_lookup ON documents (doc_type, activity_id, agent_ifi_type, agent_ifi_value);
```

### Extracting the Actor IFI for Indexing

When storing a statement, extract the actor's IFI into the indexed columns:

```
if actor.mbox         → ifi_type='mbox',    ifi_value=actor.mbox
if actor.mbox_sha1sum → ifi_type='mbox_sha1sum', ifi_value=actor.mbox_sha1sum
if actor.openid       → ifi_type='openid',  ifi_value=actor.openid
if actor.account      → ifi_type='account', ifi_value=actor.account.homePage + '::' + actor.account.name
```

This lets you do fast equality checks on actor without parsing JSON on every query.

---

## 8. Query Implementation

### GET /xapi/statements Query Building

Build the SQL WHERE clause dynamically based on provided query parameters:

```
Base: SELECT statement_json FROM statements WHERE is_voided = false

+ statementId:   AND statement_id = $1 (return single statement, not wrapped)
+ agent:         AND actor_ifi_type = $1 AND actor_ifi_value = $2
+ verb:          AND verb_id = $1
+ activity:      AND object_id = $1 AND object_type = 'Activity'
+ registration:  AND registration = $1
+ since:         AND stored > $1
+ until:         AND stored <= $1
+ ascending:     ORDER BY stored ASC (default DESC)
+ limit:         LIMIT $1 (default server max, e.g., 100)
```

**related_activities=true:** Broaden the activity filter to also match activities in:
- `context.contextActivities.parent[].id`
- `context.contextActivities.grouping[].id`
- `context.contextActivities.category[].id`
- `context.contextActivities.other[].id`
- `object.id` when object is a SubStatement containing the activity

Use the GIN index: `statement_json @> '{"context":{"contextActivities":{"parent":[{"id":"..."}]}}}'`

**related_agents=true:** Broaden the agent filter to also match agents in:
- `object` (when object is Agent/Group)
- `context.instructor`
- `context.team.member[]`
- `object.actor` / `object.object` (when object is SubStatement)

**Pagination:** When results exceed the limit, generate an opaque cursor (e.g., base64-encoded internal_id of the last returned statement). Return it as the `more` property. When the client requests the `more` URL, decode the cursor and use `WHERE internal_id < $cursor` (descending) or `WHERE internal_id > $cursor` (ascending).

### Format Parameter

- `exact` (default): Return statements as stored (full JSON)
- `ids`: Return only `id`, `timestamp`, `stored`, `authority`, `version`, and `verb` and `object` as minimal references
- `canonical`: Same as exact, but language maps filtered to one language based on Accept-Language header

---

## 9. Document API Details

### State API
**Endpoint:** `/xapi/activities/state`

**Required params:** `activityId`, `agent`, `stateId`
**Optional params:** `registration`

| Method | Behavior |
|--------|----------|
| PUT | Store document. Overwrite if exists (with ETag match). |
| POST | If both existing and new are JSON objects, merge. Otherwise overwrite. |
| GET (with stateId) | Return the document with Content-Type header. |
| GET (without stateId) | Return JSON array of stateId strings for this agent+activity. |
| DELETE (with stateId) | Delete single document. |
| DELETE (without stateId) | Delete all documents for this agent+activity. |

### Activity Profile API
**Endpoint:** `/xapi/activities/profile`

**Required params:** `activityId`, `profileId` (for single doc operations)

Same PUT/POST/GET/DELETE pattern as State API, but keyed on `activityId` + `profileId` only (no agent).

### Agent Profile API
**Endpoint:** `/xapi/agents/profile`

**Required params:** `agent`, `profileId` (for single doc operations)

Same pattern, keyed on `agent` + `profileId`.

### Additional Endpoints

**GET /xapi/activities** — Return the full activity definition for a given `activityId`. The LRS constructs this from the best-known definition across all statements referencing this activity.

**GET /xapi/agents** — Return a Person object combining all known IFIs for the given agent. This is the "persona" function — mapping different identifiers to the same person.

### JSON Document Merging (POST behavior)

When a POST is made to a document endpoint:
1. If no existing document → store the new document
2. If existing document is NOT JSON, or new document is NOT JSON → overwrite
3. If both are JSON objects → shallow merge (new keys overwrite existing keys at the top level)
4. Return 400 if the merge would result in invalid JSON

---

## 10. Attachment Handling

xAPI supports binary attachments sent as multipart/mixed requests.

**Request format:**
```
Content-Type: multipart/mixed; boundary=abcdef

--abcdef
Content-Type: application/json

[statement JSON with "attachments" array]
--abcdef
Content-Type: application/pdf
Content-Transfer-Encoding: binary
X-Experience-API-Hash: sha256-hash-of-content

[binary content]
--abcdef--
```

**Implementation:**
1. Parse the multipart/mixed body
2. First part is always the statement JSON
3. Subsequent parts are attachments, identified by `X-Experience-API-Hash` header
4. Validate that each attachment referenced in the statement's `attachments` array has a matching part (by SHA-256 hash)
5. Store attachments in Azure Blob Storage, keyed by hash
6. When returning statements with attachments, reconstruct the multipart/mixed response

**Simplification for internal use:** If your LMS doesn't use attachments, you can defer this to a later phase. The core LRS works without attachment support — just reject multipart/mixed requests with 400 until you implement it.
