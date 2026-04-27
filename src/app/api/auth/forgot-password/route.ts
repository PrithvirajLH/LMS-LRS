import { NextRequest, NextResponse } from "next/server";
import { createResetToken } from "@/lib/auth/session";
import { resetLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { ForgotPasswordSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  try {
    const limit = resetLimiter.check(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: true, message: "Too many reset requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const parsed = ForgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { email } = parsed.data;

    const result = await createResetToken(email);

    if ("error" in result) {
      // Don't reveal if email exists — always return success
      return NextResponse.json({ message: "If an account exists with this email, a reset link has been generated." });
    }

    // In production, send email with reset link: /reset-password?token={result.token}
    // For now, return the token directly (dev mode)
    return NextResponse.json({
      message: "If an account exists with this email, a reset link has been generated.",
      // DEV ONLY — remove in production:
      resetUrl: `/reset-password?token=${result.token}`,
    });
  } catch (e) {
    logger.error("Forgot password failed", { error: e, ip });
    return NextResponse.json({ error: true, message: "Failed to process request" }, { status: 500 });
  }
}
