import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#16161D] text-[#FAFAFA] border border-[#26262E]",
        primary: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
        warning: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
        success: "bg-green-500/20 text-green-400 border border-green-500/30",
        error: "bg-red-500/20 text-red-400 border border-red-500/30",
        outline: "bg-transparent text-[#A0A0AA] border border-[#3A3A45]",
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
