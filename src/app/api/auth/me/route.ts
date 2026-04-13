import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUser } from "@/lib/users/user-storage";

// GET /api/auth/me — Get current user from session
export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("lms_session")?.value;

  if (!sessionId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = await getSession(sessionId);

  if (!session) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.cookies.delete("lms_session");
    return response;
  }

  // Fetch full user profile from users table
  const fullUser = await getUser(session.userId);

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      name: session.userName,
      email: session.email,
      role: session.role,
      facility: session.facility,
      employeeId: fullUser?.employeeId || "",
      department: fullUser?.department || "",
      position: fullUser?.position || "",
      status: fullUser?.status || "active",
      tags: fullUser?.tags || "",
    },
  });
}
