import React, { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Zap,
  GitCompare,
  History,
  ShieldCheck,
  Cpu,
  Gauge,
  ArrowRight,
  Activity,
  Layers,
  FileText,
  Lock,
  Server,
  Play,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Terminal,
  Database,
  BarChart3,
  Flame,
  Scale,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NavTab } from "@/lib/types";
import { LiveStreamWave } from "@/components/common/AnimatedSvg";
import { ProviderLogo } from "@/components/common/BrandLogos";

interface LandingPageProps {
  onNavigate: (tab: NavTab) => void;
}

/**
 * Interactive Spotlight Card with subtle ambient radial glow and smooth elevation
 */
const SpotlightCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
}> = ({ children, className = "", glowColor = "rgba(133, 57, 83, 0.08)", onClick }) => {
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
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl transition-all duration-200 ${
        isHovered
          ? "shadow-md shadow-[#853953]/5 dark:shadow-[#A74B6A]/10 border-[#853953]/40 dark:border-[#A74B6A]/40"
          : "shadow-2xs border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10"
      } ${className}`}
    >
      {/* Subtle ambient radial cursor spotlight */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 z-10"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 70%)`,
        }}
      />
      {children}
    </motion.div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [hoveredBadge, setHoveredBadge] = useState(false);

  // The 4 core operations of LLMark
  const operations = [
    {
      id: "benchmark" as NavTab,
      title: "Benchmark Studio",
      subtitle: "Real-Time Streaming Profiler",
      tagline: "Live Socket Waterfall & Concurrency Stress Test",
      description:
        "Execute high-concurrency token load tests across OpenAI, Anthropic, Gemini, DeepSeek, and local vLLM/Ollama endpoints. Measure TTFT, ITL, TPOT, and Goodput SLO yield with 100Hz live charts.",
      icon: Zap,
      gradient: "from-[#853953] to-[#612D53]",
      badgeText: "Real-Time 100Hz",
      badgeVariant: "default" as const,
      glowColor: "rgba(133, 57, 83, 0.35)",
      features: [
        "Interactive Waterfall: DNS + TCP + TLS + Prefill + Decode",
        "Deterministic Cost Guard & Financial Spend Cap Protection",
        "Simulated DeepSeek-R1 TTFA Thinking Trace Isolation",
      ],
      buttonLabel: "Launch Benchmark Studio",
      buttonClass: "btn-brand-glow text-white shadow-md shadow-[#853953]/25",
      buttonIcon: Play,
    },
    {
      id: "diff" as NavTab,
      title: "Diff Matrix",
      subtitle: "Candidate vs Baseline",
      tagline: "Statistical Head-to-Head Comparison",
      description:
        "Select any two benchmark executions to calculate exact tail latency differentials, token speedup multipliers, and cost efficiency variations. Export clean markdown summaries or executive PDFs.",
      icon: GitCompare,
      gradient: "from-[#853953] to-[#612D53]",
      badgeText: "Statistical Deltas",
      badgeVariant: "default" as const,
      glowColor: "rgba(133, 57, 83, 0.35)",
      features: [
        "Unaggregated tail latency delta distribution matrix",
        "Side-by-side token economics & prompt/completion spread",
        "1-Click Markdown summary & executive PDF delta reports",
      ],
      buttonLabel: "Open Diff Matrix",
      buttonClass: "btn-brand-glow text-white shadow-md shadow-[#853953]/25",
      buttonIcon: GitCompare,
    },
    {
      id: "history" as NavTab,
      title: "History Explorer",
      subtitle: "Persistent Runs & Exports",
      tagline: "SQLite WAL Audit Archive & Raw Telemetry",
      description:
        "Browse all historical test sessions stored locally in SQLite. Model prompt caching ROI from actual run telemetry, inspect unaggregated tail percentiles, and download standardized PDF reports.",
      icon: History,
      gradient: "from-[#853953] to-[#612D53]",
      badgeText: "Local SQLite WAL",
      badgeVariant: "default" as const,
      glowColor: "rgba(133, 57, 83, 0.35)",
      features: [
        "Complete historical timeline with client-side sort & search",
        "Granular percentile inspectors (P50 / P95 / P99 / Max ITL)",
        "Integrated Prompt Cache ROI Modeler & multi-format exports",
      ],
      buttonLabel: "Explore Run History",
      buttonClass: "btn-brand-glow text-white shadow-md shadow-[#853953]/25",
      buttonIcon: History,
    },
  ];

  const providers = [
    { name: "OpenAI", sub: "GPT-4o, o1, o3", vendor: "openai" },
    { name: "Anthropic", sub: "Claude 3.7 & 3.5", vendor: "anthropic" },
    { name: "Google Gemini", sub: "Gemini 2.5 Pro", vendor: "gemini" },
    { name: "AWS Bedrock", sub: "Claude, Nova, Llama", vendor: "aws_bedrock" },
    { name: "Microsoft Azure", sub: "Azure AI Foundry", vendor: "azure" },
    { name: "DeepSeek", sub: "R1 & V3 Official", vendor: "deepseek" },
    { name: "GCP Vertex AI", sub: "Google Cloud VPC", vendor: "gcp_vertex" },
    { name: "Groq LPU", sub: "500+ tok/s Fast", vendor: "groq" },
  ];

  return (
    <div className="flex-1 w-full flex flex-col justify-between selection:bg-[#853953]/20 selection:text-[#853953]">
      {/* Main Landing Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-14 sm:space-y-16">
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="space-y-4"
          >
            {/* Ambient Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#853953]/10 dark:bg-[#A74B6A]/15 border border-[#853953]/25 dark:border-[#A74B6A]/35 text-[#853953] dark:text-[#A74B6A] text-xs font-medium shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Microsecond-Accurate LLM Inference Telemetry</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#2C2C2C] dark:text-[#FAFAFA] font-sans leading-tight">
              Enterprise LLM <span className="text-gradient-brand">Inference Telemetry</span> & Benchmarking
            </h1>

            <p className="text-sm sm:text-base text-[#2C2C2C]/70 dark:text-[#FAFAFA]/80 max-w-2xl mx-auto leading-relaxed">
              Stress-test model APIs with sub-millisecond socket waterfall profiling, deterministic cost limits, unaggregated tail latencies, and Goodput SLO tracking.
            </p>
          </motion.div>

          {/* Quick Stats Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.05, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-center gap-3 text-xs font-sans text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 pt-2"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#252426]/80 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Zero-Persistence Ephemeral Vault</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#252426]/80 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xs">
              <Cpu className="h-4 w-4 text-[#853953] dark:text-[#A74B6A]" />
              <span>100% Free Local Mock Engine</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#252426]/80 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xs">
              <Scale className="h-4 w-4 text-[#612D53] dark:text-[#C57BB2]" />
              <span>Tail Latency Percentiles (P50/P95/P99)</span>
            </div>
          </motion.div>
        </section>

        {/* Supported Providers Marquee Strip */}
        <section className="space-y-3">
          <div className="text-center">
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              Compatible with Any OpenAI-Compliant or Frontier API
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 font-sans">
            {providers.map((pr, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -2, scale: 1.02 }}
                className="p-3 rounded-xl bg-white/70 dark:bg-[#212022]/70 border border-[#2C2C2C]/8 dark:border-[#F3F4F4]/8 hover:border-[#853953]/30 dark:hover:border-[#A74B6A]/30 text-center cursor-default transition-all flex flex-col items-center justify-between gap-2 shadow-2xs group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 group-hover:text-[#853953] dark:group-hover:text-[#A74B6A] transition-colors">
                  <ProviderLogo vendor={pr.vendor} className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] truncate">
                    {pr.name}
                  </div>
                  <div className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 truncate font-sans font-medium">
                    {pr.sub}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 3 Core Operation Spotlight Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans">
              Choose An Operation
            </h2>
            <span className="text-xs text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans font-medium">
              3 Primary Capabilities
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {operations.map((op, idx) => {
              const Icon = op.icon;
              const ButtonIcon = op.buttonIcon;
              return (
                <SpotlightCard
                  key={op.id}
                  glowColor={op.glowColor}
                  className="bg-white/90 dark:bg-[#212022]/90 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:border-[#853953]/35 dark:hover:border-[#A74B6A]/35 flex flex-col justify-between p-6 sm:p-7 relative group transition-colors"
                >
                  <div className="space-y-5">
                    {/* Header: Icon + Badge */}
                    <div className="flex items-start justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${op.gradient} text-white shadow-xs`}>
                        <Icon className="h-5 w-5 fill-current" />
                      </div>
                      <Badge variant={op.badgeVariant} className="text-[11px] px-2.5 py-0.5 font-medium">
                        {op.badgeText}
                      </Badge>
                    </div>

                    {/* Titles */}
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] tracking-tight">
                        {op.title}
                      </h3>
                      <p className="text-xs font-medium text-[#853953] dark:text-[#A74B6A]">
                        {op.tagline}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed min-h-[48px]">
                      {op.description}
                    </p>

                    {/* Feature bullet list */}
                    <div className="space-y-2.5 pt-3 border-t border-[#2C2C2C]/8 dark:border-[#F3F4F4]/8">
                      {op.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <div className="pt-6">
                    <Button
                      onClick={() => onNavigate(op.id)}
                      className={`w-full h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${op.buttonClass}`}
                    >
                      <ButtonIcon className="h-4 w-4" />
                      <span>{op.buttonLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
