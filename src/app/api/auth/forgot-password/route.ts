import { NextRequest, NextResponse } from "next/server";
import { createResetToken } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: true, message: "Email is required" }, { status: 400 });

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
    console.error("Forgot password error:", e);
    return NextResponse.json({ error: true, message: "Failed to process request" }, { status: 500 });
  }
}
