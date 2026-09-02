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
      <Card className="rounded-2xl border border-[var(--border-subtle)] shadow-xs bg-white dark:bg-[var(--bg-surface-subtle)]">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[var(--brand-primary)]" />
              <CardTitle className="text-sm font-semibold font-sans">
                Tail Latency Distribution Histogram
              </CardTitle>
            </div>
          </div>
          <CardDescription className="text-xs text-[var(--text-muted)]">
            Measures population dispersion, queue stalls, and bimodal execution patterns.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs text-[var(--text-subtle)]">
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
    <Card className="rounded-2xl border border-[var(--border-subtle)] shadow-xs bg-white dark:bg-[var(--bg-surface-subtle)]">
      <CardHeader className="p-4 pb-2 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--brand-primary)]" />
            <div>
              <CardTitle className="text-sm font-semibold font-sans">
                Tail Latency Distribution Histogram
              </CardTitle>
              <CardDescription className="text-[11px] text-[var(--text-muted)]">
                Frequency distribution across {dist.count} completed requests with dispersion & peak analysis.
              </CardDescription>
            </div>
          </div>

          {/* Metric Mode Pill Switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs">
            <button
              type="button"
              onClick={() => setMetricMode("ttft")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                metricMode === "ttft"
                  ? "bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] shadow-2xs font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              TTFT (Prefill)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode("e2e")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                metricMode === "e2e"
                  ? "bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] shadow-2xs font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              E2E Turnaround
            </button>
          </div>
        </div>

        {/* Statistical Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 font-sans">
          <div className="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-muted)] block font-medium">Mean ± StdDev</span>
            <span className="text-xs font-semibold tabular-nums text-[var(--text-main)]">
              {dist.mean_ms.toFixed(0)} ms ± {dist.std_dev_ms.toFixed(0)} ms
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-muted)] block font-medium">Jitter CV (σ / μ)</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-semibold tabular-nums text-[var(--text-main)]">
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

          <div className="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-muted)] block font-medium">Tail Spread (P99 / P50)</span>
            <span className="text-xs font-semibold tabular-nums text-[var(--brand-secondary)]">
              {tailRatio}x Spread
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-muted)] block font-medium">Distribution Profile</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 border-0 font-medium ${
                  dist.bimodal_detected
                    ? "bg-[var(--brand-primary-light)] text-[var(--brand-primary)]"
                    : "bg-[var(--brand-primary-light)] text-[var(--brand-primary)]"
                }`}
              >
                {dist.bimodal_detected ? "Bimodal Tail" : "Unimodal Gaussian"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Bimodal Alert Banner if detected */}
        {dist.bimodal_detected && dist.bimodal_description && (
          <div className="mt-2 p-2.5 rounded-xl bg-[var(--brand-primary-light)] border border-[var(--brand-primary-border)] flex items-start gap-2 text-xs">
            <AlertCircle className="h-4 w-4 text-[var(--brand-primary)] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[var(--brand-primary)]">
                {dist.bimodal_description}
              </p>
              <p className="text-[11px] text-[var(--text-body)] mt-0.5">
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
                      <div className="rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] p-2.5 text-white text-xs shadow-xl space-y-1">
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
                  let fill = "var(--brand-primary)";
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

        <div className="flex items-center justify-between pt-2 text-[10px] text-[var(--text-subtle)] border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)] font-sans">
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
