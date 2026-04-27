import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/users/user-storage";
import { adminUpdateUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { CreateUserSchema, UpdateUserRoleSchema } from "@/lib/schemas";

// POST /api/admin/users — Create a new user
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const parsed = CreateUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { name, email, employeeId, facility, department, position, status } = parsed.data;

    const user = await createUser({
      name,
      email,
      employeeId,
      facility,
      department: department || "",
      position: position || "",
      status: status || "active",
      tags: "",
    });

    audit({
      action: "user.create",
      actorId: auth.session.userId, actorName: auth.session.userName, actorRole: auth.session.role,
      targetType: "user", targetId: user.rowKey,
      summary: `Created user ${name} (${email})`,
      details: { name, email, employeeId, facility, role: "learner" },
      ip: getClientIp(request),
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("POST /api/admin/users failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to create user" }, { status: 500 });
  }
}

// GET /api/admin/users — List all users
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]);
    const facility = request.nextUrl.searchParams.get("facility") || undefined;
    const users = await listUsers(facility);
    return NextResponse.json({ users });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("GET /api/admin/users failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to list users" }, { status: 500 });
  }
}

// PATCH /api/admin/users — Update user role/status
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    const parsed = UpdateUserRoleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { userId, role, status } = parsed.data;

    const updates: { role?: typeof role; status?: string } = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    const result = await adminUpdateUser(userId, updates);
    if ("error" in result) return NextResponse.json({ error: true, message: result.error }, { status: 404 });

    audit({
      action: role ? "user.role_change" : "user.status_change",
      actorId: auth.session.userId, actorName: auth.session.userName, actorRole: auth.session.role,
      targetType: "user", targetId: userId,
      summary: `Updated user ${userId}: ${Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(", ")}`,
      details: updates,
      ip: getClientIp(request),
    });

    return NextResponse.json({ userId, ...updates });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("PATCH /api/admin/users failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to update user" }, { status: 500 });
  }
}
