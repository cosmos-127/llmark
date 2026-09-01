import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricsSnapshot } from "@/lib/types";
import { BarChart3, AlertCircle } from "lucide-react";

interface LatencyDistributionChartProps {
  snapshot: MetricsSnapshot | null;
}

export const LatencyDistributionChart: React.FC<LatencyDistributionChartProps> = ({ snapshot }) => {
  const [metricMode, setMetricMode] = useState<"ttft" | "e2e">("ttft");

  const dist = metricMode === "ttft" ? snapshot?.ttft_distribution : snapshot?.e2e_distribution;

  if (!dist || !dist.bins || dist.bins.length === 0) {
    return (
      <Card className="rounded-2xl border border-[#2C2C2C]/10 dark:border-white/10 shadow-xs bg-white dark:bg-[#121217]">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
              <CardTitle className="text-sm font-semibold font-sans">
                Tail Latency Distribution Histogram
              </CardTitle>
            </div>
          </div>
          <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-slate-400">
            Measures population dispersion, queue stalls, and bimodal execution patterns.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs text-[#2C2C2C]/50 dark:text-slate-400">
          Awaiting completion of at least 2 requests to generate population distribution bins...
        </CardContent>
      </Card>
    );
  }

  const p50 = dist.p50_ms;
  const p95 = dist.p95_ms;
  const tailRatio = p50 > 0 ? (dist.p99_ms / p50).toFixed(1) : "1.0";
  const isHighJitter = dist.cv >= 0.35;

  return (
    <Card className="rounded-2xl border border-[#2C2C2C]/10 dark:border-white/10 shadow-xs bg-white dark:bg-[#121217]">
      <CardHeader className="p-4 pb-2 border-b border-[#2C2C2C]/5 dark:border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
            <div>
              <CardTitle className="text-sm font-semibold font-sans">
                Tail Latency Distribution Histogram
              </CardTitle>
              <CardDescription className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400">
                Frequency distribution across {dist.count} completed requests with dispersion & peak analysis.
              </CardDescription>
            </div>
          </div>

          {/* Metric Mode Pill Switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setMetricMode("ttft")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                metricMode === "ttft"
                  ? "bg-white dark:bg-[#1C1C26] text-[#853953] dark:text-[#F06A9A] shadow-2xs font-semibold"
                  : "text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
              }`}
            >
              TTFT (Prefill)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode("e2e")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                metricMode === "e2e"
                  ? "bg-white dark:bg-[#1C1C26] text-[#853953] dark:text-[#F06A9A] shadow-2xs font-semibold"
                  : "text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
              }`}
            >
              E2E Turnaround
            </button>
          </div>
        </div>

        {/* Statistical Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 font-sans">
          <div className="p-2.5 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#0B0B0E] border border-[#2C2C2C]/5 dark:border-white/5">
            <span className="text-[10px] text-[#2C2C2C]/60 dark:text-slate-400 block font-medium">Mean ± StdDev</span>
            <span className="text-xs font-semibold tabular-nums text-[#2C2C2C] dark:text-white">
              {dist.mean_ms.toFixed(0)} ms ± {dist.std_dev_ms.toFixed(0)} ms
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#0B0B0E] border border-[#2C2C2C]/5 dark:border-white/5">
            <span className="text-[10px] text-[#2C2C2C]/60 dark:text-slate-400 block font-medium">Jitter CV (σ / μ)</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-semibold tabular-nums text-[#2C2C2C] dark:text-white">
                {dist.cv.toFixed(2)}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 border-0 ${
                  isHighJitter
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {isHighJitter ? "High Jitter" : "Stable"}
              </Badge>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#0B0B0E] border border-[#2C2C2C]/5 dark:border-white/5">
            <span className="text-[10px] text-[#2C2C2C]/60 dark:text-slate-400 block font-medium">Tail Spread (P99 / P50)</span>
            <span className="text-xs font-semibold tabular-nums text-[#612D53] dark:text-[#E270BB]">
              {tailRatio}x Spread
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#0B0B0E] border border-[#2C2C2C]/5 dark:border-white/5">
            <span className="text-[10px] text-[#2C2C2C]/60 dark:text-slate-400 block font-medium">Distribution Profile</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 border-0 font-medium ${
                  dist.bimodal_detected
                    ? "bg-[#853953]/15 text-[#853953] dark:text-[#F06A9A]"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                }`}
              >
                {dist.bimodal_detected ? "Bimodal Tail" : "Unimodal Gaussian"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Bimodal Alert Banner if detected */}
        {dist.bimodal_detected && dist.bimodal_description && (
          <div className="mt-2 p-2.5 rounded-xl bg-[#853953]/10 border border-[#853953]/20 flex items-start gap-2 text-xs">
            <AlertCircle className="h-4 w-4 text-[#853953] dark:text-[#F06A9A] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#853953] dark:text-[#F06A9A]">
                {dist.bimodal_description}
              </p>
              <p className="text-[11px] text-[#2C2C2C]/70 dark:text-slate-300 mt-0.5">
                Latency clusters into two operational modes. Typically caused by prompt prefix cache hits vs misses, or continuous batching queue preemption.
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dist.bins} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="bin_label"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#64748b" }}
                angle={-20}
                textAnchor="end"
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#64748b" }}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl bg-[#1A1A24] border border-white/10 p-2.5 text-white text-xs shadow-xl space-y-1">
                        <p className="font-semibold text-[11px] text-slate-300">
                          Range: {data.bin_start_ms}ms - {data.bin_end_ms}ms
                        </p>
                        <p className="text-emerald-400 font-bold tabular-nums">
                          {data.count} requests ({data.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {dist.bins.map((entry, index) => {
                  const isNearP95 = entry.bin_start_ms <= p95 && entry.bin_end_ms >= p95;
                  const isNearP50 = entry.bin_start_ms <= p50 && entry.bin_end_ms >= p50;
                  let fill = "#853953";
                  if (isNearP95) fill = "#DC2626";
                  else if (isNearP50) fill = "#10B981";
                  return <Cell key={`cell-${index}`} fill={fill} opacity={0.85} />;
                })}
              </Bar>

              {/* Reference Lines for P50 & P95 */}
              <ReferenceLine
                x={dist.bins.find((b) => b.bin_start_ms <= p50 && b.bin_end_ms >= p50)?.bin_label}
                stroke="#10B981"
                strokeDasharray="4 4"
                label={{
                  value: `P50: ${p50.toFixed(0)}ms`,
                  position: "top",
                  fill: "#10B981",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
              <ReferenceLine
                x={dist.bins.find((b) => b.bin_start_ms <= p95 && b.bin_end_ms >= p95)?.bin_label}
                stroke="#DC2626"
                strokeDasharray="4 4"
                label={{
                  value: `P95: ${p95.toFixed(0)}ms`,
                  position: "top",
                  fill: "#DC2626",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between pt-2 text-[10px] text-[#2C2C2C]/50 dark:text-slate-400 border-t border-[#2C2C2C]/5 dark:border-white/5 font-sans">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              Median P50: {p50.toFixed(0)}ms
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-600 inline-block" />
              Tail P95: {p95.toFixed(0)}ms
            </span>
          </div>
          <span>Span: {dist.min_ms.toFixed(0)}ms - {dist.max_ms.toFixed(0)}ms</span>
        </div>
      </CardContent>
    </Card>
  );
};
