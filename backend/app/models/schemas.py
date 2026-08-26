from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class VendorType(str, Enum):
    OPENAI_COMPATIBLE = "openai_compatible"  # Groq, Together, vLLM, DeepSeek, Ollama, OpenRouter
    OPENAI = "openai"  # Direct OpenAI
    AZURE_OPENAI = "azure_openai"  # Microsoft Azure OpenAI Service
    ANTHROPIC = "anthropic"  # Anthropic Messages Protocol
    AWS_BEDROCK = "aws_bedrock"  # AWS Bedrock Converse / SigV4
    GCP_VERTEX = "gcp_vertex"  # Google Cloud Vertex AI & Gemini
    MOCK = "mock"  # Testing & zero-cost simulation


class WorkloadPreset(str, Enum):
    # Specialized Workload Profiles
    RATE_LIMIT_PROBE = "rate_limit_probe"  # Micro-calls (5 in / 1-2 out) to probe 429 rate limits, RPM/TPM saturation & ceilings
    PREFILL_TTFT = "prefill_ttft"  # Heavy prompt / tiny decode (4k in / 1-2 out) to isolate TTFT & prefill tok/s
    DECODE_THROUGHPUT = "decode_throughput"  # Light prompt / long decode (40 in / 800 out) for sustained decode tok/s & ITL jitter
    REASONING_COT = "reasoning_cot"  # Reasoning models (o1/o3/R1) to measure TTFA, thinking phase & reasoning token ratio
    AGENTIC_TOOL_CALLING = "agentic_tool_calling"  # Multi-tool schemas measuring tool call latency, arguments validity & throughput
    CODE_GENERATION = "code_generation"  # AST/codebase context measuring syntax-dense code completion throughput & jitter
    RAG_SYNTHESIS = "rag_synthesis"  # Heavy document retrieval context (3.5k in / 400 out)
    LONG_CONTEXT_RETRIEVAL = "long_context_retrieval"  # Massive context prompt (16k in / 300 out) measuring memory & KV scaling
    SUMMARIZATION_DISTILL = "summarization_distill"  # Dense document reduction (4.5k in / 300 out) measuring compression latency
    STRUCTURED_JSON = (
        "structured_json"  # Guided grammar decoding with JSON schema constraint validation
    )
    CHAT_INTERACTIVE = "chat_interactive"  # Standard balanced conversational (~200 in / ~150 out)
    FEWSHOT_CLASSIFICATION = "fewshot_classification"  # High-throughput classification & intent extraction (1.2k in / 10 out)
    MULTIMODAL_VISION = (
        "multimodal_vision"  # Image token embedding & document OCR prefill (1.8k in / 200 out)
    )
    MULTITURN_AGENTIC = "multiturn_agentic"  # Multi-turn conversational session history & context growth (2.5k in / 350 out)
    KV_CACHE_REUSE = (
        "kv_cache_reuse"  # Prompt prefix caching & KV reuse speedup benchmark (3.2k in / 150 out)
    )
    # Legacy / alias presets for backwards compatibility
    TOOL_CALLING = "tool_calling"
    CODE = "code"
    LONG_CONTEXT = "long_context"
    SUMMARIZATION = "summarization"
    CHAT = "chat"
    RAG = "rag"
    VISION = "vision"
    JSON_SCHEMA = "json_schema"
    CUSTOM = "custom"


# Metadata profile mapping defining exact target metrics displayed per workload
WORKLOAD_METRIC_PROFILES: dict[str, dict[str, Any]] = {
    WorkloadPreset.RATE_LIMIT_PROBE.value: {
        "name": "Rate Limit & Quota Probing",
        "tagline": "Micro-token calls probing HTTP 429 thresholds, RPM/TPM capacity & backoff delays",
        "target_metrics": [
            "rate_limit_pct",
            "rate_limit_count",
            "current_rpm",
            "current_tpm",
            "status_distribution",
            "current_spend_usd",
        ],
        "default_in_tokens": 5,
        "default_out_tokens": 2,
        "default_concurrency": 15,
        "default_max_tokens": 2,
        "default_duration": 20,
    },
    WorkloadPreset.PREFILL_TTFT.value: {
        "name": "Prefill Scaling & TTFT",
        "tagline": "Heavy prompt context with 1-token output isolating KV prefill velocity & TTFT percentiles",
        "target_metrics": [
            "ttft_p95",
            "ttft_p50",
            "ttft_p99",
            "prefill_tps_p95",
            "waterfall_avg",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 4000,
        "default_out_tokens": 2,
        "default_concurrency": 4,
        "default_max_tokens": 2,
        "default_duration": 30,
    },
    WorkloadPreset.DECODE_THROUGHPUT.value: {
        "name": "Streaming Decode & Jitter",
        "tagline": "Light prompt with long decode stream measuring decode TPS, ITL percentiles & max token freezes",
        "target_metrics": [
            "current_tps",
            "itl_p95",
            "max_itl",
            "tpot_mean",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 40,
        "default_out_tokens": 800,
        "default_concurrency": 5,
        "default_max_tokens": 800,
        "default_duration": 30,
    },
    WorkloadPreset.REASONING_COT.value: {
        "name": "Reasoning & CoT Deep-Dive",
        "tagline": "Chain-of-Thought prompts measuring Time to First Answer (TTFA), thinking duration & token budget",
        "target_metrics": [
            "ttfa_p95",
            "ttfa_p50",
            "thinking_tokens_avg",
            "thinking_token_ratio_pct",
            "current_tps",
            "current_spend_usd",
        ],
        "default_in_tokens": 300,
        "default_out_tokens": 800,
        "default_concurrency": 3,
        "default_max_tokens": 1024,
        "default_duration": 30,
    },
    WorkloadPreset.AGENTIC_TOOL_CALLING.value: {
        "name": "Agentic Tool & Function Calling",
        "tagline": "Multi-tool definitions & schemas measuring tool call latency, argument validity & invocation throughput",
        "target_metrics": [
            "schema_validity_pct",
            "ttft_p95",
            "current_tps",
            "tpot_mean",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 1200,
        "default_out_tokens": 150,
        "default_concurrency": 4,
        "default_max_tokens": 256,
        "default_duration": 30,
    },
    WorkloadPreset.CODE_GENERATION.value: {
        "name": "Code Generation & Syntax Stream",
        "tagline": "Codebase context & syntax tree generation measuring code decode speed, token jitter & TPOT",
        "target_metrics": [
            "current_tps",
            "itl_p95",
            "tpot_mean",
            "max_itl",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 1500,
        "default_out_tokens": 800,
        "default_concurrency": 4,
        "default_max_tokens": 1024,
        "default_duration": 30,
    },
    WorkloadPreset.RAG_SYNTHESIS.value: {
        "name": "Enterprise RAG Synthesis",
        "tagline": "Document context ingestion measuring End-to-End latency, prefill/decode split & goodput yield",
        "target_metrics": [
            "ttft_p95",
            "current_tps",
            "tpot_mean",
            "goodput_pct",
            "error_rate_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 3500,
        "default_out_tokens": 400,
        "default_concurrency": 4,
        "default_max_tokens": 512,
        "default_duration": 30,
    },
    WorkloadPreset.LONG_CONTEXT_RETRIEVAL.value: {
        "name": "Long-Context & Needle Retrieval",
        "tagline": "Massive context prompt (16k tokens) measuring memory pressure, KV scaling & tail TTFT degradation",
        "target_metrics": [
            "ttft_p95",
            "ttft_p99",
            "prefill_tps_p95",
            "waterfall_avg",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 16000,
        "default_out_tokens": 300,
        "default_concurrency": 2,
        "default_max_tokens": 512,
        "default_duration": 45,
    },
    WorkloadPreset.SUMMARIZATION_DISTILL.value: {
        "name": "Document Summarization & Distillation",
        "tagline": "Dense document context reduction measuring prefill efficiency, compression speed & turn latency",
        "target_metrics": [
            "ttft_p95",
            "current_tps",
            "tpot_mean",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 4500,
        "default_out_tokens": 300,
        "default_concurrency": 4,
        "default_max_tokens": 512,
        "default_duration": 30,
    },
    WorkloadPreset.STRUCTURED_JSON.value: {
        "name": "Structured JSON & Grammar",
        "tagline": "Guided JSON schema decoding measuring syntax validity compliance & constrained decode speed",
        "target_metrics": [
            "schema_validity_pct",
            "current_tps",
            "tpot_mean",
            "ttft_p95",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 600,
        "default_out_tokens": 300,
        "default_concurrency": 4,
        "default_max_tokens": 512,
        "default_duration": 30,
    },
    WorkloadPreset.CHAT_INTERACTIVE.value: {
        "name": "Interactive Conversational",
        "tagline": "Balanced conversational stream measuring TTFT responsiveness, decode smoothness & reading speed",
        "target_metrics": [
            "ttft_p95",
            "itl_p95",
            "current_tps",
            "tpot_mean",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 200,
        "default_out_tokens": 150,
        "default_concurrency": 5,
        "default_max_tokens": 512,
        "default_duration": 30,
    },
    WorkloadPreset.FEWSHOT_CLASSIFICATION.value: {
        "name": "Few-Shot In-Context Classification",
        "tagline": "Multi-exemplar in-context prompt measuring low-decode latency & high-throughput classification goodput",
        "target_metrics": ["ttft_p95", "e2e_ms", "current_tps", "goodput_pct", "current_spend_usd"],
        "default_in_tokens": 1200,
        "default_out_tokens": 10,
        "default_concurrency": 6,
        "default_max_tokens": 32,
        "default_duration": 30,
    },
    WorkloadPreset.MULTIMODAL_VISION.value: {
        "name": "Multimodal Vision & OCR",
        "tagline": "Image token embedding context measuring multimodal prefill latency, vision encoder overhead & TTFT",
        "target_metrics": [
            "ttft_p95",
            "prefill_tps_p95",
            "current_tps",
            "tpot_mean",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 1800,
        "default_out_tokens": 200,
        "default_concurrency": 4,
        "default_max_tokens": 256,
        "default_duration": 30,
    },
    WorkloadPreset.MULTITURN_AGENTIC.value: {
        "name": "Multi-Turn Session Context",
        "tagline": "Accumulated multi-turn conversation history measuring KV cache expansion, turn latency drift & memory pressure",
        "target_metrics": [
            "ttft_p95",
            "current_tps",
            "itl_p95",
            "tpot_mean",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 2500,
        "default_out_tokens": 350,
        "default_concurrency": 4,
        "default_max_tokens": 512,
        "default_duration": 30,
    },
    WorkloadPreset.KV_CACHE_REUSE.value: {
        "name": "Prompt Prefix Cache Warm / Hit",
        "tagline": "Shared prefix context measuring KV cache hit speedup ratio, TTFT reduction & caching discount throughput",
        "target_metrics": [
            "ttft_p95",
            "ttft_p50",
            "current_tps",
            "prefill_tps_p95",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 3200,
        "default_out_tokens": 150,
        "default_concurrency": 5,
        "default_max_tokens": 256,
        "default_duration": 30,
    },
    WorkloadPreset.CUSTOM.value: {
        "name": "Custom Workload",
        "tagline": "User-defined prompt payload, token limits and full telemetry matrix",
        "target_metrics": [
            "ttft_p95",
            "itl_p95",
            "current_tps",
            "max_itl",
            "goodput_pct",
            "current_spend_usd",
        ],
        "default_in_tokens": 500,
        "default_out_tokens": 500,
        "default_concurrency": 5,
        "default_max_tokens": 512,
        "default_duration": 30,
    },
}


class LoadCurveType(str, Enum):
    CONSTANT = "constant"
    RAMP_UP = "ramp_up"
    SPIKE = "spike"
    POISSON = "poisson"
    SATURATION_KNEE = "saturation_knee"


class TestMode(str, Enum):
    DURATION = "duration"
    REQUESTS = "requests"


class VendorCredential(BaseModel):
    """Ephemeral credentials scrubbed from DB, disk, and persistent logs."""

    api_key: str | None = Field(None, description="API key or token")
    base_url: str | None = Field(
        None, description="Custom base URL for vLLM/Ollama/Groq/OpenRouter"
    )
    organization_id: str | None = None

    # Azure OpenAI
    azure_endpoint: str | None = Field(
        None, description="Azure OpenAI endpoint (e.g. https://my-resource.openai.azure.com)"
    )
    azure_deployment: str | None = Field(None, description="Azure deployment name")
    azure_api_version: str | None = Field("2024-10-21", description="Azure OpenAI API version")

    # AWS Bedrock
    aws_region: str | None = "us-east-1"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_session_token: str | None = None

    # GCP Vertex AI / Gemini
    gcp_auth_mode: str | None = Field(
        "api_key", description="api_key (AI Studio) or vertex_ai (GCP VPC)"
    )
    gcp_project_id: str | None = None
    gcp_location: str | None = "us-central1"


class SLOThresholds(BaseModel):
    max_ttft_ms: float = Field(1500.0, description="Max acceptable TTFT in milliseconds")
    max_tpot_ms: float = Field(50.0, description="Max acceptable Time Per Output Token in ms")
    max_e2e_ms: float = Field(10000.0, description="Max acceptable E2E duration in ms")
    max_error_rate_pct: float = Field(1.0, description="Max acceptable error percentage")


class BenchmarkConfig(BaseModel):
    name: str = Field("Benchmark Run", description="Human-readable run name")
    vendor: VendorType = VendorType.MOCK
    model: str = Field("gpt-4o", description="Model identifier")
    credential: VendorCredential | None = Field(default_factory=VendorCredential)
    workload_preset: WorkloadPreset = WorkloadPreset.CHAT
    test_mode: TestMode = TestMode.DURATION
    total_requests: int | None = Field(
        50, ge=1, le=1000, description="Target total requests in request-based mode"
    )
    dataset_type: str = Field("synthetic", description="synthetic or jsonl")
    custom_dataset: list[str] | None = Field(
        None, description="Array of prompt strings loaded from custom JSONL dataset"
    )
    custom_prompt: str | None = None
    custom_messages: list[dict[str, Any]] | None = None
    json_schema: dict[str, Any] | None = None
    max_tokens: int = Field(512, ge=1, le=8192)
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    load_curve: LoadCurveType = LoadCurveType.CONSTANT
    concurrency: int = Field(5, ge=1, le=100)
    target_rps: float | None = Field(None, ge=0.1, le=100.0)
    duration_seconds: int = Field(30, ge=1, le=300)
    warmup_requests: int = Field(2, ge=0, le=5)
    cache_bust: bool = Field(False, description="Append unique nonce to defeat prefix caching")
    hard_spend_cap: float | None = Field(
        2.0, description="Max dollar spend ceiling before circuit break"
    )
    custom_prompt_price_per_1m: float | None = Field(
        None, ge=0.0, description="Custom prompt price per 1M tokens in USD"
    )
    custom_completion_price_per_1m: float | None = Field(
        None, ge=0.0, description="Custom completion price per 1M tokens in USD"
    )
    slo: SLOThresholds = Field(default_factory=SLOThresholds)


class TokenEvent(BaseModel):
    token: str
    reasoning: str | None = None
    timestamp: float
    usage: dict[str, int] | None = None
    is_final: bool = False


class WaterfallTiming(BaseModel):
    dns_ms: float = 0.0
    tcp_ms: float = 0.0
    tls_ms: float = 0.0
    network_edge_ms: float = 0.0
    server_gpu_compute_ms: float = 0.0
    ttft_ms: float = 0.0
    decode_ms: float = 0.0
    total_e2e_ms: float = 0.0


class SingleRequestMetric(BaseModel):
    request_id: str
    status_code: int = 200
    is_error: bool = False
    is_rate_limit: bool = False
    retry_after_ms: float | None = None
    error_message: str | None = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    thinking_tokens: int = 0
    prefill_tps: float | None = None
    schema_valid: bool | None = None
    waterfall: WaterfallTiming = Field(default_factory=WaterfallTiming)
    ttft_ms: float = 0.0
    ttfa_ms: float | None = None
    tpot_ms: float = 0.0
    e2e_ms: float = 0.0
    itl_deltas_ms: list[float] = Field(default_factory=list)
    meets_slo: bool = True
    cost_usd: float = 0.0
    completed_at_elapsed: float = 0.0


class MetricsSnapshot(BaseModel):
    benchmark_id: str
    status: str = "running"  # running, completed, aborted, budget_exceeded, failed
    elapsed_seconds: float = 0.0
    total_requests: int = 0
    completed_requests: int = 0
    failed_requests: int = 0
    current_tps: float = 0.0
    current_rps: float = 0.0
    current_rpm: float = 0.0
    current_tpm: float = 0.0
    current_spend_usd: float = 0.0
    waterfall_avg: WaterfallTiming = Field(default_factory=WaterfallTiming)
    ttft_p50: float = 0.0
    ttft_p75: float = 0.0
    ttft_p95: float = 0.0
    ttft_p99: float = 0.0
    ttfa_p50: float | None = None
    ttfa_p95: float | None = None
    itl_p50: float = 0.0
    itl_p75: float = 0.0
    itl_p95: float = 0.0
    itl_p99: float = 0.0
    max_itl: float = 0.0
    tpot_mean: float = 0.0
    goodput_pct: float = 0.0
    error_rate_pct: float = 0.0

    # Rate Limiting & Capacity Probing Telemetry
    rate_limit_count: int = 0
    rate_limit_pct: float = 0.0
    status_distribution: dict[str, int] = Field(default_factory=dict)
    estimated_rpm_limit: float | None = None
    estimated_tpm_limit: float | None = None

    # Prefill Processing Dynamics
    prefill_tps_p50: float | None = None
    prefill_tps_p95: float | None = None

    # Reasoning / Thinking Dynamics
    thinking_tokens_avg: float | None = None
    thinking_token_ratio_pct: float | None = None
    thinking_duration_p50_ms: float | None = None

    # Structured Output & JSON Grammar Compliance
    schema_validity_pct: float | None = None
    schema_error_count: int = 0

    # Saturation Knee Probe Discovery
    saturation_knee_concurrency: int | None = None
    saturation_knee_detected: bool = False
    network_edge_avg_ms: float | None = None
    server_gpu_compute_avg_ms: float | None = None

    # Real-Time Dynamic Stream Tracking (Instant / Recent window)
    ttft_instant: float | None = None
    itl_instant: float | None = None
    prefill_tps_instant: float | None = None
    goodput_instant: float | None = None

    # High-Impact Derived Performance & Economic Indicators
    itl_jitter_cv: float | None = None
    prefill_slope_ms_per_1k: float | None = None
    cache_speedup_factor: float | None = None
    thinking_wait_multiplier: float | None = None
    thinking_cost_share_pct: float | None = None
    grammar_penalty_pct: float | None = None
    concurrency_scaling_efficiency_pct: float | None = None
    cost_per_1k_goodput_usd: float | None = None

    # Target Metric Profile Tags for Dynamic Frontend Filtering
    profile_metrics: list[str] = Field(default_factory=list)
    workload_preset: str | None = None


class CostEstimate(BaseModel):
    vendor: str
    model: str
    workload_preset: str
    estimated_requests: int
    estimated_prompt_tokens: int
    estimated_gen_tokens: int
    estimated_total_tokens: int
    estimated_cost_usd: float
    prompt_price_per_1m: float = 0.0
    completion_price_per_1m: float = 0.0
    hard_spend_cap_usd: float | None = None
    exceeds_cap: bool = False


class MetricDelta(BaseModel):
    metric_name: str
    run_a_value: float
    run_b_value: float
    run_c_value: float | None = None
    delta_value: float
    delta_pct: float
    delta_c_value: float | None = None
    delta_c_pct: float | None = None
    is_improvement: bool
    is_improvement_c: bool | None = None


class RunDiffResponse(BaseModel):
    run_a_id: str
    run_b_id: str
    run_c_id: str | None = None
    run_a_name: str
    run_b_name: str
    run_c_name: str | None = None
    run_a_vendor: str | None = None
    run_b_vendor: str | None = None
    run_c_vendor: str | None = None
    run_a_model: str | None = None
    run_b_model: str | None = None
    run_c_model: str | None = None
    deltas: list[MetricDelta]
    goodput_delta_pct: float
    cost_delta_pct: float
    goodput_delta_c_pct: float | None = None
    cost_delta_c_pct: float | None = None


class ListModelsRequest(BaseModel):
    vendor: VendorType = VendorType.MOCK
    credential: VendorCredential | None = Field(default_factory=VendorCredential)


class ListModelsResponse(BaseModel):
    vendor: VendorType
    models: list[str]
