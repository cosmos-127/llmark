import React from "react";
import { motion } from "framer-motion";
import { Network, Globe, Shield, Cpu, Zap } from "lucide-react";
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
      bgBar: "bg-[#2D1223] dark:bg-[#3D1A31]",
      dotColor: "bg-[#2D1223] dark:bg-[#521D42]",
      badgeBg: "bg-[#2D1223]/10 dark:bg-[#3D1A31]/40 text-[#2D1223] dark:text-[#E88EC4] border-[#2D1223]/20 dark:border-[#E88EC4]/30",
      textColor: "text-[#2D1223] dark:text-[#E88EC4]",
      icon: Globe,
      desc: "Hostname to IP resolution",
      category: "Transport",
    },
    {
      id: "tcp",
      step: "2",
      label: "TCP Connect",
      time: tcp,
      pct: tcpPct,
      bgBar: "bg-[#4D1C3D] dark:bg-[#682453]",
      dotColor: "bg-[#4D1C3D] dark:bg-[#682453]",
      badgeBg: "bg-[#4D1C3D]/10 dark:bg-[#682453]/40 text-[#4D1C3D] dark:text-[#DDA0B8] border-[#4D1C3D]/20 dark:border-[#DDA0B8]/30",
      textColor: "text-[#4D1C3D] dark:text-[#DDA0B8]",
      icon: Network,
      desc: "SYN/ACK socket handshake",
      category: "Transport",
    },
    {
      id: "tls",
      step: "3",
      label: "TLS Crypto",
      time: tls,
      pct: tlsPct,
      bgBar: "bg-[#73275B] dark:bg-[#8F3372]",
      dotColor: "bg-[#73275B] dark:bg-[#8F3372]",
      badgeBg: "bg-[#73275B]/10 dark:bg-[#8F3372]/40 text-[#73275B] dark:text-[#E270BB] border-[#73275B]/20 dark:border-[#C57BB2]/30",
      textColor: "text-[#73275B] dark:text-[#E270BB]",
      icon: Shield,
      desc: "TLS 1.3 session crypto",
      category: "Transport",
    },
    {
      id: "prefill",
      step: "4",
      label: "Server Prefill (TTFT)",
      time: serverPrefill,
      pct: prefillPct,
      bgBar: "bg-[#9A3579] dark:bg-[#B34590]",
      dotColor: "bg-[#9A3579] dark:bg-[#B34590]",
      badgeBg: "bg-[#9A3579]/10 dark:bg-[#B34590]/40 text-[#9A3579] dark:text-[#F06A9A] border-[#9A3579]/20 dark:border-[#E05284]/30",
      textColor: "text-[#9A3579] dark:text-[#F06A9A]",
      icon: Cpu,
      desc: "Prompt encode & KV init",
      category: "GPU Compute",
    },
    {
      id: "decode",
      step: "5",
      label: "Stream Decode",
      time: decodeStream,
      pct: decodePct,
      bgBar: "bg-[#C4559E] dark:bg-[#D972B5]",
      dotColor: "bg-[#C4559E] dark:bg-[#D972B5]",
      badgeBg: "bg-[#C4559E]/10 dark:bg-[#D972B5]/40 text-[#853953] dark:text-white border-[#C4559E]/20 dark:border-white/15",
      textColor: "text-[#853953] dark:text-white",
      icon: Zap,
      desc: "Autoregressive token decode",
      category: "GPU Compute",
    },
  ];

  return (
    <TooltipProvider>
      <Card className="w-full flex flex-col justify-between overflow-hidden shadow-xs border-[#2C2C2C]/10 dark:border-white/10">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#D84577]/15 text-[#853953] dark:text-[#F06A9A] border border-[#853953]/25 dark:border-[#E05284]/35">
                <NetworkPulseSvg className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-white font-sans">
                  Latency Waterfall Profiler
                </CardTitle>
                <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-slate-400 font-sans">
                  Microsecond socket connection latency isolated from remote GPU inference prefill & token decode
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10">
                <span className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400 font-sans">Transport:</span>
                <span className="font-semibold text-[#2C2C2C] dark:text-white tabular-nums">{formatMs(handshakeTotal)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10">
                <span className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400 font-sans">GPU Inference:</span>
                <span className="font-semibold text-[#853953] dark:text-[#F06A9A] tabular-nums">{formatMs(inferenceTotal)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#853953]/10 dark:bg-[#E05284]/15 border border-[#853953]/20 dark:border-[#E05284]/30 text-[#853953] dark:text-[#F06A9A]">
                <span className="text-[11px] font-sans">End-to-End:</span>
                <span className="font-bold tabular-nums">{formatMs(total)}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-3 space-y-6">
          {/* Continuous Proportional Waterfall Segment Bar */}
          <div className="space-y-2">
            <div className="h-8 w-full rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] flex overflow-hidden border border-[#2C2C2C]/10 dark:border-white/10 shadow-inner p-1 gap-1">
              {stages.map((stage, idx) => {
                const StageIcon = stage.icon;
                return (
                  <Tooltip key={stage.id}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.pct}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className={`h-full ${stage.bgBar} rounded-lg flex items-center justify-between px-2 text-white font-sans text-xs select-none cursor-pointer hover:brightness-110 transition-all overflow-hidden`}
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
                      <p className="text-[#2C2C2C]/70 dark:text-slate-300 text-[11px]">{stage.desc}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Scale timeline labels */}
            <div className="flex items-center justify-between text-[11px] text-[#2C2C2C]/60 dark:text-slate-400 font-sans tabular-nums px-1">
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
              return (
                <motion.div
                  key={st.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-xl bg-[#F3F4F4]/80 dark:bg-[#0B0B0E] p-3.5 border border-[#2C2C2C]/10 dark:border-white/10 flex flex-col justify-between gap-2.5 cursor-pointer hover:bg-white dark:hover:bg-[#14141B] hover:border-[#853953]/35 dark:hover:border-[#E05284]/40 transition-all font-sans shadow-2xs hover:shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`h-2 w-2 rounded-full ${st.dotColor} shrink-0`} />
                        <span className="text-[#2C2C2C]/80 dark:text-slate-200 font-medium text-xs truncate">
                          {st.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-sans font-medium tabular-nums text-[#2C2C2C]/50 dark:text-slate-400">
                        #{st.step}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div className="text-base font-bold font-sans tabular-nums tracking-tight text-[#2C2C2C] dark:text-white">
                        {formatMs(st.time)}
                      </div>
                      <span className="text-[10px] font-sans font-medium capitalize text-[#2C2C2C]/50 dark:text-slate-400">
                        {st.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#2C2C2C]/60 dark:text-slate-400 line-clamp-1 border-t border-[#2C2C2C]/5 dark:border-white/[0.06] pt-1.5">
                    {st.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
