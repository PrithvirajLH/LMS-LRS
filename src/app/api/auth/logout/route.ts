import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("lms_session")?.value;

  if (sessionId) {
    // Capture session info BEFORE deleting so we can audit it
    const session = await getSession(sessionId);
    if (session) {
      audit({
        action: "auth.logout",
        actorId: session.userId,
        actorName: session.userName,
        actorRole: session.role,
        targetType: "session",
        targetId: sessionId.slice(0, 8),
        summary: `${session.userName} signed out`,
        ip: getClientIp(request),
      });
    }
    await deleteSession(sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("lms_session");
  return response;
}
