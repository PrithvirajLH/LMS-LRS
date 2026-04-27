/**
 * Admin user-management request schemas.
 */
import { z } from "zod";
import { passwordComplexity } from "./auth";

export const UserStatusEnum = z.enum(["active", "pending", "inactive"]);
export const UserRoleEnum = z.enum(["learner", "instructor", "admin"]);

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  employeeId: z.string().min(1),
  facility: z.string().min(1),
  department: z.string().optional(),
  position: z.string().optional(),
  status: UserStatusEnum.optional(),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: UserRoleEnum.optional(),
  status: UserStatusEnum.optional(),
});
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

export const AdminResetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: passwordComplexity,
});
export type AdminResetPasswordInput = z.infer<typeof AdminResetPasswordSchema>;
