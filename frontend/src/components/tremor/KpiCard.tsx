import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Icons } from "@/components/common/HugeIcons";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  tooltip?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "emerald" | "sky" | "violet";
  icon?: React.ComponentType<{ className?: string }>;
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
  unit,
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
      text: "text-[var(--brand-primary)]",
      bg: "bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)]",
      border: "hover:border-[var(--brand-primary)]",
      ring: "hover:shadow-[var(--brand-primary-light)]",
    },
    amber: {
      text: "text-[var(--brand-primary)]",
      bg: "bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)]",
      border: "hover:border-[var(--brand-primary)]",
      ring: "hover:shadow-[var(--brand-primary-light)]",
    },
    deepplum: {
      text: "text-[var(--brand-secondary)]",
      bg: "bg-[var(--brand-secondary-light)] text-[var(--brand-secondary)] border border-[var(--brand-secondary-border)]",
      border: "hover:border-[var(--brand-secondary)] dark:hover:border-[var(--brand-secondary)]",
      ring: "hover:shadow-[var(--brand-secondary-light)]",
    },
    violet: {
      text: "text-[var(--brand-secondary)]",
      bg: "bg-[var(--brand-secondary-light)] text-[var(--brand-secondary)] border border-[var(--brand-secondary-border)]",
      border: "hover:border-[var(--brand-secondary)] dark:hover:border-[var(--brand-secondary)]",
      ring: "hover:shadow-[var(--brand-secondary-light)]",
    },
    sky: {
      text: "text-[var(--brand-secondary)]",
      bg: "bg-[var(--brand-secondary-light)] dark:bg-sky-950/50 text-[var(--brand-secondary)] dark:text-sky-300 border border-[var(--brand-secondary-border)] dark:border-sky-800/80",
      border: "hover:border-[var(--brand-secondary)] dark:hover:border-sky-600",
      ring: "hover:shadow-[var(--brand-secondary-light)] dark:hover:shadow-sky-500/10",
    },
    charcoal: {
      text: "text-[var(--text-main)]",
      bg: "bg-[var(--border-subtle)] dark:bg-white/[0.06] text-[var(--text-main)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]",
      border: "hover:border-[var(--border-strong)]",
      ring: "hover:shadow-xs",
    },
    zinc: {
      text: "text-[var(--text-main)]",
      bg: "bg-[var(--border-subtle)] dark:bg-white/[0.06] text-[var(--text-main)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]",
      border: "hover:border-[var(--border-strong)]",
      ring: "hover:shadow-xs",
    },
    emerald: {
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80",
      border: "hover:border-emerald-400 dark:hover:border-emerald-600",
      ring: "hover:shadow-emerald-500/5",
    },
    rose: {
      text: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80",
      border: "hover:border-rose-300 dark:hover:border-rose-700",
      ring: "hover:shadow-rose-500/5",
    },
  };

  const currentTheme = accentColorMap[accentColor] || accentColorMap.mulberry;

  const renderValue = () => {
    if (typeof value === "number") {
      return (
        <div className="flex items-baseline gap-1 font-sans tabular-nums">
          <span className={cn("text-2xl sm:text-3xl font-bold tracking-tight", currentTheme.text)}>
            {value}
          </span>
          {unit && (
            <span className="text-xs sm:text-sm font-medium text-[var(--text-subtle)]">
              {unit}
            </span>
          )}
        </div>
      );
    }

    const strValue = String(value);
    const match = strValue.match(/^(\$)?([\d,]+(?:\.\d+)?|\—)\s*(.*)$/);
    if (match) {
      const [, prefix, num, matchedUnit] = match;
      const finalUnit = unit || matchedUnit;
      return (
        <div className="flex items-baseline gap-0.5 font-sans tabular-nums">
          {prefix && (
            <span className={cn("text-lg sm:text-xl font-semibold opacity-70", currentTheme.text)}>
              {prefix}
            </span>
          )}
          <span className={cn("text-2xl sm:text-3xl font-bold tracking-tight", currentTheme.text)}>
            {num}
          </span>
          {finalUnit && (
            <span className="text-xs sm:text-sm font-medium text-[var(--text-subtle)] ml-1">
              {finalUnit}
            </span>
          )}
        </div>
      );
    }

    return (
      <span className={cn("text-2xl sm:text-3xl font-bold font-sans tracking-tight tabular-nums", currentTheme.text)}>
        {strValue}
      </span>
    );
  };

  const cardContent = (
    <Card
      className={cn(
        "group h-full flex flex-col justify-between transition-all duration-150 cursor-pointer bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs hover:shadow-xs hover:border-[var(--brand-primary-border)]",
        currentTheme.border,
        className
      )}
    >
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-subheading)] tracking-tight font-sans">
                {title}
              </span>
              {badge && (
                <Badge variant={badgeVariant} className="px-1.5 py-0 font-medium tracking-normal">
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
            {renderValue()}
            {delta && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-sans font-medium tabular-nums px-1.5 py-0.5 rounded",
                  delta.isGood
                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800"
                    : "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800"
                )}
              >
                {delta.isIncrease ? (
                  <Icons.ArrowUpRight className="h-3 w-3" />
                ) : (
                  <Icons.ArrowDownRight className="h-3 w-3" />
                )}
                {delta.value}
              </span>
            )}
          </div>

          {subtext && (
            <div className="text-xs font-sans font-normal text-[var(--text-muted)] truncate flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] tabular-nums">
              <span>{subtext}</span>
            </div>
          )}
        </CardContent>
      </Card>
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
