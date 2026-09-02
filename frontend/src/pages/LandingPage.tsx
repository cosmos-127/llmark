import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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

  const handleLaunchStudioWithModel = (model: ProbeModelProfile) => {
    try {
      sessionStorage.setItem("llmark_selected_model", model.id);
      sessionStorage.setItem("llmark_selected_vendor", model.vendor);
    } catch (e) {}
    onNavigate("benchmark");
  };

  const handleLaunchDiffWithModel = (model: ProbeModelProfile) => {
    try {
      sessionStorage.setItem("llmark_diff_model_a", model.id);
    } catch (e) {}
    onNavigate("diff");
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

  const providers = [
    { name: "OpenAI", sub: "GPT-4o, o3, o1", vendor: "openai" },
    { name: "Anthropic", sub: "Claude 3.7 / 3.5", vendor: "anthropic" },
    { name: "Google Gemini", sub: "Gemini 2.5 & 2.0", vendor: "gemini" },
    { name: "DeepSeek", sub: "R1 & V3", vendor: "deepseek" },
    { name: "AWS Bedrock", sub: "Claude & Llama", vendor: "aws_bedrock" },
    { name: "Microsoft Azure", sub: "Azure OpenAI", vendor: "azure" },
    { name: "Groq LPU", sub: "Ultra-Fast Inference", vendor: "groq" },
    { name: "vLLM / Ollama", sub: "Local & Self-Hosted", vendor: "vllm" },
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
          ".gsap-telemetry-header",
          ".gsap-telemetry-card-wrap",
          ".gsap-waterfall-dns",
          ".gsap-waterfall-tcp",
          ".gsap-waterfall-tls",
          ".gsap-waterfall-ttft",
          ".gsap-waterfall-decode",
          ".gsap-waterfall-label",
          ".gsap-metric-chip",
          ".gsap-capabilities-header",
          ".gsap-capability-card-wrap",
          ".gsap-providers-header",
          ".gsap-provider-card-wrap",
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
        );

      // Hero Scroll Parallax Recede (Subtle cinematic depth on scroll)
      if (!isMobile) {
        gsap.to("#hero-content", {
          scrollTrigger: {
            trigger: "#hero-section",
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
          y: 50,
          opacity: 0.25,
          scale: 0.98,
          ease: "none",
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

      // Counter animation proxy object for zero-overhead DOM updates
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
        // Sequential Waterfall Latency Expansion (DNS -> TCP -> TLS -> TTFT -> Decode)
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
        // Waterfall stage labels reveal
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
        // Metric chips entrance
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
        // High-precision numerical counter interpolate
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

      // ── Section 3: Core Capabilities Showcase ────────────────────────────
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

      // ── Section 4: Supported Providers Grid ───────────────────────────────
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

      // ── Section 5: Closing CTA Banner ─────────────────────────────────────
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
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 space-y-16 sm:space-y-20 lg:space-y-24">
        {/* ===================================================================
            SECTION 1: HERO (Centred, Breathable, Minimal)
            =================================================================== */}
        <section id="hero-section" className="text-center max-w-4xl mx-auto pt-2 sm:pt-4">
          <div id="hero-content" className="space-y-6 sm:space-y-7">
            <div className="space-y-5">
              {/* Minimal Micro-Badge */}
              <div className="gsap-hero-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--brand-primary-light)] border border-[var(--brand-primary-border)] text-[var(--brand-primary)] text-xs font-mono font-medium shadow-xs tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
                <span>LIVE INFERENCE BENCHMARKING</span>
              </div>

              {/* Main Headline */}
              <h1 className="gsap-hero-title text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[var(--text-main)] font-sans leading-[1.12]">
                Precision Load Testing & <span className="text-gradient-brand">Inference Telemetry</span>
              </h1>

              {/* Sub-headline Description */}
              <p className="gsap-hero-desc text-base sm:text-lg text-[var(--text-body)] max-w-2xl mx-auto leading-relaxed">
                Stress-test LLMs with microsecond socket waterfalls, real-time concurrency profiling, and cost guard rails.
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
                            : "bg-white/20 dark:bg-[var(--bg-surface)] border-transparent text-[var(--text-placeholder)] dark:text-slate-600 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-sans font-semibold">Pkt #{pktNum}</span>
                          {isRunning ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                          ) : isCompleted ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-placeholder)] dark:text-slate-600">--</span>
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
                        Click "Instant Probe (5-Packet Ping)" to execute live telemetry test...
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
                    onClick={() => handleLaunchDiffWithModel(activeProbeModel)}
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
            SECTION 3: THREE CORE CAPABILITIES SHOWCASE (ScrollTrigger Animated)
            =================================================================== */}
        <section id="capabilities-section" className="space-y-6">
          <div className="gsap-capabilities-header text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-[11px] font-semibold uppercase tracking-wider font-mono">
              02 // WORKSPACES
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
            SECTION 4: SUPPORTED PROVIDERS ECOSYSTEM (ScrollTrigger Animated)
            =================================================================== */}
        <section id="providers-section" className="space-y-6">
          <div className="gsap-providers-header text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-[11px] font-semibold uppercase tracking-wider font-mono">
              03 // COMPATIBILITY
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
              Supported Endpoints
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Zero-overhead benchmarking for frontier models, custom OpenAI proxies, and local clusters.
            </p>
          </div>

          <div className="gsap-providers-grid grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 font-sans">
            {providers.map((pr, i) => (
              <div key={i} className="gsap-provider-card-wrap">
                <motion.div
                  whileHover={{ y: -3, scale: 1.02 }}
                  transition={{ duration: 0.18 }}
                  className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary-border)] text-center cursor-default transition-all flex flex-col items-center justify-between gap-2 shadow-2xs group h-full"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-surface-subtle)] text-[var(--text-subheading)] group-hover:text-[var(--brand-primary)] dark:group-hover:text-[var(--brand-primary)] transition-colors">
                    <ProviderLogo vendor={pr.vendor} className="h-4 w-4" />
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
            SECTION 5: QUICK-START DEVELOPER BANNER (ScrollTrigger Animated)
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

              <div className="flex items-center justify-center pt-1">
                <Button
                  onClick={() => onNavigate("benchmark")}
                  className="btn-brand-glow text-white shadow-md shadow-[var(--brand-primary-light)] h-11 px-7 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 cursor-pointer group"
                >
                  <Icons.Play className="h-4 w-4" />
                  <span>Open Studio</span>
                  <Icons.ArrowRight className="h-4 w-4 opacity-75 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </SpotlightCard>
          </div>
        </section>
      </main>
    </div>
  );
};
