import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PrefillDecodeBalanceGauge } from "@/components/test-configurator/PrefillDecodeBalanceGauge";
import { AttentionComputeMatrix } from "@/components/test-configurator/AttentionComputeMatrix";
import { SamplingEntropyDistributionGraph } from "@/components/test-configurator/SamplingEntropyDistributionGraph";
import { Activity, Gauge, Sparkles, Layers } from "lucide-react";

interface PayloadDynamicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptTokens: number;
  maxTokens: number;
  presetName: string;
  cacheBust: boolean;
  temperature: number;
  topP: number;
  onOpenExpert?: (topicId: string, title?: string, defaultQuestion?: string) => void;
}

export const PayloadDynamicsModal: React.FC<PayloadDynamicsModalProps> = ({
  isOpen,
  onClose,
  promptTokens,
  maxTokens,
  presetName,
  cacheBust,
  temperature,
  topP,
  onOpenExpert,
}) => {
  const [activeTab, setActiveTab] = useState<"balance" | "attention" | "entropy">("balance");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl lg:max-w-6xl p-6 sm:p-7 rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-[#0F172A]/10 dark:border-white/10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 dark:border-[#3B82F6]/35 shadow-xs">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">
                  Payload Dynamics & Attention Architecture Inspector
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-[#0F172A]/65 dark:text-white/65">
                  Deep-dive into arithmetic intensity, causal attention matrices, memory bandwidth roofs, and sampling entropy physics.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="purple" className="text-xs font-sans py-0.5 px-2.5">
                Step 2 Deep Analysis
              </Badge>
              <Badge variant="outline" className="text-xs font-sans font-semibold py-0.5 px-2.5">
                {promptTokens} prompt tok • {maxTokens} gen tok
              </Badge>
              {onOpenExpert && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "balance") {
                      onOpenExpert("workload-preset", "Prefill / Decode Balance", "How do token ratios (prefill vs. decode) affect benchmarking results?");
                    } else if (activeTab === "attention") {
                      onOpenExpert("caching-vram", "Causal Attention & Memory", "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?");
                    } else {
                      onOpenExpert("sampling-params", "Sampling Entropy Physics", "How do Temperature, Top-P, and Max Tokens impact benchmark accuracy?");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-semibold bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 text-[#2563EB] dark:text-[#60A5FA] hover:bg-[#2563EB]/20 border border-[#2563EB]/30 dark:border-[#3B82F6]/40 transition-all cursor-pointer shadow-2xs"
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
              { id: "balance", label: "Prefill vs. Decode Compute Balance", icon: Gauge },
              { id: "attention", label: "Attention Compute Matrix & Roofline", icon: Activity },
              { id: "entropy", label: "Softmax Probability & Entropy Distribution", icon: Sparkles },
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
                      ? "bg-[#2563EB] text-white dark:bg-[#3B82F6] shadow-xs font-semibold"
                      : "bg-[#F1F5F9] dark:bg-[#0F172A] text-[#0F172A]/70 dark:text-slate-300 hover:bg-[#2563EB]/10 hover:text-[#2563EB] dark:hover:text-[#60A5FA]"
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
          {activeTab === "balance" && (
            <PrefillDecodeBalanceGauge
              promptTokens={promptTokens}
              maxTokens={maxTokens}
              presetName={presetName}
              cacheBust={cacheBust}
            />
          )}

          {activeTab === "attention" && (
            <AttentionComputeMatrix
              promptTokens={promptTokens}
              maxTokens={maxTokens}
            />
          )}

          {activeTab === "entropy" && (
            <SamplingEntropyDistributionGraph
              temperature={temperature}
              maxTokens={maxTokens}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
