import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export interface DonutChartDataItem {
  name: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: DonutChartDataItem[];
  valueFormatter?: (val: number) => string;
  label?: string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  heightClass?: string;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  valueFormatter = (val) => val.toLocaleString(),
  label,
  showLegend = false,
  innerRadius = 40,
  outerRadius = 58,
  heightClass = "h-36",
  className,
}) => {
  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);

  // Safe fallback if total is 0
  const chartData = total > 0 ? data : [{ name: "None", value: 1, color: "#888888" }];

  return (
    <div className={cn("relative flex flex-col items-center justify-center w-full overflow-hidden", className)}>
      <div className={cn("w-full relative", heightClass)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  return (
                    <div className="rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] px-2.5 py-1 text-xs text-[var(--text-main)] shadow-md font-sans z-50">
                      <p className="font-semibold text-[var(--brand-primary)] text-[11px]">{item.name}</p>
                      <p className="font-sans font-semibold text-xs tabular-nums">{valueFormatter(item.value as number)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={chartData.length > 1 ? 3 : 0}
              dataKey="value"
              stroke="transparent"
              isAnimationActive={true}
              animationDuration={500}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1 font-sans">
          <span className="text-sm sm:text-base font-semibold font-sans text-[var(--text-main)] tracking-tight leading-none truncate max-w-[80px] tabular-nums">
            {valueFormatter(total)}
          </span>
          {label && (
            <span className="text-[11px] font-sans text-[var(--text-muted)] font-medium pt-0.5 leading-none">
              {label}
            </span>
          )}
        </div>
      </div>

      {/* Optional Legend below */}
      {showLegend && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 text-[11px] font-sans w-full">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 shrink-0">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[var(--text-body)] truncate max-w-[100px]">{item.name}:</span>
              <span className="text-[var(--text-main)] font-medium font-sans tabular-nums shrink-0">{valueFormatter(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
