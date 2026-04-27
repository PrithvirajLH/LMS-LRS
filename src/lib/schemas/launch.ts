/**
 * Course launch / enrollment / purge schemas.
 */
import { z } from "zod";

export const LaunchQuerySchema = z.object({
  courseId: z.string().min(1),
});
export type LaunchQueryInput = z.infer<typeof LaunchQuerySchema>;

export const EnrollSchema = z.object({
  courseId: z.string().min(1),
});
export type EnrollInput = z.infer<typeof EnrollSchema>;

export const PurgeTargetEnum = z.enum(["statements", "documents", "all"]);

export const PurgeSchema = z.object({
  target: PurgeTargetEnum.optional(),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "Must include { confirm: true } to purge data" }),
  }),
});
export type PurgeInput = z.infer<typeof PurgeSchema>;
