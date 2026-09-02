import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none font-sans",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white shadow-xs border border-[var(--brand-primary-border)] active:scale-[0.98]",
        destructive:
          "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs active:scale-[0.98]",
        outline:
          "border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] shadow-2xs active:scale-[0.98]",
        secondary:
          "bg-[var(--bg-surface-subtle)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] border border-[var(--border-subtle)] shadow-2xs active:scale-[0.98]",
        ghost:
          "text-[var(--text-main)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)] active:scale-[0.98]",
        link: "text-[var(--brand-primary)] underline-offset-4 hover:underline",
        amberGlow:
          "btn-brand-glow text-white font-semibold shadow-md border border-[var(--brand-primary-border)] active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2 text-xs",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-2xl px-6 text-sm font-semibold",
        icon: "h-8 w-8 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
