import React from "react";
import { Gauge, Zap, CheckCircle2, DollarSign, Activity, AlertTriangle } from "lucide-react";
import { MetricsSnapshot } from "@/lib/types";
import { formatMs, formatPct, formatUsd } from "@/lib/utils";
import { KpiCard } from "@/components/tremor/KpiCard";

interface MetricCardsProps {
  snapshot: MetricsSnapshot | null;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ snapshot }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
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
        badge="P95"
        badgeVariant="violet"
        value={formatMs(snapshot?.itl_p95)}
        subtext={`P50: ${formatMs(snapshot?.itl_p50)} • P99: ${formatMs(snapshot?.itl_p99)}`}
        tooltip="Gap between consecutive streaming tokens (smoothness index)"
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
        subtext={`${snapshot?.completed_requests || 0} passed / ${snapshot?.failed_requests || 0} failed`}
        tooltip="Percentage of requests satisfying all strict SLO latency and error thresholds"
        icon={CheckCircle2}
        accentColor={(snapshot?.goodput_pct || 0) >= 95 ? "emerald" : "deepplum"}
      />

      <KpiCard
        title="Current spend"
        badge="Real-time"
        badgeVariant="default"
        value={formatUsd(snapshot?.current_spend_usd)}
        subtext="Accumulated token cost"
        tooltip="Exact financial cost accumulated in real-time according to vendor model token pricing"
        icon={DollarSign}
        accentColor="mulberry"
      />
    </div>
  );
};
