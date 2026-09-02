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

  // Multi-shade progressive palette: Dark to Light Plum/Mulberry gradient progression
  const stages = [
    {
      id: "dns",
      step: "1",
      label: "DNS Lookup",
      time: dns,
      pct: dnsPct,
      bgBar: "bg-[#0F172A] dark:bg-[#0F172A]",
      dotColor: "bg-[#0F172A] dark:bg-[#1E3A8A]",
      badgeBg: "bg-[#0F172A]/10 dark:bg-[#0F172A]/40 text-[#0F172A] dark:text-[#BAE6FD] border-[#0F172A]/20 dark:border-[#BAE6FD]/30",
      textColor: "text-[#0F172A] dark:text-[#BAE6FD]",
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
      bgBar: "bg-[#1E3A8A] dark:bg-[#1D4ED8]",
      dotColor: "bg-[#1E3A8A] dark:bg-[#1D4ED8]",
      badgeBg: "bg-[#1E3A8A]/10 dark:bg-[#1D4ED8]/40 text-[#1E3A8A] dark:text-[#BAE6FD] border-[#1E3A8A]/20 dark:border-[#BAE6FD]/30",
      textColor: "text-[#1E3A8A] dark:text-[#BAE6FD]",
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
      bgBar: "bg-[#2563EB] dark:bg-[#3B82F6]",
      dotColor: "bg-[#2563EB] dark:bg-[#3B82F6]",
      badgeBg: "bg-[#2563EB]/10 dark:bg-[#3B82F6]/40 text-[#2563EB] dark:text-[#38BDF8] border-[#2563EB]/20 dark:border-[#60A5FA]/30",
      textColor: "text-[#2563EB] dark:text-[#38BDF8]",
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
      bgBar: "bg-[#3B82F6] dark:bg-[#60A5FA]",
      dotColor: "bg-[#3B82F6] dark:bg-[#60A5FA]",
      badgeBg: "bg-[#3B82F6]/10 dark:bg-[#60A5FA]/40 text-[#3B82F6] dark:text-[#60A5FA] border-[#3B82F6]/20 dark:border-[#3B82F6]/30",
      textColor: "text-[#3B82F6] dark:text-[#60A5FA]",
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
      bgBar: "bg-[#38BDF8] dark:bg-[#93C5FD]",
      dotColor: "bg-[#38BDF8] dark:bg-[#93C5FD]",
      badgeBg: "bg-[#38BDF8]/10 dark:bg-[#93C5FD]/40 text-[#2563EB] dark:text-white border-[#38BDF8]/20 dark:border-white/15",
      textColor: "text-[#2563EB] dark:text-white",
      icon: Icons.Zap,
      desc: "Autoregressive token decode",
      category: "GPU Compute",
    },
  ];

  return (
    <TooltipProvider>
      <Card className="w-full flex flex-col justify-between overflow-hidden shadow-xs border-[#0F172A]/10 dark:border-white/10">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 dark:border-[#3B82F6]/35">
                <NetworkPulseSvg className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-[#0F172A] dark:text-white font-sans">
                  Latency Waterfall Profiler
                </CardTitle>
                <CardDescription className="text-xs text-[#0F172A]/60 dark:text-slate-400 font-sans">
                  Microsecond socket connection latency isolated from remote GPU inference prefill & token decode
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F1F5F9] dark:bg-[#0F172A] border border-[#0F172A]/10 dark:border-white/10">
                <span className="text-[11px] text-[#0F172A]/60 dark:text-slate-400 font-sans">Transport:</span>
                <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">{formatMs(handshakeTotal)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F1F5F9] dark:bg-[#0F172A] border border-[#0F172A]/10 dark:border-white/10">
                <span className="text-[11px] text-[#0F172A]/60 dark:text-slate-400 font-sans">GPU Inference:</span>
                <span className="font-semibold text-[#2563EB] dark:text-[#60A5FA] tabular-nums">{formatMs(inferenceTotal)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 border border-[#2563EB]/20 dark:border-[#3B82F6]/30 text-[#2563EB] dark:text-[#60A5FA]">
                <span className="text-[11px] font-sans">End-to-End:</span>
                <span className="font-bold tabular-nums">{formatMs(total)}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-3 space-y-6">
          {/* Continuous Proportional Waterfall Segment Bar */}
          <div className="space-y-2">
            <div className="h-8 w-full rounded-xl bg-[#F1F5F9] dark:bg-[#0F172A] flex overflow-hidden border border-[#0F172A]/10 dark:border-white/10 shadow-inner p-1 gap-1">
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
                      <p className="text-[#0F172A]/70 dark:text-slate-300 text-[11px]">{stage.desc}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Scale timeline labels */}
            <div className="flex items-center justify-between text-[11px] text-[#0F172A]/60 dark:text-slate-400 font-sans tabular-nums px-1">
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
                      ? "bg-white dark:bg-[#111827] border-[#2563EB] dark:border-[#3B82F6] shadow-md -translate-y-1"
                      : isCardFaded
                      ? "bg-[#F1F5F9]/50 dark:bg-[#0F172A]/50 border-[#0F172A]/5 dark:border-white/5 opacity-55"
                      : "bg-[#F1F5F9]/80 dark:bg-[#0F172A] border-[#0F172A]/10 dark:border-white/10 hover:bg-white dark:hover:bg-[#1E293B] hover:border-[#2563EB]/35 dark:hover:border-[#3B82F6]/40"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`h-2 w-2 rounded-full ${st.dotColor} shrink-0`} />
                        <span className="text-[#0F172A]/80 dark:text-slate-200 font-medium text-xs truncate">
                          {st.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-sans font-medium tabular-nums text-[#0F172A]/50 dark:text-slate-400">
                        #{st.step}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div className="text-base font-bold font-sans tabular-nums tracking-tight text-[#0F172A] dark:text-white">
                        {formatMs(st.time)}
                      </div>
                      <span className="text-[10px] font-sans font-medium capitalize text-[#0F172A]/50 dark:text-slate-400">
                        {st.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#0F172A]/60 dark:text-slate-400 line-clamp-1 border-t border-[#0F172A]/5 dark:border-white/[0.06] pt-1.5">
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
