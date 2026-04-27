/**
 * Audit log query schema.
 *
 * Numeric query-string fields are coerced because URLSearchParams always
 * yields strings — the route used to do this manually with `parseInt`.
 */
import { z } from "zod";

export const AuditQuerySchema = z.object({
  action: z.string().optional(),
  actorId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  months: z.coerce.number().int().min(1).max(12).optional(),
});
export type AuditQueryInput = z.infer<typeof AuditQuerySchema>;
