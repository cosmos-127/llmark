import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SloGoodputDistributionGraph } from "@/components/test-configurator/SloGoodputDistributionGraph";
import { GoodputSievePipeline } from "@/components/test-configurator/GoodputSievePipeline";
import { LatencyWaterfallInspector } from "@/components/test-configurator/LatencyWaterfallInspector";
import { SpendTrajectoryGraph } from "@/components/test-configurator/SpendTrajectoryGraph";
import { ShieldCheck, Activity, DollarSign, Target, Clock, Sparkles } from "lucide-react";
import { VendorType } from "@/lib/types";

interface DiagnosticsPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxTtftMs: number;
  maxTpotMs: number;
  maxErrorRatePct: number;
  maxE2eMs: number;
  promptTokens: number;
  maxTokens: number;
  vendor: VendorType;
  model: string;
  cacheBust: boolean;
  hardSpendCap: number;
  estimatedCost: number;
  testMode: "duration" | "requests";
  durationSeconds: number;
  totalRequests?: number;
  concurrency: number;
  onOpenExpert?: (topicId: string, title?: string, defaultQuestion?: string) => void;
}

export const DiagnosticsPipelineModal: React.FC<DiagnosticsPipelineModalProps> = ({
  isOpen,
  onClose,
  maxTtftMs,
  maxTpotMs,
  maxErrorRatePct,
  maxE2eMs,
  promptTokens,
  maxTokens,
  vendor,
  model,
  cacheBust,
  hardSpendCap,
  estimatedCost,
  testMode,
  durationSeconds,
  totalRequests,
  concurrency,
  onOpenExpert,
}) => {
  const [activeTab, setActiveTab] = useState<"sieve" | "distribution" | "waterfall" | "spend">("sieve");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl lg:max-w-6xl p-6 sm:p-7 rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#2C2C2C] dark:text-[#F3F4F4]">
                  Pre-Flight Diagnostics & Production Reliability Sieve
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-[#2C2C2C]/65 dark:text-[#F3F4F4]/65">
                  Inspect multi-stage SLA gate dropoffs, percentile distributions, streaming waterfall timelines, and cost guardrails.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="purple" className="text-xs font-sans py-0.5 px-2.5">
                Step 4 Deep Analysis
              </Badge>
              <Badge variant="outline" className="text-xs font-sans font-semibold py-0.5 px-2.5">
                SLO TTFT ≤ {maxTtftMs}ms • TPOT ≤ {maxTpotMs}ms
              </Badge>
              {onOpenExpert && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "sieve" || activeTab === "distribution") {
                      onOpenExpert("slo-goodput", "Goodput & Reliability Sieve", "What is Goodput and why is it superior to Raw Throughput?");
                    } else if (activeTab === "waterfall") {
                      onOpenExpert("provider-routing", "Latency Waterfall Breakdown", "What causes connection latency overhead in cloud endpoints?");
                    } else {
                      onOpenExpert("spend-guardrails", "Spend Trajectory & Guardrails", "How does the zero bill-shock circuit breaker protect against runaway cloud costs?");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-semibold bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] hover:bg-[#853953]/20 border border-[#853953]/30 dark:border-[#A74B6A]/40 transition-all cursor-pointer shadow-2xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Ask Expert</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 pt-4 flex-wrap">
            {[
              { id: "sieve", label: "3-Gate Reliability Sieve Pipeline", icon: Target },
              { id: "distribution", label: "Log-Normal Goodput Yield Graph", icon: Activity },
              { id: "waterfall", label: "End-to-End Latency Waterfall", icon: Clock },
              { id: "spend", label: "Spend Accumulation & Circuit Breaker", icon: DollarSign },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                    isActive
                      ? "bg-[#853953] text-white dark:bg-[#A74B6A] shadow-xs font-semibold"
                      : "bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:bg-[#853953]/10 hover:text-[#853953] dark:hover:text-[#A74B6A]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Tab Content */}
        <div className="py-3 space-y-4">
          {activeTab === "sieve" && (
            <GoodputSievePipeline
              maxTtftMs={maxTtftMs}
              maxTpotMs={maxTpotMs}
              maxErrorRatePct={maxErrorRatePct}
              maxE2eMs={maxE2eMs}
            />
          )}

          {activeTab === "distribution" && (
            <SloGoodputDistributionGraph
              maxTtftMs={maxTtftMs}
              maxTpotMs={maxTpotMs}
              maxErrorRatePct={maxErrorRatePct}
              maxE2eMs={maxE2eMs}
            />
          )}

          {activeTab === "waterfall" && (
            <LatencyWaterfallInspector
              promptTokens={promptTokens}
              maxTokens={maxTokens}
              vendor={vendor}
              model={model}
              cacheBust={cacheBust}
            />
          )}

          {activeTab === "spend" && (
            <SpendTrajectoryGraph
              hardSpendCap={hardSpendCap}
              estimatedCost={estimatedCost}
              testMode={testMode}
              durationSeconds={durationSeconds}
              totalRequests={totalRequests}
              concurrency={concurrency}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
