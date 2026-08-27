import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  AlertTriangle,
  Zap,
  Activity,
  ArrowDown,
  ChevronDown,
  BookOpen,
  Layers,
  Clock,
  Gauge,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MathFormula } from "@/components/ui/math-formula";

interface TokenBucketReservoirProps {
  concurrency: number;
  loadCurve: string;
  promptTokens: number;
  maxTokens: number;
  providerTpmLimit?: number;
  providerRpmLimit?: number;
}

export const TokenBucketReservoir: React.FC<TokenBucketReservoirProps> = ({
  concurrency,
  loadCurve,
  promptTokens,
  maxTokens,
  providerTpmLimit = 60000, // Nominal Tier 2 TPM limit (60k tokens/min)
  providerRpmLimit = 500,   // Nominal Tier 2 RPM limit (500 requests/min)
}) => {
  const [isSimulatingBurst, setIsSimulatingBurst] = useState(false);

  const totalTokensPerTurn = Math.max(1, promptTokens + maxTokens);

  // Compute realistic dynamic physics & quota demand
  const {
    estimatedTurnDurationSec,
    effectiveRps,
    demandRpm,
    demandTpm,
    tpmUtilizationPct,
    rpmUtilizationPct,
    bucketFillPct,
    isThrottled,
    throttleReason,
    rateStatus,
  } = useMemo(() => {
    // Dynamic turnaround duration based on prefill TTFT (~0.35s) + decode generation (~50 tokens/sec)
    const turnDuration = Math.max(0.4, 0.35 + maxTokens / 50);

    // Baseline RPS from concurrency and round-trip turn time
    let rps = concurrency / turnDuration;

    // Apply load curve multipliers to model traffic profile
    let curveMultiplier = 1.0;
    if (loadCurve === "spike" || isSimulatingBurst) {
      curveMultiplier = 2.5; // Surge / burst multiplier
    } else if (loadCurve === "saturation_knee") {
      curveMultiplier = 1.4;
    } else if (loadCurve === "ramp_up") {
      curveMultiplier = 0.8;
    }

    const effectiveRpsCalc = rps * curveMultiplier;
    const calculatedRpm = Math.round(effectiveRpsCalc * 60);
    const calculatedTpm = Math.round(effectiveRpsCalc * totalTokensPerTurn * 60);

    const tpmPct = Math.round((calculatedTpm / providerTpmLimit) * 100);
    const rpmPct = Math.round((calculatedRpm / providerRpmLimit) * 100);

    // Remaining reservoir headroom (Bucket Fill %)
    const highestUtilization = Math.max(tpmPct, rpmPct);
    const fillPct = Math.max(0, Math.min(100, 100 - highestUtilization));

    const tpmThrottled = calculatedTpm > providerTpmLimit;
    const rpmThrottled = calculatedRpm > providerRpmLimit;
    const throttled = tpmThrottled || rpmThrottled;

    let reason = "";
    if (tpmThrottled && rpmThrottled) {
      reason = "Both TPM and RPM quotas exceeded";
    } else if (tpmThrottled) {
      reason = `TPM quota exceeded (${calculatedTpm.toLocaleString()} > ${providerTpmLimit.toLocaleString()} TPM)`;
    } else if (rpmThrottled) {
      reason = `RPM quota exceeded (${calculatedRpm.toLocaleString()} > ${providerRpmLimit.toLocaleString()} RPM)`;
    }

    let status = {
      label: "Nominal Flow (Within Quotas)",
      desc: `Demand (~${calculatedTpm.toLocaleString()} TPM / ~${calculatedRpm.toLocaleString()} RPM) is safely within provider capacity. Zero 429 risk.`,
      color: "text-emerald-700 dark:text-emerald-400",
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40",
      alert: false,
    };

    if (throttled) {
      status = {
        label: "HTTP 429 Throttle Exceeded",
        desc: `Burst rate drains tokens/requests faster than provider refill. ${reason}. Expect 429 rate limit backoff!`,
        color: "text-rose-700 dark:text-rose-400",
        badgeBg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40",
        alert: true,
      };
    } else if (highestUtilization > 75) {
      status = {
        label: `High Capacity Utilization (${highestUtilization}%)`,
        desc: `Operating near provider quota ceiling (~${calculatedTpm.toLocaleString()} TPM / ~${calculatedRpm.toLocaleString()} RPM). Sudden traffic bursts may trip limits.`,
        color: "text-amber-700 dark:text-amber-400",
        badgeBg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40",
        alert: false,
      };
    }

    return {
      estimatedTurnDurationSec: turnDuration.toFixed(2),
      effectiveRps: effectiveRpsCalc.toFixed(2),
      demandRpm: calculatedRpm,
      demandTpm: calculatedTpm,
      tpmUtilizationPct: tpmPct,
      rpmUtilizationPct: rpmPct,
      bucketFillPct: fillPct,
      isThrottled: throttled,
      throttleReason: reason,
      rateStatus: status,
    };
  }, [
    concurrency,
    maxTokens,
    totalTokensPerTurn,
    loadCurve,
    providerTpmLimit,
    providerRpmLimit,
    isSimulatingBurst,
  ]);

  return (
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${rateStatus.badgeBg} ${rateStatus.color}`}>
            <Droplets className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Token Bucket Rate Limiter Simulator
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-1.5">
                Pre-Flight Physics
              </Badge>
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
          <span
            className={`text-sm font-bold font-sans tabular-nums ${
              isThrottled ? "text-rose-700 dark:text-rose-400" : "text-[#853953] dark:text-[#A74B6A]"
            }`}
          >
            ~{demandTpm.toLocaleString()} TPM
          </span>
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            Quota Ceiling: {providerTpmLimit.toLocaleString()} TPM ({providerRpmLimit.toLocaleString()} RPM)
          </span>
        </div>
      </div>

      {/* Visual Reservoir Beaker & Physics Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3.5 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 select-none">
        {/* Left: Animated Glass Reservoir Beaker */}
        <div className="md:col-span-4 flex flex-col items-center justify-center">
          <div className="relative w-28 h-32 rounded-b-2xl rounded-t-sm border-2 border-[#2C2C2C]/30 dark:border-[#F3F4F4]/30 bg-white/50 dark:bg-black/30 overflow-hidden flex flex-col justify-end p-1 shadow-inner">
            {/* Top Refill Inflow Indicator */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-70">
              <span className="text-[8px] font-sans font-semibold text-blue-600 dark:text-blue-400">
                Refill ({providerTpmLimit.toLocaleString()} TPM)
              </span>
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
                {bucketFillPct}% Headroom
              </div>
            </motion.div>
          </div>

          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 mt-1 font-sans font-medium">
            Token Reservoir Buffer
          </span>
        </div>

        {/* Right: Physics Breakdown & Test Surge Toggle */}
        <div className="md:col-span-8 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
              Rate Limit Mechanics & Demand Physics
            </span>
            <button
              type="button"
              onClick={() => setIsSimulatingBurst(!isSimulatingBurst)}
              className={`text-[11px] font-sans px-2.5 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                isSimulatingBurst
                  ? "bg-rose-100 dark:bg-rose-950/60 border-rose-300 text-rose-800 dark:text-rose-300 font-bold"
                  : "bg-white dark:bg-[#252426] border-[#2C2C2C]/20 text-[#2C2C2C] dark:text-[#F3F4F4] hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C]"
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>{isSimulatingBurst ? "Burst Surge Active (2.5x)" : "Simulate 2.5x Burst"}</span>
            </button>
          </div>

          <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed font-normal">
            Providers enforce rate limits via a <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">Token Bucket</strong>. When your active worker streams consume tokens faster than the refill rate, the reservoir buffer empties and responds with <strong className="text-rose-700 dark:text-rose-400">HTTP 429 (Too Many Requests)</strong>.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="p-2 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-0.5">
              <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
                Instantaneous Drain:
              </span>
              <div className="font-sans tabular-nums font-bold text-[#853953] dark:text-[#A74B6A]">
                ~{demandTpm.toLocaleString()} TPM / ~{demandRpm.toLocaleString()} RPM
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 space-y-0.5">
              <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 flex items-center gap-1">
                <Gauge className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                Refill Capacity:
              </span>
              <div className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                {providerTpmLimit.toLocaleString()} TPM / {providerRpmLimit.toLocaleString()} RPM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry 4-Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Activity className="h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            Concurrency Flow
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#853953] dark:text-[#A74B6A] truncate">
            {concurrency} streams (~{estimatedTurnDurationSec}s/turn)
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Clock className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
            Request Rate (RPM)
          </span>
          <div className={`font-sans tabular-nums font-semibold ${rpmUtilizationPct > 100 ? "text-rose-700 dark:text-rose-400" : "text-[#2C2C2C] dark:text-[#F3F4F4]"}`}>
            {demandRpm.toLocaleString()} / {providerRpmLimit.toLocaleString()} ({rpmUtilizationPct}%)
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Droplets className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            Token Rate (TPM)
          </span>
          <div className={`font-sans tabular-nums font-bold ${tpmUtilizationPct > 100 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
            {demandTpm.toLocaleString()} / {providerTpmLimit.toLocaleString()} ({tpmUtilizationPct}%)
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            Throttle Status
          </span>
          <div className="font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] truncate">
            {isThrottled ? "429 Backoff Alert" : "Zero Throttling"}
          </div>
        </div>
      </div>
    </div>
  );
};
