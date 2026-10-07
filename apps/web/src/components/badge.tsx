import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Badge = ({ ok, children }: { ok: boolean; children: ReactNode }) => (
  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}>
    {children}
  </span>
);
