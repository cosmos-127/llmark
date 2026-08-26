import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-sans font-medium tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border border-[#853953]/30 dark:border-[#A74B6A]/40 bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A]",
        secondary:
          "border border-[#2C2C2C]/20 dark:border-[#F3F4F4]/20 bg-[#2C2C2C]/5 dark:bg-[#F3F4F4]/10 text-[#2C2C2C] dark:text-[#F3F4F4]",
        destructive:
          "border border-rose-300/60 dark:border-rose-700/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300",
        outline:
          "border border-[#2C2C2C]/30 dark:border-[#F3F4F4]/30 text-[#2C2C2C] dark:text-[#F3F4F4] bg-white dark:bg-[#2C2C2C]",
        emerald:
          "border border-emerald-300/60 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300",
        sky:
          "border border-sky-300/60 dark:border-sky-700/60 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300",
        violet:
          "border border-[#612D53]/30 dark:border-[#7E3B6C]/40 bg-[#612D53]/10 dark:bg-[#7E3B6C]/15 text-[#612D53] dark:text-[#C57BB2]",
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
