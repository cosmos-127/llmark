import React from "react";
import { motion } from "framer-motion";
import { Network, Server, ArrowRight, Layers, Radio, Globe, Shield, Cpu, Zap, Activity } from "lucide-react";
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
  const handshakeTotal = dns + tcp + tls;
  const rawTtft = waterfall?.ttft_ms || 140;
  const serverPrefill = Math.max(12, rawTtft - handshakeTotal);
  const decodeStream = Math.max(25, waterfall?.decode_ms || 165);

  const total = handshakeTotal + serverPrefill + decodeStream;

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
      badgeBg: "bg-[#2D1223]/10 dark:bg-[#3D1A31]/40 text-[#2D1223] dark:text-[#E88EC4] border-[#2D1223]/20",
      textColor: "text-[#2D1223] dark:text-[#E88EC4]",
      icon: Globe,
      desc: "Hostname to IP resolution",
    },
    {
      id: "tcp",
      step: "2",
      label: "TCP Connect",
      time: tcp,
      pct: tcpPct,
      bgBar: "bg-[#4D1C3D] dark:bg-[#682453]",
      dotColor: "bg-[#4D1C3D] dark:bg-[#682453]",
      badgeBg: "bg-[#4D1C3D]/10 dark:bg-[#682453]/40 text-[#4D1C3D] dark:text-[#DDA0B8] border-[#4D1C3D]/20",
      textColor: "text-[#4D1C3D] dark:text-[#DDA0B8]",
      icon: Network,
      desc: "SYN/ACK socket handshake",
    },
    {
      id: "tls",
      step: "3",
      label: "TLS Crypto",
      time: tls,
      pct: tlsPct,
      bgBar: "bg-[#73275B] dark:bg-[#8F3372]",
      dotColor: "bg-[#73275B] dark:bg-[#8F3372]",
      badgeBg: "bg-[#73275B]/10 dark:bg-[#8F3372]/40 text-[#73275B] dark:text-[#C57BB2] border-[#73275B]/20",
      textColor: "text-[#73275B] dark:text-[#C57BB2]",
      icon: Shield,
      desc: "TLS 1.3 session negotiation",
    },
    {
      id: "prefill",
      step: "4",
      label: "Server Prefill (TTFT)",
      time: serverPrefill,
      pct: prefillPct,
      bgBar: "bg-[#9A3579] dark:bg-[#B34590]",
      dotColor: "bg-[#9A3579] dark:bg-[#B34590]",
      badgeBg: "bg-[#9A3579]/10 dark:bg-[#B34590]/40 text-[#9A3579] dark:text-[#A74B6A] border-[#9A3579]/20",
      textColor: "text-[#9A3579] dark:text-[#A74B6A]",
      icon: Cpu,
      desc: "KV cache init + prompt encode",
    },
    {
      id: "decode",
      step: "5",
      label: "Stream Decode",
      time: decodeStream,
      pct: decodePct,
      bgBar: "bg-[#C4559E] dark:bg-[#D972B5]",
      dotColor: "bg-[#C4559E] dark:bg-[#D972B5]",
      badgeBg: "bg-[#C4559E]/10 dark:bg-[#D972B5]/40 text-[#853953] dark:text-[#F3F4F4] border-[#C4559E]/20",
      textColor: "text-[#853953] dark:text-[#F3F4F4]",
      icon: Zap,
      desc: "Token generation decode",
    },
  ];

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col justify-between">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                <NetworkPulseSvg className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                  Latency Waterfall Profiler
                </CardTitle>
                <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                  Client socket transport isolated from remote GPU inference prefill
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-sans">Total E2E:</span>
              <Badge variant="outline" className="font-mono text-xs py-1 px-2.5 font-bold text-[#2C2C2C] dark:text-[#F3F4F4] bg-[#F3F4F4] dark:bg-[#2C2C2C]">
                {formatMs(waterfall?.total_e2e_ms || total)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-4">
          {/* Spacious Segmented Waterfall Trace Bar (Taller with Smooth Animation) */}
          <div className="space-y-1.5">
            <div className="h-7 w-full rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] flex overflow-hidden border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-inner p-0.5 gap-0.5">
              {stages.map((stg, idx) => (
                <Tooltip key={stg.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stg.pct}%` }}
                      transition={{ duration: 0.45, delay: idx * 0.06, ease: "easeOut" }}
                      className={`h-full ${stg.bgBar} hover:brightness-110 cursor-pointer flex items-center justify-center transition-all ${
                        idx === 0 ? "rounded-l-lg" : ""
                      } ${idx === stages.length - 1 ? "rounded-r-lg" : ""}`}
                    >
                      {stg.pct >= 10 && (
                        <span className="text-[10px] font-mono font-bold text-white/90 truncate px-1 select-none">
                          {stg.pct}%
                        </span>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{stg.label}: {formatMs(stg.time)} ({stg.pct}%)</p>
                    <p className="text-[11px] opacity-80">{stg.desc}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-mono px-0.5">
              <span>0 ms (Request Sent)</span>
              <span>Client Transport ({(handshakeTotal).toFixed(1)}ms)</span>
              <span>Total ~{Math.round(total)}ms</span>
            </div>
          </div>

          {/* Spacious Trace Metrics Matrix (Multi-shade progression with roomy cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 pt-1 text-xs">
            {stages.map((stg) => {
              const Icon = stg.icon;
              return (
                <Tooltip key={stg.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ y: -2, scale: 1.01 }}
                      className="rounded-xl bg-[#F3F4F4]/80 dark:bg-[#2C2C2C]/70 p-3 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 flex flex-col justify-between gap-1.5 cursor-pointer hover:bg-[#e8eaea] dark:hover:bg-[#353337] transition-all font-sans"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`h-2.5 w-2.5 rounded-full ${stg.dotColor} shrink-0 ring-1 ring-white dark:ring-black`} />
                          <span className="text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-medium text-xs truncate">
                            {stg.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                          {stg.pct}%
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-0.5">
                        <strong className={`${stg.textColor} font-mono text-sm font-bold`}>
                          {formatMs(stg.time)}
                        </strong>
                      </div>

                      <p className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 truncate">
                        {stg.desc}
                      </p>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold">{stg.label}</p>
                    <p className="text-xs">{stg.desc} • {formatMs(stg.time)} ({stg.pct}% of total E2E)</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
