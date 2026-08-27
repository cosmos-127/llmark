import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-sans font-medium tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border border-[#853953]/30 dark:border-[#E05284]/40 bg-[#853953]/10 dark:bg-[#E05284]/15 text-[#853953] dark:text-[#F06A9A]",
        secondary:
          "border border-[#2C2C2C]/20 dark:border-white/10 bg-[#2C2C2C]/5 dark:bg-white/[0.06] text-[#2C2C2C] dark:text-slate-200",
        destructive:
          "border border-rose-300/60 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300",
        outline:
          "border border-[#2C2C2C]/30 dark:border-white/15 text-[#2C2C2C] dark:text-white bg-white dark:bg-[#0B0B0E]",
        emerald:
          "border border-emerald-300/60 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300",
        sky:
          "border border-sky-300/60 dark:border-sky-800/80 bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300",
        violet:
          "border border-[#612D53]/30 dark:border-[#C14594]/40 bg-[#612D53]/10 dark:bg-[#C14594]/15 text-[#612D53] dark:text-[#E270BB]",
        amber:
          "border border-amber-300/60 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300",
        purple:
          "border border-purple-300/60 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300",
        gray:
          "border border-slate-300/60 dark:border-white/10 bg-slate-100 dark:bg-[#0B0B0E] text-slate-700 dark:text-slate-300",
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
