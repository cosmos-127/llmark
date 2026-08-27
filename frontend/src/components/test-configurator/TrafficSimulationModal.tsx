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
import { Activity, Waves, Database, Zap } from "lucide-react";
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
}) => {
  const [activeTab, setActiveTab] = useState<"waveform" | "tokenbucket" | "vram">("waveform");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-6 rounded-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                <Waves className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Traffic Geometry & Hardware VRAM Simulation
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Simulate live request dispatch waveforms, token bucket rate limits, and GPU KV-cache allocation.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono capitalize">
              {loadCurve.replace("_", " ")} • {concurrency} streams
            </Badge>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 pt-3">
            {[
              { id: "waveform", label: "Arrival Waveform Simulation", icon: Waves },
              { id: "tokenbucket", label: "Token Bucket Rate Limiter", icon: Zap },
              { id: "vram", label: "GPU VRAM & KV-Cache Sizing", icon: Database },
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
