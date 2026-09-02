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
      precision: "FP8 (Multi-Head Latent Attention - MLA)",
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
  const [selectedGpuId, setSelectedGpuId] = useState<string>("b200");
  const [hoveredSegment, setHoveredSegment] = useState<MemorySegment | null>(null);
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(true);

  const activeGpu = useMemo(() => {
    return GPU_PROFILES.find((g) => g.id === selectedGpuId) || GPU_PROFILES[0];
  }, [selectedGpuId]);

  const targetMemoryGb = activeGpu.memoryGb;

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
      totalKvTokens = concurrency * (promptTokens + maxTokens);
      savingsGb = 0;
    } else {
      const sharedPromptTokens = promptTokens;
      const streamDecodeTokens = concurrency * maxTokens;
      totalKvTokens = sharedPromptTokens + streamDecodeTokens;
      savingsGb = (concurrency > 1 ? (concurrency - 1) * promptTokens * kvGbPerToken : 0);
    }

    const kvGb = Number((totalKvTokens * kvGbPerToken).toFixed(2));
    const activationsAndOverheadGb = 6.0;

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
        color: "bg-[var(--brand-secondary)]",
        textColor: "text-[var(--brand-secondary)]",
        border: "border-[var(--brand-secondary-border)]",
        desc: `Fixed ${modelProfile.precision} parameter weights for ${modelProfile.displayName} resident in GPU HBM.`,
      },
      {
        id: "kv_cache",
        name: `KV Cache Buffer (${concurrency} streams)`,
        sizeGb: kvCacheGb,
        pct: (kvCacheGb / targetMemoryGb) * 100,
        color: cacheBust ? "bg-[var(--brand-primary)]" : "bg-emerald-600 dark:bg-emerald-500",
        textColor: cacheBust ? "text-[var(--brand-primary)]" : "text-emerald-700 dark:text-emerald-400",
        border: cacheBust ? "border-[var(--brand-primary-border)]" : "border-emerald-500/40",
        desc: cacheBust
          ? `Cold KV cache buffer allocated across ${concurrency} independent streams (${modelProfile.layers} layers).`
          : `Prefix-shared KV cache buffer (+${sharedPromptSavingsGb}GB VRAM saved).`,
      },
      {
        id: "activations",
        name: "Activations & CUDA Runtime Overhead",
        sizeGb: activationsGb,
        pct: (activationsGb / targetMemoryGb) * 100,
        color: "bg-[var(--brand-primary)]",
        textColor: "text-[var(--brand-primary)]",
        border: "border-[var(--brand-primary-border)]",
        desc: "Intermediate tensor activation buffers, scratchpad memory, and CUDA runtime context.",
      },
      {
        id: "free",
        name: "Available Headroom (Free VRAM)",
        sizeGb: freeGb,
        pct: (freeGb / targetMemoryGb) * 100,
        color: "bg-[var(--bg-surface-subtle)] border border-dashed border-[var(--border-subtle)]",
        textColor: "text-[var(--text-muted)]",
        border: "border-[var(--border-subtle)]",
        desc: `Unallocated GPU high-bandwidth memory available for additional concurrency on ${activeGpu.shortName}.`,
      },
    ];

    return segs;
  }, [modelWeightsGb, modelProfile, kvCacheGb, totalAllocatedGb, targetMemoryGb, concurrency, cacheBust, sharedPromptSavingsGb, activeGpu]);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header bar with GPU Architecture Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${
            isOverVramLimit
              ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400"
              : "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] text-[var(--brand-primary)]"
          } shadow-2xs`}>
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[var(--text-main)]">
                GPU VRAM Allocation & KV Cache Sizing Matrix
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-sans py-0 px-2 ${
                  isOverVramLimit
                    ? "text-rose-700 dark:text-rose-400 border-rose-300 bg-rose-50 dark:bg-rose-950/30 font-bold"
                    : "text-[var(--brand-primary)]"
                }`}
              >
                {isOverVramLimit ? "VRAM Capacity Warning (>92%)" : `${vramUtilizationPct}% VRAM Occupancy`}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] dark:text-white/65 mt-0.5">
              Hardware simulation for {activeGpu.name} ({activeGpu.memoryGb}GB HBM3e • {activeGpu.bandwidthTb} TB/s bandwidth).
            </p>
          </div>
        </div>

        {/* Interactive GPU Model Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] shadow-inner">
          <span className="text-[10px] font-sans text-[var(--text-subtle)] px-1.5 font-semibold flex items-center gap-1">
            <Server className="h-3.5 w-3.5" /> Target GPU:
          </span>
          {GPU_PROFILES.map((gpu) => (
            <button
              key={gpu.id}
              type="button"
              onClick={() => setSelectedGpuId(gpu.id)}
              className={`text-[11px] font-sans font-medium px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedGpuId === gpu.id
                  ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] shadow-xs"
                  : "text-[var(--text-body)] hover:bg-white dark:hover:bg-[var(--bg-surface-hover)]"
              }`}
            >
              {gpu.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Memory Allocation Bar */}
      <div className="space-y-2 p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-subtle)]/70 dark:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between text-xs font-sans text-[var(--text-body)]">
          <span className="font-semibold text-[var(--text-main)] flex items-center gap-2">
            <span>{activeGpu.name} Memory Partition</span>
            <span className="text-[11px] text-[var(--text-subtle)] font-normal">
              (Target: <strong className="text-[var(--brand-secondary)] font-semibold">{modelProfile.displayName}</strong>)
            </span>
          </span>
          <span className={`tabular-nums font-bold text-xs ${isOverVramLimit ? "text-rose-700 dark:text-rose-400" : "text-[var(--brand-primary)]"}`}>
            {totalAllocatedGb} / {targetMemoryGb} GB ({vramUtilizationPct}%)
          </span>
        </div>

        <div className="h-7 w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-0.5 flex items-center overflow-hidden gap-1 select-none shadow-inner">
          {segments.map((seg) => (
            <motion.div
              key={seg.id}
              initial={{ width: 0 }}
              animate={{ width: `${seg.pct}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onMouseEnter={() => setHoveredSegment(seg)}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`h-full rounded-lg ${seg.color} cursor-pointer transition-all flex items-center justify-center text-xs font-sans font-bold text-white truncate px-1 shadow-2xs hover:brightness-110 ${
                seg.id === "free" ? "text-[var(--text-muted)]" : ""
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
              className="p-2.5 rounded-xl bg-[var(--bg-surface-elevated)]/95 dark:bg-black/95 text-white text-xs flex items-center justify-between shadow-lg backdrop-blur-md border border-white/10"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-white">{hoveredSegment.name}</span>
                <span className="text-[var(--brand-primary)] font-sans font-bold">{hoveredSegment.sizeGb} GB ({Math.round(hoveredSegment.pct)}%)</span>
              </div>
              <span className="text-[11px] text-white/75 font-sans">{hoveredSegment.desc}</span>
            </motion.div>
          ) : (
            <div className="flex items-center justify-between text-xs font-sans text-[var(--text-body)] pt-1">
              <div className="flex items-center gap-3.5 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[var(--brand-secondary)]" />
                  <span>{modelProfile.displayName} Weights ({modelWeightsGb}GB)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-xs ${cacheBust ? "bg-[var(--brand-primary)]" : "bg-emerald-600 dark:bg-emerald-500"}`} />
                  <span>KV Cache ({kvCacheGb}GB)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[var(--brand-primary)]" />
                  <span>Runtime Overhead (6GB)</span>
                </span>
              </div>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Free Headroom: {Math.max(0, Number((targetMemoryGb - totalAllocatedGb).toFixed(1)))} GB
              </span>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Physics Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            KV Cache Allocation State
          </span>
          <div className="font-bold text-[var(--brand-primary)] text-xs truncate">
            {cacheBust ? "Cold Prefill (Independent Slots)" : "Prefix Shared (Reused Blocks)"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Prefix Cache VRAM Savings
          </span>
          <div className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-xs">
            {cacheBust ? "0.0 GB (Cold cache)" : `+${sharedPromptSavingsGb} GB VRAM saved`}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[var(--brand-secondary)]" />
            Target Architecture Spec
          </span>
          <div className="font-sans tabular-nums font-semibold text-[var(--text-main)] text-xs truncate">
            {concurrency} streams @ {maxTokens} tok ({modelProfile.layers} layers)
          </div>
        </div>
      </div>

      {/* Theoretical Foundations Collapsible Card */}
      <div className="p-4 rounded-xl bg-[var(--bg-surface-subtle)]/80 dark:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-3">
        <button
          type="button"
          onClick={() => setShowTheoryDetails(!showTheoryDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[var(--text-main)] cursor-pointer hover:text-[var(--brand-primary)]"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--brand-primary)]" />
            <span>KV Cache Architecture: MHA, GQA, MLA & PagedAttention</span>
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showTheoryDetails ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showTheoryDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-2 text-xs border-t border-[var(--border-subtle)]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                  <span className="font-semibold text-[var(--brand-primary)]">
                    KV Cache Size Formulation (per token):
                  </span>
                  <MathFormula math="\text{Bytes}_{\text{KV}} = 2 \times n_{\text{layers}} \times n_{\text{heads\_kv}} \times d_{\text{head}} \times b_{\text{elem}}" block />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-white/65">
                    Grouped-Query Attention (GQA) with 8 KV heads reduces KV memory footprint by up to 8x compared to Multi-Head Attention (MHA).
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                  <span className="font-semibold text-[var(--brand-secondary)]">
                    Prefix Caching Compression Savings:
                  </span>
                  <MathFormula math="\Delta \text{VRAM}_{\text{saved}} = (B - 1) \cdot N_{\text{prompt}} \cdot \text{Bytes}_{\text{KV\_per\_token}}" block />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-white/65">
                    Radix trees in PagedAttention share immutable system prompts across concurrent streams <MathFormula math="B" />, unlocking massive concurrency on fixed VRAM.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
