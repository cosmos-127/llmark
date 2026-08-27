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
  Server,
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

interface GpuProfile {
  id: string;
  name: string;
  shortName: string;
  memoryGb: number;
  bandwidthTb: number;
  generation: string;
}

interface ModelProfile {
  displayName: string;
  weightsGb: number;
  kvGbPerToken: number;
  layers: number;
  precision: string;
}

const GPU_PROFILES: GpuProfile[] = [
  {
    id: "b200",
    name: "NVIDIA B200 SXM6 (Blackwell)",
    shortName: "B200 (192GB)",
    memoryGb: 192,
    bandwidthTb: 8.0,
    generation: "Blackwell",
  },
  {
    id: "h200",
    name: "NVIDIA H200 SXM5 (Hopper Refresh)",
    shortName: "H200 (141GB)",
    memoryGb: 141,
    bandwidthTb: 4.8,
    generation: "Hopper Refresh",
  },
  {
    id: "h100",
    name: "NVIDIA H100 SXM5 (Hopper)",
    shortName: "H100 (80GB)",
    memoryGb: 80,
    bandwidthTb: 3.35,
    generation: "Hopper",
  },
  {
    id: "a100",
    name: "NVIDIA A100 SXM4 (Ampere)",
    shortName: "A100 (80GB)",
    memoryGb: 80,
    bandwidthTb: 2.0,
    generation: "Ampere",
  },
];

const resolveModelProfile = (modelName: string): ModelProfile => {
  const lower = (modelName || "").toLowerCase();

  if (lower.includes("deepseek-v3") || lower.includes("deepseek-r1") || lower.includes("deepseek-reasoner") || lower.includes("deepseek-chat")) {
    return {
      displayName: "DeepSeek V3/R1 MoE",
      weightsGb: 48.0, // Active FP8 weights resident per GPU node domain
      kvGbPerToken: 0.000288,
      layers: 61,
      precision: "FP8 (Multi-Head Latent Attention)",
    };
  }
  if (lower.includes("405b")) {
    return {
      displayName: "LLaMA 3.1 405B",
      weightsGb: 210.0,
      kvGbPerToken: 0.000512,
      layers: 126,
      precision: "FP8 Quantized",
    };
  }
  if (lower.includes("70b") || lower.includes("72b") || lower.includes("llama-3.3-70b") || lower.includes("llama-3.1-70b") || lower.includes("qwen2.5-72b")) {
    return {
      displayName: "70B / 72B Class Model",
      weightsGb: 38.0,
      kvGbPerToken: 0.000328,
      layers: 80,
      precision: "FP8 Quantized (80 layers, 8 GQA heads)",
    };
  }
  if (lower.includes("gpt-4") || lower.includes("claude-3.5-sonnet") || lower.includes("claude-3-opus") || lower.includes("mistral-large") || lower.includes("grok-2")) {
    const cleanName = modelName.includes("/") ? modelName.split("/").pop()! : modelName;
    return {
      displayName: cleanName,
      weightsGb: 38.0,
      kvGbPerToken: 0.000328,
      layers: 80,
      precision: "FP8 Quantized Frontier Spec",
    };
  }
  if (lower.includes("32b") || lower.includes("34b") || lower.includes("codestral") || lower.includes("qwen2.5-32b")) {
    const cleanName = modelName.includes("/") ? modelName.split("/").pop()! : modelName;
    return {
      displayName: cleanName || "32B Class Model",
      weightsGb: 22.0,
      kvGbPerToken: 0.000212,
      layers: 64,
      precision: "FP8 / FP16 Mixed",
    };
  }
  if (lower.includes("14b") || lower.includes("mistral-small") || lower.includes("qwen2.5-14b")) {
    const cleanName = modelName.includes("/") ? modelName.split("/").pop()! : modelName;
    return {
      displayName: cleanName || "14B Class Model",
      weightsGb: 16.0,
      kvGbPerToken: 0.000164,
      layers: 48,
      precision: "FP16 Baseline",
    };
  }
  if (lower.includes("8b") || lower.includes("7b") || lower.includes("llama-3.1-8b") || lower.includes("llama3.1") || lower.includes("mistral")) {
    return {
      displayName: "8B Class Model",
      weightsGb: 14.0,
      kvGbPerToken: 0.000131,
      layers: 32,
      precision: "FP16 Baseline (32 layers, 8 GQA heads)",
    };
  }
  if (lower.includes("mini") || lower.includes("flash") || lower.includes("haiku")) {
    const cleanName = modelName.includes("/") ? modelName.split("/").pop()! : modelName;
    return {
      displayName: cleanName || "Fast Lightweight Model",
      weightsGb: 8.0,
      kvGbPerToken: 0.000105,
      layers: 28,
      precision: "FP8 Quantized Lightweight",
    };
  }
  if (lower.includes("1b") || lower.includes("2b") || lower.includes("3b")) {
    return {
      displayName: "Small SLM (<3B)",
      weightsGb: 4.5,
      kvGbPerToken: 0.000065,
      layers: 24,
      precision: "FP16 Precision",
    };
  }

  // Default fallback for custom or unlisted models
  return {
    displayName: modelName ? (modelName.includes("/") ? modelName.split("/").pop()! : modelName) : "Custom Model",
    weightsGb: 24.0,
    kvGbPerToken: 0.000200,
    layers: 48,
    precision: "FP8 / FP16 Nominal",
  };
};

export const VramAllocationMatrix: React.FC<VramAllocationMatrixProps> = ({
  model,
  promptTokens,
  maxTokens,
  concurrency,
  cacheBust,
}) => {
  // Default to NVIDIA B200 192GB SXM6 (Blackwell)
  const [selectedGpuId, setSelectedGpuId] = useState<string>("b200");
  const [hoveredSegment, setHoveredSegment] = useState<MemorySegment | null>(null);

  const activeGpu = useMemo(() => {
    return GPU_PROFILES.find((g) => g.id === selectedGpuId) || GPU_PROFILES[0];
  }, [selectedGpuId]);

  const targetMemoryGb = activeGpu.memoryGb;

  // Resolve model architecture and weight parameters dynamically from Step 1's selected model
  const modelProfile = useMemo(() => {
    return resolveModelProfile(model);
  }, [model]);

  const modelWeightsGb = modelProfile.weightsGb;

  // Compute KV Cache Memory footprint (in GB)
  const { kvCacheGb, sharedPromptSavingsGb, totalAllocatedGb, vramUtilizationPct, isOverVramLimit } = useMemo(() => {
    const kvGbPerToken = modelProfile.kvGbPerToken;

    let totalKvTokens = 0;
    let savingsGb = 0;

    if (cacheBust) {
      // Cold cache: Every stream allocates full prompt + decode independently
      totalKvTokens = concurrency * (promptTokens + maxTokens);
      savingsGb = 0;
    } else {
      // Prefix caching ON: 1 shared prompt block in memory + N decode streams
      const sharedPromptTokens = promptTokens;
      const streamDecodeTokens = concurrency * maxTokens;
      totalKvTokens = sharedPromptTokens + streamDecodeTokens;
      savingsGb = (concurrency > 1 ? (concurrency - 1) * promptTokens * kvGbPerToken : 0);
    }

    const kvGb = Number((totalKvTokens * kvGbPerToken).toFixed(2));
    const activationsAndOverheadGb = 6.0; // CUDA context, workspace, activation buffers

    const totalGb = Number((modelWeightsGb + kvGb + activationsAndOverheadGb).toFixed(2));
    const utilPct = Math.round((totalGb / targetMemoryGb) * 100);
    const isOver = totalGb > targetMemoryGb * 0.92;

    return {
      kvCacheGb: kvGb,
      sharedPromptSavingsGb: Math.max(0, Number(savingsGb.toFixed(2))),
      totalAllocatedGb: totalGb,
      vramUtilizationPct: utilPct,
      isOverVramLimit: isOver,
    };
  }, [modelWeightsGb, modelProfile, promptTokens, maxTokens, concurrency, cacheBust, targetMemoryGb]);

  // Construct Memory Segments for Visual Map
  const segments = useMemo<MemorySegment[]>(() => {
    const activationsGb = 6.0;
    const freeGb = Math.max(0, Number((targetMemoryGb - totalAllocatedGb).toFixed(2)));

    const segs: MemorySegment[] = [
      {
        id: "weights",
        name: `Model Weights (${modelProfile.displayName})`,
        sizeGb: modelWeightsGb,
        pct: (modelWeightsGb / targetMemoryGb) * 100,
        color: "bg-[#612D53] dark:bg-[#7E3B6C]",
        textColor: "text-[#612D53] dark:text-[#C57BB2]",
        border: "border-[#612D53]/40",
        desc: `Fixed ${modelProfile.precision} parameter weights for ${modelProfile.displayName} resident in GPU HBM.`,
      },
      {
        id: "kv_cache",
        name: `KV Cache Buffer (${concurrency} streams)`,
        sizeGb: kvCacheGb,
        pct: (kvCacheGb / targetMemoryGb) * 100,
        color: cacheBust ? "bg-[#853953] dark:bg-[#A74B6A]" : "bg-emerald-600 dark:bg-emerald-500",
        textColor: cacheBust ? "text-[#853953] dark:text-[#A74B6A]" : "text-emerald-700 dark:text-emerald-400",
        border: cacheBust ? "border-[#853953]/40" : "border-emerald-500/40",
        desc: cacheBust
          ? `Cold KV cache buffer allocated across ${concurrency} independent streams (${modelProfile.layers} layers).`
          : `Prefix-shared KV cache buffer (+${sharedPromptSavingsGb}GB VRAM saved).`,
      },
      {
        id: "activations",
        name: "Activations & CUDA Runtime Overhead",
        sizeGb: activationsGb,
        pct: (activationsGb / targetMemoryGb) * 100,
        color: "bg-blue-600 dark:bg-blue-500",
        textColor: "text-blue-700 dark:text-blue-400",
        border: "border-blue-500/40",
        desc: "Intermediate tensor activation buffers, scratchpad memory, and CUDA runtime context.",
      },
      {
        id: "free",
        name: "Available Headroom (Free VRAM)",
        sizeGb: freeGb,
        pct: (freeGb / targetMemoryGb) * 100,
        color: "bg-[#F3F4F4] dark:bg-[#1E1D1F] border border-dashed border-[#2C2C2C]/20",
        textColor: "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60",
        border: "border-[#2C2C2C]/20",
        desc: `Unallocated GPU high-bandwidth memory available for additional concurrency on ${activeGpu.shortName}.`,
      },
    ];

    return segs;
  }, [modelWeightsGb, modelProfile, kvCacheGb, totalAllocatedGb, targetMemoryGb, concurrency, cacheBust, sharedPromptSavingsGb, activeGpu]);

  return (
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header bar with GPU Architecture Selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${
            isOverVramLimit
              ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400"
              : "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/30 text-[#853953] dark:text-[#A74B6A]"
          }`}>
            <HardDrive className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                GPU VRAM Allocation & KV Cache Footprint
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-sans py-0 px-1.5 ${
                  isOverVramLimit
                    ? "text-rose-700 dark:text-rose-400 border-rose-300 bg-rose-50 dark:bg-rose-950/30"
                    : "text-[#853953] dark:text-[#A74B6A]"
                }`}
              >
                {isOverVramLimit ? "VRAM Capacity Warning" : `${vramUtilizationPct}% VRAM Occupancy`}
              </Badge>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              Hardware simulation for {activeGpu.name} ({activeGpu.memoryGb}GB HBM3e • {activeGpu.bandwidthTb} TB/s bandwidth).
            </p>
          </div>
        </div>

        {/* Interactive GPU Model Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#F3F4F4] dark:bg-[#1E1D1F] border border-[#2C2C2C]/10">
          <span className="text-[10px] font-sans text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 px-1 font-medium flex items-center gap-1">
            <Server className="h-3 w-3" /> Target GPU:
          </span>
          {GPU_PROFILES.map((gpu) => (
            <button
              key={gpu.id}
              type="button"
              onClick={() => setSelectedGpuId(gpu.id)}
              className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                selectedGpuId === gpu.id
                  ? "bg-[#853953] text-white shadow-xs"
                  : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:bg-white dark:hover:bg-[#2C2C2C]"
              }`}
            >
              {gpu.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Memory Allocation Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-sans text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
          <span className="font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
            <span>{activeGpu.name} Memory Partition</span>
            <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-normal">
              (Target: <strong className="text-[#612D53] dark:text-[#C57BB2] font-semibold">{modelProfile.displayName}</strong>)
            </span>
          </span>
          <span className={`tabular-nums font-bold ${isOverVramLimit ? "text-rose-700 dark:text-rose-400" : "text-[#853953] dark:text-[#A74B6A]"}`}>
            {totalAllocatedGb} / {targetMemoryGb} GB ({vramUtilizationPct}%)
          </span>
        </div>

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
              {seg.pct >= 6 && <span>{seg.sizeGb} GB</span>}
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
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#612D53] dark:bg-[#7E3B6C]" />
                  <span>{modelProfile.displayName} Weights ({modelWeightsGb}GB)</span>
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
              <span>Free: {Math.max(0, Number((targetMemoryGb - totalAllocatedGb).toFixed(1)))} GB</span>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Physics Insight Pill */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Cpu className="h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            KV Cache State
          </span>
          <div className="font-semibold text-[#853953] dark:text-[#A74B6A] truncate">
            {cacheBust ? "Cold Prefill (Bust)" : "Prefix Shared (Saved)"}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Prefix Savings
          </span>
          <div className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
            {cacheBust ? "0.0 GB (Cold)" : `+${sharedPromptSavingsGb} GB saved`}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Layers className="h-3 w-3 text-[#612D53] dark:text-[#C57BB2]" />
            Target Model Config
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] truncate">
            {concurrency} streams @ {maxTokens} tok
          </div>
        </div>
      </div>
    </div>
  );
};
