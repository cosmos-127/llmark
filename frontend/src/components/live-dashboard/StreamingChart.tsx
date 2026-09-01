import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { Icons } from "@/components/common/HugeIcons";
import { TimeSeriesPoint } from "@/hooks/useBenchmarkSSE";
import { WorkloadPreset } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme";
import { formatMs, formatPct, formatUsd } from "@/lib/utils";

interface StreamingChartProps {
  data: TimeSeriesPoint[];
  workloadPreset?: WorkloadPreset | string;
}

type ChartMetricView = "overview" | "latency" | "throughput" | "goodput" | "cost" | "ratelimit" | "thinking";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color?: string;
    stroke?: string;
    fill?: string;
    dataKey?: string;
  }>;
  label?: string;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-[#2C2C2C]/15 dark:border-white/15 bg-white/95 dark:bg-[#14141B]/95 p-3 shadow-xl backdrop-blur-md text-xs font-sans space-y-2 min-w-[190px]">
      <div className="flex items-center justify-between border-b border-[#2C2C2C]/10 dark:border-white/10 pb-1.5 gap-2">
        <span className="font-semibold text-[#2C2C2C] dark:text-slate-200">Elapsed</span>
        <span className="rounded-md bg-[#853953]/10 dark:bg-[#E05284]/15 px-2 py-0.5 text-[11px] font-semibold text-[#853953] dark:text-[#F06A9A] tabular-nums">
          T + {label}
        </span>
      </div>
      <div className="space-y-1.5 pt-0.5">
        {payload.map((item, idx) => {
          const color = item.stroke || item.color || item.fill || "#853953";
          return (
            <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                <span className="text-[#2C2C2C]/75 dark:text-slate-300 truncate max-w-[140px] font-medium">{item.name}</span>
              </div>
              <span className="font-semibold tabular-nums text-[#2C2C2C] dark:text-white shrink-0">
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const StreamingChart: React.FC<StreamingChartProps> = ({ data, workloadPreset }) => {
  const isRateLimit = workloadPreset === "rate_limit_probe";
  const isPrefill =
    workloadPreset === "prefill_ttft" ||
    workloadPreset === "long_context_retrieval" ||
    workloadPreset === "long_context";
  const isReasoning = workloadPreset === "reasoning_cot";

  const defaultMetric = isRateLimit ? "ratelimit" : "overview";
  const [activeMetric, setActiveMetric] = useState<ChartMetricView>(defaultMetric);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Dynamic peak and average calculations for the active metric
  const metricStats = React.useMemo(() => {
    if (!data || data.length === 0) return null;
    let values: number[] = [];
    let unit = "";

    switch (activeMetric) {
      case "overview":
      case "throughput":
        values = data.map((d) => d.tps || 0);
        unit = "tok/s";
        break;
      case "latency":
        values = data.map((d) => d.ttft_instant ?? d.ttft_p95 ?? 0).filter((v) => v > 0);
        unit = "ms";
        break;
      case "goodput":
        values = data.map((d) => d.goodput || 0);
        unit = "%";
        break;
      case "cost":
        values = data.map((d) => d.spend || 0);
        unit = "$";
        break;
      case "ratelimit":
        values = data.map((d) => d.rpm || 0);
        unit = "RPM";
        break;
      case "thinking":
        values = data.map((d) => d.thinking_tokens_avg || 0).filter((v) => v > 0);
        unit = "tok";
        break;
    }

    if (values.length === 0) return null;
    const maxVal = Math.max(...values);
    const avgVal = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      max: unit === "$" ? formatUsd(maxVal) : `${maxVal.toFixed(1)} ${unit}`,
      avg: unit === "$" ? formatUsd(avgVal) : `${avgVal.toFixed(1)} ${unit}`,
    };
  }, [data, activeMetric]);

  // Sync active metric tab when preset changes
  React.useEffect(() => {
    if (isRateLimit && activeMetric !== "ratelimit" && activeMetric !== "overview" && activeMetric !== "goodput" && activeMetric !== "cost") {
      setActiveMetric("ratelimit");
    } else if (!isRateLimit && activeMetric === "ratelimit") {
      setActiveMetric("overview");
    }
  }, [isRateLimit, workloadPreset]);

  // Format data points for recharts
  const formattedData = React.useMemo(() => {
    if (!data || data.length === 0) {
      return [
        {
          time: "0.0s",
          "Throughput (tok/s)": 0,
          "Prefill Speed (tok/s)": 0,
          "Instant TTFT (ms)": 0,
          "TTFT P95 (ms)": 0,
          "Instant ITL (ms)": 0,
          "ITL P95 (ms)": 0,
          "Goodput SLO Yield (%)": 100,
          "Instant SLO Pass (%)": 100,
          "Total Cost ($)": 0,
          "HTTP 429 Rate (%)": 0,
          "Saturated RPM": 0,
          "Thinking Tokens (tok)": 0,
        },
        {
          time: "1.0s",
          "Throughput (tok/s)": 0,
          "Prefill Speed (tok/s)": 0,
          "Instant TTFT (ms)": 0,
          "TTFT P95 (ms)": 0,
          "Instant ITL (ms)": 0,
          "ITL P95 (ms)": 0,
          "Goodput SLO Yield (%)": 100,
          "Instant SLO Pass (%)": 100,
          "Total Cost ($)": 0,
          "HTTP 429 Rate (%)": 0,
          "Saturated RPM": 0,
          "Thinking Tokens (tok)": 0,
        },
      ];
    }

    const mapped = data.map((d) => ({
      time: `${(d.elapsed || 0).toFixed(1)}s`,
      "Throughput (tok/s)": Math.round((d.tps || 0) * 10) / 10,
      "Prefill Speed (tok/s)": Math.round((d.prefill_tps_instant ?? d.prefill_tps_p95 ?? 0) * 10) / 10,
      "Instant TTFT (ms)": Math.round((d.ttft_instant ?? d.ttft_p95 ?? 0) * 10) / 10,
      "TTFT P95 (ms)": Math.round((d.ttft_p95 || 0) * 10) / 10,
      "Instant ITL (ms)": Math.round((d.itl_instant ?? d.itl_p95 ?? 0) * 10) / 10,
      "ITL P95 (ms)": Math.round((d.itl_p95 || 0) * 10) / 10,
      "Goodput SLO Yield (%)": Math.round((d.goodput || 0) * 10) / 10,
      "Instant SLO Pass (%)": Math.round((d.goodput_instant ?? d.goodput ?? 100) * 10) / 10,
      "Total Cost ($)": Math.round((d.spend || 0) * 10000) / 10000,
      "HTTP 429 Rate (%)": Math.round((d.rate_limit_pct || 0) * 10) / 10,
      "Saturated RPM": Math.round(d.rpm || 0),
      "Thinking Tokens (tok)": Math.round(d.thinking_tokens_avg || 0),
    }));

    // If only 1 data point has arrived, prepend a 0.0s baseline so Recharts renders the area curve immediately
    if (mapped.length === 1) {
      return [
        {
          ...mapped[0],
          time: "0.0s",
          "Throughput (tok/s)": 0,
          "Prefill Speed (tok/s)": 0,
          "Total Cost ($)": 0,
          "HTTP 429 Rate (%)": 0,
          "Saturated RPM": 0,
        },
        mapped[0],
      ];
    }

    return mapped;
  }, [data]);

  const latest = data[data.length - 1] || null;

  // Theme palette colors
  const primaryColor = isDark ? "#E05284" : "#853953";
  const plumColor = isDark ? "#C14594" : "#612D53";
  const emeraldColor = isDark ? "#34D399" : "#059669";
  const cyanColor = isDark ? "#38BDF8" : "#0284C7";
  const roseColor = isDark ? "#F87171" : "#E11D48";
  const amberColor = isDark ? "#FBBF24" : "#D97706";
  const gridStroke = isDark ? "rgba(255, 255, 255, 0.05)" : "#e1e4e4";
  const axisColor = isDark ? "#94A3B8" : "#6E6E6E";

  const getActiveDot = (color: string) => ({
    r: 4.5,
    stroke: color,
    strokeWidth: 2,
    fill: isDark ? "#14141B" : "#FFFFFF",
  });

  return (
    <Card className="shadow-xs border-[#2C2C2C]/10 dark:border-white/[0.08]">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#E05284]/15 text-[#853953] dark:text-[#F06A9A] border border-[#853953]/25 dark:border-[#E05284]/35">
              <Icons.Activity className="h-4 w-4" />
              {data && data.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-white font-sans">
                  Real-Time Telemetry Stream
                </CardTitle>
                {data && data.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-1.5 py-0.5 rounded-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Live 100Hz
                  </span>
                )}
              </div>
              <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-slate-400 font-sans">
                Live 100Hz telemetry trajectory • Mode: {((workloadPreset as string) || "standard").replace("_", " ")}
              </CardDescription>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] p-1 border border-[#2C2C2C]/10 dark:border-white/10 text-xs font-sans">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveMetric("overview")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeMetric === "overview"
                  ? "bg-[#853953] dark:bg-[#D84577] text-white shadow-xs"
                  : "text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
              }`}
            >
              <Icons.Sliders className="h-3 w-3 mr-1" />
              Composite Overview
            </Button>

            {(isRateLimit || (latest?.rate_limit_pct || 0) > 0) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveMetric("ratelimit")}
                className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  activeMetric === "ratelimit"
                    ? "bg-[#853953] dark:bg-[#D84577] text-white shadow-xs"
                    : "text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
                }`}
              >
                <Icons.ShieldCheck className="h-3 w-3 mr-1" />
                HTTP 429 & Quotas
              </Button>
            )}

            {!isRateLimit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveMetric("latency")}
                className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  activeMetric === "latency"
                    ? "bg-[#853953] dark:bg-[#D84577] text-white shadow-xs"
                    : "text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
                }`}
              >
                <Icons.Gauge className="h-3 w-3 mr-1" />
                {isReasoning
                  ? "Tail Latency (TTFA)"
                  : isPrefill
                  ? "Tail Latency (TTFT)"
                  : "Stream Latency (ITL)"}
              </Button>
            )}

            {!isRateLimit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveMetric("throughput")}
                className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  activeMetric === "throughput"
                    ? "bg-[#853953] dark:bg-[#D84577] text-white shadow-xs"
                    : "text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
                }`}
              >
                <Icons.Zap className="h-3 w-3 mr-1" />
                {isPrefill ? "Prefill Speed (tok/s)" : "Throughput (TPS)"}
              </Button>
            )}

            {isReasoning && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveMetric("thinking")}
                className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  activeMetric === "thinking"
                    ? "bg-[#853953] dark:bg-[#D84577] text-white shadow-xs"
                    : "text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
                }`}
              >
                <Icons.Home className="h-3 w-3 mr-1" />
                Thinking Tokens
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveMetric("goodput")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeMetric === "goodput"
                  ? "bg-[#853953] dark:bg-[#D84577] text-white shadow-xs"
                  : "text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
              }`}
            >
              <Icons.CheckCircle className="h-3 w-3 mr-1" />
              Goodput SLO Yield
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveMetric("cost")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeMetric === "cost"
                  ? "bg-[#853953] dark:bg-[#D84577] text-white shadow-xs"
                  : "text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
              }`}
            >
              <Icons.Dollar className="h-3 w-3 mr-1" />
              Spend ($)
            </Button>

            <div className="h-4 w-px bg-[#2C2C2C]/15 dark:bg-white/15 mx-0.5" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0 rounded-lg text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white cursor-pointer"
              title={isExpanded ? "Collapse chart height (320px)" : "Expand chart height (500px)"}
            >
              {isExpanded ? <Icons.Minimize className="h-3.5 w-3.5" /> : <Icons.Maximize className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Live Snapshot Stat Badge Strip & Peak/Avg Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 font-sans text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {activeMetric === "overview" && (
              <div className="flex flex-wrap items-center gap-3 text-[#2C2C2C]/70 dark:text-slate-300">
                {isRateLimit ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span>Saturated RPM:</span>
                      <Badge variant="default" className="font-sans text-xs font-semibold tabular-nums">
                        {latest?.rpm ? `${latest.rpm.toFixed(0)} req/min` : "0 req/min"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>HTTP 429 Rate:</span>
                      <Badge
                        variant={(latest?.rate_limit_pct || 0) > 0 ? "destructive" : "emerald"}
                        className="font-sans text-xs font-semibold tabular-nums"
                      >
                        {formatPct(latest?.rate_limit_pct || 0)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Non-Throttled Goodput:</span>
                      <Badge
                        variant={(latest?.goodput || 0) >= 95 ? "emerald" : "destructive"}
                        className="font-sans text-xs font-semibold tabular-nums"
                      >
                        {formatPct(latest?.goodput || 100)}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span>{isPrefill ? "Prefill Speed:" : "Throughput:"}</span>
                      <Badge variant="emerald" className="font-sans text-xs font-semibold tabular-nums">
                        {isPrefill
                          ? `${(latest?.prefill_tps_instant ?? latest?.prefill_tps_p95 ?? 0).toFixed(0)} tok/s`
                          : `${(latest?.tps || 0).toFixed(1)} tok/s`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Live TTFT (Instant):</span>
                      <Badge variant="default" className="font-sans text-xs font-semibold tabular-nums">
                        {formatMs(latest?.ttft_instant ?? latest?.ttft_p95)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>TTFT P95 Tail:</span>
                      <Badge variant="secondary" className="font-sans text-xs font-semibold tabular-nums">
                        {formatMs(latest?.ttft_p95)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Goodput:</span>
                      <Badge
                        variant={(latest?.goodput || 0) >= 95 ? "emerald" : "destructive"}
                        className="font-sans text-xs font-semibold tabular-nums"
                      >
                        {formatPct(latest?.goodput || 100)}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeMetric === "latency" && (
              <div className="flex flex-wrap items-center gap-3 text-[#2C2C2C]/70 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span>Instant TTFT:</span>
                  <Badge variant="default" className="font-sans text-xs font-semibold tabular-nums">
                    {formatMs(latest?.ttft_instant ?? latest?.ttft_p95)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>TTFT P95 Envelope:</span>
                  <Badge variant="secondary" className="font-sans text-xs font-semibold tabular-nums">
                    {formatMs(latest?.ttft_p95)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>ITL P95:</span>
                  <Badge variant="secondary" className="font-sans text-xs font-semibold tabular-nums">
                    {formatMs(latest?.itl_p95)}
                  </Badge>
                </div>
              </div>
            )}

            {activeMetric === "throughput" && (
              <div className="flex flex-wrap items-center gap-3 text-[#2C2C2C]/70 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span>Decode Output TPS:</span>
                  <Badge variant="emerald" className="font-sans text-xs font-semibold tabular-nums">
                    {latest ? `${latest.tps.toFixed(1)} tok/s` : "0.0 tok/s"}
                  </Badge>
                </div>
                {((latest?.prefill_tps_p95 || 0) > 0 || isPrefill) && (
                  <div className="flex items-center gap-1.5">
                    <span>Prefill Velocity:</span>
                    <Badge variant="default" className="font-sans text-xs font-semibold tabular-nums">
                      {latest?.prefill_tps_p95 ? `${latest.prefill_tps_p95.toFixed(0)} tok/s` : "0 tok/s"}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {activeMetric === "goodput" && (
              <div className="flex flex-wrap items-center gap-3 text-[#2C2C2C]/70 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span>SLO Yield (Yield %):</span>
                  <Badge variant={(latest?.goodput || 0) >= 95 ? "emerald" : "destructive"} className="font-sans text-xs font-semibold tabular-nums">
                    {formatPct(latest?.goodput || 100)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Target SLA:</span>
                  <Badge variant="secondary" className="font-sans text-xs font-semibold tabular-nums">
                    &gt;= 95.0%
                  </Badge>
                </div>
              </div>
            )}

            {activeMetric === "cost" && (
              <div className="flex items-center gap-2 text-[#2C2C2C]/70 dark:text-slate-300">
                <span>Total Accrued:</span>
                <Badge variant="default" className="font-sans text-xs font-semibold tabular-nums">
                  {formatUsd(latest?.spend || 0)}
                </Badge>
              </div>
            )}

            {activeMetric === "ratelimit" && (
              <div className="flex items-center gap-3 text-[#2C2C2C]/70 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span>HTTP 429 Rate:</span>
                  <Badge variant={(latest?.rate_limit_pct || 0) > 0 ? "destructive" : "emerald"} className="font-sans text-xs font-semibold tabular-nums">
                    {formatPct(latest?.rate_limit_pct || 0)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Live RPM:</span>
                  <Badge variant="default" className="font-sans text-xs font-semibold tabular-nums">
                    {latest?.rpm ? `${latest.rpm.toFixed(0)} req/min` : "0 req/min"}
                  </Badge>
                </div>
              </div>
            )}

            {activeMetric === "thinking" && (
              <div className="flex items-center gap-3 text-[#2C2C2C]/70 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span>Thinking Budget:</span>
                  <Badge variant="secondary" className="font-sans text-xs font-semibold tabular-nums">
                    {latest?.thinking_tokens_avg ? `${latest.thinking_tokens_avg.toFixed(0)} tok` : "0 tok"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Decode TPS:</span>
                  <Badge variant="emerald" className="font-sans text-xs font-semibold tabular-nums">
                    {latest ? `${latest.tps.toFixed(1)} tok/s` : "0.0 tok/s"}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Quick Peak & Average Pill */}
          {metricStats && (
            <div className="hidden sm:flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 text-[11px] text-[#2C2C2C]/70 dark:text-slate-300 font-sans tabular-nums">
              <span>Peak: <strong className="text-[#2C2C2C] dark:text-white font-semibold">{metricStats.max}</strong></span>
              <span className="text-[#2C2C2C]/30 dark:text-white/30">•</span>
              <span>Avg: <strong className="text-[#2C2C2C] dark:text-white font-semibold">{metricStats.avg}</strong></span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2">
        <div className={`${isExpanded ? "h-[500px] min-h-[500px]" : "h-80 min-h-[320px]"} w-full pt-2 transition-all duration-300`}>
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            <AreaChart data={formattedData} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
              <defs>
                <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={emeraldColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={emeraldColor} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorPrefill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cyanColor} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={cyanColor} stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="colorTtft" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorItl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={plumColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={plumColor} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorGoodput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={emeraldColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={emeraldColor} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorRateLimit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={roseColor} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={roseColor} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorThinking" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={plumColor} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={plumColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />

              <XAxis
                dataKey="time"
                stroke={axisColor}
                fontSize="11px"
                tickLine={false}
                fontFamily="var(--font-sans), sans-serif"
                minTickGap={45}
                interval="preserveStartEnd"
              />

              {/* 1. Composite Overview View Axes (Dual Axis: Token Velocity/RPM on Left, Latency/429% on Right) */}
              {activeMetric === "overview" && (
                <YAxis
                  yAxisId="left"
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit={isRateLimit ? " RPM" : " tok/s"}
                  domain={[0, (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? Math.ceil(dataMax * 1.15) : (isRateLimit ? 100 : 25))]}
                />
              )}
              {activeMetric === "overview" && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit={isRateLimit ? "%" : " ms"}
                  domain={isRateLimit ? [0, 100] : [0, (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? Math.ceil(dataMax * 1.15) : 200)]}
                />
              )}

              {/* 2. Latency View Axes */}
              {activeMetric === "latency" && (
                <YAxis
                  yAxisId="left"
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit=" ms"
                  domain={[0, (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? Math.ceil(dataMax * 1.15) : 200)]}
                />
              )}
              {activeMetric === "latency" && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit=" ms"
                  domain={[0, (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? Math.ceil(dataMax * 1.15) : 50)]}
                />
              )}

              {/* 3. Throughput View Axis */}
              {activeMetric === "throughput" && (
                <YAxis
                  yAxisId="left"
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit=" tok/s"
                  domain={[0, (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? Math.ceil(dataMax * 1.15) : 25)]}
                />
              )}

              {/* 4. Goodput View Axis */}
              {activeMetric === "goodput" && (
                <YAxis
                  yAxisId="left"
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit="%"
                  domain={[0, 100]}
                />
              )}

              {/* 5. Cost View Axis */}
              {activeMetric === "cost" && (
                <YAxis
                  yAxisId="left"
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit="$"
                  domain={[0, (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? Number((dataMax * 1.25).toFixed(4)) : 0.01)]}
                />
              )}

              {/* 6. Rate Limit View Axis */}
              {activeMetric === "ratelimit" && (
                <YAxis
                  yAxisId="left"
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit="%"
                  domain={[0, 100]}
                />
              )}

              {/* 7. Thinking View Axis */}
              {activeMetric === "thinking" && (
                <YAxis
                  yAxisId="left"
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit=" tok"
                  domain={[0, (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? Math.ceil(dataMax * 1.15) : 100)]}
                />
              )}

              <RechartsTooltip
                content={<CustomChartTooltip />}
                cursor={{ stroke: isDark ? "rgba(255,255,255,0.25)" : "rgba(44,44,44,0.25)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
              />

              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px", fontFamily: "var(--font-sans), sans-serif" }} />

              {/* 1. Composite Overview Plots - Rate Limit Mode */}
              {activeMetric === "overview" && isRateLimit && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Saturated RPM"
                  stroke={plumColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorThinking)"
                  activeDot={getActiveDot(plumColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {activeMetric === "overview" && isRateLimit && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="HTTP 429 Rate (%)"
                  stroke={roseColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRateLimit)"
                  activeDot={getActiveDot(roseColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {/* 1. Composite Overview Plots - Prefill Mode */}
              {activeMetric === "overview" && !isRateLimit && isPrefill && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Prefill Speed (tok/s)"
                  stroke={cyanColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPrefill)"
                  activeDot={getActiveDot(cyanColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {activeMetric === "overview" && !isRateLimit && isPrefill && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="Instant TTFT (ms)"
                  stroke={primaryColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTtft)"
                  activeDot={getActiveDot(primaryColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {activeMetric === "overview" && !isRateLimit && isPrefill && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="TTFT P95 (ms)"
                  stroke={plumColor}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={getActiveDot(plumColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {/* 1. Composite Overview Plots - Standard Mode */}
              {activeMetric === "overview" && !isRateLimit && !isPrefill && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Throughput (tok/s)"
                  stroke={emeraldColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorThroughput)"
                  activeDot={getActiveDot(emeraldColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {activeMetric === "overview" && !isRateLimit && !isPrefill && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="Instant TTFT (ms)"
                  stroke={primaryColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTtft)"
                  activeDot={getActiveDot(primaryColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {activeMetric === "overview" && !isRateLimit && !isPrefill && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="TTFT P95 (ms)"
                  stroke={plumColor}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={getActiveDot(plumColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {/* 2. Latency View Plots */}
              {activeMetric === "latency" && (
                <ReferenceLine
                  yAxisId="left"
                  y={1500}
                  stroke={roseColor}
                  strokeDasharray="3 3"
                  label={{ value: "1500ms TTFT SLA Cap", fill: roseColor, fontSize: 11, position: "insideTopLeft" }}
                />
              )}
              {activeMetric === "latency" && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Instant TTFT (ms)"
                  stroke={primaryColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorTtft)"
                  activeDot={getActiveDot(primaryColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {activeMetric === "latency" && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="TTFT P95 (ms)"
                  stroke={amberColor}
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={getActiveDot(amberColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {activeMetric === "latency" && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="ITL P95 (ms)"
                  stroke={plumColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorItl)"
                  activeDot={getActiveDot(plumColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {/* 3. Throughput View Plots */}
              {activeMetric === "throughput" && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Throughput (tok/s)"
                  stroke={emeraldColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorThroughput)"
                  activeDot={getActiveDot(emeraldColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {activeMetric === "throughput" && isPrefill && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Prefill Speed (tok/s)"
                  stroke={cyanColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPrefill)"
                  activeDot={getActiveDot(cyanColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {/* 4. Goodput View Plots */}
              {activeMetric === "goodput" && (
                <ReferenceLine
                  yAxisId="left"
                  y={95}
                  stroke={emeraldColor}
                  strokeDasharray="3 3"
                  label={{ value: "95% Target SLA", fill: emeraldColor, fontSize: 11, position: "insideTopLeft" }}
                />
              )}
              {activeMetric === "goodput" && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Goodput SLO Yield (%)"
                  stroke={emeraldColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorGoodput)"
                  activeDot={getActiveDot(emeraldColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {activeMetric === "goodput" && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Instant SLO Pass (%)"
                  stroke={cyanColor}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={getActiveDot(cyanColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {/* 5. Cost View Plots */}
              {activeMetric === "cost" && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Total Cost ($)"
                  stroke={primaryColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCost)"
                  activeDot={getActiveDot(primaryColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {/* 6. Rate Limit View Plots */}
              {activeMetric === "ratelimit" && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="HTTP 429 Rate (%)"
                  stroke={roseColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRateLimit)"
                  activeDot={getActiveDot(roseColor)}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {/* 7. Thinking View Plots */}
              {activeMetric === "thinking" && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Thinking Tokens (tok)"
                  stroke={plumColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorThinking)"
                  activeDot={getActiveDot(plumColor)}
                  connectNulls
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
