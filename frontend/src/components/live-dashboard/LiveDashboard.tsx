import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Octagon,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Download,
  Copy,
  Check,
  Table as TableIcon,
  Activity,
  LineChart,
  DollarSign,
} from "lucide-react";
import { BenchmarkConfig, MetricsSnapshot } from "@/lib/types";
import { formatMs, formatPct, formatUsd, downloadFile } from "@/lib/utils";
import { getApiUrl } from "@/lib/api";
import { MetricCards } from "./MetricCards";
import { KpiSummaryTable } from "./KpiSummaryTable";
import { WaterfallBar } from "./WaterfallBar";
import { StreamingChart } from "./StreamingChart";
import { LatencyDistributionChart } from "./LatencyDistributionChart";
import { KvCacheSpeedupCard } from "./KvCacheSpeedupCard";
import { TimeSeriesPoint } from "@/hooks/useBenchmarkSSE";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProviderLogo } from "@/components/common/BrandLogos";

interface LiveDashboardProps {
  config: BenchmarkConfig;
  benchmarkId: string;
  snapshot: MetricsSnapshot | null;
  timeSeries: TimeSeriesPoint[];
  budgetWarning: string | null;
  isFinished: boolean;
  isAborting: boolean;
  onAbort: () => void;
  onReset: () => void;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  config,
  benchmarkId,
  snapshot,
  timeSeries,
  budgetWarning,
  isFinished,
  isAborting,
  onAbort,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<string>("charts");
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = () => {
    if (!snapshot) return;
    const md = `### LLMark Run: ${config.vendor} / ${config.model}
- **P50 / P95 / P99 TTFT**: ${formatMs(snapshot.ttft_p50)} / ${formatMs(snapshot.ttft_p95)} / ${formatMs(snapshot.ttft_p99)}
- **Throughput**: ${snapshot.current_tps.toFixed(1)} tok/s
- **Goodput SLO Yield**: ${snapshot.goodput_pct}%
- **Cost / 1K Goodput Calls**: ${formatUsd(snapshot.cost_per_1k_goodput_usd || 0)}
- **Total Cost**: ${formatUsd(snapshot.current_spend_usd)}`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCompleted = isFinished || snapshot?.status === "completed" || snapshot?.status === "aborted";

  return (
    <TooltipProvider>
      <div className="space-y-6 font-sans">
        {/* Top Control Bar & Run Status */}
        <Card className="border-[#0F172A]/10 dark:border-white/[0.08] shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/10 dark:border-white/10 shadow-xs p-1.5">
                <ProviderLogo vendor={config.vendor} className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-[#0F172A] dark:text-white tracking-tight">
                    {config.model}
                  </h3>
                  <Badge variant="outline" className="text-[11px] font-sans capitalize">
                    {config.vendor.replace("_", " ")}
                  </Badge>
                  {snapshot?.status === "running" && (
                    <Badge variant="default" className="text-[11px] bg-emerald-600 dark:bg-emerald-700 text-white animate-pulse">
                      Live Socket
                    </Badge>
                  )}
                  {snapshot?.status === "completed" && (
                    <Badge variant="secondary" className="text-[11px]">
                      Completed
                    </Badge>
                  )}
                  {snapshot?.status === "aborted" && (
                    <Badge variant="destructive" className="text-[11px]">
                      Aborted
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#0F172A]/60 dark:text-slate-400 font-sans mt-0.5">
                  Concurrency: {config.concurrency} streams • Preset: {config.workload_preset} • Run: <span className="font-sans font-medium">{benchmarkId.slice(0, 16)}...</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-[#0F172A]/50 dark:text-slate-400 font-sans">Elapsed Time</div>
                <div className="text-sm font-semibold font-sans text-[#0F172A] dark:text-white tabular-nums">
                  {snapshot?.elapsed_seconds ? `${snapshot.elapsed_seconds.toFixed(1)}s` : "0.0s"}
                </div>
              </div>

              {!isFinished ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onAbort}
                  disabled={isAborting}
                  className="rounded-xl px-4 py-2 font-medium h-9 shadow-2xs hover:shadow-xs cursor-pointer text-xs"
                >
                  <Octagon className="h-4 w-4" />
                  {isAborting ? "Aborting..." : "Instant abort"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onReset}
                  className="rounded-xl px-4 py-2 text-xs font-semibold h-9 shadow-xs hover:shadow-sm cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  Configure next run
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Circuit Breaker Warning Alert */}
        <AnimatePresence>
          {budgetWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-[#2563EB]/30 dark:border-[#3B82F6]/40 bg-[#2563EB]/10 dark:bg-[#3B82F6]/15">
                <CardContent className="p-4 flex items-center gap-3 text-[#2563EB] dark:text-[#60A5FA] text-xs">
                  <AlertTriangle className="h-5 w-5 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                  <div>
                    <p className="font-semibold">Hard spend cap breached</p>
                    <p>{budgetWarning}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion Banner with Quick Export Hub */}
        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Card className="border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs">
                <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-emerald-950 dark:text-emerald-200 font-sans">
                        Benchmark completed successfully
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300/80">
                        {config.workload_preset === "rate_limit_probe"
                          ? `${snapshot?.completed_requests || 0} calls probed • ${snapshot?.rate_limit_count || 0} throttled (429) • Goodput: ${formatPct(snapshot?.goodput_pct)} • Total: ${formatUsd(snapshot?.current_spend_usd)}`
                          : `${snapshot?.completed_requests || 0} streams completed • ${snapshot?.goodput_pct}% Goodput SLO yield • Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)} • Total: ${formatUsd(snapshot?.current_spend_usd)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-medium shadow-2xs hover:shadow-xs text-xs cursor-pointer"
                      onClick={() => downloadFile(getApiUrl(`/api/export/pdf/${benchmarkId}`), `llmark_report_${benchmarkId}.pdf`)}
                    >
                      <Download className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                      Download PDF
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyMarkdown}
                      className="rounded-xl font-medium shadow-2xs hover:shadow-xs text-xs cursor-pointer"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                          {copied ? (
                            <motion.span
                              key="check"
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                              className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium"
                            >
                              <Check className="h-3.5 w-3.5" /> Copied!
                            </motion.span>
                          ) : (
                            <motion.span
                              key="copy"
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                              className="flex items-center gap-1 text-[#2563EB] dark:text-[#60A5FA] font-medium"
                            >
                              <Copy className="h-3.5 w-3.5" /> Copy Summary
                            </motion.span>
                          )}
                        </AnimatePresence>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Real-Time KPI Metric Cards Row (Profile Filtered) */}
        <MetricCards snapshot={snapshot} workloadPreset={config.workload_preset} />

        {/* 2. Interactive View Switcher: Telemetry Table vs Visual Charts */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="h-9 p-1">
              <TabsTrigger value="charts" className="gap-1.5 cursor-pointer text-xs">
                <LineChart className="h-3.5 w-3.5" />
                <span>Waterfall & Streaming Charts</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5 cursor-pointer text-xs">
                <TableIcon className="h-3.5 w-3.5" />
                <span>Executive Telemetry Matrix</span>
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-1.5 cursor-pointer text-xs">
                <Activity className="h-3.5 w-3.5" />
                <span>Combined View</span>
              </TabsTrigger>
            </TabsList>

            <span className="text-xs text-[#0F172A]/50 dark:text-slate-400 hidden sm:inline-block font-sans font-medium">
              Live updates every 100ms
            </span>
          </div>

          {/* Tab 1: Visual Streams & Charts */}
          <TabsContent value="charts" className="space-y-6 mt-0">
            {/* Prefix Cache Hit Acceleration Card */}
            <KvCacheSpeedupCard snapshot={snapshot} workloadPreset={config.workload_preset} />

            {/* Full-Width Latency Waterfall Profiler - Shown only for presets where waterfall is relevant */}
            {(config.workload_preset === "prefill_ttft" ||
              config.workload_preset === "long_context_retrieval" ||
              config.workload_preset === "chat_interactive" ||
              config.workload_preset === "custom" ||
              !config.workload_preset) && (
              <WaterfallBar waterfall={snapshot?.waterfall_avg} />
            )}

            {/* Live Streaming Area Chart (Profile Filtered) */}
            <StreamingChart data={timeSeries} workloadPreset={config.workload_preset} />

            {/* Latency Distribution Histogram */}
            <LatencyDistributionChart snapshot={snapshot} />
          </TabsContent>

          {/* Tab 2: Executive Telemetry Matrix Table */}
          <TabsContent value="table" className="space-y-6 mt-0">
            <KpiSummaryTable snapshot={snapshot} config={config} />
          </TabsContent>

          {/* Tab 3: Combined View */}
          <TabsContent value="all" className="space-y-6 mt-0">
            <KvCacheSpeedupCard snapshot={snapshot} workloadPreset={config.workload_preset} />
            <KpiSummaryTable snapshot={snapshot} config={config} />
            {(config.workload_preset === "prefill_ttft" ||
              config.workload_preset === "long_context_retrieval" ||
              config.workload_preset === "chat_interactive" ||
              config.workload_preset === "custom" ||
              !config.workload_preset) && (
              <WaterfallBar waterfall={snapshot?.waterfall_avg} />
            )}
            <StreamingChart data={timeSeries} workloadPreset={config.workload_preset} />
            <LatencyDistributionChart snapshot={snapshot} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};
