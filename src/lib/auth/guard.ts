import { NextRequest, NextResponse } from "next/server";
import { getSession, type SessionEntity } from "./session";

/**
 * Auth guard for API routes.
 * Returns the session if authenticated and authorized, or an error response.
 */
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: string[]
): Promise<{ session: SessionEntity } | NextResponse> {
  const sessionId = request.cookies.get("lms_session")?.value;

  if (!sessionId) {
    return NextResponse.json(
      { error: true, message: "Authentication required" },
      { status: 401 }
    );
  }

  const session = await getSession(sessionId);

  if (!session) {
    const response = NextResponse.json(
      { error: true, message: "Session expired" },
      { status: 401 }
    );
    response.cookies.delete("lms_session");
    return response;
  }

  // Check role if specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: true, message: "Insufficient permissions" },
        { status: 403 }
      );
    }
  }

  return { session };
}

/**
 * Helper to check if the result is an error response.
 */
export function isAuthError(result: { session: SessionEntity } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
