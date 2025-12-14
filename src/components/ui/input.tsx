import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full px-4 py-3 rounded-xl",
          "bg-[var(--surface2)] border-2 border-[var(--border)]",
          "text-[var(--text)] placeholder:text-[var(--muted)]",
          "focus:outline-none focus:border-[var(--gold)] focus:bg-[var(--surface)]",
          "focus:ring-2 focus:ring-[var(--gold)]/20",
          "transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
