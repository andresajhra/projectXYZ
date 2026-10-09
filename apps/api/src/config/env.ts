import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGINS: z.string().default("http://localhost:5173"),
});

export type Env = z.infer<typeof schema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${JSON.stringify(z.treeifyError(parsed.error))}`);
  }
  return parsed.data;
}
