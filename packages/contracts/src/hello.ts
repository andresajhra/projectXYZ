import { z } from "zod";

export const helloResponseSchema = z.object({
  message: z.string(),
  service: z.string(),
  time: z.string(),
  database: z.enum(["up", "down"]),
});
export type HelloResponse = z.infer<typeof helloResponseSchema>;
