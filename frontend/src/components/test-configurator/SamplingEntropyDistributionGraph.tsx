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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MathFormula } from "@/components/ui/math-formula";

interface SamplingEntropyDistributionGraphProps {
  temperature: number;
  maxTokens: number;
}

interface CandidateToken {
  id: string;
  name: string;
  logit: number;
  prob: number;
  probPct: number;
  cumulativePct: number;
}

export const SamplingEntropyDistributionGraph: React.FC<SamplingEntropyDistributionGraphProps> = ({
  temperature,
  maxTokens,
}) => {
  const [hoveredToken, setHoveredToken] = useState<CandidateToken | null>(null);

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

  // Compute Softmax Probability Distribution dynamically based on Temperature
  const { tokens, entropyBits, modeInfo } = useMemo(() => {
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
    const computedTokens: CandidateToken[] = rawLogits.map((t, idx) => {
      const p = probs[idx];
      const pPct = Number((p * 100).toFixed(1));
      cumPct += pPct;
      return {
        id: t.id,
        name: t.name,
        logit: t.logit,
        prob: p,
        probPct: pPct,
        cumulativePct: Math.min(100, Number(cumPct.toFixed(1))),
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
      color: "text-[#853953] dark:text-[#A74B6A]",
      badgeBg: "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/30",
      reproducibility: "100% Deterministic",
    };

    if (temperature > 0.01 && temperature <= 0.4) {
      mode = {
        label: "Focused Sampling (Low Entropy)",
        desc: "Concentrates 95%+ probability mass on top 2 candidate tokens. Ideal for code & math.",
        color: "text-blue-700 dark:text-blue-400",
        badgeBg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40",
        reproducibility: "High Reproducibility",
      };
    } else if (temperature > 0.4 && temperature <= 0.8) {
      mode = {
        label: "Balanced Sampling (Standard)",
        desc: "Natural conversational dispersion over top-k tokens. Balances fluency and coherence.",
        color: "text-emerald-700 dark:text-emerald-400",
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40",
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
    };
  }, [temperature, rawLogits]);

  // Estimated streaming generation duration at ~45 tokens/sec
  const estStreamSec = Number((maxTokens / 45).toFixed(1));

  return (
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${modeInfo.badgeBg} ${modeInfo.color}`}>
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Next-Token Probability Density (Softmax @ T={temperature})
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-1.5">
                Reference & Simulation Only
              </Badge>
              <Badge variant="outline" className={`text-[10px] font-sans ${modeInfo.color} py-0 px-1.5`}>
                {modeInfo.label}
              </Badge>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              {modeInfo.desc}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-xs font-semibold font-sans tabular-nums text-[#853953] dark:text-[#A74B6A]">
            {entropyBits} bits
          </span>
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            Shannon Entropy
          </span>
        </div>
      </div>

      {/* Probability Bars Distribution Graph */}
      <div className="relative rounded-xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 p-3 pt-4 space-y-2 select-none">
        {/* Token Bars */}
        <div className="h-20 w-full flex items-end justify-between gap-2 px-1">
          {tokens.map((tok, idx) => {
            const isTop = idx === 0;
            const isHovered = hoveredToken?.id === tok.id;
            const barHeight = Math.max(4, tok.prob * 100);

            return (
              <div
                key={tok.id}
                onMouseEnter={() => setHoveredToken(tok)}
                onMouseLeave={() => setHoveredToken(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
              >
                {/* Probability Value Label above bar */}
                <span className={`text-[9px] font-sans tabular-nums font-semibold mb-1 transition-all ${
                  isTop ? "text-[#853953] dark:text-[#A74B6A]" : "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60"
                }`}>
                  {tok.probPct > 1 ? `${tok.probPct}%` : ""}
                </span>

                {/* Animated Vertical Bar */}
                <motion.div
                  initial={false}
                  animate={{ height: `${barHeight}%` }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className={`w-full rounded-t-md transition-all ${
                    isTop
                      ? "bg-gradient-to-t from-[#853953] to-[#A74B6A] shadow-xs"
                      : isHovered
                      ? "bg-[#612D53] dark:bg-[#C57BB2]"
                      : "bg-[#853953]/35 dark:bg-[#A74B6A]/40 group-hover:bg-[#853953]/60"
                  }`}
                />

                {/* Token Index label below bar */}
                <span className="text-[10px] font-sans font-medium text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 mt-1">
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
              className="p-2 rounded-lg bg-[#2C2C2C]/95 dark:bg-black/95 text-white text-xs flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{hoveredToken.name}</span>
                <span className="text-[#A74B6A] font-sans font-bold">P = {hoveredToken.probPct}%</span>
              </div>
              <span className="text-[10px] text-white/70 font-sans">
                Logit: {hoveredToken.logit} • Cumulative: {hoveredToken.cumulativePct}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generation Length Ceiling & Streaming Latency Forecast */}
      <div className="space-y-1.5 p-3 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 text-xs">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-medium flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
            Output Token Ceiling (max_tokens = {maxTokens}):
          </span>
          <span className="font-sans tabular-nums font-semibold text-[#853953] dark:text-[#A74B6A]">
            ~{estStreamSec}s streaming duration (@ 45 tok/s)
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#853953] to-[#612D53] dark:from-[#A74B6A] dark:to-[#C57BB2]"
            style={{ width: `${Math.min(100, Math.max(1, (maxTokens / 4096) * 100))}%` }}
          />
        </div>
      </div>

      {/* Telemetry Footer Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            Sampling Strategy
          </span>
          <div className="font-semibold text-[#853953] dark:text-[#A74B6A] truncate">
            {temperature === 0 ? "Greedy (ArgMax)" : `Stochastic (T=${temperature})`}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Activity className="h-3 w-3 text-[#612D53] dark:text-[#C57BB2]" />
            Top-1 Confidence
          </span>
          <div className="font-sans tabular-nums font-bold text-[#2C2C2C] dark:text-[#F3F4F4]">
            {tokens[0]?.probPct}%
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Reproducibility
          </span>
          <div className="font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] truncate">
            {modeInfo.reproducibility}
          </div>
        </div>
      </div>
    </div>
  );
};
