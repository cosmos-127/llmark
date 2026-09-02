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
  Flame,
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
import { AskExpertDrawer, AskExpertContext } from "@/components/common/AskExpertDrawer";
import { PayloadDynamicsModal } from "@/components/test-configurator/PayloadDynamicsModal";
import { TrafficSimulationModal } from "@/components/test-configurator/TrafficSimulationModal";
import { DiagnosticsPipelineModal } from "@/components/test-configurator/DiagnosticsPipelineModal";
import { PresetParametersInspector } from "@/components/test-configurator/PresetParametersInspector";

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
  | "reasoning_agentic"
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
    promptTokens: 123,
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
    promptTokens: 4280,
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
    promptTokens: 139,
    genTokens: 800,
    tag: "Decode & ITL",
    metrics: ["Decode tok/s", "ITL P95", "Max Freeze", "TPOT Mean"],
  },
  {
    id: "reasoning_cot",
    name: "Reasoning & CoT Deep-Dive",
    desc: "Chain-of-thought prompts measuring Time to First Answer (TTFA), thinking duration & reasoning token budget",
    category: "reasoning_agentic",
    icon: Brain,
    promptTokens: 383,
    genTokens: 800,
    tag: "Reasoning & TTFA",
    metrics: ["TTFA P95", "Thinking tok/s", "Reasoning Ratio", "Goodput"],
  },
  {
    id: "agentic_tool_calling",
    name: "Agentic Tool & Function Calling",
    desc: "Multi-tool definitions & schemas measuring tool call latency, arguments validity & invocation throughput",
    category: "reasoning_agentic",
    icon: Wrench,
    promptTokens: 1220,
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
    promptTokens: 1111,
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
    promptTokens: 787,
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
    promptTokens: 3151,
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
    promptTokens: 1412,
    genTokens: 200,
    tag: "Vision & OCR",
    metrics: ["TTFT P95", "Multimodal Prefill", "TPOT Mean", "Goodput"],
  },
  {
    id: "multiturn_agentic",
    name: "Multi-Turn Session Context",
    desc: "Accumulated multi-turn conversation history measuring KV cache expansion, turn latency drift & memory pressure",
    category: "reasoning_agentic",
    icon: MessagesSquare,
    promptTokens: 1314,
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
    promptTokens: 3389,
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
    promptTokens: 16284,
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
    promptTokens: 3642,
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
    promptTokens: 675,
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

const CATEGORY_TABS: { id: WorkloadCategory; label: string; shortLabel: string }[] = [
  { id: "all", label: "All Presets", shortLabel: "All Presets" },
  { id: "latency", label: "Interactive & Latency", shortLabel: "Latency & TTFT" },
  { id: "throughput", label: "Streaming & Throughput", shortLabel: "Throughput" },
  { id: "reasoning_agentic", label: "Reasoning & Agentic", shortLabel: "Reasoning & Agentic" },
  { id: "heavy_context", label: "Heavy Context & RAG", shortLabel: "Long Context & RAG" },
  { id: "code_structured", label: "Code & Structured Data", shortLabel: "Code & JSON" },
  { id: "rate_limit", label: "429 Rate Limits", shortLabel: "429 Limits" },
  { id: "custom", label: "Custom Studio", shortLabel: "Custom Studio" },
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

  // Ask the Expert Copilot Drawer state
  const [isExpertDrawerOpen, setIsExpertDrawerOpen] = useState<boolean>(false);
  const [expertContext, setExpertContext] = useState<AskExpertContext | null>(null);

  // On-demand Diagnostic Modals
  const [isPayloadModalOpen, setIsPayloadModalOpen] = useState<boolean>(false);
  const [isTrafficModalOpen, setIsTrafficModalOpen] = useState<boolean>(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState<boolean>(false);

  const handleOpenExpert = (topicId: string, title?: string, defaultQuestion?: string) => {
    setExpertContext({ topicId, title, defaultQuestion });
    setIsExpertDrawerOpen(true);
  };

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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: PRESET_OPTIONS.length };
    PRESET_OPTIONS.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, []);



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
      const isApiKeyMode = (credential.gcp_auth_mode || "api_key") === "api_key";
      return isApiKeyMode ? !!credential.api_key?.trim() : !!credential.gcp_project_id?.trim();
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
    credential.gcp_auth_mode,
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
      if (config.vendor === "gcp_vertex") {
        const isApiKeyMode = (credential.gcp_auth_mode || "api_key") === "api_key";
        if (isApiKeyMode && !credential.api_key?.trim()) {
          setValidationError("Gemini API Key (AIzaSy...) is required for Google AI Studio");
          return false;
        }
        if (!isApiKeyMode && !credential.gcp_project_id?.trim()) {
          setValidationError("GCP Project ID is required for Vertex AI");
          return false;
        }
      }
    }
    if (step === 2) {
      if (!config.workload_preset && !config.custom_prompt) {
        setValidationError("Please select a workload preset from the grid above or enter a custom prompt to proceed");
        return false;
      }
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
    { num: 1, title: "Provider & Model", desc: "API credentials and model selection" },
    { num: 2, title: "Presets & Prompts", desc: "Workload preset and sampling" },
    { num: 3, title: "Traffic & Load", desc: "Concurrency and cache mode" },
    { num: 4, title: "Limits & Launch", desc: "Latency limits, budget, and review" },
  ];


  const selectedPreset = PRESET_OPTIONS.find((p) => p.id === config.workload_preset);

  // Preset & Workload Invariant Locks
  const isKvCachePreset = config.workload_preset === "kv_cache_reuse";
  const isPrefillTtftPreset = config.workload_preset === "prefill_ttft";
  const isRateLimitPreset = config.workload_preset === "rate_limit_probe";
  const isDecodePreset = config.workload_preset === "decode_throughput";
  const isReasoningPreset = config.workload_preset === "reasoning_cot";
  const isKneeCurve = config.load_curve === "saturation_knee";

  // Preset-demanded configuration locks
  const isCacheBustLocked = isKvCachePreset || isPrefillTtftPreset || isRateLimitPreset;
  const isMeasureCacheSpeedupLocked = isKvCachePreset || isPrefillTtftPreset || isRateLimitPreset || config.cache_bust;
  const isWarmupLocked = isKvCachePreset || isRateLimitPreset || Boolean(config.measure_cache_speedup);
  const isMaxTokensLocked = isPrefillTtftPreset || isRateLimitPreset || (config.workload_preset !== "custom" && !config.custom_prompt);
  const isStreamLocked = isPrefillTtftPreset || isDecodePreset || isReasoningPreset;

  // Auto-enforce preset invariants in state when workload preset changes
  useEffect(() => {
    let changed = false;
    const updated = { ...config };

    if (isKvCachePreset) {
      if (updated.cache_bust !== false) {
        updated.cache_bust = false;
        changed = true;
      }
      if (updated.measure_cache_speedup !== true) {
        updated.measure_cache_speedup = true;
        changed = true;
      }
      if (updated.warmup_requests !== 0) {
        updated.warmup_requests = 0;
        changed = true;
      }
    } else if (isPrefillTtftPreset) {
      if (updated.cache_bust !== true) {
        updated.cache_bust = true;
        changed = true;
      }
      if (updated.measure_cache_speedup) {
        updated.measure_cache_speedup = false;
        changed = true;
      }
      if (updated.stream !== true) {
        updated.stream = true;
        changed = true;
      }
    } else if (isRateLimitPreset) {
      if (updated.warmup_requests !== 0) {
        updated.warmup_requests = 0;
        changed = true;
      }
      if (updated.measure_cache_speedup) {
        updated.measure_cache_speedup = false;
        changed = true;
      }
    }

    if (updated.cache_bust && updated.measure_cache_speedup && !isKvCachePreset) {
      updated.measure_cache_speedup = false;
      changed = true;
    }

    if (changed) {
      onChange(updated);
    }
  }, [config.workload_preset, config.cache_bust, config.measure_cache_speedup, config.warmup_requests, config.stream, isKvCachePreset, isPrefillTtftPreset, isRateLimitPreset, onChange, config]);

  const totalPresetTokens = selectedPreset ? (selectedPreset.promptTokens + selectedPreset.genTokens) : 0;
  const capVal = config.hard_spend_cap || 2.0;
  const estCost = costEstimate?.estimated_cost_usd || 0;
  const isRequestMode = config.test_mode === "requests";

  const getTemperatureLabel = (temp: number) => {
    if (temp === 0) return "0.0 (Deterministic)";
    if (temp <= 0.3) return `${temp.toFixed(1)} (Precise)`;
    if (temp <= 0.7) return `${temp.toFixed(1)} (Balanced)`;
    if (temp <= 1.0) return `${temp.toFixed(1)} (Creative)`;
    return `${temp.toFixed(1)} (High Variance)`;
  };


  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Step-by-Step Stepper Header */}
        <Card className="p-3 sm:p-4 bg-[var(--bg-surface-elevated)] backdrop-blur-md border-[var(--border-subtle)] shadow-xs">
          {/* Subtle Continuous Progress Trail */}
          <div className="w-full bg-[var(--border-subtle)]/50 dark:bg-[var(--bg-surface-subtle)]/5 h-1 rounded-full overflow-hidden mb-3.5 hidden sm:block">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-secondary)] to-[var(--brand-primary)] rounded-full"
              initial={false}
              animate={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>

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
                      ? "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] shadow-xs ring-1 ring-[var(--brand-primary)]/20 dark:ring-[var(--brand-primary)]/30"
                      : isDone
                      ? "bg-[var(--bg-surface-subtle)] border-[var(--brand-primary-border)] hover:bg-[var(--bg-surface-hover)]"
                      : "bg-white/60 dark:bg-[var(--bg-surface)] border-[var(--border-subtle)] opacity-60 hover:opacity-85"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-sans tabular-nums text-xs font-semibold transition-colors ${
                      isCurrent
                        ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] shadow-xs"
                        : isDone
                        ? "bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)]"
                        : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </div>
                  <div className="truncate">
                    <span
                      className={`text-xs truncate block ${
                        isCurrent
                          ? "text-[var(--brand-primary)] font-semibold"
                          : isDone
                          ? "text-[var(--text-main)] font-medium"
                          : "text-[var(--text-muted)] font-normal"
                      }`}
                    >
                      {s.title}
                    </span>
                    <p className="text-[11px] text-[var(--text-subtle)] truncate hidden sm:block">
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
              {/* STEP 1: PROVIDER & MODEL                                              */}
              {/* ===================================================================== */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] shadow-xs overflow-hidden"
                >
                  {/* Step 1 Unified Master Header */}
                  <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/40 dark:bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)] shadow-2xs">
                        <Sliders className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                          Step 1: Provider & Model
                        </h2>
                        <p className="text-xs text-[var(--text-muted)]">
                          Select your LLM provider, enter credentials, and choose the target model.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenExpert("provider-routing", "Provider & Routing", "How do providers differ in streaming and response latency?")}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-[var(--bg-card)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] border border-[var(--brand-primary-border)] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Ask Expert</span>
                      </button>
                    </div>
                  </div>

                  {/* 2-Column Bento Grid Body (65:35 Ratio) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#0F172A]/10 dark:divide-[#F1F5F9]/10">
                    {/* Left Bento Column: Sub-Step 1A (Provider & Credentials) - 65% */}
                    <div className="lg:col-span-8 p-5 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                        <span className="text-xs font-bold tracking-tight text-[var(--brand-primary)] flex items-center gap-1.5 font-sans">
                          <Sliders className="h-3.5 w-3.5" />
                          1A. Provider & Credentials
                        </span>
                        <Badge variant="outline" className="text-[10px] font-sans capitalize">
                          {config.vendor.replace("_", " ")}
                        </Badge>
                      </div>

                      {/* Session Run Name */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="run-name-input" className="text-xs font-semibold">
                            Benchmark Name
                          </Label>
                          <span className="text-[11px] text-[var(--text-subtle)] font-sans">
                            Optional label
                          </span>
                        </div>
                        <Input
                          id="run-name-input"
                          value={config.name}
                          onChange={(e) => onChange({ ...config, name: e.target.value })}
                          placeholder="e.g. Production Baseline Test"
                          className="text-xs font-medium bg-[var(--bg-card)]"
                        />
                      </div>

                      {/* 1. Protocol Architecture Selection Grid */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-[var(--text-main)]">
                          Select Provider
                        </Label>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            {
                              id: "openai_compatible",
                              label: "OpenAI Wire",
                              sublabel: "/v1/chat/completions",
                              badge: "Universal",
                              vendor: "openai",
                            },
                            {
                              id: "azure_openai",
                              label: "Azure OpenAI",
                              sublabel: "Foundry & VPC",
                              badge: "Enterprise",
                              vendor: "azure",
                            },
                            {
                              id: "anthropic",
                              label: "Anthropic",
                              sublabel: "/v1/messages",
                              badge: "Frontier",
                              vendor: "anthropic",
                            },
                            {
                              id: "aws_bedrock",
                              label: "AWS Bedrock",
                              sublabel: "SigV4 Runtime",
                              badge: "Enterprise",
                              vendor: "aws_bedrock",
                            },
                            {
                              id: "gcp_vertex",
                              label: "Google (Gemini & GCP)",
                              sublabel: "API Key or Project ID",
                              badge: "Enterprise",
                              vendor: "gcp_vertex",
                            },
                            {
                              id: "mock",
                              label: "Simulator Engine",
                              sublabel: "Zero-Cost Microseconds",
                              badge: "Free",
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
                                className={`group rounded-xl p-2.5 text-left border transition-all cursor-pointer font-sans select-none flex flex-col justify-between gap-1.5 ${
                                  isSelected
                                    ? "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] shadow-xs ring-1 ring-[var(--brand-primary)]/30 text-[var(--brand-primary)]"
                                    : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)]"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg p-0.5 transition-all ${
                                        isSelected
                                          ? "bg-[var(--bg-surface-elevated)] border border-[var(--brand-primary-border)]"
                                          : "bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]"
                                      }`}
                                    >
                                      <ProviderLogo vendor={v.vendor} className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-semibold truncate block">{v.label}</span>
                                  </div>
                                  <Badge variant={isSelected ? "default" : "secondary"} className="text-[9px] px-1 py-0 font-medium">
                                    {v.badge}
                                  </Badge>
                                </div>
                                <span className="text-[10px] font-sans text-[var(--text-subtle)] truncate block">
                                  {v.sublabel}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Endpoint Connection & Dynamic Ephemeral Credentials */}
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-[var(--text-main)] flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                            Credentials & Endpoint URL
                          </Label>
                          <span className="text-[10px] text-[var(--brand-primary)] font-sans font-medium">
                            In-memory only
                          </span>
                        </div>

                        {/* MOCK ENGINE BANNER */}
                        {config.vendor === "mock" && (
                          <div className="rounded-xl border border-[var(--brand-primary-border)] bg-[var(--brand-primary-light)] p-3 flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)]">
                              <CheckCircle className="h-3.5 w-3.5" />
                            </div>
                            <p className="text-[11px] text-[var(--text-main)]/90 dark:text-[var(--text-subheading)] leading-relaxed font-sans">
                              <strong className="text-[var(--brand-primary)]">Zero Credentials Required:</strong> In-memory microsecond simulator active with realistic token jitter and DeepSeek-R1 reasoning traces.
                            </p>
                          </div>
                        )}

                        {/* AZURE OPENAI FORM */}
                        {config.vendor === "azure_openai" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs font-semibold">Azure Resource / Endpoint URL</Label>
                              <Input
                                value={credential.azure_endpoint || credential.base_url || ""}
                                onChange={(e) =>
                                  onCredentialChange({ ...credential, azure_endpoint: e.target.value, base_url: e.target.value })
                                }
                                placeholder="https://my-resource.openai.azure.com"
                                className="font-sans tabular-nums text-xs h-9 bg-[var(--bg-card)]"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Deployment Name</Label>
                              <Input
                                value={credential.azure_deployment || config.model || ""}
                                onChange={(e) => {
                                  onCredentialChange({ ...credential, azure_deployment: e.target.value });
                                  onChange({ ...config, model: e.target.value });
                                }}
                                placeholder="e.g. gpt-4o-eastus"
                                className="font-sans tabular-nums text-xs h-9 bg-[var(--bg-card)]"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">API Version</Label>
                              <Select
                                value={credential.azure_api_version || "2024-10-21"}
                                onValueChange={(val) => onCredentialChange({ ...credential, azure_api_version: val })}
                              >
                                <SelectTrigger className="h-9 font-sans tabular-nums text-xs bg-[var(--bg-card)]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="2024-10-21" className="font-sans tabular-nums text-xs">2024-10-21 (GA)</SelectItem>
                                  <SelectItem value="2024-12-01-preview" className="font-sans tabular-nums text-xs">2024-12-01-preview</SelectItem>
                                  <SelectItem value="2025-01-01-preview" className="font-sans tabular-nums text-xs">2025-01-01-preview</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {/* AWS BEDROCK FORM */}
                        {config.vendor === "aws_bedrock" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">AWS Region</Label>
                              <Select
                                value={credential.aws_region || "us-east-1"}
                                onValueChange={(val) => onCredentialChange({ ...credential, aws_region: val })}
                              >
                                <SelectTrigger className="h-9 font-sans tabular-nums text-xs bg-[var(--bg-card)]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="us-east-1" className="font-sans tabular-nums text-xs">us-east-1 (N. Virginia)</SelectItem>
                                  <SelectItem value="us-west-2" className="font-sans tabular-nums text-xs">us-west-2 (Oregon)</SelectItem>
                                  <SelectItem value="eu-central-1" className="font-sans tabular-nums text-xs">eu-central-1 (Frankfurt)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">AWS Access Key ID</Label>
                              <Input
                                value={credential.aws_access_key_id || ""}
                                onChange={(e) => onCredentialChange({ ...credential, aws_access_key_id: e.target.value })}
                                placeholder="AKIA..."
                                className="font-sans tabular-nums text-xs h-9 bg-[var(--bg-card)]"
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs font-semibold">AWS Secret Access Key</Label>
                              <Input
                                type="password"
                                value={credential.aws_secret_access_key || ""}
                                onChange={(e) => onCredentialChange({ ...credential, aws_secret_access_key: e.target.value })}
                                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                                className="font-sans tabular-nums text-xs h-9 bg-[var(--bg-card)]"
                              />
                            </div>
                          </div>
                        )}

                        {/* GCP / GEMINI FORM WITH 2 AUTH OPTIONS */}
                        {config.vendor === "gcp_vertex" && (
                          <div className="space-y-3 p-3 rounded-xl bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                            {/* 2-Option Authentication Mode Selector */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-[var(--text-main)]">
                                Google Authentication Method
                              </Label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => onCredentialChange({ ...credential, gcp_auth_mode: "api_key" })}
                                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    (credential.gcp_auth_mode || "api_key") === "api_key"
                                      ? "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/30 shadow-xs"
                                      : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold">Gemini API Key</span>
                                    {(credential.gcp_auth_mode || "api_key") === "api_key" && (
                                      <Badge variant="default" className="text-[9px] py-0 px-1 bg-[var(--brand-primary)] text-[var(--text-inverse)]">
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                    Google AI Studio Developer Key
                                  </p>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onCredentialChange({ ...credential, gcp_auth_mode: "vertex_ai" })}
                                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    credential.gcp_auth_mode === "vertex_ai"
                                      ? "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/30 shadow-xs"
                                      : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold">GCP Project ID</span>
                                    {credential.gcp_auth_mode === "vertex_ai" && (
                                      <Badge variant="default" className="text-[9px] py-0 px-1 bg-[var(--brand-primary)] text-[var(--text-inverse)]">
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                    Google Cloud Vertex AI VPC
                                  </p>
                                </button>
                              </div>
                            </div>

                            {/* Option 1 Fields: Gemini API Key */}
                            {(credential.gcp_auth_mode || "api_key") === "api_key" ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold">Gemini API Key</Label>
                                  <span className="text-[10px] text-[var(--brand-primary)] font-medium font-sans">
                                    Get key at aistudio.google.com
                                  </span>
                                </div>
                                <Input
                                  type="password"
                                  value={credential.api_key || ""}
                                  onChange={(e) => onCredentialChange({ ...credential, api_key: e.target.value })}
                                  placeholder="AIzaSy..."
                                  className="font-sans tabular-nums text-xs h-9 bg-[var(--bg-card)]"
                                />
                              </div>
                            ) : (
                              /* Option 2 Fields: GCP Project ID & Region */
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-xs font-semibold">GCP Project ID</Label>
                                  <Input
                                    value={credential.gcp_project_id || ""}
                                    onChange={(e) => onCredentialChange({ ...credential, gcp_project_id: e.target.value })}
                                    placeholder="my-gcp-project-123"
                                    className="font-sans tabular-nums text-xs h-9 bg-[var(--bg-card)]"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold">GCP Region</Label>
                                  <Select
                                    value={credential.gcp_location || "us-central1"}
                                    onValueChange={(val) => onCredentialChange({ ...credential, gcp_location: val })}
                                  >
                                    <SelectTrigger className="h-9 font-sans tabular-nums text-xs bg-[var(--bg-card)]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="us-central1" className="font-sans tabular-nums text-xs">us-central1 (Iowa)</SelectItem>
                                      <SelectItem value="us-east4" className="font-sans tabular-nums text-xs">us-east4 (N. Virginia)</SelectItem>
                                      <SelectItem value="us-west1" className="font-sans tabular-nums text-xs">us-west1 (Oregon)</SelectItem>
                                      <SelectItem value="europe-west4" className="font-sans tabular-nums text-xs">europe-west4 (Eemshaven)</SelectItem>
                                      <SelectItem value="asia-northeast1" className="font-sans tabular-nums text-xs">asia-northeast1 (Tokyo)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold">Vertex API Key / Token <span className="text-[var(--text-subtle)] font-normal lowercase">(optional)</span></Label>
                                  <Input
                                    type="password"
                                    value={credential.api_key || ""}
                                    onChange={(e) => onCredentialChange({ ...credential, api_key: e.target.value })}
                                    placeholder="AIzaSy... or Bearer Token"
                                    className="font-sans tabular-nums text-xs h-9 bg-[var(--bg-card)]"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* STANDARD OPENAI / ANTHROPIC / CUSTOM FORM */}
                        {config.vendor !== "azure_openai" && config.vendor !== "aws_bedrock" && config.vendor !== "gcp_vertex" && config.vendor !== "mock" && (
                          <div className="space-y-2.5 p-3 rounded-xl bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                            {/* Base URL */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">Endpoint Base URL</Label>
                                <span className="text-[10px] text-[var(--text-subtle)] font-sans">
                                  Default: {POPULAR_BASE_URLS.find((p) => p.id === config.vendor)?.baseUrl || "https://api.openai.com/v1"}
                                </span>
                              </div>
                              <Input
                                value={credential.base_url || ""}
                                onChange={(e) => onCredentialChange({ ...credential, base_url: e.target.value })}
                                placeholder={POPULAR_BASE_URLS.find((p) => p.id === config.vendor)?.baseUrl || "https://api.openai.com/v1"}
                                className="font-sans tabular-nums text-xs h-9 bg-[var(--bg-card)]"
                              />
                            </div>

                            {/* API Key */}
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">
                                {config.vendor === "anthropic" ? "Anthropic API Key" : "API Key / Bearer Token"}
                              </Label>
                              <div className="relative">
                                <Input
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
                                  className="pr-10 font-sans tabular-nums text-xs h-9 bg-[var(--bg-card)]"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setShowKey(!showKey)}
                                  className="absolute right-1 top-0.5 h-7 w-7 text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer"
                                >
                                  {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-[var(--brand-primary)] font-sans">
                              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                              <span>Zero disk storage • In-memory telemetry session only</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Bento Column: Sub-Step 1B (Model Selection & Discovery) - 35% */}
                    <div className="lg:col-span-4 p-5 space-y-4 bg-[var(--bg-surface-subtle)]/20 dark:bg-[var(--bg-surface-subtle)] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                          <span className="text-xs font-bold tracking-tight text-[var(--brand-primary)] flex items-center gap-1.5 font-sans">
                            <Sparkles className="h-3.5 w-3.5" />
                            1B. Model Selection
                          </span>
                          {availableModels.length > 0 && !isLoadingModels && (
                            <Badge variant="emerald" className="gap-1 font-sans tabular-nums text-[10px] px-1.5 py-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {availableModels.length} models
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Selected Model</Label>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCustomModel(!isCustomModel)}
                                className="h-7 text-[11px] font-medium px-2 rounded-lg text-[var(--text-body)] cursor-pointer"
                              >
                                {isCustomModel ? (
                                  <span className="flex items-center gap-1">
                                    <ListFilter className="h-3 w-3" /> Select from list
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Edit3 className="h-3 w-3" /> Custom ID
                                  </span>
                                )}
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isLoadingModels || !canFetchModels}
                                onClick={fetchModels}
                                className="h-7 text-[11px] px-2.5 rounded-lg font-medium gap-1 cursor-pointer disabled:opacity-40"
                                title={canFetchModels ? "Query base URL for models" : "Enter credentials above to fetch models"}
                              >
                                <RotateCw className={`h-3 w-3 ${isLoadingModels ? "animate-spin text-[var(--brand-primary)]" : ""}`} />
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
                                className="font-sans tabular-nums text-xs h-9 bg-[var(--bg-card)]"
                              />
                              <p className="text-[11px] text-[var(--text-subtle)] font-sans">
                                Custom model identifier or self-hosted deployment.
                              </p>
                            </div>
                          ) : (
                            <Select
                              value={config.model || ""}
                              onValueChange={(val) => onChange({ ...config, model: val })}
                              disabled={isLoadingModels && availableModels.length === 0}
                            >
                              <SelectTrigger className="w-full h-9 font-sans tabular-nums text-xs bg-[var(--bg-card)]">
                                <SelectValue placeholder={isLoadingModels ? "Querying models from endpoint..." : "Select a model..."} />
                              </SelectTrigger>
                              <SelectContent className="max-h-80">
                                <SelectGroup>
                                  <SelectLabel className="text-[10px] tracking-wider text-[var(--text-subtle)] font-sans">
                                    {availableModels.length > 0 ? `Discovered Models (${availableModels.length})` : "Standard Models"}
                                  </SelectLabel>
                                  {availableModels.map((m) => (
                                    <SelectItem key={m} value={m} className="font-sans tabular-nums text-xs py-1.5">
                                      {m}
                                    </SelectItem>
                                  ))}
                                  {config.model && !availableModels.includes(config.model) && (
                                    <SelectItem value={config.model} className="font-sans tabular-nums text-xs py-1.5">
                                      {config.model} (current)
                                    </SelectItem>
                                  )}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          )}

                          {modelFetchError && (
                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                              <span className="truncate text-[11px]">Could not list models: {modelFetchError}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={fetchModels} className="h-6 text-[10px] underline">
                                Retry
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selected Model Summary Card */}
                      <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2 mt-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] tracking-wider font-semibold text-[var(--brand-primary)] font-sans">
                            Selected Model
                          </span>
                          <Badge variant="outline" className="text-[10px] font-sans capitalize">
                            {config.vendor.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="font-mono text-xs font-bold text-[var(--text-main)] truncate">
                          {config.model || "No model selected"}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[var(--border-subtle)] font-sans">
                          <div>
                            <span className="text-[var(--text-subtle)] block text-[10px]">Context Window</span>
                            <strong className="text-[var(--text-main)]">128k tokens</strong>
                          </div>
                          <div>
                            <span className="text-[var(--text-subtle)] block text-[10px]">Streaming</span>
                            <strong className="text-[var(--text-main)]">SSE Protocol</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===================================================================== */}
              {/* STEP 2: PRESETS & PROMPTS                                             */}
              {/* ===================================================================== */}

              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] shadow-xs overflow-hidden"
                >
                  {/* Step 2 Unified Master Header */}
                  <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/40 dark:bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)] shadow-2xs">
                        <Layers className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                          Step 2: Presets & Prompts
                        </h2>
                        <p className="text-xs text-[var(--text-muted)]">
                          Choose a benchmark workload preset or enter a custom prompt.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsPayloadModalOpen(true)}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium bg-[var(--bg-card)] text-[var(--text-subheading)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] border border-[var(--border-subtle)] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        <span>Inspect Payload</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenExpert("workload-preset", "Workload Presets", "How do token ratios (prefill vs. decode) affect benchmarking results?")}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-[var(--bg-card)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] border border-[var(--brand-primary-border)] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Ask Expert</span>
                      </button>
                    </div>
                  </div>

                  {/* Vertically Stacked Sub-Step 2A & 2B Container */}
                  <div className="divide-y divide-[#0F172A]/10 dark:divide-[#F1F5F9]/10">
                    {/* Top Section: Sub-Step 2A (Workload Presets) - Full Width */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                        <span className="text-xs font-bold tracking-tight text-[var(--brand-primary)] flex items-center gap-1.5 font-sans">
                          <Layers className="h-3.5 w-3.5" />
                          2A. Workload Presets
                        </span>
                        <Badge variant="outline" className="text-[10px] font-sans">
                          {selectedPreset ? `${selectedPreset.name} • ${selectedPreset.tag}` : "No Preset Selected"}
                        </Badge>
                      </div>

                      {/* Search Bar & Category Filter Pills */}
                      <div className="space-y-2.5">
                        <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center justify-between">
                          <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-placeholder)]" />
                            <Input
                              type="text"
                              placeholder="Search presets (e.g. RAG, code, cot, cache)..."
                              value={workloadSearchQuery}
                              onChange={(e) => setWorkloadSearchQuery(e.target.value)}
                              className="pl-8.5 pr-8 h-8 text-xs rounded-xl bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)]"
                            />
                            {workloadSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setWorkloadSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] hover:text-[var(--text-main)] cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Refactored Filter Pills with Dynamic Counts */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                            {CATEGORY_TABS.map((cat) => {
                              const count = categoryCounts[cat.id] || 0;
                              const isSelected = selectedCategory === cat.id;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => setSelectedCategory(cat.id)}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                      ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] shadow-2xs font-semibold"
                                      : "bg-[var(--bg-surface-subtle)] text-[var(--text-body)] hover:bg-[var(--border-subtle)] dark:hover:bg-white/5"
                                  }`}
                                >
                                  <span>{cat.shortLabel}</span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                                      isSelected
                                        ? "bg-black/20 dark:bg-black/30 text-[var(--text-inverse)] font-bold"
                                        : "bg-[var(--border-subtle)] dark:bg-white/10 text-[var(--text-muted)]"
                                    }`}
                                  >
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>


                        {/* Presets Grid - 3 Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
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
                                  if (isSelected) {
                                    onChange({
                                      ...config,
                                      workload_preset: undefined as any,
                                    });
                                  } else {
                                    const isKv = preset.id === "kv_cache_reuse";
                                    const isPrefill = preset.id === "prefill_ttft";
                                    const isRate = preset.id === "rate_limit_probe";
                                    const isReason = preset.id === "reasoning_cot";

                                    let newMaxTokens = preset.genTokens;
                                    if (isPrefill) newMaxTokens = 10;
                                    else if (isRate) newMaxTokens = 2;
                                    else if (isReason) newMaxTokens = Math.max(config.max_tokens || 512, 1024);

                                    onChange({
                                      ...config,
                                      workload_preset: preset.id,
                                      max_tokens: newMaxTokens,
                                      measure_cache_speedup: isKv,
                                      cache_bust: isKv ? false : config.cache_bust,
                                      warmup_requests: isKv ? 0 : (config.warmup_requests ?? 2),
                                    });
                                  }
                                }}
                                className={`group p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                                  isSelected
                                    ? "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/30 shadow-xs"
                                    : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)]"
                                }`}
                              >
                                <div className="space-y-1.5 w-full">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`p-1 rounded-lg ${
                                          isSelected
                                            ? "bg-[var(--brand-primary)] text-[var(--text-inverse)]"
                                            : "bg-[var(--bg-surface-subtle)] text-[var(--text-body)]"
                                        }`}
                                      >
                                        <Icon className="h-3.5 w-3.5" />
                                      </div>
                                      <span className="font-semibold text-xs truncate">{preset.name}</span>
                                    </div>
                                    <Badge variant={isSelected ? "default" : "outline"} className="text-[9px] px-1 py-0 font-sans">
                                      {preset.tag}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-[var(--text-body)] line-clamp-3 leading-relaxed min-h-[44px]">
                                    {preset.desc}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)] mt-2 text-[10px] font-sans tabular-nums">
                                  <span>{preset.promptTokens} in / {preset.genTokens} out</span>
                                  <span className="text-[var(--brand-primary)] font-semibold">{promptRatio}% prefill</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Preset Specifications */}
                      <PresetParametersInspector config={config} preset={selectedPreset} />

                      {/* Prompt Preview */}
                      {(() => {
                        const hasPreset = Boolean(config.workload_preset) || Boolean(config.custom_prompt);

                        if (!hasPreset) {
                          return (
                            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-2.5">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold flex items-center gap-1.5 text-[var(--text-body)]">
                                  <Sparkles className="h-3 w-3 text-[var(--brand-primary)]/60 dark:text-[var(--brand-primary)]/60" />
                                  Prompt Preview
                                </Label>
                                <Badge variant="outline" className="text-[10px] font-sans opacity-60">
                                  Awaiting Preset Selection
                                </Badge>
                              </div>

                              <div className="p-3 rounded-lg border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white/60 dark:bg-[var(--bg-surface)] space-y-2">
                                <div className="h-3 w-full bg-slate-200/60 dark:bg-white/5 rounded animate-pulse" />
                                <div className="h-3 w-4/5 bg-slate-200/50 dark:bg-white/5 rounded animate-pulse" />
                                <div className="h-3 w-2/3 bg-slate-200/40 dark:bg-white/5 rounded animate-pulse" />
                              </div>

                              <p className="text-[10px] text-[var(--text-subtle)] dark:text-[var(--text-subtle)] font-sans italic text-center">
                                Select a workload preset from the grid above to load and inspect its calibrated benchmark prompt.
                              </p>
                            </div>
                          );
                        }


                        const promptDetails = WORKLOAD_PROMPT_PREVIEWS[config.workload_preset as WorkloadPreset] || WORKLOAD_PROMPT_PREVIEWS.custom;
                        const activePromptText = config.custom_prompt ?? promptDetails?.prompt ?? "";
                        const measuredTokens = activePromptText.trim()
                          ? (config.custom_prompt ? Math.max(1, Math.round(activePromptText.trim().length / 3.8)) : (promptDetails?.promptTokens || Math.max(1, Math.round(activePromptText.trim().length / 3.8))))
                          : 0;

                        return (
                          <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-[var(--brand-primary)]" />
                                Prompt Preview
                              </Label>
                              <div className="flex items-center gap-2 text-[10px] font-sans tabular-nums text-[var(--text-muted)]">
                                <span>~{measuredTokens} tokens{config.custom_prompt ? " (Custom)" : " (Calibrated)"}</span>
                                {config.custom_prompt && (
                                  <button
                                    type="button"
                                    onClick={() => onChange({ ...config, custom_prompt: undefined })}
                                    className="text-[var(--brand-primary)] hover:underline cursor-pointer font-medium"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            </div>
                            <textarea
                              value={activePromptText}
                              onChange={(e) => onChange({ ...config, custom_prompt: e.target.value })}
                              rows={4}
                              className="w-full text-xs font-sans p-2 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-card)] resize-none focus:border-[var(--brand-primary)]"
                            />
                          </div>
                        );
                      })()}

                    </div>

                    {/* Bottom Section: Sub-Step 2B (Sampling & Generation Dynamics) - Full Width */}
                    <div className="p-5 space-y-4 bg-[var(--bg-surface-subtle)]/20 dark:bg-[var(--bg-surface-subtle)]">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                        <span className="text-xs font-bold tracking-tight text-[var(--brand-primary)] flex items-center gap-1.5 font-sans">
                          <Sliders className="h-3.5 w-3.5" />
                          2B. Generation Settings
                        </span>
                        <Badge variant="outline" className="text-[10px] font-sans">
                          T={config.temperature.toFixed(2)} • {config.max_tokens} max tok
                        </Badge>
                      </div>

                      {/* 3-Column Responsive Bento Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* 1. Sampling Temperature */}
                          <div className="space-y-2 p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
                            <div className="flex justify-between items-center text-xs">
                              <Label className="font-semibold flex items-center gap-1.5">
                                <Flame className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                                Sampling Temperature
                              </Label>
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

                            {/* Quick Preset Buttons */}
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => onChange({ ...config, temperature: 0.0 })}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                                  config.temperature === 0.0
                                    ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] shadow-2xs font-semibold"
                                    : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
                                }`}
                              >
                                0.0 (Deterministic)
                              </button>
                              <button
                                type="button"
                                onClick={() => onChange({ ...config, temperature: 0.7 })}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                                  config.temperature === 0.7
                                    ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] shadow-2xs font-semibold"
                                    : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
                                }`}
                              >
                                0.7 (Balanced)
                              </button>
                              <button
                                type="button"
                                onClick={() => onChange({ ...config, temperature: 1.0 })}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                                  config.temperature === 1.0
                                    ? "bg-[var(--brand-primary)] text-[var(--text-inverse)] shadow-2xs font-semibold"
                                    : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
                                }`}
                              >
                                1.0 (Creative)
                              </button>
                            </div>

                            <p className="text-[10px] text-[var(--text-subtle)] font-sans leading-tight">
                              Lower values (0.0) give consistent, deterministic outputs for fair benchmarking.
                            </p>
                          </div>

                          {/* 2. Output Token Bound */}
                          {Boolean(config.custom_prompt) || config.workload_preset === "custom" ? (
                            <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
                              <div className="flex justify-between items-center text-xs">
                                <Label className="font-semibold">Max Output Tokens</Label>
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
                              <div className="flex justify-between text-[10px] font-sans tabular-nums text-[var(--text-subtle)]">
                                <span>16 tok</span>
                                <span>256 (Standard)</span>
                                <span>4096 tok</span>
                              </div>
                            </div>
                          ) : !config.workload_preset ? (
                            <div className="p-3.5 rounded-xl bg-white/60 dark:bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[var(--text-body)]">Max Output Tokens</span>
                                <Badge variant="outline" className="text-[10px] font-sans opacity-60">
                                  Awaiting Preset
                                </Badge>
                              </div>
                              <div className="h-3.5 w-3/4 bg-slate-200/60 dark:bg-white/5 rounded animate-pulse" />
                              <p className="text-[10px] text-[var(--text-subtle)] dark:text-[var(--text-subtle)] font-sans">
                                Select a workload preset above to calibrate output token limits.
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-[var(--text-main)]">Max Output Tokens</span>
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-sans flex items-center gap-1 font-medium">
                                    <Lock className="h-2.5 w-2.5" />
                                    Preset Enforced
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-[var(--text-muted)] font-sans">
                                  Fixed to {selectedPreset?.genTokens || config.max_tokens} tokens for this preset.
                                </p>
                              </div>
                              <Badge variant="default" className="text-xs font-bold tabular-nums font-sans">
                                {selectedPreset?.genTokens || config.max_tokens} tok
                              </Badge>
                            </div>
                          )}



                          {/* 3. SSE Streaming Protocol */}
                          <div className={`flex items-center justify-between p-3 rounded-xl border shadow-2xs transition-colors ${
                            isStreamLocked ? "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)]" : "bg-[var(--bg-card)] border-[var(--border-subtle)]"
                          }`}>
                            <div className="space-y-0.5 pr-2">
                              <div className="flex items-center gap-2">
                                <Label className={`text-xs font-semibold ${isStreamLocked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                  Streaming (SSE)
                                </Label>
                                {isStreamLocked && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border-[var(--brand-primary-border)] font-sans flex items-center gap-1 font-medium">
                                    <Lock className="h-2.5 w-2.5" />
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-[var(--text-muted)] font-sans">
                                {isStreamLocked
                                  ? "Streaming is required to capture Time to First Token (TTFT) and token generation speed."
                                  : "Stream tokens to capture Time to First Token (TTFT) and token jitter."}
                              </p>
                            </div>
                            <Switch
                              disabled={isStreamLocked}
                              checked={isStreamLocked ? true : (config.stream ?? true)}
                              onCheckedChange={(checked) => onChange({ ...config, stream: checked })}
                            />
                          </div>
                        </div>

                      {/* Structured JSON Schema Editor */}
                      {(config.workload_preset === "structured_json" ||
                        config.workload_preset === "json_schema" ||
                        config.workload_preset === "agentic_tool_calling" ||
                        config.workload_preset === "tool_calling" ||
                        Boolean(config.json_schema)) && (
                        <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1.5">
                              <Braces className="h-3.5 w-3.5" />
                              JSON Schema Validation
                            </Label>
                            {jsonSchemaError ? (
                              <Badge variant="destructive" className="text-[10px]">
                                {jsonSchemaError}
                              </Badge>
                            ) : (
                              <Badge variant="emerald" className="text-[10px]">
                                Valid Schema
                              </Badge>
                            )}
                          </div>
                          <textarea
                            value={rawJsonSchema}
                            onChange={(e) => handleJsonSchemaChange(e.target.value)}
                            rows={4}
                            className="w-full text-[11px] font-mono p-2 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface-elevated)]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===================================================================== */}
              {/* STEP 3: TRAFFIC & LOAD                                                */}
              {/* ===================================================================== */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] shadow-xs overflow-hidden"
                >
                  {/* Step 3 Unified Master Header */}
                  <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/40 dark:bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)] shadow-2xs">
                        <Zap className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                          Step 3: Traffic & Load
                        </h2>
                        <p className="text-xs text-[var(--text-muted)]">
                          Configure concurrency, traffic patterns, and cache behavior.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsTrafficModalOpen(true)}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium bg-[var(--bg-card)] text-[var(--text-subheading)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] border border-[var(--border-subtle)] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        <span>Simulate Traffic</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenExpert("traffic-concurrency", "Traffic & Concurrency", "How do I choose the right concurrency worker pool for stress testing?")}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-[var(--bg-card)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] border border-[var(--brand-primary-border)] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Ask Expert</span>
                      </button>
                    </div>
                  </div>

                  {/* 2-Column Bento Grid Body (50:50 Ratio) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#0F172A]/10 dark:divide-[#F1F5F9]/10">
                    {/* Left Bento Column: Sub-Step 3A (Traffic & Concurrency) */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                        <span className="text-xs font-bold tracking-tight text-[var(--brand-primary)] flex items-center gap-1.5 font-sans">
                          <Target className="h-3.5 w-3.5" />
                          3A. Traffic & Concurrency
                        </span>
                        <Badge variant="outline" className="text-[10px] font-sans capitalize">
                          {config.concurrency} streams • {config.load_curve.replace("_", " ")}
                        </Badge>
                      </div>

                      {/* Strategy Mode Toggle */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Test Mode</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onChange({ ...config, test_mode: "requests" })}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isRequestMode
                                ? "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/30 shadow-xs"
                                : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold">Request-Based</span>
                              {isRequestMode && <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              Fixed total request count
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => onChange({ ...config, test_mode: "duration" })}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              !isRequestMode
                                ? "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/30 shadow-xs"
                                : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold">Time-Based</span>
                              {!isRequestMode && <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              Duration in seconds
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Scope Slider */}
                      {isRequestMode ? (
                        <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                          <div className="flex justify-between items-center text-xs">
                            <Label className="font-semibold">Total Requests</Label>
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
                          <div className="flex justify-between text-[10px] font-sans tabular-nums text-[var(--text-subtle)]">
                            <span>5 (Canary)</span>
                            <span>50 (Standard)</span>
                            <span>500 (Batch)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                          <div className="flex justify-between items-center text-xs">
                            <Label className="font-semibold">Test Duration</Label>
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
                          <div className="flex justify-between text-[10px] font-sans tabular-nums text-[var(--text-subtle)]">
                            <span>5s (Quick)</span>
                            <span>60s (Standard)</span>
                            <span>120s (Soak)</span>
                          </div>
                        </div>
                      )}

                      {/* Concurrency Slider */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <Label className="font-semibold">Concurrency (Parallel Streams)</Label>
                            {isKneeCurve && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border-[var(--brand-primary-border)] font-sans flex items-center gap-1 font-medium">
                                <Lock className="h-2.5 w-2.5" />
                                Min 8 (Knee Probe)
                              </Badge>
                            )}
                          </div>
                          <Badge variant="default" className="font-sans tabular-nums text-xs font-medium">
                            {config.concurrency} streams
                          </Badge>
                        </div>
                        <Slider
                          min={isKneeCurve ? 8 : 1}
                          max={50}
                          step={1}
                          value={[config.concurrency]}
                          onValueChange={(val) => onChange({ ...config, concurrency: val[0] })}
                        />
                        <div className="flex justify-between text-[10px] font-sans tabular-nums text-[var(--text-subtle)]">
                          {isKneeCurve ? (
                            <span className="text-[var(--brand-primary)] font-medium">
                              Knee probe automatically ramps across 1 → 3 → 8 → 16 → 50 streams to discover server inflection points
                            </span>
                          ) : (
                            <>
                              <span>1 worker</span>
                              <span>16 (Balanced)</span>
                              <span>50 (High Load)</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Traffic Pattern Selector */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Traffic Pattern</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {LOAD_CURVE_OPTIONS.map((curve) => {
                            const Icon = curve.icon;
                            const isSelected = config.load_curve === curve.id;
                            return (
                              <button
                                key={curve.id}
                                type="button"
                                onClick={() => onChange({
                                  ...config,
                                  load_curve: curve.id,
                                  concurrency: curve.id === "saturation_knee" ? Math.max(config.concurrency, 8) : config.concurrency,
                                })}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer select-none ${
                                  isSelected
                                    ? "bg-[var(--brand-primary-light)] border-[var(--brand-primary-border)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/20 shadow-xs"
                                    : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)]"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <Icon className="h-3.5 w-3.5" />
                                  <span className="text-xs truncate font-semibold">{curve.label}</span>
                                </div>
                                <p className="text-[10px] text-[var(--text-subtle)] line-clamp-1">{curve.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right Bento Column: Sub-Step 3B (Cache & Warmup) */}
                    <div className="p-5 space-y-4 bg-[var(--bg-surface-subtle)]/20 dark:bg-[var(--bg-surface-subtle)] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                          <span className="text-xs font-bold tracking-tight text-[var(--brand-primary)] flex items-center gap-1.5 font-sans">
                            <Database className="h-3.5 w-3.5" />
                            3B. Cache & Warmup Protocol
                          </span>
                          <Badge variant="outline" className="text-[10px] font-sans">
                            {isKvCachePreset
                              ? "Cold Seed → Warm Hits (Enforced)"
                              : isPrefillTtftPreset
                              ? "Cold Prefill (Enforced)"
                              : config.cache_bust
                              ? "Cold Prefill (Nonce Active)"
                              : config.measure_cache_speedup
                              ? "Cache Speedup Active"
                              : "Warm Prefix Cache"}
                          </Badge>
                        </div>

                        {/* Dedicated KV-Cache Preset Protocol Banner */}
                        {isKvCachePreset && (
                          <div className="rounded-xl border border-emerald-500/30 dark:border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/15 p-3.5 space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                  <Database className="h-4 w-4" />
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block font-sans">
                                    Dedicated Cold vs Warm Cache Benchmark
                                  </span>
                                  <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-sans">
                                    Enforced protocol for prompt prefix caching & KV reuse
                                  </span>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] py-0 px-2 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-sans font-semibold">
                                Dedicated Preset
                              </Badge>
                            </div>

                            <p className="text-[11px] text-[var(--text-main)]/85 dark:text-[var(--text-subheading)] leading-relaxed font-sans">
                              Request #1 is dispatched as the cold baseline prefill seed. Subsequent concurrent streams measure warm KV cache hit acceleration and cached TTFT reduction.
                            </p>

                            <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-sans">
                              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/70 dark:bg-[var(--bg-surface)] border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-medium">
                                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                                <span>Req #1: Cold Seed Baseline</span>
                              </div>
                              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/70 dark:bg-[var(--bg-surface)] border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-medium">
                                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                                <span>Reqs #2..N: Warm Cache Hits</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* KV Cache Bypass Switch */}
                        <div className={`flex items-center justify-between p-3.5 rounded-xl border shadow-2xs transition-colors ${
                          isCacheBustLocked ? "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] opacity-85" : "bg-[var(--bg-card)] border-[var(--border-subtle)]"
                        }`}>
                          <div className="space-y-0.5 pr-2">
                            <div className="flex items-center gap-2">
                              <Label className={`text-xs font-semibold ${isCacheBustLocked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                Bypass Cache (Force Cold Prefill)
                              </Label>
                              {isKvCachePreset ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-sans flex items-center gap-1 font-medium">
                                  <Lock className="h-2.5 w-2.5" />
                                  Locked OFF (KV-Cache Preset)
                                </Badge>
                              ) : isPrefillTtftPreset ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-sans flex items-center gap-1 font-medium">
                                  <Lock className="h-2.5 w-2.5" />
                                  Enforced ON (Prefill TTFT)
                                </Badge>
                              ) : isRateLimitPreset ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-500/10 text-slate-700 dark:text-[var(--text-muted)] border-slate-500/20 font-sans flex items-center gap-1 font-medium">
                                  <Lock className="h-2.5 w-2.5" />
                                  Locked OFF (Rate Limit Probe)
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] font-sans">
                              {isKvCachePreset
                                ? "Disabled by preset: Prefix cache hit measurement requires identical deterministic token prefixes."
                                : isPrefillTtftPreset
                                ? "Enforced by preset: Unique nonces guarantee 100% cold GPU prefill compute without warm prefix cache interference."
                                : isRateLimitPreset
                                ? "Disabled by preset: Micro-token probes test immediate HTTP 429 quota ceilings."
                                : "Appends dynamic timestamps/nonces to bypass cached KV states and measure pure cold GPU prefill compute."}
                            </p>
                          </div>
                          <Switch
                            disabled={isCacheBustLocked}
                            checked={isPrefillTtftPreset ? true : (isKvCachePreset || isRateLimitPreset ? false : config.cache_bust)}
                            onCheckedChange={(checked) => onChange({
                              ...config,
                              cache_bust: checked,
                              measure_cache_speedup: checked ? false : config.measure_cache_speedup,
                            })}
                          />
                        </div>

                        {/* Cold vs Warm Cache Test Option (Custom or general preset) */}
                        {!isKvCachePreset && (
                          <div className={`flex items-center justify-between p-3.5 rounded-xl border shadow-2xs transition-colors ${
                            isMeasureCacheSpeedupLocked ? "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] opacity-80" : "bg-[var(--bg-card)] border-[var(--border-subtle)]"
                          }`}>
                            <div className="space-y-0.5 pr-2">
                              <div className="flex items-center gap-2">
                                <Label className={`text-xs font-semibold flex items-center gap-1.5 ${isMeasureCacheSpeedupLocked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                  <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  Measure Cache Speedup
                                </Label>
                                {isPrefillTtftPreset ? (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-sans flex items-center gap-1 font-medium">
                                    <Lock className="h-2.5 w-2.5" />
                                    Disabled by Prefill TTFT
                                  </Badge>
                                ) : isRateLimitPreset ? (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-500/10 text-slate-700 dark:text-[var(--text-muted)] border-slate-500/20 font-sans flex items-center gap-1 font-medium">
                                    <Lock className="h-2.5 w-2.5" />
                                    Disabled by Rate Limit Probe
                                  </Badge>
                                ) : config.cache_bust ? (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-sans flex items-center gap-1 font-medium">
                                    <Lock className="h-2.5 w-2.5" />
                                    Disabled by Cache Bypass
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-[10px] text-[var(--text-muted)] font-sans">
                                {isPrefillTtftPreset
                                  ? "Disabled: Prefill TTFT isolates pure compute velocity rather than cache hit ratio."
                                  : isRateLimitPreset
                                  ? "Disabled: Rate limit probing tests quota boundaries rather than prefix caching."
                                  : config.cache_bust
                                  ? "Disabled: Prefix cache acceleration cannot be measured when cache bypass is active."
                                  : "Sends an initial cold request followed by warm requests to measure prompt caching speedup."}
                              </p>
                            </div>
                            <Switch
                              disabled={isMeasureCacheSpeedupLocked}
                              checked={isMeasureCacheSpeedupLocked ? false : Boolean(config.measure_cache_speedup)}
                              onCheckedChange={(checked) => onChange({
                                ...config,
                                measure_cache_speedup: checked,
                                warmup_requests: checked ? 0 : config.warmup_requests,
                              })}
                            />
                          </div>
                        )}


                        {/* Warmup Requests Slider */}
                        <div className={`space-y-2 p-3.5 rounded-xl border shadow-2xs transition-colors ${
                          isWarmupLocked ? "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] opacity-85" : "bg-[var(--bg-card)] border-[var(--border-subtle)]"
                        }`}>
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <Label className="flex items-center gap-1.5 font-semibold">
                                <RotateCw className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                                Warmup Requests
                              </Label>
                              {isKvCachePreset ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border-[var(--brand-primary-border)] font-sans flex items-center gap-1 font-medium">
                                  <Lock className="h-2.5 w-2.5" />
                                  Locked to 0 (Cold Seed Reference)
                                </Badge>
                              ) : isRateLimitPreset ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-500/10 text-slate-700 dark:text-[var(--text-muted)] border-slate-500/20 font-sans flex items-center gap-1 font-medium">
                                  <Lock className="h-2.5 w-2.5" />
                                  Locked to 0 (Rate Limit Probe)
                                </Badge>
                              ) : config.measure_cache_speedup ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border-[var(--brand-primary-border)] font-sans flex items-center gap-1 font-medium">
                                  <Lock className="h-2.5 w-2.5" />
                                  Anchored (Req #1 is Cold Seed)
                                </Badge>
                              ) : null}
                            </div>
                            <Badge variant="outline" className="font-sans tabular-nums text-xs font-medium">
                              {isWarmupLocked ? 0 : (config.warmup_requests || 0)} reqs
                            </Badge>
                          </div>
                          <Slider
                            disabled={isWarmupLocked}
                            min={0}
                            max={10}
                            step={1}
                            value={[isWarmupLocked ? 0 : (config.warmup_requests || 0)]}
                            onValueChange={(val) => onChange({ ...config, warmup_requests: val[0] })}
                          />
                          <div className="flex justify-between text-[10px] font-sans tabular-nums text-[var(--text-subtle)]">
                            {isKvCachePreset ? (
                              <span className="text-[var(--brand-primary)] font-medium">
                                Warmup bypassed so Request #1 cold baseline is strictly preserved
                              </span>
                            ) : isRateLimitPreset ? (
                              <span className="text-slate-600 dark:text-[var(--text-muted)] font-medium">
                                Warmup bypassed to immediately test HTTP 429 quota boundaries
                              </span>
                            ) : config.measure_cache_speedup ? (
                              <span className="text-[var(--brand-primary)] font-medium">
                                Warmup bypassed so Request #1 cold baseline is strictly preserved
                              </span>
                            ) : (
                              <>
                                <span>0 (Immediate)</span>
                                <span>2 (Recommended to prime sockets)</span>
                                <span>10 (Full prime)</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Hardware Footprint Telemetry Card */}
                        <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2 shadow-2xs">
                          <span className="text-[10px] tracking-wider font-semibold text-[var(--brand-primary)] font-sans block">
                            Estimated Load & Memory
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                            <div className="p-2 rounded-lg bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                              <span className="text-[var(--text-subtle)] block text-[10px]">Estimated Request Rate</span>
                              <strong className="text-[var(--text-main)]">
                                ~{Math.round(config.concurrency * 1.8 * 60)} RPM
                              </strong>
                            </div>
                            <div className="p-2 rounded-lg bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                              <span className="text-[var(--text-subtle)] block text-[10px]">Est. KV Cache Memory</span>
                              <strong className="text-[var(--brand-secondary)]">
                                ~{(config.concurrency * 0.12).toFixed(1)} GB VRAM
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 Configured Summary */}
                      <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1 mt-3 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--text-main)]">Active Traffic Profile</span>
                          <span className="text-[var(--brand-primary)] font-bold font-sans tabular-nums capitalize">
                            {config.load_curve.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] font-sans">
                          {config.concurrency} concurrent worker streams • {isRequestMode ? `${config.total_requests || 50} total requests` : `${config.duration_seconds}s duration`} • {isKvCachePreset ? "Cold Seed → Warm Hits" : config.cache_bust ? "Cold Prefill Nonce" : "Warm Prefix"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===================================================================== */}
              {/* STEP 4: LIMITS & LAUNCH                                               */}
              {/* ===================================================================== */}
              {currentStep === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-4"
                >
                  {/* Bento Container for Governance (4A SLOs & 4B Financial Guardrails) */}
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] shadow-xs overflow-hidden">
                    {/* Step 4 Unified Master Header */}
                    <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/40 dark:bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)] shadow-2xs">
                          <Gauge className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                            Step 4: Limits & Launch
                          </h2>
                          <p className="text-xs text-[var(--text-muted)]">
                            Set latency targets (SLOs), budget limits, and review your benchmark.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setIsDiagnosticsModalOpen(true)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium bg-[var(--bg-card)] text-[var(--text-subheading)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] border border-[var(--border-subtle)] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                        >
                          <Activity className="h-3.5 w-3.5" />
                          <span>View Diagnostics</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenExpert("slo-goodput", "Latency Targets & SLOs", "What is Goodput and why is it superior to Raw Throughput?")}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-[var(--bg-card)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] border border-[var(--brand-primary-border)] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Ask Expert</span>
                        </button>
                      </div>
                    </div>



                    {/* 2-Column Bento Grid Body (50:50 Ratio) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#0F172A]/10 dark:divide-[#F1F5F9]/10">
                      {/* Left Bento Column: Sub-Step 4A (Reliability SLOs) */}
                      <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                          <span className="text-xs font-bold tracking-tight text-[var(--brand-primary)] flex items-center gap-1.5 font-sans">
                            <Gauge className="h-3.5 w-3.5" />
                            4A. Latency Limits (SLOs)
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleApplySloPreset("strict")}
                              className="px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-[var(--bg-surface-subtle)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)] transition-all cursor-pointer"
                            >
                              Strict
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplySloPreset("interactive")}
                              className="px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-[var(--bg-surface-subtle)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)] transition-all cursor-pointer"
                            >
                              Standard
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplySloPreset("batch")}
                              className="px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-[var(--bg-surface-subtle)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)] transition-all cursor-pointer"
                            >
                              Batch
                            </button>
                          </div>
                        </div>

                        {/* 2x2 Slider Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Max TTFT */}
                          <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
                            <div className="flex justify-between items-center text-xs">
                              <Label className="font-semibold">Max TTFT Target</Label>
                              <Badge variant="outline" className="font-sans tabular-nums text-xs text-[var(--brand-primary)] font-semibold">
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
                            <span className="text-[10px] text-[var(--text-subtle)] block">Time to First Token limit</span>
                          </div>

                          {/* Max TPOT */}
                          <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
                            <div className="flex justify-between items-center text-xs">
                              <Label className="font-semibold">Max TPOT Target</Label>
                              <Badge variant="outline" className="font-sans tabular-nums text-xs text-[var(--brand-secondary)] font-semibold">
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
                            <span className="text-[10px] text-[var(--text-subtle)] block">Time per output token ceiling</span>
                          </div>

                          {/* Max E2E */}
                          <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
                            <div className="flex justify-between items-center text-xs">
                              <Label className="font-semibold">Max Total Duration</Label>
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
                            <span className="text-[10px] text-[var(--text-subtle)] block">Total request timeout limit</span>
                          </div>

                          {/* Max Error Rate */}
                          <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
                            <div className="flex justify-between items-center text-xs">
                              <Label className="font-semibold">Max Error Rate</Label>
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
                            <span className="text-[10px] text-[var(--text-subtle)] block">Max allowed 429 and 5xx errors</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Bento Column: Sub-Step 4B (Budget & Spend Limits) */}
                      <div className="p-5 space-y-4 bg-[var(--bg-surface-subtle)]/20 dark:bg-[var(--bg-surface-subtle)] flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                            <span className="text-xs font-bold tracking-tight text-[var(--brand-secondary)] flex items-center gap-1.5 font-sans">
                              <DollarSign className="h-3.5 w-3.5" />
                              4B. Budget & Spend Limits
                            </span>
                            <Badge variant="default" className="font-sans tabular-nums text-[10px]">
                              {formatUsd(config.hard_spend_cap || 2.0)} hard cap
                            </Badge>
                          </div>

                          {/* Token Pricing Rates */}
                          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                                Token Pricing per 1M Tokens (USD)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const [p, c] = getModelPricing(config.vendor, config.model);
                                  setCustomPromptPrice(p.toFixed(4));
                                  setCustomCompletionPrice(c.toFixed(4));
                                }}
                                className="flex items-center gap-1 text-[10px] text-[var(--brand-primary)] hover:underline font-medium font-sans cursor-pointer"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Reset to defaults
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <span className="text-[10px] text-[var(--text-muted)] font-sans">Prompt (Input) $/1M</span>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-placeholder)]">$</span>
                                  <Input
                                    type="number"
                                    step="0.0001"
                                    value={customPromptPrice}
                                    onChange={(e) => setCustomPromptPrice(e.target.value)}
                                    className="pl-6 h-8 text-xs font-sans tabular-nums bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-elevated)]"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-[var(--text-muted)] font-sans">Completion (Output) $/1M</span>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-placeholder)]">$</span>
                                  <Input
                                    type="number"
                                    step="0.0001"
                                    value={customCompletionPrice}
                                    onChange={(e) => setCustomCompletionPrice(e.target.value)}
                                    className="pl-6 h-8 text-xs font-sans tabular-nums bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface-elevated)]"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Hard Spend Cap Circuit Breaker */}
                          <div className="space-y-2 p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
                            <div className="flex justify-between items-center text-xs">
                              <Label className="flex items-center gap-1.5 font-semibold text-[var(--text-main)]">
                                <ShieldAlert className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                                Spend Cap (Circuit Breaker)
                              </Label>
                              <Badge variant="default" className="font-sans tabular-nums text-xs font-semibold">
                                {formatUsd(config.hard_spend_cap || 2.0)} USD
                              </Badge>
                            </div>
                            <Slider
                              min={0.1}
                              max={20.0}
                              step={0.1}
                              value={[config.hard_spend_cap || 2.0]}
                              onValueChange={(val) =>
                                onChange({ ...config, hard_spend_cap: Number(val[0].toFixed(2)) })
                              }
                            />
                            <div className="flex justify-between text-[10px] font-sans tabular-nums text-[var(--text-subtle)]">
                              <span>$0.10 (Strict)</span>
                              <span>$2.00 (Standard)</span>
                              <span>$20.00 (Heavy)</span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Safety Guarantee Card */}
                        <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--brand-primary-border)] space-y-1.5 mt-3 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[var(--brand-primary)] flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4 text-[var(--brand-primary)]" />
                              Zero Bill-Shock Guarantee
                            </span>
                            <span className="text-[var(--brand-primary)] font-bold font-sans tabular-nums">
                              Max {formatUsd(config.hard_spend_cap || 2.0)}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] font-sans leading-tight">
                            Requests continuously track token costs. If cumulative cost reaches your spend cap, the test terminates immediately to prevent unexpected billing.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary & Launch Cockpit */}
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-4 sm:p-5 shadow-xs space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] font-sans">
                            Benchmark Summary & Launch
                          </h3>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Review your settings before starting the live test.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="font-medium text-xs gap-1 bg-[var(--brand-primary-light)] text-[var(--brand-primary)] dark:bg-[var(--brand-primary-light)] dark:text-[var(--brand-primary)] border-[var(--brand-primary-border)]">
                          <CheckCircle className="h-3 w-3" />
                          Ready to Launch
                        </Badge>
                      </div>
                    </div>

                    {/* Quick Glance Compact Summary Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-surface)] space-y-0.5">
                        <span className="text-[10px] text-[var(--text-subtle)] tracking-wider font-sans font-medium">Target Model</span>
                        <div className="font-sans tabular-nums font-semibold text-xs text-[var(--brand-primary)] truncate">{config.model}</div>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <ProviderLogo vendor={config.vendor} className="h-3.5 w-3.5" />
                          <span className="text-[10px] text-[var(--text-muted)] capitalize font-normal">{config.vendor.replace("_", " ")}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-surface)] space-y-0.5">
                        <span className="text-[10px] text-[var(--text-subtle)] tracking-wider font-sans font-medium">Workload Profile</span>
                        <div className="font-sans font-semibold text-xs text-[var(--text-main)] truncate">{selectedPreset ? selectedPreset.name : "Custom / Unset"}</div>
                        <span className="text-[10px] text-[var(--text-muted)] font-sans tabular-nums font-normal">~{totalPresetTokens} tokens/turn</span>
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-surface)] space-y-0.5">
                        <span className="text-[10px] text-[var(--text-subtle)] tracking-wider font-sans font-medium">Concurrency & Scope</span>
                        <div className="font-sans tabular-nums font-semibold text-xs text-[var(--text-main)] truncate">{config.concurrency} worker streams</div>
                        <span className="text-[10px] text-[var(--text-muted)] font-normal">
                          {isRequestMode ? `${config.total_requests || 50} total reqs` : `${config.duration_seconds}s • ${config.load_curve}`}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-surface)] space-y-0.5">
                        <span className="text-[10px] text-[var(--text-subtle)] tracking-wider font-sans font-medium">Budget & Cap</span>
                        <div className="font-sans tabular-nums font-semibold text-xs text-[var(--brand-primary)] truncate">{formatUsd(config.hard_spend_cap)} cap</div>
                        <span className="text-[10px] text-[var(--text-muted)] font-sans tabular-nums font-normal">Est: {formatUsd(estCost)}</span>
                      </div>
                    </div>

                    {/* Structured Summary Specification Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Box A: Infrastructure & Sampling */}
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/30 dark:bg-[var(--bg-surface)] p-3 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 pb-1.5 border-b border-[var(--border-subtle)] font-semibold text-[var(--brand-primary)]">
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Target & Sampling</span>
                        </div>
                        <div className="space-y-1 text-[11px] font-sans">
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--text-muted)]">Provider:</span>
                            <span className="font-medium text-[var(--text-main)] capitalize">{config.vendor.replace("_", " ")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Model ID:</span>
                            <span className="font-sans tabular-nums font-medium text-[var(--brand-primary)] truncate max-w-[140px]">{config.model}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Max Tokens:</span>
                            <span className="font-sans tabular-nums font-medium text-[var(--text-main)]">{config.max_tokens}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Temperature:</span>
                            <span className="font-sans tabular-nums font-medium text-[var(--text-main)]">{config.temperature}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Cache Mode:</span>
                            <span className="font-medium text-[var(--text-main)]">{config.cache_bust ? "Cold Nonce" : "Warm Prefix"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Box B: Traffic & Execution Strategy */}
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/30 dark:bg-[var(--bg-surface)] p-3 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 pb-1.5 border-b border-[var(--border-subtle)] font-semibold text-[var(--brand-secondary)]">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>Traffic & Concurrency</span>
                        </div>
                        <div className="space-y-1 text-[11px] font-sans">
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Test Mode:</span>
                            <span className="font-sans tabular-nums capitalize font-medium text-[var(--text-main)]">
                              {config.test_mode === "requests" ? "Request Batch" : "Duration"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Concurrency:</span>
                            <span className="font-sans tabular-nums font-medium text-[var(--text-main)]">{config.concurrency} streams</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">
                              {isRequestMode ? "Total Requests:" : "Duration:"}
                            </span>
                            <span className="font-sans tabular-nums font-medium text-[var(--text-main)]">
                              {isRequestMode ? `${config.total_requests || 50} requests` : `${config.duration_seconds}s`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Traffic Pattern:</span>
                            <span className="font-medium text-[var(--text-main)] capitalize">{config.load_curve.replace("_", " ")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Warmup Calls:</span>
                            <span className="font-sans tabular-nums font-medium text-[var(--text-main)]">{config.warmup_requests || 0} reqs</span>
                          </div>
                        </div>
                      </div>

                      {/* Box C: Budget & Latency SLO Targets */}
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/30 dark:bg-[var(--bg-surface)] p-3 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 pb-1.5 border-b border-[var(--border-subtle)] font-semibold text-[var(--brand-primary)]">
                          <Gauge className="h-3.5 w-3.5" />
                          <span>Budget & SLO Targets</span>
                        </div>
                        <div className="space-y-1 text-[11px] font-sans">
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Est. Total Tokens:</span>
                            <span className="font-sans tabular-nums font-medium text-[var(--brand-primary)]">~{costEstimate?.estimated_total_tokens.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Projected Spend:</span>
                            <span className="font-sans tabular-nums font-medium text-[var(--brand-primary)]">{formatUsd(estCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Max TTFT Target:</span>
                            <span className="font-sans tabular-nums font-medium text-[var(--text-main)]">≤ {formatMs(config.slo.max_ttft_ms)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Max TPOT Target:</span>
                            <span className="font-sans tabular-nums font-medium text-[var(--text-main)]">≤ {formatMs(config.slo.max_tpot_ms)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Max Error Rate:</span>
                            <span className="font-sans tabular-nums font-medium text-[var(--text-main)]">≤ {formatPct(config.slo.max_error_rate_pct)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Developer Quick Export */}
                    <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/50 dark:bg-[var(--bg-surface)] flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                          <Terminal className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                          Developer Quick Export
                        </span>
                        <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                          Export benchmark configuration for CLI or CI/CD pipelines
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyCli}
                          className="text-xs font-sans tabular-nums cursor-pointer bg-[var(--bg-card)] gap-1.5"
                        >
                          <span>Copy CLI</span>
                          {copiedSnippet === "cli" ? <Check className="h-3 w-3 text-[var(--brand-primary)]" /> : <Copy className="h-3 w-3" />}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyJson}
                          className="text-xs font-sans tabular-nums cursor-pointer bg-[var(--bg-card)] gap-1.5"
                        >
                          <span>Copy JSON</span>
                          {copiedSnippet === "json" ? <Check className="h-3 w-3 text-[var(--brand-primary)]" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>

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
                      {isLaunching ? "Starting benchmark..." : "Launch Live Benchmark"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wizard Navigation Controls (Back / Next) */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-surface-elevated)] backdrop-blur-md border border-[var(--border-subtle)] shadow-xs">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="rounded-xl px-4 text-xs font-medium gap-1.5 cursor-pointer disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Step</span>
              </Button>

              <div className="text-xs font-sans font-medium text-[var(--text-muted)]">
                Step <strong className="text-[var(--brand-primary)]">{currentStep}</strong> of 4
              </div>

              {currentStep < 4 ? (
                <Button
                  type="button"
                  variant="default"
                  onClick={handleNext}
                  className="rounded-xl px-5 text-xs font-semibold gap-1.5 cursor-pointer bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--text-inverse)] shadow-xs"
                >
                  <span>Next Step</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="text-xs text-[var(--brand-primary)] font-semibold flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Ready to Launch</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating "Ask Expert" Copilot Toggle Pill (Positioned comfortably above footer/dock, hidden when drawer is open) */}
        {!isExpertDrawerOpen && (
          <motion.button
            type="button"
            onClick={() => handleOpenExpert("workload-preset", "Inference Copilot", "How do I optimize my benchmark parameters?")}
            className="fixed bottom-20 right-6 md:bottom-24 md:right-8 z-30 flex items-center gap-2 py-2.5 px-4 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--text-inverse)] shadow-xl hover:shadow-2xl border border-white/20 dark:border-[var(--border-subtle)] backdrop-blur-md transition-all cursor-pointer group select-none"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Open Inference Copilot"
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide">Ask Expert</span>
          </motion.button>
        )}

        {/* On-Demand Modals */}
        <PayloadDynamicsModal
          isOpen={isPayloadModalOpen}
          onClose={() => setIsPayloadModalOpen(false)}
          promptTokens={selectedPreset?.promptTokens || 512}
          maxTokens={config.max_tokens}
          presetName={selectedPreset?.name || "Custom"}
          cacheBust={config.cache_bust}
          temperature={config.temperature}
          topP={config.top_p ?? 1.0}
          onOpenExpert={handleOpenExpert}
        />

        <TrafficSimulationModal
          isOpen={isTrafficModalOpen}
          onClose={() => setIsTrafficModalOpen(false)}
          loadCurve={config.load_curve}
          concurrency={config.concurrency}
          testMode={config.test_mode}
          durationSeconds={config.duration_seconds}
          totalRequests={config.total_requests}
          warmupRequests={config.warmup_requests}
          promptTokens={selectedPreset?.promptTokens || 512}
          maxTokens={config.max_tokens}
          model={config.model}
          cacheBust={config.cache_bust}
          onOpenExpert={handleOpenExpert}
        />

        <DiagnosticsPipelineModal
          isOpen={isDiagnosticsModalOpen}
          onClose={() => setIsDiagnosticsModalOpen(false)}
          maxTtftMs={config.slo.max_ttft_ms}
          maxTpotMs={config.slo.max_tpot_ms}
          maxErrorRatePct={config.slo.max_error_rate_pct}
          maxE2eMs={config.slo.max_e2e_ms}
          promptTokens={selectedPreset?.promptTokens || 512}
          maxTokens={config.max_tokens}
          vendor={config.vendor}
          model={config.model}
          cacheBust={config.cache_bust}
          hardSpendCap={config.hard_spend_cap || 2.0}
          estimatedCost={estCost}
          testMode={config.test_mode}
          durationSeconds={config.duration_seconds}
          totalRequests={config.total_requests}
          concurrency={config.concurrency}
          onOpenExpert={handleOpenExpert}
        />

        {/* Ask the Expert Sliding Copilot Drawer */}
        <AskExpertDrawer
          isOpen={isExpertDrawerOpen}
          onClose={() => setIsExpertDrawerOpen(false)}
          context={expertContext}
          vendor={config.vendor}
          model={config.model}
          credential={credential}
        />
      </TooltipProvider>
  );
};

