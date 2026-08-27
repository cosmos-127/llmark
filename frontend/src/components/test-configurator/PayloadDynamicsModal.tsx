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
}) => {
  const [activeTab, setActiveTab] = useState<"balance" | "attention" | "entropy">("balance");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-6 rounded-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Payload Dynamics & Compute Inspector
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Inspect arithmetic intensity, prefill-to-decode ratio, and softmax entropy distribution.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {promptTokens} prompt tok • {maxTokens} gen tok
            </Badge>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 pt-3">
            {[
              { id: "balance", label: "Prefill vs. Decode Balance", icon: Gauge },
              { id: "attention", label: "Attention Compute Matrix", icon: Activity },
              { id: "entropy", label: "Softmax Entropy Distribution", icon: Sparkles },
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
