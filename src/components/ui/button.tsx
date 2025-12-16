import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--radius)] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        // Primary - White on black
        default: "bg-white text-black hover:bg-white/90 shadow-[var(--shadow-sm)]",
        // Secondary - surface with border
        secondary: "bg-[var(--surface2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)] hover:border-white/20",
        // Outline - minimal border
        outline: "border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface2)] hover:border-white/20",
        // Ghost - no background
        ghost: "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]",
        // Destructive
        destructive: "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
        // Link
        link: "text-[var(--text)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
