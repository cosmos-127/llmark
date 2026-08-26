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
          "flex h-10 w-full rounded-xl border border-[#2C2C2C]/20 dark:border-[#F3F4F4]/20 bg-white dark:bg-[#2C2C2C] px-3.5 py-2 text-sm font-mono text-[#2C2C2C] dark:text-[#F3F4F4] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#2C2C2C]/40 dark:placeholder:text-[#F3F4F4]/40 focus-visible:outline-none focus-visible:border-[#853953] dark:focus-visible:border-[#A74B6A] focus-visible:ring-2 focus-visible:ring-[#853953]/20 dark:focus-visible:ring-[#A74B6A]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 shadow-xs",
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
