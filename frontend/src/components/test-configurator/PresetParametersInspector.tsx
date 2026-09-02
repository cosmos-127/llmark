import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BenchmarkConfig, WorkloadPreset } from "@/lib/types";
import { WORKLOAD_PROMPT_PREVIEWS } from "@/lib/promptPresets";
import {
  Lock,
  CheckCircle2,
  Sliders,
  Layers,
  Database,
  Radio,
  Flame,
  Activity,
  Target,
  FileText,
} from "lucide-react";

interface PresetParametersInspectorProps {
  config: BenchmarkConfig;
  preset?: {
    id: WorkloadPreset;
    name: string;
    desc: string;
    tag: string;
    promptTokens: number;
    genTokens: number;
    metrics: string[];
  } | null;
}

export const PresetParametersInspector: React.FC<PresetParametersInspectorProps> = ({
  config,
  preset,
}) => {
  // Skeleton Shimmer State when no preset is selected
  if (!preset || !config.workload_preset) {
    const shimmerCards = [
      { label: "Prompt Size", icon: Layers, defaultVal: "~--- tokens" },
      { label: "Max Output Tokens", icon: Sliders, defaultVal: "--- tokens" },
      { label: "Prompt Cache", icon: Database, defaultVal: "---" },
      { label: "Streaming (SSE)", icon: Radio, defaultVal: "---" },
      { label: "Temperature", icon: Flame, defaultVal: "T = --" },
      { label: "Warmup Requests", icon: Activity, defaultVal: "- reqs" },
    ];

    return (
      <Card className="rounded-2xl border border-[#0F172A]/10 dark:border-white/10 shadow-2xs bg-white dark:bg-[#111827] overflow-hidden">
        <CardHeader className="p-4 pb-3 border-b border-[#0F172A]/5 dark:border-white/5 bg-[#F1F5F9]/30 dark:bg-[#0F172A]/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] animate-pulse">
                <Sliders className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-xs sm:text-sm font-bold font-sans text-[#0F172A] dark:text-white flex items-center gap-2">
                  Preset Specifications
                  <Badge variant="outline" className="text-[10px] font-sans opacity-60">
                    Awaiting Selection
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-[#0F172A]/60 dark:text-slate-400">
                  Calibrated token lengths, cache policies, and decoding boundaries.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[10px] py-1 px-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 font-sans font-medium flex items-center gap-1.5 animate-pulse"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>No Preset Selected — Pick a Preset Above</span>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3 font-sans">
          {/* Shimmer Parameters Grid (3 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shimmerCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-[#0F172A]/10 dark:border-white/10 bg-white/60 dark:bg-[#0F172A]/60 space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-[#0F172A]/60 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-[#2563EB]/50 dark:text-[#60A5FA]/50 shrink-0" />
                      {card.label}
                    </span>
                    <div className="h-4 w-12 bg-slate-200/70 dark:bg-white/5 rounded-md animate-pulse" />
                  </div>

                  <div className="flex items-baseline justify-between pt-0.5">
                    <span className="text-sm font-bold text-[#0F172A]/40 dark:text-slate-600 font-mono">
                      {card.defaultVal}
                    </span>
                    <div className="h-3 w-16 bg-slate-200/60 dark:bg-white/5 rounded animate-pulse" />
                  </div>

                  <div className="space-y-1 pt-1 border-t border-[#0F172A]/5 dark:border-white/5">
                    <div className="h-2.5 w-full bg-slate-200/50 dark:bg-white/5 rounded animate-pulse" />
                    <div className="h-2.5 w-3/4 bg-slate-200/40 dark:bg-white/5 rounded animate-pulse" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shimmer Footnote */}
          <div className="p-3 rounded-xl bg-[#F1F5F9]/40 dark:bg-[#0F172A] border border-[#0F172A]/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#0F172A]/50 dark:text-slate-500 font-medium">Focus:</span>
              <div className="h-4 w-36 bg-slate-200/70 dark:bg-white/5 rounded animate-pulse" />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-[#0F172A]/50 dark:text-slate-500 font-medium">Metrics:</span>
              <div className="h-4 w-16 bg-slate-200/60 dark:bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200/60 dark:bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200/60 dark:bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }


  // Populated View when preset is selected
  const promptDetails =
    WORKLOAD_PROMPT_PREVIEWS[config.workload_preset as WorkloadPreset] ||
    WORKLOAD_PROMPT_PREVIEWS.custom;

  const isCustom = Boolean(config.custom_prompt) || config.workload_preset === "custom";
  const isKvCachePreset = config.workload_preset === "kv_cache_reuse";
  const isPrefillTtftPreset = config.workload_preset === "prefill_ttft";
  const isRateLimitPreset = config.workload_preset === "rate_limit_probe";
  const isReasoningPreset = config.workload_preset === "reasoning_cot";

  const isMaxTokensLocked = !isCustom;
  const isCacheBustLocked = isKvCachePreset;
  const isWarmupLocked = isKvCachePreset || Boolean(config.measure_cache_speedup);
  const isStreamLocked = isPrefillTtftPreset || config.workload_preset === "decode_throughput" || isReasoningPreset;

  const parameters = [
    {
      label: "Prompt Size",
      value: `~${preset.promptTokens} tokens`,
      isLocked: false,
      statusLabel: "Calibrated",
      impact:
        "Input prompt length sent to the model to measure initial processing speed (TTFT).",
      icon: Layers,
    },
    {
      label: "Max Output Tokens",
      value: `${config.max_tokens} tokens`,
      isLocked: isMaxTokensLocked,
      statusLabel: isMaxTokensLocked ? "Preset Bound" : "Configurable",
      impact: isMaxTokensLocked
        ? `Fixed to ${preset.genTokens} tokens to match this preset's standard benchmark ratio.`
        : "Maximum generation length per request.",
      icon: Sliders,
    },
    {
      label: "Prompt Cache",
      value: isKvCachePreset
        ? "Cold Seed → Warm Hits"
        : config.cache_bust
        ? "Bypass (Cold Nonce)"
        : "Prefix Reuse Allowed",
      isLocked: isCacheBustLocked,
      statusLabel: isKvCachePreset ? "Speedup Active" : config.cache_bust ? "Cold Only" : "Standard",
      impact: isKvCachePreset
        ? "First request sets the baseline seed; subsequent requests measure KV cache speedup."
        : config.cache_bust
        ? "Appends a unique nonce to bypass server caching and test cold prefill."
        : "Allows the server to reuse matching prompt cache prefix blocks.",
      icon: Database,
    },
    {
      label: "Streaming (SSE)",
      value: "Enabled",
      isLocked: isStreamLocked,
      statusLabel: isStreamLocked ? "Required for TTFT" : "Active",
      impact:
        "Streams tokens chunk-by-chunk in real time to capture Time to First Token (TTFT) and token jitter.",
      icon: Radio,
    },
    {
      label: "Temperature",
      value: `T = ${config.temperature.toFixed(2)}`,
      isLocked: false,
      statusLabel: config.temperature === 0.0 ? "0.0 (Deterministic)" : `${config.temperature.toFixed(2)}`,
      impact:
        config.temperature === 0.0
          ? "Deterministic greedy decoding for reliable, reproducible benchmark runs."
          : "Controls randomness in model token generation.",
      icon: Flame,
    },
    {
      label: "Warmup Requests",
      value: isWarmupLocked ? "0 reqs (Cold Seed)" : `${config.warmup_requests || 0} reqs`,
      isLocked: isWarmupLocked,
      statusLabel: isWarmupLocked ? "Anchored" : "Configurable",
      impact: isWarmupLocked
        ? "Warmup is skipped to keep the first cold request as the baseline reference."
        : "Initial requests discarded from stats to prime network connections and sockets.",
      icon: Activity,
    },
  ];

  return (
    <Card className="rounded-2xl border border-[#0F172A]/10 dark:border-white/10 shadow-2xs bg-white dark:bg-[#111827] overflow-hidden">
      <CardHeader className="p-4 pb-3 border-b border-[#0F172A]/5 dark:border-white/5 bg-[#F1F5F9]/30 dark:bg-[#0F172A]/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA]">
              <Sliders className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-xs sm:text-sm font-bold font-sans text-[#0F172A] dark:text-white flex items-center gap-2">
                Preset Specifications
                <Badge variant="outline" className="text-[10px] font-sans">
                  {preset.tag}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-[#0F172A]/60 dark:text-slate-400">
                Key settings configured for this preset.
              </CardDescription>
            </div>
          </div>


          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] py-0.5 px-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-sans font-medium"
            >
              <Lock className="h-2.5 w-2.5 mr-1 inline" />
              {parameters.filter((p) => p.isLocked).length} Locked
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] py-0.5 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-sans font-medium"
            >
              <CheckCircle2 className="h-2.5 w-2.5 mr-1 inline" />
              {parameters.filter((p) => !p.isLocked).length} Editable
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3 font-sans">
        {/* Parameters Grid - 3 Columns (2 rows of 3 items) with Clean Readability */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {parameters.map((param, idx) => {
            const Icon = param.icon;
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  param.isLocked
                    ? "bg-[#F1F5F9]/50 dark:bg-[#111827]/80 border-amber-500/20 dark:border-amber-500/25"
                    : "bg-white dark:bg-[#0F172A] border-[#0F172A]/10 dark:border-white/10"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-[#0F172A]/70 dark:text-slate-300 font-semibold flex items-center gap-1.5 truncate">
                      <Icon className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                      {param.label}
                    </span>
                    {param.isLocked ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 shrink-0 font-medium"
                      >
                        <Lock className="h-2 w-2 mr-0.5 inline" />
                        Locked
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 shrink-0 font-medium"
                      >
                        Active
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between pt-0.5">
                    <span className="text-sm font-bold text-[#0F172A] dark:text-white tabular-nums">
                      {param.value}
                    </span>
                    <span className="text-[10px] text-[#0F172A]/50 dark:text-slate-400 font-medium truncate ml-2">
                      {param.statusLabel}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#0F172A]/65 dark:text-slate-300 mt-2 leading-relaxed border-t border-[#0F172A]/5 dark:border-white/5 pt-1.5">
                  {param.impact}
                </p>
              </div>
            );
          })}
        </div>

        {/* Focus & Monitored Metrics Footer */}
        <div className="p-3 rounded-xl bg-[#F1F5F9]/40 dark:bg-[#0F172A] border border-[#0F172A]/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#0F172A]/60 dark:text-slate-400 font-medium">Focus:</span>
            <span className="font-semibold text-xs text-[#2563EB] dark:text-[#60A5FA]">
              {promptDetails?.targetStressDimension || preset.tag}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[#0F172A]/60 dark:text-slate-400 font-medium">Metrics:</span>
            {preset.metrics.map((metric, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[10px] py-0.5 px-2 font-medium font-sans"
              >
                {metric}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
