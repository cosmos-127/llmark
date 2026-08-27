import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Zap,
  Globe,
  Server,
  Cpu,
  Layers,
  Sparkles,
  Radio,
  ArrowRight,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MathFormula } from "@/components/ui/math-formula";

interface LatencyWaterfallInspectorProps {
  promptTokens: number;
  maxTokens: number;
  vendor: string;
  model: string;
  cacheBust: boolean;
}

interface WaterfallPhase {
  id: string;
  name: string;
  durationMs: number;
  pct: number;
  color: string;
  textColor: string;
  border: string;
  icon: any;
  desc: string;
}

export const LatencyWaterfallInspector: React.FC<LatencyWaterfallInspectorProps> = ({
  promptTokens,
  maxTokens,
  vendor,
  model,
  cacheBust,
}) => {
  const [hoveredPhase, setHoveredPhase] = useState<WaterfallPhase | null>(null);

  // Compute realistic latency stages based on prompt length, model, and caching
  const { phases, totalTurnaroundMs, ttftMs, tpotMs } = useMemo(() => {
    // 1. Network Handshake
    const dnsTlsMs = 32.0;

    // 2. Gateway Queue
    const gatewayQueueMs = 18.0;

    // 3. GPU Prefill (TTFT)
    const prefillPerTokenMs = cacheBust ? 0.08 : 0.02;
    const gpuPrefillMs = Number((Math.max(40, promptTokens * prefillPerTokenMs)).toFixed(1));

    // 4. Autoregressive Streaming Decode (TPOT)
    const tokenGenPerTokenMs = 22.0;
    const streamingDecodeMs = Number((maxTokens * tokenGenPerTokenMs).toFixed(1));

    const totalMs = Number((dnsTlsMs + gatewayQueueMs + gpuPrefillMs + streamingDecodeMs).toFixed(1));
    const ttft = Number((dnsTlsMs + gatewayQueueMs + gpuPrefillMs).toFixed(1));
    const tpot = tokenGenPerTokenMs;

    const phaseList: WaterfallPhase[] = [
      {
        id: "network",
        name: "1. Network TLS Handshake",
        durationMs: dnsTlsMs,
        pct: (dnsTlsMs / totalMs) * 100,
        color: "bg-blue-600 dark:bg-blue-500",
        textColor: "text-blue-700 dark:text-blue-400",
        border: "border-blue-500/40",
        icon: Globe,
        desc: "TCP 3-way handshake + TLS 1.3 cryptographic session setup over public internet.",
      },
      {
        id: "gateway",
        name: "2. Gateway Routing & Queue",
        durationMs: gatewayQueueMs,
        pct: (gatewayQueueMs / totalMs) * 100,
        color: "bg-purple-600 dark:bg-purple-500",
        textColor: "text-purple-700 dark:text-purple-400",
        border: "border-purple-500/40",
        icon: Server,
        desc: "Reverse proxy load balancer routing request to available GPU worker pod.",
      },
      {
        id: "prefill",
        name: `3. GPU Prefill (${cacheBust ? "Cold Matrix Compute" : "Warm Prefix Cache"})`,
        durationMs: gpuPrefillMs,
        pct: (gpuPrefillMs / totalMs) * 100,
        color: "bg-[#853953] dark:bg-[#A74B6A]",
        textColor: "text-[#853953] dark:text-[#A74B6A]",
        border: "border-[#853953]/40",
        icon: Cpu,
        desc: `Parallel tensor ingestion over ${promptTokens.toLocaleString()} prompt tokens to compute initial KV cache matrix.`,
      },
      {
        id: "decode",
        name: `4. Autoregressive Streaming (${maxTokens} tokens @ ~45 tok/s)`,
        durationMs: streamingDecodeMs,
        pct: (streamingDecodeMs / totalMs) * 100,
        color: "bg-[#612D53] dark:bg-[#C57BB2]",
        textColor: "text-[#612D53] dark:text-[#C57BB2]",
        border: "border-[#612D53]/40",
        icon: Zap,
        desc: `Sequential memory-bandwidth bound generation of ${maxTokens} output tokens delivered over Server-Sent Events (SSE).`,
      },
    ];

    return {
      phases: phaseList,
      totalTurnaroundMs: totalMs,
      ttftMs: ttft,
      tpotMs: tpot,
    };
  }, [promptTokens, maxTokens, cacheBust]);

  return (
    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-4 space-y-3.5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/30 text-[#853953] dark:text-[#A74B6A]">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                End-to-End Latency Waterfall & Turnaround Physics
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-1.5">
                Reference & Simulation Only
              </Badge>
              <Badge variant="outline" className="text-[10px] font-sans py-0 px-1.5 text-[#853953] dark:text-[#A74B6A]">
                Estimated Turnaround: {(totalTurnaroundMs / 1000).toFixed(2)}s
              </Badge>
            </div>
            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              Deconstructs request timeline: Edge Handshake → Queue → TTFT Prefill → Streaming Decode.
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-sm font-bold font-sans tabular-nums text-[#853953] dark:text-[#A74B6A]">
            {ttftMs}ms TTFT
          </span>
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
            Time to First Token
          </span>
        </div>
      </div>

      {/* Visual Multi-Phase Waterfall Bar */}
      <div className="space-y-1.5 select-none">
        <div className="h-5 w-full rounded-xl bg-[#F3F4F4] dark:bg-[#1E1D1F] border border-[#2C2C2C]/10 p-0.5 flex items-center overflow-hidden gap-0.5">
          {phases.map((phase) => (
            <motion.div
              key={phase.id}
              initial={{ width: 0 }}
              animate={{ width: `${phase.pct}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onMouseEnter={() => setHoveredPhase(phase)}
              onMouseLeave={() => setHoveredPhase(null)}
              className={`h-full rounded-lg ${phase.color} cursor-pointer transition-all flex items-center justify-center text-[10px] font-sans font-semibold text-white truncate px-1 shadow-2xs hover:brightness-110`}
            >
              {phase.pct >= 10 && <span>{phase.durationMs}ms</span>}
            </motion.div>
          ))}
        </div>

        {/* Hovered Phase Details Overlay */}
        <AnimatePresence>
          {hoveredPhase ? (
            <motion.div
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              className="p-2 rounded-lg bg-[#2C2C2C]/95 dark:bg-black/95 text-white text-xs flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{hoveredPhase.name}</span>
                <span className="text-[#A74B6A] font-sans font-bold">{hoveredPhase.durationMs} ms ({Math.round(hoveredPhase.pct)}%)</span>
              </div>
              <span className="text-[10px] text-white/70 font-sans">{hoveredPhase.desc}</span>
            </motion.div>
          ) : (
            /* Default Phase Legend */
            <div className="flex items-center justify-between text-[11px] font-sans text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 pt-0.5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-xs bg-blue-600 dark:bg-blue-500" />
                  <span>Edge TLS (32ms)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#853953] dark:bg-[#A74B6A]" />
                  <span>Prefill TTFT ({phases[2].durationMs}ms)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#612D53] dark:bg-[#C57BB2]" />
                  <span>Decode Stream ({phases[3].durationMs}ms)</span>
                </span>
              </div>
              <span className="font-semibold text-[#853953] dark:text-[#A74B6A]">
                Total: {(totalTurnaroundMs / 1000).toFixed(2)}s
              </span>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Physics Breakdown Footer Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Radio className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            TTFT Bottleneck
          </span>
          <div className="font-sans tabular-nums font-bold text-[#853953] dark:text-[#A74B6A]">
            {ttftMs} ms
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Zap className="h-3 w-3 text-[#612D53] dark:text-[#C57BB2]" />
            Streaming Rate
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
            ~45.5 tok/s (22ms/tok)
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 space-y-0.5">
          <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 tracking-wider font-sans font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Turnaround Profile
          </span>
          <div className="font-sans tabular-nums font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
            {(totalTurnaroundMs / 1000).toFixed(2)}s per call
          </div>
        </div>
      </div>
    </div>
  );
};
