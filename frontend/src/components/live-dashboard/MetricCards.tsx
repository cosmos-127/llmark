import React from "react";
import {
  Gauge,
  Zap,
  CheckCircle2,
  DollarSign,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Layers,
  Braces,
  Clock,
  CheckSquare,
  Eye,
  Database,
  MessagesSquare,
} from "lucide-react";
import { MetricsSnapshot, WorkloadPreset } from "@/lib/types";
import { formatMs, formatPct, formatUsd } from "@/lib/utils";
import { KpiCard } from "@/components/tremor/KpiCard";
import { Badge } from "@/components/ui/badge";

interface MetricCardsProps {
  snapshot: MetricsSnapshot | null;
  workloadPreset?: WorkloadPreset | string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ snapshot, workloadPreset }) => {
  const preset = (snapshot?.workload_preset || workloadPreset || "chat") as string;

  const kneeBanner = (snapshot?.saturation_knee_detected || snapshot?.saturation_knee_concurrency) ? (
    <div className="col-span-full mb-1 p-3.5 rounded-xl bg-gradient-to-r from-[#853953]/15 via-[#853953]/8 to-[#853953]/0 dark:from-[#A74B6A]/20 dark:via-[#A74B6A]/10 dark:to-[#A74B6A]/0 border border-[#853953]/40 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-[#853953] text-white shadow-2xs">
          <Gauge className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-[#853953] dark:text-[#A74B6A] flex items-center gap-1.5">
            Saturation Knee Inflection Discovered
            <Badge variant="destructive" className="text-[10px] py-0 h-4">Inflection Point</Badge>
          </div>
          <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 pt-0.5">
            Optimal concurrency ceiling identified at <strong>{snapshot.saturation_knee_concurrency || 16} parallel streams</strong>. Concurrency beyond this causes TTFT degradation &gt;50% or upstream queue backpressure.
          </p>
        </div>
      </div>
      <Badge variant="outline" className="text-xs font-semibold border-[#853953]/50 text-[#853953] dark:text-[#A74B6A] tabular-nums whitespace-nowrap">
        Max Stable: {snapshot.saturation_knee_concurrency || 16} streams
      </Badge>
    </div>
  ) : null;

  // 1. Rate Limit & Capacity Probing Profile
  if (preset === "rate_limit_probe") {
    const rateLimitPct = snapshot?.rate_limit_pct || 0;
    const rateLimitCount = snapshot?.rate_limit_count || 0;
    const rpm = snapshot?.current_rpm || (snapshot?.current_rps || 0) * 60;
    const tpm = snapshot?.current_tpm || 0;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        {kneeBanner}
        <KpiCard
          title="HTTP 429 Rate Limits"
          badge={rateLimitCount > 0 ? "Throttled" : "Optimal"}
          badgeVariant={rateLimitCount > 0 ? "destructive" : "emerald"}
          value={formatPct(rateLimitPct)}
          subtext={`${rateLimitCount} throttled / ${snapshot?.total_requests || 0} calls`}
          tooltip="Percentage of probing requests rejected with HTTP 429 Too Many Requests"
          icon={ShieldCheck}
          accentColor={rateLimitCount > 0 ? "rose" : "emerald"}
        />

        <KpiCard
          title="Saturated Request Rate (RPM)"
          badge="Live Probed"
          badgeVariant="default"
          value={`${rpm.toFixed(0)} req/min`}
          subtext={
            snapshot?.estimated_rpm_limit
              ? `Capacity ceiling ~${snapshot.estimated_rpm_limit.toFixed(0)} RPM`
              : `${(snapshot?.current_rps || 0).toFixed(1)} req/s active throughput`
          }
          tooltip="Requests processed per minute under current probing concurrency"
          icon={Activity}
          accentColor="mulberry"
        />

        <KpiCard
          title="Token Rate Saturation (TPM)"
          badge="Live TPM"
          badgeVariant="violet"
          value={`${Math.round(tpm).toLocaleString()} tok/min`}
          subtext={
            snapshot?.estimated_tpm_limit
              ? `Estimated token ceiling ~${snapshot.estimated_tpm_limit.toFixed(0)} TPM`
              : "Prompt + completion aggregate velocity"
          }
          tooltip="Total token volume processed per minute"
          icon={Zap}
          accentColor="deepplum"
        />

        <KpiCard
          title="HTTP Status Distribution"
          badge="Status Matrix"
          badgeVariant="secondary"
          value={`200 OK: ${snapshot?.status_distribution?.["200"] || snapshot?.completed_requests || 0}`}
          subtext={`429 Throttled: ${snapshot?.status_distribution?.["429"] || rateLimitCount} • 5xx: ${snapshot?.status_distribution?.["500"] || 0}`}
          tooltip="Breakdown of HTTP response status codes returned by upstream provider"
          icon={CheckCircle2}
          accentColor="emerald"
        />

        <KpiCard
          title="Non-Throttled Availability"
          badge="Pass Rate"
          badgeVariant={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "destructive"}
          value={formatPct(snapshot?.goodput_pct)}
          subtext={`${snapshot?.completed_requests || 0} successful / ${snapshot?.failed_requests || 0} failed`}
          tooltip="Percentage of micro-calls that succeeded without hitting rate limits or errors"
          icon={Gauge}
          accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "rose"}
        />

        <KpiCard
          title="Micro-Probing Cost"
          badge="Real-time"
          badgeVariant="default"
          value={formatUsd(snapshot?.current_spend_usd)}
          subtext="Ultra-low micro-token cost"
          tooltip="Accumulated dollar spend across all micro-token rate limit probing calls"
          icon={DollarSign}
          accentColor="mulberry"
        />
      </div>
    );
  }

  // 2. Prefill Scaling & TTFT / Long-Context Profile
  if (preset === "prefill_ttft" || preset === "long_context_retrieval" || preset === "long_context") {
    const prefillTps95 = snapshot?.prefill_tps_p95;
    const prefillTps50 = snapshot?.prefill_tps_p50;
    const handshakeMs = (snapshot?.waterfall_avg?.dns_ms || 0) + (snapshot?.waterfall_avg?.tcp_ms || 0) + (snapshot?.waterfall_avg?.tls_ms || 0);

    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <KpiCard
          title="Time to first token (TTFT)"
          badge="P95 Tail"
          badgeVariant="default"
          value={formatMs(snapshot?.ttft_p95)}
          subtext={`P50: ${formatMs(snapshot?.ttft_p50)} • P99: ${formatMs(snapshot?.ttft_p99)}`}
          tooltip="Time elapsed before first chunk arrives under heavy context prefill"
          icon={Gauge}
          accentColor="mulberry"
        />

        <KpiCard
          title="Prefill Processing Speed"
          badge="P95 tok/s"
          badgeVariant="emerald"
          value={prefillTps95 ? `${prefillTps95.toFixed(0)} tok/s` : "Computing..."}
          subtext={`Slope: ${snapshot?.prefill_slope_ms_per_1k ? `${snapshot.prefill_slope_ms_per_1k.toFixed(1)} ms/1K` : "—"} • P50: ${prefillTps50 ? prefillTps50.toFixed(0) : "—"} tok/s`}
          tooltip="KV cache prefill compute velocity and latency slope per 1,000 prompt tokens"
          icon={Layers}
          accentColor="emerald"
        />

        <KpiCard
          title="Network Handshake Share"
          badge="DNS+TCP+TLS"
          badgeVariant="secondary"
          value={formatMs(handshakeMs)}
          subtext={`DNS: ${formatMs(snapshot?.waterfall_avg?.dns_ms)} • TLS: ${formatMs(snapshot?.waterfall_avg?.tls_ms)}`}
          tooltip="Connection establishment overhead before server prompt ingestion starts"
          icon={Activity}
          accentColor="deepplum"
        />

        <KpiCard
          title="Prefill Goodput SLO"
          badge="TTFT Target"
          badgeVariant={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "destructive"}
          value={formatPct(snapshot?.goodput_pct)}
          subtext={`${snapshot?.completed_requests || 0} met TTFT threshold`}
          tooltip="Percentage of heavy-context requests meeting strict TTFT latency targets"
          icon={CheckCircle2}
          accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "rose"}
        />

        <KpiCard
          title="Active Concurrency"
          badge="Parallel Streams"
          badgeVariant="violet"
          value={`${snapshot?.completed_requests || 0} reqs`}
          subtext={`${(snapshot?.current_rps || 0).toFixed(1)} requests / sec`}
          tooltip="Sustained concurrent prompt context streams"
          icon={Zap}
          accentColor="deepplum"
        />

        <KpiCard
          title="Input Token Spend"
          badge={snapshot?.cache_speedup_factor ? `${snapshot.cache_speedup_factor.toFixed(1)}x Speedup` : "Real-time"}
          badgeVariant="default"
          value={formatUsd(snapshot?.current_spend_usd)}
          subtext={`Cost/1K Goodput: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`}
          tooltip="Cost accumulated from processing heavy prompt tokens & true cost per 1K valid calls"
          icon={DollarSign}
          accentColor="mulberry"
        />
      </div>
    );
  }

  // 3. Streaming Decode & Generation Jitter / Code Generation Profile
  if (preset === "decode_throughput" || preset === "code_generation" || preset === "code") {
    const itlCv = snapshot?.itl_jitter_cv;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <KpiCard
          title="Decode Throughput"
          badge="Real-time"
          badgeVariant="emerald"
          value={`${(snapshot?.current_tps || 0).toFixed(1)} tok/s`}
          subtext={`${(snapshot?.current_rps || 0).toFixed(1)} requests / sec`}
          tooltip="Active aggregate output tokens generated per second across streams"
          icon={Zap}
          accentColor="emerald"
        />

        <KpiCard
          title="Inter-token latency (ITL)"
          badge={itlCv !== undefined && itlCv !== null ? `CV: ${itlCv.toFixed(2)}` : "P95"}
          badgeVariant={itlCv !== undefined && itlCv !== null && itlCv < 0.30 ? "emerald" : "violet"}
          value={formatMs(snapshot?.itl_p95)}
          subtext={`Jitter: ${itlCv !== undefined && itlCv !== null && itlCv < 0.30 ? "Glass Smooth (<0.30)" : "Standard Stream"} • P50: ${formatMs(snapshot?.itl_p50)}`}
          tooltip="Latency gap between consecutive streaming tokens (smoothness index with coefficient of variation CV)"
          icon={Activity}
          accentColor="deepplum"
        />

        <KpiCard
          title="Max Token Freeze (Tail Jitter)"
          badge="Worst Pause"
          badgeVariant={(snapshot?.max_itl || 0) > 100 ? "destructive" : "secondary"}
          value={formatMs(snapshot?.max_itl)}
          subtext={(snapshot?.max_itl || 0) > 100 ? "Tail stall degradation detected" : "Smooth generation stream"}
          tooltip="The single longest pause experienced between any two output tokens"
          icon={AlertTriangle}
          accentColor={(snapshot?.max_itl || 0) > 100 ? "rose" : "charcoal"}
        />

        <KpiCard
          title="Time Per Output Token (TPOT)"
          badge="Hardware Decode"
          badgeVariant="default"
          value={`${formatMs(snapshot?.tpot_mean)} / tok`}
          subtext="Inverse of single-stream generation speed"
          tooltip="Mean duration taken to compute and emit each single output token"
          icon={Gauge}
          accentColor="mulberry"
        />

        <KpiCard
          title="Decode Goodput Yield"
          badge="Strict SLO"
          badgeVariant={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "violet"}
          value={formatPct(snapshot?.goodput_pct)}
          subtext={`${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`}
          tooltip="Percentage of long decode streams satisfying TPOT and error targets"
          icon={CheckCircle2}
          accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "deepplum"}
        />

        <KpiCard
          title="Generation Spend"
          badge="Real-time"
          badgeVariant="default"
          value={formatUsd(snapshot?.current_spend_usd)}
          subtext={`True Cost: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)} / 1K calls`}
          tooltip="Exact financial cost accumulated & true cost per 1K successful transactions"
          icon={DollarSign}
          accentColor="mulberry"
        />
      </div>
    );
  }

  // 4. Reasoning & CoT Deep-Dive Profile
  if (preset === "reasoning_cot") {
    const ttfaP95 = snapshot?.ttfa_p95 || snapshot?.ttft_p95;
    const ttfaP50 = snapshot?.ttfa_p50 || snapshot?.ttft_p50;
    const thinkingTokens = snapshot?.thinking_tokens_avg;
    const cotRatio = snapshot?.thinking_token_ratio_pct;
    const waitMult = snapshot?.thinking_wait_multiplier;
    const costShare = snapshot?.thinking_cost_share_pct;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <KpiCard
          title="Time to First Answer (TTFA)"
          badge={waitMult ? `${waitMult.toFixed(1)}x Wait Tax` : "User Wait Time"}
          badgeVariant="default"
          value={formatMs(ttfaP95)}
          subtext={`P50: ${formatMs(ttfaP50)} • Wait Multiplier: ${waitMult ? `${waitMult.toFixed(1)}x vs TTFT` : "Active"}`}
          tooltip="Total elapsed latency until the thinking trace finishes and the answer begins"
          icon={Sparkles}
          accentColor="mulberry"
        />

        <KpiCard
          title="Thinking Tokens per Query"
          badge={costShare ? `${costShare.toFixed(0)}% Spend Share` : "CoT Budget"}
          badgeVariant="violet"
          value={thinkingTokens ? `${thinkingTokens.toFixed(0)} tok` : "Measuring..."}
          subtext={cotRatio ? `${cotRatio.toFixed(1)}% of total output tokens` : "Reasoning token allocation"}
          tooltip="Average number of reasoning/thinking tokens emitted before the final answer and budget share"
          icon={Activity}
          accentColor="deepplum"
        />

        <KpiCard
          title="Answer Generation Speed"
          badge="Output TPS"
          badgeVariant="emerald"
          value={`${(snapshot?.current_tps || 0).toFixed(1)} tok/s`}
          subtext={`${(snapshot?.current_rps || 0).toFixed(1)} reasoning queries / sec`}
          tooltip="Post-thinking answer token stream velocity"
          icon={Zap}
          accentColor="emerald"
        />

        <KpiCard
          title="Time to First Token (Prefill)"
          badge="P95 TTFT"
          badgeVariant="secondary"
          value={formatMs(snapshot?.ttft_p95)}
          subtext={`P50: ${formatMs(snapshot?.ttft_p50)} • Start of thinking trace`}
          tooltip="Initial prefill latency before first reasoning token starts streaming"
          icon={Clock}
          accentColor="charcoal"
        />

        <KpiCard
          title="Reasoning Goodput Yield"
          badge="Strict SLO"
          badgeVariant={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "violet"}
          value={formatPct(snapshot?.goodput_pct)}
          subtext={`${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`}
          tooltip="Percentage of reasoning queries meeting latency and success SLOs"
          icon={CheckCircle2}
          accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "deepplum"}
        />

        <KpiCard
          title="Reasoning Query Spend"
          badge="Real-time"
          badgeVariant="default"
          value={formatUsd(snapshot?.current_spend_usd)}
          subtext={`Cost/1K Goodput: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`}
          tooltip="Total financial cost accounting for reasoning token generation pricing"
          icon={DollarSign}
          accentColor="mulberry"
        />
      </div>
    );
  }

  // 5. Structured JSON / Tool Invocation Profile
  if (
    preset === "structured_json" ||
    preset === "json_schema" ||
    preset === "agentic_tool_calling" ||
    preset === "tool_calling"
  ) {
    const validityPct = snapshot?.schema_validity_pct ?? 100;
    const errors = snapshot?.schema_error_count || 0;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <KpiCard
          title="JSON Schema Validity"
          badge={errors === 0 ? "100% Valid" : "Errors Detected"}
          badgeVariant={errors === 0 ? "emerald" : "destructive"}
          value={formatPct(validityPct)}
          subtext={`${errors} parse failures / ${snapshot?.completed_requests || 0} parsed`}
          tooltip="Percentage of generated responses that strictly match valid JSON syntax"
          icon={Braces}
          accentColor={errors === 0 ? "emerald" : "rose"}
        />

        <KpiCard
          title="Constrained Decode Speed"
          badge="Guided TPS"
          badgeVariant="emerald"
          value={`${(snapshot?.current_tps || 0).toFixed(1)} tok/s`}
          subtext={`${(snapshot?.current_rps || 0).toFixed(1)} structured req/s`}
          tooltip="Generation throughput under grammar regex / FSM logit masking constraints"
          icon={Zap}
          accentColor="emerald"
        />

        <KpiCard
          title="Time Per Output Token (TPOT)"
          badge="Grammar Penalty"
          badgeVariant="default"
          value={`${formatMs(snapshot?.tpot_mean)} / tok`}
          subtext="Includes grammar state transition overhead"
          tooltip="Mean decode duration per token under guided JSON decoding"
          icon={Gauge}
          accentColor="mulberry"
        />

        <KpiCard
          title="Time to first token (TTFT)"
          badge="P95"
          badgeVariant="secondary"
          value={formatMs(snapshot?.ttft_p95)}
          subtext={`P50: ${formatMs(snapshot?.ttft_p50)} • P99: ${formatMs(snapshot?.ttft_p99)}`}
          tooltip="Time to first token including JSON schema prompt compilation"
          icon={Activity}
          accentColor="deepplum"
        />

        <KpiCard
          title="Structured Goodput SLO"
          badge="Yield Target"
          badgeVariant={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "violet"}
          value={formatPct(snapshot?.goodput_pct)}
          subtext={`${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`}
          tooltip="Percentage of structured requests meeting latency SLOs and syntax validity"
          icon={CheckCircle2}
          accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "deepplum"}
        />

        <KpiCard
          title="Structured Output Cost"
          badge="Real-time"
          badgeVariant="default"
          value={formatUsd(snapshot?.current_spend_usd)}
          subtext="Accumulated JSON token cost"
          tooltip="Exact financial cost for structured JSON requests"
          icon={DollarSign}
          accentColor="mulberry"
        />
      </div>
    );
  }

  // 6. Few-Shot In-Context Classification Profile
  if (preset === "fewshot_classification") {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <KpiCard
          title="Time to first token (TTFT)"
          badge="P95"
          badgeVariant="default"
          value={formatMs(snapshot?.ttft_p95)}
          subtext={`P50: ${formatMs(snapshot?.ttft_p50)} • P99: ${formatMs(snapshot?.ttft_p99)}`}
          tooltip="Prefill ingestion latency over few-shot in-context exemplar prompt"
          icon={Gauge}
          accentColor="mulberry"
        />

        <KpiCard
          title="Classification RPS"
          badge="Decision Rate"
          badgeVariant="emerald"
          value={`${(snapshot?.current_rps || 0).toFixed(1)} eval/s`}
          subtext={`${snapshot?.completed_requests || 0} classifications completed`}
          tooltip="Total in-context classifications processed per second"
          icon={CheckSquare}
          accentColor="emerald"
        />

        <KpiCard
          title="End-to-End Latency"
          badge="Turnaround"
          badgeVariant="violet"
          value={formatMs(snapshot?.waterfall_avg?.total_e2e_ms || snapshot?.ttft_p95)}
          subtext="Total duration per discrete classification"
          tooltip="Full round-trip duration from submission to final classification decision"
          icon={Clock}
          accentColor="deepplum"
        />

        <KpiCard
          title="Decode Throughput"
          badge="Real-time"
          badgeVariant="secondary"
          value={`${(snapshot?.current_tps || 0).toFixed(1)} tok/s`}
          subtext="Short token emission velocity"
          tooltip="Rate of classification label token emission"
          icon={Zap}
          accentColor="charcoal"
        />

        <KpiCard
          title="Classification Goodput Yield"
          badge="Strict SLO"
          badgeVariant={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "violet"}
          value={formatPct(snapshot?.goodput_pct)}
          subtext={`${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`}
          tooltip="Percentage of classifications satisfying latency and accuracy SLO thresholds"
          icon={CheckCircle2}
          accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "deepplum"}
        />

        <KpiCard
          title="Classification Spend"
          badge="Real-time"
          badgeVariant="default"
          value={formatUsd(snapshot?.current_spend_usd)}
          subtext="Low-decode cost efficiency"
          tooltip="Accumulated dollar spend for in-context classification queries"
          icon={DollarSign}
          accentColor="mulberry"
        />
      </div>
    );
  }

  // 7. Prompt Prefix Cache Warm / KV Reuse Profile
  if (preset === "kv_cache_reuse") {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <KpiCard
          title="Cached TTFT Responsiveness"
          badge="P95 Cache Hit"
          badgeVariant="emerald"
          value={formatMs(snapshot?.ttft_p95)}
          subtext={`P50: ${formatMs(snapshot?.ttft_p50)} • KV Cache accelerated`}
          tooltip="Time to first token with warm prefix caching activated"
          icon={Database}
          accentColor="emerald"
        />

        <KpiCard
          title="Prefill Processing Speed"
          badge="P95 tok/s"
          badgeVariant="default"
          value={snapshot?.prefill_tps_p95 ? `${snapshot.prefill_tps_p95.toFixed(0)} tok/s` : "Measuring..."}
          subtext="Effective prompt processing speed"
          tooltip="Prompt token processing speed leveraging cached prefix blocks"
          icon={Layers}
          accentColor="mulberry"
        />

        <KpiCard
          title="Decode Throughput"
          badge="Real-time"
          badgeVariant="violet"
          value={`${(snapshot?.current_tps || 0).toFixed(1)} tok/s`}
          subtext={`${(snapshot?.current_rps || 0).toFixed(1)} queries / sec`}
          tooltip="Sustained output token generation throughput across streams"
          icon={Zap}
          accentColor="deepplum"
        />

        <KpiCard
          title="Inter-token latency (ITL)"
          badge="P95"
          badgeVariant="secondary"
          value={formatMs(snapshot?.itl_p95)}
          subtext={`P50: ${formatMs(snapshot?.itl_p50)} • Decode smoothness`}
          tooltip="Latency between consecutive streaming tokens during decode"
          icon={Activity}
          accentColor="charcoal"
        />

        <KpiCard
          title="Cache Hit Goodput Yield"
          badge="Strict SLO"
          badgeVariant={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "violet"}
          value={formatPct(snapshot?.goodput_pct)}
          subtext={`${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`}
          tooltip="Percentage of cached queries satisfying strict sub-second TTFT SLOs"
          icon={CheckCircle2}
          accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "deepplum"}
        />

        <KpiCard
          title="Cached Session Cost"
          badge="Real-time"
          badgeVariant="default"
          value={formatUsd(snapshot?.current_spend_usd)}
          subtext="Reflects prompt cache discount"
          tooltip="Accumulated financial spend with provider cache discount applied"
          icon={DollarSign}
          accentColor="mulberry"
        />
      </div>
    );
  }

  // 8. Multimodal Vision & OCR Profile
  if (preset === "multimodal_vision" || preset === "vision") {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <KpiCard
          title="Multimodal TTFT"
          badge="P95 Vision"
          badgeVariant="default"
          value={formatMs(snapshot?.ttft_p95)}
          subtext={`P50: ${formatMs(snapshot?.ttft_p50)} • Image encoder + prefill`}
          tooltip="Time to first token including vision embedding projection and LLM prefill"
          icon={Eye}
          accentColor="mulberry"
        />

        <KpiCard
          title="Vision Ingestion Speed"
          badge="P95 tok/s"
          badgeVariant="emerald"
          value={snapshot?.prefill_tps_p95 ? `${snapshot.prefill_tps_p95.toFixed(0)} tok/s` : "Computing..."}
          subtext="Image patch token throughput"
          tooltip="Speed of ingesting visual image tokens and prompt context"
          icon={Layers}
          accentColor="emerald"
        />

        <KpiCard
          title="OCR Decode Throughput"
          badge="Real-time"
          badgeVariant="violet"
          value={`${(snapshot?.current_tps || 0).toFixed(1)} tok/s`}
          subtext={`${(snapshot?.current_rps || 0).toFixed(1)} images / sec`}
          tooltip="Active rate of generating structured OCR descriptions"
          icon={Zap}
          accentColor="deepplum"
        />

        <KpiCard
          title="Time Per Output Token (TPOT)"
          badge="Hardware Decode"
          badgeVariant="secondary"
          value={`${formatMs(snapshot?.tpot_mean)} / tok`}
          subtext="Mean decode duration per token"
          tooltip="Average generation speed for vision response tokens"
          icon={Gauge}
          accentColor="charcoal"
        />

        <KpiCard
          title="Multimodal Goodput Yield"
          badge="Strict SLO"
          badgeVariant={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "violet"}
          value={formatPct(snapshot?.goodput_pct)}
          subtext={`${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`}
          tooltip="Percentage of vision requests satisfying latency and error SLOs"
          icon={CheckCircle2}
          accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "deepplum"}
        />

        <KpiCard
          title="Multimodal Spend"
          badge="Real-time"
          badgeVariant="default"
          value={formatUsd(snapshot?.current_spend_usd)}
          subtext="Image token + decode billing"
          tooltip="Total financial cost accounting for image patch token pricing"
          icon={DollarSign}
          accentColor="mulberry"
        />
      </div>
    );
  }

  // 9. Multi-Turn Conversational Session Profile
  if (preset === "multiturn_agentic") {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <KpiCard
          title="Turn Latency (TTFT)"
          badge="P95 Turn"
          badgeVariant="default"
          value={formatMs(snapshot?.ttft_p95)}
          subtext={`P50: ${formatMs(snapshot?.ttft_p50)} • Turn context response`}
          tooltip="Responsiveness per conversational turn with accumulated session history"
          icon={MessagesSquare}
          accentColor="mulberry"
        />

        <KpiCard
          title="Inter-token latency (ITL)"
          badge="P95"
          badgeVariant="violet"
          value={formatMs(snapshot?.itl_p95)}
          subtext={`P50: ${formatMs(snapshot?.itl_p50)} • Stream smoothness`}
          tooltip="Gap between consecutive streaming tokens in multi-turn responses"
          icon={Activity}
          accentColor="deepplum"
        />

        <KpiCard
          title="Decode Throughput"
          badge="Real-time"
          badgeVariant="emerald"
          value={`${(snapshot?.current_tps || 0).toFixed(1)} tok/s`}
          subtext={`${(snapshot?.current_rps || 0).toFixed(1)} turns / sec`}
          tooltip="Active generation throughput across multi-turn sessions"
          icon={Zap}
          accentColor="emerald"
        />

        <KpiCard
          title="Time Per Output Token (TPOT)"
          badge="Hardware Decode"
          badgeVariant="secondary"
          value={`${formatMs(snapshot?.tpot_mean)} / tok`}
          subtext="Mean generation time per token"
          tooltip="Average decode latency per token emitted in multi-turn responses"
          icon={Gauge}
          accentColor="charcoal"
        />

        <KpiCard
          title="Session Goodput Yield"
          badge="Strict SLO"
          badgeVariant={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "violet"}
          value={formatPct(snapshot?.goodput_pct)}
          subtext={`${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`}
          tooltip="Percentage of multi-turn requests meeting latency and success SLOs"
          icon={CheckCircle2}
          accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "deepplum"}
        />

        <KpiCard
          title="Session Context Spend"
          badge="Real-time"
          badgeVariant="default"
          value={formatUsd(snapshot?.current_spend_usd)}
          subtext="Multi-turn accumulated cost"
          tooltip="Total financial spend accounting for growing conversation history tokens"
          icon={DollarSign}
          accentColor="mulberry"
        />
      </div>
    );
  }

  // 10. Default / Interactive Conversational / RAG Synthesis / Custom Profile
  const itlCv = snapshot?.itl_jitter_cv;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
      {kneeBanner}
      <KpiCard
        title="Time to first token (TTFT)"
        badge="P95"
        badgeVariant="default"
        value={formatMs(snapshot?.ttft_p95)}
        subtext={`P50: ${formatMs(snapshot?.ttft_p50)} • P99: ${formatMs(snapshot?.ttft_p99)}`}
        tooltip="Prefill time + network handshake before first token stream begins"
        icon={Gauge}
        accentColor="mulberry"
      />

      <KpiCard
        title="Inter-token latency (ITL)"
        badge={itlCv !== undefined && itlCv !== null ? `CV: ${itlCv.toFixed(2)}` : "P95"}
        badgeVariant={itlCv !== undefined && itlCv !== null && itlCv < 0.30 ? "emerald" : "violet"}
        value={formatMs(snapshot?.itl_p95)}
        subtext={`Jitter: ${itlCv !== undefined && itlCv !== null && itlCv < 0.30 ? "Glass Smooth (<0.30)" : "Standard Stream"} • P50: ${formatMs(snapshot?.itl_p50)}`}
        tooltip="Gap between consecutive streaming tokens (smoothness index with coefficient of variation CV)"
        icon={Activity}
        accentColor="deepplum"
      />

      <KpiCard
        title="Max token freeze (ITL)"
        badge="Worst gap"
        badgeVariant={(snapshot?.max_itl || 0) > 100 ? "destructive" : "secondary"}
        value={formatMs(snapshot?.max_itl)}
        subtext={(snapshot?.max_itl || 0) > 100 ? "Tail degradation detected" : "Smooth generation stream"}
        tooltip="The single longest latency freeze experienced between any two tokens"
        icon={AlertTriangle}
        accentColor={(snapshot?.max_itl || 0) > 100 ? "rose" : "charcoal"}
      />

      <KpiCard
        title="Decode throughput"
        badge="Real-time"
        badgeVariant="emerald"
        value={`${(snapshot?.current_tps || 0).toFixed(1)} tok/s`}
        subtext={`${(snapshot?.current_rps || 0).toFixed(1)} requests / sec`}
        tooltip="Active aggregate output tokens per second across all parallel streams"
        icon={Zap}
        accentColor="emerald"
      />

      <KpiCard
        title="Goodput (SLO yield)"
        badge="Strict SLO"
        badgeVariant={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "violet"}
        value={formatPct(snapshot?.goodput_pct)}
        subtext={`${snapshot?.completed_requests || 0} passed • Cost/1K: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`}
        tooltip="Percentage of requests satisfying all strict SLO latency and error thresholds"
        icon={CheckCircle2}
        accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "deepplum"}
      />

      <KpiCard
        title="Current spend"
        badge="Real-time"
        badgeVariant="default"
        value={formatUsd(snapshot?.current_spend_usd)}
        subtext={`Cost/1K Goodput: ${formatUsd(snapshot?.cost_per_1k_goodput_usd || 0)}`}
        tooltip="Exact financial cost accumulated & true cost per 1K successful transactions"
        icon={DollarSign}
        accentColor="mulberry"
      />
    </div>
  );
};

