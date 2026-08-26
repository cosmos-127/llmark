import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Zap,
  Activity,
  Cpu,
  HardDrive,
  Info,
  Clock,
  Gauge,
  Sparkles,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MathFormula } from "@/components/ui/math-formula";

interface PrefillDecodeBalanceGaugeProps {
  promptTokens: number;
  maxTokens: number;
  presetName: string;
  cacheBust: boolean;
  modelContextLimit?: number;
}

export const PrefillDecodeBalanceGauge: React.FC<PrefillDecodeBalanceGaugeProps> = ({
  promptTokens,
  maxTokens,
  presetName,
  cacheBust,
  modelContextLimit = 128000,
}) => {
  const [hoveredPhase, setHoveredPhase] = useState<"prefill" | "decode" | null>(null);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

  const totalTokens = Math.max(1, promptTokens + maxTokens);
  const prefillPct = Math.round((promptTokens / totalTokens) * 100);
  const decodePct = 100 - prefillPct;

  // Context window footprint
  const contextPct = Number(((totalTokens / modelContextLimit) * 100).toFixed(2));

  // Determine workload compute profile classification
  const computeProfile = useMemo(() => {
    if (prefillPct >= 75) {
      return {
        label: "Prefill Heavy (TTFT Bound)",
        desc: "Dominated by KV-cache ingestion. Isolates GPU prefill compute & prompt processing.",
        color: "text-[#853953] dark:text-[#A74B6A]",
        badgeBg: "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/30",
        bottleneck: "Time to First Token (TTFT)",
      };
    }
    if (decodePct >= 65) {
      return {
        label: "Decode Heavy (TPOT Bound)",
        desc: "Dominated by sequential token generation. Isolates GPU VRAM memory bandwidth & streaming speed.",
        color: "text-[#612D53] dark:text-[#C57BB2]",
        badgeBg: "bg-[#612D53]/10 dark:bg-[#C57BB2]/15 border-[#612D53]/30",
        bottleneck: "Inter-Token Latency (ITL / TPOT)",
      };
    }
    return {
      label: "Balanced Conversational",
      desc: "Equalized prompt ingestion and generation tokens, modeling standard chat turns.",
      color: "text-emerald-700 dark:text-emerald-400",
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40",
      bottleneck: "Balanced TTFT & TPOT",
    };
  }, [prefillPct, decodePct]);

  return (
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${computeProfile.badgeBg} ${computeProfile.color}`}>
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Token Dynamics & Compute Balance
              </span>
              <Badge variant="outline" className={`text-[10px] font-sans ${computeProfile.color} py-0 px-1.5`}>
                {computeProfile.label}
              </Badge>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              {computeProfile.desc}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-xs font-semibold font-sans tabular-nums text-[#853953] dark:text-[#A74B6A]">
            ~{totalTokens.toLocaleString()} Total Tokens
          </span>
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            {prefillPct}% prefill • {decodePct}% decode
          </span>
        </div>
      </div>

      {/* Visual Compute Spectrum Segmented Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium">
          <span
            onMouseEnter={() => setHoveredPhase("prefill")}
            onMouseLeave={() => setHoveredPhase(null)}
            className="flex items-center gap-1.5 text-[#853953] dark:text-[#A74B6A] cursor-pointer hover:underline"
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Prefill Compute Phase:</span>
            <strong className="font-sans tabular-nums">~{promptTokens.toLocaleString()} tok ({prefillPct}%)</strong>
          </span>

          <span
            onMouseEnter={() => setHoveredPhase("decode")}
            onMouseLeave={() => setHoveredPhase(null)}
            className="flex items-center gap-1.5 text-[#612D53] dark:text-[#C57BB2] cursor-pointer hover:underline"
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>Decode Generation Phase:</span>
            <strong className="font-sans tabular-nums">~{maxTokens.toLocaleString()} tok ({decodePct}%)</strong>
          </span>
        </div>

        {/* Dual-tone animated balance bar */}
        <div className="h-4 w-full rounded-xl bg-[#F3F4F4] dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 p-0.5 flex items-center overflow-hidden gap-0.5 select-none">
          {/* Prefill Segment */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${prefillPct}%` }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onMouseEnter={() => setHoveredPhase("prefill")}
            onMouseLeave={() => setHoveredPhase(null)}
            className={`h-full rounded-lg bg-gradient-to-r from-[#853953] to-[#A74B6A] cursor-pointer transition-opacity relative flex items-center justify-center text-[10px] text-white font-sans font-semibold overflow-hidden ${
              hoveredPhase === "decode" ? "opacity-40" : "opacity-100"
            }`}
          >
            {prefillPct >= 18 && <span>Prefill ({prefillPct}%)</span>}
          </motion.div>

          {/* Decode Segment */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${decodePct}%` }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onMouseEnter={() => setHoveredPhase("decode")}
            onMouseLeave={() => setHoveredPhase(null)}
            className={`h-full rounded-lg bg-gradient-to-r from-[#612D53] to-[#C57BB2] cursor-pointer transition-opacity relative flex items-center justify-center text-[10px] text-white font-sans font-semibold overflow-hidden ${
              hoveredPhase === "prefill" ? "opacity-40" : "opacity-100"
            }`}
          >
            {decodePct >= 18 && <span>Decode ({decodePct}%)</span>}
          </motion.div>
        </div>
      </div>

      {/* Context Window Utilization Gauge */}
      <div className="space-y-1 p-2.5 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 text-xs">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-medium flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
            Context Window Occupancy (~{totalTokens.toLocaleString()} / {(modelContextLimit / 1000).toFixed(0)}k tok):
          </span>
          <span className="font-sans tabular-nums font-semibold text-[#853953] dark:text-[#A74B6A]">
            {contextPct < 0.1 ? "<0.1%" : `${contextPct}%`} capacity
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#853953] dark:bg-[#A74B6A]"
            style={{ width: `${Math.min(100, Math.max(1, (totalTokens / modelContextLimit) * 100))}%` }}
          />
        </div>
      </div>

      {/* Three Feature Telemetry Badges */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans font-medium flex items-center gap-1">
            <Cpu className="h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            Primary Metric
          </span>
          <div className="font-semibold text-[#853953] dark:text-[#A74B6A] truncate">
            {computeProfile.bottleneck}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#612D53] dark:text-[#C57BB2]" />
            KV Cache State
          </span>
          <div className="font-sans font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] truncate">
            {cacheBust ? "Cold Prefill (Bust)" : "Warm Prefix Eligible"}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans font-medium flex items-center gap-1">
            <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Preset Ratio
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] truncate">
            {promptTokens}:{maxTokens} tok
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
                Understanding Workload Dynamics: Prefill vs. Decode Profiles
              </span>
              <p className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                Click to explore how prompt length vs. generation length fundamentally changes hardware bottlenecks.
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
                    <span>RAG & Summarization (Prefill Heavy)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    Characterized by <MathFormula math="N_{\text{prompt}} \gg N_{\text{decode}}" /> (e.g. 8k prompt, 100 output tokens). Strains GPU tensor core compute during ingestion. Tests prefix cache reuse:
                  </p>
                  <MathFormula math="\text{Prefill Ratio} = \frac{N_{\text{prompt}}}{N_{\text{prompt}} + N_{\text{decode}}} \times 100\%" block className="text-[10px] text-[#853953] dark:text-[#A74B6A]" />
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#612D53] dark:text-[#C57BB2] font-semibold text-xs">
                    <HardDrive className="h-3.5 w-3.5" />
                    <span>Generation & Agents (Decode Heavy)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    Characterized by <MathFormula math="N_{\text{decode}} \gg N_{\text{prompt}}" /> (e.g. 200 prompt, 2k output tokens). Strains GPU HBM memory bus bandwidth over thousands of sequential steps:
                  </p>
                  <MathFormula math="\text{Streaming Throughput} = \frac{N_{\text{decode}}}{T_{\text{decode}}} \text{ (tok/s)}" block className="text-[10px] text-[#612D53] dark:text-[#C57BB2]" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
