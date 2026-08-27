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
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(true);

  // Approximate yield filter drops per chamber based on standard Log-Normal distributions
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
    <div className="rounded-2xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 shadow-2xs">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Multi-Stage Goodput Filtration Sieve
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-2">
                SLO Sieve Pipeline
              </Badge>
              <Badge variant="outline" className="text-[10px] font-sans py-0 px-2 text-emerald-700 dark:text-emerald-400">
                3-Gate Reliability Guarantee
              </Badge>
            </div>
            <p className="text-xs text-[#2C2C2C]/65 dark:text-[#F3F4F4]/65 mt-0.5">
              Visualizes how raw benchmark requests must survive 3 simultaneous SLA gates to qualify as certified Goodput.
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-base font-extrabold font-sans tabular-nums text-emerald-700 dark:text-emerald-400">
            {finalGoodputYield}% Goodput
          </span>
          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            Compound Production SLA Yield
          </span>
        </div>
      </div>

      {/* 3-Chamber Sieve Pipeline Visualization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-center p-4 sm:p-5 rounded-2xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 select-none">
        {/* Gate 1: TTFT Sieve */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-2 relative shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#853953] dark:text-[#A74B6A] flex items-center gap-1.5">
              <Radio className="h-4 w-4" /> Gate 1: TTFT
            </span>
            <span className="font-sans font-extrabold text-sm text-[#853953] dark:text-[#A74B6A]">
              {ttftPassPct}%
            </span>
          </div>
          <p className="text-xs text-[#2C2C2C]/65 dark:text-[#F3F4F4]/65">
            Filters TTFT ≤ {maxTtftMs}ms. Eliminates cold-start queue spikes.
          </p>
          <div className="h-2 w-full rounded-full bg-[#F3F4F4] dark:bg-[#1E1D1F] overflow-hidden">
            <motion.div
              className="h-full bg-[#853953] dark:bg-[#A74B6A]"
              style={{ width: `${ttftPassPct}%` }}
            />
          </div>
        </div>

        {/* Gate 2: TPOT Decode Sieve */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#612D53] dark:text-[#C57BB2] flex items-center gap-1.5">
              <Zap className="h-4 w-4" /> Gate 2: TPOT
            </span>
            <span className="font-sans font-extrabold text-sm text-[#612D53] dark:text-[#C57BB2]">
              {tpotPassPct}%
            </span>
          </div>
          <p className="text-xs text-[#2C2C2C]/65 dark:text-[#F3F4F4]/65">
            Filters TPOT ≤ {maxTpotMs}ms. Eliminates memory bandwidth token freezes.
          </p>
          <div className="h-2 w-full rounded-full bg-[#F3F4F4] dark:bg-[#1E1D1F] overflow-hidden">
            <motion.div
              className="h-full bg-[#612D53] dark:bg-[#C57BB2]"
              style={{ width: `${tpotPassPct}%` }}
            />
          </div>
        </div>

        {/* Gate 3: Error Trap */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Gate 3: Errors
            </span>
            <span className="font-sans font-extrabold text-sm text-rose-700 dark:text-rose-400">
              {errorPassPct}%
            </span>
          </div>
          <p className="text-xs text-[#2C2C2C]/65 dark:text-[#F3F4F4]/65">
            Filters Error Rate ≤ {maxErrorRatePct}%. Drops HTTP 429/5xx faults.
          </p>
          <div className="h-2 w-full rounded-full bg-[#F3F4F4] dark:bg-[#1E1D1F] overflow-hidden">
            <motion.div
              className="h-full bg-rose-600 dark:bg-rose-500"
              style={{ width: `${errorPassPct}%` }}
            />
          </div>
        </div>

        {/* Final Output: Certified Goodput */}
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Certified
            </span>
            <span className="font-sans font-black text-sm text-emerald-700 dark:text-emerald-400">
              {finalGoodputYield}%
            </span>
          </div>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
            Production-grade SLA compliant requests ready for user consumption.
          </p>
          <div className="h-2 w-full rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-600 dark:bg-emerald-400"
              style={{ width: `${finalGoodputYield}%` }}
            />
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
            <span>Goodput Sieve Mathematical Definition & Reliability Theory</span>
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
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Compound Goodput Formulation:
                  </span>
                  <MathFormula math="\text{Goodput} = \text{Total RPS} \times \mathbb{P}\left(\text{TTFT} \le T_{\max} \land \text{TPOT} \le t_{\max} \land \text{Status} = 200\right)" block />
                  <p className="text-[11px] text-[#2C2C2C]/65 dark:text-[#F3F4F4]/65">
                    Raw RPS can be misleading if requests suffer from token stutter or high queue latency. Goodput certifies strictly usable throughput.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-1.5">
                  <span className="font-semibold text-[#853953] dark:text-[#A74B6A]">
                    Multi-Stage SLA Filter Chain:
                  </span>
                  <MathFormula math="\text{Yield}_{\text{compound}} = \text{Pass}_{\text{TTFT}} \times \text{Pass}_{\text{TPOT}} \times (1 - \text{Rate}_{\text{error}})" block />
                  <p className="text-[11px] text-[#2C2C2C]/65 dark:text-[#F3F4F4]/65">
                    Each stage acts as an independent reliability filter, providing defense-in-depth against edge-case degraded responses.
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
