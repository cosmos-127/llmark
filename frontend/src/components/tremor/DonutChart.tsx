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
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  valueFormatter = (val) => val.toLocaleString(),
  label,
  className,
}) => {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)}>
      <div className="h-44 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  return (
                    <div className="rounded-xl border border-[#2C2C2C]/15 dark:border-[#F3F4F4]/15 bg-white dark:bg-[#252426] px-3 py-1.5 text-xs text-[#2C2C2C] dark:text-[#F3F4F4] shadow-lg font-sans">
                      <p className="font-medium text-[#853953] dark:text-[#A74B6A]">{item.name}</p>
                      <p className="font-mono font-bold">{valueFormatter(item.value as number)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
              stroke="currentColor"
              className="text-white dark:text-[#252426]"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-extrabold font-mono text-[#2C2C2C] dark:text-[#F3F4F4] tracking-normal">
            {valueFormatter(total)}
          </span>
          {label && <span className="text-xs font-sans text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-medium">{label}</span>}
        </div>
      </div>

      {/* Legend below */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-sans">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">{item.name}:</span>
            <span className="text-[#2C2C2C] dark:text-[#F3F4F4] font-medium font-mono">{valueFormatter(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
