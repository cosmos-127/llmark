import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  TrendingUp,
  Gauge,
  Zap,
  Radio,
  RotateCw,
  Clock,
  Target,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadCurveType } from "@/lib/types";
import { MathFormula } from "@/components/ui/math-formula";

interface WaveformSimulationGraphProps {
  loadCurve: LoadCurveType;
  concurrency: number;
  testMode: "duration" | "requests";
  durationSeconds: number;
  totalRequests?: number;
  warmupRequests?: number;
}

interface WaveformPoint {
  x: number;
  y: number;
  normalizedY: number;
  streams: number;
  timeLabel: string;
  phaseLabel: string;
  isWarmup: boolean;
  varianceLowY?: number;
  varianceHighY?: number;
}

export const WaveformSimulationGraph: React.FC<WaveformSimulationGraphProps> = ({
  loadCurve,
  concurrency,
  testMode,
  durationSeconds,
  totalRequests = 50,
  warmupRequests = 0,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<WaveformPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(true);

  const isRequestMode = testMode === "requests";
  const totalScopeLabel = isRequestMode
    ? `${totalRequests} requests`
    : `${durationSeconds}s duration`;

  // Graph geometry constants (enlarged for spacious presentation)
  const SVG_WIDTH = 540;
  const SVG_HEIGHT = 180;
  const PADDING = { top: 28, right: 24, bottom: 32, left: 48 };
  const PLOT_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
  const PLOT_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  // Warmup proportion of total test
  const warmupFraction = warmupRequests > 0 ? Math.min(0.18, (warmupRequests / (isRequestMode ? totalRequests : 30)) * 0.4 + 0.06) : 0;
  const warmupWidth = warmupFraction * PLOT_WIDTH;

  // Generate realistic mathematical curve points
  const points = useMemo<WaveformPoint[]>(() => {
    const NUM_SAMPLES = 60;
    const pts: WaveformPoint[] = [];

    for (let i = 0; i <= NUM_SAMPLES; i++) {
      const u = i / NUM_SAMPLES; // 0.0 to 1.0 progress
      const isWarmup = u < warmupFraction;

      let normY = 0;
      let phaseLabel = "Steady Load";
      let varLowNorm: number | undefined;
      let varHighNorm: number | undefined;

      const timeVal = isRequestMode
        ? Math.round(u * totalRequests)
        : Number((u * durationSeconds).toFixed(1));
      const timeLabel = isRequestMode ? `Req #${timeVal}` : `${timeVal}s`;

      if (isWarmup) {
        const warmupProgress = u / (warmupFraction || 0.001);
        normY = 0.15 + 0.85 * Math.sin((warmupProgress * Math.PI) / 2);
        phaseLabel = "TCP/TLS Warmup (Prime)";
      } else {
        const execU = (u - warmupFraction) / (1 - warmupFraction);

        switch (loadCurve) {
          case "constant": {
            normY = 1.0;
            phaseLabel = "Sustained Peak";
            break;
          }

          case "ramp_up": {
            const minRatio = Math.max(0.05, 1 / Math.max(1, concurrency));
            normY = minRatio + (1 - minRatio) * execU;
            phaseLabel = `Ramping (${Math.round(execU * 100)}%)`;
            break;
          }

          case "saturation_knee": {
            if (execU < 0.2) {
              normY = 0.2;
              phaseLabel = "Step 1: Baseline Probe";
            } else if (execU < 0.4) {
              normY = 0.4;
              phaseLabel = "Step 2: Light Concurrency";
            } else if (execU < 0.6) {
              normY = 0.65;
              phaseLabel = "Step 3: Nominal Load";
            } else if (execU < 0.8) {
              normY = 0.85;
              phaseLabel = "Step 4: KV Knee Threshold";
            } else {
              normY = 1.0;
              phaseLabel = "Step 5: Saturation Stress";
            }
            break;
          }

          case "spike": {
            const baseline = 0.25;
            const spike1 = 0.75 * Math.exp(-Math.pow((execU - 0.2) / 0.06, 2));
            const spike2 = 0.75 * Math.exp(-Math.pow((execU - 0.55) / 0.06, 2));
            const spike3 = 0.75 * Math.exp(-Math.pow((execU - 0.85) / 0.06, 2));
            normY = Math.min(1.0, baseline + spike1 + spike2 + spike3);

            if (spike1 > 0.35 || spike2 > 0.35 || spike3 > 0.35) {
              phaseLabel = "Surge Wave Spike (100%)";
            } else {
              phaseLabel = "Inter-Spike Baseline (25%)";
            }
            break;
          }

          case "poisson": {
            const wave1 = 0.22 * Math.sin(execU * Math.PI * 5);
            const wave2 = 0.12 * Math.cos(execU * Math.PI * 9 + 0.8);
            const wave3 = 0.06 * Math.sin(execU * Math.PI * 15 + 1.5);
            const baseMean = 0.65;
            normY = Math.min(1.0, Math.max(0.2, baseMean + wave1 + wave2 + wave3));

            varLowNorm = Math.max(0.1, normY - 0.15);
            varHighNorm = Math.min(1.0, normY + 0.15);
            phaseLabel = "Poisson Arrival Wave";
            break;
          }

          default: {
            normY = 1.0;
            phaseLabel = "Constant";
          }
        }
      }

      const activeStreams = Math.max(1, Math.round(normY * concurrency));
      const x = PADDING.left + u * PLOT_WIDTH;
      const y = PADDING.top + (1 - normY) * PLOT_HEIGHT;

      const varLowY = varLowNorm !== undefined ? PADDING.top + (1 - varLowNorm) * PLOT_HEIGHT : undefined;
      const varHighY = varHighNorm !== undefined ? PADDING.top + (1 - varHighNorm) * PLOT_HEIGHT : undefined;

      pts.push({
        x,
        y,
        normalizedY: normY,
        streams: activeStreams,
        timeLabel,
        phaseLabel,
        isWarmup,
        varianceLowY: varLowY,
        varianceHighY: varHighY,
      });
    }

    return pts;
  }, [loadCurve, concurrency, durationSeconds, totalRequests, warmupRequests, isRequestMode, warmupFraction, PLOT_WIDTH, PLOT_HEIGHT, PADDING.left, PADDING.top]);

  // Construct SVG Area & Path strings
  const { linePath, areaPath, varianceAreaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "", varianceAreaPath: "" };

    let lPath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      lPath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const baselineY = PADDING.top + PLOT_HEIGHT;
    const aPath = `${lPath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    let varArea = "";
    if (loadCurve === "poisson" && points[0].varianceHighY !== undefined) {
      let topPath = `M ${points[0].x} ${points[0].varianceHighY}`;
      for (let i = 1; i < points.length; i++) {
        topPath += ` L ${points[i].x} ${points[i].varianceHighY}`;
      }
      let botPath = "";
      for (let i = points.length - 1; i >= 0; i--) {
        botPath += ` L ${points[i].x} ${points[i].varianceLowY}`;
      }
      varArea = `${topPath} ${botPath} Z`;
    }

    return { linePath: lPath, areaPath: aPath, varianceAreaPath: varArea };
  }, [points, loadCurve, PADDING.top, PLOT_HEIGHT]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const svgY = ((e.clientY - rect.top) / rect.height) * SVG_HEIGHT;

    const clampedX = Math.max(PADDING.left, Math.min(PADDING.left + PLOT_WIDTH, svgX));
    const u = (clampedX - PADDING.left) / PLOT_WIDTH;
    const targetIdx = Math.round(u * (points.length - 1));
    const nearest = points[targetIdx];

    if (nearest) {
      setHoveredPoint(nearest);
      setMousePos({ x: svgX, y: svgY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setMousePos(null);
  };

  const patternMetadata = useMemo(() => {
    switch (loadCurve) {
      case "constant":
        return {
          title: "Constant Flat",
          badge: "Baseline Profiling",
          color: "text-[#853953] dark:text-[#F06A9A]",
          bg: "bg-[#853953]/10 dark:bg-[#D84577]/15 border-[#853953]/30",
          desc: "Maintains uninterrupted maximum concurrency to isolate steady-state streaming token throughput.",
          formula: "c(t) = C",
          icon: Activity,
        };
      case "ramp_up":
        return {
          title: "Linear Ramp-Up",
          badge: "Concurrency Search",
          color: "text-blue-700 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40",
          desc: "Gradually increases load from 1 worker up to peak capacity to reveal where latency begins degrading.",
          formula: "c(t) = 1 + (C - 1) \\cdot \\frac{t}{T}",
          icon: TrendingUp,
        };
      case "saturation_knee":
        return {
          title: "Saturation Knee Probe",
          badge: "Knee Discovery",
          color: "text-amber-700 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40",
          desc: "Executes discrete stepped plateaus (20% → 100%) to isolate the exact KV cache VRAM exhaustion point.",
          formula: "c_k = \\lfloor \\alpha_k \\cdot C \\rfloor, \\quad \\alpha \\in \\{0.2, 0.4, 0.65, 0.85, 1.0\\}",
          icon: Gauge,
        };
      case "spike":
        return {
          title: "Traffic Spikes",
          badge: "Burst Elasticity",
          color: "text-purple-700 dark:text-purple-400",
          bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/40",
          desc: "Generates high-magnitude sudden surges followed by recovery troughs to test autoscaler response and queue drain.",
          formula: "c(t) = C_{\\text{base}} + \\sum_{i} A_i \\exp\\left(-\\frac{(t - t_i)^2}{2\\sigma^2}\\right)",
          icon: Zap,
        };
      case "poisson":
        return {
          title: "Poisson Arrival",
          badge: "Stochastic Traffic",
          color: "text-emerald-700 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40",
          desc: "Simulates organic user traffic with non-homogeneous Poisson arrival bursts and variance intervals.",
          formula: "P(N(t) = k) = \\frac{(\\lambda t)^k e^{-\\lambda t}}{k!}, \\quad \\lambda(t) = \\bar{\\lambda} + \\Delta \\lambda(t)",
          icon: Radio,
        };
    }
  }, [loadCurve]);

  const Icon = patternMetadata.icon;

  const avgConcurrency = useMemo(() => {
    if (points.length === 0) return concurrency;
    const sum = points.reduce((acc, p) => acc + p.streams, 0);
    return (sum / points.length).toFixed(1);
  }, [points, concurrency]);

  return (
    <div className="rounded-2xl border border-[#2C2C2C]/10 dark:border-white/10 bg-white dark:bg-[#0F0F13] p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header bar with pattern badge and live streams */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${patternMetadata.bg} ${patternMetadata.color} shadow-2xs`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#2C2C2C] dark:text-white">
                Traffic Dispatch Waveform Simulation
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-2">
                Dynamic Load Model
              </Badge>
              <Badge variant="outline" className={`text-[10px] font-sans ${patternMetadata.color} py-0 px-2`}>
                {patternMetadata.title}
              </Badge>
            </div>
            <p className="text-xs text-[#2C2C2C]/65 dark:text-white/65 mt-0.5">
              {patternMetadata.desc}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-sm font-bold font-sans tabular-nums text-[#853953] dark:text-[#F06A9A]">
            {concurrency} Max In-Flight Streams
          </span>
          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-slate-400 font-sans tabular-nums">
            ~{avgConcurrency} avg in-flight load
          </span>
        </div>
      </div>

      {/* Interactive Waveform SVG Canvas */}
      <div className="relative w-full rounded-2xl bg-[#F3F4F4]/70 dark:bg-[#14141B] border border-[#2C2C2C]/10 dark:border-white/10 p-2 overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Primary Gradient Fill */}
            <linearGradient id="waveformGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#853953" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#853953" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#853953" stopOpacity="0.0" />
            </linearGradient>

            {/* Warmup Hatching Pattern */}
            <pattern id="warmupStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#D97706" strokeWidth="2" strokeOpacity="0.25" />
            </pattern>

            {/* Poisson Confidence Interval Gradient */}
            <linearGradient id="poissonBand" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.06" />
            </linearGradient>

            {/* Glow Filter for Active Line */}
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#853953" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Grid Background Lines */}
          <line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left + PLOT_WIDTH}
            y2={PADDING.top}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="3 3"
          />
          <line
            x1={PADDING.left}
            y1={PADDING.top + PLOT_HEIGHT / 2}
            x2={PADDING.left + PLOT_WIDTH}
            y2={PADDING.top + PLOT_HEIGHT / 2}
            stroke="currentColor"
            strokeOpacity="0.07"
            strokeDasharray="3 3"
          />
          <line
            x1={PADDING.left}
            y1={PADDING.top + PLOT_HEIGHT}
            x2={PADDING.left + PLOT_WIDTH}
            y2={PADDING.top + PLOT_HEIGHT}
            stroke="currentColor"
            strokeOpacity="0.15"
          />

          {/* Warmup Phase Highlight Zone */}
          {warmupRequests > 0 && (
            <g>
              <rect
                x={PADDING.left}
                y={PADDING.top}
                width={warmupWidth}
                height={PLOT_HEIGHT}
                fill="url(#warmupStripe)"
                className="transition-all"
              />
              <line
                x1={PADDING.left + warmupWidth}
                y1={PADDING.top}
                x2={PADDING.left + warmupWidth}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="#D97706"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeOpacity="0.7"
              />
              <text
                x={PADDING.left + warmupWidth / 2}
                y={PADDING.top - 8}
                textAnchor="middle"
                className="text-[10px] font-sans font-semibold fill-amber-700 dark:fill-amber-400"
              >
                Warmup ({warmupRequests} reqs)
              </text>
            </g>
          )}

          {/* Saturation Knee Marker & Callout */}
          {loadCurve === "saturation_knee" && (
            <g>
              <line
                x1={PADDING.left + PLOT_WIDTH * 0.7}
                y1={PADDING.top}
                x2={PADDING.left + PLOT_WIDTH * 0.7}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="#D97706"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.6"
              />
              <circle
                cx={PADDING.left + PLOT_WIDTH * 0.7}
                cy={PADDING.top + PLOT_HEIGHT * 0.15}
                r="4"
                fill="#D97706"
              />
              <text
                x={PADDING.left + PLOT_WIDTH * 0.7}
                y={PADDING.top - 8}
                textAnchor="middle"
                className="text-[10px] font-sans font-semibold fill-amber-700 dark:fill-amber-400"
              >
                Knee Inflection Point (Little's Law)
              </text>
            </g>
          )}

          {/* Spike Peak Surge Callout */}
          {loadCurve === "spike" && (
            <g>
              <text
                x={PADDING.left + PLOT_WIDTH * 0.2}
                y={PADDING.top - 8}
                textAnchor="middle"
                className="text-[10px] font-sans font-semibold fill-purple-700 dark:fill-purple-400"
              >
                Surge 1
              </text>
              <text
                x={PADDING.left + PLOT_WIDTH * 0.55}
                y={PADDING.top - 8}
                textAnchor="middle"
                className="text-[10px] font-sans font-semibold fill-purple-700 dark:fill-purple-400"
              >
                Surge 2
              </text>
              <text
                x={PADDING.left + PLOT_WIDTH * 0.85}
                y={PADDING.top - 8}
                textAnchor="middle"
                className="text-[10px] font-sans font-semibold fill-purple-700 dark:fill-purple-400"
              >
                Surge 3
              </text>
            </g>
          )}

          {/* Poisson Confidence Interval Shaded Area */}
          {loadCurve === "poisson" && varianceAreaPath && (
            <path d={varianceAreaPath} fill="url(#poissonBand)" />
          )}

          {/* Primary Waveform Shaded Area */}
          <path d={areaPath} fill="url(#waveformGradient)" />

          {/* Primary Waveform Curve Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#853953"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#lineGlow)"
            className="dark:stroke-[#A74B6A]"
          />

          {/* Y-Axis Labels */}
          <text
            x={PADDING.left - 8}
            y={PADDING.top + 4}
            textAnchor="end"
            className="text-[11px] font-sans tabular-nums font-bold fill-[#2C2C2C]/80 dark:fill-[#F3F4F4]/80"
          >
            {concurrency}
          </text>
          <text
            x={PADDING.left - 8}
            y={PADDING.top + PLOT_HEIGHT / 2 + 4}
            textAnchor="end"
            className="text-[11px] font-sans tabular-nums font-normal fill-[#2C2C2C]/50 dark:fill-[#F3F4F4]/50"
          >
            {Math.max(1, Math.round(concurrency / 2))}
          </text>
          <text
            x={PADDING.left - 8}
            y={PADDING.top + PLOT_HEIGHT + 4}
            textAnchor="end"
            className="text-[11px] font-sans tabular-nums font-normal fill-[#2C2C2C]/50 dark:fill-[#F3F4F4]/50"
          >
            0
          </text>

          {/* X-Axis Labels */}
          <text
            x={PADDING.left}
            y={SVG_HEIGHT - 8}
            textAnchor="start"
            className="text-[11px] font-sans tabular-nums font-medium fill-[#2C2C2C]/65 dark:fill-[#F3F4F4]/65"
          >
            0
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH / 2}
            y={SVG_HEIGHT - 8}
            textAnchor="middle"
            className="text-[11px] font-sans tabular-nums font-medium fill-[#2C2C2C]/65 dark:fill-[#F3F4F4]/65"
          >
            {isRequestMode
              ? `${Math.round(totalRequests / 2)} reqs (50%)`
              : `${(durationSeconds / 2).toFixed(0)}s (Mid-Test)`}
          </text>
          <text
            x={PADDING.left + PLOT_WIDTH}
            y={SVG_HEIGHT - 8}
            textAnchor="end"
            className="text-[11px] font-sans tabular-nums font-bold fill-[#853953] dark:fill-[#A74B6A]"
          >
            {totalScopeLabel}
          </text>

          {/* Interactive Scrubbing Cursor & Tooltip */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={PADDING.top}
                x2={hoveredPoint.x}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="#853953"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                className="dark:stroke-[#A74B6A]"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="7"
                fill="#853953"
                fillOpacity="0.25"
                className="animate-ping"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill="#853953"
                stroke="#ffffff"
                strokeWidth="2"
                className="dark:fill-[#A74B6A] dark:stroke-[#0F0F13]"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Pill on Hover */}
        <AnimatePresence>
          {hoveredPoint && mousePos && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                position: "absolute",
                left: `${Math.min(75, Math.max(25, (hoveredPoint.x / SVG_WIDTH) * 100))}%`,
                top: "12px",
                transform: "translateX(-50%)",
              }}
              className="pointer-events-none z-20 px-3 py-2 rounded-xl bg-[#2C2C2C]/95 dark:bg-black/95 text-white text-xs shadow-xl backdrop-blur-md border border-white/15 space-y-1"
            >
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="font-bold text-[#F3F4F4]">{hoveredPoint.timeLabel}</span>
                <span className="text-[#A74B6A] font-sans font-extrabold text-sm">
                  {hoveredPoint.streams} / {concurrency} streams
                </span>
              </div>
              <div className="text-[11px] text-white/75 font-sans flex items-center justify-between gap-4">
                <span>Phase: {hoveredPoint.phaseLabel}</span>
                <span className="font-semibold text-emerald-400">
                  {Math.round(hoveredPoint.normalizedY * 100)}% load
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Telemetry Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#F3F4F4]/80 dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 space-y-1">
          <span className="text-[11px] text-[#2C2C2C]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-[#853953] dark:text-[#F06A9A]" />
            Peak Load Target
          </span>
          <div className="font-sans tabular-nums font-bold text-[#853953] dark:text-[#F06A9A] text-xs">
            {concurrency} streams (100% capacity)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#F3F4F4]/80 dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 space-y-1">
          <span className="text-[11px] text-[#2C2C2C]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#612D53] dark:text-[#E270BB]" />
            Test Execution Scope
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#2C2C2C] dark:text-white text-xs">
            {totalScopeLabel}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#F3F4F4]/80 dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 space-y-1">
          <span className="text-[11px] text-[#2C2C2C]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <RotateCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Socket Priming
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#2C2C2C] dark:text-white text-xs">
            {warmupRequests > 0 ? `${warmupRequests} warmup reqs` : "0 (Immediate cold)"}
          </div>
        </div>
      </div>

      {/* Theoretical Foundations Collapsible Card */}
      <div className="p-4 rounded-xl bg-[#F3F4F4]/80 dark:bg-[#14141B] border border-[#2C2C2C]/10 space-y-3">
        <button
          type="button"
          onClick={() => setShowTheoryDetails(!showTheoryDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[#2C2C2C] dark:text-white cursor-pointer hover:text-[#853953] dark:hover:text-[#F06A9A]"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
            <span>Queuing Theory & Load Curve Modeling Mechanics</span>
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showTheoryDetails ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showTheoryDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-2 text-xs border-t border-[#2C2C2C]/10 dark:border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white dark:bg-[#0F0F13] border border-[#2C2C2C]/10 space-y-1.5">
                  <span className="font-semibold text-[#853953] dark:text-[#F06A9A]">
                    Active Curve Mathematical Formulation:
                  </span>
                  <MathFormula math={patternMetadata.formula} block />
                  <p className="text-[11px] text-[#2C2C2C]/65 dark:text-white/65">
                    Modulates dispatch worker allocation over the normalized test lifecycle.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#0F0F13] border border-[#2C2C2C]/10 space-y-1.5">
                  <span className="font-semibold text-[#612D53] dark:text-[#E270BB]">
                    Little's Law & Saturation Knee Dynamics:
                  </span>
                  <MathFormula math="L = \lambda W, \quad W_{\text{queue}} \approx \frac{\rho}{\mu(1 - \rho)}" block />
                  <p className="text-[11px] text-[#2C2C2C]/65 dark:text-white/65">
                    As GPU server utilization <MathFormula math="\rho \to 1" />, queuing delays explode asymptotically, causing severe tail TTFT degradation at the saturation knee.
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
