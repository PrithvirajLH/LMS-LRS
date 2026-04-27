import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { adminResetPassword } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { AdminResetPasswordSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);

    const parsed = AdminResetPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: true, message: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { userId, newPassword } = parsed.data;

    const result = await adminResetPassword(userId, newPassword);
    if ("error" in result) return NextResponse.json({ error: true, message: result.error }, { status: 400 });

    audit({
      action: "user.password_reset",
      actorId: auth.session.userId, actorName: auth.session.userName, actorRole: auth.session.role,
      targetType: "user", targetId: userId,
      summary: `Admin reset password for user ${userId}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("Admin reset password failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to reset password" }, { status: 500 });
  }
}
