import pytest
from app.core.statistics_engine import StatisticsEngine
from app.models.schemas import SingleRequestMetric, SLOThresholds, WaterfallTiming


def test_percentile_computation():
    """Verify numpy percentiles over unaggregated array."""
    values = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0]
    stats = StatisticsEngine.compute_percentiles(values)

    assert stats["p50"] == 55.0
    assert stats["p95"] == 95.5
    assert stats["p99"] == 99.1
    assert stats["max"] == 100.0
    assert stats["mean"] == 55.0


def test_empty_percentiles():
    """Ensure graceful handling of empty lists."""
    stats = StatisticsEngine.compute_percentiles([])
    assert stats["p50"] == 0.0
    assert stats["p99"] == 0.0


def test_slo_evaluation():
    """Verify strict multi-criteria SLO evaluation."""
    slo = SLOThresholds(
        max_ttft_ms=500.0,
        max_tpot_ms=30.0,
        max_e2e_ms=4000.0,
        max_error_rate_pct=1.0,
    )

    # Compliant request
    good_req = SingleRequestMetric(
        request_id="req_1",
        status_code=200,
        is_error=False,
        ttft_ms=250.0,
        tpot_ms=20.0,
        e2e_ms=1500.0,
    )
    assert StatisticsEngine.evaluate_slo(good_req, slo) is True

    # Violating TTFT
    slow_ttft = SingleRequestMetric(
        request_id="req_2",
        status_code=200,
        is_error=False,
        ttft_ms=600.0,
        tpot_ms=20.0,
        e2e_ms=1500.0,
    )
    assert StatisticsEngine.evaluate_slo(slow_ttft, slo) is False

    # Violating error status
    error_req = SingleRequestMetric(
        request_id="req_3",
        status_code=500,
        is_error=True,
        ttft_ms=100.0,
        tpot_ms=10.0,
        e2e_ms=500.0,
    )
    assert StatisticsEngine.evaluate_slo(error_req, slo) is False


def test_calculate_snapshot():
    """Verify full aggregation into MetricsSnapshot."""
    slo = SLOThresholds(max_ttft_ms=500.0, max_tpot_ms=50.0, max_e2e_ms=5000.0)
    reqs = [
        SingleRequestMetric(
            request_id="r1",
            status_code=200,
            prompt_tokens=100,
            completion_tokens=50,
            ttft_ms=200.0,
            tpot_ms=20.0,
            e2e_ms=1200.0,
            itl_deltas_ms=[20.0, 22.0, 19.0],
            waterfall=WaterfallTiming(dns_ms=10.0, tcp_ms=20.0, tls_ms=25.0, ttft_ms=200.0, decode_ms=1000.0, total_e2e_ms=1200.0),
            cost_usd=0.0005,
        ),
        SingleRequestMetric(
            request_id="r2",
            status_code=200,
            prompt_tokens=100,
            completion_tokens=50,
            ttft_ms=300.0,
            tpot_ms=25.0,
            e2e_ms=1550.0,
            itl_deltas_ms=[25.0, 26.0, 24.0],
            waterfall=WaterfallTiming(dns_ms=10.0, tcp_ms=20.0, tls_ms=25.0, ttft_ms=300.0, decode_ms=1250.0, total_e2e_ms=1550.0),
            cost_usd=0.0005,
        ),
    ]

    snapshot = StatisticsEngine.calculate_snapshot(
        benchmark_id="bmk_test",
        status="completed",
        elapsed_seconds=2.0,
        total_requests=2,
        metrics=reqs,
        slo=slo,
    )

    assert snapshot.completed_requests == 2
    assert snapshot.failed_requests == 0
    assert snapshot.ttft_p50 == 250.0
    assert snapshot.goodput_pct == 100.0
    assert snapshot.current_spend_usd == 0.001
    assert snapshot.current_tps == 50.0  # 100 tokens / 2.0s
