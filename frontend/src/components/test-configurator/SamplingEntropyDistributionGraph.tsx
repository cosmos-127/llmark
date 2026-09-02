import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Sparkles,
  Activity,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  Timer,
  BookOpen,
  ChevronDown,
  Percent,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MathFormula } from "@/components/ui/math-formula";

interface SamplingEntropyDistributionGraphProps {
  temperature: number;
  maxTokens: number;
  topP?: number;
}

interface CandidateToken {
  id: string;
  name: string;
  logit: number;
  prob: number;
  probPct: number;
  cumulativePct: number;
  inTopP: boolean;
}

export const SamplingEntropyDistributionGraph: React.FC<SamplingEntropyDistributionGraphProps> = ({
  temperature,
  maxTokens,
  topP = 0.95,
}) => {
  const [hoveredToken, setHoveredToken] = useState<CandidateToken | null>(null);
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(true);

  // Candidate token sample vocabulary representing typical next-token distribution
  const rawLogits = useMemo(() => [
    { id: "t1", name: 'Token 1 ("return")', logit: 4.8 },
    { id: "t2", name: 'Token 2 ("yield")', logit: 3.9 },
    { id: "t3", name: 'Token 3 ("const")', logit: 3.3 },
    { id: "t4", name: 'Token 4 ("async")', logit: 2.8 },
    { id: "t5", name: 'Token 5 ("function")', logit: 2.2 },
    { id: "t6", name: 'Token 6 ("let")', logit: 1.7 },
    { id: "t7", name: 'Token 7 ("throw")', logit: 1.2 },
    { id: "t8", name: 'Token 8 ("export")', logit: 0.7 },
  ], []);

  // Compute Softmax Probability Distribution dynamically based on Temperature & Top-P
  const { tokens, entropyBits, modeInfo, topPCutoffIdx } = useMemo(() => {
    let probs: number[] = [];

    if (temperature <= 0.01) {
      // Greedy decoding: ArgMax collapses to 1.0 on top token
      probs = rawLogits.map((_, idx) => (idx === 0 ? 1.0 : 0.0));
    } else {
      // Scaled Softmax: P(w_i) = exp(z_i / T) / sum(exp(z_j / T))
      const scaledLogits = rawLogits.map((l) => l.logit / temperature);
      const maxScaled = Math.max(...scaledLogits);
      const expValues = scaledLogits.map((sl) => Math.exp(sl - maxScaled));
      const sumExp = expValues.reduce((a, b) => a + b, 0);
      probs = expValues.map((ev) => ev / sumExp);
    }

    let cumPct = 0;
    let cutoffIdx = rawLogits.length - 1;

    const computedTokens: CandidateToken[] = rawLogits.map((t, idx) => {
      const p = probs[idx];
      const pPct = Number((p * 100).toFixed(1));
      const prevCum = cumPct;
      cumPct += pPct;
      const roundedCum = Math.min(100, Number(cumPct.toFixed(1)));
      const inNucleus = prevCum < (topP * 100);
      if (!inNucleus && cutoffIdx === rawLogits.length - 1) {
        cutoffIdx = idx;
      }

      return {
        id: t.id,
        name: t.name,
        logit: t.logit,
        prob: p,
        probPct: pPct,
        cumulativePct: roundedCum,
        inTopP: inNucleus,
      };
    });

    // Compute Shannon Entropy: H = -sum(p * log2(p))
    let entropy = 0;
    for (const p of probs) {
      if (p > 0.0001) {
        entropy += -p * Math.log2(p);
      }
    }

    // Temperature operational regime categorization
    let mode = {
      label: "Greedy Deterministic",
      desc: "Top-1 argmax selection. Zero randomness, 100% reproducible benchmark token runs.",
      color: "text-[#2563EB] dark:text-[#60A5FA]",
      badgeBg: "bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 border-[#2563EB]/30",
      reproducibility: "100% Deterministic (Greedy)",
    };

    if (temperature > 0.01 && temperature <= 0.4) {
      mode = {
        label: "Focused Sampling (Low Entropy)",
        desc: "Concentrates 95%+ probability mass on top 2 candidate tokens. Ideal for code & math reasoning.",
        color: "text-blue-700 dark:text-blue-400",
        badgeBg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40",
        reproducibility: "High Reproducibility",
      };
    } else if (temperature > 0.4 && temperature <= 0.8) {
      mode = {
        label: "Balanced Sampling (Standard)",
        desc: "Natural conversational dispersion over top-k tokens. Balances fluency, creativity, and coherence.",
        color: "text-[#2563EB] dark:text-[#60A5FA]",
        badgeBg: "bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 border-[#2563EB]/25 dark:border-[#3B82F6]/35",
        reproducibility: "Moderate Stochasticity",
      };
    } else if (temperature > 0.8 && temperature <= 1.2) {
      mode = {
        label: "Creative Diversity (High Entropy)",
        desc: "Wide tail distribution across vocabulary. Increases novelty and brainstorming diversity.",
        color: "text-purple-700 dark:text-purple-400",
        badgeBg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/40",
        reproducibility: "High Randomness",
      };
    } else if (temperature > 1.2) {
      mode = {
        label: "Extreme Entropy (High Chaos)",
        desc: "Flattened uniform distribution. Higher risk of syntax hallucinations and degenerative repetition.",
        color: "text-rose-700 dark:text-rose-400",
        badgeBg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40",
        reproducibility: "Unstable Output",
      };
    }

    return {
      tokens: computedTokens,
      entropyBits: Number(entropy.toFixed(2)),
      modeInfo: mode,
      topPCutoffIdx: cutoffIdx,
    };
  }, [temperature, topP, rawLogits]);

  // Estimated streaming generation duration at ~45 tokens/sec
  const estStreamSec = Number((maxTokens / 45).toFixed(1));

  return (
    <div className="rounded-2xl border border-[#0F172A]/10 dark:border-white/10 bg-white dark:bg-[#111827] p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${modeInfo.badgeBg} ${modeInfo.color} shadow-2xs`}>
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#0F172A] dark:text-white">
                Next-Token Probability Density (Softmax @ T={temperature})
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-2">
                Statistical Physics
              </Badge>
              <Badge variant="outline" className={`text-[10px] font-sans ${modeInfo.color} py-0 px-2`}>
                {modeInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-[#0F172A]/65 dark:text-white/65 mt-0.5">
              {modeInfo.desc}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-sm font-bold font-sans tabular-nums text-[#2563EB] dark:text-[#60A5FA]">
            {entropyBits} bits
          </span>
          <span className="text-[11px] text-[#0F172A]/50 dark:text-slate-400 font-sans tabular-nums">
            Shannon Information Entropy (H)
          </span>
        </div>
      </div>

      {/* Probability Bars Distribution Graph */}
      <div className="relative rounded-2xl bg-[#F1F5F9]/70 dark:bg-[#1E293B] border border-[#0F172A]/10 p-4 pt-5 space-y-3 select-none">
        {/* Token Bars */}
        <div className="h-28 w-full flex items-end justify-between gap-2.5 px-2">
          {tokens.map((tok, idx) => {
            const isTop = idx === 0;
            const isHovered = hoveredToken?.id === tok.id;
            const barHeight = Math.max(5, tok.prob * 100);

            return (
              <div
                key={tok.id}
                onMouseEnter={() => setHoveredToken(tok)}
                onMouseLeave={() => setHoveredToken(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
              >
                {/* Probability Value Label above bar */}
                <span className={`text-[10px] font-sans tabular-nums font-bold mb-1.5 transition-all ${
                  isTop ? "text-[#2563EB] dark:text-[#60A5FA]" : "text-[#0F172A]/65 dark:text-white/65"
                }`}>
                  {tok.probPct > 1 ? `${tok.probPct}%` : "<1%"}
                </span>

                {/* Animated Vertical Bar */}
                <motion.div
                  initial={false}
                  animate={{ height: `${barHeight}%` }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`w-full rounded-t-lg transition-all ${
                    isTop
                      ? "bg-gradient-to-t from-[#2563EB] to-[#3B82F6] shadow-xs"
                      : isHovered
                      ? "bg-[#1D4ED8] dark:bg-[#60A5FA] shadow-sm"
                      : "bg-[#2563EB]/35 dark:bg-[#3B82F6]/40 group-hover:bg-[#2563EB]/60"
                  }`}
                />

                {/* Token Identifier Label below bar */}
                <span className="text-[11px] font-sans font-medium text-[#0F172A]/60 dark:text-slate-400 mt-1.5 truncate max-w-full text-center">
                  w{idx + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hovered Token Inspection Tooltip */}
        <AnimatePresence>
          {hoveredToken && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="p-2.5 rounded-xl bg-[#0F172A]/95 dark:bg-black/95 text-white text-xs flex items-center justify-between shadow-lg backdrop-blur-md border border-white/10"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-white">{hoveredToken.name}</span>
                <span className="text-[#3B82F6] font-sans font-bold text-sm">P = {hoveredToken.probPct}%</span>
              </div>
              <span className="text-[11px] text-white/70 font-sans">
                Unscaled Logit: {hoveredToken.logit} • Cumulative Mass: {hoveredToken.cumulativePct}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generation Length Ceiling & Streaming Latency Forecast */}
      <div className="space-y-2 p-4 rounded-2xl bg-[#F1F5F9]/70 dark:bg-[#1E293B] border border-[#0F172A]/10 text-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#0F172A]/70 dark:text-slate-300 font-medium flex items-center gap-2">
            <Timer className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]" />
            Output Token Ceiling (max_tokens = {maxTokens}):
          </span>
          <span className="font-sans tabular-nums font-semibold text-[#2563EB] dark:text-[#60A5FA]">
            ~{estStreamSec}s estimated streaming duration (@ 45 tok/s decode)
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-white dark:bg-[#111827] border border-[#0F172A]/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] dark:from-[#3B82F6] dark:to-[#60A5FA]"
            style={{ width: `${Math.min(100, Math.max(1, (maxTokens / 4096) * 100))}%` }}
          />
        </div>
      </div>

      {/* Telemetry Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#F1F5F9]/80 dark:bg-[#0F172A] border border-[#0F172A]/10 space-y-1">
          <span className="text-[11px] text-[#0F172A]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
            Sampling Strategy
          </span>
          <div className="font-semibold text-[#2563EB] dark:text-[#60A5FA] text-xs truncate">
            {temperature === 0 ? "Greedy ArgMax (Deterministic)" : `Stochastic Softmax (T=${temperature})`}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#F1F5F9]/80 dark:bg-[#0F172A] border border-[#0F172A]/10 space-y-1">
          <span className="text-[11px] text-[#0F172A]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[#1D4ED8] dark:text-[#38BDF8]" />
            Top-1 Token Confidence
          </span>
          <div className="font-sans tabular-nums font-bold text-[#0F172A] dark:text-white text-xs">
            {tokens[0]?.probPct}% probability mass
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#F1F5F9]/80 dark:bg-[#0F172A] border border-[#0F172A]/10 space-y-1">
          <span className="text-[11px] text-[#0F172A]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Benchmark Reproducibility
          </span>
          <div className="font-semibold text-[#0F172A] dark:text-white text-xs truncate">
            {modeInfo.reproducibility}
          </div>
        </div>
      </div>

      {/* Theoretical Foundations Collapsible Card */}
      <div className="p-4 rounded-xl bg-[#F1F5F9]/80 dark:bg-[#1E293B] border border-[#0F172A]/10 space-y-3">
        <button
          type="button"
          onClick={() => setShowTheoryDetails(!showTheoryDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[#0F172A] dark:text-white cursor-pointer hover:text-[#2563EB] dark:hover:text-[#60A5FA]"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]" />
            <span>Statistical Mechanics of LLM Sampling: Temperature & Entropy</span>
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showTheoryDetails ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showTheoryDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-2 text-xs border-t border-[#0F172A]/10 dark:border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-[#0F172A]/10 space-y-1.5">
                  <span className="font-semibold text-[#2563EB] dark:text-[#60A5FA]">
                    Temperature-Scaled Softmax Probability:
                  </span>
                  <MathFormula math="P(w_i) = \frac{\exp(z_i / T)}{\sum_{j=1}^{|V|} \exp(z_j / T)}" block />
                  <p className="text-[11px] text-[#0F172A]/65 dark:text-white/65">
                    As <MathFormula math="T \to 0" />, distribution approaches a Dirac delta on <MathFormula math="\arg\max(z_i)" /> (greedy). As <MathFormula math="T \to \infty" />, it converges to a uniform distribution.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-[#0F172A]/10 space-y-1.5">
                  <span className="font-semibold text-[#1D4ED8] dark:text-[#38BDF8]">
                    Shannon Entropy & Top-p Nucleus Truncation:
                  </span>
                  <MathFormula math="H(X) = -\sum_{i=1}^{|V|} P(w_i) \log_2 P(w_i), \quad \sum_{i \in \text{Top-}p} P(w_i) \ge p" block />
                  <p className="text-[11px] text-[#0F172A]/65 dark:text-white/65">
                    Top-p truncates unreliable long-tail tokens while dynamically resizing the candidate set based on instantaneous model confidence.
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
