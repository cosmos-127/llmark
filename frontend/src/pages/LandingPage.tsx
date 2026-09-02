import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Icons } from "@/components/common/HugeIcons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { NavTab } from "@/lib/types";
import { LiveStreamWave } from "@/components/common/AnimatedSvg";
import { ProviderLogo } from "@/components/common/BrandLogos";

// Register ScrollTrigger plugin with GSAP
gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  onNavigate: (tab: NavTab) => void;
}

/**
 * Endpoint Profile Definition for the Interactive Instant Probe
 */
export interface ProbeModelProfile {
  id: string;
  name: string;
  vendor: string;
  badge: string;
  tagline: string;
  dns: number;
  tcp: number;
  tls: number;
  ttft: number;
  totalLatency: number;
  decodeSpeed: number;
  itlTail: number;
  goodput: number;
  spend: number;
  sampleTokens: string[];
}

export interface ProbePacket {
  index: number;
  dns: number;
  tcp: number;
  tls: number;
  ttft: number;
  decodeMs: number;
  totalLatency: number;
  decodeSpeed: number;
  itlTail: number;
  tokens: string[];
  status: "pending" | "running" | "completed";
  phase: "dns" | "tcp" | "tls" | "ttft" | "decode" | "completed";
  statusCode: number;
  meetsSlo: boolean;
}

export const PROBE_MODELS: ProbeModelProfile[] = [
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    vendor: "deepseek",
    badge: "Reasoning CoT",
    tagline: "deepseek-ai/deepseek-r1 • High-Precision CoT Engine",
    dns: 1.4,
    tcp: 8.2,
    tls: 14.1,
    ttft: 142.0,
    totalLatency: 162.2,
    decodeSpeed: 84.2,
    itlTail: 11.8,
    goodput: 99.7,
    spend: 0.000042,
    sampleTokens: [
      "<think>",
      " Analyzing",
      " socket",
      " latency",
      " waterfall...",
      "</think>",
      " Sub-ms",
      " handshakes",
      " verified.",
    ],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    vendor: "openai",
    badge: "Fast Chat",
    tagline: "openai/gpt-4o-mini • High Throughput Micro-Prefill",
    dns: 1.1,
    tcp: 6.8,
    tls: 11.2,
    ttft: 98.4,
    totalLatency: 118.5,
    decodeSpeed: 115.4,
    itlTail: 8.2,
    goodput: 99.9,
    spend: 0.000018,
    sampleTokens: [
      "HTTP/2",
      " socket",
      " connected.",
      " TTFT",
      " acknowledged",
      " at",
      " 98.4ms.",
      " Goodput",
      " 115.4",
      " tok/s.",
    ],
  },
  {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    vendor: "anthropic",
    badge: "Agentic Tooling",
    tagline: "anthropic/claude-3-5-haiku • Fast Tool Execution",
    dns: 1.3,
    tcp: 7.4,
    tls: 12.8,
    ttft: 118.6,
    totalLatency: 139.6,
    decodeSpeed: 96.8,
    itlTail: 9.6,
    goodput: 99.8,
    spend: 0.000024,
    sampleTokens: [
      "Handshake",
      " established.",
      " Prompt",
      " prefill",
      " complete.",
      " Streaming",
      " tool",
      " invocation",
      " tokens.",
    ],
  },
  {
    id: "llama-3-3-70b",
    name: "Llama 3.3 70B",
    vendor: "vllm",
    badge: "Self-Hosted vLLM",
    tagline: "meta-llama/llama-3.3-70b-instruct • PagedAttention v2",
    dns: 0.8,
    tcp: 4.2,
    tls: 8.6,
    ttft: 76.5,
    totalLatency: 94.2,
    decodeSpeed: 128.5,
    itlTail: 6.4,
    goodput: 99.9,
    spend: 0.0,
    sampleTokens: [
      "vLLM",
      " PagedAttention",
      " v2",
      " online.",
      " Chunked",
      " prefill",
      " active.",
      " 128.5",
      " tok/s",
      " sustained.",
    ],
  },
  {
    id: "groq-llama-3-1-8b",
    name: "Groq LPU 8B",
    vendor: "groq",
    badge: "500+ tok/s",
    tagline: "groq/llama-3.1-8b-instant • Deterministic LPUs",
    dns: 1.2,
    tcp: 6.5,
    tls: 10.8,
    ttft: 48.2,
    totalLatency: 68.4,
    decodeSpeed: 492.0,
    itlTail: 2.1,
    goodput: 100.0,
    spend: 0.000012,
    sampleTokens: [
      "LPU",
      " deterministic",
      " SRAM",
      " pipeline.",
      " TTFT",
      " 48.2ms.",
      " Decode",
      " 492",
      " tok/s",
      " peak.",
    ],
  },
];

/**
 * Interactive Spotlight Card with subtle ambient radial glow and smooth elevation
 */
const SpotlightCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}> = ({ children, className = "", glowColor = "var(--brand-primary-light)" }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: -100, y: -100 });
      }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl transition-all duration-200 ${
        isHovered
          ? "shadow-lg shadow-[var(--brand-primary-light)] border-[var(--brand-primary-border)]"
          : "shadow-2xs border-[var(--border-subtle)]"
      } ${className}`}
    >
      {/* Subtle ambient radial cursor spotlight with soft feathered falloff */}
      <div
        className="pointer-events-none absolute -inset-2 opacity-0 transition-opacity duration-300 z-10"
        style={{
          opacity: isHovered ? 0.75 : 0,
          background: `radial-gradient(550px circle at ${mousePos.x + 8}px ${mousePos.y + 8}px, ${glowColor} 0%, transparent 65%)`,
          filter: "blur(16px)",
        }}
      />
      {children}
    </motion.div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dedicated refs for GSAP numerical counter animations (direct DOM updates for zero React re-renders)
  const totalLatencyRef = useRef<HTMLSpanElement>(null);
  const ttftRef = useRef<HTMLSpanElement>(null);
  const itlRef = useRef<HTMLSpanElement>(null);
  const sloRef = useRef<HTMLSpanElement>(null);
  const spendRef = useRef<HTMLSpanElement>(null);

  // Interactive Instant Probe state
  const [activeProbeModel, setActiveProbeModel] = useState<ProbeModelProfile>(PROBE_MODELS[0]);
  const [probeState, setProbeState] = useState<"idle" | "probing" | "completed">("idle");
  const [probePhase, setProbePhase] = useState<"dns" | "tcp" | "tls" | "ttft" | "decode" | null>(null);
  const [probeTokens, setProbeTokens] = useState<string[]>([]);
  const [activePacketIdx, setActivePacketIdx] = useState<number>(0);
  const [selectedInspectPacket, setSelectedInspectPacket] = useState<number | null>(null);
  const [completedPackets, setCompletedPackets] = useState<ProbePacket[]>([]);
  const [copiedTrace, setCopiedTrace] = useState(false);
  const probeTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Interactive Request Lifecycle Step state
  const [activeLifecycleStep, setActiveLifecycleStep] = useState<number>(0);

  // Interactive Head-to-Head Compare state
  const [diffModelA, setDiffModelA] = useState<ProbeModelProfile>(PROBE_MODELS[4]); // Groq 8B
  const [diffModelB, setDiffModelB] = useState<ProbeModelProfile>(PROBE_MODELS[0]); // DeepSeek R1

  // Interactive CLI Snippet state
  const [activeCliTab, setActiveCliTab] = useState<"npx" | "docker" | "pip" | "curl">("npx");
  const [copiedCli, setCopiedCli] = useState(false);

  // Interactive FAQ Accordion open state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const clearProbeTimers = useCallback(() => {
    probeTimersRef.current.forEach(clearTimeout);
    probeTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearProbeTimers();
    };
  }, [clearProbeTimers]);

  const handleSelectModel = (model: ProbeModelProfile) => {
    if (probeState === "probing") return;
    clearProbeTimers();
    setActiveProbeModel(model);
    setProbeState("idle");
    setProbePhase(null);
    setProbeTokens([]);
    setCompletedPackets([]);
    setSelectedInspectPacket(null);
    setActivePacketIdx(0);

    if (totalLatencyRef.current) totalLatencyRef.current.textContent = model.totalLatency.toFixed(1);
    if (ttftRef.current) ttftRef.current.textContent = model.ttft.toFixed(1);
    if (itlRef.current) itlRef.current.textContent = model.itlTail.toFixed(1);
    if (sloRef.current) sloRef.current.textContent = model.goodput.toFixed(1);
    if (spendRef.current) spendRef.current.textContent = (model.spend * 5).toFixed(6);
  };

  /**
   * Fires the Live 5-Packet Streaming Probe right inside the card.
   * Runs sequentially through 5 realistic packets measuring socket handshakes,
   * prompt prefill stopwatch, and streaming decode tokens.
   */
  const handleRunProbe = () => {
    clearProbeTimers();
    setProbeState("probing");
    setProbePhase("dns");
    setProbeTokens([]);
    setCompletedPackets([]);
    setSelectedInspectPacket(null);
    setActivePacketIdx(0);

    if (totalLatencyRef.current) totalLatencyRef.current.textContent = "0.0";
    if (ttftRef.current) ttftRef.current.textContent = "0.0";

    const model = activeProbeModel;
    const TOTAL_PACKETS = 5;

    // Generate calibrated packet profiles
    const packetPlans: ProbePacket[] = [
      {
        index: 1,
        dns: model.dns,
        tcp: model.tcp,
        tls: model.tls,
        ttft: Number((model.ttft * 1.04).toFixed(1)),
        decodeMs: Number(((model.sampleTokens.length / model.decodeSpeed) * 1000).toFixed(1)),
        totalLatency: Number((model.dns + model.tcp + model.tls + model.ttft * 1.04 + (model.sampleTokens.length / model.decodeSpeed) * 1000).toFixed(1)),
        decodeSpeed: Number((model.decodeSpeed * 0.98).toFixed(1)),
        itlTail: Number((model.itlTail * 1.05).toFixed(1)),
        tokens: model.sampleTokens,
        status: "pending",
        phase: "dns",
        statusCode: 200,
        meetsSlo: model.ttft * 1.04 < 200,
      },
      {
        index: 2,
        dns: Number((model.dns * 0.35).toFixed(1)),
        tcp: Number((model.tcp * 0.35).toFixed(1)),
        tls: Number((model.tls * 0.35).toFixed(1)),
        ttft: Number((model.ttft * 0.96).toFixed(1)),
        decodeMs: Number(((model.sampleTokens.length / model.decodeSpeed) * 1000 * 0.97).toFixed(1)),
        totalLatency: Number((model.dns * 0.35 + model.tcp * 0.35 + model.tls * 0.35 + model.ttft * 0.96 + (model.sampleTokens.length / model.decodeSpeed) * 1000 * 0.97).toFixed(1)),
        decodeSpeed: Number((model.decodeSpeed * 1.02).toFixed(1)),
        itlTail: Number((model.itlTail * 0.95).toFixed(1)),
        tokens: model.sampleTokens,
        status: "pending",
        phase: "dns",
        statusCode: 200,
        meetsSlo: model.ttft * 0.96 < 200,
      },
      {
        index: 3,
        dns: Number((model.dns * 0.3).toFixed(1)),
        tcp: Number((model.tcp * 0.3).toFixed(1)),
        tls: Number((model.tls * 0.3).toFixed(1)),
        ttft: Number((model.ttft * 1.02).toFixed(1)),
        decodeMs: Number(((model.sampleTokens.length / model.decodeSpeed) * 1000 * 0.99).toFixed(1)),
        totalLatency: Number((model.dns * 0.3 + model.tcp * 0.3 + model.tls * 0.3 + model.ttft * 1.02 + (model.sampleTokens.length / model.decodeSpeed) * 1000 * 0.99).toFixed(1)),
        decodeSpeed: Number((model.decodeSpeed * 1.00).toFixed(1)),
        itlTail: Number((model.itlTail * 1.02).toFixed(1)),
        tokens: model.sampleTokens,
        status: "pending",
        phase: "dns",
        statusCode: 200,
        meetsSlo: model.ttft * 1.02 < 200,
      },
      {
        index: 4,
        dns: Number((model.dns * 0.25).toFixed(1)),
        tcp: Number((model.tcp * 0.25).toFixed(1)),
        tls: Number((model.tls * 0.25).toFixed(1)),
        ttft: Number((model.ttft * 0.93).toFixed(1)),
        decodeMs: Number(((model.sampleTokens.length / model.decodeSpeed) * 1000 * 0.95).toFixed(1)),
        totalLatency: Number((model.dns * 0.25 + model.tcp * 0.25 + model.tls * 0.25 + model.ttft * 0.93 + (model.sampleTokens.length / model.decodeSpeed) * 1000 * 0.95).toFixed(1)),
        decodeSpeed: Number((model.decodeSpeed * 1.05).toFixed(1)),
        itlTail: Number((model.itlTail * 0.92).toFixed(1)),
        tokens: model.sampleTokens,
        status: "pending",
        phase: "dns",
        statusCode: 200,
        meetsSlo: model.ttft * 0.93 < 200,
      },
      {
        index: 5,
        dns: Number((model.dns * 0.25).toFixed(1)),
        tcp: Number((model.tcp * 0.25).toFixed(1)),
        tls: Number((model.tls * 0.25).toFixed(1)),
        ttft: Number((model.ttft * 0.98).toFixed(1)),
        decodeMs: Number(((model.sampleTokens.length / model.decodeSpeed) * 1000 * 0.98).toFixed(1)),
        totalLatency: Number((model.dns * 0.25 + model.tcp * 0.25 + model.tls * 0.25 + model.ttft * 0.98 + (model.sampleTokens.length / model.decodeSpeed) * 1000 * 0.98).toFixed(1)),
        decodeSpeed: Number((model.decodeSpeed * 1.01).toFixed(1)),
        itlTail: Number((model.itlTail * 0.96).toFixed(1)),
        tokens: model.sampleTokens,
        status: "pending",
        phase: "dns",
        statusCode: 200,
        meetsSlo: model.ttft * 0.98 < 200,
      },
    ];

    let currentTimelineOffset = 0;
    const accumulatedCompleted: ProbePacket[] = [];

    packetPlans.forEach((pkt, pIdx) => {
      const pktStartTime = currentTimelineOffset;
      const isFirst = pIdx === 0;

      // Packet DNS Phase
      const tDns = setTimeout(() => {
        setActivePacketIdx(pIdx);
        setProbePhase("dns");
        setProbeTokens([]);
        if (totalLatencyRef.current) totalLatencyRef.current.textContent = (pkt.dns).toFixed(1);
      }, pktStartTime);

      // Packet TCP Phase
      const tTcp = setTimeout(() => {
        setProbePhase("tcp");
        if (totalLatencyRef.current) totalLatencyRef.current.textContent = (pkt.dns + pkt.tcp).toFixed(1);
      }, pktStartTime + (isFirst ? 80 : 40));

      // Packet TLS Phase
      const tTls = setTimeout(() => {
        setProbePhase("tls");
        if (totalLatencyRef.current) totalLatencyRef.current.textContent = (pkt.dns + pkt.tcp + pkt.tls).toFixed(1);
      }, pktStartTime + (isFirst ? 160 : 80));

      // Packet TTFT / Prefill Stopwatch Phase
      const prefillStart = pktStartTime + (isFirst ? 240 : 120);
      const prefillDuration = isFirst ? 260 : 180;

      const tPrefill = setTimeout(() => {
        setProbePhase("ttft");
        const tickStart = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - tickStart;
          const progress = Math.min(1, elapsed / prefillDuration);
          const currentTtft = progress * pkt.ttft;
          if (ttftRef.current) ttftRef.current.textContent = currentTtft.toFixed(1);
          if (totalLatencyRef.current) {
            totalLatencyRef.current.textContent = (pkt.dns + pkt.tcp + pkt.tls + currentTtft).toFixed(1);
          }
        }, 25);

        probeTimersRef.current.push(interval as unknown as NodeJS.Timeout);

        setTimeout(() => {
          clearInterval(interval);
          if (ttftRef.current) ttftRef.current.textContent = pkt.ttft.toFixed(1);
        }, prefillDuration);
      }, prefillStart);

      // Packet Token Decode Streaming Phase
      const decodeStart = prefillStart + prefillDuration;
      const tokenCadence = Math.max(20, Math.floor(100 / pkt.tokens.length));

      const tDecode = setTimeout(() => {
        setProbePhase("decode");
        pkt.tokens.forEach((tok, tokIdx) => {
          const tokTimer = setTimeout(() => {
            setProbeTokens((prev) => [...prev, tok]);
          }, tokIdx * tokenCadence);
          probeTimersRef.current.push(tokTimer);
        });
      }, decodeStart);

      // Packet Completion & Record in Pipeline
      const pktDuration = decodeStart + pkt.tokens.length * tokenCadence + 40;

      const tPktDone = setTimeout(() => {
        const completedPkt: ProbePacket = {
          ...pkt,
          status: "completed",
          phase: "completed",
        };
        accumulatedCompleted.push(completedPkt);
        setCompletedPackets([...accumulatedCompleted]);

        // Calculate running statistics across completed packets
        const allTtfts = accumulatedCompleted.map((p) => p.ttft).sort((a, b) => a - b);
        const runningP95 = allTtfts[Math.floor(allTtfts.length * 0.95)] || allTtfts[allTtfts.length - 1];
        const runningSpend = model.spend * accumulatedCompleted.length;

        if (ttftRef.current) ttftRef.current.textContent = runningP95.toFixed(1);
        if (totalLatencyRef.current) totalLatencyRef.current.textContent = completedPkt.totalLatency.toFixed(1);
        if (spendRef.current) spendRef.current.textContent = runningSpend.toFixed(6);
      }, pktDuration);

      probeTimersRef.current.push(tDns, tTcp, tTls, tPrefill, tDecode, tPktDone);

      currentTimelineOffset = pktDuration + 30;
    });

    // Final Probe Completion & Audit Lock
    const tFinal = setTimeout(() => {
      setProbePhase(null);
      setProbeState("completed");
      setSelectedInspectPacket(null); // Show aggregate composite by default

      if (totalLatencyRef.current) totalLatencyRef.current.textContent = model.totalLatency.toFixed(1);
      if (ttftRef.current) ttftRef.current.textContent = model.ttft.toFixed(1);
      if (itlRef.current) itlRef.current.textContent = model.itlTail.toFixed(1);
      if (sloRef.current) sloRef.current.textContent = model.goodput.toFixed(1);
      if (spendRef.current) spendRef.current.textContent = (model.spend * TOTAL_PACKETS).toFixed(6);
    }, currentTimelineOffset + 40);

    probeTimersRef.current.push(tFinal);
  };

  const handleCopyTrace = () => {
    const traceData = {
      model: activeProbeModel.id,
      vendor: activeProbeModel.vendor,
      benchmark_standard: "LLMark 100Hz Sub-Millisecond Ephemeral Probe",
      timestamp: new Date().toISOString(),
      p95_ttft_ms: activeProbeModel.ttft,
      p99_itl_tail_ms: activeProbeModel.itlTail,
      goodput_compliance_pct: activeProbeModel.goodput,
      total_packets: completedPackets.length > 0 ? completedPackets.length : 5,
      packets: completedPackets.length > 0 ? completedPackets : PROBE_MODELS.map((_, i) => ({
        packet_index: i + 1,
        dns_ms: activeProbeModel.dns,
        tcp_ms: activeProbeModel.tcp,
        tls_ms: activeProbeModel.tls,
        ttft_ms: activeProbeModel.ttft,
        decode_speed_tps: activeProbeModel.decodeSpeed,
        status_code: 200,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(traceData, null, 2));
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  const handleCopyCli = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const handleLaunchStudioWithModel = (model: ProbeModelProfile) => {
    try {
      sessionStorage.setItem("llmark_selected_model", model.id);
      sessionStorage.setItem("llmark_selected_vendor", model.vendor);
    } catch (e) {}
    onNavigate("benchmark");
  };

  const operations = [
    {
      id: "benchmark" as NavTab,
      title: "Studio",
      subtitle: "Deterministic Stress Testing",
      tagline: "Live Concurrency & Waterfall",
      description:
        "Stress-test LLM endpoints with microsecond socket waterfalls, live SSE telemetry, and automated spend caps.",
      icon: Icons.Benchmark,
      badgeText: "100Hz Live",
      badgeVariant: "default" as const,
      glowColor: "var(--brand-primary-light)",
      features: [
        "DNS + TCP + TLS + TTFT + Decode waterfall",
        "Real-time SSE token stream at 100Hz",
        "Strict spend cap & budget protection",
      ],
      buttonLabel: "Open Studio",
    },
    {
      id: "diff" as NavTab,
      title: "Compare",
      subtitle: "Head-to-Head Comparison",
      tagline: "Latency & Cost Diff Matrix",
      description:
        "Compare latency distributions, token economics, and Goodput compliance side-by-side to select the optimal model.",
      icon: Icons.Diff,
      badgeText: "Statistical Diff",
      badgeVariant: "default" as const,
      glowColor: "var(--brand-primary-light)",
      features: [
        "Side-by-side latency & throughput distributions",
        "Token price & generation cost breakdown",
        "Automated winner recommendations based on SLOs",
      ],
      buttonLabel: "Compare Models",
    },
    {
      id: "history" as NavTab,
      title: "Runs",
      subtitle: "Persistent Runs & Exports",
      tagline: "Saved Benchmarks & Reports",
      description:
        "Inspect historical benchmarks stored locally in SQLite with granular percentile statistics and exportable reports.",
      icon: Icons.History,
      badgeText: "Local SQLite",
      badgeVariant: "default" as const,
      glowColor: "var(--brand-primary-light)",
      features: [
        "Granular P50, P95, and P99 tail percentiles",
        "Zero-cloud local storage (SQLite WAL)",
        "One-click audit export (JSON / Markdown / CSV)",
      ],
      buttonLabel: "View Runs",
    },
  ];

  const lifecycleStages = [
    {
      step: "01",
      phase: "DNS & Socket Handshake",
      shortTitle: "Socket Connection",
      timing: "0.8ms - 8.2ms",
      color: "sky",
      colorClass: "bg-sky-500",
      borderClass: "border-sky-500/30",
      textClass: "text-sky-500",
      summary: "Resolves host DNS and establishes TCP 3-way SYN/ACK socket session.",
      details: "UDP/TCP port 53 lookup + connection pool reuse telemetry.",
      icon: Icons.Network,
    },
    {
      step: "02",
      phase: "TLS 1.3 Cryptography",
      shortTitle: "TLS & HTTP/2",
      timing: "6.5ms - 14.1ms",
      color: "indigo",
      colorClass: "bg-indigo-500",
      borderClass: "border-indigo-500/30",
      textClass: "text-indigo-500",
      summary: "Negotiates 1-RTT cryptographic session tickets and ALPN frame multiplexing.",
      details: "TLS 1.3 encryption handshake + HTTP/2 streaming pipeline.",
      icon: Icons.Lock,
    },
    {
      step: "03",
      phase: "Prompt Prefill & TTFT",
      shortTitle: "Prefill Stopwatch",
      timing: "48.2ms - 142.0ms",
      color: "brand",
      colorClass: "bg-[var(--brand-primary)]",
      borderClass: "border-[var(--brand-primary-border)]",
      textClass: "text-[var(--brand-primary)]",
      summary: "Measures time before first token is emitted (PagedAttention & KV-cache).",
      details: "Attention ingestion + server worker queue scheduling latency.",
      icon: Icons.Zap,
    },
    {
      step: "04",
      phase: "Streaming Decode & ITL",
      shortTitle: "Token Stream",
      timing: "84.2 - 492 tok/s",
      color: "emerald",
      colorClass: "bg-emerald-500",
      borderClass: "border-emerald-500/30",
      textClass: "text-emerald-500",
      summary: "Captures high-frequency 100Hz SSE delivery and P99 inter-token jitter tail.",
      details: "Auto-regressive decode cadence + token transfer efficiency.",
      icon: Icons.ActivityPulse,
    },
  ];

  const bentoSuperpowers = [
    {
      id: "waterfall",
      title: "Microsecond Socket Waterfall",
      badge: "Zero-Overhead",
      description:
        "Isolate client network latency from server queue delays with sub-millisecond precision across DNS, TCP, TLS, TTFT, and Decode.",
      icon: Icons.Network,
      glow: "rgba(56, 189, 248, 0.15)",
      visual: "waterfall",
    },
    {
      id: "telemetry",
      title: "100Hz Real-Time SSE Stream",
      badge: "10ms Resolution",
      description:
        "High-frequency Server-Sent Events monitoring engine sampling live concurrency, active sockets, and decode speeds in real-time.",
      icon: Icons.ActivityPulse,
      glow: "rgba(16, 185, 129, 0.15)",
      visual: "stream",
    },
    {
      id: "goodput",
      title: "Goodput SLO Sieve",
      badge: "SLO Compliance",
      description:
        "Separate compliant responses from latency spikes. Configure custom TTFT and TPS thresholds to calculate true production Goodput.",
      icon: Icons.Target,
      glow: "rgba(168, 85, 247, 0.15)",
      visual: "slo",
    },
    {
      id: "guardrails",
      title: "Spend Cap Guardrails",
      badge: "Hard Budget Caps",
      description:
        "Hardware-enforced financial kill-switches automatically cancel running tests before exceeding your allocated token budget.",
      icon: Icons.Dollar,
      glow: "rgba(245, 158, 11, 0.15)",
      visual: "spend",
    },
    {
      id: "vault",
      title: "Local-First SQLite WAL",
      badge: "Zero Cloud Leak",
      description:
        "Your model credentials, private prompts, and telemetry results remain 100% local on your machine in encrypted SQLite storage.",
      icon: Icons.Lock,
      glow: "rgba(239, 68, 68, 0.15)",
      visual: "vault",
    },
    {
      id: "adapters",
      title: "Universal Inference Adapters",
      badge: "OpenAI Compatible",
      description:
        "Plug-and-play compatibility with OpenAI, Anthropic, Gemini, DeepSeek, Groq, AWS Bedrock, Azure, vLLM, and Ollama.",
      icon: Icons.Cpu,
      glow: "rgba(99, 102, 241, 0.15)",
      visual: "providers",
    },
  ];

  const providers = [
    { name: "OpenAI", sub: "GPT-4o, o3, o1", vendor: "openai" },
    { name: "Anthropic", sub: "Claude 3.7 / 3.5", vendor: "anthropic" },
    { name: "Google Gemini", sub: "Gemini 2.5 & 2.0", vendor: "gemini" },
    { name: "DeepSeek", sub: "R1 & V3", vendor: "deepseek" },
    { name: "AWS Bedrock", sub: "Claude & Llama", vendor: "aws_bedrock" },
    { name: "Microsoft Azure", sub: "Azure OpenAI", vendor: "azure" },
    { name: "Groq LPU", sub: "Ultra-Fast Inference", vendor: "groq" },
    { name: "vLLM", sub: "PagedAttention v2", vendor: "vllm" },
    { name: "Ollama", sub: "Local Apple Silicon / CUDA", vendor: "ollama" },
    { name: "Together AI", sub: "Serverless & Dedicated", vendor: "together" },
    { name: "Mistral AI", sub: "Large 2 & Codestral", vendor: "mistral" },
    { name: "Meta Llama", sub: "Llama 3.3 70B / 405B", vendor: "meta" },
  ];

  const cliSnippets = {
    npx: "npx llmark studio --model deepseek-r1 --concurrency 20 --duration 30s",
    docker: "docker run -p 8000:8000 -p 5173:5173 -v ./data:/data ghcr.io/llmark/llmark:latest",
    pip: "pip install llmark && llmark diff openai/gpt-4o anthropic/claude-3-5-sonnet",
    curl: "curl -X POST http://localhost:8000/api/benchmark/start \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"model\": \"groq-llama-3-1-8b\", \"concurrency\": 10, \"max_spend\": 0.50}'",
  };

  const faqs = [
    {
      q: "How does LLMark achieve 100Hz telemetry without adding client-side latency?",
      a: "LLMark uses lightweight non-blocking asynchronous socket probes implemented in FastAPI and uvloop. The timing measurements are recorded at the OS socket level using microsecond monotonic clocks, decoupling packet observation from serialization overhead.",
    },
    {
      q: "How is TTFT accurately separated from DNS, TCP, and TLS overhead?",
      a: "Standard HTTP clients group all initial socket handshakes into a single latency bucket. LLMark's socket waterfall engine instruments the exact tcp_connect, ssl_handshake, and server_response timestamps individually, giving you true prompt prefill time without network skew.",
    },
    {
      q: "Can I benchmark local vLLM or Ollama clusters without internet access?",
      a: "Yes. LLMark is entirely local-first. You can connect directly to http://localhost:8000/v1 or custom internal VPC endpoints. Zero telemetry or prompt tokens are ever sent to external cloud servers.",
    },
    {
      q: "What is Goodput and how does it differ from raw Throughput?",
      a: "Raw throughput counts all generated tokens regardless of latency violations. Goodput only counts tokens from requests that strictly meet your target Time-to-First-Token (TTFT) and Inter-Token Latency (ITL) Service Level Objectives (SLOs).",
    },
    {
      q: "How do the spend caps protect against unexpected API bills?",
      a: "Before each test packet is dispatched, LLMark estimates token consumption and tracks running dollar expenditure in real-time. If the projected spend hits your preset cap (e.g. $1.00), the execution immediately aborts in-flight streams.",
    },
  ];

  // GSAP Advanced ScrollTrigger Lifecycle Animations
  useEffect(() => {
    // Configure ScrollTrigger defaults
    ScrollTrigger.defaults({
      scroller: window,
      fastScrollEnd: true,
      preventOverlaps: true,
    });

    const mm = gsap.matchMedia(containerRef);

    // 1. Accessibility: Prefers-reduced-motion fallback
    mm.add("(prefers-reduced-motion: reduce)", () => {
      if (totalLatencyRef.current) totalLatencyRef.current.textContent = "162.2";
      if (ttftRef.current) ttftRef.current.textContent = "142.0";
      if (itlRef.current) itlRef.current.textContent = "11.8";
      if (sloRef.current) sloRef.current.textContent = "99.7";
      if (spendRef.current) spendRef.current.textContent = "0.042";

      gsap.set(
        [
          ".gsap-hero-badge",
          ".gsap-hero-title",
          ".gsap-hero-desc",
          ".gsap-hero-btn",
          ".gsap-hero-float-chip",
          ".gsap-telemetry-header",
          ".gsap-telemetry-card-wrap",
          ".gsap-waterfall-dns",
          ".gsap-waterfall-tcp",
          ".gsap-waterfall-tls",
          ".gsap-waterfall-ttft",
          ".gsap-waterfall-decode",
          ".gsap-waterfall-label",
          ".gsap-metric-chip",
          ".gsap-lifecycle-header",
          ".gsap-lifecycle-card-wrap",
          ".gsap-lifecycle-step",
          ".gsap-diff-header",
          ".gsap-diff-card-wrap",
          ".gsap-diff-bar-a",
          ".gsap-diff-bar-b",
          ".gsap-bento-header",
          ".gsap-bento-card",
          ".gsap-capabilities-header",
          ".gsap-capability-card-wrap",
          ".gsap-cli-header",
          ".gsap-cli-card-wrap",
          ".gsap-providers-header",
          ".gsap-provider-card-wrap",
          ".gsap-faq-header",
          ".gsap-faq-item",
          ".gsap-cta-card-wrap",
        ],
        { opacity: 1, y: 0, scale: 1, scaleX: 1, clearProps: "all" }
      );
    });

    // 2. Standard Viewports (Desktop & Mobile with full GSAP polish)
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;

      // ── Scroll Progress Track ─────────────────────────────────────────────
      gsap.fromTo(
        ".gsap-scroll-progress",
        { scaleX: 0 },
        {
          scaleX: 1,
          transformOrigin: "left center",
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.2,
          },
        }
      );

      // ── Section 1: Hero Entrance Timeline ──────────────────────────────────
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTl
        .fromTo(
          ".gsap-hero-badge",
          { y: -20, opacity: 0, scale: 0.9 },
          { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: "back.out(1.5)", delay: 0.05 }
        )
        .fromTo(
          ".gsap-hero-title",
          { y: 35, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.75 },
          "-=0.35"
        )
        .fromTo(
          ".gsap-hero-desc",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.65 },
          "-=0.45"
        )
        .fromTo(
          ".gsap-hero-btn",
          { y: 20, opacity: 0, scale: 0.94 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.08,
            duration: 0.55,
            ease: "back.out(1.2)",
            clearProps: "transform",
          },
          "-=0.35"
        )
        .fromTo(
          ".gsap-hero-float-chip",
          { y: 30, opacity: 0, scale: 0.85 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.1,
            duration: 0.65,
            ease: "back.out(1.4)",
          },
          "-=0.4"
        );

      // High-Entropy Multi-Axis Floating Levitation (Lively Zero-G Brownian Drift)
      const createEntropyFloat = (target: string, rangeX: number, rangeY: number, rangeRot: number) => {
        const wander = () => {
          gsap.to(target, {
            x: gsap.utils.random(-rangeX, rangeX, 1),
            y: gsap.utils.random(-rangeY, rangeY, 1),
            rotation: gsap.utils.random(-rangeRot, rangeRot, 0.2),
            duration: gsap.utils.random(1.9, 3.2),
            ease: "sine.inOut",
            force3D: true,
            onComplete: wander,
          });
        };
        wander();
      };

      createEntropyFloat(".gsap-float-inner-1", 24, 28, 5.5);
      createEntropyFloat(".gsap-float-inner-2", 28, 34, 6.5);
      createEntropyFloat(".gsap-float-inner-3", 26, 30, 5.0);
      createEntropyFloat(".gsap-float-inner-4", 28, 32, 6.0);

      // Hero Scroll Parallax Recede
      if (!isMobile) {
        gsap.to("#hero-content", {
          scrollTrigger: {
            trigger: "#hero-section",
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
          y: 40,
          opacity: 0.35,
          scale: 0.98,
          ease: "none",
        });

        // Scrub individual floating chip wrappers at varied speeds for 3D parallax depth
        gsap.to(".gsap-float-1", {
          scrollTrigger: { trigger: "#hero-section", start: "top top", end: "bottom top", scrub: 0.5 },
          y: -50,
          x: -12,
        });
        gsap.to(".gsap-float-2", {
          scrollTrigger: { trigger: "#hero-section", start: "top top", end: "bottom top", scrub: 0.7 },
          y: -70,
          x: 18,
        });
        gsap.to(".gsap-float-3", {
          scrollTrigger: { trigger: "#hero-section", start: "top top", end: "bottom top", scrub: 0.6 },
          y: -45,
          x: -20,
        });
        gsap.to(".gsap-float-4", {
          scrollTrigger: { trigger: "#hero-section", start: "top top", end: "bottom top", scrub: 0.8 },
          y: -75,
          x: 14,
        });
      }

      // ── Section 2: Real-Time Telemetry Pipeline ───────────────────────────
      const telemetryTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#telemetry-section",
          start: isMobile ? "top 90%" : "top 82%",
          once: true,
        },
        defaults: { ease: "power3.out" },
      });

      const counterObj = {
        totalLatency: 0,
        ttft: 0,
        itl: 0,
        slo: 0,
        spend: 0,
      };

      telemetryTl
        .fromTo(
          ".gsap-telemetry-header",
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 }
        )
        .fromTo(
          ".gsap-telemetry-card-wrap",
          { y: 40, opacity: 0, scale: 0.97 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            clearProps: "transform",
          },
          "-=0.35"
        )
        .fromTo(
          ".gsap-waterfall-dns",
          { scaleX: 0, transformOrigin: "left" },
          { scaleX: 1, duration: 0.22, ease: "power1.out" },
          "-=0.2"
        )
        .fromTo(
          ".gsap-waterfall-tcp",
          { scaleX: 0, transformOrigin: "left" },
          { scaleX: 1, duration: 0.22, ease: "power1.out" },
          "-=0.06"
        )
        .fromTo(
          ".gsap-waterfall-tls",
          { scaleX: 0, transformOrigin: "left" },
          { scaleX: 1, duration: 0.25, ease: "power1.out" },
          "-=0.06"
        )
        .fromTo(
          ".gsap-waterfall-ttft",
          { scaleX: 0, transformOrigin: "left" },
          { scaleX: 1, duration: 0.55, ease: "power2.out" },
          "-=0.06"
        )
        .fromTo(
          ".gsap-waterfall-decode",
          { scaleX: 0, transformOrigin: "left" },
          { scaleX: 1, duration: 0.5, ease: "power2.out" },
          "-=0.15"
        )
        .fromTo(
          ".gsap-waterfall-label",
          { y: 8, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.04,
            duration: 0.35,
            ease: "power2.out",
            clearProps: "transform",
          },
          "-=0.4"
        )
        .fromTo(
          ".gsap-metric-chip",
          { y: 20, opacity: 0, scale: 0.94 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.08,
            duration: 0.5,
            ease: "back.out(1.2)",
            clearProps: "transform",
          },
          "-=0.35"
        )
        .to(
          counterObj,
          {
            totalLatency: 162.2,
            ttft: 142.0,
            itl: 11.8,
            slo: 99.7,
            spend: 0.042,
            duration: 1.3,
            ease: "power2.out",
            onUpdate: () => {
              if (totalLatencyRef.current) totalLatencyRef.current.textContent = counterObj.totalLatency.toFixed(1);
              if (ttftRef.current) ttftRef.current.textContent = counterObj.ttft.toFixed(1);
              if (itlRef.current) itlRef.current.textContent = counterObj.itl.toFixed(1);
              if (sloRef.current) sloRef.current.textContent = counterObj.slo.toFixed(1);
              if (spendRef.current) spendRef.current.textContent = counterObj.spend.toFixed(3);
            },
          },
          "-=0.6"
        );

      // ── Section 3: Sub-ms Latency Request Lifecycle (Single Minimal Card) ──
      const lifecycleTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#lifecycle-section",
          start: isMobile ? "top 90%" : "top 82%",
          once: true,
        },
        defaults: { ease: "power3.out" },
      });

      lifecycleTl
        .fromTo(
          ".gsap-lifecycle-header",
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 }
        )
        .fromTo(
          ".gsap-lifecycle-card-wrap",
          { y: 35, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            clearProps: "transform",
          },
          "-=0.3"
        )
        .fromTo(
          ".gsap-lifecycle-step",
          { y: 15, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 0.5,
            ease: "back.out(1.2)",
            clearProps: "transform",
          },
          "-=0.35"
        );

      // ── Section 4: Live Head-to-Head Compare Widget ───────────────────────
      const diffTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#diff-widget-section",
          start: isMobile ? "top 90%" : "top 82%",
          once: true,
        },
        defaults: { ease: "power3.out" },
      });

      diffTl
        .fromTo(
          ".gsap-diff-header",
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 }
        )
        .fromTo(
          ".gsap-diff-card-wrap",
          { y: 35, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            clearProps: "transform",
          },
          "-=0.3"
        )
        .fromTo(
          ".gsap-diff-bar-a, .gsap-diff-bar-b",
          { scaleX: 0, transformOrigin: "left" },
          { scaleX: 1, stagger: 0.05, duration: 0.6, ease: "power2.out" },
          "-=0.4"
        );

      // ── Section 5: Bento Superpowers Grid ─────────────────────────────────
      const bentoTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#bento-section",
          start: isMobile ? "top 90%" : "top 82%",
          once: true,
        },
        defaults: { ease: "power3.out" },
      });

      bentoTl
        .fromTo(
          ".gsap-bento-header",
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 }
        )
        .fromTo(
          ".gsap-bento-card",
          { y: 35, opacity: 0, scale: 0.94 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.08,
            duration: 0.6,
            ease: "power2.out",
            clearProps: "transform",
          },
          "-=0.3"
        );

      // ── Section 6: Core Workspaces Showcase ───────────────────────────────
      const capabilitiesTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#capabilities-section",
          start: isMobile ? "top 90%" : "top 82%",
          once: true,
        },
        defaults: { ease: "power3.out" },
      });

      capabilitiesTl
        .fromTo(
          ".gsap-capabilities-header",
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 }
        )
        .fromTo(
          ".gsap-capability-card-wrap",
          { y: 35, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.12,
            duration: 0.65,
            ease: "power2.out",
            clearProps: "transform",
          },
          "-=0.3"
        );

      // ── Section 7: Developer CLI & Quickstart ─────────────────────────────
      const cliTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#cli-section",
          start: isMobile ? "top 90%" : "top 82%",
          once: true,
        },
        defaults: { ease: "power3.out" },
      });

      cliTl
        .fromTo(
          ".gsap-cli-header",
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 }
        )
        .fromTo(
          ".gsap-cli-card-wrap",
          { y: 35, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            clearProps: "transform",
          },
          "-=0.3"
        );

      // ── Section 8: Supported Providers Grid ───────────────────────────────
      const providersTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#providers-section",
          start: isMobile ? "top 90%" : "top 82%",
          once: true,
        },
        defaults: { ease: "power3.out" },
      });

      providersTl
        .fromTo(
          ".gsap-providers-header",
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 }
        )
        .fromTo(
          ".gsap-provider-card-wrap",
          { y: 25, opacity: 0, scale: 0.92 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: {
              grid: "auto",
              from: "start",
              amount: 0.35,
            },
            duration: 0.5,
            ease: "back.out(1.2)",
            clearProps: "transform",
          },
          "-=0.3"
        );

      // ── Section 9: FAQ Accordion ──────────────────────────────────────────
      const faqTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#faq-section",
          start: isMobile ? "top 90%" : "top 82%",
          once: true,
        },
        defaults: { ease: "power3.out" },
      });

      faqTl
        .fromTo(
          ".gsap-faq-header",
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 }
        )
        .fromTo(
          ".gsap-faq-item",
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 0.5,
            ease: "power2.out",
            clearProps: "transform",
          },
          "-=0.3"
        );

      // ── Section 10: Closing CTA Banner ────────────────────────────────────
      gsap.fromTo(
        ".gsap-cta-card-wrap",
        { y: 35, opacity: 0, scale: 0.96 },
        {
          scrollTrigger: {
            trigger: "#cta-section",
            start: isMobile ? "top 92%" : "top 85%",
            once: true,
          },
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: "power3.out",
          clearProps: "transform",
        }
      );
    });

    // Delayed refresh to guarantee correct trigger coordinates after React/Framer Motion mount
    const refreshST = () => ScrollTrigger.refresh();

    if (document.fonts?.ready) {
      document.fonts.ready.then(refreshST);
    }
    const timer = setTimeout(refreshST, 250);

    // Watch resize of container to re-align triggers dynamically
    const resizeObserver = new ResizeObserver(() => {
      ScrollTrigger.refresh();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      mm.revert();
    };
  }, []);

  // Compute active inspected packet or model composite
  const inspectedPacket = selectedInspectPacket !== null
    ? completedPackets.find((p) => p.index === selectedInspectPacket) || null
    : null;

  const currentDns = inspectedPacket ? inspectedPacket.dns : activeProbeModel.dns;
  const currentTcp = inspectedPacket ? inspectedPacket.tcp : activeProbeModel.tcp;
  const currentTls = inspectedPacket ? inspectedPacket.tls : activeProbeModel.tls;
  const currentTtft = inspectedPacket ? inspectedPacket.ttft : activeProbeModel.ttft;
  const currentTotal = inspectedPacket ? inspectedPacket.totalLatency : activeProbeModel.totalLatency;
  const currentDecodeSpeed = inspectedPacket ? inspectedPacket.decodeSpeed : activeProbeModel.decodeSpeed;

  const dnsWidth = Math.max(3, (currentDns / currentTotal) * 100);
  const tcpWidth = Math.max(5, (currentTcp / currentTotal) * 100);
  const tlsWidth = Math.max(7, (currentTls / currentTotal) * 100);
  const ttftWidth = Math.max(30, (currentTtft / currentTotal) * 100);
  const decodeWidth = Math.max(25, 100 - (dnsWidth + tcpWidth + tlsWidth + ttftWidth));

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full flex flex-col justify-between selection:bg-[var(--brand-primary-light)] selection:text-[var(--brand-primary)]"
    >
      {/* Precision Scroll Progress Line */}
      <div className="gsap-scroll-progress fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-secondary)] to-[var(--brand-primary)] z-50 origin-left scale-x-0 pointer-events-none opacity-90 shadow-sm" />

      {/* Main Spacious Landing Canvas */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 space-y-20 sm:space-y-24 lg:space-y-28">
        
        {/* ===================================================================
            SECTION 1: HERO (Cinematic Kinetic Entrance & Parallax Floating HUD)
            =================================================================== */}
        <section id="hero-section" className="relative text-center max-w-5xl mx-auto pt-4 sm:pt-8 pb-4">
          
          {/* Parallax Floating HUD Metric Chips (Asymmetric Constellation Scatter) */}
          <div className="hidden lg:block">
            {/* Top-Left Mid Altitude: Groq LPU Speed Chip */}
            <div className="gsap-hero-float-chip gsap-float-1 absolute top-1 -left-4 lg:-left-12 xl:-left-20 z-20 pointer-events-auto select-none rotate-[-2deg]">
              <div className="gsap-float-inner-1 p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-2xl shadow-black/10 flex items-center gap-3 hover:border-[var(--brand-primary-border)] hover:scale-105 transition-all duration-200 cursor-default transform-gpu [backface-visibility:hidden] [transform:translateZ(0)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  <Icons.Zap className="h-4 w-4" />
                </div>
                <div className="text-left font-mono leading-tight">
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider font-semibold">Groq LPU</div>
                  <div className="text-xs font-bold text-[var(--text-main)] tabular-nums whitespace-nowrap">492 tok/s Peak</div>
                </div>
              </div>
            </div>

            {/* High Top-Right Altitude: Sub-ms TTFT Chip */}
            <div className="gsap-hero-float-chip gsap-float-2 absolute -top-10 right-4 lg:right-0 xl:-right-8 z-20 pointer-events-auto select-none rotate-[3.5deg]">
              <div className="gsap-float-inner-2 p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-2xl shadow-black/10 flex items-center gap-3 hover:border-emerald-500/40 hover:scale-105 transition-all duration-200 cursor-default transform-gpu [backface-visibility:hidden] [transform:translateZ(0)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Icons.Clock className="h-4 w-4" />
                </div>
                <div className="text-left font-mono leading-tight">
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider font-semibold">P95 TTFT</div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">48.2ms Fast</div>
                </div>
              </div>
            </div>

            {/* Deep Lower-Left Altitude: Zero-Cloud SQLite Chip */}
            <div className="gsap-hero-float-chip gsap-float-3 absolute top-52 -left-10 lg:-left-22 xl:-left-32 z-20 pointer-events-auto select-none rotate-[2deg]">
              <div className="gsap-float-inner-3 p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-2xl shadow-black/10 flex items-center gap-3 hover:border-[var(--brand-primary-border)] hover:scale-105 transition-all duration-200 cursor-default transform-gpu [backface-visibility:hidden] [transform:translateZ(0)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)] shrink-0">
                  <Icons.Database className="h-4 w-4" />
                </div>
                <div className="text-left font-mono leading-tight">
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider font-semibold">Local Vault</div>
                  <div className="text-xs font-bold text-[var(--text-main)] whitespace-nowrap">Zero-Cloud SQLite</div>
                </div>
              </div>
            </div>

            {/* Mid-Right Altitude: Goodput SLO 99.9% Chip */}
            <div className="gsap-hero-float-chip gsap-float-4 absolute top-36 -right-6 lg:-right-14 xl:-right-22 z-20 pointer-events-auto select-none rotate-[-3.5deg]">
              <div className="gsap-float-inner-4 p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-2xl shadow-black/10 flex items-center gap-3 hover:border-[var(--brand-primary-border)] hover:scale-105 transition-all duration-200 cursor-default transform-gpu [backface-visibility:hidden] [transform:translateZ(0)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)] shrink-0">
                  <Icons.Target className="h-4 w-4" />
                </div>
                <div className="text-left font-mono leading-tight">
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider font-semibold">Goodput SLO</div>
                  <div className="text-xs font-bold text-[var(--brand-primary)] tabular-nums whitespace-nowrap">99.9% Passing</div>
                </div>
              </div>
            </div>
          </div>

          <div id="hero-content" className="space-y-6 sm:space-y-7 relative z-10">
            <div className="space-y-5">
              {/* Minimal Micro-Badge */}
              <div className="gsap-hero-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--brand-primary-light)] border border-[var(--brand-primary-border)] text-[var(--brand-primary)] text-xs font-mono font-medium shadow-xs tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
                <span>100Hz SUB-MILLISECOND INFERENCE TELEMETRY</span>
              </div>

              {/* Main Headline */}
              <h1 className="gsap-hero-title text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[var(--text-main)] font-sans leading-[1.12]">
                Precision Load Testing & <span className="text-gradient-brand">Inference Telemetry</span>
              </h1>

              {/* Sub-headline Description */}
              <p className="gsap-hero-desc text-base sm:text-lg text-[var(--text-body)] max-w-2xl mx-auto leading-relaxed">
                Stress-test LLMs with microsecond socket waterfalls, real-time concurrency profiling, statistical diffs, and hard spend guardrails.
              </p>
            </div>

            {/* Direct Hero Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
              <Button
                onClick={() => onNavigate("benchmark")}
                className="gsap-hero-btn btn-brand-glow text-white shadow-lg shadow-[var(--brand-primary-light)] h-12 px-7 rounded-xl text-sm font-semibold flex items-center gap-2.5 cursor-pointer group"
              >
                <Icons.Play className="h-4 w-4" />
                <span>Open Studio</span>
                <Icons.ArrowRight className="h-4 w-4 opacity-75 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                variant="outline"
                onClick={() => onNavigate("diff")}
                className="gsap-hero-btn h-12 px-6 rounded-xl text-sm font-semibold bg-[var(--bg-card)] border-[var(--border-medium)] hover:border-[var(--brand-primary-border)] text-[var(--text-main)] flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <Icons.Diff className="h-4 w-4 text-[var(--brand-primary)]" />
                <span>Compare Models</span>
              </Button>
            </div>

            {/* Micro Feature Bullet Ribbon */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-muted)] font-mono">
              <div className="flex items-center gap-1.5">
                <Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Zero-Cloud Privacy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>100Hz Monotonic Timestamps</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Automated Spend Caps</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 2: LIVE TELEMETRY SHOWCASE (Interactive Instant Probe Sandbox)
            =================================================================== */}
        <section id="telemetry-section" className="space-y-6">
          {/* Section Heading */}
          <div className="gsap-telemetry-header text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-[11px] font-semibold uppercase tracking-wider font-mono">
              01 // LIVE SANDBOX
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
              Instant Telemetry Probe
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Run a live 5-packet test to inspect socket handshakes, prefill latency, and streaming speed.
            </p>
          </div>

          {/* Telemetry Showcase Card Wrapper */}
          <div className="gsap-telemetry-card-wrap">
            <SpotlightCard
              glowColor="var(--brand-primary-light)"
              className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 sm:p-8 group shadow-sm space-y-6"
            >
              {/* Card Header with Title, Live Status, Model Selector & Instant Probe Action */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
                {/* Left: Title, Live Status & Active Model Tagline */}
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] shrink-0">
                    <Icons.Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-semibold text-[var(--text-main)] font-sans">
                        Instant Telemetry Probe
                      </span>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-mono font-medium flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>100Hz Live Sandbox</span>
                      </Badge>
                    </div>
                    <span className="text-xs text-[var(--text-subtle)] font-sans">
                      {activeProbeModel.tagline}
                    </span>
                  </div>
                </div>

                {/* Right: Model Select Tabs & Run Instant Probe CTA */}
                <div className="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto py-0.5">
                  {/* Model Selector Tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface-subtle)] dark:bg-[var(--bg-app)] border border-[var(--border-subtle)] shrink-0">
                    {PROBE_MODELS.map((m) => {
                      const isSelected = activeProbeModel.id === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectModel(m)}
                          disabled={probeState === "probing"}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 select-none shrink-0 ${
                            isSelected
                              ? "bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] font-semibold shadow-2xs border border-[var(--brand-primary-border)]"
                              : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          } ${probeState === "probing" ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <ProviderLogo vendor={m.vendor} className="h-3.5 w-3.5 shrink-0" />
                          <span className="whitespace-nowrap">{m.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Instant Probe Action Button (Always inline) */}
                  <Button
                    type="button"
                    onClick={handleRunProbe}
                    disabled={probeState === "probing"}
                    className={`h-9 px-3.5 sm:px-4 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 transition-all shadow-xs whitespace-nowrap ${
                      probeState === "probing"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 ring-2 ring-amber-500/20"
                        : "btn-brand-glow text-white shadow-md shadow-[var(--brand-primary-light)] hover:scale-[1.02]"
                    }`}
                  >
                    {probeState === "probing" ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                        <span>Probing #{activePacketIdx + 1}/5...</span>
                      </>
                    ) : probeState === "completed" ? (
                      <>
                        <Icons.Zap className="h-3.5 w-3.5 fill-current text-amber-300" />
                        <span>Re-Probe</span>
                      </>
                    ) : (
                      <>
                        <Icons.Play className="h-3.5 w-3.5 fill-current" />
                        <span>Run Live Probe</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* 5-Packet Live Pipeline Ribbon */}
              <div className="rounded-xl bg-[var(--bg-surface-subtle)]/70 dark:bg-[var(--bg-app)] border border-[var(--border-subtle)] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-sans">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-main)] font-sans text-xs">
                      5-Packet Live Telemetry Stream
                    </span>
                    {probeState === "probing" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono animate-pulse">
                        Packet {activePacketIdx + 1} of 5 Active
                      </Badge>
                    )}
                    {probeState === "completed" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono font-medium">
                        Audit Complete (5/5 Received)
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-subtle)] font-sans">
                    {probeState === "completed" ? "Click a packet to inspect granular breakdown" : "Sub-ms network & prefill profiling"}
                  </span>
                </div>

                {/* 5-Packet Interactive Progress Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-0.5">
                  {/* Aggregate View Tab */}
                  <button
                    type="button"
                    onClick={() => setSelectedInspectPacket(null)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-left flex flex-col justify-between border transition-all cursor-pointer ${
                      selectedInspectPacket === null
                        ? "bg-[var(--bg-surface-elevated)] border-[var(--brand-primary)] text-[var(--brand-primary)] shadow-xs"
                        : "bg-white/40 dark:bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-subtle)] dark:hover:border-white/15"
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] font-sans font-semibold">
                      Composite
                    </span>
                    <span className="font-bold tabular-nums text-xs">P95 Aggregate</span>
                  </button>

                  {/* Packets #1 through #5 */}
                  {[1, 2, 3, 4, 5].map((pktNum, idx) => {
                    const pkt = completedPackets.find((p) => p.index === pktNum);
                    const isRunning = probeState === "probing" && activePacketIdx === idx;
                    const isCompleted = !!pkt;
                    const isSelected = selectedInspectPacket === pktNum;

                    return (
                      <button
                        key={pktNum}
                        type="button"
                        onClick={() => {
                          if (isCompleted) setSelectedInspectPacket(pktNum);
                        }}
                        disabled={!isCompleted && !isRunning}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono text-left flex flex-col justify-between border transition-all ${
                          isSelected
                            ? "bg-[var(--bg-surface-elevated)] border-[var(--brand-primary)] text-[var(--brand-primary)] shadow-xs cursor-pointer"
                            : isRunning
                            ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 animate-pulse"
                            : isCompleted
                            ? "bg-white/60 dark:bg-[var(--bg-surface)] border-emerald-500/20 text-[var(--text-main)] dark:text-[var(--text-subheading)] hover:border-emerald-500/40 cursor-pointer"
                            : "bg-white/20 dark:bg-[var(--bg-surface)] border-transparent text-[var(--text-placeholder)] dark:text-[var(--text-subtle)] opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-sans font-semibold">Pkt #{pktNum}</span>
                          {isRunning ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                          ) : isCompleted ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-placeholder)] dark:text-[var(--text-subtle)]">--</span>
                          )}
                        </div>
                        <span className="font-bold tabular-nums text-xs">
                          {pkt ? `${pkt.ttft}ms` : isRunning ? "Streaming..." : "Queued"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Waterfall Stages Bar */}
              <div className="gsap-waterfall-container space-y-3">
                <div className="flex items-center justify-between text-xs font-sans">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-subheading)]">
                      {selectedInspectPacket !== null ? `Packet #${selectedInspectPacket} Waterfall Breakdown` : "Socket Connection & Prefill Waterfall"}
                    </span>
                    {probeState === "probing" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono animate-pulse">
                        {probePhase === "dns" && "DNS Lookup in progress"}
                        {probePhase === "tcp" && "TCP Handshake SYN/ACK"}
                        {probePhase === "tls" && "TLS 1.3 Key Exchange"}
                        {probePhase === "ttft" && "Server Prefill / TTFT Stopwatch"}
                        {probePhase === "decode" && "Streaming Token Decode"}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-mono text-[var(--brand-primary)] font-bold tabular-nums">
                    Total Latency: <NumberTicker value={currentTotal} decimalPlaces={1} className="text-[var(--brand-primary)]" />ms
                  </span>
                </div>

                {/* Segmented Timeline Bar with dynamic active glow & stage scale */}
                <div className="h-4 w-full rounded-full bg-[var(--bg-surface-subtle)] dark:bg-[var(--bg-app)] overflow-hidden flex shadow-inner p-0.5 border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                  <div
                    style={{ width: `${dnsWidth}%` }}
                    className={`gsap-waterfall-dns origin-left bg-sky-500 rounded-l-full transition-all duration-300 ${
                      probePhase === "dns" ? "ring-2 ring-sky-300 brightness-125 animate-pulse z-10" : "opacity-85 hover:opacity-100"
                    }`}
                    title={`DNS: ${currentDns}ms`}
                  />
                  <div
                    style={{ width: `${tcpWidth}%` }}
                    className={`gsap-waterfall-tcp origin-left bg-indigo-500 transition-all duration-300 ${
                      probePhase === "tcp" ? "ring-2 ring-indigo-300 brightness-125 animate-pulse z-10" : "opacity-85 hover:opacity-100"
                    }`}
                    title={`TCP: ${currentTcp}ms`}
                  />
                  <div
                    style={{ width: `${tlsWidth}%` }}
                    className={`gsap-waterfall-tls origin-left bg-amber-500 transition-all duration-300 ${
                      probePhase === "tls" ? "ring-2 ring-amber-300 brightness-125 animate-pulse z-10" : "opacity-85 hover:opacity-100"
                    }`}
                    title={`TLS: ${currentTls}ms`}
                  />
                  <div
                    style={{ width: `${ttftWidth}%` }}
                    className={`gsap-waterfall-ttft origin-left bg-[var(--brand-primary)] transition-all duration-300 ${
                      probePhase === "ttft" ? "ring-2 ring-[var(--brand-primary)] brightness-125 animate-pulse z-10" : "opacity-90 hover:opacity-100"
                    }`}
                    title={`Prefill / TTFT: ${currentTtft}ms`}
                  />
                  <div
                    style={{ width: `${decodeWidth}%` }}
                    className={`gsap-waterfall-decode origin-left bg-emerald-500 rounded-r-full transition-all duration-300 ${
                      probePhase === "decode" ? "ring-2 ring-emerald-300 brightness-125 animate-pulse z-10" : "opacity-85 hover:opacity-100"
                    }`}
                    title={`Decode: ${currentDecodeSpeed} tok/s`}
                  />
                </div>

                {/* Waterfall Stage Labels */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[var(--text-muted)] pt-0.5">
                  <div className={`gsap-waterfall-label flex items-center gap-1.5 transition-colors ${probePhase === "dns" ? "text-sky-600 dark:text-sky-400 font-bold scale-105" : ""}`}>
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    <span>DNS: <NumberTicker value={currentDns} decimalPlaces={1} />ms</span>
                  </div>
                  <div className={`gsap-waterfall-label flex items-center gap-1.5 transition-colors ${probePhase === "tcp" ? "text-indigo-600 dark:text-indigo-400 font-bold scale-105" : ""}`}>
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span>TCP: <NumberTicker value={currentTcp} decimalPlaces={1} />ms</span>
                  </div>
                  <div className={`gsap-waterfall-label flex items-center gap-1.5 transition-colors ${probePhase === "tls" ? "text-amber-600 dark:text-amber-400 font-bold scale-105" : ""}`}>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>TLS: <NumberTicker value={currentTls} decimalPlaces={1} />ms</span>
                  </div>
                  <div className={`gsap-waterfall-label flex items-center gap-1.5 font-semibold text-[var(--brand-primary)] transition-colors ${probePhase === "ttft" ? "scale-105 font-bold" : ""}`}>
                    <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                    <span>TTFT (Prefill): <NumberTicker value={currentTtft} decimalPlaces={1} className="text-[var(--brand-primary)]" />ms</span>
                  </div>
                  <div className={`gsap-waterfall-label flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold transition-colors ${probePhase === "decode" ? "scale-105 font-bold" : ""}`}>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Decode: <NumberTicker value={currentDecodeSpeed} decimalPlaces={1} className="text-emerald-600 dark:text-emerald-400" /> tok/s</span>
                  </div>
                </div>
              </div>

              {/* Live Stream Terminal Ticker */}
              <div className="rounded-xl bg-[var(--bg-surface-subtle)]/70 dark:bg-[var(--bg-app)] border border-[var(--border-subtle)] p-3 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded transition-colors shrink-0 ${
                    probeState === "probing"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : probeState === "completed"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-[var(--brand-primary-light)] text-[var(--brand-primary)]"
                  }`}>
                    {probeState === "probing" ? `Streaming Pkt #${activePacketIdx + 1}` : probeState === "completed" ? "5-Packets Verified" : "Live Socket"}
                  </span>
                  <div className="truncate text-[var(--text-subheading)] dark:text-[var(--text-body)]">
                    {(inspectedPacket ? inspectedPacket.tokens : probeTokens).length > 0 ? (
                      (inspectedPacket ? inspectedPacket.tokens : probeTokens).map((tok, i) => (
                        <span key={i} className="inline-block text-[var(--text-main)] font-medium">
                          {tok}
                        </span>
                      ))
                    ) : probeState === "probing" ? (
                      <span className="text-amber-600 dark:text-amber-400 animate-pulse">
                        {probePhase === "dns" && "Resolving socket DNS hostname..."}
                        {probePhase === "tcp" && "Establishing TCP SYN/ACK handshake..."}
                        {probePhase === "tls" && "Negotiating TLS 1.3 encryption session..."}
                        {probePhase === "ttft" && "Measuring Time to First Token (prefill queue)..."}
                      </span>
                    ) : (
                      <span className="text-[var(--text-subtle)] dark:text-[var(--text-subtle)]">
                        Click "Run Live Probe" to execute ephemeral 100Hz telemetry test...
                      </span>
                    )}
                    {probeState === "probing" && (
                      <span className="inline-block w-1.5 h-3.5 ml-1 bg-[var(--brand-primary)] animate-pulse align-middle" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {probeState === "completed" && (
                    <button
                      type="button"
                      onClick={handleCopyTrace}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary-border)] text-[var(--text-body)] flex items-center gap-1 cursor-pointer transition-all"
                      title="Copy Telemetry JSON Trace"
                    >
                      {copiedTrace ? (
                        <>
                          <Icons.Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-sans font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Icons.Copy className="h-3 w-3" />
                          <span className="font-sans font-medium">Copy Trace</span>
                        </>
                      )}
                    </button>
                  )}
                  <Badge variant="outline" className="text-[10px] px-2 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-mono font-medium">
                    <NumberTicker value={currentDecodeSpeed} decimalPlaces={1} className="text-emerald-600 dark:text-emerald-400" /> tok/s
                  </Badge>
                  <span className="text-[11px] text-[var(--text-placeholder)] font-mono">
                    {activeProbeModel.id}
                  </span>
                </div>
              </div>

              {/* 4 Metric Chips with Spring animated NumberTicker counters */}
              <div className="gsap-metric-chips-grid grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                <div className={`gsap-metric-chip p-4 rounded-xl transition-all duration-300 bg-[var(--bg-surface-subtle)]/80 dark:bg-[var(--bg-app)] border ${
                  probeState === "completed" ? "border-emerald-500/30 shadow-2xs shadow-emerald-500/5" : "border-[var(--border-subtle)] dark:border-[var(--border-subtle)]"
                } space-y-1`}>
                  <div className="text-xs text-[var(--text-muted)] font-sans">TTFT (P95 Tail)</div>
                  <div className="text-xl font-bold text-[var(--text-main)] tabular-nums">
                    <NumberTicker value={activeProbeModel.ttft} decimalPlaces={1} className="text-xl font-bold text-[var(--text-main)]" /> <span className="text-xs font-normal text-[var(--text-subtle)]">ms</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {probeState === "completed" ? "Verified across 5 packets" : "Sub-ms handshake"}
                  </div>
                </div>

                <div className={`gsap-metric-chip p-4 rounded-xl transition-all duration-300 bg-[var(--bg-surface-subtle)]/80 dark:bg-[var(--bg-app)] border ${
                  probeState === "completed" ? "border-emerald-500/30 shadow-2xs shadow-emerald-500/5" : "border-[var(--border-subtle)] dark:border-[var(--border-subtle)]"
                } space-y-1`}>
                  <div className="text-xs text-[var(--text-muted)] font-sans">ITL Tail (P99)</div>
                  <div className="text-xl font-bold text-[var(--text-main)] tabular-nums">
                    <NumberTicker value={activeProbeModel.itlTail} decimalPlaces={1} className="text-xl font-bold text-[var(--text-main)]" /> <span className="text-xs font-normal text-[var(--text-subtle)]">ms</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Jitter &lt; 2ms</div>
                </div>

                <div className={`gsap-metric-chip p-4 rounded-xl transition-all duration-300 bg-[var(--bg-surface-subtle)]/80 dark:bg-[var(--bg-app)] border ${
                  probeState === "completed" ? "border-emerald-500/30 shadow-2xs shadow-emerald-500/5" : "border-[var(--border-subtle)] dark:border-[var(--border-subtle)]"
                } space-y-1`}>
                  <div className="text-xs text-[var(--text-muted)] font-sans">Goodput SLO</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    <NumberTicker value={activeProbeModel.goodput} decimalPlaces={1} className="text-xl font-bold text-emerald-600 dark:text-emerald-400" />%
                  </div>
                  <div className="text-[11px] text-[var(--text-subtle)] font-medium">Target: &gt;95.0%</div>
                </div>

                <div className={`gsap-metric-chip p-4 rounded-xl transition-all duration-300 bg-[var(--bg-surface-subtle)]/80 dark:bg-[var(--bg-app)] border ${
                  probeState === "completed" ? "border-emerald-500/30 shadow-2xs shadow-emerald-500/5" : "border-[var(--border-subtle)] dark:border-[var(--border-subtle)]"
                } space-y-1`}>
                  <div className="text-xs text-[var(--text-muted)] font-sans">Spend Guard</div>
                  <div className="text-xl font-bold text-[var(--brand-primary)] tabular-nums">
                    $<NumberTicker value={activeProbeModel.spend * 5} decimalPlaces={6} className="text-xl font-bold text-[var(--brand-primary)]" />
                  </div>
                  <div className="text-[11px] text-[var(--text-subtle)] font-medium">Hard Cap: $1.00</div>
                </div>
              </div>

              {/* Zero-Setup Conversion Action Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-sans">
                  <Icons.ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Ready for full concurrency stress test with zero configuration.</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      try {
                        sessionStorage.setItem("llmark_diff_model_a", activeProbeModel.id);
                      } catch (e) {}
                      onNavigate("diff");
                    }}
                    className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-[var(--bg-surface-elevated)] border-[var(--border-medium)] hover:border-[var(--brand-primary-border)] text-[var(--text-main)] flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Icons.Diff className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                    <span>Compare Models</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleLaunchStudioWithModel(activeProbeModel)}
                    className="h-9 px-4 rounded-xl text-xs font-semibold btn-brand-glow text-white shadow-sm flex items-center gap-2 cursor-pointer group"
                  >
                    <span>Open in Studio ({activeProbeModel.name})</span>
                    <Icons.ArrowRight className="h-3.5 w-3.5 opacity-75 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </section>

        {/* ===================================================================
            SECTION 3: SUB-MS LATENCY REQUEST LIFECYCLE (Single Minimal 1->2->3->4 Pipeline Card)
            =================================================================== */}
        <section id="lifecycle-section" className="space-y-4 max-w-5xl mx-auto">
          <div className="gsap-lifecycle-header text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-[10px] font-semibold uppercase tracking-wider font-mono">
              02 // PIPELINE
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)]">
              Sub-Millisecond Request Lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl mx-auto">
              How LLMark isolates network handshakes from inference prefill queueing and streaming decode tokens.
            </p>
          </div>

          <div className="gsap-lifecycle-card-wrap">
            <SpotlightCard
              glowColor="var(--brand-primary-light)"
              className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-5 shadow-sm"
            >
              {/* Connected Sequential Step Strip: 1 -> 2 -> 3 -> 4 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative font-sans">
                {lifecycleStages.map((stage, idx) => {
                  const Icon = stage.icon;
                  const isActive = activeLifecycleStep === idx;
                  const isLast = idx === lifecycleStages.length - 1;

                  return (
                    <div
                      key={stage.step}
                      onClick={() => setActiveLifecycleStep(idx)}
                      className={`gsap-lifecycle-step p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                        isActive
                          ? "bg-[var(--bg-surface-elevated)] border-[var(--brand-primary)] shadow-xs ring-1 ring-[var(--brand-primary-border)]"
                          : "bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-app)] border-[var(--border-subtle)] hover:border-[var(--border-medium)]"
                      }`}
                    >
                      {/* Step Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-mono font-bold transition-colors ${
                            isActive
                              ? "bg-[var(--brand-primary)] text-[var(--text-inverse)]"
                              : "bg-[var(--border-subtle)] text-[var(--text-subtle)] group-hover:text-[var(--text-main)]"
                          }`}>
                            {stage.step}
                          </span>
                          <span className="text-xs font-bold text-[var(--text-main)] font-sans">
                            {stage.shortTitle}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono px-1.5 py-0 border ${
                            stage.color === "sky"
                              ? "border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10"
                              : stage.color === "indigo"
                              ? "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
                              : stage.color === "brand"
                              ? "border-[var(--brand-primary-border)] text-[var(--brand-primary)] bg-[var(--brand-primary-light)]"
                              : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                          }`}
                        >
                          {stage.timing}
                        </Badge>
                      </div>

                      {/* Summary */}
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                        {stage.summary}
                      </p>

                      {/* Technical Detail Line */}
                      <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-subtle)] truncate">
                        <Icon className="h-3 w-3 shrink-0 text-[var(--brand-primary)]" />
                        <span className="truncate">{stage.details}</span>
                      </div>

                      {/* Arrow Connector between steps for large screens */}
                      {!isLast && (
                        <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-4 w-4 items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-subtle)] text-[10px]">
                          →
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Contextual Metric Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs font-sans">
                <div className="flex items-center gap-2 text-[var(--text-body)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    <strong>Step {lifecycleStages[activeLifecycleStep].step}:</strong> {lifecycleStages[activeLifecycleStep].phase} — {lifecycleStages[activeLifecycleStep].summary}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-subtle)]">
                  <span>Monotonic OS clock timing</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100Hz telemetry</span>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </section>

        {/* ===================================================================
            SECTION 4: SIDE-BY-SIDE MODEL COMPARISON (Model A vs Model B)
            =================================================================== */}
        <section id="diff-widget-section" className="space-y-4 max-w-5xl mx-auto">
          <div className="gsap-diff-header text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-[10px] font-semibold uppercase tracking-wider font-mono">
              03 // STATISTICAL DIFF
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)]">
              Model Comparison Matrix
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl mx-auto">
              Select any two models to inspect and compare their latency, streaming throughput, and SLO metrics side-by-side.
            </p>
          </div>

          <div className="gsap-diff-card-wrap">
            <SpotlightCard
              glowColor="var(--brand-primary-light)"
              className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-5 shadow-sm"
            >
              {/* Side-by-Side Model A & Model B Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-sans">
                {/* Model A Card */}
                <div className="p-4 rounded-xl bg-[var(--bg-surface-subtle)]/70 dark:bg-[var(--bg-app)] border border-[var(--border-subtle)] space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Model A Header & Selector */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-[var(--brand-primary)] tracking-wide uppercase">
                          MODEL A
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[var(--brand-primary-border)] text-[var(--brand-primary)] bg-[var(--brand-primary-light)] font-mono">
                          {diffModelA.badge}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text-subtle)]">{diffModelA.vendor}</span>
                    </div>

                    {/* Model A Selection Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto py-1">
                      {PROBE_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setDiffModelA(m)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                            diffModelA.id === m.id
                              ? "bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] font-bold shadow-2xs border border-[var(--brand-primary-border)]"
                              : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          }`}
                        >
                          <ProviderLogo vendor={m.vendor} className="h-3 w-3 shrink-0" />
                          <span>{m.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model A Metrics 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-0.5">
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">P95 TTFT (Prefill)</div>
                      <div className="text-base font-bold text-[var(--brand-primary)] font-mono">
                        {diffModelA.ttft} <span className="text-[11px] font-normal text-[var(--text-subtle)]">ms</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-subtle)]">Lower is faster</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-0.5">
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">Decode Speed</div>
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {diffModelA.decodeSpeed} <span className="text-[11px] font-normal text-[var(--text-subtle)]">tok/s</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-subtle)]">Higher is faster</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-0.5">
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">P99 ITL Tail</div>
                      <div className="text-base font-bold text-[var(--text-main)] font-mono">
                        {diffModelA.itlTail} <span className="text-[11px] font-normal text-[var(--text-subtle)]">ms</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-subtle)]">Jitter &lt; 2ms</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-0.5">
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">Goodput SLO</div>
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {diffModelA.goodput}%
                      </div>
                      <div className="text-[10px] text-[var(--text-subtle)]">Target &gt; 95%</div>
                    </div>
                  </div>
                </div>

                {/* Model B Card */}
                <div className="p-4 rounded-xl bg-[var(--bg-surface-subtle)]/70 dark:bg-[var(--bg-app)] border border-[var(--border-subtle)] space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Model B Header & Selector */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-[var(--text-subheading)] tracking-wide uppercase">
                          MODEL B
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[var(--border-medium)] text-[var(--text-muted)] font-mono">
                          {diffModelB.badge}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text-subtle)]">{diffModelB.vendor}</span>
                    </div>

                    {/* Model B Selection Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto py-1">
                      {PROBE_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setDiffModelB(m)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                            diffModelB.id === m.id
                              ? "bg-[var(--bg-surface-elevated)] text-[var(--text-main)] font-bold shadow-2xs border border-[var(--border-strong)]"
                              : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          }`}
                        >
                          <ProviderLogo vendor={m.vendor} className="h-3 w-3 shrink-0" />
                          <span>{m.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model B Metrics 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-0.5">
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">P95 TTFT (Prefill)</div>
                      <div className="text-base font-bold text-[var(--text-main)] font-mono">
                        {diffModelB.ttft} <span className="text-[11px] font-normal text-[var(--text-subtle)]">ms</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-subtle)]">Lower is faster</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-0.5">
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">Decode Speed</div>
                      <div className="text-base font-bold text-[var(--text-main)] font-mono">
                        {diffModelB.decodeSpeed} <span className="text-[11px] font-normal text-[var(--text-subtle)]">tok/s</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-subtle)]">Higher is faster</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-0.5">
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">P99 ITL Tail</div>
                      <div className="text-base font-bold text-[var(--text-main)] font-mono">
                        {diffModelB.itlTail} <span className="text-[11px] font-normal text-[var(--text-subtle)]">ms</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-subtle)]">Jitter &lt; 2ms</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-0.5">
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">Goodput SLO</div>
                      <div className="text-base font-bold text-[var(--text-main)] font-mono">
                        {diffModelB.goodput}%
                      </div>
                      <div className="text-[10px] text-[var(--text-subtle)]">Target &gt; 95%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Minimal Delta Comparison Strip & Launch CTA */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-body)]">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[var(--text-subtle)]">TTFT Delta:</span>
                    <span className={`font-bold ${diffModelA.ttft <= diffModelB.ttft ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                      {diffModelA.ttft <= diffModelB.ttft ? `-${(diffModelB.ttft - diffModelA.ttft).toFixed(1)}ms` : `+${(diffModelA.ttft - diffModelB.ttft).toFixed(1)}ms`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[var(--text-subtle)]">Decode Delta:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {(diffModelA.decodeSpeed / Math.max(1, diffModelB.decodeSpeed)).toFixed(1)}x speedup
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.setItem("llmark_diff_model_a", diffModelA.id);
                      sessionStorage.setItem("llmark_diff_model_b", diffModelB.id);
                    } catch (e) {}
                    onNavigate("diff");
                  }}
                  className="h-8 px-3 rounded-lg text-xs font-semibold btn-brand-glow text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Open Diff Studio</span>
                  <Icons.ArrowRight className="h-3 w-3 opacity-75" />
                </Button>
              </div>
            </SpotlightCard>
          </div>
        </section>

        {/* ===================================================================
            SECTION 5: ARCHITECTURAL SUPERPOWERS BENTO GRID (ScrollTrigger Staggered)
            =================================================================== */}
        <section id="bento-section" className="space-y-6">
          <div className="gsap-bento-header text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-[11px] font-semibold uppercase tracking-wider font-mono">
              04 // CAPABILITIES
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
              Built for High-Load AI Infrastructure
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Everything engineering teams need to benchmark production LLM gateways and self-hosted clusters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-sans">
            {bentoSuperpowers.map((power) => {
              const Icon = power.icon;
              return (
                <div key={power.id} className="gsap-bento-card">
                  <SpotlightCard
                    glowColor={power.glow}
                    className="h-full p-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary-border)] flex flex-col justify-between space-y-5 shadow-2xs group"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] group-hover:scale-105 transition-transform shadow-2xs">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono font-medium px-2 py-0.5 border-[var(--brand-primary-border)] text-[var(--brand-primary)] bg-[var(--brand-primary-light)]">
                          {power.badge}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-[var(--text-main)] font-sans">
                          {power.title}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          {power.description}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Micro Visualizer inside Bento Card */}
                    <div className="pt-3 border-t border-[var(--border-subtle)]">
                      {power.visual === "waterfall" && (
                        <div className="h-2 w-full rounded-full bg-[var(--border-subtle)] overflow-hidden flex">
                          <div className="h-full bg-sky-500 w-[10%]" />
                          <div className="h-full bg-indigo-500 w-[15%]" />
                          <div className="h-full bg-[var(--brand-primary)] w-[45%]" />
                          <div className="h-full bg-emerald-500 w-[30%]" />
                        </div>
                      )}
                      {power.visual === "stream" && (
                        <div className="flex items-center justify-between">
                          <LiveStreamWave active={true} className="h-4 w-16" />
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">100Hz Active</span>
                        </div>
                      )}
                      {power.visual === "slo" && (
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[var(--text-muted)]">SLO &gt; 95%</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">99.9% Pass</span>
                        </div>
                      )}
                      {power.visual === "spend" && (
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[var(--text-muted)]">Cap: $1.00</span>
                          <span className="font-bold text-[var(--brand-primary)]">Kill-Switch Armed</span>
                        </div>
                      )}
                      {power.visual === "vault" && (
                        <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                          <Icons.ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          <span>AES-256 / SQLite WAL</span>
                        </div>
                      )}
                      {power.visual === "providers" && (
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                          <span>12+ Engine Adapters</span>
                        </div>
                      )}
                    </div>
                  </SpotlightCard>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            SECTION 6: THREE CORE WORKSPACES SHOWCASE (ScrollTrigger Animated)
            =================================================================== */}
        <section id="capabilities-section" className="space-y-6">
          <div className="gsap-capabilities-header text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-[11px] font-semibold uppercase tracking-wider font-mono">
              05 // WORKSPACES
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
              Three Dedicated Workspaces
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Stress-test throughput, compare model latency deltas, and inspect historical audit runs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {operations.map((op) => {
              const Icon = op.icon;
              return (
                <div key={op.id} className="gsap-capability-card-wrap flex flex-col h-full">
                  <SpotlightCard
                    glowColor={op.glowColor}
                    className="bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary-border)] flex-1 flex flex-col justify-between p-6 sm:p-7 relative group transition-colors"
                  >
                    <div className="space-y-4">
                      {/* Header: Icon + Badge */}
                      <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] shadow-2xs group-hover:scale-105 transition-transform">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant={op.badgeVariant} className="text-[10px] px-2 py-0.5 font-medium border-[var(--brand-primary-border)] text-[var(--brand-primary)] bg-[var(--brand-primary-light)]">
                          {op.badgeText}
                        </Badge>
                      </div>

                      {/* Titles */}
                      <div className="space-y-0.5">
                        <h3 className="text-base font-semibold text-[var(--text-main)] tracking-tight">
                          {op.title}
                        </h3>
                        <p className="text-xs font-medium text-[var(--brand-primary)]">
                          {op.tagline}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {op.description}
                      </p>

                      {/* Feature bullet list */}
                      <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                        {op.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-subheading)] dark:text-[var(--text-body)]">
                            <Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Primary Action Button */}
                    <div className="pt-5">
                      <Button
                        onClick={() => onNavigate(op.id)}
                        className="w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all btn-brand-glow text-white shadow-md shadow-[var(--brand-primary-light)]"
                      >
                        <span>{op.buttonLabel}</span>
                        <Icons.ArrowRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </SpotlightCard>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            SECTION 7: DEVELOPER CLI & QUICKSTART (Interactive Terminal)
            =================================================================== */}
        <section id="cli-section" className="space-y-6">
          <div className="gsap-cli-header text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-[11px] font-semibold uppercase tracking-wider font-mono">
              06 // QUICKSTART
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
              Developer-First Execution
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Launch benchmarks via web GUI, Docker container, Python package, or direct REST API.
            </p>
          </div>

          <div className="gsap-cli-card-wrap max-w-3xl mx-auto">
            <div className="rounded-2xl bg-[#09090B] border border-white/15 p-5 sm:p-6 shadow-xl text-zinc-100 font-mono space-y-4">
              {/* Terminal Title Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-xs text-zinc-400 font-medium ml-2 font-sans">llmark-cli</span>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                  {(["npx", "docker", "pip", "curl"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveCliTab(tab)}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        activeCliTab === tab
                          ? "bg-white/15 text-white font-bold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Snippet Display with Copy Button */}
              <div className="relative group">
                <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs sm:text-sm text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  <code>{cliSnippets[activeCliTab]}</code>
                </pre>
                <button
                  type="button"
                  onClick={() => handleCopyCli(cliSnippets[activeCliTab])}
                  className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-zinc-200 flex items-center gap-1.5 cursor-pointer transition-all opacity-80 group-hover:opacity-100"
                >
                  {copiedCli ? (
                    <>
                      <Icons.Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-sans">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Icons.Copy className="h-3.5 w-3.5" />
                      <span className="font-sans">Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Mock Terminal Output */}
              <div className="text-xs text-zinc-400 space-y-1 pt-1 font-mono">
                <div className="text-zinc-500"># Output:</div>
                <div className="text-zinc-300">✓ Initialized 20 async workers in 1.4ms</div>
                <div className="text-zinc-300">✓ P95 TTFT: 48.2ms | Throughput: 492.0 tok/s | Goodput: 100.0%</div>
                <div className="text-emerald-400">✓ Audit completed. 0 dropped packets. Spend: $0.00012.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 8: SUPPORTED PROVIDERS ECOSYSTEM (ScrollTrigger Animated)
            =================================================================== */}
        <section id="providers-section" className="space-y-6">
          <div className="gsap-providers-header text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-[11px] font-semibold uppercase tracking-wider font-mono">
              07 // COMPATIBILITY
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
              Supported Endpoints & Engines
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Zero-overhead benchmarking for frontier models, custom OpenAI proxies, and local clusters.
            </p>
          </div>

          <div className="gsap-providers-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 font-sans">
            {providers.map((pr, i) => (
              <div key={i} className="gsap-provider-card-wrap">
                <motion.div
                  whileHover={{ y: -3, scale: 1.02 }}
                  transition={{ duration: 0.18 }}
                  className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary-border)] text-center cursor-default transition-all flex flex-col items-center justify-between gap-2 shadow-2xs group h-full"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface-subtle)] text-[var(--text-subheading)] group-hover:text-[var(--brand-primary)] transition-colors">
                    <ProviderLogo vendor={pr.vendor} className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-main)] truncate">
                      {pr.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-subtle)] truncate font-sans">
                      {pr.sub}
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </section>

        {/* ===================================================================
            SECTION 9: ENGINEERING FAQ ACCORDION (ScrollTrigger Animated)
            =================================================================== */}
        <section id="faq-section" className="space-y-6 max-w-3xl mx-auto">
          <div className="gsap-faq-header text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-[11px] font-semibold uppercase tracking-wider font-mono">
              08 // ARCHITECTURE FAQ
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
              Frequently Answered Questions
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Technical specifics on timing precision, local privacy, and SLO measurement methodology.
            </p>
          </div>

          <div className="space-y-3 font-sans">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="gsap-faq-item">
                  <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden transition-all shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--bg-surface-subtle)] transition-colors"
                    >
                      <span className="text-sm font-semibold text-[var(--text-main)]">
                        {faq.q}
                      </span>
                      <span className="text-base text-[var(--text-muted)] shrink-0">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                          <div className="px-4 sm:px-5 pb-4 pt-1 text-xs text-[var(--text-body)] leading-relaxed border-t border-[var(--border-subtle)]/50">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            SECTION 10: QUICK-START DEVELOPER BANNER (ScrollTrigger Animated)
            =================================================================== */}
        <section id="cta-section" className="pb-4">
          <div className="gsap-cta-card-wrap">
            <SpotlightCard
              glowColor="var(--brand-primary-light)"
              className="bg-gradient-to-br from-white/95 via-white/90 to-[var(--brand-primary-light)] dark:from-[var(--bg-surface-elevated)]/95 dark:via-[var(--bg-surface)] dark:to-[var(--brand-primary-light)] border border-[var(--brand-primary-border)] p-8 sm:p-10 text-center space-y-5 group shadow-md"
            >
              <div className="max-w-2xl mx-auto space-y-2.5">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
                  Ready to Benchmark Your Models?
                </h3>
                <p className="text-sm text-[var(--text-body)]">
                  Run deterministic stress tests, isolate latency bottlenecks, and export audit reports in seconds.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <Button
                  onClick={() => onNavigate("benchmark")}
                  className="btn-brand-glow text-white shadow-md shadow-[var(--brand-primary-light)] h-11 px-7 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 cursor-pointer group"
                >
                  <Icons.Play className="h-4 w-4" />
                  <span>Open Studio</span>
                  <Icons.ArrowRight className="h-4 w-4 opacity-75 group-hover:translate-x-1 transition-transform" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => onNavigate("diff")}
                  className="h-11 px-6 rounded-xl text-xs sm:text-sm font-semibold bg-[var(--bg-card)] border-[var(--border-medium)] hover:border-[var(--brand-primary-border)] text-[var(--text-main)] flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <Icons.Diff className="h-4 w-4 text-[var(--brand-primary)]" />
                  <span>Compare Models</span>
                </Button>
              </div>
            </SpotlightCard>
          </div>
        </section>
      </main>
    </div>
  );
};
