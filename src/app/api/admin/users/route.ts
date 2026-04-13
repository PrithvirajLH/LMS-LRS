import { requireAuth, isAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/users/user-storage";
import { adminUpdateUser } from "@/lib/auth/session";

// POST /api/admin/users — Create a new user
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const body = await request.json();
    const { name, email, employeeId, facility, department, position, status } = body;

    if (!name || !email || !employeeId || !facility) {
      return NextResponse.json({ error: true, message: "name, email, employeeId, and facility are required" }, { status: 400 });
    }

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

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/users error:", e);
    return NextResponse.json({ error: true, message: "Failed to create user" }, { status: 500 });
  }
}

// GET /api/admin/users — List all users
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const facility = request.nextUrl.searchParams.get("facility") || undefined;
    const users = await listUsers(facility);
    return NextResponse.json({ users });
  } catch (e) {
    console.error("GET /api/admin/users error:", e);
    return NextResponse.json({ error: true, message: "Failed to list users" }, { status: 500 });
  }
}

// PATCH /api/admin/users — Update user role/status
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { userId, role, status } = await request.json();
    if (!userId) return NextResponse.json({ error: true, message: "userId required" }, { status: 400 });

    const updates: { role?: string; status?: string } = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    const result = await adminUpdateUser(userId, updates);
    if ("error" in result) return NextResponse.json({ error: true, message: result.error }, { status: 404 });

    return NextResponse.json({ userId, ...updates });
  } catch (e) {
    console.error("PATCH /api/admin/users error:", e);
    return NextResponse.json({ error: true, message: "Failed to update user" }, { status: 500 });
  }
}
