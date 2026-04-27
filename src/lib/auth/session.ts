import { randomBytes } from "crypto";
import { hash, compare } from "bcryptjs";
import { cookies } from "next/headers";
import { getTableClient } from "@/lib/azure/table-client";
import { sessionCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

const SESSION_COOKIE = "lms_session";
// Absolute max session lifetime (HIPAA: a session token may live for at
// most a working day, even with continued activity).
const SESSION_TTL_HOURS = 24;
// Idle timeout — session expires this many minutes after the last
// authenticated request. HIPAA-aligned default; tune per facility via
// SESSION_IDLE_TIMEOUT_MINUTES env var (15-30 typical).
const SESSION_IDLE_TIMEOUT_MINUTES = parseInt(
  process.env.SESSION_IDLE_TIMEOUT_MINUTES || "30",
  10
);
// How often to flush a session's lastActivityAt back to Azure Tables.
// We don't write on every request — only when activity is older than this
// fraction of the idle timeout. Cuts table writes by ~10x.
const ACTIVITY_FLUSH_THRESHOLD_MS =
  (SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000) / 4;

/** Validate password meets minimum strength requirements. Returns error message or null. */
export function validatePassword(password: string): string | null {
  if (
    password.length < 12 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return "Password must be at least 12 characters with uppercase, lowercase, and a number";
  }
  return null;
}

// ── Role type ──
export type UserRole = "learner" | "instructor" | "admin";

// ── Session Entity ──
export interface SessionEntity {
  partitionKey: string; // "session"
  rowKey: string;       // sessionId
  userId: string;
  userName: string;
  email: string;
  role: UserRole;
  facility: string;
  /** Idle expiration — slides forward on every authenticated request. */
  expiresAt: string;
  /** Hard cutoff — never extends past 24h from session creation. */
  absoluteExpiresAt?: string;
  /** Last time the user made an authenticated request. */
  lastActivityAt?: string;
}

// ── User with auth fields ──
export interface AuthUser {
  partitionKey: string;
  rowKey: string;
  name: string;
  email: string;
  employeeId: string;
  facility: string;
  department: string;
  position: string;
  role: UserRole;
  status: string;
  passwordHash: string;
  tags: string;
}

// ── User Lookup Index Entity ──
// Maps email/employeeId → (partitionKey, rowKey) in users table.
// Partition: "email" or "empid", Row: lowercase identifier value.
interface UserLookupEntity {
  partitionKey: string;
  rowKey: string;
  userPartitionKey: string;
  userRowKey: string;
}

// ── Lookup index helpers ──

/** Write both email and employeeId index entries for a user. */
async function writeUserLookupIndex(user: { email: string; employeeId: string; partitionKey: string; rowKey: string }): Promise<void> {
  const lookupTable = await getTableClient("userLookup");

  const emailEntry: UserLookupEntity = {
    partitionKey: "email",
    rowKey: user.email.toLowerCase().trim(),
    userPartitionKey: user.partitionKey,
    userRowKey: user.rowKey,
  };

  const empIdEntry: UserLookupEntity = {
    partitionKey: "empid",
    rowKey: user.employeeId.toLowerCase().trim(),
    userPartitionKey: user.partitionKey,
    userRowKey: user.rowKey,
  };

  // Upsert both — ignore conflicts (idempotent)
  for (const entry of [emailEntry, empIdEntry]) {
    try {
      await lookupTable.upsertEntity(entry, "Replace");
    } catch (e) {
      logger.warn("Failed to write user lookup index entry", {
        partitionKey: entry.partitionKey,
        rowKey: entry.rowKey,
        error: e,
      });
    }
  }
}

/**
 * Find a user by email or employeeId.
 * Fast path: O(1) point read via userLookup index table.
 * Fallback: full table scan (for users created before the index existed).
 */
async function findUserByIdentifier(identifier: string): Promise<AuthUser | null> {
  const userTable = await getTableClient("users");
  const searchLower = identifier.toLowerCase().trim();

  // ── Fast path: try the lookup index ──
  try {
    const lookupTable = await getTableClient("userLookup");

    // Try email first, then employeeId
    for (const pk of ["email", "empid"]) {
      try {
        const lookup = await lookupTable.getEntity<UserLookupEntity>(pk, searchLower);
        // Got a hit — point-read the actual user
        const user = await userTable.getEntity<AuthUser>(
          lookup.userPartitionKey,
          lookup.userRowKey
        );
        return user;
      } catch (e: unknown) {
        const err = e as { statusCode?: number };
        if (err.statusCode !== 404) throw e;
        // Not found in this partition — try next
      }
    }
  } catch {
    // Index table might not exist yet — fall through to scan
  }

  // ── Fallback: capped scan (backward compat for pre-index users) ──
  logger.warn("User lookup falling back to table scan", { identifier: searchLower });
  const iter = userTable.listEntities<AuthUser>();
  let scanned = 0;
  const MAX_SCAN = 500;
  for await (const entity of iter) {
    if (++scanned > MAX_SCAN) {
      logger.error("User lookup scan exceeded limit, aborting", { identifier: searchLower, scanned });
      break;
    }
    if (
      entity.email?.toLowerCase() === searchLower ||
      entity.employeeId?.toLowerCase() === searchLower
    ) {
      // Backfill the index for next time
      writeUserLookupIndex(entity).catch((e) => logger.warn("Lookup index backfill failed", { error: e }));
      return entity;
    }
  }

  return null;
}

/**
 * Find a user by userId (rowKey).
 * Fast path: O(1) if we know the partition key.
 * Since userId is the rowKey and we don't know the partition,
 * use a cross-partition RowKey filter (still much faster than unfiltered scan).
 */
async function findUserById(userId: string): Promise<AuthUser | null> {
  const userTable = await getTableClient("users");
  const escaped = userId.replace(/'/g, "''");

  const iter = userTable.listEntities<AuthUser>({
    queryOptions: { filter: `RowKey eq '${escaped}'` },
  });

  for await (const entity of iter) {
    return entity;
  }
  return null;
}

// ── Create session ──
export async function createSession(user: AuthUser): Promise<string> {
  const table = await getTableClient("sessions");
  const sessionId = randomBytes(32).toString("hex");
  const now = new Date();
  const nowIso = now.toISOString();
  // Idle expiration — slides forward on each request
  const expiresAt = new Date(
    now.getTime() + SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000
  ).toISOString();
  // Absolute hard cutoff — never extends past this
  const absoluteExpiresAt = new Date(
    now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  const entity: SessionEntity = {
    partitionKey: "session",
    rowKey: sessionId,
    userId: user.rowKey,
    userName: user.name,
    email: user.email,
    role: user.role || "learner",
    facility: user.facility,
    expiresAt,
    absoluteExpiresAt,
    lastActivityAt: nowIso,
  };

  await table.createEntity(entity);

  // Pre-warm the session cache
  sessionCache.set(sessionId, {
    userId: entity.userId,
    userName: entity.userName,
    email: entity.email,
    role: entity.role,
    facility: entity.facility,
    expiresAt: entity.expiresAt,
    absoluteExpiresAt: entity.absoluteExpiresAt,
    lastActivityAt: entity.lastActivityAt,
  });

  return sessionId;
}

// ── Get session (validate) — cache-first, with sliding idle timeout ──
//
// Two expiry checks per request:
//  1. Idle timeout (expiresAt) — slides forward on each call. Default 30 min.
//  2. Absolute timeout (absoluteExpiresAt) — never extends. Default 24h.
//
// Activity time is flushed to Azure Tables only when older than 1/4 of the
// idle window (not on every request) — keeps table writes manageable while
// staying HIPAA-aligned.
export async function getSession(sessionId: string): Promise<SessionEntity | null> {
  if (!sessionId) return null;

  const now = Date.now();
  const newIdleExpiresAtMs = now + SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000;

  // ── Cache hit path ──
  const cached = sessionCache.get(sessionId);
  if (cached) {
    // Idle expiry
    if (new Date(cached.expiresAt).getTime() < now) {
      sessionCache.delete(sessionId);
      getTableClient("sessions").then((t) => t.deleteEntity("session", sessionId)).catch(() => {});
      return null;
    }
    // Absolute expiry — never slide past this
    if (cached.absoluteExpiresAt && new Date(cached.absoluteExpiresAt).getTime() < now) {
      sessionCache.delete(sessionId);
      getTableClient("sessions").then((t) => t.deleteEntity("session", sessionId)).catch(() => {});
      return null;
    }

    const absoluteCutoff = cached.absoluteExpiresAt
      ? new Date(cached.absoluteExpiresAt).getTime()
      : Infinity;
    const slidExpiresAtMs = Math.min(newIdleExpiresAtMs, absoluteCutoff);
    const slidExpiresAt = new Date(slidExpiresAtMs).toISOString();
    const nowIso = new Date(now).toISOString();

    // Update cache immediately (cheap)
    cached.expiresAt = slidExpiresAt;
    cached.lastActivityAt = nowIso;

    // Flush to Azure Tables only if last write is older than threshold
    const lastFlush = cached.lastActivityAt ? new Date(cached.lastActivityAt).getTime() : 0;
    if (now - lastFlush > ACTIVITY_FLUSH_THRESHOLD_MS) {
      getTableClient("sessions").then((t) =>
        t.updateEntity(
          { partitionKey: "session", rowKey: sessionId, expiresAt: slidExpiresAt, lastActivityAt: nowIso },
          "Merge"
        )
      ).catch(() => { /* best-effort flush */ });
    }

    return {
      partitionKey: "session",
      rowKey: sessionId,
      userId: cached.userId,
      userName: cached.userName,
      email: cached.email,
      role: cached.role as UserRole,
      facility: cached.facility,
      expiresAt: slidExpiresAt,
      absoluteExpiresAt: cached.absoluteExpiresAt,
      lastActivityAt: nowIso,
    };
  }

  // ── Cache miss — read from Azure Tables ──
  const table = await getTableClient("sessions");

  try {
    const entity = await table.getEntity<SessionEntity>("session", sessionId);

    // Idle + absolute expiry checks
    if (new Date(entity.expiresAt).getTime() < now) {
      await table.deleteEntity("session", sessionId);
      return null;
    }
    if (entity.absoluteExpiresAt && new Date(entity.absoluteExpiresAt).getTime() < now) {
      await table.deleteEntity("session", sessionId);
      return null;
    }

    const absoluteCutoff = entity.absoluteExpiresAt
      ? new Date(entity.absoluteExpiresAt).getTime()
      : Infinity;
    const slidExpiresAt = new Date(Math.min(newIdleExpiresAtMs, absoluteCutoff)).toISOString();
    const nowIso = new Date(now).toISOString();

    // Slide forward in storage too (we already had to read the row)
    await table.updateEntity(
      { partitionKey: "session", rowKey: sessionId, expiresAt: slidExpiresAt, lastActivityAt: nowIso },
      "Merge"
    );

    // Populate cache for subsequent requests
    sessionCache.set(sessionId, {
      userId: entity.userId,
      userName: entity.userName,
      email: entity.email,
      role: entity.role,
      facility: entity.facility,
      expiresAt: slidExpiresAt,
      absoluteExpiresAt: entity.absoluteExpiresAt,
      lastActivityAt: nowIso,
    });

    return { ...entity, expiresAt: slidExpiresAt, lastActivityAt: nowIso };
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 404) return null;
    throw e;
  }
}

// ── Delete session ──
export async function deleteSession(sessionId: string): Promise<void> {
  sessionCache.delete(sessionId);
  const table = await getTableClient("sessions");
  try {
    await table.deleteEntity("session", sessionId);
  } catch {
    // Already gone
  }
}

// ── Get current session from cookies ──
export async function getCurrentSession(): Promise<SessionEntity | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return getSession(sessionId);
}

// ── Login (supports email OR employee ID) ──
export async function login(identifier: string, password: string): Promise<{ session: SessionEntity; sessionId: string } | { error: string }> {
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    return { error: "Invalid credentials" };
  }

  if (user.status === "inactive") {
    return { error: "Account is deactivated" };
  }

  if (!user.passwordHash) {
    return { error: "Account has no password set. Contact your administrator." };
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  // Create session
  const sessionId = await createSession(user);
  const session = await getSession(sessionId);

  return { session: session!, sessionId };
}

// ── Register user (with password) ──
export async function registerUser(data: {
  name: string;
  email: string;
  employeeId: string;
  password: string;
  facility: string;
  department?: string;
  position?: string;
  role?: UserRole;
}): Promise<AuthUser> {
  // Check if email already exists via index (O(1) instead of full scan)
  const existing = await findUserByIdentifier(data.email);
  if (existing) {
    throw new Error("Email already registered");
  }

  const userTable = await getTableClient("users");
  const passwordHash = await hash(data.password, 10);
  const facilitySlug = data.facility.toLowerCase().replace(/\s+/g, "-");
  const userId = randomBytes(4).toString("hex");
  const tags = [
    data.department ? `department-${data.department.toLowerCase().replace(/\s+/g, "-")}` : "",
    data.position ? `position-${data.position.toLowerCase().replace(/\s+/g, "-")}` : "",
  ].filter(Boolean).join(",");

  const now = new Date().toISOString();

  const entity: AuthUser = {
    partitionKey: facilitySlug,
    rowKey: userId,
    name: data.name,
    email: data.email,
    employeeId: data.employeeId,
    facility: data.facility,
    department: data.department || "",
    position: data.position || "",
    role: data.role || "learner",
    status: "active",
    passwordHash,
    tags,
  };

  await userTable.createEntity({
    ...entity,
    createdAt: now,
    updatedAt: now,
  });

  // Write lookup index so future logins are O(1)
  await writeUserLookupIndex(entity);

  return entity;
}

// ── Password Reset Token ──
export interface ResetTokenEntity {
  partitionKey: string; // "reset"
  rowKey: string;       // token
  userId: string;
  email: string;
  expiresAt: string;
}

export async function createResetToken(email: string): Promise<{ token: string; userId: string } | { error: string }> {
  const user = await findUserByIdentifier(email);
  if (!user) return { error: "No account found with this email" };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  const sessionTable = await getTableClient("sessions");
  await sessionTable.createEntity({
    partitionKey: "reset",
    rowKey: token,
    userId: user.rowKey,
    email: user.email,
    expiresAt,
  } as ResetTokenEntity);

  return { token, userId: user.rowKey };
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean } | { error: string }> {
  const pwError = validatePassword(newPassword);
  if (pwError) return { error: pwError };

  const sessionTable = await getTableClient("sessions");

  let resetEntity: ResetTokenEntity;
  try {
    resetEntity = await sessionTable.getEntity<ResetTokenEntity>("reset", token);
  } catch {
    return { error: "Invalid or expired reset link" };
  }

  if (new Date(resetEntity.expiresAt) < new Date()) {
    await sessionTable.deleteEntity("reset", token);
    return { error: "Reset link has expired" };
  }

  // Find user via index (O(1)) and update password
  const user = await findUserByIdentifier(resetEntity.email);
  if (user) {
    const passwordHash = await hash(newPassword, 10);
    const userTable = await getTableClient("users");
    await userTable.updateEntity(
      { partitionKey: user.partitionKey, rowKey: user.rowKey, passwordHash, updatedAt: new Date().toISOString() },
      "Merge"
    );
  }

  // Delete the reset token
  await sessionTable.deleteEntity("reset", token);

  return { success: true };
}

// ── Admin: Reset password for a user ──
export async function adminResetPassword(userId: string, newPassword: string): Promise<{ success: boolean } | { error: string }> {
  const pwError = validatePassword(newPassword);
  if (pwError) return { error: pwError };

  const user = await findUserById(userId);
  if (!user) return { error: "User not found" };

  const passwordHash = await hash(newPassword, 10);
  const userTable = await getTableClient("users");
  await userTable.updateEntity(
    { partitionKey: user.partitionKey, rowKey: user.rowKey, passwordHash, updatedAt: new Date().toISOString() },
    "Merge"
  );
  return { success: true };
}

// ── Admin: Update user role/status ──
export async function adminUpdateUser(userId: string, updates: { role?: UserRole; status?: string }): Promise<{ success: boolean } | { error: string }> {
  const user = await findUserById(userId);
  if (!user) return { error: "User not found" };

  const userTable = await getTableClient("users");
  await userTable.updateEntity(
    { partitionKey: user.partitionKey, rowKey: user.rowKey, ...updates, updatedAt: new Date().toISOString() },
    "Merge"
  );
  return { success: true };
}
