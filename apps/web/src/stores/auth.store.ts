import type { SessionUser } from "@pharma/contracts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  setSession: (token: string, user: SessionUser) => void;
  logout: () => void;
  can: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      can: (permission) => !!get().user?.permissions.includes(permission),
    }),
    { name: "pharma-auth", partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
);
