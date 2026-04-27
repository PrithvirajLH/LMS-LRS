/**
 * Zod runtime validation schemas for the LMS-LRS API.
 *
 * Re-exports every schema and a small set of helpers used by route handlers.
 * Routes typically call `Schema.safeParse(data)` and inspect `result.success`
 * directly, but `safeParseOrThrow` is provided for callers that prefer to
 * propagate errors via exceptions (e.g. service-layer code).
 */
import type { ZodIssue, ZodType } from "zod";

export class ValidationError extends Error {
  constructor(
    public issues: ZodIssue[],
    message = "Validation failed"
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Parse `data` against `schema`, returning the typed result. On failure,
 * throws a `ValidationError` carrying the original Zod issues.
 */
export function safeParseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }
  return result.data;
}

export * from "./auth";
export * from "./users";
export * from "./courses";
export * from "./enrollments";
export * from "./credentials";
export * from "./launch";
export * from "./audit";
