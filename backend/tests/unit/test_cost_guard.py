from app.core.cost_guard import CostGuard
from app.models.schemas import BenchmarkConfig, VendorType, WorkloadPreset


def test_pricing_lookup():
    """Verify standard model pricing retrieval and fallback."""
    gpt4o_p, gpt4o_c = CostGuard.get_pricing("gpt-4o")
    assert gpt4o_p == 2.50
    assert gpt4o_c == 10.00

    unknown_p, unknown_c = CostGuard.get_pricing("custom-internal-model")
    assert unknown_p > 0
    assert unknown_c > 0


def test_calculate_request_cost():
    """Verify single request cost computation."""
    # 1,000 prompt tokens @ $2.50/M = $0.0025
    # 500 gen tokens @ $10.00/M = $0.0050
    # Total = $0.0075
    cost = CostGuard.calculate_request_cost("gpt-4o", 1000, 500)
    assert cost == 0.0075


def test_estimate_benchmark_cost():
    """Verify pre-flight cost estimation logic and spend cap flag in duration mode."""
    config = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.CHAT,
        concurrency=5,
        duration_seconds=30,
        hard_spend_cap=0.01,
    )

    estimate = CostGuard.estimate_benchmark_cost(config)
    assert estimate.estimated_requests > 0
    assert estimate.estimated_total_tokens > 0
    assert estimate.estimated_cost_usd > 0
    assert estimate.hard_spend_cap_usd == 0.01


def test_estimate_benchmark_cost_request_mode():
    """Verify pre-flight cost estimation in request-based mode."""
    from app.models.schemas import TestMode

    config = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.CHAT,
        concurrency=5,
        test_mode=TestMode.REQUESTS,
        total_requests=40,
        hard_spend_cap=2.0,
    )

    from app.core.cost_guard import PRESET_TOKEN_PROFILES

    estimate = CostGuard.estimate_benchmark_cost(config)
    assert estimate.estimated_requests == 40
    prompt_p, gen_p = PRESET_TOKEN_PROFILES[WorkloadPreset.CHAT]
    assert estimate.estimated_total_tokens == (prompt_p + gen_p) * 40
    assert estimate.estimated_cost_usd > 0


def test_spend_cap_trip():
    """Verify spend cap circuit breaker trigger."""
    assert CostGuard.is_spend_cap_exceeded(1.50, 2.00) is False
    assert CostGuard.is_spend_cap_exceeded(2.01, 2.00) is True
    assert CostGuard.is_spend_cap_exceeded(5.00, None) is False
