import pytest
from app.adapters.mock_adapter import MockVendorAdapter
from app.core.cost_guard import CostGuard
from app.core.statistics_engine import StatisticsEngine
from app.models.schemas import (
    BenchmarkConfig,
    SingleRequestMetric,
    SLOThresholds,
    VendorType,
    WorkloadPreset,
    WORKLOAD_METRIC_PROFILES,
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
        WorkloadPreset.RAG_SYNTHESIS,
        WorkloadPreset.STRUCTURED_JSON,
        WorkloadPreset.CHAT_INTERACTIVE,
    ]:
        profile = WORKLOAD_METRIC_PROFILES.get(preset.value)
        assert profile is not None, f"Missing profile definition for {preset.value}"
        assert len(profile["target_metrics"]) >= 4
        assert "default_in_tokens" in profile
        assert "default_out_tokens" in profile
