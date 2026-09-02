import React, { useState } from "react";
import {
  Gauge,
  Zap,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Activity,
  ShieldCheck,
  Clock,
  Layers,
  Sparkles,
  Braces,
  Copy,
  Check,
  Network,
  FileCode,
  MessagesSquare,
  BookOpen,
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

interface KpiSummaryTableProps {
  snapshot: MetricsSnapshot | null;
  config: BenchmarkConfig;
}

interface MetricRowData {
  dimension: string;
  dimensionIcon: React.ElementType;
  metric: string;
  description: string;
  p50: string | React.ReactNode;
  tail: string | React.ReactNode;
  slo: string;
  badgeText: string;
  badgeVariant: "emerald" | "destructive" | "secondary" | "default" | "violet";
}

export const KpiSummaryTable: React.FC<KpiSummaryTableProps> = ({ snapshot, config }) => {
  const [copied, setCopied] = useState(false);
  const preset = (snapshot?.workload_preset || config.workload_preset || "chat_interactive") as string;

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

  // Build strictly preset-relevant rows
  const buildMetricRows = (): MetricRowData[] => {
    // 1. Rate Limit & Quota Probing
    if (preset === "rate_limit_probe") {
      const rateLimitCount = snapshot?.rate_limit_count || 0;
      const rateLimitPct = snapshot?.rate_limit_pct || 0;
      return [
        {
          dimension: "Rate Limiting & Quota Saturation",
          dimensionIcon: ShieldCheck,
          metric: "HTTP 429 Rate Limit %",
          description: "Proportion of probing requests throttled by provider rate limiters",
          p50: formatPct(rateLimitPct),
          tail: `${rateLimitCount} throttled / ${snapshot?.total_requests || 0} calls`,
          slo: "0.0% (Zero Throttling)",
          badgeText: rateLimitCount === 0 ? "Passed" : "Throttled",
          badgeVariant: rateLimitCount === 0 ? "emerald" : "destructive",
        },
        {
          dimension: "Rate Limiting & Quota Saturation",
          dimensionIcon: ShieldCheck,
          metric: "Saturated Request Rate (RPM)",
          description: "Probed request frequency per minute under concurrent load",
          p50: `${(snapshot?.current_rpm || (snapshot?.current_rps || 0) * 60).toFixed(0)} req/min`,
          tail: snapshot?.estimated_rpm_limit ? `Ceiling ~${snapshot.estimated_rpm_limit.toFixed(0)} RPM` : "Unbounded",
          slo: "—",
          badgeText: "Active",
          badgeVariant: "secondary",
        },
        {
          dimension: "Rate Limiting & Quota Saturation",
          dimensionIcon: ShieldCheck,
          metric: "Saturated Token Rate (TPM)",
          description: "Aggregate token volume consumed per minute",
          p50: `${Math.round(snapshot?.current_tpm || 0).toLocaleString()} tok/min`,
          tail: snapshot?.estimated_tpm_limit ? `Ceiling ~${snapshot.estimated_tpm_limit.toFixed(0)} TPM` : "Probing volume",
          slo: "—",
          badgeText: "Active",
          badgeVariant: "secondary",
        },
        {
          dimension: "Rate Limiting & Quota Saturation",
          dimensionIcon: ShieldCheck,
          metric: "HTTP Response Distribution",
          description: "Response status code distribution across all probing requests",
          p50: `200 OK: ${snapshot?.status_distribution?.["200"] || snapshot?.completed_requests || 0}`,
          tail: `429: ${snapshot?.status_distribution?.["429"] || rateLimitCount} • 5xx: ${snapshot?.status_distribution?.["500"] || 0}`,
          slo: "200 OK Only",
          badgeText: rateLimitCount === 0 ? "Clean 200s" : "429 Detected",
          badgeVariant: rateLimitCount === 0 ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Availability",
          dimensionIcon: CheckCircle2,
          metric: "Non-Throttled Goodput Yield",
          description: "Percentage of micro-calls succeeding without HTTP 429 backoff",
          p50: formatPct(goodput),
          tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} dropped`,
          slo: "≥ 99.0%",
          badgeText: isGoodputOptimal ? "Optimal" : "Degraded",
          badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
        },
        {
          dimension: "Economics",
          dimensionIcon: DollarSign,
          metric: "Micro-Probing Total Spend",
          description: "Accumulated dollar cost across micro-token probing pings",
          p50: formatUsd(currentSpend),
          tail: `Hard Cap: ${formatUsd(hardCap)}`,
          slo: `≤ ${formatUsd(hardCap)}`,
          badgeText: isSpendProtected ? "Protected" : "Breached",
          badgeVariant: isSpendProtected ? "emerald" : "destructive",
        },
      ];
    }

    // 2. Prefill Scaling & TTFT
    if (preset === "prefill_ttft") {
      return [
        {
          dimension: "KV Cache Prefill Scaling",
          dimensionIcon: Layers,
          metric: "Time to First Token (TTFT)",
          description: "Heavy prompt ingestion latency before first token stream begins",
          p50: formatMs(snapshot?.ttft_p50),
          tail: `P95: ${formatMs(snapshot?.ttft_p95)} (P99: ${formatMs(snapshot?.ttft_p99)})`,
          slo: `≤ ${formatMs(maxTtftSLO)}`,
          badgeText: isTtftPass ? "Passed" : "Breached",
          badgeVariant: isTtftPass ? "emerald" : "destructive",
        },
        {
          dimension: "KV Cache Prefill Scaling",
          dimensionIcon: Layers,
          metric: "Prefill Processing Velocity",
          description: "KV cache prompt ingestion throughput in prompt tokens per second",
          p50: snapshot?.prefill_tps_p50 ? `${snapshot.prefill_tps_p50.toFixed(0)} tok/s` : "Computing...",
          tail: snapshot?.prefill_tps_p95 ? `P95: ${snapshot.prefill_tps_p95.toFixed(0)} tok/s` : "—",
          slo: "—",
          badgeText: "Active",
          badgeVariant: "emerald",
        },
        {
          dimension: "KV Cache Prefill Scaling",
          dimensionIcon: Layers,
          metric: "Prefill Latency Scaling Slope",
          description: "Incremental TTFT growth per 1,000 prompt tokens",
          p50: snapshot?.prefill_slope_ms_per_1k ? `${snapshot.prefill_slope_ms_per_1k.toFixed(1)} ms/1K` : "Computing...",
          tail: "Linear KV growth rate",
          slo: "≤ 50.0 ms/1K",
          badgeText: (snapshot?.prefill_slope_ms_per_1k || 0) <= 50 ? "Linear" : "Super-linear",
          badgeVariant: (snapshot?.prefill_slope_ms_per_1k || 0) <= 50 ? "emerald" : "destructive",
        },
        {
          dimension: "Network Connection Overhead",
          dimensionIcon: Network,
          metric: "Network Handshake (DNS + TCP + TLS)",
          description: "Transport connection setup before upstream server ingestion",
          p50: formatMs((snapshot?.waterfall_avg?.dns_ms || 0) + (snapshot?.waterfall_avg?.tcp_ms || 0) + (snapshot?.waterfall_avg?.tls_ms || 0)),
          tail: `DNS: ${formatMs(snapshot?.waterfall_avg?.dns_ms)} • TLS: ${formatMs(snapshot?.waterfall_avg?.tls_ms)}`,
          slo: "≤ 100 ms",
          badgeText: "Optimal",
          badgeVariant: "secondary",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: CheckCircle2,
          metric: "Prefill Goodput SLO Yield",
          description: "Percentage of heavy-prompt requests satisfying target TTFT",
          p50: formatPct(goodput),
          tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`,
          slo: "≥ 99.0%",
          badgeText: isGoodputOptimal ? "Optimal" : "Below SLO",
          badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: DollarSign,
          metric: "Prompt Ingestion Total Spend",
          description: "Accumulated dollar cost for large context prefill volume",
          p50: formatUsd(currentSpend),
          tail: `Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`,
          slo: `≤ ${formatUsd(hardCap)}`,
          badgeText: isSpendProtected ? "Protected" : "Breached",
          badgeVariant: isSpendProtected ? "emerald" : "destructive",
        },
      ];
    }

    // 3. Streaming Decode & Generation Jitter
    if (preset === "decode_throughput") {
      const itlCv = snapshot?.itl_jitter_cv;
      return [
        {
          dimension: "Streaming Decode & Jitter",
          dimensionIcon: Zap,
          metric: "Decode Throughput (TPS)",
          description: "Output token generation velocity across all streaming workers",
          p50: `${(snapshot?.current_tps || 0).toFixed(1)} tok/s`,
          tail: `${(snapshot?.current_rps || 0).toFixed(1)} req/s concurrent streams`,
          slo: "—",
          badgeText: "Active",
          badgeVariant: "emerald",
        },
        {
          dimension: "Streaming Decode & Jitter",
          dimensionIcon: Activity,
          metric: "Inter-Token Latency (ITL)",
          description: "Time elapsed between consecutive streaming output tokens",
          p50: formatMs(snapshot?.itl_p50),
          tail: `P95: ${formatMs(snapshot?.itl_p95)} (P99: ${formatMs(snapshot?.itl_p99)})`,
          slo: "≤ 40 ms",
          badgeText: (snapshot?.itl_p95 || 0) <= 40 ? "Smooth" : "Jitter",
          badgeVariant: (snapshot?.itl_p95 || 0) <= 40 ? "emerald" : "destructive",
        },
        {
          dimension: "Streaming Decode & Jitter",
          dimensionIcon: Activity,
          metric: "Stream Smoothness Index (CV)",
          description: "Coefficient of variation of inter-token delays (<0.30 indicates fluid UI typing)",
          p50: itlCv !== undefined && itlCv !== null ? itlCv.toFixed(2) : "Computing...",
          tail: itlCv !== undefined && itlCv !== null && itlCv < 0.30 ? "Glass Smooth" : "Standard",
          slo: "≤ 0.35 CV",
          badgeText: itlCv !== undefined && itlCv !== null && itlCv < 0.35 ? "Fluid" : "Variable",
          badgeVariant: itlCv !== undefined && itlCv !== null && itlCv < 0.35 ? "emerald" : "secondary",
        },
        {
          dimension: "Streaming Decode & Jitter",
          dimensionIcon: AlertTriangle,
          metric: "Max Token Stream Freeze",
          description: "The worst single pause experienced between any two output tokens",
          p50: formatMs(snapshot?.max_itl),
          tail: "Worst decode pause",
          slo: "≤ 150 ms",
          badgeText: isItlSmooth ? "Optimal" : "Degraded",
          badgeVariant: isItlSmooth ? "emerald" : "destructive",
        },
        {
          dimension: "Streaming Decode & Jitter",
          dimensionIcon: Gauge,
          metric: "Time Per Output Token (TPOT)",
          description: "Mean duration required to compute and emit each individual token",
          p50: `${formatMs(snapshot?.tpot_mean)} / tok`,
          tail: "Hardware generation speed",
          slo: `≤ ${formatMs(maxTpotSLO)}`,
          badgeText: isTpotPass ? "Passed" : "Exceeded",
          badgeVariant: isTpotPass ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: CheckCircle2,
          metric: "Decode Goodput SLO Yield",
          description: "Percentage of long decode streams satisfying TPOT thresholds",
          p50: formatPct(goodput),
          tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`,
          slo: "≥ 99.0%",
          badgeText: isGoodputOptimal ? "Optimal" : "Below SLO",
          badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: DollarSign,
          metric: "Output Generation Spend",
          description: "Total dollar spend for long output token generation",
          p50: formatUsd(currentSpend),
          tail: `Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`,
          slo: `≤ ${formatUsd(hardCap)}`,
          badgeText: isSpendProtected ? "Protected" : "Breached",
          badgeVariant: isSpendProtected ? "emerald" : "destructive",
        },
      ];
    }

    // 4. Reasoning & CoT Deep-Dive
    if (preset === "reasoning_cot") {
      const ttfaP95 = snapshot?.ttfa_p95 || snapshot?.ttft_p95 || 0;
      const ttfaP50 = snapshot?.ttfa_p50 || snapshot?.ttft_p50 || 0;
      const thinkingTokens = snapshot?.thinking_tokens_avg || 0;
      const cotRatio = snapshot?.thinking_token_ratio_pct || 0;
      const waitMult = snapshot?.thinking_wait_multiplier || 1.0;

      return [
        {
          dimension: "Reasoning & Chain-of-Thought",
          dimensionIcon: Sparkles,
          metric: "Time to First Answer (TTFA)",
          description: "Total elapsed duration until thinking trace completes and visible answer begins",
          p50: formatMs(ttfaP50),
          tail: `P95: ${formatMs(ttfaP95)}`,
          slo: "≤ 5000 ms",
          badgeText: ttfaP95 <= 5000 ? "Acceptable" : "Long Wait",
          badgeVariant: ttfaP95 <= 5000 ? "emerald" : "destructive",
        },
        {
          dimension: "Reasoning & Chain-of-Thought",
          dimensionIcon: Sparkles,
          metric: "Thinking Tokens per Query",
          description: "Average volume of internal reasoning tokens emitted prior to final answer",
          p50: `${thinkingTokens.toFixed(0)} tokens`,
          tail: `${cotRatio.toFixed(1)}% of total output tokens`,
          slo: "—",
          badgeText: "Measured",
          badgeVariant: "violet",
        },
        {
          dimension: "Reasoning & Chain-of-Thought",
          dimensionIcon: Clock,
          metric: "Thinking Wait Multiplier",
          description: "Ratio of time spent in CoT reasoning vs nominal TTFT",
          p50: `${waitMult.toFixed(1)}x Wait Tax`,
          tail: "vs initial socket TTFT",
          slo: "—",
          badgeText: "CoT Tax",
          badgeVariant: "secondary",
        },
        {
          dimension: "Reasoning & Chain-of-Thought",
          dimensionIcon: Layers,
          metric: "Time to First Token (TTFT)",
          description: "Latency before first internal reasoning token starts streaming",
          p50: formatMs(snapshot?.ttft_p50),
          tail: `P95: ${formatMs(snapshot?.ttft_p95)}`,
          slo: `≤ ${formatMs(maxTtftSLO)}`,
          badgeText: isTtftPass ? "Passed" : "Breached",
          badgeVariant: isTtftPass ? "emerald" : "destructive",
        },
        {
          dimension: "Reasoning & Chain-of-Thought",
          dimensionIcon: Zap,
          metric: "Answer Generation Speed (TPS)",
          description: "Post-thinking final answer token emission throughput",
          p50: `${(snapshot?.current_tps || 0).toFixed(1)} tok/s`,
          tail: `${(snapshot?.current_rps || 0).toFixed(1)} queries/s`,
          slo: "—",
          badgeText: "Active",
          badgeVariant: "emerald",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: CheckCircle2,
          metric: "Reasoning Goodput SLO Yield",
          description: "Percentage of reasoning queries meeting end-to-end latency targets",
          p50: formatPct(goodput),
          tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`,
          slo: "≥ 95.0%",
          badgeText: isGoodputOptimal ? "Optimal" : "Below SLO",
          badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: DollarSign,
          metric: "Reasoning Token Spend",
          description: "Total cost accounting for combined thinking and answer tokens",
          p50: formatUsd(currentSpend),
          tail: `Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`,
          slo: `≤ ${formatUsd(hardCap)}`,
          badgeText: isSpendProtected ? "Protected" : "Breached",
          badgeVariant: isSpendProtected ? "emerald" : "destructive",
        },
      ];
    }

    // 5. Agentic Tool Calling
    if (preset === "agentic_tool_calling" || preset === "tool_calling") {
      const validityPct = snapshot?.schema_validity_pct ?? 100;
      const syntaxErrors = snapshot?.schema_error_count || 0;
      return [
        {
          dimension: "Agentic Tool Execution",
          dimensionIcon: Braces,
          metric: "Tool Call Schema Validity %",
          description: "Percentage of function call invocations strictly matching tool arguments schema",
          p50: formatPct(validityPct),
          tail: `${syntaxErrors} parse failures / ${snapshot?.completed_requests || 0} parsed`,
          slo: "100.0% Valid",
          badgeText: syntaxErrors === 0 ? "100% Valid" : "Errors",
          badgeVariant: syntaxErrors === 0 ? "emerald" : "destructive",
        },
        {
          dimension: "Agentic Tool Execution",
          dimensionIcon: Clock,
          metric: "Tool Definition Ingestion TTFT",
          description: "Time to process complex tool signatures and emit first tool call",
          p50: formatMs(snapshot?.ttft_p50),
          tail: `P95: ${formatMs(snapshot?.ttft_p95)}`,
          slo: `≤ ${formatMs(maxTtftSLO)}`,
          badgeText: isTtftPass ? "Passed" : "Breached",
          badgeVariant: isTtftPass ? "emerald" : "destructive",
        },
        {
          dimension: "Agentic Tool Execution",
          dimensionIcon: Zap,
          metric: "Constrained Tool Calling TPS",
          description: "Execution throughput during guided argument serialization",
          p50: `${(snapshot?.current_tps || 0).toFixed(1)} tok/s`,
          tail: `${(snapshot?.current_rps || 0).toFixed(1)} tool calls/s`,
          slo: "—",
          badgeText: "Active",
          badgeVariant: "emerald",
        },
        {
          dimension: "Agentic Tool Execution",
          dimensionIcon: Gauge,
          metric: "Time Per Output Token (TPOT)",
          description: "Mean decode duration per token under tool schema constraints",
          p50: `${formatMs(snapshot?.tpot_mean)} / tok`,
          tail: "Argument generation pace",
          slo: `≤ ${formatMs(maxTpotSLO)}`,
          badgeText: isTpotPass ? "Passed" : "Exceeded",
          badgeVariant: isTpotPass ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: CheckCircle2,
          metric: "Agentic Goodput SLO Yield",
          description: "Percentage of tool invocations meeting latency and schema requirements",
          p50: formatPct(goodput),
          tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`,
          slo: "≥ 99.0%",
          badgeText: isGoodputOptimal ? "Optimal" : "Below SLO",
          badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: DollarSign,
          metric: "Tool Invocation Spend",
          description: "Total financial spend for multi-tool signature testing",
          p50: formatUsd(currentSpend),
          tail: `Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`,
          slo: `≤ ${formatUsd(hardCap)}`,
          badgeText: isSpendProtected ? "Protected" : "Breached",
          badgeVariant: isSpendProtected ? "emerald" : "destructive",
        },
      ];
    }

    // 6. Code Generation
    if (preset === "code_generation" || preset === "code") {
      return [
        {
          dimension: "Code Syntax & Generation",
          dimensionIcon: FileCode,
          metric: "Code Decode Throughput (TPS)",
          description: "Sustained programming code token emission rate",
          p50: `${(snapshot?.current_tps || 0).toFixed(1)} tok/s`,
          tail: `${(snapshot?.current_rps || 0).toFixed(1)} completions/s`,
          slo: "—",
          badgeText: "Active",
          badgeVariant: "emerald",
        },
        {
          dimension: "Code Syntax & Generation",
          dimensionIcon: Activity,
          metric: "Inter-Token Latency (ITL)",
          description: "Latency between consecutive code tokens during multi-line generation",
          p50: formatMs(snapshot?.itl_p50),
          tail: `P95: ${formatMs(snapshot?.itl_p95)}`,
          slo: "≤ 40 ms",
          badgeText: (snapshot?.itl_p95 || 0) <= 40 ? "Smooth" : "Jitter",
          badgeVariant: (snapshot?.itl_p95 || 0) <= 40 ? "emerald" : "destructive",
        },
        {
          dimension: "Code Syntax & Generation",
          dimensionIcon: AlertTriangle,
          metric: "Syntax Freeze Max ITL",
          description: "Worst pause between tokens (e.g. indentation, bracket balancing stalls)",
          p50: formatMs(snapshot?.max_itl),
          tail: "Worst decode stall",
          slo: "≤ 150 ms",
          badgeText: isItlSmooth ? "Optimal" : "Stall",
          badgeVariant: isItlSmooth ? "emerald" : "destructive",
        },
        {
          dimension: "Code Syntax & Generation",
          dimensionIcon: Gauge,
          metric: "Time Per Output Token (TPOT)",
          description: "Mean decode latency per generated code token",
          p50: `${formatMs(snapshot?.tpot_mean)} / tok`,
          tail: "Code token generation speed",
          slo: `≤ ${formatMs(maxTpotSLO)}`,
          badgeText: isTpotPass ? "Passed" : "Exceeded",
          badgeVariant: isTpotPass ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: CheckCircle2,
          metric: "Code Generation Goodput Yield",
          description: "Percentage of code generation streams satisfying TPOT and error SLOs",
          p50: formatPct(goodput),
          tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`,
          slo: "≥ 99.0%",
          badgeText: isGoodputOptimal ? "Optimal" : "Below SLO",
          badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: DollarSign,
          metric: "Code Generation Spend",
          description: "Total dollar cost for code syntax benchmark calls",
          p50: formatUsd(currentSpend),
          tail: `Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`,
          slo: `≤ ${formatUsd(hardCap)}`,
          badgeText: isSpendProtected ? "Protected" : "Breached",
          badgeVariant: isSpendProtected ? "emerald" : "destructive",
        },
      ];
    }

    // 7. Enterprise RAG Synthesis
    if (preset === "rag_synthesis") {
      return [
        {
          dimension: "Enterprise RAG Synthesis",
          dimensionIcon: BookOpen,
          metric: "Document Context Ingestion TTFT",
          description: "Time to ingest retrieved chunks before answer generation starts",
          p50: formatMs(snapshot?.ttft_p50),
          tail: `P95: ${formatMs(snapshot?.ttft_p95)}`,
          slo: `≤ ${formatMs(maxTtftSLO)}`,
          badgeText: isTtftPass ? "Passed" : "Breached",
          badgeVariant: isTtftPass ? "emerald" : "destructive",
        },
        {
          dimension: "Enterprise RAG Synthesis",
          dimensionIcon: Zap,
          metric: "Synthesis Generation Speed (TPS)",
          description: "Rate of emitting answer tokens grounded in retrieved chunks",
          p50: `${(snapshot?.current_tps || 0).toFixed(1)} tok/s`,
          tail: `${(snapshot?.current_rps || 0).toFixed(1)} RAG queries/s`,
          slo: "—",
          badgeText: "Active",
          badgeVariant: "emerald",
        },
        {
          dimension: "Enterprise RAG Synthesis",
          dimensionIcon: Gauge,
          metric: "Time Per Output Token (TPOT)",
          description: "Mean decode duration per token during synthesis",
          p50: `${formatMs(snapshot?.tpot_mean)} / tok`,
          tail: "Answer decode pace",
          slo: `≤ ${formatMs(maxTpotSLO)}`,
          badgeText: isTpotPass ? "Passed" : "Exceeded",
          badgeVariant: isTpotPass ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: CheckCircle2,
          metric: "RAG Goodput SLO Yield",
          description: "Percentage of synthesis calls meeting latency and quality bounds",
          p50: formatPct(goodput),
          tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`,
          slo: "≥ 99.0%",
          badgeText: isGoodputOptimal ? "Optimal" : "Below SLO",
          badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: AlertTriangle,
          metric: "RAG Retrieval Error Rate",
          description: "Percentage of requests failing during context processing",
          p50: formatPct(errorRate),
          tail: `${snapshot?.failed_requests || 0} dropped queries`,
          slo: `≤ ${formatPct(maxErrorSLO)}`,
          badgeText: isErrorPass ? "Passed" : "Failed",
          badgeVariant: isErrorPass ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: DollarSign,
          metric: "RAG Synthesis Spend",
          description: "Total dollar spend accounting for large context ingestion + output",
          p50: formatUsd(currentSpend),
          tail: `Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`,
          slo: `≤ ${formatUsd(hardCap)}`,
          badgeText: isSpendProtected ? "Protected" : "Breached",
          badgeVariant: isSpendProtected ? "emerald" : "destructive",
        },
      ];
    }

    // 8. Long-Context & Needle Retrieval
    if (preset === "long_context_retrieval" || preset === "long_context") {
      return [
        {
          dimension: "Massive Context Prefill",
          dimensionIcon: Layers,
          metric: "Massive Context TTFT (16K+ tokens)",
          description: "Initial prompt processing latency under massive KV memory pressure",
          p50: formatMs(snapshot?.ttft_p50),
          tail: `P95: ${formatMs(snapshot?.ttft_p95)} (P99: ${formatMs(snapshot?.ttft_p99)})`,
          slo: `≤ ${formatMs(maxTtftSLO)}`,
          badgeText: isTtftPass ? "Passed" : "Breached",
          badgeVariant: isTtftPass ? "emerald" : "destructive",
        },
        {
          dimension: "Massive Context Prefill",
          dimensionIcon: Layers,
          metric: "Memory Ingestion Velocity",
          description: "Prompt tokens processed per second across large KV memory blocks",
          p50: snapshot?.prefill_tps_p50 ? `${snapshot.prefill_tps_p50.toFixed(0)} tok/s` : "Computing...",
          tail: snapshot?.prefill_tps_p95 ? `P95: ${snapshot.prefill_tps_p95.toFixed(0)} tok/s` : "—",
          slo: "—",
          badgeText: "Active",
          badgeVariant: "emerald",
        },
        {
          dimension: "Network Connection Overhead",
          dimensionIcon: Network,
          metric: "Large Payload Network Handshake",
          description: "Connection establishment overhead transmitting multi-megabyte payload",
          p50: formatMs((snapshot?.waterfall_avg?.dns_ms || 0) + (snapshot?.waterfall_avg?.tcp_ms || 0) + (snapshot?.waterfall_avg?.tls_ms || 0)),
          tail: `DNS: ${formatMs(snapshot?.waterfall_avg?.dns_ms)} • TLS: ${formatMs(snapshot?.waterfall_avg?.tls_ms)}`,
          slo: "≤ 150 ms",
          badgeText: "Optimal",
          badgeVariant: "secondary",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: CheckCircle2,
          metric: "Long-Context Goodput SLO Yield",
          description: "Percentage of heavy-context requests meeting latency thresholds",
          p50: formatPct(goodput),
          tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`,
          slo: "≥ 95.0%",
          badgeText: isGoodputOptimal ? "Optimal" : "Below SLO",
          badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: DollarSign,
          metric: "Massive Context Token Spend",
          description: "Total dollar cost for multi-thousand token prompts",
          p50: formatUsd(currentSpend),
          tail: `Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`,
          slo: `≤ ${formatUsd(hardCap)}`,
          badgeText: isSpendProtected ? "Protected" : "Breached",
          badgeVariant: isSpendProtected ? "emerald" : "destructive",
        },
      ];
    }

    // 9. Document Summarization & Distillation
    if (preset === "summarization_distill") {
      return [
        {
          dimension: "Document Distillation",
          dimensionIcon: Layers,
          metric: "Document Compression TTFT",
          description: "Time to ingest document context before compressed summary starts",
          p50: formatMs(snapshot?.ttft_p50),
          tail: `P95: ${formatMs(snapshot?.ttft_p95)}`,
          slo: `≤ ${formatMs(maxTtftSLO)}`,
          badgeText: isTtftPass ? "Passed" : "Breached",
          badgeVariant: isTtftPass ? "emerald" : "destructive",
        },
        {
          dimension: "Document Distillation",
          dimensionIcon: Zap,
          metric: "Distillation Output Speed (TPS)",
          description: "Generation velocity of synthesized summary tokens",
          p50: `${(snapshot?.current_tps || 0).toFixed(1)} tok/s`,
          tail: `${(snapshot?.current_rps || 0).toFixed(1)} docs/s`,
          slo: "—",
          badgeText: "Active",
          badgeVariant: "emerald",
        },
        {
          dimension: "Document Distillation",
          dimensionIcon: Gauge,
          metric: "Time Per Output Token (TPOT)",
          description: "Mean decode duration per token emitted in the summary",
          p50: `${formatMs(snapshot?.tpot_mean)} / tok`,
          tail: "Summary decode speed",
          slo: `≤ ${formatMs(maxTpotSLO)}`,
          badgeText: isTpotPass ? "Passed" : "Exceeded",
          badgeVariant: isTpotPass ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: CheckCircle2,
          metric: "Summarization Goodput SLO Yield",
          description: "Percentage of distillation requests meeting quality and latency bounds",
          p50: formatPct(goodput),
          tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`,
          slo: "≥ 99.0%",
          badgeText: isGoodputOptimal ? "Optimal" : "Below SLO",
          badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: DollarSign,
          metric: "Distillation Processing Spend",
          description: "Total dollar spend for document reduction passes",
          p50: formatUsd(currentSpend),
          tail: `Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`,
          slo: `≤ ${formatUsd(hardCap)}`,
          badgeText: isSpendProtected ? "Protected" : "Breached",
          badgeVariant: isSpendProtected ? "emerald" : "destructive",
        },
      ];
    }

    // 10. Structured JSON & Grammar
    if (preset === "structured_json" || preset === "json_schema") {
      const validityPct = snapshot?.schema_validity_pct ?? 100;
      const syntaxErrors = snapshot?.schema_error_count || 0;
      return [
        {
          dimension: "Constrained JSON Decoding",
          dimensionIcon: Braces,
          metric: "JSON Schema Validity %",
          description: "Percentage of generated responses that strictly match valid JSON syntax",
          p50: formatPct(validityPct),
          tail: `${syntaxErrors} parse failures / ${snapshot?.completed_requests || 0} parsed`,
          slo: "100.0% Valid",
          badgeText: syntaxErrors === 0 ? "100% Valid" : "Errors",
          badgeVariant: syntaxErrors === 0 ? "emerald" : "destructive",
        },
        {
          dimension: "Constrained JSON Decoding",
          dimensionIcon: Zap,
          metric: "Guided Decode Speed (TPS)",
          description: "Throughput under grammar state transition and FSM logit masking",
          p50: `${(snapshot?.current_tps || 0).toFixed(1)} tok/s`,
          tail: `${(snapshot?.current_rps || 0).toFixed(1)} JSON calls/s`,
          slo: "—",
          badgeText: "Active",
          badgeVariant: "emerald",
        },
        {
          dimension: "Constrained JSON Decoding",
          dimensionIcon: Gauge,
          metric: "Grammar Penalty (TPOT)",
          description: "Mean decode duration per token under guided JSON decoding",
          p50: `${formatMs(snapshot?.tpot_mean)} / tok`,
          tail: "Includes regex mask overhead",
          slo: `≤ ${formatMs(maxTpotSLO)}`,
          badgeText: isTpotPass ? "Passed" : "Exceeded",
          badgeVariant: isTpotPass ? "emerald" : "destructive",
        },
        {
          dimension: "Constrained JSON Decoding",
          dimensionIcon: Clock,
          metric: "Time to First Token (TTFT)",
          description: "Time to first token including JSON schema prompt compilation",
          p50: formatMs(snapshot?.ttft_p50),
          tail: `P95: ${formatMs(snapshot?.ttft_p95)}`,
          slo: `≤ ${formatMs(maxTtftSLO)}`,
          badgeText: isTtftPass ? "Passed" : "Breached",
          badgeVariant: isTtftPass ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: CheckCircle2,
          metric: "Structured Goodput SLO Yield",
          description: "Percentage of structured requests satisfying syntax and latency targets",
          p50: formatPct(goodput),
          tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`,
          slo: "≥ 99.0%",
          badgeText: isGoodputOptimal ? "Optimal" : "Below SLO",
          badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
        },
        {
          dimension: "Reliability & Economics",
          dimensionIcon: DollarSign,
          metric: "Structured Output Spend",
          description: "Accumulated dollar cost across structured JSON calls",
          p50: formatUsd(currentSpend),
          tail: `Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`,
          slo: `≤ ${formatUsd(hardCap)}`,
          badgeText: isSpendProtected ? "Protected" : "Breached",
          badgeVariant: isSpendProtected ? "emerald" : "destructive",
        },
      ];
    }

    // 11. Default / Interactive Conversational / Custom
    return [
      {
        dimension: "Conversational Latency",
        dimensionIcon: Clock,
        metric: "Time to First Token (TTFT)",
        description: "Initial response turnaround before streaming begins",
        p50: formatMs(snapshot?.ttft_p50),
        tail: `P95: ${formatMs(snapshot?.ttft_p95)} (P99: ${formatMs(snapshot?.ttft_p99)})`,
        slo: `≤ ${formatMs(maxTtftSLO)}`,
        badgeText: isTtftPass ? "Passed" : "Breached",
        badgeVariant: isTtftPass ? "emerald" : "destructive",
      },
      {
        dimension: "Conversational Latency",
        dimensionIcon: Activity,
        metric: "Inter-Token Latency (ITL)",
        description: "Delay between consecutive streaming words during decode",
        p50: formatMs(snapshot?.itl_p50),
        tail: `P95: ${formatMs(snapshot?.itl_p95)}`,
        slo: "≤ 40 ms",
        badgeText: (snapshot?.itl_p95 || 0) <= 40 ? "Smooth" : "Jitter",
        badgeVariant: (snapshot?.itl_p95 || 0) <= 40 ? "emerald" : "destructive",
      },
      {
        dimension: "Streaming Throughput",
        dimensionIcon: Zap,
        metric: "Output Token Velocity (TPS)",
        description: "Active aggregate output tokens generated per second across streams",
        p50: `${(snapshot?.current_tps || 0).toFixed(1)} tok/s`,
        tail: `${(snapshot?.current_rps || 0).toFixed(1)} req/s across ${config.concurrency} streams`,
        slo: "—",
        badgeText: "Active",
        badgeVariant: "emerald",
      },
      {
        dimension: "Streaming Throughput",
        dimensionIcon: Gauge,
        metric: "Time Per Output Token (TPOT)",
        description: "Mean duration required to compute each output token",
        p50: `${formatMs(snapshot?.tpot_mean)} / tok`,
        tail: "Hardware generation speed",
        slo: `≤ ${formatMs(maxTpotSLO)}`,
        badgeText: isTpotPass ? "Passed" : "Exceeded",
        badgeVariant: isTpotPass ? "emerald" : "destructive",
      },
      {
        dimension: "Reliability & Economics",
        dimensionIcon: CheckCircle2,
        metric: "Goodput (SLO Yield %)",
        description: "Proportion of requests successfully satisfying all defined latency SLOs",
        p50: formatPct(goodput),
        tail: `${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`,
        slo: "≥ 99.0%",
        badgeText: isGoodputOptimal ? "Optimal" : "Below SLO",
        badgeVariant: isGoodputOptimal ? "emerald" : "destructive",
      },
      {
        dimension: "Reliability & Economics",
        dimensionIcon: AlertTriangle,
        metric: "Stream Error Rate",
        description: "Percentage of requests encountering socket timeouts or HTTP errors",
        p50: formatPct(errorRate),
        tail: `${snapshot?.failed_requests || 0} dropped calls`,
        slo: `≤ ${formatPct(maxErrorSLO)}`,
        badgeText: isErrorPass ? "Passed" : "Failed",
        badgeVariant: isErrorPass ? "emerald" : "destructive",
      },
      {
        dimension: "Reliability & Economics",
        dimensionIcon: DollarSign,
        metric: "Total Billed Spend",
        description: "Accumulated dollar cost for this benchmark run",
        p50: formatUsd(currentSpend),
        tail: `Hard Cap: ${formatUsd(hardCap)}`,
        slo: `≤ ${formatUsd(hardCap)}`,
        badgeText: isSpendProtected ? "Protected" : "Breached",
        badgeVariant: isSpendProtected ? "emerald" : "destructive",
      },
      {
        dimension: "Network Connection Overhead",
        dimensionIcon: Network,
        metric: "Network Handshake Baseline",
        description: "Transport setup duration (DNS + TCP + TLS)",
        p50: formatMs((snapshot?.waterfall_avg?.dns_ms || 0) + (snapshot?.waterfall_avg?.tcp_ms || 0) + (snapshot?.waterfall_avg?.tls_ms || 0)),
        tail: `DNS: ${formatMs(snapshot?.waterfall_avg?.dns_ms)} • TLS: ${formatMs(snapshot?.waterfall_avg?.tls_ms)}`,
        slo: "≤ 100 ms",
        badgeText: "Optimal",
        badgeVariant: "secondary",
      },
    ];
  };

  const rows = buildMetricRows();

  // Group rows by dimension for clean section headers
  const groupedDimensions = rows.reduce<Record<string, { icon: React.ElementType; rows: MetricRowData[] }>>(
    (acc, row) => {
      if (!acc[row.dimension]) {
        acc[row.dimension] = { icon: row.dimensionIcon, rows: [] };
      }
      acc[row.dimension].rows.push(row);
      return acc;
    },
    {}
  );

  const handleCopyTable = async () => {
    let markdownTable = `
| Category | Metric | P50 / Nominal | Tail / Measured | Target | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
`.trim();

    rows.forEach((r) => {
      const p50Str = typeof r.p50 === "string" ? r.p50 : "—";
      const tailStr = typeof r.tail === "string" ? r.tail : "—";
      markdownTable += `\n| **${r.dimension}** | ${r.metric} | ${p50Str} | ${tailStr} | ${r.slo} | ${r.badgeText.toUpperCase()} |`;
    });

    await navigator.clipboard.writeText(markdownTable);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)]">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-[var(--text-main)]">
                Preset-Targeted KPI Benchmark Matrix
              </CardTitle>
              <CardDescription className="text-xs text-[var(--text-muted)]">
                Filtered strictly to target metrics relevant for workload preset: <strong className="font-semibold text-[var(--brand-primary)]">{preset.replace("_", " ")}</strong>
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10.5px] uppercase tracking-wider bg-[var(--bg-surface-elevated)] border-[var(--brand-primary-border)] text-[var(--brand-primary)] font-semibold">
              {rows.length} Relevant Metrics
            </Badge>

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
                  <Copy className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
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
              <TableRow className="bg-[var(--border-subtle)]/50 dark:bg-[var(--bg-surface-subtle)]/5 hover:bg-[var(--border-subtle)]/50 dark:hover:bg-[var(--bg-surface-hover)]/5 border-b border-[var(--border-subtle)]">
                <TableHead className="w-[34%] font-semibold text-[11px] tracking-tight text-[var(--text-body)] py-3 pl-4">
                  Dimension & Metric
                </TableHead>
                <TableHead className="w-[18%] font-semibold text-[11px] tracking-tight text-[var(--text-body)] py-3">
                  P50 / Nominal
                </TableHead>
                <TableHead className="w-[22%] font-semibold text-[11px] tracking-tight text-[var(--text-body)] py-3">
                  Tail / Measured
                </TableHead>
                <TableHead className="w-[13%] font-semibold text-[11px] tracking-tight text-[var(--text-body)] py-3">
                  SLO Target
                </TableHead>
                <TableHead className="w-[13%] font-semibold text-[11px] tracking-tight text-[var(--text-body)] py-3 text-right pr-4">
                  Compliance
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="text-xs">
              {Object.entries(groupedDimensions).map(([dimName, dimData], gIdx) => {
                const DimIcon = dimData.icon;
                return (
                  <React.Fragment key={gIdx}>
                    <TableRow className="bg-[var(--border-subtle)]/30 dark:bg-[var(--bg-surface-subtle)]/3 hover:bg-[var(--border-subtle)]/30 dark:hover:bg-[var(--bg-surface-hover)]/3 border-y border-[var(--border-subtle)]">
                      <TableCell colSpan={5} className="py-2.5 px-4 font-semibold text-[var(--brand-primary)] tracking-tight text-[11px] font-sans">
                        <div className="flex items-center gap-1.5">
                          <DimIcon className="h-3.5 w-3.5" />
                          <span>{dimName}</span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {dimData.rows.map((row, rIdx) => (
                      <TableRow key={rIdx} className="hover:bg-[var(--bg-surface-hover)]/50 dark:hover:bg-white/[0.03] transition-colors">
                        <TableCell className="font-medium pl-4">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                            <span className="font-medium text-[var(--text-main)]">{row.metric}</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-subtle)] pl-3.5">
                            {row.description}
                          </p>
                        </TableCell>

                        <TableCell className="font-sans tabular-nums font-semibold text-sm text-[var(--text-main)]">
                          {row.p50}
                        </TableCell>

                        <TableCell className="font-sans tabular-nums text-xs text-[var(--text-subheading)]">
                          {row.tail}
                        </TableCell>

                        <TableCell className="font-sans tabular-nums text-xs text-[var(--text-body)]">
                          {row.slo}
                        </TableCell>

                        <TableCell className="text-right pr-4">
                          <Badge variant={row.badgeVariant} className="text-[11px] font-sans font-semibold tabular-nums">
                            {row.badgeText}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
