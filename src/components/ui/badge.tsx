import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "info" | "violet" | "rose";

const variantClass: Record<BadgeVariant, string> = {
  default: "border-transparent bg-slate-900 text-slate-50",
  secondary: "border-transparent bg-slate-100 text-slate-900",
  outline: "border-slate-300 text-slate-950 bg-transparent dark:border-slate-700 dark:text-slate-50",
  success: "border-transparent bg-emerald-500/15 text-emerald-950 ring-1 ring-emerald-500/25",
  warning: "border-transparent bg-amber-500/15 text-amber-950 ring-1 ring-amber-500/25",
  info: "border-transparent bg-sky-500/15 text-sky-950 ring-1 ring-sky-500/25",
  violet: "border-transparent bg-violet-500/15 text-violet-950 ring-1 ring-violet-500/28",
  rose: "border-transparent bg-rose-500/12 text-rose-950 ring-1 ring-rose-400/25",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
