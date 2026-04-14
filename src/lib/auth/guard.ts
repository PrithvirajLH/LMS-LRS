import { NextRequest, NextResponse } from "next/server";
import { getSession, type SessionEntity, type UserRole } from "./session";

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Auth guard for API routes.
 * Returns the session if authenticated and authorized, or throws AuthError.
 */
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: UserRole[]
): Promise<{ session: SessionEntity }> {
  const sessionId = request.cookies.get("lms_session")?.value;

  if (!sessionId) {
    throw new AuthError(401, "Authentication required");
  }

  const session = await getSession(sessionId);

  if (!session) {
    throw new AuthError(401, "Session expired");
  }

  // Check role if specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(session.role)) {
      throw new AuthError(403, "Insufficient permissions");
    }
  }

  return { session };
}

/**
 * Convert an AuthError to a NextResponse. Use in route catch blocks.
 */
export function handleAuthError(e: unknown): NextResponse | null {
  if (e instanceof AuthError) {
    const response = NextResponse.json(
      { error: true, message: e.message },
      { status: e.status }
    );
    if (e.status === 401) {
      response.cookies.delete("lms_session");
    }
    return response;
  }
  return null;
}
