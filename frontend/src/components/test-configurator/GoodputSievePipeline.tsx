import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Radio,
  BookOpen,
  ChevronDown,
  Layers,
  Gauge,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MathFormula } from "@/components/ui/math-formula";

interface GoodputSievePipelineProps {
  maxTtftMs: number;
  maxTpotMs: number;
  maxErrorRatePct: number;
  maxE2eMs: number;
}

export const GoodputSievePipeline: React.FC<GoodputSievePipelineProps> = ({
  maxTtftMs,
  maxTpotMs,
  maxErrorRatePct,
  maxE2eMs,
}) => {
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

  // Approximate yield filter drops per chamber
  const { ttftPassPct, tpotPassPct, errorPassPct, finalGoodputYield } = useMemo(() => {
    // TTFT pass rate (median ~380ms)
    const ttftPass = Math.min(100, Math.max(50, Math.round(100 / (1 + Math.exp(-(maxTtftMs - 380) / 120)))));
    // TPOT pass rate (median ~22ms)
    const tpotPass = Math.min(100, Math.max(70, Math.round(100 / (1 + Math.exp(-(maxTpotMs - 25) / 8)))));
    // Error budget pass rate
    const errorPass = Math.round(100 - maxErrorRatePct);

    const compoundYield = Number(((ttftPass / 100) * (tpotPass / 100) * (errorPass / 100) * 100).toFixed(1));

    return {
      ttftPassPct: ttftPass,
      tpotPassPct: tpotPass,
      errorPassPct: errorPass,
      finalGoodputYield: compoundYield,
    };
  }, [maxTtftMs, maxTpotMs, maxErrorRatePct]);

  return (
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Multi-Stage Goodput Filtration Sieve
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-1.5">
                Reference & Simulation Only
              </Badge>
              <Badge variant="outline" className="text-[10px] font-sans py-0 px-1.5 text-emerald-700 dark:text-emerald-400">
                3-Gate Reliability Pipeline
              </Badge>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              Visualizes how raw requests must survive 3 simultaneous SLA gates to qualify as certified Goodput.
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-sm font-bold font-sans tabular-nums text-emerald-700 dark:text-emerald-400">
            {finalGoodputYield}% Goodput
          </span>
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            Compound Production Yield
          </span>
        </div>
      </div>

      {/* 3-Chamber Sieve Pipeline Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-center p-3 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 select-none">
        {/* Gate 1: TTFT Sieve */}
        <div className="p-3 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1 relative">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[#853953] dark:text-[#A74B6A] flex items-center gap-1">
              <Radio className="h-3 w-3" /> Gate 1: TTFT
            </span>
            <span className="font-sans font-bold text-xs text-[#853953] dark:text-[#A74B6A]">
              {ttftPassPct}%
            </span>
          </div>
          <p className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
            Filters TTFT ≤ {maxTtftMs}ms. Drops queue spikes.
          </p>
          <div className="h-1.5 w-full rounded-full bg-[#F3F4F4] dark:bg-[#1E1D1F] overflow-hidden">
            <motion.div
              className="h-full bg-[#853953] dark:bg-[#A74B6A]"
              style={{ width: `${ttftPassPct}%` }}
            />
          </div>
        </div>

        {/* Gate 2: TPOT Decode Sieve */}
        <div className="p-3 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[#612D53] dark:text-[#C57BB2] flex items-center gap-1">
              <Zap className="h-3 w-3" /> Gate 2: TPOT
            </span>
            <span className="font-sans font-bold text-xs text-[#612D53] dark:text-[#C57BB2]">
              {tpotPassPct}%
            </span>
          </div>
          <p className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
            Filters TPOT ≤ {maxTpotMs}ms. Drops token stutter.
          </p>
          <div className="h-1.5 w-full rounded-full bg-[#F3F4F4] dark:bg-[#1E1D1F] overflow-hidden">
            <motion.div
              className="h-full bg-[#612D53] dark:bg-[#C57BB2]"
              style={{ width: `${tpotPassPct}%` }}
            />
          </div>
        </div>

        {/* Gate 3: Error Trap */}
        <div className="p-3 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Gate 3: Errors
            </span>
            <span className="font-sans font-bold text-xs text-rose-700 dark:text-rose-400">
              {errorPassPct}%
            </span>
          </div>
          <p className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
            Filters Error ≤ {maxErrorRatePct}%. Drops 429/5xx.
          </p>
          <div className="h-1.5 w-full rounded-full bg-[#F3F4F4] dark:bg-[#1E1D1F] overflow-hidden">
            <motion.div
              className="h-full bg-rose-600 dark:bg-rose-500"
              style={{ width: `${errorPassPct}%` }}
            />
          </div>
        </div>

        {/* Final Output: Certified Goodput */}
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Certified
            </span>
            <span className="font-sans font-extrabold text-xs text-emerald-700 dark:text-emerald-400">
              {finalGoodputYield}%
            </span>
          </div>
          <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80">
            Production-grade compliant SLA requests.
          </p>
          <div className="h-1.5 w-full rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-600 dark:bg-emerald-400"
              style={{ width: `${finalGoodputYield}%` }}
            />
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
            <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <div>
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Understanding Goodput: Raw Throughput vs. SLA-Compliant Yield
              </span>
              <p className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                Click to explore why raw requests per second (RPS) can be misleading without SLA compliance gates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-sans py-0 px-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-600/30">
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
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Raw Throughput (The Vanity Metric)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    Counts every completed request, regardless of whether it took 15 seconds to respond, stuttered violently mid-stream, or returned empty truncated tokens. High raw RPS does not mean your users are having a good experience.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Goodput (The Production Reality Metric)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                    The rate of successful requests delivered <em>strictly within your business Service Level Objectives (SLOs)</em>. A request only counts towards Goodput if it passes TTFT, TPOT, and error criteria simultaneously:
                  </p>
                  <div className="text-[10px] font-sans font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                    <MathFormula math="\text{Goodput} = \text{Raw RPS} \times Y_{\text{TTFT}} \times Y_{\text{TPOT}} \times (1 - \text{Err})" block className="text-[11px] text-emerald-800 dark:text-emerald-300" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded bg-white dark:bg-[#252426] border border-[#2C2C2C]/10">
                  <strong className="block text-[#853953] dark:text-[#A74B6A]">Gate 1: TTFT Sieve</strong>
                  <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                    Catches queue buildup and prompt processing bottlenecks before the first token is sent.
                  </span>
                </div>
                <div className="p-2 rounded bg-white dark:bg-[#252426] border border-[#2C2C2C]/10">
                  <strong className="block text-[#612D53] dark:text-[#C57BB2]">Gate 2: TPOT Sieve</strong>
                  <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                    Ensures streaming reading speed remains human-friendly (e.g. &lt; 30ms/tok) without stutter.
                  </span>
                </div>
                <div className="p-2 rounded bg-white dark:bg-[#252426] border border-[#2C2C2C]/10">
                  <strong className="block text-rose-700 dark:text-rose-400">Gate 3: Error Trap</strong>
                  <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                    Eliminates HTTP 429 rate limit drops and 500/503 model worker timeouts.
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
