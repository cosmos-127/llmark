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
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(true);

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
        color: "text-[var(--brand-primary)]",
        badgeBg: "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)]",
        bottleneck: "Time to First Token (TTFT)",
      };
    }
    if (decodePct >= 65) {
      return {
        label: "Decode Heavy (TPOT Bound)",
        desc: "Dominated by sequential token generation. Isolates GPU VRAM memory bandwidth & streaming speed.",
        color: "text-[var(--brand-secondary)]",
        badgeBg: "bg-[var(--brand-secondary-light)] dark:bg-[var(--brand-primary-light)] border-[var(--brand-secondary-border)]",
        bottleneck: "Inter-Token Latency (ITL / TPOT)",
      };
    }
    return {
      label: "Balanced Conversational",
      desc: "Equalized prompt ingestion and generation tokens, modeling standard chat turns.",
      color: "text-[var(--brand-primary)]",
      badgeBg: "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)]",
      bottleneck: "Balanced TTFT & TPOT",
    };
  }, [prefillPct, decodePct]);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${computeProfile.badgeBg} ${computeProfile.color} shadow-2xs`}>
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[var(--text-main)]">
                Token Dynamics & Compute Balance Spectrum
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-2">
                Workload Profiling
              </Badge>
              <Badge variant="outline" className={`text-[10px] font-sans ${computeProfile.color} py-0 px-2`}>
                {computeProfile.label}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] dark:text-white/65 mt-0.5">
              {computeProfile.desc}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-sm font-bold font-sans tabular-nums text-[var(--brand-primary)]">
            ~{totalTokens.toLocaleString()} Total Tokens
          </span>
          <span className="text-[11px] text-[var(--text-subtle)] font-sans tabular-nums">
            {prefillPct}% prefill • {decodePct}% decode
          </span>
        </div>
      </div>

      {/* Visual Compute Spectrum Segmented Bar */}
      <div className="space-y-2.5 p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-subtle)]/70 dark:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
        <div className="flex justify-between text-xs font-medium">
          <span
            onMouseEnter={() => setHoveredPhase("prefill")}
            onMouseLeave={() => setHoveredPhase(null)}
            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
          >
            <Cpu className="h-4 w-4" />
            <span className="font-semibold">1. Prefill Ingestion:</span>
            <strong className="font-sans tabular-nums">~{promptTokens.toLocaleString()} tok ({prefillPct}%)</strong>
          </span>

          <span
            onMouseEnter={() => setHoveredPhase("decode")}
            onMouseLeave={() => setHoveredPhase(null)}
            className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline"
          >
            <HardDrive className="h-4 w-4" />
            <span className="font-semibold">2. Decode Generation:</span>
            <strong className="font-sans tabular-nums">~{maxTokens.toLocaleString()} tok ({decodePct}%)</strong>
          </span>
        </div>

        {/* Dual-tone animated balance bar */}
        <div className="h-6 w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-0.5 flex items-center overflow-hidden gap-1 select-none shadow-inner">
          {/* Prefill Segment */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${prefillPct}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onMouseEnter={() => setHoveredPhase("prefill")}
            onMouseLeave={() => setHoveredPhase(null)}
            className={`h-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-500 cursor-pointer transition-all relative flex items-center justify-center text-xs text-white font-sans font-bold overflow-hidden shadow-2xs hover:brightness-110 ${
              hoveredPhase === "decode" ? "opacity-40" : "opacity-100"
            }`}
          >
            {prefillPct >= 14 && <span>Prefill ({prefillPct}%)</span>}
          </motion.div>

          {/* Decode Segment */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${decodePct}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onMouseEnter={() => setHoveredPhase("decode")}
            onMouseLeave={() => setHoveredPhase(null)}
            className={`h-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 cursor-pointer transition-all relative flex items-center justify-center text-xs text-white font-sans font-bold overflow-hidden shadow-2xs hover:brightness-110 ${
              hoveredPhase === "prefill" ? "opacity-40" : "opacity-100"
            }`}
          >
            {decodePct >= 14 && <span>Decode ({decodePct}%)</span>}
          </motion.div>
        </div>

        {/* Context Window Utilization Gauge */}
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-body)] font-medium flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              Context Window Occupancy (~{totalTokens.toLocaleString()} / {(modelContextLimit / 1000).toFixed(0)}k max tokens):
            </span>
            <span className="font-sans tabular-nums font-semibold text-[var(--brand-primary)]">
              {contextPct < 0.1 ? "<0.1%" : `${contextPct}%`} capacity
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]"
              style={{ width: `${Math.min(100, Math.max(1, (totalTokens / modelContextLimit) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            Primary Performance Metric
          </span>
          <div className="font-bold text-[var(--brand-primary)] text-xs truncate">
            {computeProfile.bottleneck}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[var(--brand-secondary)]" />
            KV Cache Prefill Mode
          </span>
          <div className="font-semibold text-[var(--text-main)] text-xs truncate">
            {cacheBust ? "Cold Ingestion (Forced Bust)" : "Warm Prefix Eligible"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Prompt-to-Decode Ratio
          </span>
          <div className="font-sans tabular-nums font-bold text-[var(--text-main)] text-xs truncate">
            {promptTokens}:{maxTokens} ({((promptTokens / Math.max(1, maxTokens))).toFixed(2)}x)
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
            <span>LLM Serving Mechanics: Disaggregated Prefill & Decode</span>
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
                    Prefill Ratio & Computational Complexity:
                  </span>
                  <MathFormula math="\text{Prefill Ratio} = \frac{N_{\text{prompt}}}{N_{\text{prompt}} + N_{\text{gen}}}, \quad \text{Compute}_{\text{prefill}} \approx 2 \cdot P \cdot N_{\text{prompt}}" block />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-white/65">
                    Where <MathFormula math="P" /> is model parameter count. High prefill ratios benefit heavily from prompt-caching engines (RadixAttention / Chunked Prefills).
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                  <span className="font-semibold text-[var(--brand-secondary)]">
                    Continuous Batching Interference:
                  </span>
                  <MathFormula math="T_{\text{turnaround}} = T_{\text{TTFT}} + \sum_{i=1}^{N_{\text{gen}}} \text{ITL}_i" block />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-white/65">
                    In multi-tenant LLM clusters, new incoming prefill requests preempt decode streams, causing ITL jitter spikes unless chunked-prefill isolation is deployed.
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
