import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Server,
  Zap,
} from "lucide-react";
import { calculateProductionCost, ProductionCostProjection } from "@/lib/costCalculator";
import { formatMs, formatUsd, formatPct, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ProviderLogo } from "@/components/common/BrandLogos";

export interface ProductionCostCalculatorProps {
  vendor?: string;
  model?: string;
  measuredPromptTokens?: number | null;
  measuredGenTokens?: number | null;
  customPromptPrice?: number | null;
  customCompletionPrice?: number | null;
  measuredTtftMs?: number | null;
  tpsDecode?: number | null;
  benchmarkName?: string;
  title?: string;
  description?: string;
}

const TRAFFIC_PRESETS = [
  { label: "1k / day", value: 1_000, desc: "Canary / Pilot" },
  { label: "10k / day", value: 10_000, desc: "Standard App" },
  { label: "50k / day", value: 50_000, desc: "Growth Scale" },
  { label: "250k / day", value: 250_000, desc: "High Volume" },
];

export const ProductionCostCalculator: React.FC<ProductionCostCalculatorProps> = ({
  vendor = "openai",
  model = "gpt-4o",
  measuredPromptTokens,
  measuredGenTokens,
  customPromptPrice,
  customCompletionPrice,
  measuredTtftMs,
  tpsDecode,
  benchmarkName,
  title,
  description,
}) => {
  const [dailyRequests, setDailyRequests] = useState<number>(10_000);

  const projection: ProductionCostProjection = React.useMemo(() => {
    return calculateProductionCost(
      vendor,
      model,
      dailyRequests,
      measuredPromptTokens,
      measuredGenTokens,
      customPromptPrice,
      customCompletionPrice,
      measuredTtftMs,
      tpsDecode
    );
  }, [
    vendor,
    model,
    dailyRequests,
    measuredPromptTokens,
    measuredGenTokens,
    customPromptPrice,
    customCompletionPrice,
    measuredTtftMs,
    tpsDecode,
  ]);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header & Live Benchmark Run Metrics Card */}
      <Card className="border-[#853953]/20 dark:border-[#E05284]/25 bg-gradient-to-br from-white via-white to-[#853953]/5 dark:from-[#0F0F13] dark:via-[#0F0F13] dark:to-[#E05284]/10 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#14141B] border border-[#2C2C2C]/10 dark:border-white/10 shadow-xs p-1.5">
                <ProviderLogo vendor={vendor as any} className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-[#2C2C2C] dark:text-white">
                    {title || `Production Cost Forecast: ${model}`}
                  </CardTitle>
                  <Badge variant="default" className="text-xs font-mono">
                    {model}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-slate-400 mt-0.5">
                  {description || `Calculated using actual benchmark workload telemetry: ${projection.promptTokens.toLocaleString()} prompt tokens + ${projection.genTokens.toLocaleString()} output tokens per request.`}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-sans tabular-nums">
              <span className="text-[#2C2C2C]/60 dark:text-slate-400">Official API Rates:</span>
              <Badge variant="outline" className="text-[11px] font-mono">
                ${projection.inputPricePer1M.toFixed(2)} / 1M prompt
              </Badge>
              <Badge variant="outline" className="text-[11px] font-mono">
                ${projection.outputPricePer1M.toFixed(2)} / 1M completion
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-3 space-y-6">
          {/* Daily Traffic Volume Control */}
          <div className="p-4 rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-[#2C2C2C] dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
                  Daily Production Request Volume
                </span>
                <span className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400">
                  Select your expected production traffic to calculate daily, monthly, and yearly spend.
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5">
                {TRAFFIC_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setDailyRequests(preset.value)}
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none",
                      dailyRequests === preset.value
                        ? "bg-[#853953] dark:bg-[#D84577] text-white border-[#853953] dark:border-[#E05284] shadow-xs font-semibold"
                        : "bg-white dark:bg-[#0B0B0E] border-[#2C2C2C]/10 dark:border-white/10 text-[#2C2C2C]/70 dark:text-slate-300 hover:bg-[#F3F4F4] dark:hover:bg-[#1A1A24]"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#2C2C2C]/70 dark:text-slate-300 font-medium">
                  {dailyRequests.toLocaleString()} requests / day
                </span>
                <span className="font-sans tabular-nums font-semibold text-[#853953] dark:text-[#F06A9A]">
                  {projection.monthlyRequests.toLocaleString()} reqs / month (~{Math.round(dailyRequests / 1440)} reqs/min)
                </span>
              </div>
              <Slider
                min={500}
                max={250_000}
                step={500}
                value={[dailyRequests]}
                onValueChange={(val) => setDailyRequests(val[0])}
              />
              <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-slate-400 pt-0.5">
                <span>500 reqs/day</span>
                <span>50,000 reqs/day</span>
                <span>250,000 reqs/day</span>
              </div>
            </div>
          </div>

          {/* 2. Top Highlighted Spend Forecast Cards (Daily, Monthly, Annual) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Daily Spend */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0F0F13] border border-[#2C2C2C]/10 dark:border-white/10 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#2C2C2C]/60 dark:text-slate-400">Daily Production Spend</span>
                <span className="text-[11px] text-[#2C2C2C]/50 dark:text-slate-400">{dailyRequests.toLocaleString()} reqs</span>
              </div>
              <div className="text-2xl font-bold font-sans tabular-nums text-[#2C2C2C] dark:text-white">
                {formatUsd(projection.dailyCost)}
                <span className="text-xs font-normal text-[#2C2C2C]/50 dark:text-slate-400 ml-1">/ day</span>
              </div>
              <p className="text-[11px] text-[#2C2C2C]/50 dark:text-slate-400 font-sans tabular-nums">
                ~{(projection.dailyTokens / 1_000_000).toFixed(2)}M tokens processed daily
              </p>
            </div>

            {/* Monthly Spend (Highlighted) */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#853953]/10 to-[#612D53]/15 dark:from-[#D84577]/20 dark:to-[#8E2869]/25 border border-[#853953]/30 dark:border-[#E05284]/40 shadow-xs space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#853953] dark:text-[#F06A9A]">Monthly Estimated Spend</span>
                <Badge variant="default" className="text-[10px] px-1.5 py-0">30 Days</Badge>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-sans tabular-nums text-[#853953] dark:text-[#F06A9A]">
                {formatUsd(projection.monthlyCost)}
                <span className="text-xs font-normal text-[#853953]/70 dark:text-[#F06A9A]/70 ml-1">/ mo</span>
              </div>
              <p className="text-[11px] text-[#2C2C2C]/70 dark:text-slate-300 font-sans tabular-nums">
                {projection.monthlyRequests.toLocaleString()} requests • ~{(projection.monthlyTokens / 1_000_000).toFixed(1)}M total tokens
              </p>
            </div>

            {/* Annual Spend */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0F0F13] border border-[#2C2C2C]/10 dark:border-white/10 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#2C2C2C]/60 dark:text-slate-400">Annual Run-Rate</span>
                <span className="text-[11px] text-[#2C2C2C]/50 dark:text-slate-400">365 Days</span>
              </div>
              <div className="text-2xl font-bold font-sans tabular-nums text-[#2C2C2C] dark:text-white">
                {formatUsd(projection.annualCost)}
                <span className="text-xs font-normal text-[#2C2C2C]/50 dark:text-slate-400 ml-1">/ year</span>
              </div>
              <p className="text-[11px] text-[#2C2C2C]/50 dark:text-slate-400 font-sans tabular-nums">
                ~{(projection.annualTokens / 1_000_000).toFixed(0)}M tokens processed annually
              </p>
            </div>
          </div>

          {/* 3. Unit Economics & Input vs Output Cost Driver Split */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Unit Economics Card */}
            <div className="md:col-span-6 p-4 rounded-xl bg-white dark:bg-[#0F0F13] border border-[#2C2C2C]/10 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#2C2C2C] dark:text-white flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
                  Unit Economics (Per Request & Per Token)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10">
                  <span className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400 block">Cost / 1,000 Requests</span>
                  <div className="text-base font-bold font-sans tabular-nums text-[#853953] dark:text-[#F06A9A] mt-0.5">
                    {formatUsd(projection.costPer1kReqs)}
                  </div>
                  <span className="text-[10px] text-[#2C2C2C]/50 dark:text-slate-400 block mt-0.5 font-sans">
                    ${(projection.costPerReq).toFixed(5)} per call
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10">
                  <span className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400 block">Blended Token Price</span>
                  <div className="text-base font-bold font-sans tabular-nums text-[#612D53] dark:text-[#E270BB] mt-0.5">
                    {formatUsd(projection.blendedPricePer1MTokens)}
                  </div>
                  <span className="text-[10px] text-[#2C2C2C]/50 dark:text-slate-400 block mt-0.5 font-sans">
                    effective per 1M total tokens
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400 font-sans tabular-nums pt-1 border-t border-[#2C2C2C]/10 dark:border-white/[0.06] flex items-center justify-between">
                <span>Avg payload: <strong>{projection.totalTokensPerReq.toLocaleString()} tokens/req</strong></span>
                <span>({projection.promptTokens.toLocaleString()} prompt + {projection.genTokens.toLocaleString()} gen)</span>
              </div>
            </div>

            {/* Input vs Output Cost Driver Split */}
            <div className="md:col-span-6 p-4 rounded-xl bg-white dark:bg-[#0F0F13] border border-[#2C2C2C]/10 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#2C2C2C] dark:text-white flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
                  What is Driving Your Bill? (Input vs Output)
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-[#853953] dark:text-[#F06A9A] font-semibold">
                    Prompt (Input): {projection.inputCostSharePct}% ({formatUsd(projection.inputCostPerReq * projection.monthlyRequests)}/mo)
                  </span>
                  <span className="text-[#612D53] dark:text-[#E270BB] font-semibold">
                    Generation (Output): {projection.outputCostSharePct}% ({formatUsd(projection.outputCostPerReq * projection.monthlyRequests)}/mo)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2.5 w-full rounded-full bg-[#F3F4F4] dark:bg-[#0B0B0E] overflow-hidden flex">
                  <div
                    style={{ width: `${projection.inputCostSharePct}%` }}
                    className="h-full bg-[#853953] dark:bg-[#D84577] transition-all duration-300"
                    title={`Prompt Input: ${projection.inputCostSharePct}%`}
                  />
                  <div
                    style={{ width: `${projection.outputCostSharePct}%` }}
                    className="h-full bg-[#612D53] dark:bg-[#C14594] transition-all duration-300"
                    title={`Output Generation: ${projection.outputCostSharePct}%`}
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 text-[11px] text-[#2C2C2C]/70 dark:text-slate-300 leading-relaxed">
                {projection.inputCostSharePct > 60 ? (
                  <span>
                    💡 <strong>Input Dominant</strong>: Your spend is primarily driven by input tokens. Shortening RAG context or leveraging prompt caching will produce massive cost reductions.
                  </span>
                ) : projection.outputCostSharePct > 60 ? (
                  <span>
                    💡 <strong>Output Dominant</strong>: Your spend is primarily driven by long generations. Reducing `max_tokens` or enforcing concise responses will save significant budget.
                  </span>
                ) : (
                  <span>
                    💡 <strong>Balanced Workload</strong>: Your prompt input and output tokens contribute equally to overall inference expenditure.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Production Throughput & Capacity Sizing */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#0F0F13] border border-[#2C2C2C]/10 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-white flex items-center gap-1.5">
                <Server className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
                Infrastructure & Concurrency Sizing
              </span>
              <span className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400">
                Capacity required to sustain {dailyRequests.toLocaleString()} requests/day without backpressure
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-xs">
              <div className="p-3 rounded-lg bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10">
                <span className="text-[#2C2C2C]/60 dark:text-slate-400 block text-[11px]">Average Inflow Rate</span>
                <strong className="text-sm font-semibold tabular-nums text-[#2C2C2C] dark:text-white">
                  {projection.avgQps.toFixed(2)} reqs/sec
                </strong>
                <span className="text-[10px] text-[#2C2C2C]/50 dark:text-slate-400 block">~{Math.round(dailyRequests / 1440)} reqs/min</span>
              </div>

              <div className="p-3 rounded-lg bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10">
                <span className="text-[#2C2C2C]/60 dark:text-slate-400 block text-[11px]">Estimated Peak Traffic (3x)</span>
                <strong className="text-sm font-semibold tabular-nums text-[#853953] dark:text-[#F06A9A]">
                  {projection.peakQps.toFixed(1)} reqs/sec
                </strong>
                <span className="text-[10px] text-[#2C2C2C]/50 dark:text-slate-400 block">at peak daily hours</span>
              </div>

              <div className="p-3 rounded-lg bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10">
                <span className="text-[#2C2C2C]/60 dark:text-slate-400 block text-[11px]">Recommended Client Pool</span>
                <strong className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {projection.recommendedConcurrency} parallel worker streams
                </strong>
                <span className="text-[10px] text-[#2C2C2C]/50 dark:text-slate-400 block">to avoid HTTP 429 & timeout queuing</span>
              </div>
            </div>
          </div>

          {/* 5. Alternative Model Cost Comparison Table (For This Exact Workload) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-white flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
                Cross-Model Cost Comparison (For This Exact Workload & Volume)
              </span>
              <span className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400">
                Calculated at {dailyRequests.toLocaleString()} reqs/day ({projection.monthlyRequests.toLocaleString()} reqs/mo)
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#2C2C2C]/10 dark:border-white/10 bg-white dark:bg-[#0F0F13]">
              <table className="w-full text-xs font-sans">
                <thead>
                  <tr className="border-b border-[#2C2C2C]/10 dark:border-white/10 bg-[#F3F4F4]/60 dark:bg-[#0B0B0E] text-[#2C2C2C]/60 dark:text-slate-400 text-left">
                    <th className="py-2.5 px-3 font-medium">Model</th>
                    <th className="py-2.5 px-3 font-medium text-right">Cost / 1k Reqs</th>
                    <th className="py-2.5 px-3 font-medium text-right">Daily Spend</th>
                    <th className="py-2.5 px-3 font-medium text-right">Monthly Spend</th>
                    <th className="py-2.5 px-3 font-medium text-right">Difference vs Current</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2C2C]/5 dark:divide-white/[0.06]">
                  {projection.comparisons.map((item) => {
                    const isSelected = item.isCurrent;
                    return (
                      <tr
                        key={item.model}
                        className={cn(
                          "transition-colors",
                          isSelected
                            ? "bg-[#853953]/10 dark:bg-[#E05284]/15 font-semibold text-[#853953] dark:text-[#F06A9A]"
                            : "hover:bg-[#F3F4F4]/50 dark:hover:bg-white/[0.04] text-[#2C2C2C] dark:text-slate-200"
                        )}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <ProviderLogo vendor={item.vendor as any} className="h-3.5 w-3.5 shrink-0" />
                            <span>{item.label}</span>
                            {isSelected && (
                              <Badge variant="default" className="text-[10px] px-1 py-0 ml-1">Current</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans tabular-nums text-[#2C2C2C]/80 dark:text-slate-300">
                          {formatUsd(item.costPer1kReqs)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans tabular-nums text-[#2C2C2C]/80 dark:text-slate-300">
                          {formatUsd(item.dailyCost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans tabular-nums font-bold">
                          {formatUsd(item.monthlyCost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans tabular-nums">
                          {isSelected ? (
                            <span className="text-[#2C2C2C]/50 dark:text-slate-500 font-normal">Baseline</span>
                          ) : item.isCheaper ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              {item.deltaPct}% ({formatUsd(item.deltaDollars)}/mo)
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400 font-semibold">
                              +{item.deltaPct}% (+{formatUsd(item.deltaDollars)}/mo)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
