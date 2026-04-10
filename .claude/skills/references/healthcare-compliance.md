# Healthcare Compliance for Learning Record Data

This reference covers HIPAA, CMS, and healthcare-specific requirements for learning data
in post-acute and senior care organizations.

## Table of Contents
1. HIPAA and Learning Records
2. CMS Survey Readiness
3. Certification and Renewal Tracking
4. Multi-Facility Data Isolation
5. xAPI Statement Patterns for Healthcare Training
6. Retention and Archival Policies
7. Audit Logging Requirements

---

## 1. HIPAA and Learning Records

### Does HIPAA apply to LRS data?

Usually, xAPI statements themselves are NOT Protected Health Information (PHI) — they record
that "Jane completed Infection Control training," not patient data. However, HIPAA becomes
relevant when:

- Training scenarios reference real patient cases or incidents
- Assessment responses contain clinical details
- The LRS stores learner data alongside clinical system identifiers
- Training records are used in disciplinary or competency proceedings that reference patient outcomes

### Safe Harbor approach

Design the LRS to treat all learner data as "HIPAA-adjacent" even if not technically PHI:

- Encrypt at rest (Azure manages this for Postgres Flexible Server by default — AES-256)
- Encrypt in transit (TLS 1.2+ on all connections)
- Access controls on who can query learner records (role-based)
- Audit trail on all data access (who queried what, when)
- Business Associate Agreement (BAA) with Azure (Microsoft provides this for HIPAA-eligible services)

### Actor Identifiers

Do NOT use employee SSN, NPI, or clinical system patient IDs as xAPI actor identifiers.
Use opaque employee IDs:

```json
{
  "actor": {
    "account": {
      "homePage": "https://yourlms.yourorg.com",
      "name": "EMP-00012345"
    },
    "name": "Jane Smith"
  }
}
```

The mapping from `EMP-00012345` to the full employee record lives in the LMS/HRIS database,
not in the LRS. This keeps the LRS clean of directly identifiable information beyond names.

---

## 2. CMS Survey Readiness

State surveyors and CMS auditors routinely ask for training completion evidence. Your LRS
must be able to produce, on demand:

### Required Reports

**Individual staff training history:**
- All completed courses with dates, scores, and certificate references
- Query: `GET /xapi/statements?agent=<staff>&verb=completed`

**Course completion rates by facility:**
- Percentage of staff who completed a specific mandatory course by deadline
- Query: aggregate by activity ID, grouped by facility context

**Overdue training alerts:**
- Staff who have not completed required training within the mandated timeframe
- This requires comparing "last completed" timestamps against renewal schedules
- Best implemented as a reporting query, not in the LRS itself

**Competency verification:**
- Evidence that staff passed competency assessments (not just completed courses)
- Query: `GET /xapi/statements?verb=passed&activity=<competency-assessment>`

### Statement Patterns for Survey Evidence

When a surveyor asks "show me that all CNAs completed abuse prevention training this year,"
you need to produce:

```sql
SELECT
    s.statement_json->>'actor'->>'name' AS staff_name,
    s.statement_json->'object'->'definition'->'name'->>'en-US' AS course_name,
    s.timestamp AS completed_at,
    s.statement_json->'result'->>'score' AS score
FROM statements s
WHERE s.verb_id = 'http://adlnet.gov/expapi/verbs/completed'
  AND s.object_id = 'https://yourlms.example.com/courses/abuse-prevention-2026'
  AND s.stored >= '2026-01-01'
  AND s.is_voided = false
ORDER BY s.timestamp DESC;
```

Pre-build these queries as saved reports in your BI tool so they're available instantly
during a survey.

---

## 3. Certification and Renewal Tracking

Healthcare training has cyclical requirements — most certifications must be renewed annually
or biannually. Model this in xAPI:

### Certification Earned Statement
```json
{
  "actor": { "account": { "homePage": "https://yourlms.example.com", "name": "EMP-00012345" } },
  "verb": { "id": "https://w3id.org/xapi/tla/verbs/certified", "display": { "en-US": "earned certification" } },
  "object": {
    "id": "https://yourlms.example.com/certifications/cpr-bls",
    "definition": {
      "name": { "en-US": "CPR/BLS Certification" },
      "type": "https://yourlms.example.com/activity-types/certification"
    }
  },
  "result": {
    "success": true,
    "completion": true
  },
  "context": {
    "extensions": {
      "https://yourlms.example.com/extensions/expiration-date": "2027-04-08",
      "https://yourlms.example.com/extensions/issuing-body": "American Heart Association",
      "https://yourlms.example.com/extensions/facility-id": "FAC-042"
    }
  }
}
```

### Renewal Detection Query

To find staff with expiring certifications:
```sql
SELECT DISTINCT ON (s.actor_ifi_value)
    s.actor_ifi_value AS employee_id,
    s.statement_json->'actor'->>'name' AS staff_name,
    s.statement_json->'context'->'extensions'->>'https://yourlms.example.com/extensions/expiration-date' AS expires,
    s.statement_json->'context'->'extensions'->>'https://yourlms.example.com/extensions/facility-id' AS facility
FROM statements s
WHERE s.verb_id = 'https://w3id.org/xapi/tla/verbs/certified'
  AND s.object_id = 'https://yourlms.example.com/certifications/cpr-bls'
  AND s.is_voided = false
ORDER BY s.actor_ifi_value, s.stored DESC;
```

Filter results where `expires < NOW() + INTERVAL '30 days'` to get the 30-day warning list.

---

## 4. Multi-Facility Data Isolation

With multiple facilities, you need to ensure:
- Facility admins see only their facility's data
- Corporate admins see all facilities
- Reports can be scoped by facility or aggregated across all

### Approach: Facility as Context Extension

Tag every statement with the facility where the learning occurred:

```json
{
  "context": {
    "extensions": {
      "https://yourlms.example.com/extensions/facility-id": "FAC-042",
      "https://yourlms.example.com/extensions/facility-name": "Sunrise Senior Living - Dallas"
    }
  }
}
```

### Approach: Facility as Context Grouping Activity

Alternatively, use contextActivities.grouping to associate statements with a facility:

```json
{
  "context": {
    "contextActivities": {
      "grouping": [{
        "id": "https://yourlms.example.com/facilities/FAC-042",
        "definition": {
          "name": { "en-US": "Sunrise Senior Living - Dallas" },
          "type": "https://yourlms.example.com/activity-types/facility"
        }
      }]
    }
  }
}
```

This approach works better with `related_activities=true` queries and is more xAPI-idiomatic.

### Credential-Level Isolation

Create separate LRS credentials per facility. Each facility's LMS instance authenticates
with its own key/secret pair. The LRS tags statements with the credential's facility scope.
Reporting queries filter by credential or facility extension.

---

## 5. xAPI Statement Patterns for Healthcare Training

### Common Healthcare Training Activities

| Training | Frequency | Verb | Notes |
|----------|-----------|------|-------|
| Abuse/Neglect Prevention | Annual | completed | CMS F-tag requirement |
| Infection Control | Annual | completed | CMS requirement |
| HIPAA Privacy | Annual | completed | Federal requirement |
| Fire Safety/Emergency | Annual | completed | Life Safety Code |
| Resident Rights | Annual | completed | CMS F-tag requirement |
| CPR/BLS | Every 2 years | certified | External certification |
| CNA Competency | Annual | passed | Skills assessment |
| Medication Aide | Per state rules | certified | State-specific |
| Dementia Care | Per state rules | completed | State-specific |
| Bloodborne Pathogens | Annual | completed | OSHA requirement |

### Skill Competency Assessment Pattern

For hands-on competency assessments (e.g., CNA skills check-off):

```json
{
  "actor": { "account": { "homePage": "https://yourlms.example.com", "name": "EMP-00012345" } },
  "verb": { "id": "http://adlnet.gov/expapi/verbs/passed", "display": { "en-US": "passed" } },
  "object": {
    "id": "https://yourlms.example.com/assessments/cna-skills/wound-care",
    "definition": {
      "name": { "en-US": "Wound Care Competency Assessment" },
      "type": "http://adlnet.gov/expapi/activities/assessment"
    }
  },
  "result": {
    "score": { "scaled": 0.92, "raw": 23, "min": 0, "max": 25 },
    "success": true,
    "completion": true
  },
  "context": {
    "instructor": {
      "account": { "homePage": "https://yourlms.example.com", "name": "EMP-00098765" },
      "name": "Sarah Johnson, RN"
    },
    "extensions": {
      "https://yourlms.example.com/extensions/facility-id": "FAC-042",
      "https://yourlms.example.com/extensions/assessment-method": "direct-observation"
    }
  }
}
```

---

## 6. Retention and Archival Policies

### Regulatory Requirements

- **CMS:** Retain training records for at least 3 years after the employee's termination
- **OSHA:** Retain training records for duration of employment + 30 years (for exposure records)
- **State-specific:** Varies. Some states require 5-7 years.
- **Best practice:** Retain all training records for 7 years minimum.

### Implementation

Do NOT delete statements from the LRS to meet retention policies. Instead:

1. **Partition by time** — Monthly partitions in Postgres
2. **Archive old partitions** — Move partitions older than the active window to Azure Blob cold storage
3. **Keep the data queryable** — Use Postgres foreign data wrappers or a separate archive query endpoint
4. **Mark terminated employees** — Don't delete their records. Flag them in the LMS, and the LRS
   retains their statements for the retention period.

### Data Subject Requests (if applicable)

If you need to handle data deletion requests (rare in employment context, but possible):
- Anonymize statements by replacing the actor with a generic "deleted-employee" agent
- Do NOT delete statements — this breaks the audit trail
- Document the anonymization in an audit log

---

## 7. Audit Logging Requirements

### What to Log

Every interaction with the LRS must be logged for compliance:

| Event | Log Fields |
|-------|-----------|
| Statement POST | credential_id, statement_count, timestamp, source_ip, facility_id |
| Statement GET | credential_id, query_params, result_count, timestamp, source_ip |
| Admin login | user_id, method (Entra ID), timestamp, source_ip |
| Credential created | admin_user_id, new_credential_id, scopes, timestamp |
| Credential revoked | admin_user_id, credential_id, reason, timestamp |
| Document PUT/DELETE | credential_id, doc_type, activity_id, agent, timestamp |

### Log Storage

- Use Azure Log Analytics Workspace for structured log ingestion
- Retain audit logs for minimum 7 years (match training record retention)
- Logs must be append-only (no deletion or modification)
- Consider Azure Immutable Blob Storage for the audit log archive

### Surveyor Access

Pre-build an "audit export" function that generates a CSV/PDF of:
- All training completions for a specific employee across all facilities
- All training completions for a specific course across all employees at a facility
- All system access events for a date range

Surveyors expect these within minutes, not hours. Pre-compute and cache the common queries.
