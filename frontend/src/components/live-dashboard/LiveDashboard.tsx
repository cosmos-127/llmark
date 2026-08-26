import React from "react";
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
  Terminal,
} from "lucide-react";
import { BenchmarkConfig, MetricsSnapshot } from "@/lib/types";
import { formatMs, formatPct, formatUsd, downloadFile } from "@/lib/utils";
import { MetricCards } from "./MetricCards";

import { KpiSummaryTable } from "./KpiSummaryTable";
import { WaterfallBar } from "./WaterfallBar";
import { StreamingChart } from "./StreamingChart";
import { TokenTerminal } from "./TokenTerminal";
import { TimeSeriesPoint } from "@/hooks/useBenchmarkSSE";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LiveStreamWave } from "@/components/common/AnimatedSvg";

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
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("table");
  const isCompleted = isFinished || snapshot?.status === "completed";
  const isBudgetExceeded = snapshot?.status === "budget_exceeded";

  const handleCopyMarkdown = async () => {
    try {
      const res = await fetch(`/api/export/markdown/${benchmarkId}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const statusLabel = snapshot?.status ? snapshot.status.replace("_", " ") : "Running";

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Mission Control Top Bar */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-[#2C2C2C] dark:text-[#F3F4F4] tracking-normal font-sans">
                  {config.name}
                </h2>
                <Badge variant="default" className="text-xs font-medium">
                  {config.model}
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize font-medium">
                  {config.vendor}
                </Badge>
              </div>
              <p className="text-xs font-sans text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                Run ID: <strong className="text-[#2C2C2C] dark:text-[#F3F4F4] font-mono">{benchmarkId}</strong> • Concurrency:{" "}
                <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">{config.concurrency} streams</strong> • Mode:{" "}
                <strong className="text-[#2C2C2C] dark:text-[#F3F4F4] capitalize">
                  {config.test_mode === "requests" ? `${config.total_requests || 50} Requests` : `${config.duration_seconds}s Duration`}
                </strong>{" "}
                • Workload: <strong className="text-[#2C2C2C] dark:text-[#F3F4F4] capitalize">{config.workload_preset}</strong>
              </p>
            </div>

            {/* Live Status Pill with Animated Stream Equalizer & Action Buttons */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] px-3.5 py-1.5 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 font-sans text-xs shadow-xs">
                {!isFinished ? (
                  <LiveStreamWave active={true} className="h-3.5 w-6" />
                ) : (
                  <span className={`h-2 w-2 rounded-full ${isCompleted ? "bg-emerald-500" : "bg-rose-500"}`} />
                )}
                <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4] capitalize">
                  {statusLabel} ({(snapshot?.elapsed_seconds || 0).toFixed(1)}s)
                </span>
              </div>

              {/* Abort or Reset Button */}
              {!isFinished ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={onAbort}
                    disabled={isAborting}
                    className="rounded-xl px-4 py-2 font-medium h-9 shadow-xs cursor-pointer"
                  >
                    <Octagon className="h-4 w-4" />
                    {isAborting ? "Aborting..." : "Instant abort"}
                  </Button>
                </motion.div>
              ) : (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="button"
                    variant="amberGlow"
                    size="sm"
                    onClick={onReset}
                    className="rounded-xl px-4 py-2 text-xs font-bold h-9 shadow-sm cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Configure next run
                  </Button>
                </motion.div>
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
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Card className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30">
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
                      className="rounded-xl font-medium shadow-2xs"
                      onClick={() => downloadFile(`/api/export/pdf/${benchmarkId}`, `llmark_report_${benchmarkId}.pdf`)}
                    >
                      <Download className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                      Download PDF report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyMarkdown}
                      className="rounded-xl font-medium shadow-2xs"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />}
                      {copied ? "Copied markdown!" : "Copy markdown summary"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. KPI Headline Cards */}
        <MetricCards snapshot={snapshot} />

        {/* 2. Interactive View Switcher: Telemetry Table vs Visual Charts */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="h-9">
              <TabsTrigger value="table" className="gap-1.5 cursor-pointer">
                <TableIcon className="h-3.5 w-3.5" />
                <span>Executive Telemetry Matrix</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-1.5 cursor-pointer">
                <LineChart className="h-3.5 w-3.5" />
                <span>Live Stream & Waterfall</span>
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-1.5 cursor-pointer">
                <Activity className="h-3.5 w-3.5" />
                <span>Combined View</span>
              </TabsTrigger>
            </TabsList>

            <span className="text-xs text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 hidden sm:inline-block font-mono">
              Live updates every 100ms
            </span>
          </div>

          {/* Tab 1: Executive Telemetry Matrix Table */}
          <TabsContent value="table" className="space-y-6 mt-0">
            <KpiSummaryTable snapshot={snapshot} config={config} />
          </TabsContent>

          {/* Tab 2: Visual Streams & Charts */}
          <TabsContent value="charts" className="space-y-6 mt-0">
            {/* Live Token Terminal & Waterfall Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <TokenTerminal
                  status={snapshot?.status || "running"}
                  elapsedSeconds={snapshot?.elapsed_seconds || 0}
                  completedRequests={snapshot?.completed_requests || 0}
                  currentTps={snapshot?.current_tps || 0}
                />
              </div>
              <div className="lg:col-span-6 flex flex-col justify-between">
                <WaterfallBar waterfall={snapshot?.waterfall_avg} />
              </div>
            </div>

            {/* Live Streaming Area Chart */}
            <StreamingChart data={timeSeries} />
          </TabsContent>

          {/* Tab 3: Combined View */}
          <TabsContent value="all" className="space-y-6 mt-0">
            <KpiSummaryTable snapshot={snapshot} config={config} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <TokenTerminal
                  status={snapshot?.status || "running"}
                  elapsedSeconds={snapshot?.elapsed_seconds || 0}
                  completedRequests={snapshot?.completed_requests || 0}
                  currentTps={snapshot?.current_tps || 0}
                />
              </div>
              <div className="lg:col-span-6 flex flex-col justify-between">
                <WaterfallBar waterfall={snapshot?.waterfall_avg} />
              </div>
            </div>

            <StreamingChart data={timeSeries} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};
