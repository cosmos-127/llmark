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
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MathFormula } from "@/components/ui/math-formula";

interface SloGoodputDistributionGraphProps {
  maxTtftMs: number;
  maxTpotMs: number;
  maxErrorRatePct: number;
  maxE2eMs: number;
}

interface LatencyPoint {
  x: number;
  y: number;
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
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(true);

  // SVG Dimension Constants (enlarged for spacious rendering)
  const SVG_WIDTH = 540;
  const SVG_HEIGHT = 180;
  const PADDING = { top: 28, right: 24, bottom: 32, left: 48 };
  const PLOT_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
  const PLOT_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  // Max latency range on X-axis (up to 3000ms)
  const MAX_AXIS_MS = 2500;

  // Standard LLM TTFT Distribution Parameters (Log-Normal: Median ~380ms, Sigma ~0.52)
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
    const NUM_POINTS = 65;
    const pts: LatencyPoint[] = [];

    const modeLatency = Math.exp(MU - SIGMA * SIGMA);
    const maxPdf = (1 / (modeLatency * SIGMA * Math.sqrt(2 * Math.PI))) *
      Math.exp(-Math.pow(Math.log(modeLatency) - MU, 2) / (2 * SIGMA * SIGMA));

    for (let i = 0; i <= NUM_POINTS; i++) {
      const u = i / NUM_POINTS;
      const latencyMs = Math.max(20, u * MAX_AXIS_MS);

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
    <div className="rounded-2xl border border-[#0F172A]/10 dark:border-white/10 bg-white dark:bg-[#111827] p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${strictnessInfo.badgeBg} ${strictnessInfo.color} shadow-2xs`}>
            <StrictnessIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#0F172A] dark:text-white">
                Latency Probability Density & Goodput Yield (Log-Normal Model)
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-2">
                Statistical Physics
              </Badge>
              <Badge variant="outline" className={`text-[10px] font-sans ${strictnessInfo.color} py-0 px-2`}>
                {strictnessInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-[#0F172A]/65 dark:text-white/65 mt-0.5">
              {strictnessInfo.desc}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-base font-bold font-sans tabular-nums text-[#2563EB] dark:text-[#60A5FA]">
            {goodputPct}% Goodput Yield
          </span>
          <span className="text-[11px] text-[#0F172A]/50 dark:text-slate-400 font-sans tabular-nums">
            Expected Production SLA Pass Rate
          </span>
        </div>
      </div>

      {/* Latency Density Distribution SVG Canvas */}
      <div className="relative w-full rounded-2xl bg-[#F1F5F9]/70 dark:bg-[#1E293B] border border-[#0F172A]/10 p-2 select-none overflow-hidden">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="goodputGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.05" />
            </linearGradient>

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
            stroke="#0F172A"
            strokeWidth="2.5"
            strokeOpacity="0.5"
            className="dark:stroke-[#F1F5F9]"
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
              y={PADDING.top - 6}
              textAnchor="middle"
              className="text-[10px] font-sans font-medium fill-[#0F172A]/50 dark:fill-[#F1F5F9]/50"
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
              strokeWidth="2.5"
              strokeDasharray="3 2"
              className="dark:stroke-emerald-400 transition-all"
            />
            <circle
              cx={sloX}
              cy={PADDING.top + 4}
              r="4.5"
              fill="#059669"
              className="dark:fill-emerald-400"
            />
            <text
              x={sloX}
              y={PADDING.top - 8}
              textAnchor="middle"
              className="text-[11px] font-sans font-bold fill-emerald-700 dark:fill-emerald-400"
            >
              SLO Barrier: ≤ {maxTtftMs}ms
            </text>
          </g>

          {/* X-Axis Labels */}
          <text
            x={PADDING.left}
            y={SVG_HEIGHT - 8}
            textAnchor="start"
            className="text-[11px] font-sans tabular-nums font-medium fill-[#0F172A]/65 dark:fill-[#F1F5F9]/65"
          >
            0ms
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH * 0.5}
            y={SVG_HEIGHT - 8}
            textAnchor="middle"
            className="text-[11px] font-sans tabular-nums font-medium fill-[#0F172A]/65 dark:fill-[#F1F5F9]/65"
          >
            1,250ms
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH}
            y={SVG_HEIGHT - 8}
            textAnchor="end"
            className="text-[11px] font-sans tabular-nums font-bold fill-[#2563EB] dark:fill-[#3B82F6]"
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
                stroke="#0F172A"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                className="dark:stroke-[#F1F5F9]"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill={hoveredPoint.isPassing ? "#059669" : "#E11D48"}
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
              className="pointer-events-none z-20 px-3 py-2 rounded-xl bg-[#0F172A]/95 dark:bg-black/95 text-white text-xs shadow-xl backdrop-blur-md border border-white/15 space-y-1"
            >
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="font-bold">TTFT: {hoveredPoint.latencyMs} ms</span>
                <span className={`font-sans font-bold ${hoveredPoint.isPassing ? "text-emerald-400" : "text-rose-400"}`}>
                  {hoveredPoint.isPassing ? "PASS (SLO Compliant)" : "FAIL (SLO Breached)"}
                </span>
              </div>
              <div className="text-[11px] text-white/75 font-sans flex items-center justify-between gap-4">
                <span>Cumulative Density: {hoveredPoint.cdfPct}% of calls</span>
                <span>Max Target: {maxTtftMs}ms</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Telemetry Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#F1F5F9]/80 dark:bg-[#0F172A] border border-[#0F172A]/10 space-y-1">
          <span className="text-[11px] text-[#0F172A]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Certified Production Yield
          </span>
          <div className="font-sans tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-xs">
            {goodputPct}% certified yield
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#F1F5F9]/80 dark:bg-[#0F172A] border border-[#0F172A]/10 space-y-1">
          <span className="text-[11px] text-[#0F172A]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#1D4ED8] dark:text-[#38BDF8]" />
            Streaming Smoothness Limit
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#0F172A] dark:text-white text-xs">
            TPOT ≤ {maxTpotMs} ms/tok
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#F1F5F9]/80 dark:bg-[#0F172A] border border-[#0F172A]/10 space-y-1">
          <span className="text-[11px] text-[#0F172A]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            Error Budget Ceiling
          </span>
          <div className="font-sans tabular-nums font-semibold text-rose-700 dark:text-rose-400 text-xs">
            ≤ {maxErrorRatePct}% failure rate
          </div>
        </div>
      </div>

      {/* Theoretical Foundations Collapsible Card */}
      <div className="p-4 rounded-xl bg-[#F1F5F9]/80 dark:bg-[#1E293B] border border-[#0F172A]/10 space-y-3">
        <button
          type="button"
          onClick={() => setShowTheoryDetails(!showTheoryDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[#0F172A] dark:text-white cursor-pointer hover:text-[#2563EB] dark:hover:text-[#60A5FA]"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]" />
            <span>Statistical Log-Normal Latency Modeling in LLM Inference</span>
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showTheoryDetails ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showTheoryDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-2 text-xs border-t border-[#0F172A]/10 dark:border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-[#0F172A]/10 space-y-1.5">
                  <span className="font-semibold text-[#2563EB] dark:text-[#60A5FA]">
                    Log-Normal Latency PDF:
                  </span>
                  <MathFormula math="f(t; \mu, \sigma) = \frac{1}{t \sigma \sqrt{2\pi}} \exp\left(-\frac{(\ln t - \mu)^2}{2\sigma^2}\right), \quad t > 0" block />
                  <p className="text-[11px] text-[#0F172A]/65 dark:text-white/65">
                    LLM request latencies are strictly positive and multiplicative, exhibiting long right tails that standard Gaussian distributions fail to capture.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-[#0F172A]/10 space-y-1.5">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Cumulative SLO Compliance Integral:
                  </span>
                  <MathFormula math="\text{Yield} = \Phi\left(\frac{\ln(\text{SLO}_{\text{TTFT}}) - \mu}{\sigma}\right) \times (1 - \text{ErrorRate})" block />
                  <p className="text-[11px] text-[#0F172A]/65 dark:text-white/65">
                    Calculates the integral probability that a random user request falls strictly below the SLO latency cutoff threshold.
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
