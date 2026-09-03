import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "member", "guest"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema,
  emailVerified: z.boolean(),
  photoUrl: z.string().url().nullable(),
  pronouns: z.string().nullable(),
  jobTitle: z.string().nullable(),
  department: z.string().nullable(),
  aboutMe: z.string().nullable(),
  outOfOfficeMessage: z.string().nullable(),
  outOfOfficeUntil: z.string().nullable(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  photoUrl: z.string().url().nullable().optional(),
  pronouns: z.string().max(100).nullable().optional(),
  jobTitle: z.string().max(100).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  aboutMe: z.string().max(2000).nullable().optional(),
  outOfOfficeMessage: z.string().max(500).nullable().optional(),
  outOfOfficeUntil: z.string().nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const userEmailSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  isPreferred: z.boolean(),
  createdAt: z.string(),
});
export type UserEmail = z.infer<typeof userEmailSchema>;

export const addEmailSchema = z.object({
  email: z.string().email(),
});
export type AddEmailInput = z.infer<typeof addEmailSchema>;
