import { NextRequest, NextResponse } from "next/server";
import { registerUser, createSession, getSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, employeeId, password, facility, department, position, role } = body;

    if (!name || !email || !employeeId || !password || !facility) {
      return NextResponse.json(
        { error: true, message: "name, email, employeeId, password, and facility are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: true, message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const user = await registerUser({ name, email, employeeId, password, facility, department, position, role });

    // Auto-login after registration
    const sessionId = await createSession(user);
    const session = await getSession(sessionId);

    const response = NextResponse.json({
      user: {
        userId: session!.userId,
        name: session!.userName,
        email: session!.email,
        role: session!.role,
        facility: session!.facility,
      },
    }, { status: 201 });

    response.cookies.set("lms_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Registration failed";
    console.error("Register error:", e);
    return NextResponse.json({ error: true, message }, { status: 500 });
  }
}
