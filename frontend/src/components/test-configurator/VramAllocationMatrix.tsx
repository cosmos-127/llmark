import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HardDrive,
  Cpu,
  Zap,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  BookOpen,
  ChevronDown,
  Gauge,
  Database,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MathFormula } from "@/components/ui/math-formula";

interface VramAllocationMatrixProps {
  model: string;
  promptTokens: number;
  maxTokens: number;
  concurrency: number;
  cacheBust: boolean;
  totalGpuMemoryGb?: number;
}

interface MemorySegment {
  id: string;
  name: string;
  sizeGb: number;
  pct: number;
  color: string;
  textColor: string;
  border: string;
  desc: string;
}

export const VramAllocationMatrix: React.FC<VramAllocationMatrixProps> = ({
  model,
  promptTokens,
  maxTokens,
  concurrency,
  cacheBust,
  totalGpuMemoryGb = 80, // Default to NVIDIA H100 80GB SXM5
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<MemorySegment | null>(null);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

  // Heuristic model weight size based on model name
  const modelWeightsGb = useMemo(() => {
    const lower = (model || "").toLowerCase();
    if (lower.includes("70b") || lower.includes("large") || lower.includes("gpt-4") || lower.includes("claude-3-opus") || lower.includes("pro")) {
      return 38.0; // FP8 / Int8 quantized 70B weights
    }
    if (lower.includes("8b") || lower.includes("small") || lower.includes("mini") || lower.includes("flash") || lower.includes("haiku")) {
      return 14.0; // 8B model weights
    }
    return 24.0; // Default nominal weights (e.g. 14B-32B class)
  }, [model]);

  // Compute KV Cache Memory footprint (in GB)
  const { kvCacheGb, sharedPromptSavingsGb, totalAllocatedGb, vramUtilizationPct, isOverVramLimit } = useMemo(() => {
    const kvBytesPerToken = 0.00012; // ~120KB per 1,000 tokens per stream with modern GQA

    let totalKvTokens = 0;
    let savingsGb = 0;

    if (cacheBust) {
      // Cold cache: Every stream allocates full prompt + decode independently
      totalKvTokens = concurrency * (promptTokens + maxTokens);
    } else {
      // Prefix caching ON: 1 shared prompt block in memory + N decode streams
      const sharedPromptTokens = promptTokens;
      const streamDecodeTokens = concurrency * maxTokens;
      totalKvTokens = sharedPromptTokens + streamDecodeTokens;
      savingsGb = ((concurrency - 1) * promptTokens * kvBytesPerToken) / 1000;
    }

    const kvGb = Number(((totalKvTokens * kvBytesPerToken) / 1000).toFixed(2));
    const activationsAndOverheadGb = 6.0; // CUDA context, workspace, activation buffers

    const totalGb = Number((modelWeightsGb + kvGb + activationsAndOverheadGb).toFixed(2));
    const utilPct = Math.round((totalGb / totalGpuMemoryGb) * 100);
    const isOver = totalGb > totalGpuMemoryGb * 0.92;

    return {
      kvCacheGb: kvGb,
      sharedPromptSavingsGb: Math.max(0, Number(savingsGb.toFixed(2))),
      totalAllocatedGb: totalGb,
      vramUtilizationPct: utilPct,
      isOverVramLimit: isOver,
    };
  }, [modelWeightsGb, promptTokens, maxTokens, concurrency, cacheBust, totalGpuMemoryGb]);

  // Construct Memory Segments for Visual Map
  const segments = useMemo<MemorySegment[]>(() => {
    const activationsGb = 6.0;
    const freeGb = Math.max(0, Number((totalGpuMemoryGb - totalAllocatedGb).toFixed(2)));

    const segs: MemorySegment[] = [
      {
        id: "weights",
        name: "Model Weights (Parameters)",
        sizeGb: modelWeightsGb,
        pct: (modelWeightsGb / totalGpuMemoryGb) * 100,
        color: "bg-[#612D53] dark:bg-[#7E3B6C]",
        textColor: "text-[#612D53] dark:text-[#C57BB2]",
        border: "border-[#612D53]/40",
        desc: `Fixed FP8/Int8 parameter weights resident in GPU High-Bandwidth Memory (HBM).`,
      },
      {
        id: "kv_cache",
        name: `KV Cache Buffer (${concurrency} streams)`,
        sizeGb: kvCacheGb,
        pct: (kvCacheGb / totalGpuMemoryGb) * 100,
        color: cacheBust ? "bg-[#853953] dark:bg-[#A74B6A]" : "bg-emerald-600 dark:bg-emerald-500",
        textColor: cacheBust ? "text-[#853953] dark:text-[#A74B6A]" : "text-emerald-700 dark:text-emerald-400",
        border: cacheBust ? "border-[#853953]/40" : "border-emerald-500/40",
        desc: cacheBust
          ? `Cold KV cache buffer allocated across ${concurrency} independent streams.`
          : `Prefix-shared KV cache buffer (+${sharedPromptSavingsGb}GB VRAM saved).`,
      },
      {
        id: "activations",
        name: "Activations & CUDA Runtime Overhead",
        sizeGb: activationsGb,
        pct: (activationsGb / totalGpuMemoryGb) * 100,
        color: "bg-blue-600 dark:bg-blue-500",
        textColor: "text-blue-700 dark:text-blue-400",
        border: "border-blue-500/40",
        desc: "Intermediate tensor activation buffers, scratchpad memory, and CUDA workspace.",
      },
      {
        id: "free",
        name: "Available Headroom (Free VRAM)",
        sizeGb: freeGb,
        pct: (freeGb / totalGpuMemoryGb) * 100,
        color: "bg-[#F3F4F4] dark:bg-[#1E1D1F] border border-dashed border-[#2C2C2C]/20",
        textColor: "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60",
        border: "border-[#2C2C2C]/20",
        desc: "Unallocated GPU high-bandwidth memory available for additional concurrency.",
      },
    ];

    return segs;
  }, [modelWeightsGb, kvCacheGb, totalAllocatedGb, totalGpuMemoryGb, concurrency, cacheBust, sharedPromptSavingsGb]);

  return (
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${
            isOverVramLimit
              ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400"
              : "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/30 text-[#853953] dark:text-[#A74B6A]"
          }`}>
            <HardDrive className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                GPU VRAM Allocation & KV Cache Footprint
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-sans py-0 px-1.5 ${
                  isOverVramLimit
                    ? "text-rose-700 dark:text-rose-400 border-rose-300"
                    : "text-[#853953] dark:text-[#A74B6A]"
                }`}
              >
                {isOverVramLimit ? "VRAM Capacity Warning" : `${vramUtilizationPct}% VRAM Occupancy`}
              </Badge>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              Hardware simulation for NVIDIA H100 80GB SXM5 GPU memory partition.
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className={`text-xs font-semibold font-sans tabular-nums ${
            isOverVramLimit ? "text-rose-700 dark:text-rose-400" : "text-[#853953] dark:text-[#A74B6A]"
          }`}>
            {totalAllocatedGb} / {totalGpuMemoryGb} GB
          </span>
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            Estimated Memory Map
          </span>
        </div>
      </div>

      {/* Visual Memory Allocation Bar */}
      <div className="space-y-1.5">
        <div className="h-5 w-full rounded-xl bg-[#F3F4F4] dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 p-0.5 flex items-center overflow-hidden gap-0.5 select-none">
          {segments.map((seg) => (
            <motion.div
              key={seg.id}
              initial={{ width: 0 }}
              animate={{ width: `${seg.pct}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onMouseEnter={() => setHoveredSegment(seg)}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`h-full rounded-lg ${seg.color} cursor-pointer transition-all flex items-center justify-center text-[10px] font-sans font-semibold text-white truncate px-1 shadow-2xs hover:brightness-110 ${
                seg.id === "free" ? "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60" : ""
              }`}
            >
              {seg.pct >= 12 && <span>{seg.sizeGb} GB</span>}
            </motion.div>
          ))}
        </div>

        {/* Hovered Segment Details Overlay */}
        <AnimatePresence>
          {hoveredSegment ? (
            <motion.div
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              className="p-2 rounded-lg bg-[#2C2C2C]/95 dark:bg-black/95 text-white text-xs flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{hoveredSegment.name}</span>
                <span className="text-[#A74B6A] font-sans font-bold">{hoveredSegment.sizeGb} GB ({Math.round(hoveredSegment.pct)}%)</span>
              </div>
              <span className="text-[10px] text-white/70 font-sans">{hoveredSegment.desc}</span>
            </motion.div>
          ) : (
            /* Default Legend Strip */
            <div className="flex items-center justify-between text-[11px] font-sans text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 pt-0.5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#612D53] dark:bg-[#7E3B6C]" />
                  <span>Weights ({modelWeightsGb}GB)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className={`h-2.5 w-2.5 rounded-xs ${cacheBust ? "bg-[#853953] dark:bg-[#A74B6A]" : "bg-emerald-600 dark:bg-emerald-500"}`} />
                  <span>KV Cache ({kvCacheGb}GB)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-xs bg-blue-600 dark:bg-blue-500" />
                  <span>Buffers (6GB)</span>
                </span>
              </div>
              <span>Free: {Math.max(0, Number((totalGpuMemoryGb - totalAllocatedGb).toFixed(1)))} GB</span>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Physics Insight Pill */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans font-medium flex items-center gap-1">
            <Cpu className="h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            KV Cache State
          </span>
          <div className="font-semibold text-[#853953] dark:text-[#A74B6A] truncate">
            {cacheBust ? "Cold Prefill (Bust)" : "Prefix Shared (Saved)"}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Prefix Savings
          </span>
          <div className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
            {cacheBust ? "0.0 GB (Cold)" : `+${sharedPromptSavingsGb} GB saved`}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans font-medium flex items-center gap-1">
            <Layers className="h-3 w-3 text-[#612D53] dark:text-[#C57BB2]" />
            Concurrency VRAM
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
            {concurrency} streams @ {maxTokens} tok
          </div>
        </div>
      </div>

      {/* Expandable Deep-Dive Knowledge Dropdown */}
      <div className="rounded-xl border border-[#2C2C2C]/15 dark:border-[#F3F4F4]/15 bg-[#F3F4F4]/40 dark:bg-[#1E1D1F]/60 overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsKnowledgeOpen(!isKnowledgeOpen)}
          className="w-full flex items-center justify-between p-3 px-3.5 text-left hover:bg-[#F3F4F4]/80 dark:hover:bg-[#2C2C2C]/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#853953] dark:text-[#A74B6A]" />
            <div>
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Understanding GPU Memory & KV Cache Sizing
              </span>
              <p className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                Click to explore how model parameters, KV cache token buffers, and prefix sharing consume GPU VRAM.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-sans py-0 px-1.5 text-[#853953] dark:text-[#A74B6A] border-[#853953]/30">
              {isKnowledgeOpen ? "Hide Guide" : "Expand Guide"}
            </Badge>
            <motion.div
              animate={{ rotate: isKnowledgeOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60" />
            </motion.div>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isKnowledgeOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="border-t border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 p-3.5 space-y-3 text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#612D53] dark:text-[#C57BB2] font-semibold text-xs">
                    <Database className="h-3.5 w-3.5" />
                    <span>Static Model Weights vs. Dynamic KV Cache</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    Model weights are static (<MathFormula math="\text{VRAM}_{\text{weights}} \approx 38\text{ GB}" /> for FP8 70B). The dynamic KV cache footprint scales as:
                  </p>
                  <MathFormula math="\text{VRAM}_{\text{KV}} \propto 2 \times n_{\text{layers}} \times n_{\text{kv\_heads}} \times d_{\text{head}} \times N_{\text{streams}} \times N_{\text{tokens}}" block className="text-[10px] text-[#853953] dark:text-[#A74B6A]" />
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Prefix Caching Memory Multiplier</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    When <MathFormula math="N_{\text{streams}}" /> share identical system instructions, <strong>Prefix Caching</strong> stores prompt tensors once, saving:
                  </p>
                  <MathFormula math="\Delta \text{VRAM}_{\text{saved}} = (N_{\text{streams}} - 1) \times N_{\text{prompt}} \times \text{BytesPerToken}" block className="text-[10px] text-emerald-700 dark:text-emerald-400" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
