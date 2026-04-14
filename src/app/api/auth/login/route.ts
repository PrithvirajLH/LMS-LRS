import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth/session";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  try {
    const limit = authLimiter.check(ip);
    if (!limit.allowed) {
      logger.warn("Rate limit hit", { endpoint: "/api/auth/login", ip });
      return NextResponse.json(
        { error: true, message: "Too many login attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

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
    logger.error("Login failed", { error: e, ip });
    return NextResponse.json({ error: true, message: "Login failed" }, { status: 500 });
  }
}
