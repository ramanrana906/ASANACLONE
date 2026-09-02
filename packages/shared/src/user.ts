import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "member", "guest"]);

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema,
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
