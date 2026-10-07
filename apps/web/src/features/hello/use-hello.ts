import { helloResponseSchema } from "@pharma/contracts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useHello = () =>
  useQuery({
    queryKey: ["hello"],
    queryFn: async () => helloResponseSchema.parse((await api.get("/hello")).data),
  });
