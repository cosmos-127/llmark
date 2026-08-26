import React, { useState } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";
import { HistoricalRunSummary, RunDiffResponse, MetricDelta } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { downloadFile } from "@/lib/utils";

export const DiffPage: React.FC = () => {
  const [runAId, setRunAId] = useState<string>("");
  const [runBId, setRunBId] = useState<string>("");
  const [copiedMd, setCopiedMd] = useState(false);

  const { data: runs } = useQuery<HistoricalRunSummary[]>({
    queryKey: ["benchmark-history"],
    queryFn: () => api.getHistory(50, 0),
  });

  const { data: diffData, isLoading: isLoadingDiff, isError } = useQuery<RunDiffResponse>({
    queryKey: ["benchmark-diff", runAId, runBId],
    queryFn: async () => {
      const res = await fetch(`/api/diff?run_a=${encodeURIComponent(runAId)}&run_b=${encodeURIComponent(runBId)}`);
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
              Head-to-head benchmark diffing matrix
            </h2>
            <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 mt-1 font-sans">
              Compare latency distributions, decode throughput speedups, and token cost economics between any two benchmark runs.
            </p>
          </div>
        </div>

        {/* Run A / Run B Selector Cards with hover lifts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Run A (Baseline) */}
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card className="shadow-xs transition-shadow hover:shadow-sm">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 rounded-full bg-[#612D53] dark:bg-[#7E3B6C]" />
                    Baseline run (Run A)
                  </CardTitle>
                  <Badge variant="outline" className="font-sans text-[11px] font-medium">Reference</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Select value={runAId} onValueChange={setRunAId}>
                  <SelectTrigger className="focus:border-[#612D53] dark:focus:border-[#7E3B6C] font-sans text-xs">
                    <SelectValue placeholder="Select baseline run A..." />
                  </SelectTrigger>
                  <SelectContent>
                    {runs?.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">
                        <div className="flex items-center gap-2">
                          <ProviderLogo vendor={r.vendor} className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A] shrink-0" />
                          <span>{r.name} ({r.model} • {r.vendor}) — P95: {r.ttft_p95.toFixed(1)}ms</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>

          {/* Run B (Candidate) */}
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card className="shadow-xs transition-shadow hover:shadow-sm">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                    Candidate run (Run B)
                  </CardTitle>
                  <Badge variant="outline" className="font-sans text-[11px] font-medium">Candidate</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Select value={runBId} onValueChange={setRunBId}>
                  <SelectTrigger className="focus:border-[#853953] dark:focus:border-[#A74B6A] font-sans text-xs">
                    <SelectValue placeholder="Select candidate run B..." />
                  </SelectTrigger>
                  <SelectContent>
                    {runs?.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">
                        <div className="flex items-center gap-2">
                          <ProviderLogo vendor={r.vendor} className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A] shrink-0" />
                          <span>{r.name} ({r.model} • {r.vendor}) — P95: {r.ttft_p95.toFixed(1)}ms</span>
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
            <p>Select both Run A (Baseline) and Run B (Candidate) above to compute head-to-head deltas.</p>
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
                  <div className="flex items-center gap-3 text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                    <Badge variant="violet" className="text-xs py-1 px-3 font-semibold">
                      {diffData.run_a_name}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40" />
                    <Badge variant="default" className="text-xs py-1 px-3 font-semibold">
                      {diffData.run_b_name}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                    Goodput delta:{" "}
                    <strong className={diffData.goodput_delta_pct >= 0 ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-rose-700 dark:text-rose-400 font-bold"}>
                      {diffData.goodput_delta_pct > 0 ? `+${diffData.goodput_delta_pct}%` : `${diffData.goodput_delta_pct}%`}
                    </strong>{" "}
                    • Cost delta:{" "}
                    <strong className={diffData.cost_delta_pct <= 0 ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-[#853953] dark:text-[#A74B6A] font-bold"}>
                      {diffData.cost_delta_pct > 0 ? `+${diffData.cost_delta_pct}%` : `${diffData.cost_delta_pct}%`}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl font-medium shadow-2xs hover:shadow-xs cursor-pointer text-xs"
                    onClick={() => downloadFile(`/api/export/pdf/${runBId}`, `llmark_report_${runBId}.pdf`)}
                  >
                    <Download className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                    Download PDF
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyMarkdown(runBId)}
                    className="rounded-xl font-medium shadow-2xs hover:shadow-xs cursor-pointer text-xs"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {copiedMd ? (
                        <motion.span
                          key="check"
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                        >
                          <Check className="h-3.5 w-3.5" /> Copied!
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          className="flex items-center gap-1 text-[#853953] dark:text-[#A74B6A]"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy summary table
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Deltas Table Matrix with Staggered Row Pop-Ins */}
            <Card className="overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3.5 px-5">Metric dimension</TableHead>
                    <TableHead className="py-3.5 px-3">Run A (Baseline)</TableHead>
                    <TableHead className="py-3.5 px-3">Run B (Candidate)</TableHead>
                    <TableHead className="py-3.5 px-3">Absolute delta</TableHead>
                    <TableHead className="py-3.5 px-5 text-right">Percentage delta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diffData.deltas.map((d: MetricDelta, idx: number) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <TableCell className="py-3.5 px-5 font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                        {d.metric_name}
                      </TableCell>
                      <TableCell className="py-3.5 px-3 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-mono text-xs">{d.run_a_value}</TableCell>
                      <TableCell className="py-3.5 px-3 text-[#2C2C2C] dark:text-[#F3F4F4] font-bold font-mono text-xs">{d.run_b_value}</TableCell>
                      <TableCell className="py-3.5 px-3 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-mono text-xs">
                        {d.delta_value > 0 ? `+${d.delta_value}` : `${d.delta_value}`}
                      </TableCell>
                      <TableCell className="py-3.5 px-5 text-right">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="inline-block"
                        >
                          <Badge
                            variant={
                              d.delta_pct === 0
                                ? "secondary"
                                : d.is_improvement
                                ? "emerald"
                                : "destructive"
                            }
                            className="gap-1.5 py-1 px-3 text-xs font-medium font-mono shadow-2xs"
                          >
                            {d.delta_pct === 0 ? (
                              <Minus className="h-3.5 w-3.5" />
                            ) : d.is_improvement ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}
                            {d.delta_pct > 0 ? `+${d.delta_pct}%` : `${d.delta_pct}%`}
                          </Badge>
                        </motion.div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};
