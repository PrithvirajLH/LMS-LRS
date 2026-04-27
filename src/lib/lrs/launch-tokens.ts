import { randomBytes, randomUUID } from "crypto";
import { getTableClient } from "@/lib/azure/table-client";
import { logger } from "@/lib/logger";

// Bound, short-lived credential issued at /api/learner/launch.
// Replaces the shared LRS API key for browser-side xAPI traffic.
export interface LaunchTokenEntity {
  partitionKey: string;   // "lt"
  rowKey: string;         // 64-char hex token
  userId: string;
  email: string;
  userName: string;
  courseId: string;
  activityId: string;
  registration: string;   // server-minted UUID, unique per launch
  expiresAt: string;      // ISO
  createdAt: string;      // ISO
}

const DEFAULT_TTL_SECONDS = 4 * 60 * 60;     // 4 hours
const MIN_TTL_SECONDS = 30 * 60;             // 30 min floor
const MAX_TTL_SECONDS = 8 * 60 * 60;         // 8 h ceiling

export interface MintLaunchTokenInput {
  userId: string;
  email: string;
  userName: string;
  courseId: string;
  activityId: string;
  ttlSeconds?: number;
}

export async function mintLaunchToken(
  input: MintLaunchTokenInput
): Promise<LaunchTokenEntity> {
  const table = await getTableClient("launchTokens");
  const token = randomBytes(32).toString("hex");
  const ttl = Math.min(
    Math.max(input.ttlSeconds ?? DEFAULT_TTL_SECONDS, MIN_TTL_SECONDS),
    MAX_TTL_SECONDS
  );
  const now = new Date();
  const entity: LaunchTokenEntity = {
    partitionKey: "lt",
    rowKey: token,
    userId: input.userId,
    email: input.email,
    userName: input.userName,
    courseId: input.courseId,
    activityId: input.activityId,
    registration: randomUUID(),
    expiresAt: new Date(now.getTime() + ttl * 1000).toISOString(),
    createdAt: now.toISOString(),
  };
  await table.createEntity(entity);
  return entity;
}

export async function getLaunchToken(
  token: string
): Promise<LaunchTokenEntity | null> {
  // Format-check before hitting storage — prevents probe queries from doing real work
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

  const table = await getTableClient("launchTokens");
  try {
    const entity = await table.getEntity<LaunchTokenEntity>("lt", token);
    if (new Date(entity.expiresAt) < new Date()) {
      table
        .deleteEntity("lt", token)
        .catch((e) => logger.warn("Stale launch token delete failed", { error: e }));
      return null;
    }
    return entity;
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 404) return null;
    throw e;
  }
}
