# Azure Architecture for LRS Deployment

This reference covers Azure infrastructure patterns, deployment, and scaling for the in-house LRS.

## Table of Contents
1. Infrastructure Overview
2. Database Configuration
3. Container Deployment
4. xAPI Emitter Pattern
5. Scaling and Performance
6. Monitoring and Observability
7. Security and Networking
8. CI/CD Pipeline

---

## 1. Infrastructure Overview

```
                           Azure Front Door (optional, for multi-region)
                                        │
                           Azure Container Apps
                           ┌────────────────────┐
                           │   LRS API Service   │
                           │   (2-4 replicas)    │
                           └────────┬───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
        Azure DB for Postgres   Azure Redis    Azure Blob Storage
        (Flexible Server)      (rate limits)   (attachments only)
                    │
                    │ ← Also queried by BI tools (Power BI, Metabase)
```

**Resource Group layout:**
```
rg-lrs-prod/
├── aca-lrs-api          (Container App - LRS API)
├── psql-lrs-prod        (PostgreSQL Flexible Server)
├── redis-lrs-prod       (Azure Cache for Redis - Basic tier)
├── st-lrsattachments    (Storage Account - Blob for attachments)
├── ai-lrs-prod          (Application Insights)
├── log-lrs-prod         (Log Analytics Workspace)
├── cr-lrs-prod          (Container Registry)
└── kv-lrs-prod          (Key Vault - secrets)
```

---

## 2. Database Configuration

### Azure Database for PostgreSQL — Flexible Server

**Recommended tier for 16,000 learners:**
- **SKU:** General Purpose, D4ds_v5 (4 vCores, 16 GB RAM) — start here
- **Storage:** 128 GB with autogrow enabled
- **Backup:** 7-day retention, geo-redundant
- **Availability:** Zone-redundant HA for production
- **Version:** PostgreSQL 16

**Estimated monthly cost:** ~$200-350/month depending on region.

**Connection configuration:**
```json
{
  "database": {
    "dbHost": "psql-lrs-prod.postgres.database.azure.com",
    "dbPort": 5432,
    "dbName": "lrs",
    "dbUser": "lrs_admin",
    "dbSchema": "xapi",
    "sslMode": "require"
  }
}
```

**Performance tuning for xAPI workloads:**
```sql
-- Increase work memory for complex JSON queries
ALTER SYSTEM SET work_mem = '256MB';

-- Increase shared buffers (25% of RAM)
ALTER SYSTEM SET shared_buffers = '4GB';

-- Enable JIT for complex analytical queries
ALTER SYSTEM SET jit = on;

-- Optimize for append-heavy workload
ALTER SYSTEM SET synchronous_commit = 'on';
ALTER SYSTEM SET wal_level = 'replica';

-- Autovacuum tuning (statements table grows fast)
ALTER TABLE statements SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005
);
```

### If you must use Azure SQL Server

Azure SQL Server can work but requires workarounds for JSON:

- Use `NVARCHAR(MAX)` with `ISJSON()` constraint instead of native JSONB
- Use `JSON_VALUE()` and `OPENJSON()` for extraction — these are not as fast as Postgres jsonb operators
- No GIN index equivalent — create computed columns for frequently queried JSON paths:

```sql
ALTER TABLE statements ADD verb_id AS JSON_VALUE(statement_json, '$.verb.id') PERSISTED;
CREATE INDEX idx_statements_verb ON statements (verb_id);
```

- JSON merge for Document APIs requires manual MERGE logic rather than Postgres `||` operator

The overhead is meaningful. Prefer Postgres unless your team has zero Postgres experience and strong SQL Server expertise.

---

## 3. Container Deployment

### Dockerfile
```dockerfile
# Node.js example (adjust for your runtime)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S lrs && adduser -S lrs -u 1001
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
USER lrs
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://localhost:8080/health || exit 1
CMD ["node", "dist/server.js"]
```

### Azure Container Apps Configuration

```yaml
# container-app.yaml
properties:
  configuration:
    ingress:
      external: true
      targetPort: 8080
      transport: auto
    secrets:
      - name: db-connection-string
        keyVaultUrl: https://kv-lrs-prod.vault.azure.net/secrets/db-connection
      - name: redis-connection-string
        keyVaultUrl: https://kv-lrs-prod.vault.azure.net/secrets/redis-connection
  template:
    containers:
      - name: lrs-api
        image: cr-lrs-prod.azurecr.io/lrs-api:latest
        resources:
          cpu: 1.0
          memory: 2Gi
        env:
          - name: DATABASE_URL
            secretRef: db-connection-string
          - name: REDIS_URL
            secretRef: redis-connection-string
          - name: NODE_ENV
            value: production
          - name: LOG_LEVEL
            value: info
    scale:
      minReplicas: 2
      maxReplicas: 8
      rules:
        - name: http-scaling
          http:
            metadata:
              concurrentRequests: "50"
```

---

## 4. xAPI Emitter Pattern

The LMS sends statements to the LRS. Build this as a resilient, async pipeline.

### Architecture

```
LMS Event → Queue (Azure Service Bus) → Emitter Worker → POST /xapi/statements → LRS
                                              ↓ (on failure)
                                         Dead Letter Queue → Manual review / retry
```

### Why queue-based, not direct POST

Direct POST from the LMS to the LRS creates a hard dependency — if the LRS is down or slow, the LMS UI blocks or fails. A queue decouples them:
- LMS writes events to the queue instantly (sub-millisecond)
- A background worker reads the queue and POSTs to the LRS
- If the LRS is down, messages stay in the queue and retry automatically
- Dead-letter queue catches permanent failures for investigation

### Emitter Worker Logic

```
1. Read batch of up to 50 messages from the queue
2. Construct xAPI statements from each message
3. POST the batch to /xapi/statements as a JSON array
4. If 200 → acknowledge messages (remove from queue)
5. If 4xx → message is malformed, send to dead-letter queue
6. If 5xx or timeout → leave in queue, retry with exponential backoff
7. Repeat
```

### Statement Construction Patterns

Map LMS events to xAPI verbs consistently:

| LMS Event | xAPI Verb | Object Type |
|-----------|-----------|-------------|
| Course started | `http://adlnet.gov/expapi/verbs/attempted` | course |
| Module viewed | `http://adlnet.gov/expapi/verbs/experienced` | module |
| Quiz submitted | `http://adlnet.gov/expapi/verbs/answered` | assessment |
| Quiz passed | `http://adlnet.gov/expapi/verbs/passed` | assessment |
| Quiz failed | `http://adlnet.gov/expapi/verbs/failed` | assessment |
| Course completed | `http://adlnet.gov/expapi/verbs/completed` | course |
| Certification earned | `https://w3id.org/xapi/tla/verbs/certified` | certification |
| Video watched | `https://w3id.org/xapi/video/verbs/played` | video |
| Document read | `http://id.tincanapi.com/verb/read` | document |

---

## 5. Scaling and Performance

### Statement Ingestion Targets

For 16,000 employees:
- **Typical daily volume:** 50,000 - 200,000 statements/day (depends on content type)
- **Peak burst:** Up to 5,000 statements/minute (e.g., start of shift, mandatory training deadlines)
- **Annual growth:** Plan for 50-75 million statements/year at full usage

### Optimization Strategies

**Batch inserts:** Accept and insert statements in batches of 25-50 using Postgres `INSERT ... VALUES (...), (...), (...)`. This is 10-20x faster than individual inserts.

**Connection pooling:** Use PgBouncer or the built-in Azure connection pooler. LRS API replicas sharing direct connections can exhaust the Postgres limit. Target: 20 connections per replica, 100 total max.

**Read replicas:** For heavy reporting workloads, add a read replica and point BI tools at it. The primary handles writes (statement ingestion), the replica handles reads (analytics queries).

**Partitioning:** When the statements table exceeds ~100 million rows, partition by `stored` timestamp (monthly partitions). This keeps queries on recent data fast and allows archiving old partitions to cold storage.

```sql
CREATE TABLE statements (
    -- same columns as before
) PARTITION BY RANGE (stored);

CREATE TABLE statements_2026_01 PARTITION OF statements
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE statements_2026_02 PARTITION OF statements
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- etc.
```

**Caching:** Cache frequently-queried agent and activity lookups in Redis. Statement queries themselves are harder to cache (too many parameter combinations), but you can cache `GET /xapi/agents` and `GET /xapi/activities` responses.

---

## 6. Monitoring and Observability

### Application Insights Integration

Track these custom metrics:
- `statements_ingested` — Counter, total statements POSTed
- `statements_ingested_batch_size` — Histogram, batch sizes
- `statement_validation_failures` — Counter, broken statements rejected
- `query_duration_ms` — Histogram, GET /xapi/statements response time
- `dead_letter_count` — Gauge, messages in the dead-letter queue

### Alerts

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Statement POST error rate | > 5% over 5 min | Critical |
| Query p95 latency | > 2 seconds | Warning |
| Dead letter queue depth | > 100 messages | Warning |
| Database CPU | > 80% sustained 10 min | Warning |
| Database connections | > 80% of max | Critical |
| Container restarts | > 2 in 5 min | Critical |

### Structured Logging

Every request should log:
```json
{
  "timestamp": "ISO 8601",
  "level": "info",
  "method": "POST",
  "path": "/xapi/statements",
  "credential_id": "uuid",
  "statement_count": 25,
  "duration_ms": 142,
  "status": 200,
  "correlation_id": "uuid"
}
```

---

## 7. Security and Networking

### Network Architecture

- LRS API runs in a Container Apps environment with a VNet
- PostgreSQL uses private endpoint (no public access)
- Redis uses private endpoint
- Key Vault uses private endpoint
- Only the Container Apps ingress is publicly accessible (or restrict to LMS IP range)

### Authentication Layers

1. **xAPI Basic Auth** — Activity providers (LMS, content tools) authenticate with API key/secret
2. **Azure Entra ID** — Admin UI protected with Entra ID / OAuth 2.0
3. **Managed Identity** — Container App uses managed identity to access Key Vault, Blob Storage

### Secret Management

Store in Azure Key Vault (never in environment variables or config files):
- Database connection string
- Redis connection string
- API credential secrets (hashed in DB, but the hashing salt in KV)
- Blob storage connection string

### HTTPS Enforcement

- Container Apps provides automatic TLS termination
- Enforce HTTPS-only (redirect HTTP)
- Minimum TLS 1.2

---

## 8. CI/CD Pipeline

### GitHub Actions Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy LRS
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: lrs_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/lrs_test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - uses: azure/docker-login@v2
        with:
          login-server: crlrsprod.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}
      - run: |
          docker build -t crlrsprod.azurecr.io/lrs-api:${{ github.sha }} .
          docker push crlrsprod.azurecr.io/lrs-api:${{ github.sha }}
      - uses: azure/container-apps-deploy-action@v2
        with:
          containerAppName: aca-lrs-api
          resourceGroup: rg-lrs-prod
          imageToDeploy: crlrsprod.azurecr.io/lrs-api:${{ github.sha }}
```

### Database Migrations

Use a migration tool (Flyway, golang-migrate, knex, Prisma Migrate — whatever matches your stack). Migrations run as a pre-deployment step, not inside the application startup.

```
migrations/
├── V001__create_credentials_table.sql
├── V002__create_statements_table.sql
├── V003__create_documents_table.sql
├── V004__add_statement_indexes.sql
└── V005__partition_statements.sql
```
