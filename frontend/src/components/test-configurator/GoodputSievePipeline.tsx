import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Multi-Stage Goodput Filtration Sieve
              </span>
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
    </div>
  );
};
