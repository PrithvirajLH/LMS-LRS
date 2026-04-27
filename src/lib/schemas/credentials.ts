/**
 * xAPI credential management schemas.
 */
import { z } from "zod";

export const CreateCredentialSchema = z.object({
  displayName: z.string().min(1).optional(),
  scopes: z.string().optional(),
  homePage: z.string().url().optional(),
  rateLimitPerMinute: z.number().int().min(1).max(10000).optional(),
});
export type CreateCredentialInput = z.infer<typeof CreateCredentialSchema>;

export const ToggleCredentialSchema = z.object({
  apiKey: z.string().min(1),
  isActive: z.boolean(),
});
export type ToggleCredentialInput = z.infer<typeof ToggleCredentialSchema>;
