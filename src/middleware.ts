import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, X-Experience-API-Version, If-Match, If-None-Match, Accept-Language",
  "Access-Control-Expose-Headers":
    "ETag, Last-Modified, X-Experience-API-Version, X-Experience-API-Consistent-Through",
  "Access-Control-Max-Age": "86400",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to xAPI routes
  if (!pathname.startsWith("/api/xapi")) {
    return NextResponse.next();
  }

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // ── Alternate request syntax (xAPI spec requirement) ──
  // Storyline and other xAPI clients use POST with ?method=PUT or ?method=DELETE
  // for cross-domain requests that can't use PUT/DELETE directly.
  // We rewrite the request to the target method.
  const methodOverride = request.nextUrl.searchParams.get("method");
  if (request.method === "POST" && methodOverride) {
    const override = methodOverride.toUpperCase();
    if (["PUT", "GET", "DELETE"].includes(override)) {
      // Remove the method param from the URL
      const url = request.nextUrl.clone();
      url.searchParams.delete("method");

      // For GET via alternate syntax, the "body" is sent as form content param
      // We need to rewrite the URL and forward
      const headers = new Headers(request.headers);
      headers.set("X-HTTP-Method-Override", override);

      // Rewrite the request
      const response = NextResponse.rewrite(url, {
        request: { headers },
      });

      // Add CORS headers
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        response.headers.set(key, value);
      }

      return response;
    }
  }

  // Add CORS headers to all xAPI responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: "/api/xapi/:path*",
};
