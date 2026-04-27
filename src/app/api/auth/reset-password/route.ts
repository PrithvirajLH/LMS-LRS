import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth/session";
import { resetLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { ResetPasswordSchema } from "@/lib/schemas";

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

    const parsed = ResetPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { token, password } = parsed.data;

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
