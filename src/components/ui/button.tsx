import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--radius)] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/30 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        // Primary - uses theme variables
        default: "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 shadow-[var(--shadow-sm)]",
        // Secondary - surface with border
        secondary: "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] border border-[var(--border)] hover:bg-[var(--surface3)] hover:border-[var(--border-strong)]",
        // Outline - minimal border
        outline: "border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface2)] hover:border-[var(--border-strong)]",
        // Ghost - no background
        ghost: "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]",
        // Destructive
        destructive: "bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/20",
        // Link
        link: "text-[var(--gold)] underline-offset-4 hover:underline",
        // Brand - cyan accent
        brand: "bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)] shadow-[var(--shadow-sm)]",
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
