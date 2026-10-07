import { authResponseSchema, type GoogleLoginInput, type LoginInput, type RegisterInput } from "@pharma/contracts";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

function useSessionMutation<T>(path: string) {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: T) => authResponseSchema.parse((await api.post(path, input)).data),
    onSuccess: (data) => setSession(data.accessToken, data.user),
  });
}

export const useLogin = () => useSessionMutation<LoginInput>("/auth/login");
export const useRegister = () => useSessionMutation<RegisterInput>("/auth/register");
export const useGoogleLogin = () => useSessionMutation<GoogleLoginInput>("/auth/google");
