import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth/session";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { LoginSchema } from "@/lib/schemas";

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

    const parsed = LoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { identifier, password } = parsed.data;

    const result = await login(identifier, password);

    if ("error" in result) {
      // Audit failed login attempts (HIPAA: track unauthorized access attempts)
      audit({
        action: "auth.login_failed",
        actorId: "anonymous",
        actorName: identifier.slice(0, 60),
        actorRole: "learner",
        targetType: "session",
        targetId: identifier.slice(0, 60),
        summary: `Failed login attempt: ${result.error}`,
        ip,
      });
      return NextResponse.json({ error: true, message: result.error }, { status: 401 });
    }

    // Audit successful login
    audit({
      action: "auth.login",
      actorId: result.session.userId,
      actorName: result.session.userName,
      actorRole: result.session.role,
      targetType: "session",
      targetId: result.sessionId.slice(0, 8),
      summary: `${result.session.userName} signed in`,
      ip,
    });

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
      // Cookie can live up to the absolute session lifetime; the server
      // enforces the idle timeout independently (see src/lib/auth/session.ts).
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (e) {
    logger.error("Login failed", { error: e, ip });
    return NextResponse.json({ error: true, message: "Login failed" }, { status: 500 });
  }
}
