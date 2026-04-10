import { NextRequest } from "next/server";

/**
 * Get the effective HTTP method, considering xAPI alternate request syntax.
 * When a POST arrives with X-HTTP-Method-Override header (set by middleware
 * from ?method= query param), use the override method instead.
 */
export function getEffectiveMethod(request: NextRequest): string {
  const override = request.headers.get("X-HTTP-Method-Override");
  if (request.method === "POST" && override) {
    return override.toUpperCase();
  }
  return request.method;
}
