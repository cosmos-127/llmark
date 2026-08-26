import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Grid,
  Cpu,
  HardDrive,
  BookOpen,
  ChevronDown,
  Gauge,
  Sparkles,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MathFormula } from "@/components/ui/math-formula";

interface AttentionComputeMatrixProps {
  promptTokens: number;
  maxTokens: number;
}

export const AttentionComputeMatrix: React.FC<AttentionComputeMatrixProps> = ({
  promptTokens,
  maxTokens,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ q: number; k: number } | null>(null);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

  // 6x6 Matrix representation of Causal Attention Query-Key interactions
  const MATRIX_SIZE = 6;

  return (
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/30 text-[#853953] dark:text-[#A74B6A]">
            <Grid className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Attention Matrix Physics: Quadratic Prefill vs Autoregressive Decode
              </span>
              <Badge variant="outline" className="text-[10px] font-sans py-0 px-1.5 text-[#853953] dark:text-[#A74B6A]">
                O(N²) Prefill • O(N) Decode
              </Badge>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              Visualizes why prompt ingestion is compute-bound, while token generation is memory-bandwidth bound.
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-xs font-semibold font-sans tabular-nums text-[#853953] dark:text-[#A74B6A]">
            ~{promptTokens.toLocaleString()} Q×K Interactions
          </span>
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            Causal Mask Matrix
          </span>
        </div>
      </div>

      {/* Visual 2D Matrix & Arithmetic Intensity Meter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3.5 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 select-none">
        {/* Left: 2D Triangular Attention Heatmap Grid */}
        <div className="md:col-span-5 flex flex-col items-center justify-center space-y-1.5">
          <div className="grid grid-cols-6 gap-1 p-2 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 shadow-inner">
            {Array.from({ length: MATRIX_SIZE }).map((_, qIdx) =>
              Array.from({ length: MATRIX_SIZE }).map((_, kIdx) => {
                const isCausalMasked = kIdx > qIdx;
                const isHovered = hoveredCell?.q === qIdx && hoveredCell?.k === kIdx;
                const isPrefillCell = !isCausalMasked && qIdx < 4;
                const isDecodeCell = !isCausalMasked && qIdx >= 4;

                return (
                  <motion.div
                    key={`${qIdx}-${kIdx}`}
                    onMouseEnter={() => setHoveredCell({ q: qIdx, k: kIdx })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`h-5 w-5 rounded-xs flex items-center justify-center transition-all cursor-pointer ${
                      isCausalMasked
                        ? "bg-[#2C2C2C]/5 dark:bg-[#F3F4F4]/5 opacity-20 cursor-not-allowed"
                        : isDecodeCell
                        ? "bg-[#612D53] dark:bg-[#C57BB2] text-white shadow-2xs"
                        : "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-2xs"
                    } ${isHovered ? "scale-110 ring-2 ring-white z-10" : ""}`}
                  >
                    {!isCausalMasked && (
                      <span className="text-[8px] font-sans font-bold">
                        {isDecodeCell ? "D" : "P"}
                      </span>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] font-sans text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-[#853953] dark:bg-[#A74B6A]" />
              <span>Prefill O(N²)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-[#612D53] dark:bg-[#C57BB2]" />
              <span>Decode O(N)</span>
            </span>
          </div>
        </div>

        {/* Right: Arithmetic Intensity Hardware Comparison */}
        <div className="md:col-span-7 space-y-3 text-xs">
          {/* Prefill Phase Row */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#853953] dark:text-[#A74B6A] flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <span>Prefill Phase (Ingestion)</span>
              </span>
              <span className="font-sans font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                Compute-Bound (100% Tensor Cores)
              </span>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
              Full prompt matrix multiplied simultaneously. Max FLOPs efficiency, dictates <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">TTFT</strong>.
            </p>
          </div>

          {/* Decode Phase Row */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#612D53] dark:text-[#C57BB2] flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" />
                <span>Decode Phase (Generation)</span>
              </span>
              <span className="font-sans font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                Memory-Bound (~0.8 FLOPs/Byte)
              </span>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
              GPU must reload entire weights from HBM for <em>every single generated token</em>. Dictates <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">TPOT</strong>.
            </p>
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
                Understanding Attention Mechanics: Quadratic Prefill vs. Memory-Bound Decode
              </span>
              <p className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                Click to explore the causal attention matrix, arithmetic intensity, and FlashAttention optimizations.
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
                  <div className="flex items-center gap-1.5 text-[#853953] dark:text-[#A74B6A] font-semibold text-xs">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>Prefill Phase (<MathFormula math="\mathcal{O}(N^2)" /> Compute-Bound)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    During prefill, the model ingests all <MathFormula math="N" /> prompt tokens in parallel. Because every token attends to all previous tokens (lower triangular causal mask), the total attention operations scale as <MathFormula math="\frac{N(N+1)}{2} \approx \mathcal{O}(N^2)" />. This saturates GPU tensor cores and determines <strong>Time-to-First-Token (TTFT)</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#612D53] dark:text-[#C57BB2] font-semibold text-xs">
                    <HardDrive className="h-3.5 w-3.5" />
                    <span>Decode Phase (<MathFormula math="\mathcal{O}(N)" /> Memory-Bound)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    During decode, the model generates one token at a time sequentially. The GPU must stream all model weights (<MathFormula math="\mathcal{O}(M)" /> bytes) from high-bandwidth memory (HBM) for just 1 token computation. This low arithmetic intensity (<MathFormula math="\approx 0.8\text{ FLOPs/Byte}" />) makes decode strictly <strong>memory-bandwidth bound</strong>, setting the floor for <strong>Time Per Output Token (TPOT / ITL)</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1.5">
                <span className="font-semibold text-xs text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Engineering Solutions: FlashAttention & Chunked Prefill
                </span>
                <p className="text-[11px] leading-relaxed text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                  Modern inference engines (vLLM, TensorRT-LLM, SGLang) use <strong>FlashAttention</strong> (tiling attention computation in GPU SRAM to prevent HBM read/write bottlenecks) and <strong>Chunked Prefills</strong> (splitting long prompt ingestion into chunks across batches to avoid stalling concurrent decode streams).
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
