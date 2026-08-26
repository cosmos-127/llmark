import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  FileSearch,
  Code2,
  BookOpen,
  Image,
  Braces,
  Sliders,
  DollarSign,
  TrendingUp,
  Play,
  Layers,
  Sparkles,
  Zap,
  Activity,
  ShieldCheck,
  Lock,
  Server,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Info,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCw,
  RotateCcw,
  Edit3,
  ListFilter,
  Cpu,
  Gauge,
  Flame,
  Target,
} from "lucide-react";
import {
  BenchmarkConfig,
  CostEstimate,
  VendorCredential,
  VendorType,
  WorkloadPreset,
  LoadCurveType,
  TestMode,
} from "@/lib/types";
import { api } from "@/lib/api";
import { formatMs, formatPct, formatUsd } from "@/lib/utils";
import { calculateInstantCostEstimate, getModelPricing } from "@/lib/costCalculator";
import { POPULAR_BASE_URLS } from "@/lib/providerRegistry";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DonutChart } from "@/components/tremor/DonutChart";
import { ProviderLogo } from "@/components/common/BrandLogos";
import { KpiCard } from "@/components/tremor/KpiCard";

interface TestConfiguratorProps {
  config: BenchmarkConfig;
  credential: VendorCredential;
  onChange: (config: BenchmarkConfig) => void;
  onCredentialChange: (cred: VendorCredential) => void;
  onLaunch: () => void;
  isLaunching: boolean;
}

const PRESET_OPTIONS: {
  id: WorkloadPreset;
  name: string;
  desc: string;
  icon: any;
  promptTokens: number;
  genTokens: number;
  tag: string;
}[] = [
  {
    id: "chat",
    name: "Interactive chat",
    desc: "Real-time conversational streaming responsiveness & fast decode",
    icon: MessageSquare,
    promptTokens: 200,
    genTokens: 150,
    tag: "Low prefill / fast decode",
  },
  {
    id: "rag",
    name: "RAG synthesis",
    desc: "Heavy document context prefill & KV cache memory loading",
    icon: FileSearch,
    promptTokens: 3500,
    genTokens: 400,
    tag: "High prefill / context heavy",
  },
  {
    id: "code",
    name: "Code generation",
    desc: "Sustained long-sequence token decode throughput",
    icon: Code2,
    promptTokens: 1200,
    genTokens: 800,
    tag: "Long decode stream",
  },
  {
    id: "long_context",
    name: "Long-context",
    desc: "Extreme KV cache pressure & tail degradation stress test",
    icon: BookOpen,
    promptTokens: 16000,
    genTokens: 500,
    tag: "Extreme KV pressure",
  },
  {
    id: "vision",
    name: "Vision multimodal",
    desc: "Image patch token encoding & visual prefill latency",
    icon: Image,
    promptTokens: 1600,
    genTokens: 300,
    tag: "Image encoding + text",
  },
  {
    id: "json_schema",
    name: "Structured JSON",
    desc: "Guided grammar constrained decoding overhead penalty",
    icon: Braces,
    promptTokens: 800,
    genTokens: 400,
    tag: "Grammar constraint",
  },
];

const LOAD_CURVE_OPTIONS: {
  id: LoadCurveType;
  label: string;
  desc: string;
  icon: any;
}[] = [
  {
    id: "constant",
    label: "Constant Flat",
    desc: "Fixed concurrency sustained throughout test",
    icon: Activity,
  },
  {
    id: "ramp_up",
    label: "Linear Ramp-Up",
    desc: "Gradually scales 1 → N workers over duration",
    icon: TrendingUp,
  },
  {
    id: "spike",
    label: "Traffic Spikes",
    desc: "Bursty surge waves to test queue backpressure",
    icon: Zap,
  },
];

export const TestConfigurator: React.FC<TestConfiguratorProps> = ({
  config,
  credential,
  onChange,
  onCredentialChange,
  onLaunch,
  isLaunching,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showKey, setShowKey] = useState(false);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Model discovery state
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);

  // Custom per-1M token price overrides — pre-filled from registry when model changes
  const [customPromptPrice, setCustomPromptPrice] = useState<string>("");
  const [customCompletionPrice, setCustomCompletionPrice] = useState<string>("");

  // Auto-prefill custom price fields whenever the model changes
  useEffect(() => {
    const [p, c] = getModelPricing(config.model, config.vendor);
    setCustomPromptPrice(p.toFixed(4));
    setCustomCompletionPrice(c.toFixed(4));
  }, [config.model, config.vendor]);

  // Derived numeric values for cost calculation (use custom if valid, else registry)
  const resolvedPromptPrice = useMemo(() => {
    const v = parseFloat(customPromptPrice);
    return isNaN(v) || v < 0 ? undefined : v;
  }, [customPromptPrice]);

  const resolvedCompletionPrice = useMemo(() => {
    const v = parseFloat(customCompletionPrice);
    return isNaN(v) || v < 0 ? undefined : v;
  }, [customCompletionPrice]);

  // Strict guard: DO NOT call get models API till required key (and baseUrl where applicable) are entered
  const canFetchModels = useMemo(() => {
    if (config.vendor === "mock") return false;
    const hasKey = !!(credential.api_key && credential.api_key.trim().length > 0);
    const hasUrl = !!(credential.base_url && credential.base_url.trim().length > 0);

    if (config.vendor === "openai_compatible") {
      return hasKey && hasUrl;
    }
    if (config.vendor === "openai" || config.vendor === "anthropic") {
      return hasKey;
    }
    if (config.vendor === "gcp_vertex") {
      return !!(credential.gcp_project_id && credential.gcp_project_id.trim().length > 0);
    }
    if (config.vendor === "aws_bedrock") {
      return !!(credential.aws_access_key_id && credential.aws_access_key_id.trim().length > 0);
    }
    return false;
  }, [config.vendor, credential.api_key, credential.base_url, credential.gcp_project_id, credential.aws_access_key_id]);

  const fetchModels = useCallback(async () => {
    if (!canFetchModels) {
      return;
    }
    setIsLoadingModels(true);
    setModelFetchError(null);
    try {
      const res = await api.listModels({
        vendor: config.vendor,
        credential: {
          api_key: credential.api_key,
          base_url: credential.base_url,
          organization_id: credential.organization_id,
        },
      });
      if (res && res.models && res.models.length > 0) {
        setAvailableModels(res.models);
        // If config.model is empty or not in discovered models (and user isn't in custom model mode)
        if (!config.model || (!res.models.includes(config.model) && !isCustomModel)) {
          onChange({ ...config, model: res.models[0] });
        }
      } else {
        setAvailableModels([]);
      }
    } catch (err: any) {
      console.error("Failed to query models from endpoint:", err);
      setModelFetchError(err.message || "Failed to query models from endpoint");
    } finally {
      setIsLoadingModels(false);
    }
  }, [canFetchModels, config.vendor, credential.api_key, credential.base_url, credential.organization_id, config.model, isCustomModel, onChange, config]);

  // Debounced auto-fetch only triggers when canFetchModels is TRUE
  useEffect(() => {
    if (!canFetchModels) {
      setAvailableModels([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        fetchModels();
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [canFetchModels, credential.api_key, credential.base_url]);

  // Real-time pre-flight cost calculation — instant, client-side, no API round-trip
  useEffect(() => {
    const est = calculateInstantCostEstimate({
      vendor: config.vendor,
      model: config.model || "gpt-4o",
      workload_preset: config.workload_preset,
      concurrency: config.concurrency,
      duration_seconds: config.duration_seconds,
      test_mode: config.test_mode || "duration",
      total_requests: config.total_requests || 50,
      max_tokens: config.max_tokens || 512,
      hard_spend_cap: config.hard_spend_cap,
      custom_prompt_price_per_1m: resolvedPromptPrice,
      custom_completion_price_per_1m: resolvedCompletionPrice,
    });
    setCostEstimate(est);
  }, [
    config.vendor,
    config.model,
    config.workload_preset,
    config.concurrency,
    config.duration_seconds,
    config.test_mode,
    config.total_requests,
    config.max_tokens,
    config.hard_spend_cap,
    resolvedPromptPrice,
    resolvedCompletionPrice,
  ]);

  // Sync custom prices back into config so the parent has them at launch time
  useEffect(() => {
    onChange({
      ...config,
      custom_prompt_price_per_1m: resolvedPromptPrice,
      custom_completion_price_per_1m: resolvedCompletionPrice,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPromptPrice, resolvedCompletionPrice]);

  const validateCurrentStep = (step: number): boolean => {
    setValidationError(null);
    if (step === 1) {
      if (!config.model || config.model.trim().length === 0) {
        setValidationError("Please select or enter a valid target model identifier");
        return false;
      }
      if (config.vendor !== "mock" && (!credential.api_key || credential.api_key.trim().length === 0)) {
        setValidationError(`API key is required for live benchmarking on ${config.vendor}`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1));
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const steps = [
    { num: 1, title: "Endpoint & Model", desc: "Provider, Auth & Model" },
    { num: 2, title: "Workload & Sampling", desc: "Token Profile & Params" },
    { num: 3, title: "Traffic & Guardrails", desc: "Strategy, Scope & Cap" },
    { num: 4, title: "Review & Launch", desc: "Pre-Flight Cockpit" },
  ];

  const selectedPreset = PRESET_OPTIONS.find((p) => p.id === config.workload_preset) || PRESET_OPTIONS[0];
  const totalPresetTokens = selectedPreset.promptTokens + selectedPreset.genTokens;
  const capVal = config.hard_spend_cap || 2.0;
  const estCost = costEstimate?.estimated_cost_usd || 0;
  const spendPct = Math.min(100, Math.round((estCost / capVal) * 100));
  const willTripCap = estCost > capVal;
  const isRequestMode = config.test_mode === "requests";

  const getTemperatureLabel = (temp: number) => {
    if (temp === 0) return "0.0 (Deterministic / Greedy)";
    if (temp <= 0.3) return `${temp.toFixed(1)} (Focused & Precise)`;
    if (temp <= 0.7) return `${temp.toFixed(1)} (Standard Balanced)`;
    if (temp <= 1.0) return `${temp.toFixed(1)} (Creative)`;
    return `${temp.toFixed(1)} (High Variance)`;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Sleek Step-by-Step Stepper Header */}
        <Card className="p-3 sm:p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {steps.map((s) => {
              const isDone = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < currentStep || validateCurrentStep(currentStep)) {
                      setCurrentStep(s.num);
                    }
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer font-sans active:scale-[0.99] ${
                    isCurrent
                      ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/40 dark:border-[#A74B6A]/40 shadow-xs ring-1 ring-[#853953]/20 dark:ring-[#A74B6A]/30"
                      : isDone
                      ? "bg-[#F3F4F4] dark:bg-[#2C2C2C] border-emerald-400/50 dark:border-emerald-600/50 hover:bg-[#e6e8e8] dark:hover:bg-[#353337]"
                      : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 opacity-60 hover:opacity-80"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors ${
                      isCurrent
                        ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                        : isDone
                        ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                        : "bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </div>
                  <div className="truncate">
                    <span
                      className={`text-xs font-medium truncate block ${
                        isCurrent
                          ? "text-[#853953] dark:text-[#A74B6A] font-bold"
                          : isDone
                          ? "text-[#2C2C2C] dark:text-[#F3F4F4]"
                          : "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60"
                      }`}
                    >
                      {s.title}
                    </span>
                    <p className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 truncate hidden sm:block">{s.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Validation Error Alert */}
        {validationError && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <Card className="border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30">
              <CardContent className="p-4 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300 font-medium font-sans">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{validationError}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Dynamic Multi-Step Body */}
        <AnimatePresence mode="wait">
          {/* ========================================================================= */}
          {/* STEP 1: UNIFIED ENDPOINT, CREDENTIALS & MODEL STUDIO                      */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                        <Sliders className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                          Target Provider, Connection & Model
                        </CardTitle>
                        <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                          Configure inference provider endpoint, credentials, and select discovered target model
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.vendor !== "mock" && (
                        <Badge variant="emerald" className="gap-1 font-medium hidden sm:flex">
                          <ShieldCheck className="h-3 w-3" />
                          Zero-persistence
                        </Badge>
                      )}
                      <Badge variant="default" className="text-xs font-medium">Step 1 of 4</Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-3 space-y-6">
                  {/* 1. Provider Selection Grid */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                        1. Select Inference Provider
                      </Label>
                      <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                        Select target architecture
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: "mock", label: "Mock Engine", desc: "Local 0-cost simulator", badge: "Free", vendor: "mock" },
                        { id: "openai", label: "OpenAI", desc: "GPT-4o, o3-mini, o1", badge: "Direct", vendor: "openai" },
                        { id: "anthropic", label: "Anthropic", desc: "Claude 3.7 & 3.5 Sonnet", badge: "Direct", vendor: "anthropic" },
                        { id: "openai_compatible", label: "vLLM / Groq", desc: "OpenRouter & self-hosted", badge: "Custom", vendor: "openrouter" },
                      ].map((v) => {
                        const isSelected = config.vendor === v.id;
                        return (
                          <motion.button
                            key={v.id}
                            type="button"
                            whileHover={{ y: -1, scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => {
                              const newVendor = v.id as VendorType;
                              onChange({ ...config, vendor: newVendor });
                            }}
                            className={`group rounded-xl p-3.5 text-left border transition-all cursor-pointer font-sans select-none flex flex-col justify-between gap-2.5 ${
                              isSelected
                                ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 shadow-xs ring-1 ring-[#853953]/30 dark:ring-[#A74B6A]/40 text-[#853953] dark:text-[#A74B6A]"
                                : "border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C] hover:border-[#853953]/30 dark:hover:border-[#A74B6A]/30 text-[#2C2C2C] dark:text-[#F3F4F4]"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                    isSelected
                                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-2xs"
                                      : "bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 group-hover:text-[#853953] dark:group-hover:text-[#A74B6A]"
                                  }`}
                                >
                                  <ProviderLogo vendor={v.vendor} className="h-3.5 w-3.5" />
                                </div>
                                <span
                                  className={`text-xs font-semibold ${
                                    isSelected ? "text-[#853953] dark:text-[#A74B6A] font-bold" : "text-[#2C2C2C] dark:text-[#F3F4F4]"
                                  }`}
                                >
                                  {v.label}
                                </span>
                              </div>
                              {isSelected ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                  {v.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 truncate">{v.desc}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* 2. Endpoint Connection & Ephemeral Auth */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                        2. Endpoint Connection & Credentials
                      </Label>
                      <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                        Process memory only • Scrubbed on exit
                      </span>
                    </div>

                    {config.vendor === "mock" ? (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-medium text-emerald-950 dark:text-emerald-200">
                            Mock Simulator Active
                          </h4>
                          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                            Zero tokens required. Realistic streaming latencies, DeepSeek-R1 reasoning traces, and token jitter simulated locally in RAM.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* LEFT COLUMN: Endpoint Base URL & Presets */}
                        <div className="rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 p-4 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-3 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="base-url-input" className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                                <Server className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                                Endpoint Base URL
                              </Label>
                              <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-mono">
                                {POPULAR_BASE_URLS.length} Presets
                              </span>
                            </div>

                            {/* Preset Dropdown */}
                            <Select
                              value={
                                POPULAR_BASE_URLS.find((p) => p.baseUrl === credential.base_url)?.id ||
                                (credential.base_url ? "custom" : "")
                              }
                              onValueChange={(val) => {
                                const preset = POPULAR_BASE_URLS.find((p) => p.id === val);
                                if (preset) {
                                  onCredentialChange({ ...credential, base_url: preset.baseUrl });
                                  if (preset.suggestedModels?.[0]) {
                                    onChange({ ...config, model: preset.suggestedModels[0] });
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="w-full h-9 font-sans text-xs bg-white dark:bg-[#252426] border-[#2C2C2C]/15 dark:border-[#F3F4F4]/15">
                                <SelectValue placeholder="Select provider preset..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {(["Aggregator", "Fast Inference", "Frontier Provider", "Local Self-Hosted"] as const).map((category) => (
                                  <SelectGroup key={category}>
                                    <SelectLabel className="text-[10px] uppercase font-mono tracking-wider text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                                      {category}
                                    </SelectLabel>
                                    {POPULAR_BASE_URLS.filter((p) => p.category === category).map((p) => (
                                      <SelectItem key={p.id} value={p.id} className="text-xs py-1.5 cursor-pointer">
                                        <div className="flex items-center justify-between gap-4 w-full">
                                          <div className="flex items-center gap-2">
                                            <ProviderLogo vendor={p.id} className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A] shrink-0" />
                                            <span className="font-medium">{p.name}</span>
                                          </div>
                                          <span className="font-mono text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 truncate max-w-[180px]">
                                            {p.baseUrl}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Direct URL Input */}
                            <div className="relative">
                              <Input
                                id="base-url-input"
                                type="text"
                                value={credential.base_url || ""}
                                onChange={(e) => onCredentialChange({ ...credential, base_url: e.target.value })}
                                placeholder={
                                  config.vendor === "anthropic"
                                    ? "https://api.anthropic.com/v1"
                                    : config.vendor === "openai"
                                    ? "https://api.openai.com/v1"
                                    : "https://openrouter.ai/api/v1 or http://localhost:8000/v1"
                                }
                                className="font-mono text-xs bg-white dark:bg-[#252426]"
                              />
                            </div>
                          </div>

                          {/* Quick Chips */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#2C2C2C]/8 dark:border-[#F3F4F4]/8">
                            <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans">Quick pick:</span>
                            {POPULAR_BASE_URLS.slice(0, 6).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  onCredentialChange({ ...credential, base_url: p.baseUrl });
                                  if (p.suggestedModels?.[0]) {
                                    onChange({ ...config, model: p.suggestedModels[0] });
                                  }
                                }}
                                className={`h-5 text-[10px] px-2 rounded-md font-mono border transition-colors cursor-pointer ${
                                  credential.base_url === p.baseUrl
                                    ? "bg-[#853953]/10 dark:bg-[#A74B6A]/20 border-[#853953]/40 dark:border-[#A74B6A]/50 text-[#853953] dark:text-[#A74B6A] font-bold"
                                    : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:bg-[#F3F4F4] dark:hover:bg-[#353337]"
                                }`}
                              >
                                {p.id}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* RIGHT COLUMN: API Key & Ephemeral Auth */}
                        <div className="rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 p-4 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-3 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="api-key-input" className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                                <Lock className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                                {config.vendor === "anthropic" ? "Anthropic API Key" : "Provider API Key"}
                              </Label>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                                In-Memory Only
                              </span>
                            </div>

                            <div className="relative">
                              <Input
                                id="api-key-input"
                                type={showKey ? "text" : "password"}
                                value={credential.api_key || ""}
                                onChange={(e) => onCredentialChange({ ...credential, api_key: e.target.value })}
                                placeholder={
                                  config.vendor === "anthropic"
                                    ? "sk-ant-api03-..."
                                    : config.vendor === "openai"
                                    ? "sk-proj-..."
                                    : "sk-or-v1-... or gsk_... (optional for local)"
                                }
                                className="pr-10 font-mono text-xs bg-white dark:bg-[#252426]"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-1 top-0.5 h-8 w-8 text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4] cursor-pointer"
                              >
                                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                            </div>

                            <p className="text-[11px] text-[#2C2C2C]/55 dark:text-[#F3F4F4]/55 leading-relaxed">
                              {config.vendor === "openai_compatible"
                                ? "API key is passed in the Authorization header. Leave blank for self-hosted local engines."
                                : "Bearer token used exclusively for socket telemetry requests during this test session."}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-[#2C2C2C]/8 dark:border-[#F3F4F4]/8 text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Zero disk storage • Key is never logged to disk or reports</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* 3. Target Model Selection (Live Discovered Dropdown) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                          3. Target Model Selection
                        </Label>
                        <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                          {isLoadingModels
                            ? "Querying base URL for models..."
                            : availableModels.length > 0
                            ? `${availableModels.length} models retrieved from base URL`
                            : canFetchModels
                            ? "Click Fetch or select a model"
                            : "Enter API key & Base URL above to query live models"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Live Connection Status Badge */}
                        {availableModels.length > 0 && !isLoadingModels && (
                          <Badge variant="emerald" className="gap-1 font-mono text-[10px] px-2 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {availableModels.length} models
                          </Badge>
                        )}

                        {/* Toggle Custom vs Dropdown */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsCustomModel(!isCustomModel)}
                          className="h-7 text-[11px] font-medium px-2.5 rounded-lg text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                        >
                          {isCustomModel ? (
                            <span className="flex items-center gap-1.5">
                              <ListFilter className="h-3 w-3" /> Select from list
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Edit3 className="h-3 w-3" /> Custom model ID
                            </span>
                          )}
                        </Button>

                        {/* Refresh / Fetch Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isLoadingModels || !canFetchModels}
                          onClick={fetchModels}
                          className="h-7 text-[11px] px-2.5 rounded-lg font-medium gap-1.5 cursor-pointer disabled:opacity-40"
                          title={canFetchModels ? "Query base URL for models" : "Enter API key and Base URL to fetch models"}
                        >
                          <RotateCw className={`h-3 w-3 ${isLoadingModels ? "animate-spin text-[#853953] dark:text-[#A74B6A]" : ""}`} />
                          <span>{isLoadingModels ? "Fetching..." : "Fetch"}</span>
                        </Button>
                      </div>
                    </div>

                    {isCustomModel ? (
                      <div className="space-y-1.5">
                        <Input
                          id="model-custom-input"
                          value={config.model}
                          onChange={(e) => onChange({ ...config, model: e.target.value })}
                          placeholder="e.g. gpt-4o or deepseek-ai/deepseek-r1"
                          className="font-mono text-xs"
                        />
                        <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                          Manually entered identifier for unlisted, fine-tuned, or private endpoints.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Select
                          value={config.model || ""}
                          onValueChange={(val) => onChange({ ...config, model: val })}
                          disabled={isLoadingModels && availableModels.length === 0}
                        >
                          <SelectTrigger id="model-select-dropdown" className="w-full h-10 font-mono text-xs">
                            <SelectValue placeholder={isLoadingModels ? "Querying models from base URL..." : "Select a model..."} />
                          </SelectTrigger>
                          <SelectContent className="max-h-80">
                            <SelectGroup>
                              <SelectLabel className="text-[11px] uppercase tracking-wider text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-mono">
                                {config.vendor === "openai_compatible"
                                  ? `Discovered Endpoint Models (${availableModels.length})`
                                  : `${config.vendor.toUpperCase()} Models (${availableModels.length})`}
                              </SelectLabel>
                              {/* All fetched models */}
                              {availableModels.map((m) => (
                                <SelectItem key={m} value={m} className="font-mono text-xs py-2">
                                  {m}
                                </SelectItem>
                              ))}
                              {/* Current model fallback if not present */}
                              {config.model && !availableModels.includes(config.model) && (
                                <SelectItem value={config.model} className="font-mono text-xs py-2">
                                  {config.model} (current)
                                </SelectItem>
                              )}
                              {availableModels.length === 0 && !isLoadingModels && (
                                <div className="p-3 text-xs text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 text-center font-sans">
                                  No models retrieved. Enter base URL / API key above and click Fetch.
                                </div>
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Custom Token Pricing Inputs — pre-filled from registry, fully editable */}
                    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/60 dark:bg-[#252426] p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                          Token pricing per 1M tokens (USD)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const [p, c] = getModelPricing(config.model, config.vendor);
                            setCustomPromptPrice(p.toFixed(4));
                            setCustomCompletionPrice(c.toFixed(4));
                          }}
                          className="flex items-center gap-1 text-[10px] text-[#853953] dark:text-[#A74B6A] hover:underline font-medium font-mono cursor-pointer"
                          title="Reset to registry rate"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          <span>Reset to standard</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-mono">
                            Input (prompt) $/1M
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-mono pointer-events-none">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={customPromptPrice}
                              onChange={(e) => setCustomPromptPrice(e.target.value)}
                              className="pl-5 font-mono text-xs h-8 text-[#853953] dark:text-[#A74B6A] font-bold"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-mono">
                            Output (completion) $/1M
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-mono pointer-events-none">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={customCompletionPrice}
                              onChange={(e) => setCustomCompletionPrice(e.target.value)}
                              className="pl-5 font-mono text-xs h-8 text-[#612D53] dark:text-[#C57BB2] font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans">
                        {config.vendor === "openai_compatible" && credential.base_url?.includes("openrouter.ai")
                          ? "Pre-filled from OpenRouter dynamic schema · edit for enterprise negotiated rates"
                          : config.vendor === "mock"
                          ? "Mock engine · always $0.00 · no billing"
                          : "Pre-filled from official published rates · edit for custom GPU pricing or enterprise discounts"}
                      </p>
                    </div>

                    {/* Inline Error Notice */}
                    {modelFetchError && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span className="truncate">Could not list models: {modelFetchError}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={fetchModels}
                          className="h-6 text-[11px] px-2 underline hover:no-underline text-amber-800 dark:text-amber-200 font-medium"
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: WORKLOAD PROFILE & SAMPLING PARAMETERS                            */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                          Workload Profile & Sampling Parameters
                        </CardTitle>
                        <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                          Select real-world token distribution profile and fine-tune output sampling bounds
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="text-xs font-medium">Step 2 of 4</Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-2 space-y-6">
                  {/* Preset Selector Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {PRESET_OPTIONS.map((preset) => {
                      const Icon = preset.icon;
                      const isSelected = config.workload_preset === preset.id;
                      const total = preset.promptTokens + preset.genTokens;
                      const promptPct = (preset.promptTokens / total) * 100;
                      const genPct = (preset.genTokens / total) * 100;

                      return (
                        <div
                          key={preset.id}
                          onClick={() => onChange({ ...config, workload_preset: preset.id })}
                          className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between relative overflow-hidden group font-sans active:scale-[0.99] ${
                            isSelected
                              ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 shadow-xs ring-1 ring-[#853953]/30 dark:ring-[#A74B6A]/40 text-[#853953] dark:text-[#A74B6A]"
                              : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:border-[#853953]/30 dark:hover:border-[#A74B6A]/30 hover:bg-[#F3F4F4]/50 dark:hover:bg-[#2C2C2C]"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`p-2 rounded-lg border transition-colors ${
                                    isSelected
                                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white border-[#853953] dark:border-[#A74B6A]"
                                      : "bg-[#F3F4F4] dark:bg-[#2C2C2C] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 group-hover:text-[#2C2C2C] dark:group-hover:text-[#F3F4F4]"
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">{preset.name}</div>
                                  <div className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-mono">
                                    {(preset.promptTokens + preset.genTokens).toLocaleString()} tok total
                                  </div>
                                </div>
                              </div>
                              {isSelected && <span className="h-2 w-2 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />}
                            </div>
                            <p className="text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed pt-1">{preset.desc}</p>
                          </div>

                          {/* Token Ratio Mini Bar */}
                          <div className="mt-4 pt-3 border-t border-[#F3F4F4] dark:border-[#F3F4F4]/10 space-y-1.5">
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                                Prompt: <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">{preset.promptTokens.toLocaleString()}</strong>
                              </span>
                              <span className="text-[#853953] dark:text-[#A74B6A]">
                                Gen: <strong>{preset.genTokens.toLocaleString()}</strong>
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[#F3F4F4] dark:bg-[#2C2C2C] flex overflow-hidden border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                              <div style={{ width: `${promptPct}%` }} className="bg-[#612D53] dark:bg-[#7E3B6C]" />
                              <div style={{ width: `${genPct}%` }} className="bg-[#853953] dark:bg-[#A74B6A]" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  {/* Sampling Parameters & Donut Chart Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                    {/* Sliders for Max Tokens & Temperature */}
                    <div className="space-y-5">
                      {/* Max Tokens Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <Label>Max Output Tokens (max_tokens)</Label>
                          <Badge variant="default" className="font-mono text-xs font-medium">
                            {config.max_tokens} tokens
                          </Badge>
                        </div>
                        <Slider
                          min={64}
                          max={4096}
                          step={64}
                          value={[config.max_tokens]}
                          onValueChange={(val) => onChange({ ...config, max_tokens: val[0] })}
                        />
                        <div className="flex justify-between text-[11px] font-mono text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                          <span>64 (Micro-response)</span>
                          <span>1024</span>
                          <span>4096 (Deep code/RAG)</span>
                        </div>
                      </div>

                      {/* Temperature Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <Label>Sampling Temperature</Label>
                          <Badge variant="default" className="font-mono text-xs font-medium">
                            {getTemperatureLabel(config.temperature)}
                          </Badge>
                        </div>
                        <Slider
                          min={0.0}
                          max={1.5}
                          step={0.05}
                          value={[config.temperature]}
                          onValueChange={(val) => onChange({ ...config, temperature: Number(val[0].toFixed(2)) })}
                        />
                        <div className="flex justify-between text-[11px] font-mono text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                          <span>0.0 (Deterministic)</span>
                          <span>0.7 (Standard)</span>
                          <span>1.5 (Creative)</span>
                        </div>
                      </div>
                    </div>

                    {/* Donut Chart Visualization */}
                    <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 p-4">
                      <div className="text-center pb-2">
                        <h4 className="text-xs font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                          {selectedPreset.name} Token Ratio
                        </h4>
                        <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                          Total ~{totalPresetTokens.toLocaleString()} tokens per transaction
                        </span>
                      </div>
                      <DonutChart
                        data={[
                          { name: "Prompt prefill", value: selectedPreset.promptTokens, color: "#612D53" },
                          { name: "Generation decode", value: selectedPreset.genTokens, color: "#853953" },
                        ]}
                        label="Tokens"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: TRAFFIC DYNAMICS, STRATEGY & FINANCIAL GUARDRAILS                 */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Execution Strategy & Traffic Dynamics */}
                <Card>
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                            Traffic Dynamics & Strategy
                          </CardTitle>
                          <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                            Choose between time-based sustained stream or fixed-count requests
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="default" className="text-xs font-medium">Step 3 of 4</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-2 space-y-5">
                    {/* Strategy Switcher: Time-Based vs Request-Based */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                        Benchmark Execution Strategy
                      </Label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Option 1: Time-Based */}
                        <button
                          type="button"
                          onClick={() => onChange({ ...config, test_mode: "duration" })}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            !isRequestMode
                              ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 text-[#853953] dark:text-[#A74B6A] ring-1 ring-[#853953]/30 shadow-xs"
                              : "border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                              <span className="text-xs font-medium">Time-Based (Duration)</span>
                            </div>
                            {!isRequestMode && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                            )}
                          </div>
                          <p className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 line-clamp-2">
                            Continuous load stream over fixed seconds • Evaluates sustained throughput
                          </p>
                        </button>

                        {/* Option 2: Request-Based */}
                        <button
                          type="button"
                          onClick={() => onChange({ ...config, test_mode: "requests" })}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isRequestMode
                              ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 text-[#853953] dark:text-[#A74B6A] ring-1 ring-[#853953]/30 shadow-xs"
                              : "border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                              <span className="text-xs font-medium">Request-Based (Count)</span>
                            </div>
                            {isRequestMode && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                            )}
                          </div>
                          <p className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 line-clamp-2">
                            Exact total request batch • 100% deterministic budget and sample volume
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Conditional Scope Slider (Duration vs Request Count) */}
                    {isRequestMode ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <Label className="flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                            Total Request Batch Volume
                          </Label>
                          <Badge variant="default" className="font-mono text-xs font-medium">
                            {config.total_requests || 50} total requests
                          </Badge>
                        </div>
                        <Slider
                          min={5}
                          max={500}
                          step={5}
                          value={[config.total_requests || 50]}
                          onValueChange={(val) => onChange({ ...config, total_requests: val[0] })}
                        />
                        <div className="flex justify-between text-[11px] font-mono text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                          <span>5 reqs (canary)</span>
                          <span>100 reqs (eval)</span>
                          <span>500 reqs (batch)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <Label className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                            Test Duration
                          </Label>
                          <Badge variant="default" className="font-mono text-xs font-medium">
                            {config.duration_seconds} seconds
                          </Badge>
                        </div>
                        <Slider
                          min={5}
                          max={120}
                          step={5}
                          value={[config.duration_seconds]}
                          onValueChange={(val) => onChange({ ...config, duration_seconds: val[0] })}
                        />
                        <div className="flex justify-between text-[11px] font-mono text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                          <span>5s quick test</span>
                          <span>60s standard</span>
                          <span>120s soak</span>
                        </div>
                      </div>
                    )}

                    {/* Concurrency Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <Label>Parallel Worker Streams (Concurrency)</Label>
                        <Badge variant="default" className="font-mono text-xs font-medium">
                          {config.concurrency} concurrent streams
                        </Badge>
                      </div>
                      <Slider
                        min={1}
                        max={50}
                        step={1}
                        value={[config.concurrency]}
                        onValueChange={(val) => onChange({ ...config, concurrency: val[0] })}
                      />
                      <div className="flex justify-between text-[11px] font-mono text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                        <span>1 worker</span>
                        <span>25 workers</span>
                        <span>50 workers (saturation)</span>
                      </div>
                    </div>

                    {/* Load Curve Selector Tiles */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Arrival Load Curve</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {LOAD_CURVE_OPTIONS.map((curve) => {
                          const Icon = curve.icon;
                          const isSelected = config.load_curve === curve.id;
                          return (
                            <button
                              key={curve.id}
                              type="button"
                              onClick={() => onChange({ ...config, load_curve: curve.id })}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer select-none active:scale-[0.98] ${
                                isSelected
                                  ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 text-[#853953] dark:text-[#A74B6A] ring-1 ring-[#853953]/20 font-medium shadow-xs"
                                  : "border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C] hover:border-[#853953]/30 dark:hover:border-[#A74B6A]/30 text-[#2C2C2C] dark:text-[#F3F4F4]"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <Icon className="h-3.5 w-3.5" />
                                <span className="text-[11px] truncate font-medium">{curve.label}</span>
                              </div>
                              <p className="text-[9px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 line-clamp-1">{curve.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Prefix Caching Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="cache-bust-toggle" className="cursor-pointer">
                          Defeat prefix caching
                        </Label>
                        <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                          Injects unique nonces to evaluate cold inference latency
                        </p>
                      </div>
                      <Switch
                        id="cache-bust-toggle"
                        checked={config.cache_bust}
                        onCheckedChange={(checked) => onChange({ ...config, cache_bust: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Financial Circuit Breaker & Spend Calculator */}
                <Card className="flex flex-col justify-between">
                  <div>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                            Financial Circuit Breaker & Projections
                          </CardTitle>
                          <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                            {isRequestMode
                              ? "100% deterministic cost based on exact request count"
                              : "Pre-flight estimate calculated from worker throughput"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-4">
                      {/* Hard Spend Cap Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <Label>Hard spend cap ceiling</Label>
                          <Badge variant="emerald" className="font-mono text-xs font-medium">
                            {formatUsd(config.hard_spend_cap)} max
                          </Badge>
                        </div>
                        <Slider
                          min={0.25}
                          max={10.0}
                          step={0.25}
                          value={[config.hard_spend_cap || 2.0]}
                          onValueChange={(val) => onChange({ ...config, hard_spend_cap: val[0] })}
                        />
                        <div className="flex justify-between text-[11px] font-mono text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                          <span>$0.25</span>
                          <span>$5.00</span>
                          <span>$10.00</span>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  {/* Real-Time Spend Projection Widget */}
                  <div className="p-5 pt-0 space-y-3">
                    <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 font-medium flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                          {isRequestMode ? "Deterministic total spend" : "Pre-flight calculated spend"}
                        </span>
                        <span className="text-sm font-extrabold font-mono text-[#853953] dark:text-[#A74B6A]">
                          {isEstimating ? "Calculating..." : formatUsd(estCost)}
                        </span>
                      </div>

                      {/* Utilization Gauge Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-sans">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Spend cap utilization:</span>
                          <strong className={`font-mono ${willTripCap ? "text-rose-700 dark:text-rose-400 font-bold" : "text-[#612D53] dark:text-[#C57BB2]"}`}>
                            {spendPct}% of {formatUsd(capVal)}
                          </strong>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full transition-all duration-150 ${
                              willTripCap ? "bg-rose-600 dark:bg-rose-500" : "bg-[#853953] dark:bg-[#A74B6A]"
                            }`}
                            style={{ width: `${Math.min(100, (estCost / capVal) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Alert if estimated spend exceeds cap */}
                      {willTripCap && (
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 font-medium flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                          <span>Estimated spend ({formatUsd(estCost)}) exceeds cap. Test will stop early!</span>
                        </div>
                      )}

                      {/* Request and Token metrics */}
                      <div className="flex justify-between text-xs font-mono text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 pt-2 border-t border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                        <span>
                          {isRequestMode ? "Target requests: " : "Est. requests: "}
                          <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">
                            {costEstimate?.estimated_requests || 0}
                          </strong>
                        </span>
                        <span>
                          Total tokens:{" "}
                          <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">
                            ~{costEstimate?.estimated_total_tokens.toLocaleString() || 0}
                          </strong>
                        </span>
                      </div>

                      {/* Pricing Rate Note */}
                      <div className="flex justify-between text-[11px] font-mono text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 pt-1.5 border-t border-[#2C2C2C]/5 dark:border-[#F3F4F4]/5">
                        <span>Active token rate:</span>
                        <span className="font-medium text-[#853953] dark:text-[#A74B6A]">
                          ${(resolvedPromptPrice ?? getModelPricing(config.model, config.vendor)[0]).toFixed(2)} in / ${(resolvedCompletionPrice ?? getModelPricing(config.model, config.vendor)[1]).toFixed(2)} out per 1M
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: STREAMLINED PRE-FLIGHT REVIEW & LAUNCH COCKPIT                    */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-5"
            >
              <Card>
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                          Pre-Flight Configuration Review & Cockpit
                        </CardTitle>
                        <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                          Verify benchmark target parameters, load dynamics, budget limits, and latency SLOs
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="emerald" className="font-medium text-xs gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Ready to Launch
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-3 space-y-5">
                  {/* 1. Quick Glance Compact Summary Bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 space-y-0.5">
                      <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-mono">Target Model</span>
                      <div className="font-mono font-bold text-xs text-[#853953] dark:text-[#A74B6A] truncate">{config.model}</div>
                      <span className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 capitalize">{config.vendor} endpoint</span>
                    </div>

                    <div className="p-3 rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 space-y-0.5">
                      <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-mono">Workload Profile</span>
                      <div className="font-sans font-bold text-xs text-[#2C2C2C] dark:text-[#F3F4F4] truncate">{selectedPreset.name}</div>
                      <span className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-mono">~{totalPresetTokens} tokens/req</span>
                    </div>

                    <div className="p-3 rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 space-y-0.5">
                      <span className="text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-mono">Concurrency & Scope</span>
                      <div className="font-mono font-bold text-xs text-[#2C2C2C] dark:text-[#F3F4F4] truncate">{config.concurrency} worker streams</div>
                      <span className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                        {isRequestMode ? `${config.total_requests || 50} total reqs` : `${config.duration_seconds}s • ${config.load_curve}`}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-0.5">
                      <span className="text-[10px] text-emerald-800/60 dark:text-emerald-300/60 uppercase tracking-wider font-mono">Budget & Cap</span>
                      <div className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300 truncate">{formatUsd(config.hard_spend_cap)} cap</div>
                      <span className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 font-mono">Est spend: {formatUsd(estCost)}</span>
                    </div>
                  </div>

                  {/* 2. Structured Pre-Flight Specification Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Box A: Infrastructure & Sampling */}
                    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-3.5 space-y-2.5 text-xs">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 font-medium text-[#853953] dark:text-[#A74B6A]">
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Target & Sampling</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] font-sans">
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Provider:</span>
                          <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4] capitalize">{config.vendor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Model ID:</span>
                          <span className="font-mono font-medium text-[#853953] dark:text-[#A74B6A] truncate max-w-[140px]">{config.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Max Tokens:</span>
                          <span className="font-mono font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{config.max_tokens}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Temperature:</span>
                          <span className="font-mono font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{config.temperature}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Cache Busting:</span>
                          <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{config.cache_bust ? "Enabled" : "Standard"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Box B: Traffic & Execution Strategy */}
                    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-3.5 space-y-2.5 text-xs">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 font-medium text-[#612D53] dark:text-[#C57BB2]">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Execution Strategy</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] font-sans">
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Test Mode:</span>
                          <Badge variant="outline" className="text-[10px] font-mono capitalize py-0">
                            {config.test_mode === "requests" ? "Request Batch" : "Time Duration"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Concurrency:</span>
                          <span className="font-mono font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{config.concurrency} streams</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                            {isRequestMode ? "Batch Target:" : "Duration:"}
                          </span>
                          <span className="font-mono font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                            {isRequestMode ? `${config.total_requests || 50} requests` : `${config.duration_seconds}s`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Arrival Curve:</span>
                          <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4] capitalize">{config.load_curve}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Warmup Calls:</span>
                          <span className="font-mono font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{config.warmup_requests} requests</span>
                        </div>
                      </div>
                    </div>

                    {/* Box C: Budget & Latency SLO Targets */}
                    <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] p-3.5 space-y-2.5 text-xs">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 font-medium text-emerald-700 dark:text-emerald-300">
                        <Gauge className="h-3.5 w-3.5" />
                        <span>Projections & SLOs</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] font-sans">
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Est. Total Tokens:</span>
                          <span className="font-mono font-medium text-[#853953] dark:text-[#A74B6A]">~{costEstimate?.estimated_total_tokens.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Projected Spend:</span>
                          <span className="font-mono font-medium text-emerald-700 dark:text-emerald-300">{formatUsd(estCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Max TTFT SLO:</span>
                          <span className="font-mono font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">≤ {formatMs(config.slo.max_ttft_ms)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Max TPOT SLO:</span>
                          <span className="font-mono font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">≤ {formatMs(config.slo.max_tpot_ms)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Max Error SLO:</span>
                          <span className="font-mono font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">≤ {formatPct(config.slo.max_error_rate_pct)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Launch Action Button */}
              <Button
                type="button"
                variant="amberGlow"
                size="lg"
                onClick={onLaunch}
                disabled={isLaunching}
                className="w-full h-14 text-sm font-bold gap-3 shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-[0.99]"
              >
                <Play className="h-4 w-4 fill-white" />
                {isLaunching ? "Initializing benchmark session..." : "Launch live benchmark studio (microsecond telemetry stream)"}
              </Button>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Wizard Navigation Controls (Back / Next) */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="rounded-xl px-4 font-medium gap-2 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {currentStep < 4 && (
            <Button
              type="button"
              variant="default"
              onClick={handleNext}
              className="rounded-xl px-5 font-medium gap-2 cursor-pointer"
            >
              Next step
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
