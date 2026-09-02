import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Clock,
  Target,
  Sparkles,
  TrendingUp,
  BookOpen,
  ChevronDown,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/utils";
import { MathFormula } from "@/components/ui/math-formula";

interface SpendTrajectoryGraphProps {
  hardSpendCap: number;
  estimatedCost: number;
  testMode: "duration" | "requests";
  durationSeconds: number;
  totalRequests?: number;
  concurrency: number;
}

interface TrajectoryPoint {
  x: number;
  y: number;
  spend: number;
  timeLabel: string;
  isPastCap: boolean;
  capUtilizationPct: number;
}

export const SpendTrajectoryGraph: React.FC<SpendTrajectoryGraphProps> = ({
  hardSpendCap,
  estimatedCost,
  testMode,
  durationSeconds,
  totalRequests = 50,
  concurrency,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<TrajectoryPoint | null>(null);
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(true);

  const isRequestMode = testMode === "requests";
  const totalScopeLabel = isRequestMode
    ? `${totalRequests} requests`
    : `${durationSeconds}s duration`;

  const capVal = Math.max(0.1, hardSpendCap || 2.0);
  const willTripCap = estimatedCost > capVal;
  const spendPct = Math.round((estimatedCost / capVal) * 100);

  // SVG Geometry Constants (enlarged for spacious rendering)
  const SVG_WIDTH = 540;
  const SVG_HEIGHT = 180;
  const PADDING = { top: 28, right: 24, bottom: 32, left: 52 };
  const PLOT_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
  const PLOT_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  // Max Y-Axis Scale is whichever is higher: spend cap or estimated cost + 20%
  const maxYValue = Math.max(capVal * 1.15, estimatedCost * 1.15, 1.0);

  // Intercept point if spend exceeds cap
  const tripFraction = willTripCap ? capVal / Math.max(0.01, estimatedCost) : 1.0;
  const tripTimeSec = isRequestMode
    ? Math.round(tripFraction * totalRequests)
    : Number((tripFraction * durationSeconds).toFixed(1));
  const tripX = PADDING.left + tripFraction * PLOT_WIDTH;
  const capY = PADDING.top + (1 - capVal / maxYValue) * PLOT_HEIGHT;

  // Generate continuous trajectory points
  const points = useMemo<TrajectoryPoint[]>(() => {
    const NUM_POINTS = 65;
    const pts: TrajectoryPoint[] = [];

    for (let i = 0; i <= NUM_POINTS; i++) {
      const u = i / NUM_POINTS;
      const currentSpend = u * estimatedCost;
      const isPast = currentSpend > capVal;

      const normY = Math.min(1.0, currentSpend / maxYValue);
      const x = PADDING.left + u * PLOT_WIDTH;
      const y = PADDING.top + (1 - normY) * PLOT_HEIGHT;

      const timeVal = isRequestMode
        ? Math.round(u * totalRequests)
        : Number((u * durationSeconds).toFixed(1));
      const timeLabel = isRequestMode ? `Req #${timeVal}` : `${timeVal}s`;
      const capUtil = Math.round((currentSpend / capVal) * 100);

      pts.push({
        x,
        y,
        spend: currentSpend,
        timeLabel,
        isPastCap: isPast,
        capUtilizationPct: capUtil,
      });
    }

    return pts;
  }, [estimatedCost, capVal, maxYValue, durationSeconds, totalRequests, isRequestMode, PLOT_WIDTH, PLOT_HEIGHT, PADDING.left, PADDING.top]);

  // Construct trajectory path strings
  const { linePath, areaPath, abortedLinePath } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "", abortedLinePath: "" };

    const baselineY = PADDING.top + PLOT_HEIGHT;
    const activePts = points.filter((p) => !p.isPastCap);
    const abortedPts = points.filter((p) => p.isPastCap);

    let lPath = `M ${points[0].x} ${points[0].y}`;
    const limitIdx = willTripCap ? activePts.length : points.length;

    for (let i = 1; i < limitIdx; i++) {
      lPath += ` L ${points[i].x} ${points[i].y}`;
    }

    if (willTripCap) {
      lPath += ` L ${tripX} ${capY}`;
    }

    const lastActiveX = willTripCap ? tripX : points[points.length - 1].x;
    const aPath = `${lPath} L ${lastActiveX} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    let abPath = "";
    if (willTripCap && abortedPts.length > 0) {
      abPath = `M ${tripX} ${capY}`;
      for (const p of abortedPts) {
        abPath += ` L ${p.x} ${p.y}`;
      }
    }

    return { linePath: lPath, areaPath: aPath, abortedLinePath: abPath };
  }, [points, willTripCap, tripX, capY, PADDING.top, PLOT_HEIGHT]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;

    const clampedX = Math.max(PADDING.left, Math.min(PADDING.left + PLOT_WIDTH, svgX));
    const u = (clampedX - PADDING.left) / PLOT_WIDTH;
    const targetIdx = Math.round(u * (points.length - 1));
    const nearest = points[targetIdx];

    if (nearest) {
      setHoveredPoint(nearest);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${
            willTripCap
              ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400"
              : "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] text-[var(--brand-primary)]"
          } shadow-2xs`}>
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[var(--text-main)]">
                Spend Accumulation Trajectory & Circuit Breaker Model
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-2">
                Cost Modeling
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] font-sans py-0 px-2 ${
                  willTripCap ? "text-rose-700 dark:text-rose-400 font-bold border-rose-300" : "text-[var(--brand-primary)] border-[var(--brand-primary-border)]"
                }`}
              >
                {willTripCap ? "Circuit Breaker Tripped Early" : "Safely Within Budget"}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] dark:text-white/65 mt-0.5">
              {willTripCap
                ? `Test will automatically halt at ~${tripTimeSec}${isRequestMode ? " reqs" : "s"} when spend reaches ${formatUsd(capVal)}.`
                : `Projected spend stays safely within the ${formatUsd(capVal)} hard spend ceiling.`}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span
            className={`text-base font-bold font-sans tabular-nums ${
              willTripCap ? "text-rose-700 dark:text-rose-400" : "text-[var(--brand-primary)]"
            }`}
          >
            {formatUsd(estimatedCost)} Est.
          </span>
          <span className="text-[11px] text-[var(--text-subtle)] font-sans tabular-nums">
            {spendPct}% of {formatUsd(capVal)} hard spend cap
          </span>
        </div>
      </div>

      {/* Trajectory Graph Canvas */}
      <div className="relative w-full rounded-2xl bg-[var(--bg-surface-subtle)]/70 dark:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] p-2 select-none overflow-hidden">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="spendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0.04" />
            </linearGradient>

            <pattern id="abortedStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#E11D48" strokeWidth="1.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Grid Baseline */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + PLOT_HEIGHT}
            x2={PADDING.left + PLOT_WIDTH}
            y2={PADDING.top + PLOT_HEIGHT}
            stroke="currentColor"
            strokeOpacity="0.15"
          />

          {/* Hard Spend Cap Ceiling Line */}
          <g>
            <line
              x1={PADDING.left}
              y1={capY}
              x2={PADDING.left + PLOT_WIDTH}
              y2={capY}
              stroke="#E11D48"
              strokeWidth="2"
              strokeDasharray="4 3"
              className="dark:stroke-rose-400"
            />
            <text
              x={PADDING.left + PLOT_WIDTH}
              y={capY - 6}
              textAnchor="end"
              className="text-[11px] font-sans font-bold fill-rose-700 dark:fill-rose-400"
            >
              Hard Spend Cap: {formatUsd(capVal)}
            </text>
          </g>

          {/* Shaded Area */}
          {areaPath && <path d={areaPath} fill="url(#spendGradient)" />}

          {/* Active Spend Trajectory Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--brand-primary)"
              strokeWidth="3"
              strokeLinecap="round"
              className="dark:stroke-[var(--brand-primary)]"
            />
          )}

          {/* Aborted Trajectory Dashed Line */}
          {abortedLinePath && (
            <path
              d={abortedLinePath}
              fill="none"
              stroke="#E11D48"
              strokeWidth="2.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Circuit Breaker Intercept Point Node */}
          {willTripCap && (
            <g>
              <line
                x1={tripX}
                y1={capY}
                x2={tripX}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="#E11D48"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={tripX}
                cy={capY}
                r="7"
                fill="#E11D48"
                fillOpacity="0.25"
                className="animate-ping"
              />
              <circle
                cx={tripX}
                cy={capY}
                r="5"
                fill="#E11D48"
                stroke="#ffffff"
                strokeWidth="2"
                className="dark:stroke-[#111827]"
              />
              <text
                x={tripX}
                y={capY - 8}
                textAnchor="middle"
                className="text-[10px] font-sans font-bold fill-rose-700 dark:fill-rose-400"
              >
                Halt @ {tripTimeSec}{isRequestMode ? " reqs" : "s"}
              </text>
            </g>
          )}

          {/* Y-Axis Labels */}
          <text
            x={PADDING.left - 8}
            y={PADDING.top + 4}
            textAnchor="end"
            className="text-[11px] font-sans tabular-nums font-bold fill-[#0F172A]/80 dark:fill-[#F1F5F9]/80"
          >
            {formatUsd(maxYValue)}
          </text>
          <text
            x={PADDING.left - 8}
            y={capY + 4}
            textAnchor="end"
            className="text-[10px] font-sans tabular-nums font-bold fill-rose-700 dark:fill-rose-400"
          >
            {formatUsd(capVal)}
          </text>
          <text
            x={PADDING.left - 8}
            y={PADDING.top + PLOT_HEIGHT + 4}
            textAnchor="end"
            className="text-[11px] font-sans tabular-nums font-normal fill-[#0F172A]/50 dark:fill-[#F1F5F9]/50"
          >
            $0.00
          </text>

          {/* X-Axis Labels */}
          <text
            x={PADDING.left}
            y={SVG_HEIGHT - 8}
            textAnchor="start"
            className="text-[11px] font-sans tabular-nums font-medium fill-[#0F172A]/65 dark:fill-[#F1F5F9]/65"
          >
            0
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH / 2}
            y={SVG_HEIGHT - 8}
            textAnchor="middle"
            className="text-[11px] font-sans tabular-nums font-medium fill-[#0F172A]/65 dark:fill-[#F1F5F9]/65"
          >
            {isRequestMode ? `${Math.round(totalRequests / 2)} reqs` : `${(durationSeconds / 2).toFixed(0)}s`}
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH}
            y={SVG_HEIGHT - 8}
            textAnchor="end"
            className="text-[11px] font-sans tabular-nums font-bold fill-[var(--brand-primary)] dark:fill-[var(--brand-primary)]"
          >
            {totalScopeLabel}
          </text>

          {/* Hover Scrubbing Cursor */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={PADDING.top}
                x2={hoveredPoint.x}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="var(--brand-primary)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                className="dark:stroke-[var(--brand-primary)]"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill={hoveredPoint.isPastCap ? "#E11D48" : "var(--brand-primary)"}
                stroke="#ffffff"
                strokeWidth="2"
                className="dark:stroke-[#111827]"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: "absolute",
                left: `${Math.min(75, Math.max(25, (hoveredPoint.x / SVG_WIDTH) * 100))}%`,
                top: "12px",
                transform: "translateX(-50%)",
              }}
              className="pointer-events-none z-20 px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)]/95 dark:bg-black/95 text-white text-xs shadow-xl backdrop-blur-md border border-white/15 space-y-1"
            >
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="font-bold">{hoveredPoint.timeLabel}</span>
                <span className={`font-sans font-bold ${hoveredPoint.isPastCap ? "text-rose-400" : "text-[var(--brand-primary)]"}`}>
                  Spend: {formatUsd(hoveredPoint.spend)}
                </span>
              </div>
              <div className="text-[11px] text-white/75 font-sans flex items-center justify-between gap-4">
                <span>Cap Utilization: {hoveredPoint.capUtilizationPct}%</span>
                <span className={hoveredPoint.isPastCap ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                  {hoveredPoint.isPastCap ? "TRIPPED" : "UNDER CAP"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Telemetry Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Hard Spend Cap
          </span>
          <div className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-xs">
            {formatUsd(capVal)} USD
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            Cap Utilization
          </span>
          <div className={`font-sans tabular-nums font-bold text-xs ${willTripCap ? "text-rose-700 dark:text-rose-400" : "text-[var(--brand-primary)]"}`}>
            {spendPct}% of ceiling
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-secondary)]" />
            Circuit Breaker Status
          </span>
          <div className="font-semibold text-[var(--text-main)] text-xs truncate">
            {willTripCap ? `Halt @ ${tripTimeSec}${isRequestMode ? " reqs" : "s"}` : "Zero Bill-Shock Armed"}
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
            <span>Spend Accumulation Dynamics & Circuit Breaker Formulation</span>
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
                    Spend Accumulation Model:
                  </span>
                  <MathFormula math="\text{Cost}(t) = \int_0^t \text{RPS}(s) \cdot \left(N_{\text{prompt}} \cdot P_{\text{in}} + N_{\text{gen}} \cdot P_{\text{out}}\right) ds" block />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-white/65">
                    Integrates token consumption over streaming concurrency and unit token pricing.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                  <span className="font-semibold text-rose-700 dark:text-rose-400">
                    Circuit Breaker Trip Intercept:
                  </span>
                  <MathFormula math="t_{\text{abort}} = \inf \left\{ t \ge 0 \mid \text{Cost}(t) \ge \text{Cap}_{\text{USD}} \right\} = \frac{\text{Cap}_{\text{USD}}}{\text{BurnRate}}" block />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-white/65">
                    Hard budget circuit breakers terminate in-flight worker streams instantaneously when the threshold is reached.
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
