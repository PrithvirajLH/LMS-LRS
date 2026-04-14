import { randomBytes } from "crypto";
import { hash, compare } from "bcryptjs";
import { cookies } from "next/headers";
import { getTableClient } from "@/lib/azure/table-client";
import { sessionCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

const SESSION_COOKIE = "lms_session";
const SESSION_TTL_HOURS = 24;

// ── Session Entity ──
export interface SessionEntity {
  partitionKey: string; // "session"
  rowKey: string;       // sessionId
  userId: string;
  userName: string;
  email: string;
  role: string;         // "learner" | "instructor" | "admin"
  facility: string;
  expiresAt: string;
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
  role: string;
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
    } catch {
      // Best effort — login still works with fallback scan
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

  // ── Fallback: full scan (backward compat for pre-index users) ──
  logger.warn("User lookup falling back to full table scan", { identifier: searchLower });
  const iter = userTable.listEntities<AuthUser>();
  for await (const entity of iter) {
    if (
      entity.email?.toLowerCase() === searchLower ||
      entity.employeeId?.toLowerCase() === searchLower
    ) {
      // Backfill the index for next time
      writeUserLookupIndex(entity).catch(() => {});
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
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const entity: SessionEntity = {
    partitionKey: "session",
    rowKey: sessionId,
    userId: user.rowKey,
    userName: user.name,
    email: user.email,
    role: user.role || "learner",
    facility: user.facility,
    expiresAt,
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
  });

  return sessionId;
}

// ── Get session (validate) — cache-first ──
export async function getSession(sessionId: string): Promise<SessionEntity | null> {
  if (!sessionId) return null;

  // Check in-memory cache first (avoids Azure Table read)
  const cached = sessionCache.get(sessionId);
  if (cached) {
    if (new Date(cached.expiresAt) < new Date()) {
      sessionCache.delete(sessionId);
      // Async cleanup — don't block the response
      getTableClient("sessions").then((t) => t.deleteEntity("session", sessionId)).catch(() => {});
      return null;
    }
    return {
      partitionKey: "session",
      rowKey: sessionId,
      userId: cached.userId,
      userName: cached.userName,
      email: cached.email,
      role: cached.role,
      facility: cached.facility,
      expiresAt: cached.expiresAt,
    };
  }

  // Cache miss — read from Azure Tables
  const table = await getTableClient("sessions");

  try {
    const entity = await table.getEntity<SessionEntity>("session", sessionId);

    // Check expiry
    if (new Date(entity.expiresAt) < new Date()) {
      await table.deleteEntity("session", sessionId);
      return null;
    }

    // Populate cache for subsequent requests
    sessionCache.set(sessionId, {
      userId: entity.userId,
      userName: entity.userName,
      email: entity.email,
      role: entity.role,
      facility: entity.facility,
      expiresAt: entity.expiresAt,
    });

    return entity;
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
  role?: string;
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
export async function adminUpdateUser(userId: string, updates: { role?: string; status?: string }): Promise<{ success: boolean } | { error: string }> {
  const user = await findUserById(userId);
  if (!user) return { error: "User not found" };

  const userTable = await getTableClient("users");
  await userTable.updateEntity(
    { partitionKey: user.partitionKey, rowKey: user.rowKey, ...updates, updatedAt: new Date().toISOString() },
    "Merge"
  );
  return { success: true };
}
