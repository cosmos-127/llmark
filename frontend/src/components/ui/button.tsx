import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#853953] dark:focus-visible:ring-[#E05284] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none font-sans",
  {
    variants: {
      variant: {
        default:
          "bg-[#853953] hover:bg-[#612D53] dark:bg-[#D84577] dark:hover:bg-[#E05284] text-white shadow-xs border border-[#853953]/30 dark:border-[#E05284]/40 active:scale-[0.98]",
        destructive:
          "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs active:scale-[0.98]",
        outline:
          "border border-[#2C2C2C]/20 dark:border-white/10 bg-white hover:bg-[#F3F4F4] dark:bg-[#0F0F13] dark:hover:bg-[#1A1A24] text-[#2C2C2C] dark:text-white shadow-2xs active:scale-[0.98]",
        secondary:
          "bg-[#F3F4F4] hover:bg-[#E5E7E7] dark:bg-[#0B0B0E] dark:hover:bg-[#1A1A24] text-[#2C2C2C] dark:text-slate-200 border border-[#2C2C2C]/10 dark:border-white/10 shadow-2xs active:scale-[0.98]",
        ghost:
          "text-[#2C2C2C] dark:text-slate-200 hover:bg-[#853953]/10 hover:text-[#853953] dark:hover:bg-[#E05284]/15 dark:hover:text-[#F06A9A] active:scale-[0.98]",
        link: "text-[#853953] dark:text-[#F06A9A] underline-offset-4 hover:underline",
        amberGlow:
          "bg-gradient-to-r from-[#853953] to-[#612D53] hover:from-[#994361] hover:to-[#743663] dark:from-[#D84577] dark:to-[#9E3577] dark:hover:from-[#E05284] dark:hover:to-[#B33E87] text-white font-semibold shadow-md shadow-[#853953]/25 dark:shadow-[#D84577]/30 border border-[#853953]/30 dark:border-[#E05284]/40 active:scale-[0.98]",
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
