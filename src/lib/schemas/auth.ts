/**
 * Auth-related request schemas.
 *
 * Shared password complexity is centralised in `passwordComplexity` so the
 * register and reset endpoints stay in lock-step.
 */
import { z } from "zod";

/**
 * Password rule: at least 12 characters, with at least one uppercase letter,
 * one lowercase letter, and one digit. Mirrors the runtime check in
 * `validatePassword` (src/lib/auth/session.ts) so callers receive consistent
 * errors whether validation happens at the schema layer or the storage layer.
 */
export const passwordComplexity = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const LoginSchema = z.object({
  identifier: z.string().min(1, "Email or Employee ID is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  employeeId: z.string().min(1),
  password: passwordComplexity,
  facility: z.string().min(1),
  department: z.string().optional(),
  position: z.string().optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(32, "Invalid reset token"),
  password: passwordComplexity,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
