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
  ReferenceLine,
} from "recharts";
import { Activity, Gauge, Zap, CheckCircle2, DollarSign, ShieldCheck, Layers, Sparkles } from "lucide-react";
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

type ChartMetricView = "throughput" | "latency" | "goodput" | "cost" | "ratelimit" | "prefill" | "thinking";

export const StreamingChart: React.FC<StreamingChartProps> = ({ data, workloadPreset }) => {
  const isRateLimit = workloadPreset === "rate_limit_probe";
  const isPrefill = workloadPreset === "prefill_ttft";
  const isReasoning = workloadPreset === "reasoning_cot";

  const defaultMetric = isRateLimit ? "ratelimit" : isPrefill ? "prefill" : isReasoning ? "thinking" : "throughput";
  const [activeMetric, setActiveMetric] = useState<ChartMetricView>(defaultMetric);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Cleanly format and downsample data to prevent X-axis overcrowding
  const formattedData = React.useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { time: "0.0s", tps: 0, ttft_p95: 0, itl_p95: 0, goodput: 100, spend: 0, rpm: 0, rate_limit_pct: 0, prefill_tps_p95: 0, thinking_tokens_avg: 0 },
        { time: "1.0s", tps: 0, ttft_p95: 0, itl_p95: 0, goodput: 100, spend: 0, rpm: 0, rate_limit_pct: 0, prefill_tps_p95: 0, thinking_tokens_avg: 0 },
      ];
    }

    return data.map((d) => ({
      time: `${(d.elapsed || 0).toFixed(1)}s`,
      "Throughput (tok/s)": Math.round((d.tps || 0) * 10) / 10,
      "TTFT P95 (ms)": Math.round((d.ttft_p95 || 0) * 10) / 10,
      "ITL P95 (ms)": Math.round((d.itl_p95 || 0) * 10) / 10,
      "Goodput SLO Yield (%)": Math.round((d.goodput || 0) * 10) / 10,
      "Total Cost ($)": Math.round((d.spend || 0) * 10000) / 10000,
      "HTTP 429 Rate (%)": Math.round((d.rate_limit_pct || 0) * 10) / 10,
      "Saturated RPM": Math.round(d.rpm || 0),
      "Prefill Speed (tok/s)": Math.round((d.prefill_tps_p95 || 0) * 10) / 10,
      "Thinking Tokens (tok)": Math.round(d.thinking_tokens_avg || 0),
    }));
  }, [data]);

  const latest = data[data.length - 1] || null;

  // Theme palette colors
  const primaryColor = isDark ? "#A74B6A" : "#853953";
  const plumColor = isDark ? "#C57BB2" : "#612D53";
  const emeraldColor = isDark ? "#34D399" : "#059669";
  const roseColor = isDark ? "#F87171" : "#E11D48";
  const gridStroke = isDark ? "rgba(243, 244, 244, 0.08)" : "#e1e4e4";
  const axisColor = isDark ? "#8E9393" : "#6E6E6E";

  return (
    <Card className="shadow-xs border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] font-sans">
                Real-Time Telemetry Stream
              </CardTitle>
              <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-sans">
                Live 100Hz telemetry trajectory filtered for: {((workloadPreset as string) || "workload").replace("_", " ")}
              </CardDescription>
            </div>
          </div>

          {/* Metric Selector Buttons (Profile Filtered) */}
          <div className="flex items-center gap-1 rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] p-1 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-xs font-sans">
            {isRateLimit ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveMetric("ratelimit")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeMetric === "ratelimit"
                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                      : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                  }`}
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  HTTP 429 %
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveMetric("throughput")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeMetric === "throughput"
                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                      : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                  }`}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Saturated RPM
                </Button>
              </>
            ) : isPrefill ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveMetric("prefill")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeMetric === "prefill"
                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                      : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                  }`}
                >
                  <Layers className="h-3 w-3 mr-1" />
                  Prefill tok/s
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveMetric("latency")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeMetric === "latency"
                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                      : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                  }`}
                >
                  <Gauge className="h-3 w-3 mr-1" />
                  TTFT P95
                </Button>
              </>
            ) : isReasoning ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveMetric("thinking")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeMetric === "thinking"
                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                      : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                  }`}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Thinking Tokens
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveMetric("throughput")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeMetric === "throughput"
                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                      : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                  }`}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Decode TPS
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveMetric("throughput")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeMetric === "throughput"
                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
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
                  onClick={() => setActiveMetric("latency")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeMetric === "latency"
                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                      : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                  }`}
                >
                  <Gauge className="h-3 w-3 mr-1" />
                  Tail Latency (P95)
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveMetric("goodput")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeMetric === "goodput"
                  ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                  : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
              }`}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {isRateLimit ? "Availability %" : "Goodput %"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveMetric("cost")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeMetric === "cost"
                  ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                  : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
              }`}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Cost ($)
            </Button>
          </div>
        </div>

        {/* Live Snapshot Stat Badge Strip */}
        <div className="flex items-center gap-3 pt-2 font-sans text-xs">
          {activeMetric === "ratelimit" && (
            <div className="flex items-center gap-3 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
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
          {activeMetric === "prefill" && (
            <div className="flex items-center gap-3 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
              <div className="flex items-center gap-1.5">
                <span>Prefill Speed:</span>
                <Badge variant="emerald" className="font-sans text-xs font-semibold tabular-nums">
                  {latest?.prefill_tps_p95 ? `${latest.prefill_tps_p95.toFixed(0)} tok/s` : "0 tok/s"}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span>TTFT P95:</span>
                <Badge variant="default" className="font-sans text-xs font-semibold tabular-nums">
                  {formatMs(latest?.ttft_p95)}
                </Badge>
              </div>
            </div>
          )}
          {activeMetric === "thinking" && (
            <div className="flex items-center gap-3 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
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
          {activeMetric === "throughput" && (
            <div className="flex items-center gap-2 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
              <span>{isRateLimit ? "Saturated RPM:" : "Current Rate:"}</span>
              <Badge variant="emerald" className="font-sans text-xs font-semibold tabular-nums">
                {isRateLimit
                  ? `${latest?.rpm ? latest.rpm.toFixed(0) : "0"} req/min`
                  : latest ? `${latest.tps.toFixed(1)} tok/s` : "0.0 tok/s"}
              </Badge>
            </div>
          )}
          {activeMetric === "latency" && (
            <div className="flex items-center gap-3 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
              <div className="flex items-center gap-1.5">
                <span>TTFT P95:</span>
                <Badge variant="default" className="font-sans text-xs font-semibold tabular-nums">
                  {formatMs(latest?.ttft_p95)}
                </Badge>
              </div>
              {!isPrefill && (
                <div className="flex items-center gap-1.5">
                  <span>ITL P95:</span>
                  <Badge variant="secondary" className="font-sans text-xs font-semibold tabular-nums">
                    {formatMs(latest?.itl_p95)}
                  </Badge>
                </div>
              )}
            </div>
          )}
          {activeMetric === "goodput" && (
            <div className="flex items-center gap-2 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
              <span>{isRateLimit ? "Availability:" : "SLO Yield:"}</span>
              <Badge variant={(latest?.goodput || 0) >= 95 ? "emerald" : "destructive"} className="font-sans text-xs font-semibold tabular-nums">
                {formatPct(latest?.goodput || 100)}
              </Badge>
            </div>
          )}
          {activeMetric === "cost" && (
            <div className="flex items-center gap-2 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
              <span>Total Accrued:</span>
              <Badge variant="default" className="font-sans text-xs font-semibold tabular-nums">
                {formatUsd(latest?.spend || 0)}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2">
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
              <defs>
                <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={emeraldColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={emeraldColor} stopOpacity={0.02} />
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
                <linearGradient id="colorPrefill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={emeraldColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={emeraldColor} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorThinking" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={plumColor} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={plumColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />

              {/* Contained, uncluttered X-Axis */}
              <XAxis
                dataKey="time"
                stroke={axisColor}
                fontSize="11px"
                tickLine={false}
                fontFamily="var(--font-sans), sans-serif"
                minTickGap={50}
                interval="preserveStartEnd"
              />

              {/* Dynamic Y-Axis per active metric */}
              {activeMetric === "ratelimit" && (
                <YAxis
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit="%"
                  domain={[0, 100]}
                />
              )}

              {activeMetric === "prefill" && (
                <YAxis
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit=" tok/s"
                  domain={[0, "auto"]}
                />
              )}

              {activeMetric === "thinking" && (
                <YAxis
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit=" tok"
                  domain={[0, "auto"]}
                />
              )}

              {activeMetric === "throughput" && (
                <YAxis
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit={isRateLimit ? " req/m" : " tok/s"}
                  domain={[0, "auto"]}
                />
              )}

              {activeMetric === "latency" && (
                <>
                  <YAxis
                    yAxisId="left"
                    stroke={axisColor}
                    fontSize="11px"
                    tickLine={false}
                    fontFamily="var(--font-sans), sans-serif"
                    unit=" ms"
                    domain={[0, "auto"]}
                  />
                  {!isPrefill && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke={axisColor}
                      fontSize="11px"
                      tickLine={false}
                      fontFamily="var(--font-sans), sans-serif"
                      unit=" ms"
                      domain={[0, "auto"]}
                    />
                  )}
                </>
              )}

              {activeMetric === "goodput" && (
                <YAxis
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit="%"
                  domain={[0, 100]}
                />
              )}

              {activeMetric === "cost" && (
                <YAxis
                  stroke={axisColor}
                  fontSize="11px"
                  tickLine={false}
                  fontFamily="var(--font-sans), sans-serif"
                  unit="$"
                  domain={[0, "auto"]}
                />
              )}

              <RechartsTooltip
                contentStyle={{
                  backgroundColor: isDark ? "rgba(37, 36, 38, 0.98)" : "rgba(255, 255, 255, 0.98)",
                  borderColor: isDark ? "rgba(243, 244, 244, 0.15)" : "#2C2C2C20",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  fontFamily: "var(--font-sans), sans-serif",
                  boxShadow: isDark ? "0 10px 25px -5px rgba(0, 0, 0, 0.5)" : "0 10px 25px -5px rgba(44, 44, 44, 0.1)",
                  color: isDark ? "#F3F4F4" : "#2C2C2C",
                }}
              />

              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px", fontFamily: "var(--font-sans), sans-serif" }} />

              {/* Rate Limit View */}
              {activeMetric === "ratelimit" && (
                <Area
                  type="monotone"
                  dataKey="HTTP 429 Rate (%)"
                  stroke={roseColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRateLimit)"
                  isAnimationActive={false}
                />
              )}

              {/* Prefill View */}
              {activeMetric === "prefill" && (
                <Area
                  type="monotone"
                  dataKey="Prefill Speed (tok/s)"
                  stroke={emeraldColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPrefill)"
                  isAnimationActive={false}
                />
              )}

              {/* Thinking View */}
              {activeMetric === "thinking" && (
                <Area
                  type="monotone"
                  dataKey="Thinking Tokens (tok)"
                  stroke={plumColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorThinking)"
                  isAnimationActive={false}
                />
              )}

              {/* Throughput View */}
              {activeMetric === "throughput" && (
                <Area
                  type="monotone"
                  dataKey={isRateLimit ? "Saturated RPM" : "Throughput (tok/s)"}
                  stroke={emeraldColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorThroughput)"
                  isAnimationActive={false}
                />
              )}

              {/* Latency View */}
              {activeMetric === "latency" && (
                <>
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="TTFT P95 (ms)"
                    stroke={primaryColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTtft)"
                    isAnimationActive={false}
                  />
                  {!isPrefill && (
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="ITL P95 (ms)"
                      stroke={plumColor}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorItl)"
                      isAnimationActive={false}
                    />
                  )}
                </>
              )}

              {/* Goodput View */}
              {activeMetric === "goodput" && (
                <>
                  <ReferenceLine y={95} stroke="#34D399" strokeDasharray="3 3" label={{ value: "95% Target", fill: "#34D399", fontSize: 11, position: "insideTopLeft" }} />
                  <Area
                    type="monotone"
                    dataKey="Goodput SLO Yield (%)"
                    stroke={emeraldColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorGoodput)"
                    isAnimationActive={false}
                  />
                </>
              )}

              {/* Cost View */}
              {activeMetric === "cost" && (
                <Area
                  type="monotone"
                  dataKey="Total Cost ($)"
                  stroke={primaryColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCost)"
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
