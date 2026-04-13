import { createHash } from "crypto";
import { getTableClient } from "@/lib/azure/table-client";
import { uploadBlob, downloadBlob, blobExists } from "@/lib/azure/blob-client";
import { extractActorIFI } from "./statements";
import type { Actor } from "./types";

// ── Document types ──
export type DocType = "state" | "activity_profile" | "agent_profile";

export interface DocumentMeta {
  partitionKey: string;
  rowKey: string;
  contentType: string;
  blobPath: string;
  docEtag: string;       // renamed from "etag" to avoid Azure Table Storage reserved field
  updatedAt: string;
}

// ── Build table keys for a document ──
function buildDocKeys(params: {
  docType: DocType;
  activityId?: string;
  agent?: Actor;
  stateId?: string;
  profileId?: string;
  registration?: string;
}): { partitionKey: string; rowKey: string; blobPath: string } {
  const { docType, activityId, agent, stateId, profileId, registration } = params;

  let pk: string;
  let agentHash = "none";

  if (agent) {
    const ifi = extractActorIFI(agent);
    agentHash = createHash("sha256")
      .update(`${ifi.type}:${ifi.value}`)
      .digest("hex")
      .slice(0, 16);
  }

  if (docType === "state") {
    pk = `state:${activityId}`;
  } else if (docType === "activity_profile") {
    pk = `actprofile:${activityId}`;
  } else {
    pk = `agentprofile:${agentHash}`;
  }

  const docId = stateId || profileId || "default";
  const reg = registration || "none";
  const rk = `${agentHash}:${docId}:${reg}`;

  const blobPath = `${docType}/${agentHash}/${encodeURIComponent(docId)}-${reg}.bin`;

  return { partitionKey: pk, rowKey: rk, blobPath };
}

// ── Generate ETag from content ──
function generateETag(content: string | Buffer): string {
  return createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, 32);
}

// ── Put document (overwrite) ──
export async function putDocument(params: {
  docType: DocType;
  activityId?: string;
  agent?: Actor;
  stateId?: string;
  profileId?: string;
  registration?: string;
  content: string;
  contentType: string;
  ifMatch?: string;
  ifNoneMatch?: string;
}): Promise<{ etag: string; status: number; error?: string }> {
  const { partitionKey, rowKey, blobPath } = buildDocKeys(params);
  const table = await getTableClient("documents");

  const existing = await getDocumentMeta(partitionKey, rowKey);

  if (params.ifNoneMatch === "*" && existing) {
    return { etag: "", status: 412, error: "Document already exists (If-None-Match: *)" };
  }

  if (params.ifMatch && existing && existing.docEtag !== params.ifMatch) {
    return { etag: "", status: 409, error: "ETag mismatch — document was modified by another client" };
  }

  // If no concurrency headers provided, allow upsert (Storyline doesn't send If-Match)
  // Strict xAPI would reject here, but practical LRS implementations allow it

  const newEtag = generateETag(params.content);
  const now = new Date().toISOString();

  await uploadBlob("documents", blobPath, params.content, params.contentType);

  const entity: DocumentMeta = {
    partitionKey,
    rowKey,
    contentType: params.contentType,
    blobPath,
    docEtag: newEtag,
    updatedAt: now,
  };

  if (existing) {
    await table.updateEntity(entity, "Replace");
  } else {
    await table.createEntity(entity);
  }

  return { etag: newEtag, status: 204 };
}

// ── Post document (merge if both JSON) ──
export async function postDocument(params: {
  docType: DocType;
  activityId?: string;
  agent?: Actor;
  stateId?: string;
  profileId?: string;
  registration?: string;
  content: string;
  contentType: string;
}): Promise<{ etag: string; status: number; error?: string }> {
  const { partitionKey, rowKey, blobPath } = buildDocKeys(params);
  const table = await getTableClient("documents");

  const existing = await getDocumentMeta(partitionKey, rowKey);

  if (!existing) {
    const newEtag = generateETag(params.content);
    await uploadBlob("documents", blobPath, params.content, params.contentType);
    await table.createEntity({
      partitionKey,
      rowKey,
      contentType: params.contentType,
      blobPath,
      docEtag: newEtag,
      updatedAt: new Date().toISOString(),
    } as DocumentMeta);
    return { etag: newEtag, status: 204 };
  }

  const isNewJson = params.contentType.includes("application/json");
  const isExistingJson = existing.contentType.includes("application/json");

  let finalContent: string;
  let finalContentType: string;

  if (isNewJson && isExistingJson) {
    const existingContent = await downloadBlob("documents", existing.blobPath);
    let existingObj: Record<string, unknown>;
    let newObj: Record<string, unknown>;

    try {
      existingObj = JSON.parse(existingContent);
      newObj = JSON.parse(params.content);
    } catch {
      return { etag: "", status: 400, error: "Cannot merge — invalid JSON" };
    }

    if (typeof existingObj !== "object" || typeof newObj !== "object" ||
        Array.isArray(existingObj) || Array.isArray(newObj)) {
      finalContent = params.content;
      finalContentType = params.contentType;
    } else {
      const merged = { ...existingObj, ...newObj };
      finalContent = JSON.stringify(merged);
      finalContentType = "application/json";
    }
  } else {
    finalContent = params.content;
    finalContentType = params.contentType;
  }

  const newEtag = generateETag(finalContent);
  await uploadBlob("documents", blobPath, finalContent, finalContentType);
  await table.updateEntity(
    {
      partitionKey,
      rowKey,
      contentType: finalContentType,
      docEtag: newEtag,
      updatedAt: new Date().toISOString(),
    },
    "Merge"
  );

  return { etag: newEtag, status: 204 };
}

// ── Get a single document ──
export async function getDocument(params: {
  docType: DocType;
  activityId?: string;
  agent?: Actor;
  stateId?: string;
  profileId?: string;
  registration?: string;
}): Promise<{
  content: string;
  contentType: string;
  etag: string;
  updatedAt: string;
} | null> {
  const { partitionKey, rowKey } = buildDocKeys(params);
  const meta = await getDocumentMeta(partitionKey, rowKey);
  if (!meta) return null;

  const exists = await blobExists("documents", meta.blobPath);
  if (!exists) return null;

  const content = await downloadBlob("documents", meta.blobPath);
  return {
    content,
    contentType: meta.contentType,
    etag: meta.docEtag || "",
    updatedAt: meta.updatedAt,
  };
}

// ── List document IDs ──
export async function listDocumentIds(params: {
  docType: DocType;
  activityId?: string;
  agent?: Actor;
  registration?: string;
}): Promise<string[]> {
  const { partitionKey } = buildDocKeys({
    ...params,
    stateId: "placeholder",
    profileId: "placeholder",
  });
  const table = await getTableClient("documents");

  const ids: string[] = [];
  const filter = `PartitionKey eq '${partitionKey.replace(/'/g, "''")}'`;

  const iterator = table.listEntities<DocumentMeta>({
    queryOptions: { filter },
  });

  for await (const entity of iterator) {
    const parts = entity.rowKey.split(":");
    if (parts.length >= 2) {
      const docId = parts[1];
      if (params.registration) {
        if (parts[2] === params.registration) {
          ids.push(docId);
        }
      } else {
        ids.push(docId);
      }
    }
  }

  return ids;
}

// ── Delete a single document ──
export async function deleteDocument(params: {
  docType: DocType;
  activityId?: string;
  agent?: Actor;
  stateId?: string;
  profileId?: string;
  registration?: string;
  ifMatch?: string;
}): Promise<{ status: number; error?: string }> {
  const { partitionKey, rowKey } = buildDocKeys(params);
  const table = await getTableClient("documents");

  const existing = await getDocumentMeta(partitionKey, rowKey);
  if (!existing) {
    return { status: 204 };
  }

  if (params.ifMatch && existing.docEtag !== params.ifMatch) {
    return { status: 409, error: "ETag mismatch" };
  }

  await table.deleteEntity(partitionKey, rowKey);
  return { status: 204 };
}

// ── Delete all documents for an agent+activity (State API bulk delete) ──
export async function deleteAllDocuments(params: {
  docType: DocType;
  activityId?: string;
  agent?: Actor;
  registration?: string;
}): Promise<void> {
  const { partitionKey } = buildDocKeys({
    ...params,
    stateId: "placeholder",
    profileId: "placeholder",
  });
  const table = await getTableClient("documents");

  const filter = `PartitionKey eq '${partitionKey.replace(/'/g, "''")}'`;
  const iterator = table.listEntities<DocumentMeta>({
    queryOptions: { filter },
  });

  for await (const entity of iterator) {
    if (params.registration) {
      const parts = entity.rowKey.split(":");
      if (parts[2] !== params.registration) continue;
    }
    await table.deleteEntity(entity.partitionKey, entity.rowKey);
  }
}

// ── Helper: get document metadata from table ──
async function getDocumentMeta(
  partitionKey: string,
  rowKey: string
): Promise<DocumentMeta | null> {
  const table = await getTableClient("documents");
  try {
    return await table.getEntity<DocumentMeta>(partitionKey, rowKey);
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 404) return null;
    throw e;
  }
}
