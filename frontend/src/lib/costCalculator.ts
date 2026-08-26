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
  prefill_ttft: [4000, 2],
  decode_throughput: [40, 800],
  reasoning_cot: [300, 800],
  agentic_tool_calling: [1200, 150],
  code_generation: [1500, 800],
  rag_synthesis: [3500, 400],
  long_context_retrieval: [16000, 300],
  summarization_distill: [4500, 300],
  structured_json: [600, 300],
  chat_interactive: [200, 150],
  fewshot_classification: [1200, 10],
  multimodal_vision: [1800, 200],
  multiturn_agentic: [2500, 350],
  kv_cache_reuse: [3200, 150],
  tool_calling: [1200, 150],
  code: [1500, 800],
  long_context: [16000, 300],
  summarization: [4500, 300],
  chat: [200, 150],
  rag: [3500, 400],
  vision: [1600, 300],
  json_schema: [800, 400],
  custom: [500, 500],
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
  const promptTokens = presetPromptTokens;
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

export interface ModelCostComparisonItem {
  model: string;
  vendor: string;
  label: string;
  monthlyCost: number;
  dailyCost: number;
  costPer1kReqs: number;
  deltaDollars: number;
  deltaPct: number;
  isCheaper: boolean;
  isCurrent: boolean;
}

export interface ProductionCostProjection {
  vendor: string;
  model: string;
  promptTokens: number;
  genTokens: number;
  totalTokensPerReq: number;
  dailyRequests: number;
  monthlyRequests: number;
  annualRequests: number;
  inputPricePer1M: number;
  outputPricePer1M: number;
  inputCostPerReq: number;
  outputCostPerReq: number;
  costPerReq: number;
  costPer1kReqs: number;
  blendedPricePer1MTokens: number;
  dailyCost: number;
  monthlyCost: number;
  annualCost: number;
  dailyTokens: number;
  monthlyTokens: number;
  annualTokens: number;
  inputCostSharePct: number;
  outputCostSharePct: number;
  avgQps: number;
  peakQps: number;
  recommendedConcurrency: number;
  comparisons: ModelCostComparisonItem[];
}

const COMPARISON_MODELS: Array<{ model: string; vendor: string; label: string }> = [
  { model: "gpt-4o", vendor: "openai", label: "GPT-4o (Flagship)" },
  { model: "gpt-4o-mini", vendor: "openai", label: "GPT-4o mini (Low-Cost)" },
  { model: "claude-3-7-sonnet", vendor: "anthropic", label: "Claude 3.7 Sonnet (Reasoning)" },
  { model: "claude-3-5-haiku", vendor: "anthropic", label: "Claude 3.5 Haiku (Fast)" },
  { model: "gemini-1.5-pro", vendor: "gcp_vertex", label: "Gemini 1.5 Pro (Long-Context)" },
  { model: "gemini-2.0-flash", vendor: "gcp_vertex", label: "Gemini 2.0 Flash (Ultra-Fast)" },
  { model: "deepseek-ai/deepseek-r1", vendor: "openai_compatible", label: "DeepSeek R1 (Open Reasoning)" },
  { model: "deepseek-v3", vendor: "openai_compatible", label: "DeepSeek V3 (Economic)" },
];

export function calculateProductionCost(
  vendor: string,
  model: string,
  dailyRequests: number = 10_000,
  measuredPromptTokens?: number | null,
  measuredGenTokens?: number | null,
  customPromptPrice?: number | null,
  customCompletionPrice?: number | null,
  measuredTtftMs?: number | null,
  tpsDecode?: number | null,
): ProductionCostProjection {
  const [promptPrice, completionPrice] = getModelPricing(vendor, model, customPromptPrice, customCompletionPrice);
  const inTokens = Math.max(1, measuredPromptTokens && measuredPromptTokens > 0 ? measuredPromptTokens : 1200);
  const outTokens = Math.max(1, measuredGenTokens && measuredGenTokens > 0 ? measuredGenTokens : 300);
  const totalTokensPerReq = inTokens + outTokens;

  const validDailyReqs = Math.max(10, dailyRequests || 10_000);
  const monthlyRequests = validDailyReqs * 30;
  const annualRequests = validDailyReqs * 365;

  const inputCostPerReq = (inTokens * promptPrice) / 1_000_000.0;
  const outputCostPerReq = (outTokens * completionPrice) / 1_000_000.0;
  const costPerReq = inputCostPerReq + outputCostPerReq;
  const costPer1kReqs = costPerReq * 1_000.0;
  const blendedPricePer1MTokens = totalTokensPerReq > 0
    ? (costPerReq / totalTokensPerReq) * 1_000_000.0
    : 0;

  const dailyCost = costPerReq * validDailyReqs;
  const monthlyCost = costPerReq * monthlyRequests;
  const annualCost = costPerReq * annualRequests;

  const dailyTokens = totalTokensPerReq * validDailyReqs;
  const monthlyTokens = totalTokensPerReq * monthlyRequests;
  const annualTokens = totalTokensPerReq * annualRequests;

  const inputCostSharePct = costPerReq > 0
    ? Math.round((inputCostPerReq / costPerReq) * 100)
    : 50;
  const outputCostSharePct = 100 - inputCostSharePct;

  const avgQps = validDailyReqs / (24 * 3600);
  const peakQps = avgQps * 3.0; // Assume 3x peak multiplier
  const avgTurnaroundSec = ((measuredTtftMs || 350) / 1000.0) + (outTokens / (tpsDecode || 45.0));
  const recommendedConcurrency = Math.max(1, Math.ceil(peakQps * avgTurnaroundSec));

  // Build model comparisons
  const comparisons: ModelCostComparisonItem[] = COMPARISON_MODELS.map((item) => {
    const isCurrent = (model.toLowerCase().includes(item.model.toLowerCase()) || item.model.toLowerCase().includes(model.toLowerCase())) &&
      (vendor.toLowerCase() === item.vendor.toLowerCase() || item.vendor === "openai_compatible");
    const [itemInPrice, itemOutPrice] = getModelPricing(item.vendor, item.model);
    const itemCostPerReq = (inTokens * itemInPrice + outTokens * itemOutPrice) / 1_000_000.0;
    const itemMonthlyCost = itemCostPerReq * monthlyRequests;
    const itemDailyCost = itemCostPerReq * validDailyReqs;
    const itemCostPer1k = itemCostPerReq * 1_000.0;
    const deltaDollars = itemMonthlyCost - monthlyCost;
    const deltaPct = monthlyCost > 0 ? ((itemMonthlyCost - monthlyCost) / monthlyCost) * 100 : 0;

    return {
      model: item.model,
      vendor: item.vendor,
      label: item.label,
      monthlyCost: itemMonthlyCost,
      dailyCost: itemDailyCost,
      costPer1kReqs: itemCostPer1k,
      deltaDollars,
      deltaPct: Math.round(deltaPct),
      isCheaper: deltaDollars < -0.01,
      isCurrent,
    };
  });

  return {
    vendor,
    model,
    promptTokens: inTokens,
    genTokens: outTokens,
    totalTokensPerReq,
    dailyRequests: validDailyReqs,
    monthlyRequests,
    annualRequests,
    inputPricePer1M: promptPrice,
    outputPricePer1M: completionPrice,
    inputCostPerReq,
    outputCostPerReq,
    costPerReq,
    costPer1kReqs,
    blendedPricePer1MTokens,
    dailyCost,
    monthlyCost,
    annualCost,
    dailyTokens,
    monthlyTokens,
    annualTokens,
    inputCostSharePct,
    outputCostSharePct,
    avgQps,
    peakQps,
    recommendedConcurrency,
    comparisons,
  };
}

