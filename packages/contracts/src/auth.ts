import { z } from "zod";

export const registerSchema = z.object({
  tenantName: z.string().trim().min(2, "Enter the pharmacy name"),
  name: z.string().trim().min(2, "Enter your name"),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const googleLoginSchema = z.object({ idToken: z.string().min(10) });
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string(),
  name: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: sessionUserSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
