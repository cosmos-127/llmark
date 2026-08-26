import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center cursor-pointer",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[#2C2C2C]/10 dark:bg-[#F3F4F4]/15 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
      <SliderPrimitive.Range className="absolute h-full bg-[#853953] dark:bg-[#A74B6A]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-[#853953] dark:border-[#A74B6A] bg-white dark:bg-[#F3F4F4] shadow-sm ring-offset-background transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#853953] dark:focus-visible:ring-[#A74B6A] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
