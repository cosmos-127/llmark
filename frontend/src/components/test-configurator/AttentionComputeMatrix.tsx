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
  HelpCircle,
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
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(true);

  // 8x8 Matrix representation of Causal Attention Query-Key interactions
  const MATRIX_SIZE = 8;
  const PREFILL_SPLIT = 5;

  return (
    <div className="rounded-2xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl border bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/30 text-[#853953] dark:text-[#A74B6A] shadow-2xs">
            <Grid className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Attention Matrix Physics: Quadratic Prefill vs. Autoregressive Decode
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-2">
                Theoretical Physics
              </Badge>
              <Badge variant="outline" className="text-[10px] font-sans py-0 px-2 text-[#853953] dark:text-[#A74B6A]">
                O(N²) Prefill • O(N) Decode
              </Badge>
            </div>
            <p className="text-xs text-[#2C2C2C]/65 dark:text-[#F3F4F4]/65 mt-0.5">
              Visualizes why prompt ingestion is compute-bound (Tensor Cores), while token generation is memory-bandwidth bound (HBM).
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-sm font-bold font-sans tabular-nums text-[#853953] dark:text-[#A74B6A]">
            ~{(promptTokens * promptTokens).toLocaleString()} Q×K Interactions
          </span>
          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            Causal Mask Triangle Matrix
          </span>
        </div>
      </div>

      {/* Visual 2D Matrix & Arithmetic Intensity Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center p-4 sm:p-5 rounded-2xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 select-none">
        {/* Left: 2D Triangular Attention Heatmap Grid */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-3">
          <div className="p-3 rounded-2xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 shadow-inner">
            <div className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: MATRIX_SIZE }).map((_, qIdx) =>
                Array.from({ length: MATRIX_SIZE }).map((_, kIdx) => {
                  const isCausalMasked = kIdx > qIdx;
                  const isHovered = hoveredCell?.q === qIdx && hoveredCell?.k === kIdx;
                  const isPrefillCell = !isCausalMasked && qIdx < PREFILL_SPLIT;
                  const isDecodeCell = !isCausalMasked && qIdx >= PREFILL_SPLIT;

                  return (
                    <motion.div
                      key={`${qIdx}-${kIdx}`}
                      onMouseEnter={() => setHoveredCell({ q: qIdx, k: kIdx })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-6 w-6 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                        isCausalMasked
                          ? "bg-[#2C2C2C]/5 dark:bg-[#F3F4F4]/5 opacity-15 cursor-not-allowed"
                          : isDecodeCell
                          ? "bg-[#612D53] dark:bg-[#C57BB2] text-white shadow-2xs hover:brightness-110"
                          : "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-2xs hover:brightness-110"
                      } ${isHovered ? "scale-125 ring-2 ring-white z-10 shadow-md" : ""}`}
                    >
                      {!isCausalMasked && (
                        <span className="text-[9px] font-sans font-bold">
                          {isDecodeCell ? "D" : "P"}
                        </span>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs font-sans text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#853953] dark:bg-[#A74B6A]" />
              <span className="font-medium">Prefill Phase: O(N²)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#612D53] dark:bg-[#C57BB2]" />
              <span className="font-medium">Decode Phase: O(N)</span>
            </span>
            <span className="flex items-center gap-1.5 opacity-50">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#2C2C2C]/20 dark:bg-[#F3F4F4]/20" />
              <span>Masked (k &gt; q)</span>
            </span>
          </div>

          {/* Hover Cell Inspector */}
          {hoveredCell && (
            <div className="text-xs font-sans text-center bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 rounded-lg px-3 py-1 text-[#2C2C2C] dark:text-[#F3F4F4]">
              Query <code className="font-bold">q_{hoveredCell.q + 1}</code> attends to Key <code className="font-bold">k_{hoveredCell.k + 1}</code>
              {hoveredCell.k > hoveredCell.q ? (
                <span className="text-rose-500 font-semibold ml-1.5">(Causal Future Masked)</span>
              ) : hoveredCell.q < PREFILL_SPLIT ? (
                <span className="text-[#853953] dark:text-[#A74B6A] font-semibold ml-1.5">(Parallel GEMM)</span>
              ) : (
                <span className="text-[#612D53] dark:text-[#C57BB2] font-semibold ml-1.5">(KV Cache GEMV)</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Arithmetic Intensity Hardware Comparison */}
        <div className="lg:col-span-7 space-y-3.5 text-xs">
          {/* Prefill Phase Row */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#853953] dark:text-[#A74B6A] flex items-center gap-2 text-xs">
                <Cpu className="h-4 w-4" />
                <span>1. Prefill Phase (Prompt Ingestion)</span>
              </span>
              <Badge variant="outline" className="font-sans font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-[11px]">
                Compute-Bound (Tensor Cores)
              </Badge>
            </div>
            <p className="text-xs text-[#2C2C2C]/75 dark:text-[#F3F4F4]/75 leading-relaxed">
              All <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">{promptTokens.toLocaleString()} prompt tokens</strong> are multiplied in a single parallel <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">GEMM</strong> (General Matrix Multiply). High arithmetic intensity (<MathFormula math="I \gg 100 \text{ FLOPs/Byte}" />) fully saturates GPU Tensor Cores. Dictates <strong className="text-[#853953] dark:text-[#A74B6A]">Time to First Token (TTFT)</strong>.
            </p>
          </div>

          {/* Decode Phase Row */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#612D53] dark:text-[#C57BB2] flex items-center gap-2 text-xs">
                <HardDrive className="h-4 w-4" />
                <span>2. Decode Phase (Autoregressive Generation)</span>
              </span>
              <Badge variant="outline" className="font-sans font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-[11px]">
                Memory-Bound (HBM Bandwidth)
              </Badge>
            </div>
            <p className="text-xs text-[#2C2C2C]/75 dark:text-[#F3F4F4]/75 leading-relaxed">
              To generate each single output token (1 at a time), the GPU executes a <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">GEMV</strong> (Matrix-Vector Multiply). The entire multi-gigabyte model weights must be re-read from GPU HBM into SRAM for <em>each generated token</em>. Low arithmetic intensity (<MathFormula math="I \approx 1\text{ FLOP/Byte}" />) bottlenecks generation on memory bandwidth, dictating <strong className="text-[#612D53] dark:text-[#C57BB2]">Time Per Output Token (TPOT / ITL)</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Theoretical Foundations Collapsible Card */}
      <div className="p-4 rounded-xl bg-[#F3F4F4]/80 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 space-y-3">
        <button
          type="button"
          onClick={() => setShowTheoryDetails(!showTheoryDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] cursor-pointer hover:text-[#853953] dark:hover:text-[#A74B6A]"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#853953] dark:text-[#A74B6A]" />
            <span>Mathematical Attention Formulation & Roofline Theory</span>
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showTheoryDetails ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showTheoryDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-2 text-xs border-t border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1.5">
                  <span className="font-semibold text-[#853953] dark:text-[#A74B6A]">
                    Causal Scaled Dot-Product Attention:
                  </span>
                  <MathFormula math="\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}} + M\right) V" block />
                  <p className="text-[11px] text-[#2C2C2C]/65 dark:text-[#F3F4F4]/65">
                    Where <MathFormula math="M_{ij} = -\infty" /> when <MathFormula math="j > i" />, preventing future tokens from leaking into past context representations.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1.5">
                  <span className="font-semibold text-[#612D53] dark:text-[#C57BB2]">
                    Roofline Arithmetic Intensity Split:
                  </span>
                  <MathFormula math="I = \frac{\text{Total Floating Point Operations (FLOPs)}}{\text{Total Memory Bytes Transferred (HBM \to SRAM)}}" block />
                  <p className="text-[11px] text-[#2C2C2C]/65 dark:text-[#F3F4F4]/65">
                    Prefill achieves <MathFormula math="I_{\text{prefill}} \gg \text{Ridge Point}" /> (compute-bound), while single-batch decode achieves <MathFormula math="I_{\text{decode}} \ll \text{Ridge Point}" /> (memory-bandwidth bound).
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
