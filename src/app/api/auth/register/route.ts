import { NextRequest, NextResponse } from "next/server";
import { registerUser, createSession, getSession } from "@/lib/auth/session";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { RegisterSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  try {
    const limit = authLimiter.check(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: true, message: "Too many registration attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const parsed = RegisterSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { name, email, employeeId, password, facility, department, position } = parsed.data;

    // Self-registration is always "learner" — instructors/admins are created by admins only
    const user = await registerUser({ name, email, employeeId, password, facility, department, position, role: "learner" });

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
    logger.error("Registration failed", { error: e, ip });
    return NextResponse.json({ error: true, message }, { status: 500 });
  }
}
