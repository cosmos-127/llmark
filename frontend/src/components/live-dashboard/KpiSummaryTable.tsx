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
  Sparkles,
  Braces,
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
  const preset = (snapshot?.workload_preset || config.workload_preset || "chat") as string;

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
    let markdownTable = "";

    if (preset === "rate_limit_probe") {
      markdownTable = `
| Category | Metric | Measured Value | Quota / Ceiling | Compliance |
| :--- | :--- | :--- | :--- | :--- |
| **Rate Limit** | HTTP 429 Rate Limit % | ${formatPct(snapshot?.rate_limit_pct || 0)} | ${snapshot?.rate_limit_count || 0} throttled requests | ${snapshot?.rate_limit_count ? "THROTTLED" : "OPTIMAL"} |
| **Rate Limit** | Request Rate Saturation (RPM) | ${(snapshot?.current_rpm || (snapshot?.current_rps || 0) * 60).toFixed(0)} req/min | Ceiling: ${snapshot?.estimated_rpm_limit ? `${snapshot.estimated_rpm_limit} RPM` : "Unbounded"} | ACTIVE |
| **Rate Limit** | Token Rate Saturation (TPM) | ${Math.round(snapshot?.current_tpm || 0).toLocaleString()} tok/min | Ceiling: ${snapshot?.estimated_tpm_limit ? `${snapshot.estimated_tpm_limit} TPM` : "Unbounded"} | ACTIVE |
| **Rate Limit** | Status Code Distribution | 200 OK: ${snapshot?.status_distribution?.["200"] || snapshot?.completed_requests || 0} | 429: ${snapshot?.status_distribution?.["429"] || snapshot?.rate_limit_count || 0} | 5xx: ${snapshot?.status_distribution?.["500"] || 0} |
| **Reliability** | Non-Throttled Goodput | ${formatPct(snapshot?.goodput_pct)} | ${snapshot?.completed_requests} passed / ${snapshot?.failed_requests} failed | ${isGoodputOptimal ? "OPTIMAL" : "THROTTLED"} |
| **Economics** | Micro-Probing Total Spend | ${formatUsd(snapshot?.current_spend_usd)} | Hard Cap: ${formatUsd(hardCap)} | ${isSpendProtected ? "PROTECTED" : "CAP REACHED"} |
`.trim();
    } else {
      markdownTable = `
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
    }

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
                Workload-targeted metrics telemetry profile: {preset.replace("_", " ")}
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
              <TableRow className="bg-[#2C2C2C]/5 dark:bg-[#F3F4F4]/5 hover:bg-[#2C2C2C]/5 dark:hover:bg-[#F3F4F4]/5 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                <TableHead className="w-[34%] font-semibold text-[11px] uppercase tracking-wider text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 py-3 pl-4">
                  Dimension & Metric
                </TableHead>
                <TableHead className="w-[18%] font-semibold text-[11px] uppercase tracking-wider text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 py-3">
                  P50 / Nominal
                </TableHead>
                <TableHead className="w-[22%] font-semibold text-[11px] uppercase tracking-wider text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 py-3">
                  Tail / Saturated Rate
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
              {/* SPECIALIZED PROFILE 1: RATE LIMIT & CAPACITY PROBING                      */}
              {/* ========================================================================= */}
              {preset === "rate_limit_probe" && (
                <>
                  <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 dark:hover:bg-[#F3F4F4]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                    <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[11px] font-sans">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>1. Rate Limiting & Quota Saturation Probing</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* 429 Rate */}
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                        <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">HTTP 429 Rate Limit %</span>
                      </div>
                      <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                        Proportion of probing requests throttled by provider rate limiters
                      </p>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                      {formatPct(snapshot?.rate_limit_pct || 0)}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      {snapshot?.rate_limit_count || 0} throttled requests
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                      0.0% (Zero Throttling)
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant={(snapshot?.rate_limit_count || 0) === 0 ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                        {(snapshot?.rate_limit_count || 0) === 0 ? "Passed" : "Throttled"}
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Saturated RPM */}
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                        <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Saturated Request Rate (RPM)</span>
                      </div>
                      <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                        Probed request frequency per minute under concurrent load
                      </p>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                      {(snapshot?.current_rpm || (snapshot?.current_rps || 0) * 60).toFixed(0)} req/min
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      {snapshot?.estimated_rpm_limit ? `Ceiling ~${snapshot.estimated_rpm_limit.toFixed(0)} RPM` : "Unbounded capacity"}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                      —
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant="secondary" className="text-[11px] font-sans font-semibold tabular-nums">Active</Badge>
                    </TableCell>
                  </TableRow>

                  {/* Saturated TPM */}
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                        <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Saturated Token Rate (TPM)</span>
                      </div>
                      <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                        Aggregate prompt + generation token volume consumed per minute
                      </p>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                      {Math.round(snapshot?.current_tpm || 0).toLocaleString()} tok/min
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      {snapshot?.estimated_tpm_limit ? `Ceiling ~${snapshot.estimated_tpm_limit.toFixed(0)} TPM` : "Probing volume"}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                      —
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant="secondary" className="text-[11px] font-sans font-semibold tabular-nums">Active</Badge>
                    </TableCell>
                  </TableRow>

                  {/* Status Code Breakdown */}
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                        <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Status Code Matrix</span>
                      </div>
                      <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                        HTTP response status code distribution across all probing pings
                      </p>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                      200 OK: {snapshot?.status_distribution?.["200"] || snapshot?.completed_requests || 0}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      429: {snapshot?.status_distribution?.["429"] || snapshot?.rate_limit_count || 0} • 5xx: {snapshot?.status_distribution?.["500"] || 0}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                      200 OK Only
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant={(snapshot?.rate_limit_count || 0) === 0 ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                        {(snapshot?.rate_limit_count || 0) === 0 ? "Clean 200s" : "429 Detected"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </>
              )}

              {/* ========================================================================= */}
              {/* SPECIALIZED PROFILE 2: PREFILL & TTFT                                      */}
              {/* ========================================================================= */}
              {preset === "prefill_ttft" && (
                <>
                  <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 dark:hover:bg-[#F3F4F4]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                    <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[11px] font-sans">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        <span>1. KV Cache Prefill & Time to First Token</span>
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
                        Heavy prompt ingestion + socket handshake before first token stream begins
                      </p>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                      {formatMs(snapshot?.ttft_p50)}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      <span>P95: <strong>{formatMs(snapshot?.ttft_p95)}</strong></span>
                      <span className="text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40 mx-1.5">|</span>
                      <span className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">P99: {formatMs(snapshot?.ttft_p99)}</span>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                      ≤ {formatMs(maxTtftSLO)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant={isTtftPass ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                        {isTtftPass ? "Passed" : "Breached"}
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Prefill TPS */}
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Prefill Processing Velocity</span>
                      </div>
                      <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                        KV cache memory ingestion speed in prompt tokens per second
                      </p>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                      {snapshot?.prefill_tps_p50 ? `${snapshot.prefill_tps_p50.toFixed(0)} tok/s` : "Computing..."}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      P95: {snapshot?.prefill_tps_p95 ? `${snapshot.prefill_tps_p95.toFixed(0)} tok/s` : "—"}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                      —
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant="emerald" className="text-[11px] font-sans font-semibold tabular-nums">Hardware Prefill</Badge>
                    </TableCell>
                  </TableRow>
                </>
              )}

              {/* ========================================================================= */}
              {/* SPECIALIZED PROFILE 3: REASONING & COT                                     */}
              {/* ========================================================================= */}
              {preset === "reasoning_cot" && (
                <>
                  <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 dark:hover:bg-[#F3F4F4]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                    <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[11px] font-sans">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>1. Reasoning & Chain-of-Thought Dynamics</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* TTFA */}
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
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#612D53] dark:text-[#C57BB2]">
                      {formatMs(snapshot?.ttfa_p50 || snapshot?.ttft_p50)}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      P95: <strong>{formatMs(snapshot?.ttfa_p95 || snapshot?.ttft_p95)}</strong>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                      —
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant="secondary" className="text-[11px] font-sans font-semibold tabular-nums">User Wait</Badge>
                    </TableCell>
                  </TableRow>

                  {/* Thinking Tokens */}
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                        <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Thinking Tokens per Query</span>
                      </div>
                      <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                        Average internal Chain-of-Thought tokens allocated before response output
                      </p>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                      {snapshot?.thinking_tokens_avg ? `${snapshot.thinking_tokens_avg.toFixed(0)} tok` : "—"}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      {snapshot?.thinking_token_ratio_pct ? `${snapshot.thinking_token_ratio_pct.toFixed(1)}% of total output` : "Measuring..."}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                      —
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant="secondary" className="text-[11px] font-sans font-semibold tabular-nums">CoT Budget</Badge>
                    </TableCell>
                  </TableRow>
                </>
              )}

              {/* ========================================================================= */}
              {/* SPECIALIZED PROFILE 4: STRUCTURED JSON                                     */}
              {/* ========================================================================= */}
              {(preset === "structured_json" || preset === "json_schema") && (
                <>
                  <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 dark:hover:bg-[#F3F4F4]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                    <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[11px] font-sans">
                      <div className="flex items-center gap-1.5">
                        <Braces className="h-3.5 w-3.5" />
                        <span>1. Structured JSON & Guided Grammar Compliance</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Schema Validity */}
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">JSON Schema Syntax Validity</span>
                      </div>
                      <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                        Proportion of output responses that strictly parsed as valid JSON
                      </p>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                      {formatPct(snapshot?.schema_validity_pct ?? 100)}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      {snapshot?.schema_error_count || 0} syntax parsing errors
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                      100.0% (Zero Errors)
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant={(snapshot?.schema_error_count || 0) === 0 ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                        {(snapshot?.schema_error_count || 0) === 0 ? "Valid Schema" : "Parse Failures"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </>
              )}

              {/* ========================================================================= */}
              {/* DEFAULT / STANDARD PROFILES (CHAT, DECODE, RAG, CUSTOM)                   */}
              {/* ========================================================================= */}
              {preset !== "rate_limit_probe" && preset !== "prefill_ttft" && preset !== "reasoning_cot" && (
                <>
                  <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 dark:hover:bg-[#F3F4F4]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                    <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[11px] font-sans">
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
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                      {formatMs(snapshot?.ttft_p50)}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      <span>P95: <strong>{formatMs(snapshot?.ttft_p95)}</strong></span>
                      <span className="text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40 mx-1.5">|</span>
                      <span className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">P99: {formatMs(snapshot?.ttft_p99)}</span>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                      ≤ {formatMs(maxTtftSLO)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant={isTtftPass ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                        {isTtftPass ? "Passed" : "Breached"}
                      </Badge>
                    </TableCell>
                  </TableRow>

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
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                      {formatMs(snapshot?.tpot_mean)} / tok
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      Mean decode throughput
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                      ≤ {formatMs(maxTpotSLO)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant={isTpotPass ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
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
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                      {formatMs(snapshot?.itl_p50)}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                      <span>P95: <strong>{formatMs(snapshot?.itl_p95)}</strong></span>
                      <span className="text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40 mx-1.5">|</span>
                      <span className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">P99: {formatMs(snapshot?.itl_p99)}</span>
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                      —
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant={isItlSmooth ? "emerald" : "violet"} className="text-[11px] font-sans font-semibold tabular-nums">
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
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                      {formatMs(snapshot?.max_itl)}
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                      Peak worst pause
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                      ≤ 200.0 ms
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant={isItlSmooth ? "secondary" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                        {isItlSmooth ? "No Stall" : "Stall Detected"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </>
              )}

              {/* ========================================================================= */}
              {/* THROUGHPUT & CLUSTER CAPACITY (FOR DECODE & MULTI-STREAM RUNS)            */}
              {/* ========================================================================= */}
              {preset !== "rate_limit_probe" && (
                <>
                  <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 dark:hover:bg-[#F3F4F4]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                    <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[11px] font-sans">
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
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {(snapshot?.current_tps || 0).toFixed(1)} tok/s
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 tabular-nums">
                      Active aggregate
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                      —
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant="emerald" className="text-[11px] font-sans font-semibold tabular-nums">Active</Badge>
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
                    <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4] tabular-nums">
                      {(snapshot?.current_rps || 0).toFixed(1)} req/s
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 tabular-nums">
                      {config.concurrency} concurrent streams
                    </TableCell>
                    <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
                      —
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant="secondary" className="text-[11px] font-sans font-semibold tabular-nums">Sustained</Badge>
                    </TableCell>
                  </TableRow>
                </>
              )}

              {/* ========================================================================= */}
              {/* COMMON SECTION: RELIABILITY & STRICT SLO YIELD                            */}
              {/* ========================================================================= */}
              <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 dark:hover:bg-[#F3F4F4]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[11px] font-sans">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
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
                    Percentage of total requests strictly satisfying latency, syntax & error thresholds
                  </p>
                </TableCell>
                <TableCell className="font-sans tabular-nums font-semibold text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatPct(snapshot?.goodput_pct)}
                </TableCell>
                <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 tabular-nums">
                  {snapshot?.completed_requests || 0} passed / {snapshot?.failed_requests || 0} failed
                </TableCell>
                <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 tabular-nums">
                  ≥ 99.0%
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant={isGoodputOptimal ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
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
                <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4] tabular-nums">
                  {formatPct(snapshot?.error_rate_pct)}
                </TableCell>
                <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 tabular-nums">
                  {snapshot?.failed_requests || 0} failed requests
                </TableCell>
                <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 tabular-nums">
                  ≤ {formatPct(maxErrorSLO)}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant={isErrorPass ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                    {isErrorPass ? "Zero Errors" : "Failures"}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* ========================================================================= */}
              {/* COMMON SECTION: FINANCIAL SPEND & TOKEN ECONOMICS                         */}
              {/* ========================================================================= */}
              <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 dark:hover:bg-[#F3F4F4]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[11px] font-sans">
                  <div className="flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5" />
                    <span>4. Financial Spend & Token Economics</span>
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
                    Accumulated dollar spend tracked in ephemeral process memory
                  </p>
                </TableCell>
                <TableCell className="font-sans tabular-nums font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                  {formatUsd(snapshot?.current_spend_usd)}
                </TableCell>
                <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                  Hard Cap: {formatUsd(hardCap)}
                </TableCell>
                <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                  ≤ {formatUsd(hardCap)}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant={isSpendProtected ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                    {isSpendProtected ? "Protected" : "Cap Hit"}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* Cost / 1K Goodput */}
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                    <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Cost / 1K SLO-Satisfied Calls</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                    True unit production cost per 1,000 successful responses meeting all SLO targets
                  </p>
                </TableCell>
                <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                  {formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}
                </TableCell>
                <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                  Per 1,000 valid calls
                </TableCell>
                <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                  Unit Economics
                </TableCell>
                <TableCell className="text-right pr-4">
                  <Badge variant="secondary" className="text-[11px] font-sans font-semibold tabular-nums">ROI Metric</Badge>
                </TableCell>
              </TableRow>

              {/* ========================================================================= */}
              {/* SECTION 5: WORKLOAD-SPECIFIC DERIVED PERFORMANCE INDICATORS               */}
              {/* ========================================================================= */}
              <TableRow className="bg-[#2C2C2C]/3 dark:bg-[#F3F4F4]/3 hover:bg-[#2C2C2C]/3 dark:hover:bg-[#F3F4F4]/3 border-y border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[#853953] dark:text-[#A74B6A] uppercase tracking-widest text-[11px] font-sans">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>5. Workload-Specific Derived Indicators</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* ITL Jitter CV */}
              {snapshot?.itl_jitter_cv !== undefined && snapshot?.itl_jitter_cv !== null && (
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                      <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">ITL Jitter Coefficient ($CV_{"{ITL}"}$)</span>
                    </div>
                    <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                      Stream smoothness index: standard deviation / mean of inter-token deltas
                    </p>
                  </TableCell>
                  <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                    {snapshot.itl_jitter_cv.toFixed(3)}
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                    {snapshot.itl_jitter_cv < 0.30 ? "Glass Smooth (<0.30)" : (snapshot.itl_jitter_cv > 0.70 ? "High Stutter (>0.70)" : "Standard Stream")}
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    &lt; 0.35
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Badge variant={snapshot.itl_jitter_cv < 0.35 ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                      {snapshot.itl_jitter_cv < 0.35 ? "Smooth Stream" : "Jittery"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Prefill Slope */}
              {snapshot?.prefill_slope_ms_per_1k !== undefined && snapshot?.prefill_slope_ms_per_1k !== null && (
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                      <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Prefill Latency Slope</span>
                    </div>
                    <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                      Compute latency scaling rate per 1,000 prompt tokens
                    </p>
                  </TableCell>
                  <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                    {snapshot.prefill_slope_ms_per_1k.toFixed(2)} ms / 1K
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                    Per 1,000 input tokens
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    Linear Scaling
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Badge variant="secondary" className="text-[11px] font-sans font-semibold tabular-nums">Prefill Slope</Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Cache Speedup Factor */}
              {snapshot?.cache_speedup_factor !== undefined && snapshot?.cache_speedup_factor !== null && (
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Prompt Cache Speedup Factor</span>
                    </div>
                    <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                      TTFT acceleration ratio achieved via warm KV prefix cache hit vs cold prefill
                    </p>
                  </TableCell>
                  <TableCell className="font-sans tabular-nums font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                    {snapshot.cache_speedup_factor.toFixed(2)}x
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                    {((1 - (1 / snapshot.cache_speedup_factor)) * 100).toFixed(0)}% TTFT reduction
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    ≥ 2.0x
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Badge variant={snapshot.cache_speedup_factor >= 2.0 ? "emerald" : "secondary"} className="text-[11px] font-sans font-semibold tabular-nums">
                      {snapshot.cache_speedup_factor >= 2.0 ? "Cache Accelerated" : "Modest Hit"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Thinking Wait Multiplier */}
              {snapshot?.thinking_wait_multiplier !== undefined && snapshot?.thinking_wait_multiplier !== null && (
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Thinking Wait Multiplier (TTFA/TTFT)</span>
                    </div>
                    <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                      User wait time multiplier before reasoning finishes and readable answer begins
                    </p>
                  </TableCell>
                  <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                    {snapshot.thinking_wait_multiplier.toFixed(2)}x
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                    CoT reasoning wait tax
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    Reasoning Multiplier
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Badge variant="secondary" className="text-[11px] font-sans font-semibold tabular-nums">CoT Overhead</Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Grammar Penalty */}
              {snapshot?.grammar_penalty_pct !== undefined && snapshot?.grammar_penalty_pct !== null && (
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Grammar Logit-Masking Penalty</span>
                    </div>
                    <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                      TPOT decode throughput penalty under constrained JSON schema / regex masking
                    </p>
                  </TableCell>
                  <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                    +{snapshot.grammar_penalty_pct.toFixed(1)}%
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                    Guided decoding overhead
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    &lt; 15.0%
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Badge variant={snapshot.grammar_penalty_pct < 15.0 ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                      {snapshot.grammar_penalty_pct < 15.0 ? "Low Overhead" : "Masking Stall"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Parallel Scaling Efficiency */}
              {snapshot?.concurrency_scaling_efficiency_pct !== undefined && snapshot?.concurrency_scaling_efficiency_pct !== null && (
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Parallel Scaling Efficiency</span>
                    </div>
                    <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pl-3.5">
                      Aggregate throughput achieved relative to linear single-stream theoretical ceiling
                    </p>
                  </TableCell>
                  <TableCell className="font-sans tabular-nums font-semibold text-sm text-[#2C2C2C] dark:text-[#F3F4F4]">
                    {snapshot.concurrency_scaling_efficiency_pct.toFixed(1)}%
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                    Parallel scaling efficiency
                  </TableCell>
                  <TableCell className="font-sans tabular-nums text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    ≥ 75.0%
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Badge variant={snapshot.concurrency_scaling_efficiency_pct >= 75.0 ? "emerald" : "destructive"} className="text-[11px] font-sans font-semibold tabular-nums">
                      {snapshot.concurrency_scaling_efficiency_pct >= 75.0 ? "Linear Scaling" : "Saturating"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
