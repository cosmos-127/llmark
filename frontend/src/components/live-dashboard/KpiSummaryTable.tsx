import React, { useState } from "react";
import {
  Gauge,
  Zap,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Activity,
  Globe,
  Coins,
  ShieldCheck,
  Clock,
  Layers,
  Copy,
  Check,
  Download,
  Info,
} from "lucide-react";
import { BenchmarkConfig, MetricsSnapshot } from "@/lib/types";
import { formatMs, formatPct, formatUsd } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KpiSummaryTableProps {
  snapshot: MetricsSnapshot | null;
  config: BenchmarkConfig;
}

export const KpiSummaryTable: React.FC<KpiSummaryTableProps> = ({ snapshot, config }) => {
  const [copied, setCopied] = useState(false);

  const ttftP95 = snapshot?.ttft_p95 || 0;
  const maxTtftSLO = config.slo.max_ttft_ms;
  const isTtftPass = ttftP95 > 0 ? ttftP95 <= maxTtftSLO : true;

  const tpotMean = snapshot?.tpot_mean || 0;
  const maxTpotSLO = config.slo.max_tpot_ms;
  const isTpotPass = tpotMean > 0 ? tpotMean <= maxTpotSLO : true;

  const goodput = snapshot?.goodput_pct ?? 100;
  const isGoodputOptimal = goodput >= 95.0;

  const errorRate = snapshot?.error_rate_pct || 0;
  const maxErrorSLO = config.slo.max_error_rate_pct;
  const isErrorPass = errorRate <= maxErrorSLO;

  const maxItl = snapshot?.max_itl || 0;
  const isItlSmooth = maxItl <= 120.0;

  const currentSpend = snapshot?.current_spend_usd || 0;
  const hardCap = config.hard_spend_cap || 2.0;
  const isSpendProtected = currentSpend <= hardCap;

  const handleCopyTable = async () => {
    const markdownTable = `
| Category | Metric | P50 / Nominal | P95 / Tail | SLO Target | Compliance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Latency** | Time to First Token (TTFT) | ${formatMs(snapshot?.ttft_p50)} | ${formatMs(snapshot?.ttft_p95)} (P99: ${formatMs(snapshot?.ttft_p99)}) | ≤ ${formatMs(maxTtftSLO)} | ${isTtftPass ? "PASSED" : "EXCEEDED"} |
| **Latency** | Time Per Output Token (TPOT) | ${formatMs(snapshot?.tpot_mean)} / tok | Mean decode speed | ≤ ${formatMs(maxTpotSLO)} | ${isTpotPass ? "PASSED" : "EXCEEDED"} |
| **Latency** | Inter-Token Latency (ITL) | ${formatMs(snapshot?.itl_p50)} | ${formatMs(snapshot?.itl_p95)} (P99: ${formatMs(snapshot?.itl_p99)}) | — | ${isItlSmooth ? "SMOOTH" : "JITTER"} |
| **Latency** | Max Token Stream Freeze | ${formatMs(snapshot?.max_itl)} | Worst single pause | ≤ 200 ms | ${isItlSmooth ? "OPTIMAL" : "DEGRADED"} |
| **Throughput** | Output Token Velocity (TPS) | ${(snapshot?.current_tps || 0).toFixed(1)} tok/s | Cluster aggregate | — | ACTIVE |
| **Throughput** | Request Rate (RPS) | ${(snapshot?.current_rps || 0).toFixed(1)} req/s | Across ${config.concurrency} streams | — | STEADY |
| **Reliability** | Goodput (SLO Yield) | ${formatPct(snapshot?.goodput_pct)} | ${snapshot?.completed_requests} passed / ${snapshot?.failed_requests} failed | ≥ 99.0% | ${isGoodputOptimal ? "OPTIMAL" : "BELOW SLO"} |
| **Reliability** | Error Rate | ${formatPct(snapshot?.error_rate_pct)} | ${snapshot?.failed_requests} dropped | ≤ ${formatPct(maxErrorSLO)} | ${isErrorPass ? "PASSED" : "FAILED"} |
| **Waterfall** | DNS Resolution | ${formatMs(snapshot?.waterfall_avg?.dns_ms)} | Socket lookup | — | OPTIMAL |
| **Waterfall** | TCP Handshake | ${formatMs(snapshot?.waterfall_avg?.tcp_ms)} | Round-trip SYN/ACK | — | OPTIMAL |
| **Waterfall** | TLS Crypto Handshake | ${formatMs(snapshot?.waterfall_avg?.tls_ms)} | TLS 1.3 negotiation | — | OPTIMAL |
| **Economics** | Total Billed Spend | ${formatUsd(snapshot?.current_spend_usd)} | Hard Cap: ${formatUsd(hardCap)} | ≤ ${formatUsd(hardCap)} | ${isSpendProtected ? "PROTECTED" : "CAP REACHED"} |
`.trim();

    await navigator.clipboard.writeText(markdownTable);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                Executive KPI Benchmark Telemetry Matrix
              </CardTitle>
              <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                Detailed latency percentiles, throughput velocity, SLO yield compliance, and token economics
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyTable}
              className="h-8 text-xs font-medium px-3 rounded-lg gap-1.5 cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300">Copied table!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                  <span>Copy table</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#2C2C2C]/5 dark:bg-[#F3F4F4]/5 hover:bg-[#2C2C2C]/5 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                <TableHead className="w-[34%] font-semibold text-[11px] uppercase tracking-wider text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 py-3 pl-4">
                  Dimension & Metric
                </TableHead>
                <TableHead className="w-[18%] font-semibold text-[11px] uppercase tracking-wider text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 py-3">
                  P50 / Nominal
                </TableHead>
                <TableHead className="w-[22%] font-semibold text-[11px] uppercase tracking-wider text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 py-3">
                  Tail Latency (P95 / P99)
                </TableHead>
                <TableHead className="w-[13%] font-semibold text-[11px] uppercase tracking-wider text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 py-3">
                  SLO Target
                </TableHead>
                <TableHead className="w-[13%] font-semibold text-[11px] uppercase tracking-wider text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 py-3 text-right pr-4">
                  Compliance
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="text-xs">
              {/* ========================================================================= */}
              {/* 1. LATENCY & RESPONSIVENESS GROUP                                         */}
              {/* ========================================================================= */}
              <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[10px] font-sans">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5" />
                    <span>1. Latency & Responsiveness Dynamics</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* TTFT */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Time to First Token (TTFT)</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    Prefill computation + socket handshake before first token stream arrives
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                  {formatMs(snapshot?.ttft_p50)}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                  <span>P95: <strong>{formatMs(snapshot?.ttft_p95)}</strong></span>
                  <span className="text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40 mx-1.5">|</span>
                  <span className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">P99: {formatMs(snapshot?.ttft_p99)}</span>
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                  ≤ {formatMs(maxTtftSLO)}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant={isTtftPass ? "emerald" : "destructive"} className="text-[10px] font-mono">
                    {isTtftPass ? "Passed" : "Breached"}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* TTFA (Reasoning Models) */}
              {snapshot?.ttfa_p50 !== null && snapshot?.ttfa_p50 !== undefined && (
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#612D53] dark:bg-[#C57BB2]" />
                      <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Time to First Answer (TTFA)</span>
                    </div>
                    <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                      Elapsed latency until thinking reasoning trace concludes & user answer starts
                    </p>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-sm text-[#612D53] dark:text-[#C57BB2]">
                    {formatMs(snapshot?.ttfa_p50)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                    P95: <strong>{formatMs(snapshot?.ttfa_p95)}</strong>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                    —
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Badge variant="secondary" className="text-[10px] font-mono">Reasoning</Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* TPOT */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Time Per Output Token (TPOT)</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    Hardware decode cycle duration (inverse of single-stream generation speed)
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                  {formatMs(snapshot?.tpot_mean)} / tok
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                  Mean decode throughput
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                  ≤ {formatMs(maxTpotSLO)}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant={isTpotPass ? "emerald" : "destructive"} className="text-[10px] font-mono">
                    {isTpotPass ? "Passed" : "Breached"}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* ITL */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Inter-Token Latency (ITL / Jitter)</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    Delta spacing between consecutive streaming chunks (delivery smoothness)
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                  {formatMs(snapshot?.itl_p50)}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                  <span>P95: <strong>{formatMs(snapshot?.itl_p95)}</strong></span>
                  <span className="text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40 mx-1.5">|</span>
                  <span className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">P99: {formatMs(snapshot?.itl_p99)}</span>
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                  —
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant={isItlSmooth ? "emerald" : "violet"} className="text-[10px] font-mono">
                    {isItlSmooth ? "Smooth" : "Jitter"}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* Max ITL Freeze */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Max Token Stream Freeze</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    The single longest latency freeze/stall experienced between any two tokens
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                  {formatMs(snapshot?.max_itl)}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                  Peak worst pause
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                  ≤ 200.0 ms
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant={isItlSmooth ? "secondary" : "destructive"} className="text-[10px] font-mono">
                    {isItlSmooth ? "No Stall" : "Stall Detected"}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* ========================================================================= */}
              {/* 2. THROUGHPUT & TRANSACTIONAL CAPACITY                                    */}
              {/* ========================================================================= */}
              <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[10px] font-sans">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    <span>2. Throughput & Cluster Capacity</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* TPS */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Decode Token Velocity (TPS)</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    Cluster-wide aggregate generation output tokens per second across all workers
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {(snapshot?.current_tps || 0).toFixed(1)} tok/s
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 tabular-nums">
                  Active aggregate
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                  —
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant="emerald" className="text-[10px] font-mono">Active</Badge>
                </TableCell>
              </TableRow>

              {/* RPS */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Request Throughput (RPS)</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    Completed transactional volume per elapsed wall-clock second
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-[#2C2C2C] dark:text-[#F3F4F4] tabular-nums">
                  {(snapshot?.current_rps || 0).toFixed(1)} req/s
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 tabular-nums">
                  {config.concurrency} concurrent streams
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                  —
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant="secondary" className="text-[10px] font-mono">Sustained</Badge>
                </TableCell>
              </TableRow>

              {/* ========================================================================= */}
              {/* 3. RELIABILITY & STRICT SLO YIELD                                         */}
              {/* ========================================================================= */}
              <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[10px] font-sans">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>3. Reliability & Strict SLO Compliance</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* Goodput */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Goodput % (SLO Yield Rate)</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    Percentage of total requests strictly satisfying TTFT, TPOT, E2E & error SLAs
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatPct(snapshot?.goodput_pct)}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 tabular-nums">
                  {snapshot?.completed_requests || 0} passed / {snapshot?.failed_requests || 0} failed
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 tabular-nums">
                  ≥ 99.0%
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant={isGoodputOptimal ? "emerald" : "destructive"} className="text-[10px] font-mono">
                    {isGoodputOptimal ? "100% Meets" : "SLA Missed"}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* Error Rate */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Transaction Error Rate</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    Network drops, rate limits (429), gateway timeouts (504), or dropped connections
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-[#2C2C2C] dark:text-[#F3F4F4] tabular-nums">
                  {formatPct(snapshot?.error_rate_pct)}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 tabular-nums">
                  {snapshot?.failed_requests || 0} failed requests
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 tabular-nums">
                  ≤ {formatPct(maxErrorSLO)}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant={isErrorPass ? "emerald" : "destructive"} className="text-[10px] font-mono">
                    {isErrorPass ? "Zero Errors" : "Failures"}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* ========================================================================= */}
              {/* 4. NETWORK TRANSPORT WATERFALL (DNS, TCP, TLS)                            */}
              {/* ========================================================================= */}
              <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[10px] font-sans">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    <span>4. Physical Network Transport Waterfall</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* DNS */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#612D53] dark:bg-[#C57BB2]" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">DNS Hostname Lookup</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    Domain name to socket IP resolution latency
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-[#2C2C2C] dark:text-[#F3F4F4] tabular-nums">
                  {formatMs(snapshot?.waterfall_avg?.dns_ms)}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                  Socket connect stage
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                  —
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant="secondary" className="text-[10px] font-mono">Optimal</Badge>
                </TableCell>
              </TableRow>

              {/* TCP */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#612D53] dark:bg-[#C57BB2]" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">TCP Connection Handshake</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    SYN / ACK round-trip socket connection establish
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-[#2C2C2C] dark:text-[#F3F4F4] tabular-nums">
                  {formatMs(snapshot?.waterfall_avg?.tcp_ms)}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                  Socket connect stage
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                  —
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant="secondary" className="text-[10px] font-mono">Optimal</Badge>
                </TableCell>
              </TableRow>

              {/* TLS */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#612D53] dark:bg-[#C57BB2]" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">TLS Crypto Handshake</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    TLS 1.3 cryptographic key negotiation and cipher exchange
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-[#2C2C2C] dark:text-[#F3F4F4] tabular-nums">
                  {formatMs(snapshot?.waterfall_avg?.tls_ms)}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                  Cryptographic handshake
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                  —
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant="secondary" className="text-[10px] font-mono">Optimal</Badge>
                </TableCell>
              </TableRow>

              {/* ========================================================================= */}
              {/* 5. FINANCIAL SPEND & TOKEN ECONOMICS                                      */}
              {/* ========================================================================= */}
              <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[10px] font-sans">
                  <div className="flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5" />
                    <span>5. Financial Spend & Token Economics</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* Spend */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Total Incurred Financial Spend</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    Accumulated dollar spend tracked in microsecond process RAM
                  </p>
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                  {formatUsd(snapshot?.current_spend_usd)}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                  Hard Cap: {formatUsd(hardCap)}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                  ≤ {formatUsd(hardCap)}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant={isSpendProtected ? "emerald" : "destructive"} className="text-[10px] font-mono">
                    {isSpendProtected ? "Protected" : "Cap Hit"}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
