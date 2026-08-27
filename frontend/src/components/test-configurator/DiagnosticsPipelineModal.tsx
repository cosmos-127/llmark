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
import { ShieldCheck, Activity, DollarSign, Target, Clock } from "lucide-react";
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
}) => {
  const [activeTab, setActiveTab] = useState<"sieve" | "distribution" | "waterfall" | "spend">("sieve");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-6 rounded-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Pre-Flight Diagnostics & Reliability Sieve
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Inspect multi-stage SLO filtering, network-to-GPU latency waterfalls, and financial spend trajectory.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="emerald" className="text-xs font-mono">
              TTFT ≤ {maxTtftMs}ms • TPOT ≤ {maxTpotMs}ms
            </Badge>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 pt-3 flex-wrap">
            {[
              { id: "sieve", label: "3-Stage Reliability Sieve", icon: Target },
              { id: "distribution", label: "Goodput Yield Distribution", icon: Activity },
              { id: "waterfall", label: "Latency Waterfall Breakdown", icon: Clock },
              { id: "spend", label: "Spend Cap Trajectory", icon: DollarSign },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#853953] text-white dark:bg-[#A74B6A] shadow-xs"
                      : "bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:bg-[#853953]/10 hover:text-[#853953] dark:hover:text-[#A74B6A]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Tab Content */}
        <div className="py-2 space-y-4">
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
