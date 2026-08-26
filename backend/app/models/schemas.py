from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VendorType(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GCP_VERTEX = "gcp_vertex"
    AWS_BEDROCK = "aws_bedrock"
    OPENAI_COMPATIBLE = "openai_compatible"  # Groq, Together, vLLM, DeepSeek, Ollama
    MOCK = "mock"                            # Testing & dry runs


class WorkloadPreset(str, Enum):
    CHAT = "chat"                   # ~200 in / ~150 out
    RAG = "rag"                     # ~3,500 in / ~400 out
    CODE = "code"                   # ~1,200 in / ~800 out
    LONG_CONTEXT = "long_context"   # ~16k-32k in / ~500 out
    VISION = "vision"               # 1080p chart image + prompt
    JSON_SCHEMA = "json_schema"     # Pydantic structured output
    CUSTOM = "custom"               # User-provided prompt


class LoadCurveType(str, Enum):
    CONSTANT = "constant"           # Flat concurrency (e.g. 10 workers)
    RAMP_UP = "ramp_up"             # Linear ramp (e.g. 1 -> 50 workers over duration)
    SPIKE = "spike"                 # Low baseline with sudden surges
    POISSON = "poisson"             # Target RPS Poisson arrival rate


class TestMode(str, Enum):
    DURATION = "duration"           # Continuous time-bounded test
    REQUESTS = "requests"           # Fixed request-count bounded test


class VendorCredential(BaseModel):
    """Ephemeral credentials scrubbed from DB, disk, and persistent logs."""
    api_key: Optional[str] = Field(None, description="API key or token")
    base_url: Optional[str] = Field(None, description="Custom base URL for vLLM/Ollama/Groq/OpenRouter")
    organization_id: Optional[str] = None
    aws_region: Optional[str] = "us-east-1"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    gcp_project_id: Optional[str] = None
    gcp_location: Optional[str] = "us-central1"


class SLOThresholds(BaseModel):
    max_ttft_ms: float = Field(1500.0, description="Max acceptable TTFT in milliseconds")
    max_tpot_ms: float = Field(50.0, description="Max acceptable Time Per Output Token in ms")
    max_e2e_ms: float = Field(10000.0, description="Max acceptable E2E duration in ms")
    max_error_rate_pct: float = Field(1.0, description="Max acceptable error percentage")


class BenchmarkConfig(BaseModel):
    name: str = Field("Benchmark Run", description="Human-readable run name")
    vendor: VendorType = VendorType.MOCK
    model: str = Field("gpt-4o", description="Model identifier")
    credential: Optional[VendorCredential] = Field(default_factory=VendorCredential)
    workload_preset: WorkloadPreset = WorkloadPreset.CHAT
    test_mode: TestMode = TestMode.DURATION
    total_requests: Optional[int] = Field(50, ge=1, le=1000, description="Target total requests in request-based mode")
    custom_prompt: Optional[str] = None
    custom_messages: Optional[List[Dict[str, Any]]] = None
    json_schema: Optional[Dict[str, Any]] = None
    max_tokens: int = Field(512, ge=1, le=8192)
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    load_curve: LoadCurveType = LoadCurveType.CONSTANT
    concurrency: int = Field(5, ge=1, le=100)
    target_rps: Optional[float] = Field(None, ge=0.1, le=100.0)
    duration_seconds: int = Field(30, ge=1, le=300)
    warmup_requests: int = Field(2, ge=0, le=5)
    cache_bust: bool = Field(False, description="Append unique nonce to defeat prefix caching")
    hard_spend_cap: Optional[float] = Field(2.0, description="Max dollar spend ceiling before circuit break")
    custom_prompt_price_per_1m: Optional[float] = Field(None, ge=0.0, description="Custom prompt price per 1M tokens in USD")
    custom_completion_price_per_1m: Optional[float] = Field(None, ge=0.0, description="Custom completion price per 1M tokens in USD")
    slo: SLOThresholds = Field(default_factory=SLOThresholds)



class TokenEvent(BaseModel):
    token: str
    reasoning: Optional[str] = None
    timestamp: float
    usage: Optional[Dict[str, int]] = None
    is_final: bool = False


class WaterfallTiming(BaseModel):
    dns_ms: float = 0.0
    tcp_ms: float = 0.0
    tls_ms: float = 0.0
    ttft_ms: float = 0.0
    decode_ms: float = 0.0
    total_e2e_ms: float = 0.0


class SingleRequestMetric(BaseModel):
    request_id: str
    status_code: int = 200
    is_error: bool = False
    error_message: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    waterfall: WaterfallTiming = Field(default_factory=WaterfallTiming)
    ttft_ms: float = 0.0
    ttfa_ms: Optional[float] = None
    tpot_ms: float = 0.0
    e2e_ms: float = 0.0
    itl_deltas_ms: List[float] = Field(default_factory=list)
    meets_slo: bool = True
    cost_usd: float = 0.0


class MetricsSnapshot(BaseModel):
    benchmark_id: str
    status: str = "running"  # running, completed, aborted, budget_exceeded, failed
    elapsed_seconds: float = 0.0
    total_requests: int = 0
    completed_requests: int = 0
    failed_requests: int = 0
    current_tps: float = 0.0
    current_rps: float = 0.0
    current_spend_usd: float = 0.0
    waterfall_avg: WaterfallTiming = Field(default_factory=WaterfallTiming)
    ttft_p50: float = 0.0
    ttft_p75: float = 0.0
    ttft_p95: float = 0.0
    ttft_p99: float = 0.0
    ttfa_p50: Optional[float] = None
    ttfa_p95: Optional[float] = None
    itl_p50: float = 0.0
    itl_p75: float = 0.0
    itl_p95: float = 0.0
    itl_p99: float = 0.0
    max_itl: float = 0.0
    tpot_mean: float = 0.0
    goodput_pct: float = 0.0
    error_rate_pct: float = 0.0


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
    hard_spend_cap_usd: Optional[float] = None
    exceeds_cap: bool = False


class MetricDelta(BaseModel):
    metric_name: str
    run_a_value: float
    run_b_value: float
    delta_value: float
    delta_pct: float
    is_improvement: bool


class RunDiffResponse(BaseModel):
    run_a_id: str
    run_b_id: str
    run_a_name: str
    run_b_name: str
    deltas: List[MetricDelta]
    goodput_delta_pct: float
    cost_delta_pct: float


class ListModelsRequest(BaseModel):
    vendor: VendorType = VendorType.MOCK
    credential: Optional[VendorCredential] = Field(default_factory=VendorCredential)


class ListModelsResponse(BaseModel):
    vendor: VendorType
    models: List[str]

