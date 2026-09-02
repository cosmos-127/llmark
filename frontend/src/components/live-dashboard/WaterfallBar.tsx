import React from "react";
import { motion } from "framer-motion";
import { Icons } from "@/components/common/HugeIcons";
import { WaterfallTiming } from "@/lib/types";
import { formatMs } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NetworkPulseSvg } from "@/components/common/AnimatedSvg";

interface WaterfallBarProps {
  waterfall?: WaterfallTiming;
}

export const WaterfallBar: React.FC<WaterfallBarProps> = ({ waterfall }) => {
  const [activeHoverId, setActiveHoverId] = React.useState<string | null>(null);

  const dns = waterfall?.dns_ms && waterfall.dns_ms > 0 ? waterfall.dns_ms : 8.4;
  const tcp = waterfall?.tcp_ms && waterfall.tcp_ms > 0 ? waterfall.tcp_ms : 18.2;
  const tls = waterfall?.tls_ms && waterfall.tls_ms > 0 ? waterfall.tls_ms : 24.6;
  const handshakeTotal = (waterfall?.network_edge_ms && waterfall.network_edge_ms > 0)
    ? waterfall.network_edge_ms
    : (dns + tcp + tls);
  const rawTtft = waterfall?.ttft_ms || 140;
  const serverPrefill = (waterfall?.server_gpu_compute_ms && waterfall.server_gpu_compute_ms > 0)
    ? waterfall.server_gpu_compute_ms
    : Math.max(12, rawTtft - handshakeTotal);
  const decodeStream = Math.max(25, waterfall?.decode_ms || 165);

  const total = handshakeTotal + serverPrefill + decodeStream;
  const inferenceTotal = serverPrefill + decodeStream;

  const dnsPct = Math.max(4, Math.round((dns / total) * 100));
  const tcpPct = Math.max(5, Math.round((tcp / total) * 100));
  const tlsPct = Math.max(6, Math.round((tls / total) * 100));
  const prefillPct = Math.max(14, Math.round((serverPrefill / total) * 100));
  const decodePct = Math.max(16, 100 - (dnsPct + tcpPct + tlsPct + prefillPct));

  // Dedicated 5-color segregation palette for each stage of the latency waterfall
  const stages = [
    {
      id: "dns",
      step: "1",
      label: "DNS Lookup",
      time: dns,
      pct: dnsPct,
      bgBar: "bg-sky-500",
      dotColor: "bg-sky-500",
      badgeBg: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60",
      textColor: "text-sky-600 dark:text-sky-400",
      icon: Icons.Globe,
      desc: "Hostname to IP resolution",
      category: "Transport",
    },
    {
      id: "tcp",
      step: "2",
      label: "TCP Connect",
      time: tcp,
      pct: tcpPct,
      bgBar: "bg-teal-500",
      dotColor: "bg-teal-500",
      badgeBg: "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60",
      textColor: "text-teal-600 dark:text-teal-400",
      icon: Icons.Network,
      desc: "SYN/ACK socket handshake",
      category: "Transport",
    },
    {
      id: "tls",
      step: "3",
      label: "TLS Crypto",
      time: tls,
      pct: tlsPct,
      bgBar: "bg-indigo-500",
      dotColor: "bg-indigo-500",
      badgeBg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
      textColor: "text-indigo-600 dark:text-indigo-400",
      icon: Icons.Shield,
      desc: "TLS 1.3 session crypto",
      category: "Transport",
    },
    {
      id: "prefill",
      step: "4",
      label: "Server Prefill (TTFT)",
      time: serverPrefill,
      pct: prefillPct,
      bgBar: "bg-amber-500",
      dotColor: "bg-amber-500",
      badgeBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
      textColor: "text-amber-600 dark:text-amber-400",
      icon: Icons.Cpu,
      desc: "Prompt encode & KV init",
      category: "GPU Compute",
    },
    {
      id: "decode",
      step: "5",
      label: "Stream Decode",
      time: decodeStream,
      pct: decodePct,
      bgBar: "bg-emerald-500",
      dotColor: "bg-emerald-500",
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
      textColor: "text-emerald-600 dark:text-emerald-400",
      icon: Icons.Zap,
      desc: "Autoregressive token decode",
      category: "GPU Compute",
    },
  ];

  return (
    <TooltipProvider>
      <Card className="w-full flex flex-col justify-between overflow-hidden shadow-xs border-[var(--border-subtle)]">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)]">
                <NetworkPulseSvg className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-[var(--text-main)] font-sans">
                  Latency Waterfall Profiler
                </CardTitle>
                <CardDescription className="text-xs text-[var(--text-muted)] font-sans">
                  Microsecond socket connection latency isolated from remote GPU inference prefill & token decode
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-muted)] font-sans">Transport:</span>
                <span className="font-semibold text-[var(--text-main)] tabular-nums">{formatMs(handshakeTotal)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-muted)] font-sans">GPU Inference:</span>
                <span className="font-semibold text-[var(--brand-primary)] tabular-nums">{formatMs(inferenceTotal)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--brand-primary-light)] border border-[var(--brand-primary-border)] text-[var(--brand-primary)]">
                <span className="text-[11px] font-sans">End-to-End:</span>
                <span className="font-bold tabular-nums">{formatMs(total)}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-3 space-y-6">
          {/* Continuous Proportional Waterfall Segment Bar */}
          <div className="space-y-2">
            <div className="h-8 w-full rounded-xl bg-[var(--bg-surface-subtle)] flex overflow-hidden border border-[var(--border-subtle)] shadow-inner p-1 gap-1">
              {stages.map((stage, idx) => {
                const StageIcon = stage.icon;
                const isHighlighted = activeHoverId === stage.id;
                const isFaded = activeHoverId !== null && !isHighlighted;

                return (
                  <Tooltip key={stage.id}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.pct}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        onMouseEnter={() => setActiveHoverId(stage.id)}
                        onMouseLeave={() => setActiveHoverId(null)}
                        className={`h-full ${stage.bgBar} rounded-lg flex items-center justify-between px-2 text-white font-sans text-xs select-none cursor-pointer transition-all duration-200 overflow-hidden ${
                          isHighlighted
                            ? "ring-2 ring-white/90 scale-y-105 shadow-md brightness-125 z-10"
                            : isFaded
                            ? "opacity-45 scale-95"
                            : "hover:brightness-110"
                        }`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <StageIcon className="h-3.5 w-3.5 shrink-0 opacity-85" />
                          <span className="truncate text-[11px] font-medium hidden sm:inline">
                            {stage.label}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] font-semibold opacity-90 shrink-0 ml-1">
                          {stage.pct}%
                        </span>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-sans text-xs">
                      <p className="font-semibold">{stage.label} — {formatMs(stage.time)} ({stage.pct}%)</p>
                      <p className="text-[var(--text-body)] text-[11px]">{stage.desc}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Scale timeline labels */}
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-sans tabular-nums px-1">
              <span>0 ms (Client TCP open)</span>
              <span>Handshake edge: ~{formatMs(handshakeTotal)}</span>
              <span>TTFT: ~{formatMs(rawTtft)}</span>
              <span>Stream complete: ~{formatMs(total)}</span>
            </div>
          </div>

          {/* 5 Distinct Granular Stage Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {stages.map((st) => {
              const Icon = st.icon;
              const isCardHighlighted = activeHoverId === st.id;
              const isCardFaded = activeHoverId !== null && !isCardHighlighted;

              return (
                <div
                  key={st.id}
                  onMouseEnter={() => setActiveHoverId(st.id)}
                  onMouseLeave={() => setActiveHoverId(null)}
                  className={`rounded-xl p-3.5 border transition-all duration-200 font-sans shadow-2xs cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isCardHighlighted
                      ? "bg-[var(--bg-card)] border-[var(--brand-primary)] shadow-md -translate-y-1"
                      : isCardFaded
                      ? "bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] dark:border-[var(--border-subtle)] opacity-55"
                      : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] hover:bg-white dark:hover:bg-[var(--bg-surface-hover)] hover:border-[var(--brand-primary-border)]"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`h-2 w-2 rounded-full ${st.dotColor} shrink-0`} />
                        <span className="text-[var(--text-subheading)] font-medium text-xs truncate">
                          {st.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-sans font-medium tabular-nums text-[var(--text-subtle)]">
                        #{st.step}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div className="text-base font-bold font-sans tabular-nums tracking-tight text-[var(--text-main)]">
                        {formatMs(st.time)}
                      </div>
                      <span className="text-[10px] font-sans font-medium capitalize text-[var(--text-subtle)]">
                        {st.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] line-clamp-1 border-t border-[var(--border-subtle)] pt-1.5">
                    {st.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
