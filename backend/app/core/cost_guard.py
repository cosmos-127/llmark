from app.core.config import settings
from app.models.schemas import BenchmarkConfig, CostEstimate, TestMode, WorkloadPreset

# Approximate token profiles for presets
PRESET_TOKEN_PROFILES = {
    WorkloadPreset.RATE_LIMIT_PROBE: (5, 2),
    WorkloadPreset.PREFILL_TTFT: (4000, 2),
    WorkloadPreset.DECODE_THROUGHPUT: (40, 800),
    WorkloadPreset.REASONING_COT: (300, 800),
    WorkloadPreset.AGENTIC_TOOL_CALLING: (1200, 150),
    WorkloadPreset.CODE_GENERATION: (1500, 800),
    WorkloadPreset.RAG_SYNTHESIS: (3500, 400),
    WorkloadPreset.LONG_CONTEXT_RETRIEVAL: (16000, 300),
    WorkloadPreset.SUMMARIZATION_DISTILL: (4500, 300),
    WorkloadPreset.STRUCTURED_JSON: (600, 300),
    WorkloadPreset.CHAT_INTERACTIVE: (200, 150),
    WorkloadPreset.FEWSHOT_CLASSIFICATION: (1200, 10),
    WorkloadPreset.MULTIMODAL_VISION: (1800, 200),
    WorkloadPreset.MULTITURN_AGENTIC: (2500, 350),
    WorkloadPreset.KV_CACHE_REUSE: (3200, 150),
    WorkloadPreset.TOOL_CALLING: (1200, 150),
    WorkloadPreset.CODE: (1500, 800),
    WorkloadPreset.LONG_CONTEXT: (16000, 300),
    WorkloadPreset.SUMMARIZATION: (4500, 300),
    WorkloadPreset.CHAT: (200, 150),
    WorkloadPreset.RAG: (3500, 400),
    WorkloadPreset.VISION: (1600, 300),
    WorkloadPreset.JSON_SCHEMA: (800, 400),
    WorkloadPreset.CUSTOM: (500, 500),
}


class CostGuard:
    # In-memory dynamic pricing cache (e.g. parsed from OpenRouter /v1/models response)
    DYNAMIC_PRICING: dict[str, tuple[float, float]] = {}

    @classmethod
    def register_dynamic_pricing(
        cls, model_id: str, prompt_price_per_1m: float, completion_price_per_1m: float
    ) -> None:
        """Register dynamic pricing discovered from endpoint schema (e.g. OpenRouter)."""
        cls.DYNAMIC_PRICING[model_id.lower().strip()] = (
            prompt_price_per_1m,
            completion_price_per_1m,
        )

    @classmethod
    def get_pricing(
        cls,
        model: str,
        custom_prompt: float | None = None,
        custom_completion: float | None = None,
    ) -> tuple[float, float]:
        """Return (prompt_price_per_1m, completion_price_per_1m) in USD.

        Order of evaluation:
        1. Custom user overrides if provided.
        2. Dynamic pricing discovered from endpoint (e.g. OpenRouter schema).
        3. Authoritative built-in registry exact match.
        4. Authoritative built-in registry fuzzy/substring match.
        5. Default fallback.
        """
        # Determine base rate first if only partial custom override provided
        model_lower = (model or "").lower().strip()

        base_prompt: float
        base_completion: float

        if model_lower in cls.DYNAMIC_PRICING:
            base_prompt, base_completion = cls.DYNAMIC_PRICING[model_lower]
        elif model_lower in settings.MODEL_PRICING:
            base_prompt, base_completion = settings.MODEL_PRICING[model_lower]
        else:
            matched = False
            for key, price in settings.MODEL_PRICING.items():
                if key != "default" and key in model_lower:
                    base_prompt, base_completion = price
                    matched = True
                    break
            if not matched:
                base_prompt, base_completion = settings.MODEL_PRICING["default"]

        final_prompt = (
            float(custom_prompt)
            if custom_prompt is not None and custom_prompt >= 0
            else base_prompt
        )
        final_completion = (
            float(custom_completion)
            if custom_completion is not None and custom_completion >= 0
            else base_completion
        )

        return (final_prompt, final_completion)

    @classmethod
    def calculate_request_cost(
        cls,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        custom_prompt: float | None = None,
        custom_completion: float | None = None,
    ) -> float:
        """Calculate the exact USD cost for a single request."""
        prompt_rate, completion_rate = cls.get_pricing(model, custom_prompt, custom_completion)
        cost = (prompt_tokens * prompt_rate / 1_000_000.0) + (
            completion_tokens * completion_rate / 1_000_000.0
        )
        return round(cost, 6)

    @classmethod
    def estimate_benchmark_cost(cls, config: BenchmarkConfig) -> CostEstimate:
        """Generate a pre-flight cost estimate for a configured benchmark run."""
        prompt_tokens, expected_gen_tokens = PRESET_TOKEN_PROFILES.get(
            config.workload_preset, (500, min(config.max_tokens, 500))
        )
        gen_tokens = min(config.max_tokens, expected_gen_tokens)

        # Mode calculation: Fixed Request Count vs Continuous Time Duration
        if (
            config.test_mode == TestMode.REQUESTS
            and config.total_requests
            and config.total_requests > 0
        ):
            estimated_requests = int(config.total_requests)
        else:
            # Estimate request throughput continuously with duration and concurrency
            avg_turnaround_sec = max(0.5, (prompt_tokens / 1000.0) + (gen_tokens / 40.0))
            requests_per_worker = max(1.0, config.duration_seconds / avg_turnaround_sec)
            estimated_requests = max(1, int(round(config.concurrency * requests_per_worker)))

        total_prompt_tokens = estimated_requests * prompt_tokens
        total_gen_tokens = estimated_requests * gen_tokens
        total_tokens = total_prompt_tokens + total_gen_tokens

        prompt_rate, completion_rate = cls.get_pricing(
            config.model,
            config.custom_prompt_price_per_1m,
            config.custom_completion_price_per_1m,
        )
        estimated_cost = (total_prompt_tokens * prompt_rate / 1_000_000.0) + (
            total_gen_tokens * completion_rate / 1_000_000.0
        )
        estimated_cost = round(estimated_cost, 4)

        exceeds_cap = False
        if config.hard_spend_cap is not None and config.hard_spend_cap > 0:
            exceeds_cap = estimated_cost > config.hard_spend_cap

        return CostEstimate(
            vendor=config.vendor.value,
            model=config.model,
            workload_preset=config.workload_preset.value,
            estimated_requests=estimated_requests,
            estimated_prompt_tokens=total_prompt_tokens,
            estimated_gen_tokens=total_gen_tokens,
            estimated_total_tokens=total_tokens,
            estimated_cost_usd=estimated_cost,
            prompt_price_per_1m=prompt_rate,
            completion_price_per_1m=completion_rate,
            hard_spend_cap_usd=config.hard_spend_cap,
            exceeds_cap=exceeds_cap,
        )

    @classmethod
    def is_spend_cap_exceeded(cls, current_spend: float, hard_spend_cap: float | None) -> bool:
        """Circuit breaker check to halt active run if spend cap is crossed."""
        if hard_spend_cap is None or hard_spend_cap <= 0:
            return False
        return current_spend >= hard_spend_cap
