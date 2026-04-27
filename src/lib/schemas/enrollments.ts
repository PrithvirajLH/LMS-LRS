/**
 * Enrollment request schemas.
 *
 * `assignedDate` and `dueDate` are stored as ISO date strings (YYYY-MM-DD),
 * while `completedDate` is a full ISO datetime — matches what the storage
 * layer writes today.
 */
import { z } from "zod";

// Zod 3-compatible ISO date / datetime validators
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");
const isoDateTime = z.string().datetime();

export const CreateEnrollmentSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  courseTitle: z.string().optional(),
  assignedDate: isoDate.optional(),
  dueDate: isoDate.optional(),
});
export type CreateEnrollmentInput = z.infer<typeof CreateEnrollmentSchema>;

export const BulkEnrollSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, "At least one userId is required"),
  courseId: z.string().min(1),
  courseTitle: z.string().optional(),
  assignedDate: isoDate.optional(),
  dueDate: isoDate.optional(),
});
export type BulkEnrollInput = z.infer<typeof BulkEnrollSchema>;

/**
 * Accept either a single enrollment payload or a bulk one — the route
 * dispatches based on the presence of `userIds`.
 */
export const EnrollmentPostSchema = z.union([
  BulkEnrollSchema,
  CreateEnrollmentSchema,
]);
export type EnrollmentPostInput = z.infer<typeof EnrollmentPostSchema>;

export const CompleteEnrollmentSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  completedDate: isoDateTime.optional(),
  score: z.number().min(0).max(100).optional(),
  timeSpent: z.number().int().min(0).optional(),
});
export type CompleteEnrollmentInput = z.infer<typeof CompleteEnrollmentSchema>;

export const RenewSchema = z.object({
  courseId: z.string().min(1),
});
export type RenewInput = z.infer<typeof RenewSchema>;
