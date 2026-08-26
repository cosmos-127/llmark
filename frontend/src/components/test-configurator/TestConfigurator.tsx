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
  ShieldAlert,
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
  Radio,
  Lightbulb,
  Terminal,
  Copy,
  Workflow,
  Wrench,
  Code2,
  FileText,
  FileSpreadsheet,
  FileCode,
  Brain,
  CheckSquare,
  MessagesSquare,
  Database,
} from "lucide-react";
import {
  BenchmarkConfig,
  CostEstimate,
  VendorCredential,
  VendorType,
  WorkloadPreset,
  LoadCurveType,
  SLOThresholds,
} from "@/lib/types";
import { api } from "@/lib/api";
import { formatMs, formatPct, formatUsd } from "@/lib/utils";
import { calculateInstantCostEstimate, getModelPricing } from "@/lib/costCalculator";
import { POPULAR_BASE_URLS } from "@/lib/providerRegistry";
import { WORKLOAD_PROMPT_PREVIEWS } from "@/lib/promptPresets";
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
import { ProviderLogo } from "@/components/common/BrandLogos";
import { WaveformSimulationGraph } from "@/components/test-configurator/WaveformSimulationGraph";
import { SamplingEntropyDistributionGraph } from "@/components/test-configurator/SamplingEntropyDistributionGraph";
import { SloGoodputDistributionGraph } from "@/components/test-configurator/SloGoodputDistributionGraph";
import { SpendTrajectoryGraph } from "@/components/test-configurator/SpendTrajectoryGraph";
import { VramAllocationMatrix } from "@/components/test-configurator/VramAllocationMatrix";
import { LatencyWaterfallInspector } from "@/components/test-configurator/LatencyWaterfallInspector";
import { TokenBucketReservoir } from "@/components/test-configurator/TokenBucketReservoir";
import { GoodputSievePipeline } from "@/components/test-configurator/GoodputSievePipeline";

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
  | "agentic"
  | "heavy_context"
  | "code_structured"
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
    tag: "Conversational UI",
    metrics: ["TTFT P95", "ITL P95", "TPOT Mean", "Goodput"],
  },
  {
    id: "prefill_ttft",
    name: "Prefill Scaling & TTFT",
    desc: "Heavy document context with 1-token output isolating pure KV prefill compute velocity & TTFT tail percentiles",
    category: "latency",
    icon: Layers,
    promptTokens: 4000,
    genTokens: 2,
    tag: "Prefill & TTFT",
    metrics: ["TTFT P95/P99", "Prefill tok/s", "DNS/TCP/TLS", "Goodput"],
  },
  {
    id: "decode_throughput",
    name: "Streaming Decode & Jitter",
    desc: "Light prompt with long decode stream measuring sustained decode TPS, ITL percentiles & max token freezes",
    category: "throughput",
    icon: Zap,
    promptTokens: 40,
    genTokens: 800,
    tag: "Decode & ITL",
    metrics: ["Decode tok/s", "ITL P95", "Max Freeze", "TPOT Mean"],
  },
  {
    id: "reasoning_cot",
    name: "Reasoning & CoT Deep-Dive",
    desc: "Chain-of-thought prompts measuring Time to First Answer (TTFA), thinking duration & reasoning token budget",
    category: "reasoning",
    icon: Brain,
    promptTokens: 300,
    genTokens: 800,
    tag: "Reasoning & TTFA",
    metrics: ["TTFA P95", "Thinking tok/s", "Reasoning Ratio", "Goodput"],
  },
  {
    id: "agentic_tool_calling",
    name: "Agentic Tool & Function Calling",
    desc: "Multi-tool definitions & schemas measuring tool call latency, arguments validity & invocation throughput",
    category: "agentic",
    icon: Wrench,
    promptTokens: 1200,
    genTokens: 150,
    tag: "Function Invocation",
    metrics: ["Tool Latency", "Schema Validity %", "Constrained TPS", "Goodput"],
  },
  {
    id: "fewshot_classification",
    name: "Few-Shot In-Context Classification",
    desc: "Multi-exemplar in-context prompt measuring ultra-low decode latency & high-throughput classification goodput",
    category: "latency",
    icon: CheckSquare,
    promptTokens: 1200,
    genTokens: 10,
    tag: "Classification / ICL",
    metrics: ["TTFT P95", "E2E Latency", "Classification RPS", "Goodput"],
  },
  {
    id: "code_generation",
    name: "Code Generation & Syntax Stream",
    desc: "Codebase context & syntax tree generation measuring code decode speed, token jitter & TPOT",
    category: "code_structured",
    icon: Code2,
    promptTokens: 1500,
    genTokens: 800,
    tag: "Developer Workflow",
    metrics: ["Decode tok/s", "ITL P95", "TPOT Mean", "Max Freeze"],
  },
  {
    id: "rag_synthesis",
    name: "Enterprise RAG Synthesis",
    desc: "Document retrieval context ingestion measuring End-to-End latency, prefill/decode split & goodput yield",
    category: "heavy_context",
    icon: FileSearch,
    promptTokens: 3500,
    genTokens: 400,
    tag: "Enterprise RAG",
    metrics: ["E2E Latency", "TTFT P95", "Decode TPS", "Goodput"],
  },
  {
    id: "multimodal_vision",
    name: "Multimodal Vision & OCR",
    desc: "Image token embedding context measuring multimodal prefill latency, vision encoder overhead & TTFT",
    category: "heavy_context",
    icon: Eye,
    promptTokens: 1800,
    genTokens: 200,
    tag: "Vision & OCR",
    metrics: ["TTFT P95", "Multimodal Prefill", "TPOT Mean", "Goodput"],
  },
  {
    id: "multiturn_agentic",
    name: "Multi-Turn Session Context",
    desc: "Accumulated multi-turn conversation history measuring KV cache expansion, turn latency drift & memory pressure",
    category: "agentic",
    icon: MessagesSquare,
    promptTokens: 2500,
    genTokens: 350,
    tag: "Session Continuity",
    metrics: ["Turn Latency", "TTFT P95", "Decode TPS", "Goodput"],
  },
  {
    id: "kv_cache_reuse",
    name: "Prompt Prefix Cache Warm / Hit",
    desc: "Repeated shared prefix context measuring KV cache hit speedup ratio, TTFT reduction & caching discount throughput",
    category: "latency",
    icon: Database,
    promptTokens: 3200,
    genTokens: 150,
    tag: "KV Cache Hit",
    metrics: ["Cached TTFT", "Cache Hit Speedup", "TTFT P95", "Goodput"],
  },
  {
    id: "long_context_retrieval",
    name: "Long-Context & Needle Retrieval",
    desc: "Massive context prompt (16k tokens) measuring memory pressure, KV scaling & tail TTFT degradation",
    category: "heavy_context",
    icon: FileText,
    promptTokens: 16000,
    genTokens: 300,
    tag: "16k Needle Context",
    metrics: ["TTFT P95/P99", "Prefill tok/s", "E2E Latency", "Goodput"],
  },
  {
    id: "summarization_distill",
    name: "Document Summarization & Distillation",
    desc: "Dense document context reduction measuring prefill efficiency, compression speed & turn latency",
    category: "throughput",
    icon: FileSpreadsheet,
    promptTokens: 4500,
    genTokens: 300,
    tag: "Text Distillation",
    metrics: ["TTFT P95", "Decode TPS", "TPOT Mean", "Goodput"],
  },
  {
    id: "structured_json",
    name: "Structured JSON & Grammar",
    desc: "Guided grammar decoding measuring JSON syntax validity compliance & constrained decode speed",
    category: "code_structured",
    icon: Braces,
    promptTokens: 600,
    genTokens: 300,
    tag: "Grammar Constraint",
    metrics: ["Schema Validity %", "Constrained TPS", "TPOT Mean", "Parse Errors"],
  },
  {
    id: "rate_limit_probe",
    name: "Rate Limit & Quota Probing",
    desc: "Micro-token calls (5 in / 2 out) probing HTTP 429 ceilings, RPM/TPM saturation & backoff delays",
    category: "rate_limit",
    icon: ShieldAlert,
    promptTokens: 5,
    genTokens: 2,
    tag: "Micro-cost / 429 Probe",
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
    tag: "User Custom",
    metrics: ["TTFT P95", "ITL P95", "Decode tok/s", "Full Suite"],
  },
];

const CATEGORY_TABS: { id: WorkloadCategory; label: string }[] = [
  { id: "all", label: "All Profiles (16)" },
  { id: "latency", label: "Latency & TTFT" },
  { id: "throughput", label: "Decode & Jitter" },
  { id: "reasoning", label: "Reasoning & CoT" },
  { id: "agentic", label: "Agentic & Multi-Turn" },
  { id: "heavy_context", label: "Heavy Context & RAG" },
  { id: "code_structured", label: "Code & JSON" },
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
    id: "saturation_knee",
    label: "Saturation Knee Probe",
    desc: "Auto-steps 1→3→8→16→50 to discover KV/queue knee",
    icon: Gauge,
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

  // Automatically scroll to the top of the viewport whenever advancing or changing steps
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [currentStep]);

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

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Custom per-1M token price overrides
  const [customPromptPrice, setCustomPromptPrice] = useState<string>("");
  const [customCompletionPrice, setCustomCompletionPrice] = useState<string>("");

  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [showFullPrompt, setShowFullPrompt] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isEditingCustomPrompt, setIsEditingCustomPrompt] = useState<boolean>(false);

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
    const cmd = `llmark benchmark --vendor ${config.vendor} --model ${config.model || "gpt-4o"} --preset ${
      config.workload_preset
    } --concurrency ${config.concurrency} --${
      config.test_mode === "requests" ? `requests ${config.total_requests || 50}` : `duration ${config.duration_seconds}`
    }`;
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
  }, [canFetchModels, credential.api_key, credential.base_url, fetchModels]);

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
      if (
        (config.workload_preset === "structured_json" ||
          config.workload_preset === "json_schema" ||
          config.workload_preset === "agentic_tool_calling" ||
          config.workload_preset === "tool_calling") &&
        jsonSchemaError
      ) {
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
    { num: 1, title: "Endpoint & Identity", desc: "Protocol, Auth & Model Discovery" },
    { num: 2, title: "Workload & Payload", desc: "Profiles, Datasets & Sampling" },
    { num: 3, title: "Traffic & Load Profile", desc: "Concurrency, Curves & Cache" },
    { num: 4, title: "Governance & Launch", desc: "SLOs, Spend Cap & Pre-Flight" },
  ];

  const selectedPreset = PRESET_OPTIONS.find((p) => p.id === config.workload_preset) || PRESET_OPTIONS[0];
  const totalPresetTokens = selectedPreset.promptTokens + selectedPreset.genTokens;
  const capVal = config.hard_spend_cap || 2.0;
  const estCost = costEstimate?.estimated_cost_usd || 0;
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
        {/* Step-by-Step Stepper Header */}
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

        {/* Main Wizard Flow (Steps 1 - 4 with unified single-column layout) */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
              {/* ===================================================================== */}
              {/* STEP 1: ENDPOINT & IDENTITY (BASIC CONNECTION & MODEL DISCOVERY)      */}
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
                  {/* Card 1: Wire Protocol & Ephemeral Authentication */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Sliders className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Wire Protocol & Endpoint Routing
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Define benchmark session label, select target wire protocol, and configure in-memory credentials.
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs font-medium gap-1">
                          <Sliders className="h-3 w-3" /> Step 1 of 4 • Configurable
                        </Badge>
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
                                onChange={(e) =>
                                  onCredentialChange({ ...credential, azure_endpoint: e.target.value, base_url: e.target.value })
                                }
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

                  {/* Card 2: Target Model Discovery & Identity */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Target Model Discovery & Selection
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Discover models exposed by the active wire protocol or specify custom fine-tuned model identifiers.
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs font-medium gap-1">
                            <Sliders className="h-3 w-3" /> Configurable
                          </Badge>
                          {availableModels.length > 0 && !isLoadingModels && (
                            <Badge variant="emerald" className="gap-1 font-sans tabular-nums text-[11px] px-2 py-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {availableModels.length} models
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-4">
                      <div className="space-y-3">
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

                        <div className="p-2.5 rounded-lg bg-[#F3F4F4]/40 dark:bg-[#2C2C2C]/20 border border-[#2C2C2C]/8 dark:border-[#F3F4F4]/8 text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 flex items-center justify-between">
                          <span>
                            Selected Model: <strong className="font-sans tabular-nums text-[#853953] dark:text-[#A74B6A]">{config.model || "None"}</strong>
                          </span>
                          <span className="capitalize font-sans tabular-nums">{config.vendor.replace("_", " ")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ===================================================================== */}
              {/* STEP 2: WORKLOAD & PAYLOAD SEMANTICS (SCENARIO, DATASET & SAMPLING)   */}
              {/* ===================================================================== */}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-4"
                >
                  {/* Step 2 Sticky Mini-Anchor Bar */}
                  <div className="sticky top-2 z-10 p-1.5 rounded-xl bg-white/95 dark:bg-[#252426]/95 backdrop-blur-md border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-xs flex items-center gap-1.5 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => scrollToSection("section-2a")}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4] hover:bg-[#853953]/10 hover:text-[#853953] dark:hover:text-[#A74B6A] transition-all cursor-pointer"
                    >
                      <Layers className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                      <span className="font-semibold">2A. Workload Preset Scenario</span>
                      <Badge variant="outline" className="text-[10px] hidden sm:inline-flex ml-1">
                        {selectedPreset.name}
                      </Badge>
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollToSection("section-2b")}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4] hover:bg-[#853953]/10 hover:text-[#853953] dark:hover:text-[#A74B6A] transition-all cursor-pointer"
                    >
                      <Sliders className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                      <span className="font-semibold">2B. Generation & Sampling</span>
                      <Badge variant="outline" className="text-[10px] hidden sm:inline-flex ml-1 font-sans">
                        {config.max_tokens} tok @ T={config.temperature}
                      </Badge>
                    </button>
                  </div>

                  {/* SUB-STEP 2A: WORKLOAD SCENARIO PROFILES */}
                  <Card id="section-2a" className="scroll-mt-16">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Workload Scenario Profile
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Select the standardized prompt-to-completion token ratio to evaluate target use-case performance.
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs font-medium gap-1">
                          <Sliders className="h-3 w-3" /> Sub-Step 2A • Configurable
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-4">
                      {/* Search Bar & Workload Preset Categories */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40" />
                            <Input
                              type="text"
                              placeholder="Search workload scenarios (e.g. prefill, reasoning, code, json, throughput)..."
                              value={workloadSearchQuery}
                              onChange={(e) => setWorkloadSearchQuery(e.target.value)}
                              className="pl-8.5 pr-8 h-9 text-xs rounded-xl bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 focus:border-[#853953] dark:focus:border-[#A74B6A]"
                            />
                            {workloadSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setWorkloadSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2C2C2C]/40 hover:text-[#2C2C2C] dark:text-[#F3F4F4]/40 dark:hover:text-[#F3F4F4] cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Quick Category Filter Pills */}
                          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                            {[
                              { id: "all", label: "All (13)" },
                              { id: "latency", label: "Latency" },
                              { id: "throughput", label: "Throughput" },
                              { id: "reasoning", label: "Reasoning" },
                              { id: "heavy_context", label: "Long Context" },
                              { id: "code_structured", label: "JSON/Code" },
                              { id: "rate_limit", label: "Rate Limit" },
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id as WorkloadCategory)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                                  selectedCategory === cat.id
                                    ? "bg-[#853953] text-white shadow-2xs font-semibold"
                                    : "bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:bg-[#2C2C2C]/10 dark:hover:bg-[#F3F4F4]/10"
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredPresets.map((preset) => {
                            const Icon = preset.icon;
                            const isSelected = config.workload_preset === preset.id;
                            const totalTok = preset.promptTokens + preset.genTokens;
                            const promptRatio = Math.round((preset.promptTokens / totalTok) * 100);

                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => {
                                  onChange({
                                    ...config,
                                    workload_preset: preset.id,
                                    max_tokens: preset.genTokens,
                                  });
                                }}
                                className={`group p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                                  isSelected
                                    ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 text-[#853953] dark:text-[#A74B6A] ring-1 ring-[#853953]/30 shadow-xs"
                                    : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4]"
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`p-1.5 rounded-lg ${
                                          isSelected
                                            ? "bg-[#853953] text-white"
                                            : "bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 group-hover:text-[#853953] dark:group-hover:text-[#A74B6A]"
                                        }`}
                                      >
                                        <Icon className="h-4 w-4" />
                                      </div>
                                      <span className="font-semibold text-xs font-sans tracking-tight">
                                        {preset.name}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                      {preset.tag}
                                    </Badge>
                                  </div>

                                  <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 line-clamp-2 leading-relaxed">
                                    {preset.desc}
                                  </p>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 space-y-1.5">
                                  {/* Visual Prompt/Decode Balance Bar */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-sans tabular-nums text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                                      <span>In: {preset.promptTokens} tok</span>
                                      <span>Out: {preset.genTokens} tok</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[#2C2C2C]/10 dark:bg-[#F3F4F4]/10 rounded-full overflow-hidden flex">
                                      <div
                                        style={{ width: `${promptRatio}%` }}
                                        className="h-full bg-[#853953] dark:bg-[#A74B6A]"
                                      />
                                      <div
                                        style={{ width: `${100 - promptRatio}%` }}
                                        className="h-full bg-emerald-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Metric Tags */}
                                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                    {preset.metrics.slice(0, 3).map((m, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-[#2C2C2C]/5 dark:bg-[#F3F4F4]/5 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 font-sans tabular-nums"
                                      >
                                        {m}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {filteredPresets.length === 0 && (
                        <div className="text-center py-8 space-y-2">
                          <p className="text-xs text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                            No workload presets match &quot;{workloadSearchQuery}&quot;
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

                      {/* CALIBRATED PRODUCTION PROMPT & STRESS DIMENSION INSPECTOR */}
                      {(() => {
                        const promptDetails = WORKLOAD_PROMPT_PREVIEWS[config.workload_preset as WorkloadPreset] || WORKLOAD_PROMPT_PREVIEWS.custom;
                        const isCustom = Boolean(config.custom_prompt && config.custom_prompt.trim());
                        const activePromptText = isCustom ? config.custom_prompt! : promptDetails.prompt;

                        return (
                          <div className="mt-4 p-4 rounded-xl border border-[#853953]/25 dark:border-[#A74B6A]/30 bg-white dark:bg-[#201f22] space-y-3.5 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A]">
                                  <FileCode className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-[#2C2C2C] dark:text-[#F3F4F4]">
                                      Production Prompt Payload: {selectedPreset.name}
                                    </span>
                                    {isCustom ? (
                                      <Badge variant="default" className="text-[10px] bg-amber-500 text-white">
                                        Custom Override Active
                                      </Badge>
                                    ) : (
                                      <Badge variant="emerald" className="text-[10px]">
                                        Calibrated Benchmark Payload
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                                    Target Stress Dimension: <strong className="text-[#853953] dark:text-[#A74B6A]">{promptDetails.targetStressDimension}</strong>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(activePromptText || "");
                                    setCopiedPrompt(true);
                                    setTimeout(() => setCopiedPrompt(false), 2000);
                                  }}
                                  className="text-[11px] h-7 px-2.5 gap-1.5 cursor-pointer"
                                >
                                  {copiedPrompt ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-500" />
                                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>Copy Payload</span>
                                    </>
                                  )}
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowFullPrompt(!showFullPrompt)}
                                  className="text-[11px] h-7 px-2 cursor-pointer text-[#853953] dark:text-[#A74B6A]"
                                >
                                  {showFullPrompt ? "Collapse" : "Expand All"}
                                </Button>
                              </div>
                            </div>

                            <p className="text-xs text-[#2C2C2C]/75 dark:text-[#F3F4F4]/75 leading-relaxed">
                              {promptDetails.purpose}
                            </p>

                            {/* Prompt Codebox or Custom Textarea */}
                            {isEditingCustomPrompt ? (
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[11px]">
                                  <Label className="font-semibold text-xs text-[#853953] dark:text-[#A74B6A]">
                                    Custom Prompt Override Editor
                                  </Label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onChange({ ...config, custom_prompt: undefined });
                                      setIsEditingCustomPrompt(false);
                                    }}
                                    className="text-[10px] text-[#853953] dark:text-[#A74B6A] hover:underline cursor-pointer"
                                  >
                                    Reset to Calibrated Preset Prompt
                                  </button>
                                </div>
                                <textarea
                                  value={config.custom_prompt || ""}
                                  onChange={(e) => onChange({ ...config, custom_prompt: e.target.value })}
                                  placeholder="Enter your exact custom prompt payload here..."
                                  rows={6}
                                  className="w-full text-xs font-mono p-3 rounded-lg border border-[#2C2C2C]/20 dark:border-[#F3F4F4]/20 bg-white dark:bg-[#181719] text-[#2C2C2C] dark:text-[#F3F4F4] focus:outline-none focus:ring-1 focus:ring-[#853953]"
                                />
                              </div>
                            ) : (
                              <div className="relative">
                                <pre
                                  className={`text-[11px] font-mono leading-relaxed p-3.5 rounded-lg bg-[#F3F4F4] dark:bg-[#181719] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-[#2C2C2C] dark:text-[#F3F4F4] overflow-x-auto whitespace-pre-wrap ${
                                    showFullPrompt ? "max-h-96" : "max-h-28"
                                  }`}
                                >
                                  {activePromptText}
                                </pre>
                                {!showFullPrompt && activePromptText.length > 200 && (
                                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#F3F4F4] dark:from-[#181719] to-transparent rounded-b-lg flex items-end justify-center pb-1">
                                    <button
                                      type="button"
                                      onClick={() => setShowFullPrompt(true)}
                                      className="text-[10px] font-semibold text-[#853953] dark:text-[#A74B6A] hover:underline cursor-pointer"
                                    >
                                      Show full payload ({activePromptText.length} chars)
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              <div className="flex items-center gap-3">
                                <span>Calibrated Budget: <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">{selectedPreset.promptTokens.toLocaleString()} prompt tok</strong> + <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">{selectedPreset.genTokens.toLocaleString()} gen tok</strong></span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsEditingCustomPrompt(!isEditingCustomPrompt)}
                                className="font-semibold text-[#853953] dark:text-[#A74B6A] hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>{isEditingCustomPrompt ? "View Calibrated Payload" : "Customize / Override Payload"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* SUB-STEP 2B: MODEL SAMPLING & OUTPUT CEILINGS */}
                  <Card id="section-2b" className="scroll-mt-16">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Sliders className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Generation Hyper-parameters & Sampling
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Set maximum generation token bounds and sampling temperature for deterministic vs. creative decoding.
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs font-medium gap-1">
                          <Sliders className="h-3 w-3" /> Sub-Step 2B • Configurable
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-5">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        <div className="lg:col-span-5 space-y-4">
                          {/* Max Tokens Slider */}
                          <div className="space-y-2 p-3.5 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#2C2C2C]/40 border border-[#2C2C2C]/10">
                            <div className="flex justify-between items-center text-xs">
                              <Label className="font-semibold">Max Tokens Limit (Generation Ceiling)</Label>
                              <Badge variant="outline" className="font-sans tabular-nums text-xs font-medium">
                                {config.max_tokens} tokens
                              </Badge>
                            </div>
                            <Slider
                              min={16}
                              max={4096}
                              step={16}
                              value={[config.max_tokens]}
                              onValueChange={(val) => onChange({ ...config, max_tokens: val[0] })}
                            />
                            <div className="flex justify-between text-[11px] font-sans tabular-nums text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 pt-0.5">
                              <span>16</span>
                              <span>256 (Default)</span>
                              <span>4096</span>
                            </div>
                          </div>

                          {/* Temperature Slider */}
                          <div className="space-y-2 p-3.5 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#2C2C2C]/40 border border-[#2C2C2C]/10">
                            <div className="flex justify-between items-center text-xs">
                              <Label className="font-semibold">Sampling Temperature</Label>
                              <Badge variant="outline" className="font-sans tabular-nums text-xs font-medium">
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

                          <div className="p-3.5 rounded-xl border border-[#853953]/20 dark:border-[#A74B6A]/20 bg-[#853953]/5 dark:bg-[#A74B6A]/5 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-semibold text-[#853953] dark:text-[#A74B6A]">
                                <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                                <span>Temperature & Determinism</span>
                              </div>
                              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-1.5">
                                Reference Only
                              </Badge>
                            </div>
                            <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed font-normal">
                              Setting temperature to <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">0.0</strong> enables greedy decoding, ensuring 100% reproducible token generation paths across repeated runs.
                            </p>
                          </div>
                        </div>

                        {/* Softmax Density Graph */}
                        <div className="lg:col-span-7">
                          <SamplingEntropyDistributionGraph
                            temperature={config.temperature}
                            maxTokens={config.max_tokens}
                          />
                        </div>
                      </div>

                      {/* Structured JSON Schema Editor */}
                      {(config.workload_preset === "structured_json" ||
                        config.workload_preset === "json_schema" ||
                        config.workload_preset === "agentic_tool_calling" ||
                        config.workload_preset === "tool_calling" ||
                        Boolean(config.json_schema)) && (
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

                  {/* Step 2 Bottom Navigation Bar */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-xs">
                    <span className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                      Configured: <strong className="text-[#853953] dark:text-[#A74B6A]">{selectedPreset.name}</strong> (~{totalPresetTokens} tok calibrated payload) • <strong className="text-[#853953] dark:text-[#A74B6A]">{config.max_tokens} max tok</strong>
                    </span>
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="text-xs bg-[#853953] hover:bg-[#743663] text-white cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Continue to Step 3: Traffic & Load Profile</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ===================================================================== */}
              {/* STEP 3: TRAFFIC DYNAMICS, LOAD CURVES & CACHE SEMANTICS               */}
              {/* ===================================================================== */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-4"
                >
                  {/* Step 3 Sticky Mini-Anchor Bar */}
                  <div className="sticky top-2 z-10 p-1.5 rounded-xl bg-white/95 dark:bg-[#252426]/95 backdrop-blur-md border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-xs flex items-center gap-1.5 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => scrollToSection("section-3a")}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4] hover:bg-[#853953]/10 hover:text-[#853953] dark:hover:text-[#A74B6A] transition-all cursor-pointer"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                      <span className="font-semibold">3A. Concurrency & Scope</span>
                      <Badge variant="outline" className="text-[10px] hidden sm:inline-flex ml-1 capitalize">
                        {config.concurrency} streams
                      </Badge>
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollToSection("section-3b")}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4] hover:bg-[#853953]/10 hover:text-[#853953] dark:hover:text-[#A74B6A] transition-all cursor-pointer"
                    >
                      <Radio className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                      <span className="font-semibold">3B. Arrival Waveforms</span>
                      <Badge variant="outline" className="text-[10px] hidden sm:inline-flex ml-1 capitalize">
                        {config.load_curve.replace("_", " ")}
                      </Badge>
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollToSection("section-3c")}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4] hover:bg-[#853953]/10 hover:text-[#853953] dark:hover:text-[#A74B6A] transition-all cursor-pointer"
                    >
                      <Database className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                      <span className="font-semibold">3C. Cache & Hardware</span>
                      <Badge variant="outline" className="text-[10px] hidden sm:inline-flex ml-1">
                        {config.cache_bust ? "Cold Prefill" : "Standard Cache"}
                      </Badge>
                    </button>
                  </div>

                  {/* SUB-STEP 3A: EXECUTION SCOPE & CONCURRENCY */}
                  <Card id="section-3a" className="scroll-mt-16">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Execution Strategy & Concurrency Level
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Configure parallel worker streams and select duration or request batch boundaries.
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs font-medium gap-1">
                          <Sliders className="h-3 w-3" /> Sub-Step 3A • Configurable
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-5">
                      {/* Strategy Mode Toggle */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">
                          Benchmark Execution Strategy
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

                      {/* Scope & Concurrency Sliders Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {isRequestMode ? (
                          <div className="space-y-2 p-3.5 rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10">
                            <div className="flex justify-between items-center text-xs">
                              <Label className="flex items-center gap-1.5">
                                <Target className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                                Total Request Batch Volume
                              </Label>
                              <Badge variant="default" className="font-sans tabular-nums text-xs font-medium">
                                {config.total_requests || 50} requests
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
                          <div className="space-y-2 p-3.5 rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10">
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
                        <div className="space-y-2 p-3.5 rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C]/50 border border-[#2C2C2C]/10">
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
                      </div>
                    </CardContent>
                  </Card>

                  {/* SUB-STEP 3B: ARRIVAL LOAD CURVES & WAVEFORMS */}
                  <Card id="section-3b" className="scroll-mt-16">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Radio className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Arrival Waveforms & Queuing Load Dynamics
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Simulate steady load, linear ramp-ups, burst spikes, or Poisson distributions to isolate server queueing delays.
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs font-medium gap-1">
                          <Sliders className="h-3 w-3" /> Sub-Step 3B • Configurable
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-5">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {LOAD_CURVE_OPTIONS.map((curve) => {
                          const Icon = curve.icon;
                          const isSelected = config.load_curve === curve.id;
                          return (
                            <button
                              key={curve.id}
                              type="button"
                              onClick={() => onChange({ ...config, load_curve: curve.id })}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer select-none active:scale-[0.98] ${
                                isSelected
                                  ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/50 dark:border-[#A74B6A]/50 text-[#853953] dark:text-[#A74B6A] ring-1 ring-[#853953]/20 font-medium shadow-xs"
                                  : "bg-white dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C] text-[#2C2C2C] dark:text-[#F3F4F4]"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <Icon className="h-3.5 w-3.5" />
                                <span className="text-xs truncate font-medium">{curve.label}</span>
                              </div>
                              <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 line-clamp-1">{curve.desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Integrated Waveform Visualization & Queuing Theory Insight */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                        <div className="lg:col-span-8">
                          <WaveformSimulationGraph
                            loadCurve={config.load_curve}
                            concurrency={config.concurrency}
                            testMode={config.test_mode}
                            durationSeconds={config.duration_seconds}
                            totalRequests={config.total_requests}
                            warmupRequests={config.warmup_requests}
                          />
                        </div>

                        <div className="lg:col-span-4 p-4 rounded-xl border border-[#853953]/20 dark:border-[#A74B6A]/20 bg-[#853953]/5 dark:bg-[#A74B6A]/5 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-[#853953] dark:text-[#A74B6A]">
                              <Lightbulb className="h-4 w-4 shrink-0" />
                              <span>Queuing Theory & Load Curves</span>
                            </div>
                            <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-1.5">
                              Reference Only
                            </Badge>
                          </div>
                          <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed font-normal">
                            Under high concurrency, LLM clusters exhaust KV cache VRAM slots and begin buffering streams. Testing arrival curves isolates the concurrency threshold where queue backpressure begins degrading TTFT.
                          </p>
                          <div className="pt-2.5 border-t border-[#853953]/15 text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 space-y-1.5">
                            <div className="flex justify-between">
                              <span>Selected Waveform:</span>
                              <span className="font-semibold text-[#853953] dark:text-[#A74B6A] capitalize">
                                {config.load_curve.replace("_", " ")}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Concurrency Pool:</span>
                              <span className="font-sans tabular-nums font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                                {config.concurrency} worker streams
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Token Bucket Rate Limiter Simulation */}
                      <TokenBucketReservoir
                        concurrency={config.concurrency}
                        loadCurve={config.load_curve}
                        promptTokens={selectedPreset.promptTokens}
                        maxTokens={config.max_tokens}
                      />
                    </CardContent>
                  </Card>

                  {/* SUB-STEP 3C: CACHE SEMANTICS, SOCKET WARMUP & HARDWARE VRAM */}
                  <Card id="section-3c" className="scroll-mt-16">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Database className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              Cache Semantics, Socket Warmup & Hardware VRAM
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Isolate raw hardware prefill from shared prefix caching, prime TCP/TLS sockets, and estimate KV cache allocation.
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs font-medium gap-1">
                          <Sliders className="h-3 w-3" /> Sub-Step 3C • Configurable
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-5">
                      {/* KV Cache Bypass Switch & Architectural Insight */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                        <div className="md:col-span-7 flex items-center justify-between p-3.5 rounded-xl bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 border border-[#2C2C2C]/10">
                          <div className="space-y-0.5 pr-2">
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

                        <div className="md:col-span-5 p-3 rounded-xl border border-[#853953]/20 dark:border-[#A74B6A]/20 bg-[#853953]/5 dark:bg-[#A74B6A]/5 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-[#853953] dark:text-[#A74B6A]">
                              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                              <span>Raw Prefill Verification</span>
                            </div>
                            <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-1.5">
                              Reference Only
                            </Badge>
                          </div>
                          <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed font-normal">
                            Modern LLM providers cache shared prefixes. Nonce injection forces true cold GPU execution per stream.
                          </p>
                        </div>
                      </div>

                      {/* Warmup Requests Slider */}
                      <div className="space-y-2 p-3.5 rounded-xl bg-[#F3F4F4]/60 dark:bg-[#2C2C2C]/40 border border-[#2C2C2C]/10">
                        <div className="flex justify-between items-center text-xs">
                          <Label className="flex items-center gap-1.5">
                            <RotateCw className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                            Warmup Requests (Prime TCP/TLS Sockets, Discarded from Latency)
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
                          <span>2 (Recommended to prime sockets)</span>
                          <span>10 (Full cluster prime)</span>
                        </div>
                      </div>

                      {/* GPU VRAM & Physical KV Cache Allocation Matrix */}
                      <VramAllocationMatrix
                        model={config.model}
                        promptTokens={selectedPreset.promptTokens}
                        maxTokens={config.max_tokens}
                        concurrency={config.concurrency}
                        cacheBust={config.cache_bust}
                      />
                    </CardContent>
                  </Card>

                  {/* Step 3 Bottom Navigation Bar */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-xs">
                    <span className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                      Configured: <strong className="text-[#853953] dark:text-[#A74B6A]">{config.concurrency} streams</strong> • <strong className="capitalize">{config.load_curve.replace("_", " ")}</strong> • <strong>{isRequestMode ? `${config.total_requests || 50} reqs` : `${config.duration_seconds}s`}</strong> • <strong>{config.cache_bust ? "Cold Prefill" : "Warm Cache"}</strong>
                    </span>
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="text-xs bg-[#853953] hover:bg-[#743663] text-white cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Continue to Step 4: Governance & Launch</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ===================================================================== */}
              {/* STEP 4: GOVERNANCE, BUDGET GUARDRAILS & LAUNCH COCKPIT (ADVANCED)     */}
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
                  {/* SUB-STEP 4A: RELIABILITY SLOS & GOODPUT CEILINGS */}
                  <Card id="section-4a">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Gauge className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              4A. Reliability SLOs & Goodput Ceilings
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Establish latency and error thresholds to measure the percentage of production-grade requests (Goodput).
                            </CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs font-medium gap-1">
                            <Sliders className="h-3 w-3" /> Sub-Step 4A • Configurable
                          </Badge>

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
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Max TTFT */}
                        <div className="space-y-1.5 p-3.5 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10">
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
                        <div className="space-y-1.5 p-3.5 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10">
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
                        <div className="space-y-1.5 p-3.5 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10">
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
                        <div className="space-y-1.5 p-3.5 rounded-xl bg-[#F3F4F4]/50 dark:bg-[#2C2C2C]/30 border border-[#2C2C2C]/10">
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

                      {/* Interactive Goodput Yield & Latency Distribution Graph */}
                      <SloGoodputDistributionGraph
                        maxTtftMs={config.slo.max_ttft_ms}
                        maxTpotMs={config.slo.max_tpot_ms}
                        maxErrorRatePct={config.slo.max_error_rate_pct}
                        maxE2eMs={config.slo.max_e2e_ms}
                      />

                      {/* 3-Stage Reliability Sieve Pipeline */}
                      <GoodputSievePipeline
                        maxTtftMs={config.slo.max_ttft_ms}
                        maxTpotMs={config.slo.max_tpot_ms}
                        maxErrorRatePct={config.slo.max_error_rate_pct}
                        maxE2eMs={config.slo.max_e2e_ms}
                      />
                    </CardContent>
                  </Card>

                  {/* SUB-STEP 4B: FINANCIAL GUARDRAILS & TOKEN ECONOMICS */}
                  <Card id="section-4b">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              4B. Financial Guardrails & Token Economics
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Configure per-1M token rates, arm the automated spend cap circuit breaker, and review cost projections.
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs font-medium gap-1">
                            <Sliders className="h-3 w-3" /> Sub-Step 4B • Configurable
                          </Badge>
                          <Badge variant="emerald" className="font-sans tabular-nums text-xs font-semibold">
                            {formatUsd(config.hard_spend_cap || 2.0)} cap
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-5">
                      {/* Token Pricing Rates */}
                      <div className="rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/60 dark:bg-[#252426] p-4 space-y-3">
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
                            <span>Reset to standard catalog</span>
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

                      {/* Hard Spend Cap & Trajectory Graph */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        <div className="lg:col-span-5 space-y-4">
                          <div className="space-y-2 p-3.5 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#2C2C2C]/40 border border-[#2C2C2C]/10">
                            <div className="flex justify-between items-center text-xs">
                              <Label className="font-semibold">Hard Spend Cap Ceiling</Label>
                              <Badge variant="emerald" className="font-sans tabular-nums text-xs font-semibold">
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
                              <span>$0.25 (Micro)</span>
                              <span>$5.00</span>
                              <span>$10.00 (Deep Soak)</span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl border border-[#853953]/20 dark:border-[#A74B6A]/20 bg-[#853953]/5 dark:bg-[#A74B6A]/5 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-semibold text-[#853953] dark:text-[#A74B6A]">
                                <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                                <span>Zero Bill-Shock Circuit Breaker</span>
                              </div>
                              <Badge variant="purple" className="text-[10px] font-sans font-medium py-0 px-1.5">
                                Reference Only
                              </Badge>
                            </div>
                            <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 leading-relaxed font-normal">
                              If live benchmark spend reaches the hard spend cap at any millisecond during execution, the runner immediately terminates all worker streams and finalizes the report cleanly.
                            </p>
                          </div>
                        </div>

                        <div className="lg:col-span-7">
                          <SpendTrajectoryGraph
                            hardSpendCap={config.hard_spend_cap || 2.0}
                            estimatedCost={estCost}
                            testMode={config.test_mode}
                            durationSeconds={config.duration_seconds}
                            totalRequests={config.total_requests}
                            concurrency={config.concurrency}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SUB-STEP 4C: PRE-FLIGHT COCKPIT & LIVE LAUNCH */}
                  <Card id="section-4c">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                              4C. Pre-Flight Cockpit & Launch
                            </CardTitle>
                            <CardDescription className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
                              Verify benchmark target parameters, load dynamics, budget limits, and latency SLOs before live execution.
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="emerald" className="font-medium text-xs gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Sub-Step 4C • Launch Cockpit
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

                      {/* Quick Glance Compact Summary Bar */}
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

                      {/* Interactive Latency Waterfall & Turnaround Physics */}
                      <LatencyWaterfallInspector
                        promptTokens={selectedPreset.promptTokens}
                        maxTokens={config.max_tokens}
                        vendor={config.vendor}
                        model={config.model}
                        cacheBust={config.cache_bust}
                      />

                      {/* Structured Pre-Flight Specification Matrix */}
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

                      {/* Pre-Flight Health Audit & Developer Quick Export */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-1">
                        {/* Pre-Flight Health Audit (Reference) */}
                        <div className="lg:col-span-8 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4]">
                                  Pre-Flight Health Audit
                                </span>
                                <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
                                  100% Validated & Safe to Launch
                                </p>
                              </div>
                            </div>
                            <Badge variant="purple" className="text-[10px] font-sans font-medium px-2 py-0.5">
                              Pre-Flight Audit • Reference
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/90 dark:bg-[#1e1d20] border border-emerald-200/60 dark:border-emerald-800/40">
                              <span className="text-[11px] flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-normal">
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                Target Endpoint & Model
                              </span>
                              <span className="font-sans tabular-nums text-[11px] text-emerald-700 dark:text-emerald-300 truncate max-w-[140px] font-medium">
                                {config.model}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/90 dark:bg-[#1e1d20] border border-emerald-200/60 dark:border-emerald-800/40">
                              <span className="text-[11px] flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-normal">
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                Workload Profile Matrix
                              </span>
                              <span className="font-sans tabular-nums text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                {config.workload_preset}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/90 dark:bg-[#1e1d20] border border-emerald-200/60 dark:border-emerald-800/40">
                              <span className="text-[11px] flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-normal">
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                Financial Spend Cap Armed
                              </span>
                              <span className="font-sans tabular-nums text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                {formatUsd(capVal)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/90 dark:bg-[#1e1d20] border border-emerald-200/60 dark:border-emerald-800/40">
                              <span className="text-[11px] flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-normal">
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                Live SSE Telemetry Stream
                              </span>
                              <span className="font-sans tabular-nums text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                100ms sync
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Developer Quick Export */}
                        <div className="lg:col-span-4 p-4 rounded-xl border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/50 dark:bg-[#252426] flex flex-col justify-between space-y-3">
                          <div>
                            <span className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-1.5">
                              <Terminal className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                              Developer Quick Export
                            </span>
                            <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 mt-0.5">
                              Export run spec for CLI or automation
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCopyCli}
                              className="w-full text-xs justify-between font-sans tabular-nums cursor-pointer bg-white dark:bg-[#1f1e21]"
                            >
                              <span>Copy CLI Command</span>
                              {copiedSnippet === "cli" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCopyJson}
                              className="w-full text-xs justify-between font-sans tabular-nums cursor-pointer bg-white dark:bg-[#1f1e21]"
                            >
                              <span>Copy Config JSON</span>
                              {copiedSnippet === "json" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
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
    </TooltipProvider>
  );
};
