import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Activity, Gauge, Zap, Sparkles } from "lucide-react";
import { TimeSeriesPoint } from "@/hooks/useBenchmarkSSE";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme";

interface StreamingChartProps {
  data: TimeSeriesPoint[];
}

export const StreamingChart: React.FC<StreamingChartProps> = ({ data }) => {
  const [activeSeries, setActiveSeries] = useState<"latency" | "throughput" | "all">("latency");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Ensure there is at least an initial baseline trajectory if data is empty or single point
  const formattedData = React.useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { time: "0.0s", ttft_p95: 0, itl_p95: 0, tps: 0 },
        { time: "0.5s", ttft_p95: 0, itl_p95: 0, tps: 0 },
      ];
    }

    return data.map((d) => ({
      time: `${(d.elapsed || 0).toFixed(1)}s`,
      "TTFT P95 (ms)": Math.round(d.ttft_p95 * 10) / 10,
      "ITL P95 (ms)": Math.round(d.itl_p95 * 10) / 10,
      "TPS (tok/s)": Math.round(d.tps * 10) / 10,
    }));
  }, [data]);

  const ttftColor = isDark ? "#E88EC4" : "#853953";
  const itlColor = isDark ? "#A74B6A" : "#612D53";
  const tpsColor = isDark ? "#34D399" : "#059669";

  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                Live Stream Latency & Throughput Trajectory
              </CardTitle>
              <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                Microsecond time-series stream buffer with dynamic scale interpolation
              </CardDescription>
            </div>
          </div>

          {/* View Switcher Controls */}
          <div className="flex items-center gap-1 rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] p-1 border border-[#2C2C2C]/15 dark:border-[#F3F4F4]/15 text-xs font-sans">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveSeries("latency")}
              className={`h-7 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeSeries === "latency"
                  ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs font-medium"
                  : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
              }`}
            >
              <Gauge className="h-3 w-3 mr-1" />
              Latency (TTFT & ITL)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveSeries("throughput")}
              className={`h-7 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeSeries === "throughput"
                  ? "bg-emerald-700 dark:bg-emerald-600 text-white shadow-xs font-medium"
                  : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
              }`}
            >
              <Zap className="h-3 w-3 mr-1" />
              Throughput (TPS)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveSeries("all")}
              className={`h-7 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeSeries === "all"
                  ? "bg-white dark:bg-[#252426] text-[#853953] dark:text-[#A74B6A] border border-[#853953]/20 dark:border-[#A74B6A]/30 shadow-xs font-bold"
                  : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
              }`}
            >
              Dual-Axis View
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2">
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTtft" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ttftColor} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={ttftColor} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorItl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={itlColor} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={itlColor} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorTps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tpsColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={tpsColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(243, 244, 244, 0.08)" : "#e1e4e4"} />

              <XAxis
                dataKey="time"
                stroke={isDark ? "#8E9393" : "#6E6E6E"}
                fontSize={10}
                tickLine={false}
                fontFamily="monospace"
              />

              {/* Left Y-Axis: Latency (ms) */}
              <YAxis
                yAxisId="left"
                stroke={isDark ? "#8E9393" : "#6E6E6E"}
                fontSize={10}
                tickLine={false}
                fontFamily="monospace"
                unit={activeSeries === "throughput" ? " t/s" : " ms"}
                domain={activeSeries === "throughput" ? [0, "auto"] : [0, "auto"]}
              />

              {/* Right Y-Axis: Throughput (tok/s) for Dual-Axis */}
              {activeSeries === "all" && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={isDark ? "#34D399" : "#059669"}
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                  unit=" t/s"
                  domain={[0, "auto"]}
                />
              )}

              <RechartsTooltip
                contentStyle={{
                  backgroundColor: isDark ? "rgba(37, 36, 38, 0.98)" : "rgba(255, 255, 255, 0.98)",
                  borderColor: isDark ? "rgba(243, 244, 244, 0.15)" : "#2C2C2C20",
                  borderRadius: "1rem",
                  fontSize: "13px",
                  fontFamily: "Roboto, system-ui, sans-serif",
                  boxShadow: isDark ? "0 10px 25px -5px rgba(0, 0, 0, 0.5)" : "0 10px 25px -5px rgba(44, 44, 44, 0.1)",
                  color: isDark ? "#F3F4F4" : "#2C2C2C",
                }}
              />

              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px", fontFamily: "Roboto, system-ui, sans-serif" }} />

              {/* Latency Series */}
              {(activeSeries === "latency" || activeSeries === "all") && (
                <>
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="TTFT P95 (ms)"
                    stroke={ttftColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTtft)"
                    isAnimationActive={false}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="ITL P95 (ms)"
                    stroke={itlColor}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorItl)"
                    isAnimationActive={false}
                  />
                </>
              )}

              {/* Throughput Series */}
              {(activeSeries === "throughput" || activeSeries === "all") && (
                <Area
                  yAxisId={activeSeries === "all" ? "right" : "left"}
                  type="monotone"
                  dataKey="TPS (tok/s)"
                  stroke={tpsColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorTps)"
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
