import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Copy,
  Check,
  Sparkles,
  Layers,
  Zap,
  Activity,
  BarChart3,
  Table as TableIcon,
  X,
  FileSpreadsheet,
  Share2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { HistoricalRunSummary, RunDiffResponse, MetricDelta } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyStateIllustration } from "@/components/common/AnimatedSvg";
import { ProviderLogo } from "@/components/common/BrandLogos";
import { downloadFile, formatMs, formatPct, formatUsd } from "@/lib/utils";

export const DiffPage: React.FC = () => {
  const [runAId, setRunAId] = useState<string>("");
  const [runBId, setRunBId] = useState<string>("");
  const [runCId, setRunCId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("charts");
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedDecision, setCopiedDecision] = useState(false);

  const { data: runs } = useQuery<HistoricalRunSummary[]>({
    queryKey: ["benchmark-history"],
    queryFn: () => api.getHistory(50, 0),
  });

  const { data: diffData, isLoading: isLoadingDiff, isError } = useQuery<RunDiffResponse>({
    queryKey: ["benchmark-diff", runAId, runBId, runCId],
    queryFn: async () => {
      let url = `/api/diff?run_a=${encodeURIComponent(runAId)}&run_b=${encodeURIComponent(runBId)}`;
      if (runCId && runCId.trim().length > 0 && runCId !== runAId && runCId !== runBId) {
        url += `&run_c=${encodeURIComponent(runCId)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to calculate run diff");
      return res.json();
    },
    enabled: !!runAId && !!runBId && runAId !== runBId,
  });

  const handleCopyMarkdown = async (runId: string) => {
    try {
      const res = await fetch(`/api/export/markdown/${runId}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyDecisionBrief = () => {
    if (!diffData) return;
    const runAName = diffData.run_a_name;
    const runBName = diffData.run_b_name;
    const runCName = diffData.run_c_name;

    let brief = `🚀 **LLMark Benchmark Decision Brief**\n`;
    brief += `• **Baseline (A)**: ${runAName}\n`;
    brief += `• **Candidate 1 (B)**: ${runBName} (Goodput: ${diffData.goodput_delta_pct > 0 ? "+" : ""}${diffData.goodput_delta_pct}%, Cost: ${diffData.cost_delta_pct > 0 ? "+" : ""}${diffData.cost_delta_pct}%)\n`;
    if (runCName && diffData.goodput_delta_c_pct !== undefined && diffData.goodput_delta_c_pct !== null) {
      brief += `• **Candidate 2 (C)**: ${runCName} (Goodput: ${diffData.goodput_delta_c_pct > 0 ? "+" : ""}${diffData.goodput_delta_c_pct}%, Cost: ${diffData.cost_delta_c_pct! > 0 ? "+" : ""}${diffData.cost_delta_c_pct}%)\n`;
    }
    brief += `\n**Key Metric Deltas:**\n`;
    diffData.deltas.forEach((d) => {
      let line = `- ${d.metric_name}: A=${d.run_a_value} | B=${d.run_b_value} (${d.delta_pct > 0 ? "+" : ""}${d.delta_pct}%)`;
      if (d.run_c_value !== undefined && d.run_c_value !== null) {
        line += ` | C=${d.run_c_value} (${d.delta_c_pct! > 0 ? "+" : ""}${d.delta_c_pct}%)`;
      }
      brief += `${line}\n`;
    });

    navigator.clipboard.writeText(brief);
    setCopiedDecision(true);
    setTimeout(() => setCopiedDecision(false), 2500);
  };

  // Prepare chart dataset for latency
  const latencyChartData = useMemo(() => {
    if (!diffData) return [];
    const latencyMetricNames = [
      "TTFT P50 (ms)",
      "TTFT P95 (ms)",
      "ITL P95 (ms)",
      "TPOT Mean (ms)",
    ];
    return latencyMetricNames
      .map((name) => {
        const delta = diffData.deltas.find((d) => d.metric_name === name);
        if (!delta) return null;
        const entry: Record<string, any> = {
          metric: name.replace(" (ms)", ""),
          [diffData.run_a_name]: delta.run_a_value,
          [diffData.run_b_name]: delta.run_b_value,
        };
        if (diffData.run_c_name && delta.run_c_value !== undefined && delta.run_c_value !== null) {
          entry[diffData.run_c_name] = delta.run_c_value;
        }
        return entry;
      })
      .filter(Boolean);
  }, [diffData]);

  // Prepare chart dataset for throughput & goodput
  const throughputChartData = useMemo(() => {
    if (!diffData) return [];
    const names = ["Decode TPS (tok/s)", "Goodput (SLO Yield %)"];
    return names
      .map((name) => {
        const delta = diffData.deltas.find((d) => d.metric_name === name);
        if (!delta) return null;
        const entry: Record<string, any> = {
          metric: name.replace(" (tok/s)", "").replace(" (SLO Yield %)", ""),
          [diffData.run_a_name]: delta.run_a_value,
          [diffData.run_b_name]: delta.run_b_value,
        };
        if (diffData.run_c_name && delta.run_c_value !== undefined && delta.run_c_value !== null) {
          entry[diffData.run_c_name] = delta.run_c_value;
        }
        return entry;
      })
      .filter(Boolean);
  }, [diffData]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Title & Description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#2C2C2C] dark:text-[#F3F4F4] tracking-normal flex items-center gap-2.5 font-sans">
              <div className="p-2 rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35 shadow-xs">
                <GitCompare className="h-5 w-5" />
              </div>
              Multi-Model Benchmark Comparison Matrix
            </h2>
            <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 mt-1 font-sans">
              Compare latency distributions, decode throughput, Goodput yield, and token economics across up to 3 benchmark runs.
            </p>
          </div>
        </div>

        {/* 3-Model Selector Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Run A (Baseline) */}
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card className="shadow-xs transition-shadow hover:shadow-sm border-l-4 border-l-[#612D53] dark:border-l-[#7E3B6C]">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-2 font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#612D53] dark:bg-[#7E3B6C]" />
                    Run A (Baseline)
                  </CardTitle>
                  <Badge variant="outline" className="font-sans text-[11px] font-medium">Required</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <Select value={runAId} onValueChange={setRunAId}>
                  <SelectTrigger className="focus:border-[#612D53] dark:focus:border-[#7E3B6C] font-sans text-xs bg-white dark:bg-[#252426]">
                    <SelectValue placeholder="Select baseline run A..." />
                  </SelectTrigger>
                  <SelectContent>
                    {runs?.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">
                        <div className="flex items-center gap-2">
                          <ProviderLogo vendor={r.vendor} className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A] shrink-0" />
                          <span>{r.name} ({r.model}) — P95: {r.ttft_p95.toFixed(1)}ms</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>

          {/* Run B (Candidate 1) */}
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card className="shadow-xs transition-shadow hover:shadow-sm border-l-4 border-l-[#853953] dark:border-l-[#A74B6A]">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-2 font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                    Run B (Candidate 1)
                  </CardTitle>
                  <Badge variant="outline" className="font-sans text-[11px] font-medium">Required</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <Select value={runBId} onValueChange={setRunBId}>
                  <SelectTrigger className="focus:border-[#853953] dark:focus:border-[#A74B6A] font-sans text-xs bg-white dark:bg-[#252426]">
                    <SelectValue placeholder="Select candidate run B..." />
                  </SelectTrigger>
                  <SelectContent>
                    {runs?.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">
                        <div className="flex items-center gap-2">
                          <ProviderLogo vendor={r.vendor} className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A] shrink-0" />
                          <span>{r.name} ({r.model}) — P95: {r.ttft_p95.toFixed(1)}ms</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>

          {/* Run C (Candidate 2 - Optional) */}
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card className="shadow-xs transition-shadow hover:shadow-sm border-l-4 border-l-emerald-500">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-2 font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Run C (Candidate 2)
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {runCId && (
                      <button
                        type="button"
                        onClick={() => setRunCId("")}
                        className="text-[11px] text-[#2C2C2C]/50 hover:text-[#2C2C2C] flex items-center gap-0.5 cursor-pointer"
                        title="Clear 3rd model"
                      >
                        <X className="h-3 w-3" /> Clear
                      </button>
                    )}
                    <Badge variant="secondary" className="font-sans text-[11px] font-medium">Optional (3rd)</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <Select value={runCId} onValueChange={setRunCId}>
                  <SelectTrigger className="focus:border-emerald-500 font-sans text-xs bg-white dark:bg-[#252426]">
                    <SelectValue placeholder="Select optional 3rd run C..." />
                  </SelectTrigger>
                  <SelectContent>
                    {runs?.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">
                        <div className="flex items-center gap-2">
                          <ProviderLogo vendor={r.vendor} className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{r.name} ({r.model}) — P95: {r.ttft_p95.toFixed(1)}ms</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Comparison State */}
        {!runAId || !runBId ? (
          <Card className="h-64 flex flex-col items-center justify-center text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 space-y-3 font-sans shadow-xs">
            <EmptyStateIllustration className="h-16 w-16" />
            <p>Select Run A (Baseline) and Run B (Candidate) above to compute comparison graphs and deltas.</p>
          </Card>
        ) : runAId === runBId ? (
          <Card className="border-[#853953]/30 dark:border-[#A74B6A]/40 bg-[#853953]/10 dark:bg-[#A74B6A]/15 shadow-xs">
            <CardContent className="p-4 text-xs text-[#853953] dark:text-[#A74B6A] font-medium font-sans">
              Run A and Run B must be distinct benchmark executions to calculate deltas.
            </CardContent>
          </Card>
        ) : isLoadingDiff ? (
          <Card className="h-64 flex flex-col items-center justify-center text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 space-y-2 font-sans shadow-xs">
            <Sparkles className="h-6 w-6 text-[#853953] dark:text-[#A74B6A] animate-spin" />
            <p>Calculating statistical distributions across telemetry arrays...</p>
          </Card>
        ) : isError || !diffData ? (
          <Card className="border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 shadow-xs">
            <CardContent className="p-4 text-xs text-rose-800 dark:text-rose-300 font-sans">
              Failed to compute diff response. Please verify run IDs.
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Comparison Summary Banner */}
            <Card className="shadow-xs">
              <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5 font-sans">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4] flex-wrap">
                    <Badge variant="violet" className="text-xs py-1 px-2.5 font-semibold">
                      A: {diffData.run_a_name}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40" />
                    <Badge variant="default" className="text-xs py-1 px-2.5 font-semibold">
                      B: {diffData.run_b_name}
                    </Badge>
                    {diffData.run_c_name && (
                      <>
                        <ArrowRight className="h-4 w-4 text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40" />
                        <Badge variant="emerald" className="text-xs py-1 px-2.5 font-semibold">
                          C: {diffData.run_c_name}
                        </Badge>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                    B vs A Goodput:{" "}
                    <span className={diffData.goodput_delta_pct >= 0 ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-rose-700 dark:text-rose-400 font-semibold"}>
                      {diffData.goodput_delta_pct > 0 ? `+${diffData.goodput_delta_pct}%` : `${diffData.goodput_delta_pct}%`}
                    </span>{" "}
                    • Cost:{" "}
                    <span className={diffData.cost_delta_pct <= 0 ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-[#853953] dark:text-[#A74B6A] font-semibold"}>
                      {diffData.cost_delta_pct > 0 ? `+${diffData.cost_delta_pct}%` : `${diffData.cost_delta_pct}%`}
                    </span>
                    {diffData.goodput_delta_c_pct !== undefined && diffData.goodput_delta_c_pct !== null && (
                      <>
                        {" "}• C vs A Goodput:{" "}
                        <span className={diffData.goodput_delta_c_pct >= 0 ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-rose-700 dark:text-rose-400 font-semibold"}>
                          {diffData.goodput_delta_c_pct > 0 ? `+${diffData.goodput_delta_c_pct}%` : `${diffData.goodput_delta_c_pct}%`}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyDecisionBrief}
                    className="rounded-xl font-medium shadow-2xs hover:shadow-xs cursor-pointer text-xs gap-1.5"
                  >
                    {copiedDecision ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />}
                    <span>{copiedDecision ? "Decision brief copied!" : "Copy Decision Brief"}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl font-medium shadow-2xs hover:shadow-xs cursor-pointer text-xs"
                    onClick={() => downloadFile(`/api/export/pdf/${runBId}`, `llmark_comparison_${runBId}.pdf`)}
                  >
                    <Download className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Visual Charts & Table Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 max-w-[320px]">
                <TabsTrigger value="charts" className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Comparison Graphs</span>
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Metrics Matrix</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: INTERACTIVE COMPARISON CHARTS */}
              <TabsContent value="charts" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Chart 1: Latency Benchmark */}
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#853953] dark:text-[#A74B6A]" />
                        <CardTitle className="text-xs font-semibold">Latency Tail Comparison (ms)</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-[11px]">Lower is better</Badge>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={latencyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey={diffData.run_a_name} fill="#612D53" radius={[4, 4, 0, 0]} />
                          <Bar dataKey={diffData.run_b_name} fill="#853953" radius={[4, 4, 0, 0]} />
                          {diffData.run_c_name && (
                            <Bar dataKey={diffData.run_c_name} fill="#10b981" radius={[4, 4, 0, 0]} />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 2: Throughput & Goodput Yield */}
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-600" />
                        <CardTitle className="text-xs font-semibold">Throughput & Goodput Yield</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-[11px]">Higher is better</Badge>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={throughputChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey={diffData.run_a_name} fill="#612D53" radius={[4, 4, 0, 0]} />
                          <Bar dataKey={diffData.run_b_name} fill="#853953" radius={[4, 4, 0, 0]} />
                          {diffData.run_c_name && (
                            <Bar dataKey={diffData.run_c_name} fill="#10b981" radius={[4, 4, 0, 0]} />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* TAB 2: MULTI-RUN METRICS TABLE */}
              <TabsContent value="table">
                <Card className="overflow-hidden shadow-xs">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-3 px-5">Metric dimension</TableHead>
                        <TableHead className="py-3 px-3">Run A (Baseline)</TableHead>
                        <TableHead className="py-3 px-3">Run B (Candidate 1)</TableHead>
                        <TableHead className="py-3 px-3">B vs A Delta</TableHead>
                        {diffData.run_c_name && (
                          <>
                            <TableHead className="py-3 px-3">Run C (Candidate 2)</TableHead>
                            <TableHead className="py-3 px-5 text-right">C vs A Delta</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diffData.deltas.map((d: MetricDelta, idx: number) => (
                        <motion.tr
                          key={idx}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.03 }}
                          className="border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 transition-colors hover:bg-[#F3F4F4]/70 dark:hover:bg-[#2C2C2C]/60"
                        >
                          <TableCell className="py-3 px-5 font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                            {d.metric_name}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-sans tabular-nums text-xs">
                            {d.run_a_value}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-[#2C2C2C] dark:text-[#F3F4F4] font-semibold font-sans tabular-nums text-xs">
                            {d.run_b_value}
                          </TableCell>
                          <TableCell className="py-3 px-3">
                            <Badge
                              variant={
                                d.delta_pct === 0
                                  ? "secondary"
                                  : d.is_improvement
                                  ? "emerald"
                                  : "destructive"
                              }
                              className="gap-1 py-0.5 px-2 text-[11px] font-semibold font-sans tabular-nums"
                            >
                              {d.delta_pct === 0 ? (
                                <Minus className="h-3 w-3" />
                              ) : d.is_improvement ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {d.delta_pct > 0 ? `+${d.delta_pct}%` : `${d.delta_pct}%`}
                            </Badge>
                          </TableCell>

                          {diffData.run_c_name && (
                            <>
                              <TableCell className="py-3 px-3 text-[#2C2C2C] dark:text-[#F3F4F4] font-semibold font-sans tabular-nums text-xs">
                                {d.run_c_value !== undefined && d.run_c_value !== null ? d.run_c_value : "—"}
                              </TableCell>
                              <TableCell className="py-3 px-5 text-right">
                                {d.delta_c_pct !== undefined && d.delta_c_pct !== null ? (
                                  <Badge
                                    variant={
                                      d.delta_c_pct === 0
                                        ? "secondary"
                                        : d.is_improvement_c
                                        ? "emerald"
                                        : "destructive"
                                    }
                                    className="gap-1 py-0.5 px-2 text-[11px] font-semibold font-sans tabular-nums"
                                  >
                                    {d.delta_c_pct === 0 ? (
                                      <Minus className="h-3 w-3" />
                                    ) : d.is_improvement_c ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3" />
                                    )}
                                    {d.delta_c_pct > 0 ? `+${d.delta_c_pct}%` : `${d.delta_c_pct}%`}
                                  </Badge>
                                ) : (
                                  <span className="text-[11px] text-[#2C2C2C]/50">—</span>
                                )}
                              </TableCell>
                            </>
                          )}
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};
