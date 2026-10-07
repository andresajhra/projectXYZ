import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGINS: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  MAIL_FROM: z.string().default("Pharma ERP <onboarding@resend.dev>"),
  BANK_API_URL: z.string().optional().default(""),
  BANK_PRIVATE_KEY_PEM_PATH: z.string().optional().default(""),
});

export type Env = z.infer<typeof schema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${JSON.stringify(z.treeifyError(parsed.error))}`);
  }
  return parsed.data;
}
