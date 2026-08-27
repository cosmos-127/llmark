import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[#2C2C2C]/20 dark:border-white/10 bg-white dark:bg-[#0B0B0E] px-3.5 py-2 text-sm font-sans text-[#2C2C2C] dark:text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#2C2C2C]/40 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-[#853953] dark:focus-visible:border-[#E05284] focus-visible:ring-2 focus-visible:ring-[#853953]/20 dark:focus-visible:ring-[#E05284]/25 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 shadow-xs",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
