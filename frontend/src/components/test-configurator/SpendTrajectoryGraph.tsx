import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  ShieldCheck,
  AlertCircle,
  Clock,
  Target,
  Sparkles,
  TrendingUp,
  BookOpen,
  ChevronDown,
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

  const isRequestMode = testMode === "requests";
  const totalScopeLabel = isRequestMode
    ? `${totalRequests} requests`
    : `${durationSeconds}s duration`;

  const capVal = Math.max(0.1, hardSpendCap || 2.0);
  const willTripCap = estimatedCost > capVal;
  const spendPct = Math.round((estimatedCost / capVal) * 100);

  // SVG Dimensions
  const SVG_WIDTH = 520;
  const SVG_HEIGHT = 160;
  const PADDING = { top: 24, right: 24, bottom: 28, left: 48 };
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
    const NUM_POINTS = 50;
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

  // Handle Mouse Scrubbing
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
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${
            willTripCap
              ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400"
              : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
          }`}>
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Spend Accumulation & Circuit Breaker Trajectory
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-1.5">
                Reference & Simulation Only
              </Badge>
              <Badge variant={willTripCap ? "destructive" : "emerald"} className="text-[10px] font-sans py-0 px-1.5">
                {willTripCap ? "Circuit Breaker Tripped Early" : "Budget Guardrail Safe"}
              </Badge>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              {willTripCap
                ? `Test will automatically halt at ~${tripTimeSec}${isRequestMode ? " reqs" : "s"} when spend reaches ${formatUsd(capVal)}.`
                : `Projected spend stays safely within the ${formatUsd(capVal)} hard spend ceiling.`}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className={`text-sm font-bold font-sans tabular-nums ${
            willTripCap ? "text-rose-700 dark:text-rose-400" : "text-[#853953] dark:text-[#A74B6A]"
          }`}>
            {formatUsd(estimatedCost)} Est.
          </span>
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            {spendPct}% of {formatUsd(capVal)} cap
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full rounded-xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 p-1 select-none overflow-hidden">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Safe Spend Gradient */}
            <linearGradient id="spendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#853953" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#853953" stopOpacity="0.04" />
            </linearGradient>

            {/* Circuit Break Area Pattern */}
            <pattern id="abortedStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#E11D48" strokeWidth="1.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Baseline Grid */}
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
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeOpacity="0.85"
            />
            <text
              x={PADDING.left + PLOT_WIDTH}
              y={capY - 5}
              textAnchor="end"
              className="text-[9px] font-sans font-bold fill-rose-700 dark:fill-rose-400"
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
              stroke="#853953"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="dark:stroke-[#A74B6A]"
            />
          )}

          {/* Aborted Trajectory Dashed Line */}
          {abortedLinePath && (
            <path
              d={abortedLinePath}
              fill="none"
              stroke="#E11D48"
              strokeWidth="2"
              strokeDasharray="3 3"
              strokeOpacity="0.6"
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
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.6"
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
                r="4.5"
                fill="#E11D48"
                stroke="#ffffff"
                strokeWidth="2"
                className="dark:stroke-[#252426]"
              />
              <text
                x={tripX}
                y={capY - 6}
                textAnchor="middle"
                className="text-[9px] font-sans font-bold fill-rose-700 dark:fill-rose-400"
              >
                Halt @ {tripTimeSec}{isRequestMode ? " reqs" : "s"}
              </text>
            </g>
          )}

          {/* Y-Axis Labels */}
          <text
            x={PADDING.left - 6}
            y={PADDING.top + 4}
            textAnchor="end"
            className="text-[10px] font-sans tabular-nums text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 fill-current"
          >
            {formatUsd(maxYValue)}
          </text>
          <text
            x={PADDING.left - 6}
            y={capY + 3}
            textAnchor="end"
            className="text-[9px] font-sans tabular-nums font-bold text-rose-700 dark:text-rose-400 fill-current"
          >
            {formatUsd(capVal)}
          </text>
          <text
            x={PADDING.left - 6}
            y={PADDING.top + PLOT_HEIGHT + 3}
            textAnchor="end"
            className="text-[10px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 fill-current"
          >
            $0.00
          </text>

          {/* X-Axis Labels */}
          <text
            x={PADDING.left}
            y={SVG_HEIGHT - 6}
            textAnchor="start"
            className="text-[10px] font-sans tabular-nums text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 fill-current"
          >
            0
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH / 2}
            y={SVG_HEIGHT - 6}
            textAnchor="middle"
            className="text-[10px] font-sans tabular-nums text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 fill-current"
          >
            {isRequestMode ? `${Math.round(totalRequests / 2)} reqs` : `${(durationSeconds / 2).toFixed(0)}s`}
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH}
            y={SVG_HEIGHT - 6}
            textAnchor="end"
            className="text-[10px] font-sans tabular-nums font-semibold text-[#853953] dark:text-[#A74B6A] fill-current"
          >
            {totalScopeLabel}
          </text>

          {/* Interactive Hover Point Cursor */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={PADDING.top}
                x2={hoveredPoint.x}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="#853953"
                strokeWidth="1"
                strokeDasharray="2 2"
                className="dark:stroke-[#A74B6A]"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="4.5"
                fill={hoveredPoint.isPastCap ? "#E11D48" : "#853953"}
                stroke="#ffffff"
                strokeWidth="2"
                className="dark:stroke-[#252426]"
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
                top: "10px",
                transform: "translateX(-50%)",
              }}
              className="pointer-events-none z-20 px-2.5 py-1.5 rounded-lg bg-[#2C2C2C]/95 dark:bg-black/95 text-white text-xs shadow-lg backdrop-blur-md border border-white/15 space-y-0.5"
            >
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="font-semibold">{hoveredPoint.timeLabel}</span>
                <span className={`font-sans font-bold ${hoveredPoint.isPastCap ? "text-rose-400" : "text-[#A74B6A]"}`}>
                  Spend: {formatUsd(hoveredPoint.spend)}
                </span>
              </div>
              <div className="text-[10px] text-white/70 font-sans flex items-center justify-between gap-3">
                <span>Cap Utilization: {hoveredPoint.capUtilizationPct}%</span>
                <span>{hoveredPoint.isPastCap ? "TRIPPED" : "UNDER CAP"}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Telemetry Summary Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Hard Spend Cap
          </span>
          <div className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
            {formatUsd(capVal)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            Cap Utilization
          </span>
          <div className={`font-sans tabular-nums font-bold ${willTripCap ? "text-rose-700 dark:text-rose-400" : "text-[#853953] dark:text-[#A74B6A]"}`}>
            {spendPct}%
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-[#612D53] dark:text-[#C57BB2]" />
            Circuit Breaker
          </span>
          <div className="font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] truncate">
            {willTripCap ? `Halt @ ${tripTimeSec}${isRequestMode ? " reqs" : "s"}` : "Zero Bill-Shock Armed"}
          </div>
        </div>
      </div>
    </div>
  );
};
