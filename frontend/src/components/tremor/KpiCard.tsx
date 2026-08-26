import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  tooltip?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "emerald" | "sky" | "violet";
  icon?: LucideIcon;
  delta?: {
    value: string;
    isIncrease: boolean;
    isGood: boolean;
  };
  accentColor?: "amber" | "emerald" | "sky" | "violet" | "rose" | "zinc" | "mulberry" | "deepplum" | "charcoal";
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  tooltip,
  badge,
  badgeVariant = "default",
  icon: Icon,
  delta,
  accentColor = "mulberry",
  className,
}) => {
  const accentColorMap = {
    mulberry: {
      text: "text-[#853953] dark:text-[#A74B6A]",
      bg: "bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35",
      border: "hover:border-[#853953] dark:hover:border-[#A74B6A]",
      ring: "hover:shadow-[#853953]/5",
    },
    amber: {
      text: "text-[#853953] dark:text-[#A74B6A]",
      bg: "bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35",
      border: "hover:border-[#853953] dark:hover:border-[#A74B6A]",
      ring: "hover:shadow-[#853953]/5",
    },
    deepplum: {
      text: "text-[#612D53] dark:text-[#C57BB2]",
      bg: "bg-[#612D53]/10 dark:bg-[#7E3B6C]/15 text-[#612D53] dark:text-[#C57BB2] border border-[#612D53]/25 dark:border-[#7E3B6C]/35",
      border: "hover:border-[#612D53] dark:hover:border-[#7E3B6C]",
      ring: "hover:shadow-[#612D53]/5",
    },
    violet: {
      text: "text-[#612D53] dark:text-[#C57BB2]",
      bg: "bg-[#612D53]/10 dark:bg-[#7E3B6C]/15 text-[#612D53] dark:text-[#C57BB2] border border-[#612D53]/25 dark:border-[#7E3B6C]/35",
      border: "hover:border-[#612D53] dark:hover:border-[#7E3B6C]",
      ring: "hover:shadow-[#612D53]/5",
    },
    sky: {
      text: "text-[#612D53] dark:text-[#C57BB2]",
      bg: "bg-[#612D53]/10 dark:bg-[#7E3B6C]/15 text-[#612D53] dark:text-[#C57BB2] border border-[#612D53]/25 dark:border-[#7E3B6C]/35",
      border: "hover:border-[#612D53] dark:hover:border-[#7E3B6C]",
      ring: "hover:shadow-[#612D53]/5",
    },
    charcoal: {
      text: "text-[#2C2C2C] dark:text-[#F3F4F4]",
      bg: "bg-[#2C2C2C]/10 dark:bg-[#F3F4F4]/10 text-[#2C2C2C] dark:text-[#F3F4F4] border border-[#2C2C2C]/20 dark:border-[#F3F4F4]/20",
      border: "hover:border-[#2C2C2C] dark:hover:border-[#F3F4F4]/40",
      ring: "hover:shadow-[#2C2C2C]/5",
    },
    zinc: {
      text: "text-[#2C2C2C] dark:text-[#F3F4F4]",
      bg: "bg-[#2C2C2C]/10 dark:bg-[#F3F4F4]/10 text-[#2C2C2C] dark:text-[#F3F4F4] border border-[#2C2C2C]/20 dark:border-[#F3F4F4]/20",
      border: "hover:border-[#2C2C2C] dark:hover:border-[#F3F4F4]/40",
      ring: "hover:shadow-[#2C2C2C]/5",
    },
    emerald: {
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      border: "hover:border-emerald-400 dark:hover:border-emerald-600",
      ring: "hover:shadow-emerald-500/5",
    },
    rose: {
      text: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
      border: "hover:border-rose-300 dark:hover:border-rose-700",
      ring: "hover:shadow-rose-500/5",
    },
  };

  const currentTheme = accentColorMap[accentColor] || accentColorMap.mulberry;

  const cardContent = (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.12 } }}
      className="h-full"
    >
      <Card
        className={cn(
          "group h-full flex flex-col justify-between transition-all duration-200 cursor-pointer bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-xs hover:shadow-md",
          currentTheme.border,
          className
        )}
      >
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 tracking-normal font-sans">{title}</span>
              {badge && (
                <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0 font-medium">
                  {badge}
                </Badge>
              )}
            </div>
            {Icon && (
              <div className={`p-1.5 rounded-lg ${currentTheme.bg}`}>
                <Icon className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="my-2.5 flex items-baseline justify-between">
            <span className={cn("text-2xl sm:text-3xl font-extrabold font-mono tracking-normal", currentTheme.text)}>
              {value}
            </span>
            {delta && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-mono font-medium px-1.5 py-0.5 rounded",
                  delta.isGood
                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
                    : "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800"
                )}
              >
                {delta.isIncrease ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {delta.value}
              </span>
            )}
          </div>

          {subtext && (
            <div className="text-xs font-sans text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 truncate flex items-center justify-between pt-2 border-t border-[#F3F4F4] dark:border-[#F3F4F4]/10">
              <span>{subtext}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-full">{cardContent}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
};
