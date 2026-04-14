import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth/session";
import { resetLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  try {
    const limit = resetLimiter.check(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: true, message: "Too many reset attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ error: true, message: "Token and password are required" }, { status: 400 });
    // Password policy is enforced in resetPasswordWithToken via validatePassword

    const result = await resetPasswordWithToken(token, password);

    if ("error" in result) {
      return NextResponse.json({ error: true, message: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: "Password reset successfully. You can now sign in." });
  } catch (e) {
    logger.error("Reset password failed", { error: e, ip });
    return NextResponse.json({ error: true, message: "Failed to reset password" }, { status: 500 });
  }
}
