import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SloGoodputDistributionGraphProps {
  maxTtftMs: number;
  maxTpotMs: number;
  maxErrorRatePct: number;
  maxE2eMs: number;
}

interface LatencyPoint {
  x: number; // 0 to 520 SVG coords
  y: number; // 0 to 140 SVG coords
  latencyMs: number;
  pdfValue: number;
  cdfPct: number;
  isPassing: boolean;
}

export const SloGoodputDistributionGraph: React.FC<SloGoodputDistributionGraphProps> = ({
  maxTtftMs,
  maxTpotMs,
  maxErrorRatePct,
  maxE2eMs,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<LatencyPoint | null>(null);

  // SVG Dimension Constants
  const SVG_WIDTH = 520;
  const SVG_HEIGHT = 160;
  const PADDING = { top: 24, right: 24, bottom: 28, left: 44 };
  const PLOT_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
  const PLOT_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  // Max latency range on X-axis (up to 3000ms)
  const MAX_AXIS_MS = 2500;

  // Standard LLM TTFT Distribution Parameters (Log-Normal: Median ~350ms, Sigma ~0.55)
  const MU = Math.log(380);
  const SIGMA = 0.52;

  // Standard Normal Cumulative Distribution Function approximation
  const normalCDF = (x: number): number => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  };

  // Generate Log-Normal Probability Density Function points
  const points = useMemo<LatencyPoint[]>(() => {
    const NUM_POINTS = 60;
    const pts: LatencyPoint[] = [];

    // Find maximum PDF value for normalization
    const modeLatency = Math.exp(MU - SIGMA * SIGMA);
    const maxPdf = (1 / (modeLatency * SIGMA * Math.sqrt(2 * Math.PI))) *
      Math.exp(-Math.pow(Math.log(modeLatency) - MU, 2) / (2 * SIGMA * SIGMA));

    for (let i = 0; i <= NUM_POINTS; i++) {
      const u = i / NUM_POINTS;
      const latencyMs = Math.max(20, u * MAX_AXIS_MS);

      // Log-normal PDF: f(t) = 1 / (t * sigma * sqrt(2pi)) * exp(-(ln t - mu)^2 / 2sigma^2)
      const pdf = (1 / (latencyMs * SIGMA * Math.sqrt(2 * Math.PI))) *
        Math.exp(-Math.pow(Math.log(latencyMs) - MU, 2) / (2 * SIGMA * SIGMA));

      const normY = Math.min(1.0, pdf / maxPdf);
      const z = (Math.log(latencyMs) - MU) / SIGMA;
      const cdfPct = Number((normalCDF(z) * 100).toFixed(1));
      const isPassing = latencyMs <= maxTtftMs;

      const x = PADDING.left + u * PLOT_WIDTH;
      const y = PADDING.top + (1 - normY) * PLOT_HEIGHT;

      pts.push({
        x,
        y,
        latencyMs: Math.round(latencyMs),
        pdfValue: pdf,
        cdfPct,
        isPassing,
      });
    }

    return pts;
  }, [maxTtftMs, PLOT_WIDTH, PLOT_HEIGHT, PADDING.left, PADDING.top, MU, SIGMA]);

  // Compute passing Goodput percentage based on SLO cutoff and error rate
  const { goodputPct, sloX, strictnessInfo } = useMemo(() => {
    const zSlo = (Math.log(Math.max(50, maxTtftMs)) - MU) / SIGMA;
    const latencyPassFraction = normalCDF(zSlo);
    const errorMultiplier = Math.max(0, 1 - maxErrorRatePct / 100);
    const totalYield = Number((latencyPassFraction * errorMultiplier * 100).toFixed(1));

    const uSlo = Math.min(1.0, maxTtftMs / MAX_AXIS_MS);
    const xPos = PADDING.left + uSlo * PLOT_WIDTH;

    let strictness = {
      label: "Strict Production Grade",
      desc: "Demands sub-400ms TTFT responses. Zero tolerance for cold starts or queue lag.",
      color: "text-emerald-700 dark:text-emerald-400",
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40",
      icon: ShieldCheck,
    };

    if (maxTtftMs > 500 && maxTtftMs <= 1200) {
      strictness = {
        label: "Standard Interactive SLA",
        desc: "Accommodates nominal multi-tenant cluster queuing with high Goodput yield.",
        color: "text-blue-700 dark:text-blue-400",
        badgeBg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40",
        icon: Activity,
      };
    } else if (maxTtftMs > 1200) {
      strictness = {
        label: "Permissive / Batch Processing",
        desc: "Accommodates high queue depths, deep reasoning chains, and batch background workloads.",
        color: "text-purple-700 dark:text-purple-400",
        badgeBg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/40",
        icon: ShieldAlert,
      };
    }

    return {
      goodputPct: totalYield,
      sloX: xPos,
      strictnessInfo: strictness,
    };
  }, [maxTtftMs, maxErrorRatePct, MU, SIGMA, PLOT_WIDTH, PADDING.left]);

  // Construct passing (green) and breach (red) SVG path areas
  const { passingAreaPath, breachAreaPath, fullLinePath } = useMemo(() => {
    if (points.length === 0) return { passingAreaPath: "", breachAreaPath: "", fullLinePath: "" };

    const baselineY = PADDING.top + PLOT_HEIGHT;
    let fullLine = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      fullLine += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Split points into passing and breach sets
    const passingPts = points.filter((p) => p.latencyMs <= maxTtftMs);
    const breachPts = points.filter((p) => p.latencyMs >= maxTtftMs);

    let passArea = "";
    if (passingPts.length > 0) {
      let pLine = `M ${passingPts[0].x} ${passingPts[0].y}`;
      for (let i = 1; i < passingPts.length; i++) {
        pLine += ` L ${passingPts[i].x} ${passingPts[i].y}`;
      }
      const lastPass = passingPts[passingPts.length - 1];
      passArea = `${pLine} L ${lastPass.x} ${baselineY} L ${passingPts[0].x} ${baselineY} Z`;
    }

    let breachArea = "";
    if (breachPts.length > 0) {
      let bLine = `M ${breachPts[0].x} ${breachPts[0].y}`;
      for (let i = 1; i < breachPts.length; i++) {
        bLine += ` L ${breachPts[i].x} ${breachPts[i].y}`;
      }
      const lastBreach = breachPts[breachPts.length - 1];
      breachArea = `${bLine} L ${lastBreach.x} ${baselineY} L ${breachPts[0].x} ${baselineY} Z`;
    }

    return {
      passingAreaPath: passArea,
      breachAreaPath: breachArea,
      fullLinePath: fullLine,
    };
  }, [points, maxTtftMs, PLOT_HEIGHT, PADDING.top]);

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

  const StrictnessIcon = strictnessInfo.icon;

  return (
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${strictnessInfo.badgeBg} ${strictnessInfo.color}`}>
            <StrictnessIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                Latency Distribution & Goodput Yield Simulation
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-1.5">
                Reference & Simulation Only
              </Badge>
              <Badge variant="outline" className={`text-[10px] font-sans ${strictnessInfo.color} py-0 px-1.5`}>
                {strictnessInfo.label}
              </Badge>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              {strictnessInfo.desc}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-sm font-bold font-sans tabular-nums text-emerald-700 dark:text-emerald-400">
            {goodputPct}% Goodput
          </span>
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            Expected Production Yield
          </span>
        </div>
      </div>

      {/* Latency Density Distribution SVG Canvas */}
      <div className="relative w-full rounded-xl bg-[#F3F4F4]/70 dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 p-1 select-none overflow-hidden">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Passing Zone Gradient (Emerald) */}
            <linearGradient id="goodputGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.05" />
            </linearGradient>

            {/* Breach Zone Gradient (Rose) */}
            <linearGradient id="breachGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E11D48" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.05" />
            </linearGradient>
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

          {/* Shaded Areas */}
          {passingAreaPath && <path d={passingAreaPath} fill="url(#goodputGradient)" />}
          {breachAreaPath && <path d={breachAreaPath} fill="url(#breachGradient)" />}

          {/* Main Distribution Line */}
          <path
            d={fullLinePath}
            fill="none"
            stroke="#2C2C2C"
            strokeWidth="2"
            strokeOpacity="0.4"
            className="dark:stroke-[#F3F4F4]"
          />

          {/* Median P50 Marker */}
          <g>
            <line
              x1={PADDING.left + (380 / MAX_AXIS_MS) * PLOT_WIDTH}
              y1={PADDING.top + 8}
              x2={PADDING.left + (380 / MAX_AXIS_MS) * PLOT_WIDTH}
              y2={PADDING.top + PLOT_HEIGHT}
              stroke="currentColor"
              strokeDasharray="2 2"
              strokeOpacity="0.25"
            />
            <text
              x={PADDING.left + (380 / MAX_AXIS_MS) * PLOT_WIDTH}
              y={PADDING.top - 4}
              textAnchor="middle"
              className="text-[9px] font-sans fill-[#2C2C2C]/50 dark:fill-[#F3F4F4]/50"
            >
              P50 (380ms)
            </text>
          </g>

          {/* Interactive SLO Ceiling Barrier Line */}
          <g>
            <line
              x1={sloX}
              y1={PADDING.top}
              x2={sloX}
              y2={PADDING.top + PLOT_HEIGHT}
              stroke="#059669"
              strokeWidth="2"
              strokeDasharray="3 2"
              className="dark:stroke-emerald-400 transition-all"
            />
            <circle
              cx={sloX}
              cy={PADDING.top + 4}
              r="4"
              fill="#059669"
              className="dark:fill-emerald-400"
            />
            <text
              x={sloX}
              y={PADDING.top - 6}
              textAnchor="middle"
              className="text-[10px] font-sans font-bold fill-emerald-700 dark:fill-emerald-400"
            >
              SLO ≤ {maxTtftMs}ms
            </text>
          </g>

          {/* X-Axis Labels */}
          <text
            x={PADDING.left}
            y={SVG_HEIGHT - 6}
            textAnchor="start"
            className="text-[10px] font-sans tabular-nums text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 fill-current"
          >
            0ms
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH * 0.5}
            y={SVG_HEIGHT - 6}
            textAnchor="middle"
            className="text-[10px] font-sans tabular-nums text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 fill-current"
          >
            1,250ms
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH}
            y={SVG_HEIGHT - 6}
            textAnchor="end"
            className="text-[10px] font-sans tabular-nums font-semibold text-[#853953] dark:text-[#A74B6A] fill-current"
          >
            {MAX_AXIS_MS}ms+
          </text>

          {/* Interactive Hover Point Cursor */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={PADDING.top}
                x2={hoveredPoint.x}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="#2C2C2C"
                strokeWidth="1"
                strokeDasharray="2 2"
                className="dark:stroke-[#F3F4F4]"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="4.5"
                fill={hoveredPoint.isPassing ? "#059669" : "#E11D48"}
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
                top: "12px",
                transform: "translateX(-50%)",
              }}
              className="pointer-events-none z-20 px-2.5 py-1.5 rounded-lg bg-[#2C2C2C]/95 dark:bg-black/95 text-white text-xs shadow-lg backdrop-blur-md border border-white/15 space-y-0.5"
            >
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="font-semibold">TTFT: {hoveredPoint.latencyMs} ms</span>
                <span className={`font-sans font-bold ${hoveredPoint.isPassing ? "text-emerald-400" : "text-rose-400"}`}>
                  {hoveredPoint.isPassing ? "PASS (SLO Met)" : "FAIL (SLO Breached)"}
                </span>
              </div>
              <div className="text-[10px] text-white/70 font-sans flex items-center justify-between gap-3">
                <span>Cumulative: {hoveredPoint.cdfPct}% of requests</span>
                <span>Max SLO: {maxTtftMs}ms</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Telemetry Summary Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Passing Yield
          </span>
          <div className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
            {goodputPct}% yield
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Clock className="h-3 w-3 text-[#612D53] dark:text-[#C57BB2]" />
            Decode Smoothness
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
            TPOT ≤ {maxTpotMs} ms/tok
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            Error Rate Ceiling
          </span>
          <div className="font-sans tabular-nums font-semibold text-rose-700 dark:text-rose-400">
            ≤ {maxErrorRatePct}% errors
          </div>
        </div>
      </div>
    </div>
  );
};
