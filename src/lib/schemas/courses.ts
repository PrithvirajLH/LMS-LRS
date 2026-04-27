/**
 * Course CRUD request schemas.
 */
import { z } from "zod";

export const CourseStatusEnum = z.enum(["draft", "published", "archived"]);

export const SaveCourseSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().optional(),
  activityId: z.string().min(1),
  launchFile: z.string().optional(),
  blobBasePath: z.string().min(1),
  credits: z.number().int().min(0).max(1000).optional(),
  duration: z.string().optional(),
  accreditation: z.string().optional(),
  moduleCount: z.number().int().min(0).optional(),
  interactionCount: z.number().int().min(0).optional(),
  totalActivities: z.number().int().min(0).optional(),
  color: z.string().optional(),
});
export type SaveCourseInput = z.infer<typeof SaveCourseSchema>;

/**
 * Update is `SaveCourseSchema.partial()` plus a few completion-policy fields
 * that aren't relevant at create time. `null` is a sentinel meaning "clear this
 * override and fall back to the org default" — see PATCH /api/admin/courses
 * for the legacy semantics this preserves.
 */
export const UpdateCourseSchema = SaveCourseSchema.partial().extend({
  status: CourseStatusEnum.optional(),
  hasAssessment: z.boolean().nullable().optional(),
  passingScore: z.number().min(0).max(1).nullable().optional(),
  validityPeriodMonths: z
    .number()
    .int()
    .min(0)
    .max(120)
    .nullable()
    .optional(),
  publishedAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;

export const DeleteCourseQuerySchema = z.object({
  courseId: z.string().min(1),
});
export type DeleteCourseQueryInput = z.infer<typeof DeleteCourseQuerySchema>;
