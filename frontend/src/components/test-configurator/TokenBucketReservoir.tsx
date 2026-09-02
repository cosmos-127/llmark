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
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(true);

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
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${rateStatus.badgeBg} ${rateStatus.color} shadow-2xs`}>
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[var(--text-main)]">
                Token Bucket Rate Limiter & Headroom Simulator
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-2">
                Quota Safety
              </Badge>
              <Badge variant="outline" className={`text-[10px] font-sans ${rateStatus.color} py-0 px-2`}>
                {rateStatus.label}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] dark:text-white/65 mt-0.5">
              {rateStatus.desc}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span
            className={`text-sm font-bold font-sans tabular-nums ${
              isThrottled ? "text-rose-700 dark:text-rose-400" : "text-[var(--brand-primary)]"
            }`}
          >
            ~{demandTpm.toLocaleString()} TPM Demand
          </span>
          <span className="text-[11px] text-[var(--text-subtle)] font-sans tabular-nums">
            Quota Ceiling: {providerTpmLimit.toLocaleString()} TPM ({providerRpmLimit.toLocaleString()} RPM)
          </span>
        </div>
      </div>

      {/* Visual Reservoir Beaker & Physics Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-subtle)]/70 dark:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] select-none">
        {/* Left: Animated Glass Reservoir Beaker */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center">
          <div className="relative w-32 h-36 rounded-b-3xl rounded-t-md border-2 border-[var(--border-subtle)] dark:border-white/15 bg-white/60 dark:bg-black/40 overflow-hidden flex flex-col justify-end p-1.5 shadow-inner">
            {/* Top Refill Inflow Indicator */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-80">
              <span className="text-[9px] font-sans font-bold text-[var(--brand-primary)]">
                Refill ({providerTpmLimit.toLocaleString()} TPM)
              </span>
              <ArrowDown className="h-3.5 w-3.5 text-[var(--brand-primary)] animate-bounce" />
            </div>

            {/* Dynamic Liquid Level */}
            <motion.div
              initial={false}
              animate={{ height: `${bucketFillPct}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`w-full rounded-b-2xl transition-colors relative overflow-hidden ${
                isThrottled
                  ? "bg-gradient-to-t from-rose-600 to-rose-400 shadow-rose-500/50 shadow-md"
                  : bucketFillPct < 30
                  ? "bg-gradient-to-t from-amber-600 to-amber-400"
                  : "bg-gradient-to-t from-[var(--brand-primary)] to-[var(--brand-secondary)]"
              }`}
            >
              {/* Fluid Surface Wave Animation */}
              <div className="absolute top-0 left-0 right-0 h-2.5 bg-white/35 animate-pulse" />
              <div className="h-full flex items-center justify-center text-xs font-sans font-bold text-white drop-shadow">
                {bucketFillPct}% Headroom
              </div>
            </motion.div>
          </div>

          <span className="text-[11px] text-[var(--text-muted)] mt-1.5 font-sans font-semibold">
            Token Bucket Reservoir Buffer
          </span>
        </div>

        {/* Right: Physics Breakdown & Test Surge Toggle */}
        <div className="lg:col-span-8 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[var(--text-main)] text-xs">
              Rate Limit Mechanics & Demand Physics
            </span>
            <button
              type="button"
              onClick={() => setIsSimulatingBurst(!isSimulatingBurst)}
              className={`text-xs font-sans px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs ${
                isSimulatingBurst
                  ? "bg-rose-100 dark:bg-rose-950/60 border-rose-300 text-rose-800 dark:text-rose-300 font-bold"
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)]"
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>{isSimulatingBurst ? "Surge Active (2.5x Load)" : "Simulate 2.5x Burst Surge"}</span>
            </button>
          </div>

          <p className="text-xs text-[var(--text-main)]/75 dark:text-white/75 leading-relaxed font-normal">
            Providers enforce rate limits via a <strong className="text-[var(--text-main)]">Token Bucket</strong>. When your active worker streams consume tokens faster than the refill rate, the reservoir buffer empties and responds with <strong className="text-rose-700 dark:text-rose-400">HTTP 429 (Too Many Requests)</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                Instantaneous Consumption Drain:
              </span>
              <div className="font-sans tabular-nums font-bold text-[var(--brand-primary)] text-xs">
                ~{demandTpm.toLocaleString()} TPM / ~{demandRpm.toLocaleString()} RPM
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Continuous Refill Capacity:
              </span>
              <div className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                {providerTpmLimit.toLocaleString()} TPM / {providerRpmLimit.toLocaleString()} RPM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry 4-Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            Concurrency Flow
          </span>
          <div className="font-sans tabular-nums font-bold text-[var(--brand-primary)] text-xs truncate">
            {concurrency} streams (~{estimatedTurnDurationSec}s/turn)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Request Rate (RPM)
          </span>
          <div className={`font-sans tabular-nums font-bold text-xs ${rpmUtilizationPct > 100 ? "text-rose-700 dark:text-rose-400" : "text-[var(--text-main)]"}`}>
            {demandRpm.toLocaleString()} / {providerRpmLimit.toLocaleString()} ({rpmUtilizationPct}%)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            Token Rate (TPM)
          </span>
          <div className={`font-sans tabular-nums font-bold text-xs ${tpmUtilizationPct > 100 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
            {demandTpm.toLocaleString()} / {providerTpmLimit.toLocaleString()} ({tpmUtilizationPct}%)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            Throttle Status
          </span>
          <div className="font-semibold text-[var(--text-main)] text-xs truncate">
            {isThrottled ? "429 Backoff Alert" : "Zero Throttling Safe"}
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
            <span>Token Bucket Algorithms & Rate Limiting Mechanics</span>
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
                    Token Bucket State Equation:
                  </span>
                  <MathFormula math="B(t) = \min\left(B_{\max}, B(t - \Delta t) + r \cdot \Delta t\right) - \Delta \text{Tokens}" block />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-white/65">
                    Where <MathFormula math="r" /> is the token refill rate (TPM/60). If <MathFormula math="B(t) < \text{Tokens}_{\text{req}}" />, provider responds with HTTP 429.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                  <span className="font-semibold text-[var(--brand-secondary)]">
                    Backoff Delay with Jitter Formulation:
                  </span>
                  <MathFormula math="t_{\text{backoff}} = \min\left(t_{\max}, t_0 \cdot 2^{\text{attempt}}\right) + \text{Uniform}(0, J)" block />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-white/65">
                    Full jitter randomized backoff prevents thundering herd synchronization when recovering from provider quota saturation.
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
