import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: true, message: "Email/Employee ID and password are required" }, { status: 400 });
    }

    const result = await login(identifier, password);

    if ("error" in result) {
      return NextResponse.json({ error: true, message: result.error }, { status: 401 });
    }

    // Set session cookie
    const response = NextResponse.json({
      user: {
        userId: result.session.userId,
        name: result.session.userName,
        email: result.session.email,
        role: result.session.role,
        facility: result.session.facility,
      },
    });

    response.cookies.set("lms_session", result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: true, message: "Login failed" }, { status: 500 });
  }
}
