import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
  timeout: 15_000,
});

/** Extracts a human-readable message from an API error. */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Cannot reach the server. Check your connection.";
    const m = error.response.data?.message;
    return Array.isArray(m) ? m.join(", ") : (m ?? fallback);
  }
  return fallback;
}

