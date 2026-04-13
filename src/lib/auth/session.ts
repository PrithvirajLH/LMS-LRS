import { randomBytes } from "crypto";
import { hash, compare } from "bcryptjs";
import { cookies } from "next/headers";
import { getTableClient } from "@/lib/azure/table-client";

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
  return sessionId;
}

// ── Get session (validate) ──
export async function getSession(sessionId: string): Promise<SessionEntity | null> {
  if (!sessionId) return null;
  const table = await getTableClient("sessions");

  try {
    const entity = await table.getEntity<SessionEntity>("session", sessionId);

    // Check expiry
    if (new Date(entity.expiresAt) < new Date()) {
      // Expired — clean up
      await table.deleteEntity("session", sessionId);
      return null;
    }

    return entity;
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 404) return null;
    throw e;
  }
}

// ── Delete session ──
export async function deleteSession(sessionId: string): Promise<void> {
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
  // Find user by email or employee ID
  const userTable = await getTableClient("users");
  let user: AuthUser | null = null;
  const searchLower = identifier.toLowerCase().trim();

  const iter = userTable.listEntities<AuthUser>();
  for await (const entity of iter) {
    if (
      entity.email?.toLowerCase() === searchLower ||
      entity.employeeId?.toLowerCase() === searchLower
    ) {
      user = entity;
      break;
    }
  }

  if (!user) {
    return { error: "Invalid credentials" };
  }

  if (user.status === "inactive") {
    return { error: "Account is deactivated" };
  }

  // Check password
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
  const userTable = await getTableClient("users");

  // Check if email already exists
  const iter = userTable.listEntities<AuthUser>();
  for await (const entity of iter) {
    if (entity.email?.toLowerCase() === data.email.toLowerCase()) {
      throw new Error("Email already registered");
    }
  }

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
  const userTable = await getTableClient("users");
  let user: AuthUser | null = null;

  const iter = userTable.listEntities<AuthUser>();
  for await (const entity of iter) {
    if (entity.email?.toLowerCase() === email.toLowerCase()) {
      user = entity;
      break;
    }
  }

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

  // Find user and update password
  const userTable = await getTableClient("users");
  const passwordHash = await hash(newPassword, 10);

  // Find user by email across all partitions
  const iter = userTable.listEntities<AuthUser>();
  for await (const entity of iter) {
    if (entity.email?.toLowerCase() === resetEntity.email.toLowerCase()) {
      await userTable.updateEntity(
        { partitionKey: entity.partitionKey, rowKey: entity.rowKey, passwordHash, updatedAt: new Date().toISOString() },
        "Merge"
      );
      break;
    }
  }

  // Delete the reset token
  await sessionTable.deleteEntity("reset", token);

  return { success: true };
}

// ── Admin: Reset password for a user ──
export async function adminResetPassword(userId: string, newPassword: string): Promise<{ success: boolean } | { error: string }> {
  const userTable = await getTableClient("users");
  const passwordHash = await hash(newPassword, 10);

  const iter = userTable.listEntities<AuthUser>();
  for await (const entity of iter) {
    if (entity.rowKey === userId) {
      await userTable.updateEntity(
        { partitionKey: entity.partitionKey, rowKey: entity.rowKey, passwordHash, updatedAt: new Date().toISOString() },
        "Merge"
      );
      return { success: true };
    }
  }

  return { error: "User not found" };
}

// ── Admin: Update user role/status ──
export async function adminUpdateUser(userId: string, updates: { role?: string; status?: string }): Promise<{ success: boolean } | { error: string }> {
  const userTable = await getTableClient("users");

  const iter = userTable.listEntities<AuthUser>();
  for await (const entity of iter) {
    if (entity.rowKey === userId) {
      await userTable.updateEntity(
        { partitionKey: entity.partitionKey, rowKey: entity.rowKey, ...updates, updatedAt: new Date().toISOString() },
        "Merge"
      );
      return { success: true };
    }
  }

  return { error: "User not found" };
}
