import { NextRequest, NextResponse } from "next/server";

// ── CORS ──────────────────────────────────────────────────────────────
// Allowed origins: your own domain + any xAPI client origins.
// Set ALLOWED_ORIGINS in .env.local as a comma-separated list,
// e.g. "https://lms.example.com,https://storyline-player.example.com"
// Falls back to same-origin only in production, permissive in dev.
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];
const IS_DEV = process.env.NODE_ENV !== "production";

function getAllowedOrigin(requestOrigin: string | null): string {
  // Dev mode: allow everything (local testing, Storyline preview, etc.)
  if (IS_DEV) return requestOrigin || "*";
  // Production: check against allowlist
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  // xAPI spec requires CORS for cross-origin Storyline/LTI launches
  // If no origin header (server-to-server), allow
  if (!requestOrigin) return "";
  // Deny unknown origins
  return "";
}

function buildCorsHeaders(requestOrigin: string | null) {
  const origin = getAllowedOrigin(requestOrigin);
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-Experience-API-Version, If-Match, If-None-Match, Accept-Language",
    "Access-Control-Expose-Headers":
      "ETag, Last-Modified, X-Experience-API-Version, X-Experience-API-Consistent-Through",
    "Access-Control-Max-Age": "86400",
    ...(origin && origin !== "*"
      ? { Vary: "Origin" }
      : {}),
  };
}

// Routes that require authentication
const PROTECTED_ROUTES = ["/learn", "/instructor", "/admin", "/play"];
const PUBLIC_ROUTES = ["/login", "/register", "/api/auth", "/api/xapi"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── xAPI CORS handling ──
  if (pathname.startsWith("/api/xapi")) {
    const origin = request.headers.get("origin");
    const corsHeaders = buildCorsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    // Alternate request syntax
    const methodOverride = request.nextUrl.searchParams.get("method");
    if (request.method === "POST" && methodOverride) {
      const override = methodOverride.toUpperCase();
      if (["PUT", "GET", "DELETE"].includes(override)) {
        const url = request.nextUrl.clone();
        url.searchParams.delete("method");
        const headers = new Headers(request.headers);
        headers.set("X-HTTP-Method-Override", override);
        const response = NextResponse.rewrite(url, { request: { headers } });
        for (const [key, value] of Object.entries(corsHeaders)) {
          response.headers.set(key, value);
        }
        return response;
      }
    }

    const response = NextResponse.next();
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // ── Auth protection ──
  // Skip public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Skip API routes (they handle their own auth)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = request.cookies.get("lms_session");
  if (!sessionCookie?.value) {
    // Redirect to login with return URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session exists — allow through (actual session validation happens in the page/API)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/xapi/:path*",
    "/learn/:path*",
    "/instructor/:path*",
    "/admin/:path*",
    "/play/:path*",
  ],
};
