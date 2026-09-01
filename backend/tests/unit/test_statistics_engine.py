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
            waterfall=WaterfallTiming(
                dns_ms=10.0,
                tcp_ms=20.0,
                tls_ms=25.0,
                ttft_ms=200.0,
                decode_ms=1000.0,
                total_e2e_ms=1200.0,
            ),
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
            waterfall=WaterfallTiming(
                dns_ms=10.0,
                tcp_ms=20.0,
                tls_ms=25.0,
                ttft_ms=300.0,
                decode_ms=1250.0,
                total_e2e_ms=1550.0,
            ),
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
    assert snapshot.itl_jitter_cv is not None
    assert snapshot.prefill_slope_ms_per_1k is not None
    assert snapshot.cost_per_1k_goodput_usd == 0.5  # ($0.001 / 2) * 1000 = $0.5


def test_derived_metrics_workload_preset_variations():
    """Verify preset-specific derived calculations (cache speedup, thinking multipliers, grammar penalty)."""
    slo = SLOThresholds(max_ttft_ms=500.0, max_tpot_ms=50.0, max_e2e_ms=5000.0)
    reqs = [
        SingleRequestMetric(
            request_id="r1",
            status_code=200,
            prompt_tokens=2000,
            completion_tokens=100,
            thinking_tokens=60,
            ttft_ms=100.0,
            ttfa_ms=300.0,
            tpot_ms=30.0,
            e2e_ms=3000.0,
            itl_deltas_ms=[28.0, 30.0, 32.0],
            cost_usd=0.002,
        ),
    ]

    # Reasoning preset
    reasoning_snapshot = StatisticsEngine.calculate_snapshot(
        benchmark_id="bmk_cot",
        status="completed",
        elapsed_seconds=3.0,
        total_requests=1,
        metrics=reqs,
        slo=slo,
        workload_preset="reasoning_cot",
    )
    assert reasoning_snapshot.thinking_wait_multiplier == 3.0  # 300 / 100
    assert reasoning_snapshot.thinking_cost_share_pct == 60.0  # 60 / 100 * 100

    # Structured JSON preset
    json_snapshot = StatisticsEngine.calculate_snapshot(
        benchmark_id="bmk_json",
        status="completed",
        elapsed_seconds=3.0,
        total_requests=1,
        metrics=reqs,
        slo=slo,
        workload_preset="structured_json",
    )
    assert json_snapshot.grammar_penalty_pct == 50.0  # (30 - 20) / 20 * 100 = 50%

    # KV cache reuse preset
    kv_snapshot = StatisticsEngine.calculate_snapshot(
        benchmark_id="bmk_kv",
        status="completed",
        elapsed_seconds=3.0,
        total_requests=1,
        metrics=reqs,
        slo=slo,
        workload_preset="kv_cache_reuse",
    )
    assert kv_snapshot.cache_speedup_factor is not None
    assert kv_snapshot.cache_speedup_factor > 1.0


def test_latency_distribution_histogram():
    """Verify latency histogram bins, dispersion, and bimodal detection."""
    values = [45.0, 48.0, 50.0, 52.0, 55.0, 480.0, 495.0, 510.0, 520.0, 530.0]
    dist = StatisticsEngine.compute_distribution(values, "ttft", num_bins=6)
    assert dist is not None
    assert dist.metric == "ttft"
    assert dist.count == 10
    assert dist.min_ms == 45.0
    assert dist.max_ms == 530.0
    assert len(dist.bins) > 0
    assert dist.bimodal_detected is True
    assert dist.bimodal_description is not None
    assert "Bimodal" in dist.bimodal_description


def test_cold_vs_warm_cache_measurement():
    """Verify measured cold vs warm prefix cache speedup and hit percentage."""
    slo = SLOThresholds()
    reqs = [
        SingleRequestMetric(
            request_id="req_cold",
            status_code=200,
            is_error=False,
            is_cache_cold=True,
            prompt_tokens=3000,
            completion_tokens=100,
            ttft_ms=600.0,
            tpot_ms=20.0,
            e2e_ms=2600.0,
        ),
        SingleRequestMetric(
            request_id="req_warm_1",
            status_code=200,
            is_error=False,
            is_cache_cold=False,
            prompt_tokens=3000,
            completion_tokens=100,
            ttft_ms=60.0,
            tpot_ms=20.0,
            e2e_ms=2060.0,
        ),
        SingleRequestMetric(
            request_id="req_warm_2",
            status_code=200,
            is_error=False,
            is_cache_cold=False,
            prompt_tokens=3000,
            completion_tokens=100,
            ttft_ms=50.0,
            tpot_ms=20.0,
            e2e_ms=2050.0,
        ),
    ]

    snapshot = StatisticsEngine.calculate_snapshot(
        benchmark_id="bmk_cache",
        status="completed",
        elapsed_seconds=5.0,
        total_requests=3,
        metrics=reqs,
        slo=slo,
        workload_preset="kv_cache_reuse",
    )
    assert snapshot.cold_ttft_ms == 600.0
    assert snapshot.warm_ttft_p50_ms == 55.0
    assert snapshot.cache_speedup_factor == round(600.0 / 55.0, 2)
    assert snapshot.cache_hit_pct == 100.0
    assert snapshot.cache_token_savings_pct == 50.0
    assert snapshot.ttft_distribution is not None


def test_preset_dependency_enforcement():
    """Verify BenchmarkConfig automatic field locking and invariant enforcement."""
    from app.models.schemas import BenchmarkConfig, WorkloadPreset

    # 1. KV cache reuse preset locks cache_bust off and measure_cache_speedup on
    cfg_kv = BenchmarkConfig(
        name="KV Cache Test",
        workload_preset=WorkloadPreset.KV_CACHE_REUSE,
        cache_bust=True,  # Should be normalized to False
        warmup_requests=3,  # Should be normalized to 0
    )
    assert cfg_kv.cache_bust is False
    assert cfg_kv.measure_cache_speedup is True
    assert cfg_kv.warmup_requests == 0
    assert cfg_kv.max_tokens == 150

    # 2. Cache bust defeats cache speedup
    cfg_bust = BenchmarkConfig(
        name="Cache Bust Test",
        workload_preset=WorkloadPreset.CHAT,
        cache_bust=True,
        measure_cache_speedup=True,
    )
    assert cfg_bust.cache_bust is True
    assert cfg_bust.measure_cache_speedup is False

    # 3. Saturation knee curve locks concurrency to minimum 8
    cfg_knee = BenchmarkConfig(
        name="Knee Test",
        workload_preset=WorkloadPreset.CHAT,
        load_curve="saturation_knee",
        concurrency=2,
    )
    assert cfg_knee.load_curve == "saturation_knee"
    assert cfg_knee.concurrency >= 8

    # 4. Prefill TTFT locks max_tokens to 10
    cfg_ttft = BenchmarkConfig(
        name="Prefill TTFT Test",
        workload_preset=WorkloadPreset.PREFILL_TTFT,
        max_tokens=500,
    )
    assert cfg_ttft.max_tokens == 10
