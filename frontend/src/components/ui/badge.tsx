import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-sans font-medium tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border border-[var(--brand-primary-border)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)]",
        secondary:
          "border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]",
        destructive:
          "border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300",
        outline:
          "border border-[var(--border-medium)] text-[var(--text-main)] bg-[var(--bg-card)]",
        emerald:
          "border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300",
        sky:
          "border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300",
        violet:
          "border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300",
        amber:
          "border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300",
        purple:
          "border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300",
        gray:
          "border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]",
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
