export type VendorType =
  | "openai_compatible"
  | "openai"
  | "azure_openai"
  | "anthropic"
  | "aws_bedrock"
  | "gcp_vertex"
  | "mock";

export type WorkloadPreset =
  | "rate_limit_probe"
  | "prefill_ttft"
  | "decode_throughput"
  | "reasoning_cot"
  | "rag_synthesis"
  | "structured_json"
  | "chat_interactive"
  | "chat"
  | "rag"
  | "code"
  | "long_context"
  | "vision"
  | "json_schema"
  | "custom";

export type LoadCurveType = "constant" | "ramp_up" | "spike" | "poisson";

export type TestMode = "duration" | "requests";

export type NavTab = "landing" | "benchmark" | "diff" | "history";

export interface VendorCredential {
  api_key?: string;
  base_url?: string;
  organization_id?: string;
  azure_endpoint?: string;
  azure_deployment?: string;
  azure_api_version?: string;
  aws_region?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  aws_session_token?: string;
  gcp_auth_mode?: "api_key" | "vertex_ai";
  gcp_project_id?: string;
  gcp_location?: string;
}

export interface SLOThresholds {
  max_ttft_ms: number;
  max_tpot_ms: number;
  max_e2e_ms: number;
  max_error_rate_pct: number;
}

export interface BenchmarkConfig {
  name: string;
  vendor: VendorType;
  model: string;
  credential?: VendorCredential;
  workload_preset: WorkloadPreset;
  test_mode: TestMode;
  total_requests?: number;
  custom_prompt?: string;
  custom_messages?: any[];
  json_schema?: any;
  max_tokens: number;
  temperature: number;
  load_curve: LoadCurveType;
  concurrency: number;
  target_rps?: number;
  duration_seconds: number;
  warmup_requests: number;
  cache_bust: boolean;
  hard_spend_cap?: number;
  custom_prompt_price_per_1m?: number;
  custom_completion_price_per_1m?: number;
  slo: SLOThresholds;
}

export interface TokenEvent {
  token: string;
  reasoning?: string;
  timestamp: number;
  usage?: Record<string, number>;
  is_final: boolean;
}

export interface WaterfallTiming {
  dns_ms: number;
  tcp_ms: number;
  tls_ms: number;
  ttft_ms: number;
  decode_ms: number;
  total_e2e_ms: number;
}

export interface SingleRequestMetric {
  request_id: string;
  status_code: number;
  is_error: boolean;
  is_rate_limit?: boolean;
  retry_after_ms?: number;
  error_message?: string;
  prompt_tokens: number;
  completion_tokens: number;
  thinking_tokens?: number;
  prefill_tps?: number;
  schema_valid?: boolean;
  waterfall: WaterfallTiming;
  ttft_ms: number;
  ttfa_ms?: number;
  tpot_ms: number;
  e2e_ms: number;
  itl_deltas_ms: number[];
  meets_slo: boolean;
  cost_usd: number;
}

export interface MetricsSnapshot {
  benchmark_id: string;
  status: "running" | "completed" | "aborted" | "budget_exceeded" | "failed" | string;
  elapsed_seconds: number;
  total_requests: number;
  completed_requests: number;
  failed_requests: number;
  current_tps: number;
  current_rps: number;
  current_rpm?: number;
  current_tpm?: number;
  current_spend_usd: number;
  waterfall_avg: WaterfallTiming;
  ttft_p50: number;
  ttft_p75: number;
  ttft_p95: number;
  ttft_p99: number;
  ttfa_p50?: number;
  ttfa_p95?: number;
  itl_p50: number;
  itl_p75: number;
  itl_p95: number;
  itl_p99: number;
  max_itl: number;
  tpot_mean: number;
  goodput_pct: number;
  error_rate_pct: number;

  // Workload-specific metric extensions
  rate_limit_count?: number;
  rate_limit_pct?: number;
  status_distribution?: Record<string, number>;
  estimated_rpm_limit?: number;
  estimated_tpm_limit?: number;
  prefill_tps_p50?: number;
  prefill_tps_p95?: number;
  thinking_tokens_avg?: number;
  thinking_token_ratio_pct?: number;
  schema_validity_pct?: number;
  schema_error_count?: number;
  profile_metrics?: string[];
  workload_preset?: string;
}

export interface CostEstimate {
  vendor: string;
  model: string;
  workload_preset: string;
  estimated_requests: number;
  estimated_prompt_tokens: number;
  estimated_gen_tokens: number;
  estimated_total_tokens: number;
  estimated_cost_usd: number;
  prompt_price_per_1m: number;
  completion_price_per_1m: number;
  hard_spend_cap_usd?: number;
  exceeds_cap: boolean;
}

export interface MetricDelta {
  metric_name: string;
  run_a_value: number;
  run_b_value: number;
  delta_value: number;
  delta_pct: number;
  is_improvement: boolean;
}

export interface RunDiffResponse {
  run_a_id: string;
  run_b_id: string;
  run_a_name: string;
  run_b_name: string;
  deltas: MetricDelta[];
  goodput_delta_pct: number;
  cost_delta_pct: number;
}

export interface HistoricalRunSummary {
  id: string;
  name: string;
  vendor: string;
  model: string;
  workload_preset: string;
  load_curve: string;
  concurrency: number;
  duration_seconds: number;
  status: string;
  total_requests: number;
  completed_requests: number;
  failed_requests: number;
  total_cost_usd: number;
  ttft_p50: number;
  ttft_p95: number;
  ttft_p99: number;
  itl_p95: number;
  max_itl: number;
  goodput_pct: number;
  tps_decode: number;
  created_at: string | null;
}

export interface HistoricalRunDetails {
  id: string;
  name: string;
  vendor: string;
  model: string;
  workload_preset: string;
  load_curve: string;
  concurrency: number;
  duration_seconds: number;
  status: string;
  counts: {
    total_requests: number;
    completed_requests: number;
    failed_requests: number;
    total_prompt_tokens: number;
    total_gen_tokens: number;
    total_cost_usd: number;
  };
  percentiles: {
    ttft_p50: number;
    ttft_p75: number;
    ttft_p95: number;
    ttft_p99: number;
    ttfa_p50?: number;
    ttfa_p95?: number;
    itl_p50: number;
    itl_p75: number;
    itl_p95: number;
    itl_p99: number;
    max_itl: number;
    tpot_mean: number;
    tps_decode: number;
    goodput_pct: number;
    error_rate_pct: number;
  };
  waterfall: {
    dns_p50: number;
    tcp_p50: number;
    tls_p50: number;
  };
  config: BenchmarkConfig;
  created_at: string | null;
  completed_at: string | null;
}
