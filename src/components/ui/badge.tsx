import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]",
        primary:
          "bg-[var(--color-accent-light)] text-[var(--color-purple-400)] border border-[var(--color-purple-500)]/20",
        purple:
          "bg-[var(--color-purple-500)]/15 text-[var(--color-purple-400)] border border-[var(--color-purple-500)]/20",
        blue:
          "bg-[var(--color-blue-500)]/15 text-[var(--color-blue-400)] border border-[var(--color-blue-500)]/20",
        gold:
          "bg-[var(--color-gold-light)] text-[var(--color-gold)] border border-[var(--color-gold)]/20",
        success:
          "bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/20",
        warning:
          "bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/20",
        error:
          "bg-[var(--color-error)]/15 text-[var(--color-error)] border border-[var(--color-error)]/20",
        outline:
          "bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border-strong)]",
        "gold-solid":
          "bg-gradient-to-r from-[var(--color-gold)] to-[#f59e0b] text-black font-semibold border-0",
        "purple-solid":
          "bg-gradient-to-r from-[var(--color-purple-500)] to-[var(--color-blue-500)] text-white font-semibold border-0",
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