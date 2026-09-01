import { BenchmarkConfig, CostEstimate, WorkloadPreset } from "./types";

export const MODEL_PRICING: Record<string, [number, number]> = {
  // OpenAI Models
  "gpt-5.6-sol": [4.0, 20.0],
  "gpt-5-sol": [4.0, 20.0],
  "gpt-5.6-terra": [2.0, 12.0],
  "gpt-5-terra": [2.0, 12.0],
  "gpt-5.6-luna": [0.2, 1.2],
  "gpt-5-luna": [0.2, 1.2],
  "gpt-4.5-preview": [75.0, 150.0],
  "gpt-4o": [2.5, 10.0],
  "gpt-4o-2024-08-06": [2.5, 10.0],
  "gpt-4o-2024-11-20": [2.5, 10.0],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4o-mini-2024-07-18": [0.15, 0.6],
  "o3": [2.0, 8.0],
  "o4-mini": [0.55, 2.2],
  "o3-mini": [1.1, 4.4],
  "o3-mini-2025-01-31": [1.1, 4.4],
  "o1": [15.0, 60.0],
  "o1-2024-12-17": [15.0, 60.0],
  "o1-preview": [15.0, 60.0],
  "o1-mini": [1.1, 4.4],
  "gpt-4-turbo": [10.0, 30.0],
  "gpt-4": [30.0, 60.0],
  "gpt-3.5-turbo": [0.5, 1.5],

  // Anthropic Models
  "claude-sonnet-5": [2.0, 10.0],
  "claude-5-sonnet": [2.0, 10.0],
  "claude-haiku-4.5": [1.0, 5.0],
  "claude-4.5-haiku": [1.0, 5.0],
  "claude-3-7-sonnet-20250219": [3.0, 15.0],
  "claude-3-7-sonnet": [3.0, 15.0],
  "claude-3-5-sonnet-20241022": [3.0, 15.0],
  "claude-3-5-sonnet-20240620": [3.0, 15.0],
  "claude-3-5-sonnet": [3.0, 15.0],
  "claude-3-5-haiku-20241022": [0.8, 4.0],
  "claude-3-5-haiku": [0.8, 4.0],
  "claude-3-opus-20240229": [15.0, 75.0],
  "claude-3-opus": [15.0, 75.0],
  "claude-3-haiku-20240307": [0.25, 1.25],

  // Google Gemini Models
  "gemini-3.7-flash": [0.75, 3.75],
  "gemini-3.1-pro": [2.0, 12.0],
  "gemini-2.0-flash": [0.1, 0.4],
  "gemini-2.0-flash-exp": [0.1, 0.4],
  "gemini-2.0-flash-thinking-exp": [0.1, 0.4],
  "gemini-2.0-pro-exp-02-05": [1.25, 5.0],
  "gemini-1.5-pro": [1.25, 5.0],
  "gemini-1.5-pro-latest": [1.25, 5.0],
  "gemini-1.5-flash": [0.075, 0.3],
  "gemini-1.5-flash-latest": [0.075, 0.3],
  "gemini-1.5-flash-8b": [0.0375, 0.15],

  // DeepSeek Models
  "deepseek-ai/deepseek-r1": [0.55, 2.19],
  "deepseek-r1": [0.55, 2.19],
  "deepseek-reasoner": [0.55, 2.19],
  "deepseek-ai/deepseek-v3": [0.14, 0.28],
  "deepseek-v3": [0.14, 0.28],
  "deepseek-chat": [0.14, 0.28],

  // xAI Grok
  "grok-2-1212": [2.0, 10.0],
  "grok-2": [2.0, 10.0],

  // Meta Llama 3 via Groq/Together/vLLM
  "llama-3.3-70b-versatile": [0.59, 0.79],
  "llama-3.1-405b-instruct": [2.0, 2.0],
  "llama-3.1-70b-versatile": [0.59, 0.79],
  "llama-3.1-8b-instant": [0.05, 0.08],
  "llama3-70b-8192": [0.59, 0.79],
  "llama3-8b-8192": [0.05, 0.08],

  // Mistral AI
  "mistral-large-latest": [2.0, 6.0],
  "mistral-small-latest": [0.2, 0.6],
  "codestral-latest": [0.3, 0.9],

  // Default / Mock
  "mock": [0.0, 0.0],
  "default": [1.0, 3.0],
};

export const PRESET_TOKEN_PROFILES: Record<WorkloadPreset, [number, number]> = {
  rate_limit_probe: [5, 2],
  prefill_ttft: [4280, 2],
  decode_throughput: [139, 800],
  reasoning_cot: [383, 800],
  agentic_tool_calling: [1220, 150],
  code_generation: [787, 800],
  rag_synthesis: [3151, 400],
  long_context_retrieval: [16284, 300],
  summarization_distill: [3642, 300],
  structured_json: [675, 300],
  chat_interactive: [123, 150],
  fewshot_classification: [1111, 10],
  multimodal_vision: [1412, 200],
  multiturn_agentic: [1314, 350],
  kv_cache_reuse: [3389, 150],
  tool_calling: [1220, 150],
  code: [787, 800],
  long_context: [16284, 300],
  summarization: [3642, 300],
  chat: [123, 150],
  rag: [3151, 400],
  vision: [1412, 200],
  json_schema: [675, 300],
  custom: [43, 500],
};

export function getModelPricing(
  vendor: string,
  model: string,
  customPrompt?: number | null,
  customCompletion?: number | null
): [number, number] {
  if (customPrompt !== undefined && customPrompt !== null && customPrompt >= 0 &&
      customCompletion !== undefined && customCompletion !== null && customCompletion >= 0) {
    return [customPrompt, customCompletion];
  }

  const modelLower = (model || "").toLowerCase().trim();
  if (vendor === "mock") return [0.0, 0.0];

  let basePrompt = 1.0;
  let baseCompletion = 3.0;

  if (MODEL_PRICING[modelLower]) {
    [basePrompt, baseCompletion] = MODEL_PRICING[modelLower];
  } else {
    let matched = false;
    for (const [key, price] of Object.entries(MODEL_PRICING)) {
      if (key !== "default" && modelLower.includes(key)) {
        [basePrompt, baseCompletion] = price;
        matched = true;
        break;
      }
    }
    if (!matched) {
      [basePrompt, baseCompletion] = MODEL_PRICING["default"];
    }
  }

  const finalPrompt = (customPrompt !== undefined && customPrompt !== null && customPrompt >= 0)
    ? customPrompt
    : basePrompt;

  const finalCompletion = (customCompletion !== undefined && customCompletion !== null && customCompletion >= 0)
    ? customCompletion
    : baseCompletion;

  return [finalPrompt, finalCompletion];
}

export function calculateInstantCostEstimate(config: Partial<BenchmarkConfig>): CostEstimate {
  const vendor = config.vendor || "mock";
  const model = config.model || "gpt-4o";
  const workload = (config.workload_preset || "chat") as WorkloadPreset;
  const maxTokens = config.max_tokens || 512;
  const testMode = config.test_mode || "duration";
  const concurrency = config.concurrency || 5;
  const durationSec = config.duration_seconds || 30;
  const totalRequests = config.total_requests || 50;
  const hardSpendCap = config.hard_spend_cap;

  const [presetPromptTokens, expectedGenTokens] = PRESET_TOKEN_PROFILES[workload] || [500, 500];
  const promptTokens = config.custom_prompt && config.custom_prompt.trim().length > 0
    ? Math.max(1, Math.round(config.custom_prompt.trim().length / 3.8))
    : presetPromptTokens;
  const genTokens = Math.min(maxTokens, expectedGenTokens);

  let estimatedRequests = 1;
  if (testMode === "requests" && totalRequests > 0) {
    estimatedRequests = totalRequests;
  } else {
    const avgTurnaroundSec = Math.max(0.5, (promptTokens / 1000.0) + (genTokens / 40.0));
    const requestsPerWorker = Math.max(1.0, durationSec / avgTurnaroundSec);
    estimatedRequests = Math.max(1, Math.round(concurrency * requestsPerWorker));
  }

  const totalPromptTokens = estimatedRequests * promptTokens;
  const totalGenTokens = estimatedRequests * genTokens;
  const totalTokens = totalPromptTokens + totalGenTokens;

  const [promptRate, completionRate] = getModelPricing(
    vendor,
    model,
    config.custom_prompt_price_per_1m,
    config.custom_completion_price_per_1m
  );

  const estimatedCost = (totalPromptTokens * promptRate / 1_000_000.0) +
    (totalGenTokens * completionRate / 1_000_000.0);

  const roundedCost = Number(estimatedCost.toFixed(4));
  const exceedsCap = hardSpendCap !== undefined && hardSpendCap !== null && hardSpendCap > 0
    ? roundedCost > hardSpendCap
    : false;

  return {
    vendor,
    model,
    workload_preset: workload,
    estimated_requests: estimatedRequests,
    estimated_prompt_tokens: totalPromptTokens,
    estimated_gen_tokens: totalGenTokens,
    estimated_total_tokens: totalTokens,
    estimated_cost_usd: roundedCost,
    prompt_price_per_1m: promptRate,
    completion_price_per_1m: completionRate,
    hard_spend_cap_usd: hardSpendCap,
    exceeds_cap: exceedsCap,
  };
}

export interface CacheSavingsProjection {
  cacheHitRatePct: number;
  basePromptPricePer1M: number;
  discountedPromptPricePer1M: number;
  effectiveBlendedPromptPrice: number;
  monthlySavings100k: number;
  monthlySavings500k: number;
  monthlySavings1M: number;
  monthlySavings5M: number;
  ttftReductionPct: number;
  inTokens: number;
  outTokens: number;
  baseCostPerReq: number;
  cachedCostPerReq: number;
  savingsPerReq: number;
  measuredTtftMs?: number;
  estimatedCachedTtftMs?: number;
  cacheDiscountPct: number;
}

export function calculateCacheSavings(
  vendor: string,
  model: string,
  workloadPreset: WorkloadPreset,
  cacheHitRatePct: number,
  customPromptPrice?: number | null,
  customCompletionPrice?: number | null,
  measuredPromptTokens?: number | null,
  measuredGenTokens?: number | null,
  measuredTtftMs?: number | null,
): CacheSavingsProjection {
  const [promptPrice, completionPrice] = getModelPricing(vendor, model, customPromptPrice, customCompletionPrice);
  const [presetIn, presetOut] = PRESET_TOKEN_PROFILES[workloadPreset] || [500, 200];
  
  const inTokens = measuredPromptTokens && measuredPromptTokens > 0 ? measuredPromptTokens : presetIn;
  const outTokens = measuredGenTokens && measuredGenTokens > 0 ? measuredGenTokens : presetOut;

  const isDeepSeekOrGemini = model.toLowerCase().includes("deepseek") || model.toLowerCase().includes("gemini");
  const cacheDiscountPct = isDeepSeekOrGemini ? 0.75 : 0.50;
  const discountedPromptPrice = promptPrice * (1.0 - cacheDiscountPct);

  const hitRatio = Math.max(0, Math.min(100, cacheHitRatePct)) / 100.0;
  const effectivePromptPrice = (promptPrice * (1.0 - hitRatio)) + (discountedPromptPrice * hitRatio);

  const baseCostPerReq = (inTokens * promptPrice + outTokens * completionPrice) / 1_000_000.0;
  const cachedCostPerReq = (inTokens * effectivePromptPrice + outTokens * completionPrice) / 1_000_000.0;
  const savingsPerReq = Math.max(0, baseCostPerReq - cachedCostPerReq);

  const ttftReductionPct = Math.round(hitRatio * 70);
  const estimatedCachedTtftMs = measuredTtftMs && measuredTtftMs > 0
    ? Math.max(15, Math.round(measuredTtftMs * (1.0 - (hitRatio * 0.70))))
    : undefined;

  return {
    cacheHitRatePct,
    basePromptPricePer1M: promptPrice,
    discountedPromptPricePer1M: discountedPromptPrice,
    effectiveBlendedPromptPrice: effectivePromptPrice,
    monthlySavings100k: savingsPerReq * 100_000,
    monthlySavings500k: savingsPerReq * 500_000,
    monthlySavings1M: savingsPerReq * 1_000_000,
    monthlySavings5M: savingsPerReq * 5_000_000,
    ttftReductionPct,
    inTokens,
    outTokens,
    baseCostPerReq,
    cachedCostPerReq,
    savingsPerReq,
    measuredTtftMs: measuredTtftMs || undefined,
    estimatedCachedTtftMs,
    cacheDiscountPct: Math.round(cacheDiscountPct * 100),
  };
}

