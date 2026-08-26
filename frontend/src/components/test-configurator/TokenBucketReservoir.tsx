import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Activity,
  ArrowDown,
  RotateCcw,
  Sparkles,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TokenBucketReservoirProps {
  concurrency: number;
  loadCurve: string;
  promptTokens: number;
  maxTokens: number;
  providerTpmLimit?: number;
}

export const TokenBucketReservoir: React.FC<TokenBucketReservoirProps> = ({
  concurrency,
  loadCurve,
  promptTokens,
  maxTokens,
  providerTpmLimit = 60000, // Nominal Tier 2 TPM rate limit (60k tokens/min)
}) => {
  const [isSimulatingBurst, setIsSimulatingBurst] = useState(false);

  const totalTokensPerTurn = Math.max(1, promptTokens + maxTokens);

  // Compute instantaneous token consumption rate (TPM)
  const { demandTpm, bucketFillPct, isThrottled, rateStatus } = useMemo(() => {
    // Under concurrency N, assuming avg turn time ≈ 1.5s -> RPS ≈ concurrency / 1.5
    let effectiveRps = concurrency / 1.4;

    if (loadCurve === "spike" || isSimulatingBurst) {
      effectiveRps *= 2.5; // Surge multiplier
    } else if (loadCurve === "saturation_knee") {
      effectiveRps *= 1.4;
    } else if (loadCurve === "ramp_up") {
      effectiveRps *= 0.8;
    }

    const calculatedTpm = Math.round(effectiveRps * totalTokensPerTurn * 60);
    const fillRatio = Math.max(0.05, Math.min(1.0, 1 - (calculatedTpm - providerTpmLimit * 0.4) / (providerTpmLimit * 1.2)));
    const fillPct = Math.round(fillRatio * 100);
    const throttled = calculatedTpm > providerTpmLimit;

    let status = {
      label: "Nominal Flow (Within TPM Quota)",
      desc: `Demand (~${calculatedTpm.toLocaleString()} TPM) is well within the provider refill capacity (${providerTpmLimit.toLocaleString()} TPM). Zero 429 risk.`,
      color: "text-emerald-700 dark:text-emerald-400",
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40",
      alert: false,
    };

    if (throttled) {
      status = {
        label: "HTTP 429 Throttle Exceeded",
        desc: `Burst demand (~${calculatedTpm.toLocaleString()} TPM) drains the token bucket faster than the provider can refill it. Expect 429 rate limit backoff!`,
        color: "text-rose-700 dark:text-rose-400",
        badgeBg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40",
        alert: true,
      };
    } else if (calculatedTpm > providerTpmLimit * 0.75) {
      status = {
        label: "High Capacity Utilization (>75%)",
        desc: `Operating near token bucket ceiling (~${calculatedTpm.toLocaleString()} TPM). Sudden burst traffic may trip rate limits.`,
        color: "text-amber-700 dark:text-amber-400",
        badgeBg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40",
        alert: false,
      };
    }

    return {
      demandTpm: calculatedTpm,
      bucketFillPct: fillPct,
      isThrottled: throttled,
      rateStatus: status,
    };
  }, [concurrency, totalTokensPerTurn, loadCurve, providerTpmLimit, isSimulatingBurst]);

  return (
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${rateStatus.badgeBg} ${rateStatus.color}`}>
            <Droplets className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Token Bucket & Leaky Bucket Rate Limiter Simulator
              </span>
              <Badge variant="outline" className={`text-[10px] font-sans ${rateStatus.color} py-0 px-1.5`}>
                {rateStatus.label}
              </Badge>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              {rateStatus.desc}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className={`text-sm font-bold font-sans tabular-nums ${
            isThrottled ? "text-rose-700 dark:text-rose-400" : "text-[#853953] dark:text-[#A74B6A]"
          }`}>
            ~{demandTpm.toLocaleString()} TPM
          </span>
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            Quota Limit: {providerTpmLimit.toLocaleString()} TPM
          </span>
        </div>
      </div>

      {/* Visual Reservoir Beaker Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 select-none">
        {/* Left: Animated Glass Vessel */}
        <div className="md:col-span-4 flex flex-col items-center justify-center">
          <div className="relative w-28 h-32 rounded-b-2xl rounded-t-sm border-2 border-[#2C2C2C]/30 dark:border-[#F3F4F4]/30 bg-white/50 dark:bg-black/30 overflow-hidden flex flex-col justify-end p-1 shadow-inner">
            {/* Top Refill Inflow Indicator */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-60">
              <span className="text-[8px] font-sans text-blue-600 dark:text-blue-400">Refill (+TPM)</span>
              <ArrowDown className="h-3 w-3 text-blue-500 animate-bounce" />
            </div>

            {/* Dynamic Liquid Level */}
            <motion.div
              initial={false}
              animate={{ height: `${bucketFillPct}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`w-full rounded-b-xl transition-colors relative overflow-hidden ${
                isThrottled
                  ? "bg-gradient-to-t from-rose-600 to-rose-400 shadow-rose-500/50 shadow-md"
                  : bucketFillPct < 30
                  ? "bg-gradient-to-t from-amber-600 to-amber-400"
                  : "bg-gradient-to-t from-[#853953] to-blue-500"
              }`}
            >
              {/* Fluid Surface Wave Animation */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-white/30 animate-pulse" />
              <div className="h-full flex items-center justify-center text-[10px] font-sans font-bold text-white drop-shadow">
                {bucketFillPct}% Fill
              </div>
            </motion.div>
          </div>

          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 mt-1 font-sans">
            Token Bucket Reservoir
          </span>
        </div>

        {/* Right: Physics Breakdown & Test Surge Toggle */}
        <div className="md:col-span-8 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
              Rate Limit Mechanics & Bucket Physics
            </span>
            <button
              type="button"
              onClick={() => setIsSimulatingBurst(!isSimulatingBurst)}
              className={`text-[11px] font-sans px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                isSimulatingBurst
                  ? "bg-rose-100 dark:bg-rose-950/60 border-rose-300 text-rose-800 dark:text-rose-300 font-bold"
                  : "bg-white dark:bg-[#252426] border-[#2C2C2C]/20 text-[#2C2C2C] dark:text-[#F3F4F4] hover:bg-[#F3F4F4]"
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>{isSimulatingBurst ? "Simulating Traffic Burst (Active)" : "Simulate 2.5x Burst"}</span>
            </button>
          </div>

          <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed font-normal">
            Providers enforce rate limits using a <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">Token Bucket</strong>. When your active worker streams consume tokens faster than the refill rate, the bucket empties and immediately responds with <strong className="text-rose-700 dark:text-rose-400">HTTP 429 Too Many Requests</strong>.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-0.5">
              <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">Drain Rate:</span>
              <div className="font-sans tabular-nums font-bold text-[#853953] dark:text-[#A74B6A]">
                ~{demandTpm.toLocaleString()} TPM
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-0.5">
              <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">Refill Ceiling:</span>
              <div className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                {providerTpmLimit.toLocaleString()} TPM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Footer Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans font-medium flex items-center gap-1">
            <Activity className="h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            Concurrency Flow
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#853953] dark:text-[#A74B6A]">
            {concurrency} streams @ {totalTokensPerTurn} tok
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans font-medium flex items-center gap-1">
            <Droplets className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            Bucket Health
          </span>
          <div className={`font-sans tabular-nums font-bold ${isThrottled ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
            {bucketFillPct}% capacity
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            Throttle Risk
          </span>
          <div className="font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] truncate">
            {isThrottled ? "429 Backoff Imminent" : "Zero Throttling"}
          </div>
        </div>
      </div>
    </div>
  );
};
