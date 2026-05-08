import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-slate-900 text-white hover:bg-slate-900/90",
          variant === "secondary" && "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
          variant === "outline" && "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900",
          variant === "ghost" && "hover:bg-slate-100 text-slate-900",
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-9 px-3 text-xs rounded-md",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
