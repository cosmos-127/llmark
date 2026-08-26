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
} from "lucide-react";
import { BenchmarkConfig, MetricsSnapshot } from "@/lib/types";
import { formatMs, formatPct, formatUsd, downloadFile } from "@/lib/utils";
import { MetricCards } from "./MetricCards";
import { KpiSummaryTable } from "./KpiSummaryTable";
import { WaterfallBar } from "./WaterfallBar";
import { StreamingChart } from "./StreamingChart";
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
        <Card className="border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                <ProviderLogo vendor={config.vendor} className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] tracking-tight">
                    {config.model}
                  </h3>
                  <Badge variant="outline" className="text-[11px] font-mono capitalize">
                    {config.vendor.replace("_", " ")}
                  </Badge>
                  {snapshot?.status === "running" && (
                    <Badge variant="default" className="text-[10px] bg-emerald-600 dark:bg-emerald-700 text-white animate-pulse">
                      Live Socket
                    </Badge>
                  )}
                  {snapshot?.status === "completed" && (
                    <Badge variant="secondary" className="text-[10px]">
                      Completed
                    </Badge>
                  )}
                  {snapshot?.status === "aborted" && (
                    <Badge variant="destructive" className="text-[10px]">
                      Aborted
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-mono mt-0.5">
                  Concurrency: {config.concurrency} streams • Preset: {config.workload_preset} • Run: {benchmarkId.slice(0, 16)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-mono">Elapsed Time</div>
                <div className="text-sm font-bold font-mono text-[#2C2C2C] dark:text-[#F3F4F4] tabular-nums">
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
              <Card className="border-[#853953]/30 dark:border-[#A74B6A]/40 bg-[#853953]/10 dark:bg-[#A74B6A]/15">
                <CardContent className="p-4 flex items-center gap-3 text-[#853953] dark:text-[#A74B6A] text-xs">
                  <AlertTriangle className="h-5 w-5 text-[#853953] dark:text-[#A74B6A] shrink-0" />
                  <div>
                    <p className="font-bold">Hard spend cap breached</p>
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
              <Card className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-xs">
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
                        {snapshot?.completed_requests} streams completed • {snapshot?.goodput_pct}% Goodput SLO yield • Total Spend: {formatUsd(snapshot?.current_spend_usd)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-medium shadow-2xs hover:shadow-xs text-xs cursor-pointer"
                      onClick={() => downloadFile(`/api/export/pdf/${benchmarkId}`, `llmark_report_${benchmarkId}.pdf`)}
                    >
                      <Download className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
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
                              className="flex items-center gap-1 text-[#853953] dark:text-[#A74B6A] font-medium"
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

            <span className="text-xs text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 hidden sm:inline-block font-mono">
              Live updates every 100ms
            </span>
          </div>

          {/* Tab 1: Visual Streams & Charts */}
          <TabsContent value="charts" className="space-y-6 mt-0">
            {/* Full-Width Latency Waterfall Profiler */}
            <WaterfallBar waterfall={snapshot?.waterfall_avg} />

            {/* Live Streaming Area Chart (Profile Filtered) */}
            <StreamingChart data={timeSeries} workloadPreset={config.workload_preset} />
          </TabsContent>

          {/* Tab 2: Executive Telemetry Matrix Table */}
          <TabsContent value="table" className="space-y-6 mt-0">
            <KpiSummaryTable snapshot={snapshot} config={config} />
          </TabsContent>

          {/* Tab 3: Combined View */}
          <TabsContent value="all" className="space-y-6 mt-0">
            <KpiSummaryTable snapshot={snapshot} config={config} />
            <WaterfallBar waterfall={snapshot?.waterfall_avg} />
            <StreamingChart data={timeSeries} workloadPreset={config.workload_preset} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};
