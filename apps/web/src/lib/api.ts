import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().logout();
      toast.error("Your session expired. Sign in again.");
    }
    return Promise.reject(error);
  },
);

/** Extracts a human-readable message from an API error. */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Cannot reach the server. Check your connection.";
    const m = error.response.data?.message;
    return Array.isArray(m) ? m.join(", ") : (m ?? fallback);
  }
  return fallback;
}
