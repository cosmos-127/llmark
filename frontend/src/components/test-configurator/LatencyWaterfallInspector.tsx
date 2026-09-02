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
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(true);

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
        name: "1. Network Edge & TLS Handshake",
        durationMs: dnsTlsMs,
        pct: (dnsTlsMs / totalMs) * 100,
        color: "bg-[var(--brand-primary)]",
        textColor: "text-[var(--brand-primary)]",
        border: "border-[var(--brand-primary-border)]",
        icon: Globe,
        desc: "TCP 3-way handshake + TLS 1.3 cryptographic session setup over public internet edge.",
      },
      {
        id: "gateway",
        name: "2. Gateway Routing & Ingress Queue",
        durationMs: gatewayQueueMs,
        pct: (gatewayQueueMs / totalMs) * 100,
        color: "bg-purple-600 dark:bg-purple-500",
        textColor: "text-purple-700 dark:text-purple-400",
        border: "border-purple-500/40",
        icon: Server,
        desc: "Reverse proxy load balancer routing request to available worker GPU executor pod.",
      },
      {
        id: "prefill",
        name: `3. GPU Prefill (${cacheBust ? "Cold Matrix Compute" : "Warm Prefix Hit"})`,
        durationMs: gpuPrefillMs,
        pct: (gpuPrefillMs / totalMs) * 100,
        color: "bg-[var(--brand-primary)]",
        textColor: "text-[var(--brand-primary)]",
        border: "border-[var(--brand-primary-border)]",
        icon: Cpu,
        desc: `Parallel tensor ingestion over ${promptTokens.toLocaleString()} prompt tokens to compute initial KV cache matrix.`,
      },
      {
        id: "decode",
        name: `4. Autoregressive Streaming (${maxTokens} tokens @ ~45.5 tok/s)`,
        durationMs: streamingDecodeMs,
        pct: (streamingDecodeMs / totalMs) * 100,
        color: "bg-[var(--brand-secondary)]",
        textColor: "text-[var(--brand-secondary)]",
        border: "border-[var(--brand-secondary-border)]",
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
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl border bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] text-[var(--brand-primary)] shadow-2xs">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[var(--text-main)]">
                End-to-End Latency Waterfall & Turnaround Physics
              </span>
              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-2">
                Timing Breakdown
              </Badge>
              <Badge variant="outline" className="text-[10px] font-sans py-0 px-2 text-[var(--brand-primary)]">
                Estimated Turnaround: {(totalTurnaroundMs / 1000).toFixed(2)}s
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] dark:text-white/65 mt-0.5">
              Deconstructs request timeline: Edge Handshake → Gateway Queue → TTFT Prefill → Streaming Decode.
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-base font-bold font-sans tabular-nums text-[var(--brand-primary)]">
            {ttftMs}ms TTFT
          </span>
          <span className="text-[11px] text-[var(--text-subtle)] font-sans tabular-nums">
            Time to First Token (Latency Ceiling)
          </span>
        </div>
      </div>

      {/* Visual Multi-Phase Waterfall Bar */}
      <div className="space-y-2 p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-subtle)]/70 dark:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] select-none">
        <div className="h-7 w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-0.5 flex items-center overflow-hidden gap-1 shadow-inner">
          {phases.map((phase) => (
            <motion.div
              key={phase.id}
              initial={{ width: 0 }}
              animate={{ width: `${phase.pct}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onMouseEnter={() => setHoveredPhase(phase)}
              onMouseLeave={() => setHoveredPhase(null)}
              className={`h-full rounded-lg ${phase.color} cursor-pointer transition-all flex items-center justify-center text-xs font-sans font-semibold text-white truncate px-2 shadow-2xs hover:brightness-110`}
            >
              {phase.pct >= 8 && <span>{phase.durationMs}ms ({Math.round(phase.pct)}%)</span>}
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
              className="p-2.5 rounded-xl bg-[var(--bg-surface-elevated)]/95 dark:bg-black/95 text-white text-xs flex items-center justify-between shadow-lg backdrop-blur-md border border-white/10"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-white">{hoveredPhase.name}</span>
                <span className="text-[var(--brand-primary)] font-sans font-bold">{hoveredPhase.durationMs} ms ({Math.round(hoveredPhase.pct)}%)</span>
              </div>
              <span className="text-[11px] text-white/75 font-sans">{hoveredPhase.desc}</span>
            </motion.div>
          ) : (
            <div className="flex items-center justify-between text-xs font-sans text-[var(--text-body)] pt-1">
              <div className="flex items-center gap-3.5 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[var(--brand-primary)]" />
                  <span>Edge TLS (32ms)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-purple-600 dark:bg-purple-500" />
                  <span>Queue (18ms)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[var(--brand-primary)]" />
                  <span>Prefill TTFT ({phases[2].durationMs}ms)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[var(--brand-secondary)]" />
                  <span>Decode Stream ({phases[3].durationMs}ms)</span>
                </span>
              </div>
              <span className="font-bold text-[var(--brand-primary)]">
                Total: {(totalTurnaroundMs / 1000).toFixed(2)}s
              </span>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Physics Breakdown Footer Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            TTFT Bottleneck Latency
          </span>
          <div className="font-sans tabular-nums font-bold text-[var(--brand-primary)] text-xs">
            {ttftMs} ms
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-[var(--brand-secondary)]" />
            Streaming Decode Velocity
          </span>
          <div className="font-sans tabular-nums font-semibold text-[var(--text-main)] text-xs">
            ~45.5 tok/s (22.0 ms/tok TPOT)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-main)]/55 dark:text-white/55 font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Total Turnaround Profile
          </span>
          <div className="font-sans tabular-nums font-semibold text-[var(--text-main)] text-xs">
            {(totalTurnaroundMs / 1000).toFixed(2)}s per complete call
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
            <span>End-to-End Latency Decomposition & Mathematical Model</span>
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
                    End-to-End Latency Equation:
                  </span>
                  <MathFormula math="T_{\text{E2E}} = T_{\text{Transport}} + T_{\text{Queue}} + T_{\text{Prefill}} + \left(N_{\text{gen}} \cdot \text{TPOT}\right)" block />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-white/65">
                    Separates fixed transport/queue overhead from linear autoregressive generation duration.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                  <span className="font-semibold text-[var(--brand-secondary)]">
                    TTFT Decomposition:
                  </span>
                  <MathFormula math="T_{\text{TTFT}} = T_{\text{DNS}} + T_{\text{TCP}} + T_{\text{TLS}} + T_{\text{Queue}} + T_{\text{Prefill}}" block />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-white/65">
                    Socket reuse (HTTP Keep-Alive / HTTP/2 multiplexing) eliminates <MathFormula math="T_{\text{Transport}}" /> on consecutive benchmark turns.
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
