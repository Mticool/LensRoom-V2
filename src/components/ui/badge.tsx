import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]",
        primary: "bg-[var(--color-purple-500)]/20 text-[var(--color-purple-400)] border border-[var(--color-purple-500)]/30",
        warning: "bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30",
        success: "bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30",
        error: "bg-[var(--color-error)]/20 text-[var(--color-error)] border border-[var(--color-error)]/30",
        outline: "bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border-strong)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
