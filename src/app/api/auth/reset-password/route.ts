import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ error: true, message: "Token and password are required" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: true, message: "Password must be at least 6 characters" }, { status: 400 });

    const result = await resetPasswordWithToken(token, password);

    if ("error" in result) {
      return NextResponse.json({ error: true, message: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: "Password reset successfully. You can now sign in." });
  } catch (e) {
    console.error("Reset password error:", e);
    return NextResponse.json({ error: true, message: "Failed to reset password" }, { status: 500 });
  }
}
