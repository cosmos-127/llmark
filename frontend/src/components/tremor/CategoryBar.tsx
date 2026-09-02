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
  colors = ["bg-[#2563EB] dark:bg-[#3B82F6]", "bg-[#1D4ED8] dark:bg-[#0284C7]", "bg-[#0F172A] dark:bg-[#F1F5F9]/80", "bg-[#1D4ED8] dark:bg-[#60A5FA]", "bg-emerald-600 dark:bg-emerald-500"],
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
      color: colors[i % colors.length] || "bg-[#2563EB]",
    }));

  const total = barItems.reduce((acc, curr) => acc + (curr.value || 0), 0) || 1;

  return (
    <TooltipProvider>
      <div className={cn("w-full space-y-2", className)}>
        {/* Segmented bar */}
        <div className="h-3.5 w-full rounded-xl bg-[#F1F5F9] dark:bg-[#0F172A] flex overflow-hidden border border-[#0F172A]/10 dark:border-white/10 shadow-inner p-0.5 gap-0.5">
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
              <div key={item.key || idx} className="flex items-center gap-1.5 text-[#0F172A]/70 dark:text-slate-300">
                <span className={cn("h-2 w-2 rounded-full shrink-0", item.color)} />
                <span className="truncate">{item.name}</span>
                <span className="text-[#0F172A] dark:text-white font-medium font-sans tabular-nums">({((item.value / total) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
