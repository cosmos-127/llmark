import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  FileSearch,
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
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  RotateCcw,
  Edit3,
  ListFilter,
  Gauge,
  Target,
  Search,
  X,
  Network,
  Radio,
  Lightbulb,
  Terminal,
  Copy,
  Workflow,
  Timer,
  FileCode,
} from "lucide-react";
import {
  BenchmarkConfig,
  CostEstimate,
  VendorCredential,
  VendorType,
  WorkloadPreset,
  LoadCurveType,
  TestMode,
  SLOThresholds,
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
import { TooltipProvider } from "@/components/ui/tooltip";
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

interface TestConfiguratorProps {
  config: BenchmarkConfig;
  credential: VendorCredential;
  onChange: (config: BenchmarkConfig) => void;
  onCredentialChange: (cred: VendorCredential) => void;
  onLaunch: () => void;
  isLaunching: boolean;
}

export type WorkloadCategory =
  | "all"
  | "latency"
  | "throughput"
  | "reasoning"
  | "heavy_context"
  | "structured"
  | "rate_limit"
  | "custom";

const PRESET_OPTIONS: {
  id: WorkloadPreset;
  name: string;
  desc: string;
  category: WorkloadCategory;
  icon: any;
  promptTokens: number;
  genTokens: number;
  tag: string;
  metrics: string[];
}[] = [
  {
    id: "chat_interactive",
    name: "Interactive Conversational",
    desc: "Real-time conversational streaming responsiveness, reading speed & decode smoothness",
    category: "latency",
    icon: MessageSquare,
    promptTokens: 200,
    genTokens: 150,
    tag: "Human conversational",
    metrics: ["TTFT P95", "ITL P95", "TPOT", "Goodput"],
  },
  {
    id: "prefill_ttft",
    name: "Prefill Scaling & TTFT",
    desc: "Heavy document context with 1-token output isolating pure KV prefill velocity & TTFT percentiles",
    category: "latency",
    icon: Layers,
    promptTokens: 4000,
    genTokens: 2,
    tag: "Prefill & TTFT focus",
    metrics: ["TTFT P95/P99", "Prefill tok/s", "DNS/TCP/TLS", "Goodput"],
  },
  {
    id: "decode_throughput",
    name: "Streaming Decode & Jitter",
    desc: "Light prompt with long decode stream measuring decode TPS, ITL percentiles & max token freezes",
    category: "throughput",
    icon: Zap,
    promptTokens: 40,
    genTokens: 800,
    tag: "Decode & ITL focus",
    metrics: ["Decode tok/s", "ITL P95", "Max Freeze", "TPOT Mean"],
  },
  {
    id: "reasoning_cot",
    name: "Reasoning & CoT Deep-Dive",
    desc: "Chain-of-thought prompts measuring Time to First Answer (TTFA), thinking duration & token budget",
    category: "reasoning",
    icon: Sparkles,
    promptTokens: 300,
    genTokens: 800,
    tag: "Reasoning & TTFA",
    metrics: ["TTFA P95", "Thinking tok/s", "Reasoning Ratio", "Goodput"],
  },
  {
    id: "rag_synthesis",
    name: "Enterprise RAG Synthesis",
    desc: "Heavy document context prefill & KV cache memory loading with synthesized answers",
    category: "heavy_context",
    icon: FileSearch,
    promptTokens: 3500,
    genTokens: 400,
    tag: "Context heavy / RAG",
    metrics: ["E2E Latency", "TTFT P95", "Decode TPS", "Goodput"],
  },
  {
    id: "structured_json",
    name: "Structured JSON & Grammar",
    desc: "Guided grammar decoding measuring JSON syntax validity compliance & constrained decode speed",
    category: "structured",
    icon: Braces,
    promptTokens: 600,
    genTokens: 300,
    tag: "Grammar constraint",
    metrics: ["Schema Validity %", "Constrained TPS", "TPOT Mean", "Parse Errors"],
  },
  {
    id: "rate_limit_probe",
    name: "Rate Limit & Quota Probing",
    desc: "Micro-token calls (5 in / 2 out) probing HTTP 429 ceilings, RPM/TPM saturation & backoff delays",
    category: "rate_limit",
    icon: ShieldCheck,
    promptTokens: 5,
    genTokens: 2,
    tag: "Micro-cost / 429 probe",
    metrics: ["HTTP 429 %", "Saturated RPM", "Saturated TPM", "Status Codes"],
  },
  {
    id: "custom",
    name: "Custom Workload Studio",
    desc: "User-defined prompt payload, custom token bounds & full telemetry matrix",
    category: "custom",
    icon: Sliders,
    promptTokens: 500,
    genTokens: 500,
    tag: "User custom",
    metrics: ["TTFT P95", "ITL P95", "Decode tok/s", "Full Suite"],
  },
];

const CATEGORY_TABS: { id: WorkloadCategory; label: string }[] = [
  { id: "all", label: "All Profiles (8)" },
  { id: "latency", label: "Latency & TTFT" },
  { id: "throughput", label: "Decode & Jitter" },
  { id: "reasoning", label: "Reasoning & CoT" },
  { id: "heavy_context", label: "Enterprise RAG" },
  { id: "structured", label: "Structured JSON" },
  { id: "rate_limit", label: "429 Rate Limits" },
  { id: "custom", label: "Custom Studio" },
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
  {
    id: "poisson",
    label: "Poisson Arrival",
    desc: "Stochastic arrival modeling production traffic",
    icon: Radio,
  },
];

const DEFAULT_JSON_SCHEMA = JSON.stringify(
  {
    type: "object",
    properties: {
      service: { type: "string" },
      status: { type: "string", enum: ["healthy", "degraded", "down"] },
      latency_ms: { type: "number" },
      metrics: {
        type: "object",
        properties: {
          cpu: { type: "number" },
          memory_pct: { type: "number" },
        },
        required: ["cpu", "memory_pct"],
      },
    },
    required: ["service", "status", "latency_ms"],
  },
  null,
  2
);

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
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Model discovery state
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);

  // Workload search & category filter state
  const [workloadSearchQuery, setWorkloadSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<WorkloadCategory>("all");

  // Custom JSON Schema raw string
  const [rawJsonSchema, setRawJsonSchema] = useState<string>(() => {
    return config.json_schema ? JSON.stringify(config.json_schema, null, 2) : DEFAULT_JSON_SCHEMA;
  });
  const [jsonSchemaError, setJsonSchemaError] = useState<string | null>(null);

  // Custom per-1M token price overrides — pre-filled from registry when model/vendor changes
  const [customPromptPrice, setCustomPromptPrice] = useState<string>("");
  const [customCompletionPrice, setCustomCompletionPrice] = useState<string>("");

  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const filteredPresets = useMemo(() => {
    return PRESET_OPTIONS.filter((preset) => {
      if (selectedCategory !== "all" && preset.category !== selectedCategory) {
        return false;
      }
      if (!workloadSearchQuery.trim()) return true;
      const q = workloadSearchQuery.toLowerCase().trim();
      return (
        preset.name.toLowerCase().includes(q) ||
        preset.desc.toLowerCase().includes(q) ||
        preset.tag.toLowerCase().includes(q) ||
        preset.metrics.some((m) => m.toLowerCase().includes(q))
      );
    });
  }, [workloadSearchQuery, selectedCategory]);

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedSnippet("json");
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleCopyCli = () => {
    const cmd = `llmark benchmark --vendor ${config.vendor} --model ${config.model || "gpt-4o"} --preset ${config.workload_preset} --concurrency ${config.concurrency} --${config.test_mode === "requests" ? `requests ${config.total_requests || 50}` : `duration ${config.duration_seconds}`}`;
    navigator.clipboard.writeText(cmd);
    setCopiedSnippet("cli");
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // Auto-prefill custom price fields whenever vendor or model changes
  useEffect(() => {
    const [p, c] = getModelPricing(config.vendor, config.model);
    setCustomPromptPrice(p.toFixed(4));
    setCustomCompletionPrice(c.toFixed(4));
  }, [config.vendor, config.model]);

  // Derived numeric values for cost calculation
  const resolvedPromptPrice = useMemo(() => {
    const v = parseFloat(customPromptPrice);
    return isNaN(v) || v < 0 ? undefined : v;
  }, [customPromptPrice]);

  const resolvedCompletionPrice = useMemo(() => {
    const v = parseFloat(customCompletionPrice);
    return isNaN(v) || v < 0 ? undefined : v;
  }, [customCompletionPrice]);

  // Guard: DO NOT call get models API till required key/creds are entered
  const canFetchModels = useMemo(() => {
    if (config.vendor === "mock") return false;
    const hasKey = !!(credential.api_key && credential.api_key.trim().length > 0);
    const hasUrl = !!(credential.base_url && credential.base_url.trim().length > 0);

    if (config.vendor === "azure_openai") {
      return hasKey && !!(credential.azure_endpoint?.trim() || credential.base_url?.trim());
    }
    if (config.vendor === "openai_compatible") {
      return hasKey && hasUrl;
    }
    if (config.vendor === "openai" || config.vendor === "anthropic") {
      return hasKey;
    }
    if (config.vendor === "gcp_vertex") {
      return !!(credential.gcp_project_id?.trim() || credential.api_key?.trim());
    }
    if (config.vendor === "aws_bedrock") {
      return !!(credential.aws_access_key_id && credential.aws_access_key_id.trim().length > 0);
    }
    return false;
  }, [
    config.vendor,
    credential.api_key,
    credential.base_url,
    credential.azure_endpoint,
    credential.gcp_project_id,
    credential.aws_access_key_id,
  ]);

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
          azure_endpoint: credential.azure_endpoint,
          azure_deployment: credential.azure_deployment,
          azure_api_version: credential.azure_api_version,
          aws_region: credential.aws_region,
          aws_access_key_id: credential.aws_access_key_id,
          aws_secret_access_key: credential.aws_secret_access_key,
          aws_session_token: credential.aws_session_token,
          gcp_auth_mode: credential.gcp_auth_mode,
          gcp_project_id: credential.gcp_project_id,
          gcp_location: credential.gcp_location,
        },
      });
      if (res && res.models && res.models.length > 0) {
        setAvailableModels(res.models);
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
  }, [
    canFetchModels,
    config.vendor,
    credential.api_key,
    credential.base_url,
    credential.organization_id,
    credential.azure_endpoint,
    credential.azure_deployment,
    credential.azure_api_version,
    credential.aws_region,
    credential.aws_access_key_id,
    credential.aws_secret_access_key,
    credential.aws_session_token,
    credential.gcp_auth_mode,
    credential.gcp_project_id,
    credential.gcp_location,
    config.model,
    isCustomModel,
    onChange,
    config,
  ]);

  // Debounced auto-fetch
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

  // Real-time cost calculation
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

  // Sync custom prices back into config
  useEffect(() => {
    onChange({
      ...config,
      custom_prompt_price_per_1m: resolvedPromptPrice,
      custom_completion_price_per_1m: resolvedCompletionPrice,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPromptPrice, resolvedCompletionPrice]);

  const handleJsonSchemaChange = (text: string) => {
    setRawJsonSchema(text);
    if (!text.trim()) {
      setJsonSchemaError(null);
      onChange({ ...config, json_schema: undefined });
      return;
    }
    try {
      const parsed = JSON.parse(text);
      setJsonSchemaError(null);
      onChange({ ...config, json_schema: parsed });
    } catch (e: any) {
      setJsonSchemaError(e.message || "Invalid JSON syntax");
    }
  };

  const handleApplySloPreset = (preset: "strict" | "interactive" | "batch") => {
    let newSlo: SLOThresholds;
    if (preset === "strict") {
      newSlo = { max_ttft_ms: 500.0, max_tpot_ms: 25.0, max_e2e_ms: 5000.0, max_error_rate_pct: 0.5 };
    } else if (preset === "batch") {
      newSlo = { max_ttft_ms: 5000.0, max_tpot_ms: 100.0, max_e2e_ms: 30000.0, max_error_rate_pct: 2.0 };
    } else {
      newSlo = { max_ttft_ms: 1500.0, max_tpot_ms: 50.0, max_e2e_ms: 10000.0, max_error_rate_pct: 1.0 };
    }
    onChange({ ...config, slo: newSlo });
  };

  const validateCurrentStep = (step: number): boolean => {
    setValidationError(null);
    if (step === 1) {
      if (!config.model || config.model.trim().length === 0) {
        setValidationError("Please select or enter a valid target model identifier");
        return false;
      }
      if (
        (config.vendor === "openai" || config.vendor === "anthropic") &&
        (!credential.api_key || credential.api_key.trim().length === 0)
      ) {
        setValidationError(`API key is required for live benchmarking on ${config.vendor}`);
        return false;
      }
      if (config.vendor === "azure_openai") {
        if (!credential.api_key || credential.api_key.trim().length === 0) {
          setValidationError("Azure API Key is required for Azure OpenAI Service");
          return false;
        }
        if (!credential.azure_endpoint?.trim() && !credential.base_url?.trim()) {
          setValidationError("Azure Endpoint URL (e.g. https://my-resource.openai.azure.com) is required");
          return false;
        }
      }
      if (config.vendor === "aws_bedrock" && !credential.aws_access_key_id?.trim()) {
        setValidationError("AWS Access Key ID is required for Bedrock");
        return false;
      }
      if (config.vendor === "gcp_vertex" && !credential.gcp_project_id?.trim() && !credential.api_key?.trim()) {
        setValidationError("GCP Project ID or Gemini API Key is required for Vertex AI / Gemini");
        return false;
      }
    }
    if (step === 2) {
      if ((config.workload_preset === "structured_json" || config.workload_preset === "json_schema") && jsonSchemaError) {
        setValidationError(`JSON Schema has syntax errors: ${jsonSchemaError}`);
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
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-sans tabular-nums text-xs font-semibold transition-colors ${
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
                      className={`text-xs truncate block ${
                        isCurrent
                          ? "text-[#853953] dark:text-[#A74B6A] font-semibold"
                          : isDone
                          ? "text-[#2C2C2C] dark:text-[#F3F4F4] font-medium"
                          : "text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-normal"
                      }`}
                    >
                      {s.title}
                    </span>
                    <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 truncate hidden sm:block">
                      {s.desc}
                    </p>
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

        {/* Responsive Grid: Left Sidebar (Diagnostics/Visuals for Steps 2, 3, 4) + Main Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* 1. LEFT SIDEBAR PANEL (DIAGNOSTICS & TELEMETRY BLUEPRINT FOR STEPS 2, 3, 4)*/}
          {/* ========================================================================= */}
          {currentStep !== 1 && (
            <div className="lg:col-span-4 xl:col-span-4 space-y-4 lg:sticky lg:top-4">
              <AnimatePresence mode="wait">
                {/* STEP 2 SIDEBAR */}
                {currentStep === 2 && (
                <motion.div
                  key="sidebar-step-2"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <Card className="overflow-hidden border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-xs">
                    <CardHeader className="p-4 pb-2.5 bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Layers className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <CardTitle className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Workload Token Dynamics
                            </CardTitle>
                            <CardDescription className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                              Prefill vs decode distribution
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-[11px] font-sans tabular-nums px-2 py-0.5 font-medium">
                          Step 2 / 4
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3.5">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-normal">Selected Profile:</span>
                          <Badge variant="default" className="font-medium text-[11px]">
                            {selectedPreset.name}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed font-normal">
                          {selectedPreset.desc}
                        </p>
                      </div>

                      {/* Visual Donut Chart */}
                      <div className="p-3 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">Token Distribution</span>
                          <span className="font-sans tabular-nums text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-medium">
                            ~{(selectedPreset.promptTokens + Math.min(config.max_tokens, selectedPreset.genTokens)).toLocaleString()} tok / call
                          </span>
                        </div>

                        <div className="w-full flex items-center justify-center py-1">
                          <DonutChart
                            data={[
                              { name: "Prompt Prefill", value: selectedPreset.promptTokens, color: "#612D53" },
                              { name: "Max Generation", value: Math.min(config.max_tokens, selectedPreset.genTokens), color: "#853953" },
                            ]}
                            label="Total Tokens"
                            showLegend={false}
                            innerRadius={38}
                            outerRadius={54}
                            heightClass="h-32"
                          />
                        </div>

                        {/* Visual Ratio Progress Bar */}
                        <div className="space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-[#F3F4F4] dark:bg-[#2C2C2C] overflow-hidden flex">
                            <div
                              style={{
                                width: `${Math.round(
                                  (selectedPreset.promptTokens /
                                    Math.max(1, selectedPreset.promptTokens + Math.min(config.max_tokens, selectedPreset.genTokens))) *
                                    100
                                )}%`,
                              }}
                              className="h-full bg-[#612D53] dark:bg-[#7E3B6C]"
                            />
                            <div
                              style={{
                                width: `${
                                  100 -
                                  Math.round(
                                    (selectedPreset.promptTokens /
                                      Math.max(1, selectedPreset.promptTokens + Math.min(config.max_tokens, selectedPreset.genTokens))) *
                                      100
                                  )
                                }%`,
                              }}
                              className="h-full bg-[#853953] dark:bg-[#A74B6A]"
                            />
                          </div>
                        </div>

                        {/* Legend Mini Cards */}
                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-xs">
                          <div className="p-2 rounded-lg bg-[#612D53]/10 dark:bg-[#7E3B6C]/20 border border-[#612D53]/20 flex flex-col justify-between overflow-hidden">
                            <div className="flex items-center justify-between text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              <span className="truncate font-medium">Prefill (In)</span>
                              <span className="font-sans tabular-nums font-semibold text-[#612D53] dark:text-[#C57BB2] shrink-0">
                                {Math.round(
                                  (selectedPreset.promptTokens /
                                    Math.max(1, selectedPreset.promptTokens + Math.min(config.max_tokens, selectedPreset.genTokens))) *
                                    100
                                )}%
                              </span>
                            </div>
                            <div className="font-semibold font-sans tabular-nums text-xs text-[#612D53] dark:text-[#C57BB2] truncate mt-1">
                              {selectedPreset.promptTokens.toLocaleString()}{" "}
                              <span className="text-[11px] font-normal opacity-80">tok</span>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-[#853953]/10 dark:bg-[#A74B6A]/20 border border-[#853953]/20 flex flex-col justify-between overflow-hidden">
                            <div className="flex items-center justify-between text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              <span className="truncate font-medium">Decode (Out)</span>
                              <span className="font-sans tabular-nums font-semibold text-[#853953] dark:text-[#A74B6A] shrink-0">
                                {100 -
                                  Math.round(
                                    (selectedPreset.promptTokens /
                                      Math.max(1, selectedPreset.promptTokens + Math.min(config.max_tokens, selectedPreset.genTokens))) *
                                      100
                                  )}%
                              </span>
                            </div>
                            <div className="font-semibold font-sans tabular-nums text-xs text-[#853953] dark:text-[#A74B6A] truncate mt-1">
                              {Math.min(config.max_tokens, selectedPreset.genTokens).toLocaleString()}{" "}
                              <span className="text-[11px] font-normal opacity-80">tok</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Isolated Metrics */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-sans tabular-nums uppercase tracking-wider text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-medium">
                          Target Metrics Isolated for this Workload:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedPreset.metrics.map((m) => (
                            <span
                              key={m}
                              className="text-[11px] font-sans tabular-nums px-2 py-0.5 rounded bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 font-medium"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-[#853953]/20 dark:border-[#A74B6A]/20 bg-[#853953]/5 dark:bg-[#A74B6A]/5">
                    <CardContent className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-[#853953] dark:text-[#A74B6A]">
                        <Lightbulb className="h-3.5 w-3.5" />
                        <span>Prefill vs Decode Compute Phases</span>
                      </div>
                      <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed font-normal">
                        <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Prefill</span> computes over the entire prompt at once in parallel (GPU compute/bandwidth bound). <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Decode</span> generates tokens sequentially one by one (memory latency bound). Workload shapes isolate each phase separately.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* STEP 3 SIDEBAR */}
              {currentStep === 3 && (
                <motion.div
                  key="sidebar-step-3"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <Card className="overflow-hidden border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-xs">
                    <CardHeader className="p-4 pb-2.5 bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <TrendingUp className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <CardTitle className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Load Waveform Simulation
                            </CardTitle>
                            <CardDescription className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                              Parallel stream orchestration
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-[11px] font-sans tabular-nums px-2 py-0.5 font-medium">
                          Step 3 / 4
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3.5">
                      <div className="p-3 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">Traffic Shape:</span>
                          <Badge variant="default" className="font-medium text-[11px] capitalize">
                            {config.load_curve.replace("_", " ")}
                          </Badge>
                        </div>

                        {/* Waveform mini visual */}
                        <div className="h-16 w-full rounded-lg bg-[#F3F4F4] dark:bg-[#2C2C2C] flex items-center justify-center p-2 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                          {config.load_curve === "constant" && (
                            <div className="w-full flex items-center justify-between gap-1 px-3">
                              {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex-1 h-6 rounded-xs bg-[#853953] dark:bg-[#A74B6A] opacity-80" />
                              ))}
                            </div>
                          )}
                          {config.load_curve === "ramp_up" && (
                            <div className="w-full flex items-end justify-between gap-1 px-3 h-10">
                              {[...Array(6)].map((_, i) => (
                                <div
                                  key={i}
                                  style={{ height: `${((i + 1) / 6) * 100}%` }}
                                  className="flex-1 rounded-t-xs bg-[#853953] dark:bg-[#A74B6A]"
                                />
                              ))}
                            </div>
                          )}
                          {config.load_curve === "spike" && (
                            <div className="w-full flex items-end justify-between gap-1 px-3 h-10">
                              {[30, 95, 35, 100, 40, 90].map((h, i) => (
                                <div
                                  key={i}
                                  style={{ height: `${h}%` }}
                                  className="flex-1 rounded-t-xs bg-[#853953] dark:bg-[#A74B6A]"
                                />
                              ))}
                            </div>
                          )}
                          {config.load_curve === "poisson" && (
                            <div className="w-full flex items-end justify-between gap-1 px-3 h-10">
                              {[45, 80, 25, 90, 60, 30].map((h, i) => (
                                <div
                                  key={i}
                                  style={{ height: `${h}%` }}
                                  className="flex-1 rounded-t-xs bg-[#612D53] dark:bg-[#C57BB2]"
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 pt-0.5">
                          <span>{config.concurrency} worker streams</span>
                          <span>
                            {isRequestMode
                              ? `${config.total_requests || 50} total requests`
                              : `${config.duration_seconds}s sustained stream`}
                          </span>
                        </div>
                      </div>

                      {/* Spend Velocity & Cap Guard */}
                      <div className="p-3 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Live Cost Guard Forecast
                          </span>
                          <span className="font-sans tabular-nums font-semibold text-xs text-emerald-700 dark:text-emerald-400">
                            {formatUsd(estCost)}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                            <span>Spend Forecast</span>
                            <span>Cap: {formatUsd(capVal)}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#F3F4F4] dark:bg-[#2C2C2C] overflow-hidden">
                            <div
                              style={{ width: `${spendPct}%` }}
                              className={`h-full transition-all ${
                                willTripCap ? "bg-rose-500" : "bg-emerald-500"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-[#853953]/20 dark:border-[#A74B6A]/20 bg-[#853953]/5 dark:bg-[#A74B6A]/5">
                    <CardContent className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-[#853953] dark:text-[#A74B6A]">
                        <Lightbulb className="h-3.5 w-3.5" />
                        <span>Understanding Queuing Theory</span>
                      </div>
                      <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed font-normal">
                        Under high concurrency, LLM clusters run out of KV cache VRAM slots and begin queuing requests. Measuring load curves reveals the exact concurrency threshold where queue backpressure starts degrading TTFT.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* STEP 4 SIDEBAR */}
              {currentStep === 4 && (
                <motion.div
                  key="sidebar-step-4"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <Card className="overflow-hidden border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-xs">
                    <CardHeader className="p-4 pb-2.5 bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <CardTitle className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Pre-Flight Health Audit
                            </CardTitle>
                            <CardDescription className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                              100% Validated & Safe to Launch
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="emerald" className="text-[11px] font-sans tabular-nums px-2 py-0.5 font-medium">
                          Passed
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3.5">
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                          <span className="text-[11px] flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-normal">
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Target Endpoint & Model
                          </span>
                          <span className="font-sans tabular-nums text-[11px] text-emerald-700 dark:text-emerald-300 truncate max-w-[120px] font-medium">
                            {config.model}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                          <span className="text-[11px] flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-normal">
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Workload Profile Matrix
                          </span>
                          <span className="font-sans tabular-nums text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                            {config.workload_preset}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                          <span className="text-[11px] flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-normal">
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Financial Spend Cap Armed
                          </span>
                          <span className="font-sans tabular-nums text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                            {formatUsd(capVal)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                          <span className="text-[11px] flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-normal">
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Live SSE Telemetry Stream
                          </span>
                          <span className="font-sans tabular-nums text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">100ms sync</span>
                        </div>
                      </div>

                      {/* Telemetry Architecture Visual Flow */}
                      <div className="p-3 rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-1.5">
                        <div className="text-[11px] font-sans tabular-nums uppercase tracking-wider text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-medium flex items-center gap-1">
                          <Workflow className="h-3 w-3" />
                          Active Telemetry Pipeline:
                        </div>
                        <div className="text-[11px] font-sans tabular-nums text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 space-y-1 font-normal">
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span>1. Socket timer (DNS/TCP/TLS)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />
                            <span>2. SSE chunk tracker (TTFT & ITL)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#612D53] dark:bg-[#C57BB2]" />
                            <span>3. Percentile engine (P50/P95/P99)</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-xs">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5" />
                        Developer Quick Export
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCli}
                        className="w-full text-xs justify-between font-sans tabular-nums cursor-pointer"
                      >
                        <span>Copy CLI Command</span>
                        {copiedSnippet === "cli" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyJson}
                        className="w-full text-xs justify-between font-sans tabular-nums cursor-pointer"
                      >
                        <span>Copy Config JSON</span>
                        {copiedSnippet === "json" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. MAIN FLOW (STEPS 1 - 4 WITH CLEAN CONCERN SEGREGATION)                 */}
        {/* ========================================================================= */}
        <div className={`${currentStep === 1 ? "lg:col-span-12" : "lg:col-span-8 xl:col-span-8"} space-y-6`}>
            <AnimatePresence mode="wait">
              {/* ===================================================================== */}
              {/* STEP 1: PROVIDER INFRASTRUCTURE, AUTH & MODEL SELECTION               */}
              {/* ===================================================================== */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {/* Card 1: Provider Infrastructure & Ephemeral Authentication */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Sliders className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Provider Infrastructure & Connection
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Define test session name, target inference provider, and ephemeral authentication
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs font-medium">Step 1 of 4</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-3 space-y-5">
                      {/* Session Run Name */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="run-name-input" className="text-xs font-semibold">
                            Benchmark Run Label
                          </Label>
                          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                            Identifier for history & diff comparison
                          </span>
                        </div>
                        <Input
                          id="run-name-input"
                          value={config.name}
                          onChange={(e) => onChange({ ...config, name: e.target.value })}
                          placeholder="e.g. Production Performance Canary"
                          className="text-xs font-medium"
                        />
                      </div>

                      <Separator />

                      {/* 1. Protocol Architecture Selection Grid */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                            1. Select API Wire Protocol & Driver
                          </Label>
                          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                            Client wire format & transport driver
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {[
                            {
                              id: "openai_compatible",
                              label: "OpenAI Wire Protocol",
                              sublabel: "/v1/chat/completions",
                              desc: "Universal standard for OpenAI, Groq, DeepSeek, Together, vLLM, Ollama & gateways",
                              badge: "Universal",
                              vendor: "openai",
                            },
                            {
                              id: "azure_openai",
                              label: "Azure OpenAI Service",
                              sublabel: "Azure AI Foundry & VPC",
                              desc: "Microsoft Azure resource endpoints with deployment routing & Entra/API Key auth",
                              badge: "Enterprise",
                              vendor: "azure",
                            },
                            {
                              id: "anthropic",
                              label: "Anthropic Messages",
                              sublabel: "/v1/messages",
                              desc: "Claude 3.7 & 3.5 Sonnet direct SSE streaming with thinking token extraction",
                              badge: "Frontier",
                              vendor: "anthropic",
                            },
                            {
                              id: "aws_bedrock",
                              label: "AWS Bedrock Runtime",
                              sublabel: "Converse API / SigV4",
                              desc: "AWS IAM SigV4 authenticated inference for Claude, Nova, Llama & Mistral",
                              badge: "Enterprise",
                              vendor: "aws_bedrock",
                            },
                            {
                              id: "gcp_vertex",
                              label: "Google Vertex & Gemini",
                              sublabel: "Gemini 2.5 & Cloud VPC",
                              desc: "Google AI Studio API Key or GCP Vertex AI Service Account OAuth",
                              badge: "Enterprise",
                              vendor: "gcp_vertex",
                            },
                            {
                              id: "mock",
                              label: "Local Simulator Engine",
                              sublabel: "In-Memory Microseconds",
                              desc: "Zero-cost simulation engine with DeepSeek-R1 reasoning traces and jitter",
                              badge: "100% Free",
                              vendor: "mock",
                            },
                          ].map((v) => {
                            const isSelected = config.vendor === v.id || (v.id === "openai_compatible" && config.vendor === "openai");
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
                                className={`group rounded-xl p-3 text-left border transition-all cursor-pointer font-sans select-none flex flex-col justify-between gap-2.5 ${
                                  isSelected
                                    ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 shadow-xs ring-1 ring-[#853953]/30 text-[#853953] dark:text-[#A74B6A]"
                                    : "border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#252426] hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4]"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg p-1 transition-all ${
                                        isSelected
                                          ? "bg-white dark:bg-[#1E1D1F] border border-[#853953]/30 dark:border-[#A74B6A]/30 shadow-xs"
                                          : "bg-[#F3F4F4] dark:bg-[#2C2C2C] border border-[#2C2C2C]/5 dark:border-[#F3F4F4]/5 group-hover:border-[#853953]/20"
                                      }`}
                                    >
                                      <ProviderLogo vendor={v.vendor} className="h-4.5 w-4.5" />
                                    </div>
                                    <div>
                                      <span className="text-xs font-semibold truncate block">{v.label}</span>
                                      <span className="text-[11px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 truncate block">
                                        {v.sublabel}
                                      </span>
                                    </div>
                                  </div>
                                  <Badge variant={isSelected ? "default" : "secondary"} className="text-[11px] px-1.5 py-0 font-medium">
                                    {v.badge}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 line-clamp-2 leading-relaxed">{v.desc}</p>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />

                      {/* 2. Endpoint Connection & Dynamic Ephemeral Credentials */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                            2. Endpoint Routing & Credentials
                          </Label>
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-sans tabular-nums">
                            Zero-persistence • In-memory only
                          </span>
                        </div>

                        {/* MOCK ENGINE BANNER */}
                        {config.vendor === "mock" && (
                          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-medium text-emerald-950 dark:text-emerald-200">
                                Mock Simulator Driver Active (100% Free)
                              </h4>
                              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                                Zero tokens or credentials required. High-precision in-memory streaming with realistic token jitter, TTFT waterfall simulation, and DeepSeek-R1 reasoning traces.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* AZURE OPENAI FORM */}
                        {config.vendor === "azure_openai" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs font-semibold flex items-center gap-1.5">
                                <Server className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                                Azure OpenAI Resource / Endpoint URL
                              </Label>
                              <Input
                                value={credential.azure_endpoint || credential.base_url || ""}
                                onChange={(e) => onCredentialChange({ ...credential, azure_endpoint: e.target.value, base_url: e.target.value })}
                                placeholder="https://my-resource.openai.azure.com"
                                className="font-sans tabular-nums text-xs h-9 bg-white dark:bg-[#252426]"
                              />
                              <span className="text-[11px] text-[#2C2C2C]/50">
                                Your Azure AI Foundry resource root endpoint
                              </span>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Deployment Name (Model Routing)</Label>
                              <Input
                                value={credential.azure_deployment || config.model || ""}
                                onChange={(e) => {
                                  onCredentialChange({ ...credential, azure_deployment: e.target.value });
                                  onChange({ ...config, model: e.target.value });
                                }}
                                placeholder="e.g. gpt-4o-eastus or gpt-4o-mini"
                                className="font-sans tabular-nums text-xs h-9 bg-white dark:bg-[#252426]"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">API Version</Label>
                              <Select
                                value={credential.azure_api_version || "2024-10-21"}
                                onValueChange={(val) => onCredentialChange({ ...credential, azure_api_version: val })}
                              >
                                <SelectTrigger className="h-9 font-sans tabular-nums text-xs bg-white dark:bg-[#252426]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="2024-10-21" className="font-sans tabular-nums text-xs">2024-10-21 (GA)</SelectItem>
                                  <SelectItem value="2024-12-01-preview" className="font-sans tabular-nums text-xs">2024-12-01-preview</SelectItem>
                                  <SelectItem value="2025-01-01-preview" className="font-sans tabular-nums text-xs">2025-01-01-preview</SelectItem>
                                  <SelectItem value="2024-08-01-preview" className="font-sans tabular-nums text-xs">2024-08-01-preview</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold flex items-center gap-1.5">
                                  <Lock className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                                  Azure API Key (or Entra ID Token)
                                </Label>
                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">In-Memory Only</span>
                              </div>
                              <div className="relative">
                                <Input
                                  type={showKey ? "text" : "password"}
                                  value={credential.api_key || ""}
                                  onChange={(e) => onCredentialChange({ ...credential, api_key: e.target.value })}
                                  placeholder="Enter your Azure OpenAI API Key..."
                                  className="pr-10 font-sans tabular-nums text-xs h-9 bg-white dark:bg-[#252426]"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setShowKey(!showKey)}
                                  className="absolute right-1 top-0.5 h-8 w-8 text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 hover:text-[#2C2C2C] cursor-pointer"
                                >
                                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* AWS BEDROCK FORM */}
                        {config.vendor === "aws_bedrock" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">AWS Region</Label>
                              <Select
                                value={credential.aws_region || "us-east-1"}
                                onValueChange={(val) => onCredentialChange({ ...credential, aws_region: val })}
                              >
                                <SelectTrigger className="h-9 font-sans tabular-nums text-xs bg-white dark:bg-[#252426]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="us-east-1" className="font-sans tabular-nums text-xs">us-east-1 (N. Virginia)</SelectItem>
                                  <SelectItem value="us-west-2" className="font-sans tabular-nums text-xs">us-west-2 (Oregon)</SelectItem>
                                  <SelectItem value="eu-central-1" className="font-sans tabular-nums text-xs">eu-central-1 (Frankfurt)</SelectItem>
                                  <SelectItem value="eu-west-1" className="font-sans tabular-nums text-xs">eu-west-1 (Ireland)</SelectItem>
                                  <SelectItem value="ap-northeast-1" className="font-sans tabular-nums text-xs">ap-northeast-1 (Tokyo)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">AWS Access Key ID</Label>
                              <Input
                                value={credential.aws_access_key_id || ""}
                                onChange={(e) => onCredentialChange({ ...credential, aws_access_key_id: e.target.value })}
                                placeholder="AKIAIOSFODNN7EXAMPLE"
                                className="font-sans tabular-nums text-xs h-9 bg-white dark:bg-[#252426]"
                              />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs font-semibold">AWS Secret Access Key</Label>
                              <div className="relative">
                                <Input
                                  type={showSecretKey ? "text" : "password"}
                                  value={credential.aws_secret_access_key || ""}
                                  onChange={(e) => onCredentialChange({ ...credential, aws_secret_access_key: e.target.value })}
                                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                                  className="pr-10 font-sans tabular-nums text-xs h-9 bg-white dark:bg-[#252426]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowSecretKey(!showSecretKey)}
                                  className="absolute right-2.5 top-2.5 text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40 hover:text-[#2C2C2C]"
                                >
                                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs font-semibold">AWS Session Token (Optional for IAM Role Assume / STS)</Label>
                              <Input
                                value={credential.aws_session_token || ""}
                                onChange={(e) => onCredentialChange({ ...credential, aws_session_token: e.target.value })}
                                placeholder="Optional temporary STS session token..."
                                className="font-sans tabular-nums text-xs h-8 bg-white dark:bg-[#252426]"
                              />
                            </div>
                          </div>
                        )}

                        {/* GCP VERTEX & GEMINI FORM */}
                        {config.vendor === "gcp_vertex" && (
                          <div className="p-4 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">Authentication Mode:</span>
                              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10">
                                <button
                                  type="button"
                                  onClick={() => onCredentialChange({ ...credential, gcp_auth_mode: "api_key" })}
                                  className={`text-[11px] px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                                    (credential.gcp_auth_mode || "api_key") === "api_key"
                                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white"
                                      : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70"
                                  }`}
                                >
                                  Google AI Studio Key
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onCredentialChange({ ...credential, gcp_auth_mode: "vertex_ai" })}
                                  className={`text-[11px] px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                                    credential.gcp_auth_mode === "vertex_ai"
                                      ? "bg-[#853953] dark:bg-[#A74B6A] text-white"
                                      : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70"
                                  }`}
                                >
                                  GCP Vertex AI VPC
                                </button>
                              </div>
                            </div>

                            {(credential.gcp_auth_mode || "api_key") === "api_key" ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold">Gemini API Key (Google AI Studio)</Label>
                                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">In-Memory Only</span>
                                </div>
                                <div className="relative">
                                  <Input
                                    type={showKey ? "text" : "password"}
                                    value={credential.api_key || ""}
                                    onChange={(e) => onCredentialChange({ ...credential, api_key: e.target.value })}
                                    placeholder="AIzaSy..."
                                    className="pr-10 font-sans tabular-nums text-xs h-9 bg-white dark:bg-[#252426]"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-1 top-0.5 h-8 w-8 text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 hover:text-[#2C2C2C] cursor-pointer"
                                  >
                                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold">GCP Project ID</Label>
                                  <Input
                                    value={credential.gcp_project_id || ""}
                                    onChange={(e) => onCredentialChange({ ...credential, gcp_project_id: e.target.value })}
                                    placeholder="my-gcp-project-123"
                                    className="font-sans tabular-nums text-xs h-9 bg-white dark:bg-[#252426]"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold">GCP Location / Region</Label>
                                  <Input
                                    value={credential.gcp_location || "us-central1"}
                                    onChange={(e) => onCredentialChange({ ...credential, gcp_location: e.target.value })}
                                    placeholder="us-central1"
                                    className="font-sans tabular-nums text-xs h-9 bg-white dark:bg-[#252426]"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* OPENAI WIRE PROTOCOL & ANTHROPIC FORMS */}
                        {(config.vendor === "openai" || config.vendor === "anthropic" || config.vendor === "openai_compatible") && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Base URL Column */}
                            <div className="rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 p-4 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-3 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="base-url-input" className="text-xs font-semibold flex items-center gap-1.5">
                                    <Server className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                                    Endpoint Base URL & Routing
                                  </Label>
                                  <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
                                    {POPULAR_BASE_URLS.length} Presets
                                  </span>
                                </div>

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
                                  <SelectTrigger className="w-full h-9 font-sans text-xs bg-white dark:bg-[#252426]">
                                    <SelectValue placeholder="Select provider/gateway preset..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-72">
                                    {(["Aggregator", "Fast Inference", "Frontier Provider", "Local Self-Hosted"] as const).map((cat) => (
                                      <SelectGroup key={cat}>
                                        <SelectLabel className="text-[11px] uppercase font-sans tabular-nums tracking-wider text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                                          {cat}
                                        </SelectLabel>
                                        {POPULAR_BASE_URLS.filter((p) => p.category === cat).map((p) => (
                                          <SelectItem key={p.id} value={p.id} className="text-xs py-1.5 cursor-pointer">
                                            <div className="flex items-center justify-between gap-4 w-full">
                                              <div className="flex items-center gap-2">
                                                <ProviderLogo vendor={p.id} className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A] shrink-0" />
                                                <span className="font-medium">{p.name}</span>
                                              </div>
                                              <span className="font-sans tabular-nums text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 truncate max-w-[180px]">
                                                {p.baseUrl}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    ))}
                                  </SelectContent>
                                </Select>

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
                                  className="font-sans tabular-nums text-xs bg-white dark:bg-[#252426]"
                                />
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#2C2C2C]/8 dark:border-[#F3F4F4]/8">
                                <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans">Quick pick:</span>
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
                                    className={`h-5 text-[11px] px-2 rounded-md font-sans tabular-nums border transition-colors cursor-pointer ${
                                      credential.base_url === p.baseUrl
                                        ? "bg-[#853953]/10 dark:bg-[#A74B6A]/20 border-[#853953]/40 text-[#853953] dark:text-[#A74B6A] font-semibold"
                                        : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:bg-[#F3F4F4] dark:hover:bg-[#353337] hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                                    }`}
                                  >
                                    {p.id}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* API Key Column */}
                            <div className="rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 p-4 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-3 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="api-key-input" className="text-xs font-semibold flex items-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                                    {config.vendor === "anthropic" ? "Anthropic API Key" : "Bearer Token / API Key"}
                                  </Label>
                                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
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
                                    className="pr-10 font-sans tabular-nums text-xs bg-white dark:bg-[#252426]"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-1 top-0.5 h-8 w-8 text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 hover:text-[#2C2C2C] cursor-pointer"
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

                              <div className="flex items-center gap-2 pt-1 border-t border-[#2C2C2C]/8 dark:border-[#F3F4F4]/8 text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Zero disk storage • Key is never logged to disk or reports</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Model Selection & Token Economics */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Target Model & Token Economics
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Select or enter the target model identifier and configure per-million token pricing
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {availableModels.length > 0 && !isLoadingModels && (
                            <Badge variant="emerald" className="gap-1 font-sans tabular-nums text-[11px] px-2 py-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {availableModels.length} models
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Column 1: Target Model Selector */}
                        <div className="space-y-3 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">Target Model</Label>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsCustomModel(!isCustomModel)}
                                  className="h-7 text-[11px] font-medium px-2.5 rounded-lg text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 cursor-pointer"
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

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isLoadingModels || !canFetchModels}
                                  onClick={fetchModels}
                                  className="h-7 text-[11px] px-2.5 rounded-lg font-medium gap-1.5 cursor-pointer disabled:opacity-40"
                                  title={canFetchModels ? "Query base URL for models" : "Enter credentials above to fetch models"}
                                >
                                  <RotateCw className={`h-3 w-3 ${isLoadingModels ? "animate-spin text-[#853953] dark:text-[#A74B6A]" : ""}`} />
                                  <span>{isLoadingModels ? "Fetching..." : "Fetch"}</span>
                                </Button>
                              </div>
                            </div>

                            {isCustomModel ? (
                              <div className="space-y-1">
                                <Input
                                  value={config.model}
                                  onChange={(e) => onChange({ ...config, model: e.target.value })}
                                  placeholder="e.g. gpt-4o or deepseek-ai/deepseek-r1"
                                  className="font-sans tabular-nums text-xs h-9 bg-white dark:bg-[#252426]"
                                />
                                <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                                  Manually entered model identifier for fine-tuned or private server models.
                                </p>
                              </div>
                            ) : (
                              <Select
                                value={config.model || ""}
                                onValueChange={(val) => onChange({ ...config, model: val })}
                                disabled={isLoadingModels && availableModels.length === 0}
                              >
                                <SelectTrigger className="w-full h-9 font-sans tabular-nums text-xs bg-white dark:bg-[#252426]">
                                  <SelectValue placeholder={isLoadingModels ? "Querying models from endpoint..." : "Select a model..."} />
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                  <SelectGroup>
                                    <SelectLabel className="text-[11px] uppercase tracking-wider text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums">
                                      {availableModels.length > 0 ? `Discovered Models (${availableModels.length})` : "Standard Models"}
                                    </SelectLabel>
                                    {availableModels.map((m) => (
                                      <SelectItem key={m} value={m} className="font-sans tabular-nums text-xs py-2">
                                        {m}
                                      </SelectItem>
                                    ))}
                                    {config.model && !availableModels.includes(config.model) && (
                                      <SelectItem value={config.model} className="font-sans tabular-nums text-xs py-2">
                                        {config.model} (current)
                                      </SelectItem>
                                    )}
                                    {availableModels.length === 0 && !isLoadingModels && (
                                      <div className="p-3 text-xs text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 text-center font-sans">
                                        No models retrieved. Enter credentials above and click Fetch, or use Custom model ID.
                                      </div>
                                    )}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            )}

                            {modelFetchError && (
                              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                                <span className="truncate">Could not list models: {modelFetchError}</span>
                                <Button type="button" variant="ghost" size="sm" onClick={fetchModels} className="h-6 text-[11px] underline">
                                  Retry
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="p-2.5 rounded-lg bg-[#F3F4F4]/40 dark:bg-[#2C2C2C]/20 border border-[#2C2C2C]/8 dark:border-[#F3F4F4]/8 text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 flex items-center justify-between">
                            <span>Selected: <strong className="font-sans tabular-nums text-[#853953] dark:text-[#A74B6A]">{config.model || "None"}</strong></span>
                            <span className="capitalize font-sans tabular-nums">{config.vendor.replace("_", " ")}</span>
                          </div>
                        </div>

                        {/* Column 2: Token Pricing Rates */}
                        <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/60 dark:bg-[#252426] p-4 space-y-3 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                                Token Pricing per 1M Tokens (USD)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const [p, c] = getModelPricing(config.vendor, config.model);
                                  setCustomPromptPrice(p.toFixed(4));
                                  setCustomCompletionPrice(c.toFixed(4));
                                }}
                                className="flex items-center gap-1 text-[11px] text-[#853953] dark:text-[#A74B6A] hover:underline font-medium font-sans tabular-nums cursor-pointer"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Reset to standard</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px] font-medium text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-sans tabular-nums">
                                  Prompt (Input) $/1M
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-xs text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums pointer-events-none">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={customPromptPrice}
                                    onChange={(e) => setCustomPromptPrice(e.target.value)}
                                    className="pl-5 font-sans tabular-nums text-xs h-8 text-[#853953] dark:text-[#A74B6A] font-semibold bg-white dark:bg-[#1E1E1E]"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] font-medium text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-sans tabular-nums">
                                  Completion (Output) $/1M
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-xs text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums pointer-events-none">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={customCompletionPrice}
                                    onChange={(e) => setCustomCompletionPrice(e.target.value)}
                                    className="pl-5 font-sans tabular-nums text-xs h-8 text-[#612D53] dark:text-[#C57BB2] font-semibold bg-white dark:bg-[#1E1E1E]"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-2 border-t border-[#2C2C2C]/8 dark:border-[#F3F4F4]/8">
                            {config.vendor === "mock"
                              ? "Mock simulator is always $0.00 • No billing incurred."
                              : "Pre-filled from official benchmark catalog • Modify for negotiated enterprise rates."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ===================================================================== */}
              {/* STEP 2: WORKLOAD PROFILE, PAYLOAD CONTEXT & SAMPLING                   */}
              {/* ===================================================================== */}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {/* Card 1: Workload Profile Selection */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Workload Profile Selection
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Select specialized prompt distributions to isolate TTFT, decode throughput, or 429 rate limits
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs font-medium">Step 2 of 4</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-4">
                      {/* Search Bar & Category Filter Strip */}
                      <div className="space-y-3 p-3.5 rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50" />
                          <Input
                            type="text"
                            value={workloadSearchQuery}
                            onChange={(e) => setWorkloadSearchQuery(e.target.value)}
                            placeholder="Search profiles by name, tag, or metrics (e.g. '429', 'prefill', 'jitter', 'reasoning')..."
                            className="pl-9 pr-8 h-9 text-xs font-sans bg-white dark:bg-[#252426]"
                          />
                          {workloadSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setWorkloadSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2C2C2C]/40 hover:text-[#2C2C2C] cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {CATEGORY_TABS.map((cat) => {
                            const isCatActive = selectedCategory === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                                  isCatActive
                                    ? "bg-[#853953] dark:bg-[#A74B6A] text-white border-[#853953] dark:border-[#A74B6A] shadow-2xs font-semibold"
                                    : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:bg-[#e6e8e8] dark:hover:bg-[#353337] hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                                }`}
                              >
                                {cat.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 pt-0.5">
                          <span>
                            Showing <strong>{filteredPresets.length}</strong> of {PRESET_OPTIONS.length} profiles
                          </span>
                          {(workloadSearchQuery || selectedCategory !== "all") && (
                            <button
                              type="button"
                              onClick={() => {
                                setWorkloadSearchQuery("");
                                setSelectedCategory("all");
                              }}
                              className="text-[#853953] dark:text-[#A74B6A] hover:underline cursor-pointer"
                            >
                              Reset filters
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Preset Cards Grid */}
                      {filteredPresets.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {filteredPresets.map((preset) => {
                            const Icon = preset.icon;
                            const isSelected = config.workload_preset === preset.id;
                            const total = preset.promptTokens + preset.genTokens;
                            const promptPct = (preset.promptTokens / total) * 100;
                            const genPct = (preset.genTokens / total) * 100;

                            return (
                              <div
                                key={preset.id}
                                onClick={() => {
                                  onChange({
                                    ...config,
                                    workload_preset: preset.id,
                                    max_tokens: preset.genTokens,
                                  });
                                }}
                                className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between relative overflow-hidden group font-sans active:scale-[0.99] ${
                                  isSelected
                                    ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 shadow-xs ring-1 ring-[#853953]/30 text-[#853953] dark:text-[#A74B6A]"
                                    : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:border-[#853953]/30 dark:hover:border-[#A74B6A]/40 hover:bg-[#F3F4F4]/50 dark:hover:bg-[#353337]/50 text-[#2C2C2C] dark:text-[#F3F4F4]"
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className={`p-2 rounded-lg border transition-colors ${
                                          isSelected
                                            ? "bg-[#853953] dark:bg-[#A74B6A] text-white border-[#853953] dark:border-[#A74B6A]"
                                            : "bg-[#F3F4F4] dark:bg-[#2C2C2C] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70"
                                        }`}
                                      >
                                        <Icon className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <div className="text-xs font-semibold">{preset.name}</div>
                                        <div className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans tabular-nums font-normal">
                                          {(preset.promptTokens + preset.genTokens).toLocaleString()} tok baseline
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected ? (
                                      <Badge variant="default" className="text-[11px] px-1.5 py-0 h-5 font-sans tabular-nums font-medium">Active</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-medium">
                                        {preset.tag}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed pt-1 font-normal">{preset.desc}</p>

                                  <div className="pt-2">
                                    <div className="text-[11px] font-sans tabular-nums text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 mb-1 font-medium uppercase tracking-wider">
                                      Metrics Shown in UI:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {preset.metrics.map((m) => (
                                        <span
                                          key={m}
                                          className={`text-[11px] font-sans tabular-nums px-1.5 py-0.5 rounded-md border font-normal ${
                                            isSelected
                                              ? "bg-[#853953]/20 dark:bg-[#A74B6A]/25 border-[#853953]/40 dark:border-[#A74B6A]/50 text-[#853953] dark:text-[#A74B6A] font-medium"
                                              : "bg-[#F3F4F4] dark:bg-[#2C2C2C] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/75"
                                          }`}
                                        >
                                          {m}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-1.5">
                                  <div className="flex justify-between text-[11px] font-sans tabular-nums font-normal">
                                    <span className="text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70">
                                      In: <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{preset.promptTokens.toLocaleString()}</span>
                                    </span>
                                    <span className="text-[#853953] dark:text-[#A74B6A]">
                                      Out: <span className="font-medium">{preset.genTokens.toLocaleString()}</span>
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-[#F3F4F4] dark:bg-[#2C2C2C] flex overflow-hidden border border-[#2C2C2C]/10">
                                    <div style={{ width: `${promptPct}%` }} className="bg-[#612D53] dark:bg-[#7E3B6C]" />
                                    <div style={{ width: `${genPct}%` }} className="bg-[#853953] dark:bg-[#A74B6A]" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center rounded-xl border border-dashed border-[#2C2C2C]/20 dark:border-[#F3F4F4]/15 space-y-2">
                          <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-sans">
                            No workload profiles found matching &ldquo;{workloadSearchQuery}&rdquo;
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setWorkloadSearchQuery("");
                              setSelectedCategory("all");
                            }}
                            className="text-xs cursor-pointer"
                          >
                            Clear Search Filter
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Card 2: Payload, Context & Cache Rules (Moved from sidebar to main flow) */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <FileCode className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Payload, Context & Cache Rules
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Customize KV cache busting nonce, custom prompt text, and structured grammar schemas
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-4">
                      {/* KV Cache Bypass */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 border border-[#2C2C2C]/10">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-semibold cursor-pointer">Bypass KV Prefix Cache (Unique Nonce)</Label>
                          <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                            Appends random per-request nonce to defeat prompt caching and measure cold GPU prefill throughput
                          </p>
                        </div>
                        <Switch
                          checked={config.cache_bust}
                          onCheckedChange={(checked) => onChange({ ...config, cache_bust: checked })}
                        />
                      </div>

                      {/* Custom Prompt Override */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Custom Prompt Payload (Optional)</Label>
                          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">Leave blank to use profile preset prompt</span>
                        </div>
                        <textarea
                          value={config.custom_prompt || ""}
                          onChange={(e) => onChange({ ...config, custom_prompt: e.target.value })}
                          placeholder="Override the preset benchmark prompt with your exact application payload..."
                          rows={3}
                          className="w-full text-xs font-sans tabular-nums p-3 rounded-xl border border-[#2C2C2C]/20 dark:border-[#F3F4F4]/20 bg-white dark:bg-[#252426] focus:ring-1 focus:ring-[#853953]"
                        />
                      </div>

                      {/* Structured JSON Schema Editor */}
                      {(config.workload_preset === "structured_json" || config.workload_preset === "json_schema") && (
                        <div className="space-y-2 p-3.5 rounded-xl bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 border border-[#2C2C2C]/10">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-[#853953] dark:text-[#A74B6A] flex items-center gap-1.5">
                              <Braces className="h-3.5 w-3.5" />
                              JSON Schema Validation Contract
                            </Label>
                            {jsonSchemaError ? (
                              <Badge variant="destructive" className="text-[11px]">
                                {jsonSchemaError}
                              </Badge>
                            ) : (
                              <Badge variant="emerald" className="text-[11px]">
                                Valid JSON Schema
                              </Badge>
                            )}
                          </div>

                          <textarea
                            value={rawJsonSchema}
                            onChange={(e) => handleJsonSchemaChange(e.target.value)}
                            rows={6}
                            className="w-full text-xs font-sans tabular-nums p-2.5 rounded-lg border border-[#2C2C2C]/20 dark:border-[#F3F4F4]/20 bg-white dark:bg-[#252426]"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Card 3: Output Generation Sampling */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Sliders className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Output Generation Sampling
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Configure max output token ceilings and decoding temperature
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-5">
                      {/* Max Tokens Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <Label>Max Output Tokens (max_tokens)</Label>
                          <Badge variant="default" className="font-sans tabular-nums text-xs font-medium">
                            {config.max_tokens} tokens
                          </Badge>
                        </div>
                        <Slider
                          min={1}
                          max={4096}
                          step={1}
                          value={[config.max_tokens]}
                          onValueChange={(val) => onChange({ ...config, max_tokens: val[0] })}
                        />
                        <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                          <span>1 (Micro-probe)</span>
                          <span>512 (Standard)</span>
                          <span>4096 (Deep code/RAG)</span>
                        </div>
                      </div>

                      {/* Temperature Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <Label>Sampling Temperature</Label>
                          <Badge variant="default" className="font-sans tabular-nums text-xs font-medium">
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
                        <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                          <span>0.0 (Deterministic)</span>
                          <span>0.7 (Standard)</span>
                          <span>1.5 (Creative)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ===================================================================== */}
              {/* STEP 3: TRAFFIC DYNAMICS, SLO GUARDRAILS & SPEND CAP                  */}
              {/* ===================================================================== */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {/* Card 1: Traffic Orchestration & Concurrency Strategy */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Traffic Orchestration & Concurrency Strategy
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Define workload execution mode, concurrency pool, arrival load curve, and warmup requests
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs font-medium">Step 3 of 4</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-5">
                      {/* Strategy Mode Toggle */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                          Benchmark Execution Strategy
                        </Label>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => onChange({ ...config, test_mode: "duration" })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              !isRequestMode
                                ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 text-[#853953] dark:text-[#A74B6A] ring-1 ring-[#853953]/30 shadow-xs"
                                : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4]"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                                <span className="text-xs font-medium">Time-Based (Duration)</span>
                              </div>
                              {!isRequestMode && <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />}
                            </div>
                            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 line-clamp-2">
                              Continuous load stream over fixed seconds • Evaluates sustained throughput
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => onChange({ ...config, test_mode: "requests" })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isRequestMode
                                ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 text-[#853953] dark:text-[#A74B6A] ring-1 ring-[#853953]/30 shadow-xs"
                                : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4]"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <Target className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                                <span className="text-xs font-medium">Request-Based (Count)</span>
                              </div>
                              {isRequestMode && <span className="h-1.5 w-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A]" />}
                            </div>
                            <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 line-clamp-2">
                              Exact total request batch • 100% deterministic budget and sample volume
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Scope Slider */}
                      {isRequestMode ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <Label className="flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                              Total Request Batch Volume
                            </Label>
                            <Badge variant="default" className="font-sans tabular-nums text-xs font-medium">
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
                          <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
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
                            <Badge variant="default" className="font-sans tabular-nums text-xs font-medium">
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
                          <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
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
                          <Badge variant="default" className="font-sans tabular-nums text-xs font-medium">
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
                        <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                          <span>1 worker</span>
                          <span>25 workers</span>
                          <span>50 workers (saturation)</span>
                        </div>
                      </div>

                      {/* Arrival Load Curve */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Arrival Load Curve</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                    : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4]"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Icon className="h-3.5 w-3.5" />
                                  <span className="text-[11px] truncate font-medium">{curve.label}</span>
                                </div>
                                <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 line-clamp-1">{curve.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Warmup Requests Slider (Moved from sidebar to main flow) */}
                      <div className="space-y-2 pt-1 border-t border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                        <div className="flex justify-between items-center text-xs">
                          <Label className="flex items-center gap-1.5">
                            <RotateCw className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                            Warmup Requests (Discarded from Latency Stats)
                          </Label>
                          <Badge variant="outline" className="font-sans tabular-nums text-xs font-medium">
                            {config.warmup_requests || 0} warmup reqs
                          </Badge>
                        </div>
                        <Slider
                          min={0}
                          max={10}
                          step={1}
                          value={[config.warmup_requests || 0]}
                          onValueChange={(val) => onChange({ ...config, warmup_requests: val[0] })}
                        />
                        <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                          <span>0 (Immediate)</span>
                          <span>2 (Recommended to prime TCP/TLS sockets)</span>
                          <span>10 (Full cache prime)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Service Level Objectives (SLO Guardrails) */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Gauge className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Service Level Objectives (SLO Guardrails)
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Define maximum acceptable latency ceilings and error rates for Goodput scoring
                            </CardDescription>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplySloPreset("strict")}
                            className="h-6 text-[11px] px-2 font-sans tabular-nums"
                          >
                            Strict
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplySloPreset("interactive")}
                            className="h-6 text-[11px] px-2 font-sans tabular-nums"
                          >
                            Standard
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplySloPreset("batch")}
                            className="h-6 text-[11px] px-2 font-sans tabular-nums"
                          >
                            Batch
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Max TTFT */}
                        <div className="space-y-1.5 p-3 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10">
                          <div className="flex justify-between items-center text-xs">
                            <Label className="font-semibold">Max TTFT SLO Ceiling</Label>
                            <Badge variant="outline" className="font-sans tabular-nums text-xs text-[#853953] dark:text-[#A74B6A] font-semibold">
                              ≤ {config.slo.max_ttft_ms} ms
                            </Badge>
                          </div>
                          <Slider
                            min={100}
                            max={5000}
                            step={100}
                            value={[config.slo.max_ttft_ms]}
                            onValueChange={(val) =>
                              onChange({ ...config, slo: { ...config.slo, max_ttft_ms: val[0] } })
                            }
                          />
                          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 block font-normal">Time to First Token budget</span>
                        </div>

                        {/* Max TPOT */}
                        <div className="space-y-1.5 p-3 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10">
                          <div className="flex justify-between items-center text-xs">
                            <Label className="font-semibold">Max TPOT (Inter-Token Latency)</Label>
                            <Badge variant="outline" className="font-sans tabular-nums text-xs text-[#612D53] dark:text-[#C57BB2] font-semibold">
                              ≤ {config.slo.max_tpot_ms} ms/tok
                            </Badge>
                          </div>
                          <Slider
                            min={10}
                            max={150}
                            step={5}
                            value={[config.slo.max_tpot_ms]}
                            onValueChange={(val) =>
                              onChange({ ...config, slo: { ...config.slo, max_tpot_ms: val[0] } })
                            }
                          />
                          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 block font-normal">Streaming decode smoothness limit</span>
                        </div>

                        {/* Max E2E */}
                        <div className="space-y-1.5 p-3 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10">
                          <div className="flex justify-between items-center text-xs">
                            <Label className="font-semibold">Max E2E Duration</Label>
                            <Badge variant="outline" className="font-sans tabular-nums text-xs font-semibold">
                              ≤ {(config.slo.max_e2e_ms / 1000).toFixed(1)} s
                            </Badge>
                          </div>
                          <Slider
                            min={1000}
                            max={30000}
                            step={1000}
                            value={[config.slo.max_e2e_ms]}
                            onValueChange={(val) =>
                              onChange({ ...config, slo: { ...config.slo, max_e2e_ms: val[0] } })
                            }
                          />
                          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 block font-normal">Full turn end-to-end timeout threshold</span>
                        </div>

                        {/* Max Error Rate */}
                        <div className="space-y-1.5 p-3 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10">
                          <div className="flex justify-between items-center text-xs">
                            <Label className="font-semibold">Max Error Rate Budget</Label>
                            <Badge variant="outline" className="font-sans tabular-nums text-xs text-rose-700 dark:text-rose-400 font-semibold">
                              ≤ {config.slo.max_error_rate_pct}%
                            </Badge>
                          </div>
                          <Slider
                            min={0.0}
                            max={10.0}
                            step={0.5}
                            value={[config.slo.max_error_rate_pct]}
                            onValueChange={(val) =>
                              onChange({ ...config, slo: { ...config.slo, max_error_rate_pct: Number(val[0].toFixed(1)) } })
                            }
                          />
                          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 block font-normal">HTTP 429 & 5xx error percentage limit</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Financial Circuit Breaker & Budget Guard */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                            Financial Circuit Breaker & Spend Projections
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
                          <Badge variant="emerald" className="font-sans tabular-nums text-xs font-medium">
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
                        <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                          <span>$0.25</span>
                          <span>$5.00</span>
                          <span>$10.00</span>
                        </div>
                      </div>

                      {/* Spend Projection Details */}
                      <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10 p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 font-medium flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                            {isRequestMode ? "Deterministic total spend" : "Pre-flight calculated spend"}
                          </span>
                          <span className="text-sm font-semibold font-sans tabular-nums text-[#853953] dark:text-[#A74B6A]">
                            {formatUsd(estCost)}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] font-sans">
                            <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Spend cap utilization:</span>
                            <span className={`font-sans tabular-nums font-semibold ${willTripCap ? "text-rose-700 dark:text-rose-400" : "text-[#612D53] dark:text-[#C57BB2]"}`}>
                              {spendPct}% of {formatUsd(capVal)}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full transition-all duration-150 ${
                                willTripCap ? "bg-rose-600 dark:bg-rose-500" : "bg-[#853953] dark:bg-[#A74B6A]"
                              }`}
                              style={{ width: `${Math.min(100, (estCost / capVal) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {willTripCap && (
                          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-[11px] text-rose-800 dark:text-rose-300 font-medium flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                            <span>Estimated spend ({formatUsd(estCost)}) exceeds cap. Test will circuit-break early!</span>
                          </div>
                        )}

                        <div className="flex justify-between text-xs font-sans tabular-nums text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 pt-2 border-t border-[#2C2C2C]/10">
                          <span>
                            {isRequestMode ? "Target requests: " : "Est. requests: "}
                            <span className="font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              {costEstimate?.estimated_requests || 0}
                            </span>
                          </span>
                          <span>
                            Total tokens:{" "}
                            <span className="font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              ~{costEstimate?.estimated_total_tokens.toLocaleString() || 0}
                            </span>
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ===================================================================== */}
              {/* STEP 4: PRE-FLIGHT COCKPIT & LAUNCH REVIEW                            */}
              {/* ===================================================================== */}
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
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Pre-Flight Configuration Cockpit
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
                      {/* Run Name Confirmation */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 border border-[#2C2C2C]/10 text-xs">
                        <span className="text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-medium">
                          Session Identifier:
                        </span>
                        <span className="font-sans tabular-nums font-semibold text-[#853953] dark:text-[#A74B6A]">{config.name}</span>
                      </div>

                      {/* 1. Quick Glance Compact Summary Bar */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 space-y-0.5">
                          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans tabular-nums font-medium">Target Model</span>
                          <div className="font-sans tabular-nums font-semibold text-xs text-[#853953] dark:text-[#A74B6A] truncate">{config.model}</div>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <ProviderLogo vendor={config.vendor} className="h-3.5 w-3.5" />
                            <span className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 capitalize font-normal">{config.vendor.replace("_", " ")} endpoint</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 space-y-0.5">
                          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans tabular-nums font-medium">Workload Profile</span>
                          <div className="font-sans font-semibold text-xs text-[#2C2C2C] dark:text-[#F3F4F4] truncate">{selectedPreset.name}</div>
                          <span className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-sans tabular-nums font-normal">~{totalPresetTokens} tokens/req</span>
                        </div>

                        <div className="p-3 rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 space-y-0.5">
                          <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 uppercase tracking-wider font-sans tabular-nums font-medium">Concurrency & Scope</span>
                          <div className="font-sans tabular-nums font-semibold text-xs text-[#2C2C2C] dark:text-[#F3F4F4] truncate">{config.concurrency} worker streams</div>
                          <span className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-normal">
                            {isRequestMode ? `${config.total_requests || 50} total reqs` : `${config.duration_seconds}s • ${config.load_curve}`}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-0.5">
                          <span className="text-[11px] text-emerald-800/60 dark:text-emerald-400/70 uppercase tracking-wider font-sans tabular-nums font-medium">Budget & Cap</span>
                          <div className="font-sans tabular-nums font-semibold text-xs text-emerald-700 dark:text-emerald-300 truncate">{formatUsd(config.hard_spend_cap)} cap</div>
                          <span className="text-[11px] text-emerald-800/80 dark:text-emerald-400/90 font-sans tabular-nums font-normal">Est: {formatUsd(estCost)}</span>
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
                            <div className="flex justify-between items-center">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Wire Protocol:</span>
                              <div className="flex items-center gap-1.5 font-medium text-[#2C2C2C] dark:text-[#F3F4F4] capitalize">
                                <ProviderLogo vendor={config.vendor} className="h-3.5 w-3.5" />
                                <span>{config.vendor.replace("_", " ")}</span>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Model ID:</span>
                              <span className="font-sans tabular-nums font-medium text-[#853953] dark:text-[#A74B6A] truncate max-w-[140px]">{config.model}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Max Tokens:</span>
                              <span className="font-sans tabular-nums font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{config.max_tokens}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Temperature:</span>
                              <span className="font-sans tabular-nums font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{config.temperature}</span>
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
                              <Badge variant="outline" className="text-[11px] font-sans tabular-nums capitalize py-0">
                                {config.test_mode === "requests" ? "Request Batch" : "Time Duration"}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Concurrency:</span>
                              <span className="font-sans tabular-nums font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{config.concurrency} streams</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                                {isRequestMode ? "Batch Target:" : "Duration:"}
                              </span>
                              <span className="font-sans tabular-nums font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                                {isRequestMode ? `${config.total_requests || 50} requests` : `${config.duration_seconds}s`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Arrival Curve:</span>
                              <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4] capitalize">{config.load_curve}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Warmup Calls:</span>
                              <span className="font-sans tabular-nums font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{config.warmup_requests || 0} requests</span>
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
                              <span className="font-sans tabular-nums font-medium text-[#853953] dark:text-[#A74B6A]">~{costEstimate?.estimated_total_tokens.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Projected Spend:</span>
                              <span className="font-sans tabular-nums font-medium text-emerald-700 dark:text-emerald-300">{formatUsd(estCost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Max TTFT SLO:</span>
                              <span className="font-sans tabular-nums font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">≤ {formatMs(config.slo.max_ttft_ms)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Max TPOT SLO:</span>
                              <span className="font-sans tabular-nums font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">≤ {formatMs(config.slo.max_tpot_ms)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">Max Error SLO:</span>
                              <span className="font-sans tabular-nums font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">≤ {formatPct(config.slo.max_error_rate_pct)}</span>
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
                    className="w-full h-14 text-sm font-semibold gap-3 shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-[0.99]"
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
        </div>
      </div>
    </TooltipProvider>
  );
};
