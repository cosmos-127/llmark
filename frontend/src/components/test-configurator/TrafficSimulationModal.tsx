import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { WaveformSimulationGraph } from "@/components/test-configurator/WaveformSimulationGraph";
import { TokenBucketReservoir } from "@/components/test-configurator/TokenBucketReservoir";
import { VramAllocationMatrix } from "@/components/test-configurator/VramAllocationMatrix";
import { Activity, Waves, Database, Zap, Sparkles } from "lucide-react";
import { LoadCurveType } from "@/lib/types";

interface TrafficSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadCurve: LoadCurveType;
  concurrency: number;
  testMode: "duration" | "requests";
  durationSeconds: number;
  totalRequests?: number;
  warmupRequests: number;
  promptTokens: number;
  maxTokens: number;
  model: string;
  cacheBust: boolean;
  onOpenExpert?: (topicId: string, title?: string, defaultQuestion?: string) => void;
}

export const TrafficSimulationModal: React.FC<TrafficSimulationModalProps> = ({
  isOpen,
  onClose,
  loadCurve,
  concurrency,
  testMode,
  durationSeconds,
  totalRequests,
  warmupRequests,
  promptTokens,
  maxTokens,
  model,
  cacheBust,
  onOpenExpert,
}) => {
  const [activeTab, setActiveTab] = useState<"waveform" | "tokenbucket" | "vram">("waveform");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl lg:max-w-6xl p-6 sm:p-7 rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-[#2C2C2C]/10 dark:border-white/10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#853953]/10 dark:bg-[#D84577]/15 text-[#853953] dark:text-[#F06A9A] border border-[#853953]/25 dark:border-[#E05284]/35 shadow-xs">
                <Waves className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#2C2C2C] dark:text-white">
                  Traffic Dispatch Waveform & Hardware VRAM Simulation
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-[#2C2C2C]/65 dark:text-white/65">
                  Simulate dynamic request arrival curves, token bucket quota drainage, and GPU VRAM KV-cache partitioning.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="purple" className="text-xs font-sans py-0.5 px-2.5">
                Step 3 Deep Analysis
              </Badge>
              <Badge variant="outline" className="text-xs font-sans font-semibold py-0.5 px-2.5 capitalize">
                {loadCurve.replace("_", " ")} • {concurrency} in-flight streams
              </Badge>
              {onOpenExpert && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "waveform") {
                      onOpenExpert("load-curve", "Traffic Waveforms", "What is the Saturation Knee Probe and how does it detect cluster limits?");
                    } else if (activeTab === "tokenbucket") {
                      onOpenExpert("traffic-concurrency", "Worker Concurrency Pools", "How do I choose the right concurrency worker pool for stress testing?");
                    } else {
                      onOpenExpert("caching-vram", "Hardware VRAM & KV Cache", "How is KV cache memory calculated per stream?");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-semibold bg-[#853953]/10 dark:bg-[#D84577]/15 text-[#853953] dark:text-[#F06A9A] hover:bg-[#853953]/20 border border-[#853953]/30 dark:border-[#E05284]/40 transition-all cursor-pointer shadow-2xs"
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
              { id: "waveform", label: "Traffic Dispatch Waveform Simulation", icon: Waves },
              { id: "tokenbucket", label: "Token Bucket Rate Limiter & Headroom", icon: Zap },
              { id: "vram", label: "GPU VRAM & KV-Cache Partitioning", icon: Database },
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
                      ? "bg-[#853953] text-white dark:bg-[#D84577] shadow-xs font-semibold"
                      : "bg-[#F3F4F4] dark:bg-[#0B0B0E] text-[#2C2C2C]/70 dark:text-slate-300 hover:bg-[#853953]/10 hover:text-[#853953] dark:hover:text-[#F06A9A]"
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
          {activeTab === "waveform" && (
            <WaveformSimulationGraph
              loadCurve={loadCurve}
              concurrency={concurrency}
              testMode={testMode}
              durationSeconds={durationSeconds}
              totalRequests={totalRequests}
              warmupRequests={warmupRequests}
            />
          )}

          {activeTab === "tokenbucket" && (
            <TokenBucketReservoir
              concurrency={concurrency}
              loadCurve={loadCurve}
              promptTokens={promptTokens}
              maxTokens={maxTokens}
            />
          )}

          {activeTab === "vram" && (
            <VramAllocationMatrix
              model={model}
              promptTokens={promptTokens}
              maxTokens={maxTokens}
              concurrency={concurrency}
              cacheBust={cacheBust}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
