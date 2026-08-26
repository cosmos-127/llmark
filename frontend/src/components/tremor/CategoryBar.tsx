import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface CategoryBarItem {
  key: string;
  name: string;
  value: number;
  color: string;
  subtext?: string;
}

export interface CategoryBarProps {
  values: number[];
  colors?: string[];
  labels?: string[];
  items?: CategoryBarItem[];
  showLabels?: boolean;
  className?: string;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  values = [],
  colors = ["bg-[#853953] dark:bg-[#A74B6A]", "bg-[#612D53] dark:bg-[#7E3B6C]", "bg-[#2C2C2C] dark:bg-[#F3F4F4]/80", "bg-[#994361] dark:bg-[#B85879]", "bg-emerald-600 dark:bg-emerald-500"],
  labels = [],
  items,
  showLabels = true,
  className,
}) => {
  const barItems: CategoryBarItem[] =
    items ||
    values.map((v, i) => ({
      key: `bar-${i}`,
      name: labels[i] || `Segment ${i + 1}`,
      value: v,
      color: colors[i % colors.length] || "bg-[#853953]",
    }));

  const total = barItems.reduce((acc, curr) => acc + (curr.value || 0), 0) || 1;

  return (
    <TooltipProvider>
      <div className={cn("w-full space-y-2", className)}>
        {/* Segmented bar */}
        <div className="h-3.5 w-full rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] flex overflow-hidden border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-inner p-0.5 gap-0.5">
          {barItems.map((item, idx) => {
            const pct = Math.max(3, (item.value / total) * 100);
            return (
              <Tooltip key={item.key || idx}>
                <TooltipTrigger asChild>
                  <div
                    style={{ width: `${pct}%` }}
                    className={cn(
                      "h-full transition-all cursor-pointer hover:brightness-110",
                      idx === 0 && "rounded-l-lg",
                      idx === barItems.length - 1 && "rounded-r-lg",
                      item.color
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-sans font-medium text-xs">
                    {item.name}: <strong className="tabular-nums">{item.value.toFixed(1)}</strong> (<span className="tabular-nums">{((item.value / total) * 100).toFixed(1)}%</span>)
                  </p>
                  {item.subtext && <p className="text-[11px] font-sans text-slate-300">{item.subtext}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Legend */}
        {showLabels && (
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-sans">
            {barItems.map((item, idx) => (
              <div key={item.key || idx} className="flex items-center gap-1.5 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                <span className={cn("h-2 w-2 rounded-full shrink-0", item.color)} />
                <span className="truncate">{item.name}</span>
                <span className="text-[#2C2C2C] dark:text-[#F3F4F4] font-medium font-sans tabular-nums">({((item.value / total) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
