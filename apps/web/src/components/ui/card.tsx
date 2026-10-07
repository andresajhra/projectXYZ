import * as React from "react";
import { cn } from "@/lib/utils";

const make = (base: string, name: string) => {
  const C = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...p }, ref) => (
    <div ref={ref} className={cn(base, className)} {...p} />
  ));
  C.displayName = name;
  return C;
};

export const Card = make("rounded-xl border bg-card text-card-foreground shadow-sm", "Card");
export const CardHeader = make("flex flex-col gap-1.5 p-6", "CardHeader");
export const CardTitle = make("font-semibold leading-none tracking-tight", "CardTitle");
export const CardDescription = make("text-sm text-muted-foreground", "CardDescription");
export const CardContent = make("p-6 pt-0", "CardContent");
