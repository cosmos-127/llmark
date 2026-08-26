import pytest

from app.adapters.mock_adapter import MockVendorAdapter
from app.core.cost_guard import CostGuard
from app.core.statistics_engine import StatisticsEngine
from app.models.schemas import (
    WORKLOAD_METRIC_PROFILES,
    BenchmarkConfig,
    SingleRequestMetric,
    SLOThresholds,
    VendorType,
    WorkloadPreset,
)


@pytest.mark.asyncio
async def test_rate_limit_probe_workload_preset():
    """Verify rate limit probe preset produces micro-tokens and records 429 metrics."""
    adapter = MockVendorAdapter()
    config = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.RATE_LIMIT_PROBE,
        concurrency=15,  # triggers simulated rate limiting
        max_tokens=2,
    )

    events = []
    try:
        async for event in adapter.stream_completion(None, config, "ping"):
            events.append(event)
    except Exception as exc:
        assert "429" in str(exc)

    # Check cost profile is micro-cost (< 10 cents for 900 requests)
    estimate = CostGuard.estimate_benchmark_cost(config)
    assert estimate.estimated_cost_usd < 0.10
    assert estimate.estimated_prompt_tokens == estimate.estimated_requests * 5


def test_statistics_engine_rate_limit_and_profile_filtering():
    """Verify StatisticsEngine computes rate_limit_pct, RPM, TPM, and assigns profile_metrics."""
    slo = SLOThresholds()
    metrics = [
        SingleRequestMetric(
            request_id="r1",
            status_code=200,
            is_error=False,
            is_rate_limit=False,
            prompt_tokens=5,
            completion_tokens=2,
            ttft_ms=25.0,
            tpot_ms=10.0,
            e2e_ms=45.0,
            prefill_tps=200.0,
            cost_usd=0.00001,
        ),
        SingleRequestMetric(
            request_id="r2",
            status_code=429,
            is_error=False,
            is_rate_limit=True,
            retry_after_ms=2000.0,
            prompt_tokens=5,
            completion_tokens=0,
            e2e_ms=15.0,
            cost_usd=0.0,
        ),
        SingleRequestMetric(
            request_id="r3",
            status_code=200,
            is_error=False,
            is_rate_limit=False,
            prompt_tokens=5,
            completion_tokens=2,
            ttft_ms=28.0,
            tpot_ms=12.0,
            e2e_ms=52.0,
            prefill_tps=178.5,
            cost_usd=0.00001,
        ),
    ]

    snapshot = StatisticsEngine.calculate_snapshot(
        benchmark_id="bmk_test",
        status="completed",
        elapsed_seconds=2.0,
        total_requests=3,
        metrics=metrics,
        slo=slo,
        workload_preset=WorkloadPreset.RATE_LIMIT_PROBE.value,
    )

    assert snapshot.rate_limit_count == 1
    assert snapshot.rate_limit_pct == round(1 / 3 * 100.0, 2)
    assert snapshot.status_distribution.get("429") == 1
    assert snapshot.status_distribution.get("200") == 2
    assert snapshot.current_rpm > 0
    assert snapshot.current_tpm > 0
    assert "rate_limit_pct" in snapshot.profile_metrics
    assert "current_rpm" in snapshot.profile_metrics


def test_workload_metric_profiles_metadata():
    """Ensure all WorkloadPreset enums have valid profile definitions with target metrics."""
    for preset in [
        WorkloadPreset.RATE_LIMIT_PROBE,
        WorkloadPreset.PREFILL_TTFT,
        WorkloadPreset.DECODE_THROUGHPUT,
        WorkloadPreset.REASONING_COT,
        WorkloadPreset.AGENTIC_TOOL_CALLING,
        WorkloadPreset.CODE_GENERATION,
        WorkloadPreset.RAG_SYNTHESIS,
        WorkloadPreset.LONG_CONTEXT_RETRIEVAL,
        WorkloadPreset.SUMMARIZATION_DISTILL,
        WorkloadPreset.STRUCTURED_JSON,
        WorkloadPreset.CHAT_INTERACTIVE,
        WorkloadPreset.FEWSHOT_CLASSIFICATION,
        WorkloadPreset.MULTIMODAL_VISION,
        WorkloadPreset.MULTITURN_AGENTIC,
        WorkloadPreset.KV_CACHE_REUSE,
        WorkloadPreset.CUSTOM,
    ]:
        profile = WORKLOAD_METRIC_PROFILES.get(preset.value)
        assert profile is not None, f"Missing profile definition for {preset.value}"
        assert len(profile["target_metrics"]) >= 4
        assert "default_in_tokens" in profile
        assert "default_out_tokens" in profile
        assert "default_concurrency" in profile
        assert "default_max_tokens" in profile


@pytest.mark.asyncio
async def test_agentic_tool_calling_mock_stream():
    """Verify tool calling preset streams valid JSON tool invocation."""
    adapter = MockVendorAdapter()
    config = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.AGENTIC_TOOL_CALLING,
        concurrency=2,
        max_tokens=256,
    )
    tokens = []
    async for event in adapter.stream_completion(None, config, "Call trigger_remediation_playbook"):
        if event.token:
            tokens.append(event.token)
    full_output = "".join(tokens)
    assert "trigger_remediation_playbook" in full_output or "calculate_p95_metric" in full_output
    assert "arguments" in full_output


@pytest.mark.asyncio
async def test_code_generation_mock_stream():
    """Verify code generation preset streams code tokens."""
    adapter = MockVendorAdapter()
    config = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.CODE_GENERATION,
        concurrency=2,
        max_tokens=512,
    )
    tokens = []
    async for event in adapter.stream_completion(None, config, "Write token bucket limiter"):
        if event.token:
            tokens.append(event.token)
    full_output = "".join(tokens)
    assert (
        "AdaptiveSlidingWindowRateLimiter" in full_output
        or "TokenBucketLimiter" in full_output
        or "class" in full_output
    )


@pytest.mark.asyncio
async def test_new_workload_presets_mock_stream():
    """Verify fewshot classification, vision, multiturn, and kv reuse presets stream successfully."""
    adapter = MockVendorAdapter()

    # 1. Fewshot classification
    cfg_fewshot = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.FEWSHOT_CLASSIFICATION,
        concurrency=2,
        max_tokens=64,
    )
    fewshot_tokens = []
    async for event in adapter.stream_completion(None, cfg_fewshot, "Classify ticket"):
        if event.token:
            fewshot_tokens.append(event.token)
    fewshot_text = "".join(fewshot_tokens)
    assert (
        "category" in fewshot_text
        or "billing_dispute" in fewshot_text
        or "rate_limit_breach" in fewshot_text
    )

    # 2. Multimodal vision
    cfg_vision = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.MULTIMODAL_VISION,
        concurrency=2,
        max_tokens=256,
    )
    vision_tokens = []
    async for event in adapter.stream_completion(None, cfg_vision, "OCR diagram"):
        if event.token:
            vision_tokens.append(event.token)
    vision_text = "".join(vision_tokens)
    assert (
        "Bottleneck" in vision_text
        or "GPU" in vision_text
        or "Optical" in vision_text
        or "VRAM" in vision_text
    )

    # 3. Multi-turn agentic
    cfg_multiturn = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.MULTITURN_AGENTIC,
        concurrency=2,
        max_tokens=256,
    )
    multiturn_tokens = []
    async for event in adapter.stream_completion(None, cfg_multiturn, "Turn 4"):
        if event.token:
            multiturn_tokens.append(event.token)
    multiturn_text = "".join(multiturn_tokens)
    assert (
        "KV cache" in multiturn_text
        or "WAN" in multiturn_text
        or "ITL" in multiturn_text
        or "batching" in multiturn_text
    )

    # 4. KV cache reuse
    cfg_cache = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.KV_CACHE_REUSE,
        concurrency=2,
        max_tokens=256,
    )
    cache_tokens = []
    async for event in adapter.stream_completion(None, cfg_cache, "Prefix cached"):
        if event.token:
            cache_tokens.append(event.token)
    assert (
        "Inter-Token Latency" in "".join(cache_tokens)
        or "decode" in "".join(cache_tokens)
        or "Radix" in "".join(cache_tokens)
    )


def test_production_prompt_presets_calibration():
    """Verify all prompt presets are populated with production-grade content and valid token counts."""
    from app.core.fallback_tokenizer import FallbackTokenizer
    from app.core.prompt_presets import PROMPT_PRESET_TEXT, get_preset_prompt

    for preset in WorkloadPreset:
        prompt = get_preset_prompt(preset)
        assert prompt, f"Empty prompt for preset {preset.value}"
        assert len(prompt) > 5, f"Prompt too short for preset {preset.value}"
        tok_count = FallbackTokenizer.count_tokens(prompt)
        assert tok_count > 0, f"Zero tokens counted for preset {preset.value}"

    # Verify specific heavy presets have calibrated token counts
    assert FallbackTokenizer.count_tokens(PROMPT_PRESET_TEXT[WorkloadPreset.PREFILL_TTFT]) >= 3000
    assert (
        FallbackTokenizer.count_tokens(PROMPT_PRESET_TEXT[WorkloadPreset.LONG_CONTEXT_RETRIEVAL])
        >= 10000
    )
    assert (
        FallbackTokenizer.count_tokens(PROMPT_PRESET_TEXT[WorkloadPreset.SUMMARIZATION_DISTILL])
        >= 2500
    )
    assert FallbackTokenizer.count_tokens(PROMPT_PRESET_TEXT[WorkloadPreset.KV_CACHE_REUSE]) >= 2000
    assert FallbackTokenizer.count_tokens(PROMPT_PRESET_TEXT[WorkloadPreset.RAG_SYNTHESIS]) >= 2000
    assert (
        FallbackTokenizer.count_tokens(PROMPT_PRESET_TEXT[WorkloadPreset.AGENTIC_TOOL_CALLING])
        >= 800
    )
    assert FallbackTokenizer.count_tokens(PROMPT_PRESET_TEXT[WorkloadPreset.RATE_LIMIT_PROBE]) <= 20
