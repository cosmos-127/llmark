from app.core.diff_engine import DiffEngine
from app.models.db.models import BenchmarkRun


def test_compare_runs_improvement():
    """Verify delta calculation where Run B is faster and cheaper than Run A."""
    run_a = BenchmarkRun(
        id="run_a",
        name="Run A",
        vendor="openai",
        model="gpt-4o",
        ttft_p50=200.0,
        ttft_p95=300.0,
        ttft_p99=400.0,
        itl_p50=30.0,
        itl_p95=40.0,
        max_itl=80.0,
        tpot_mean=35.0,
        tps_decode=50.0,
        goodput_pct=90.0,
        total_cost_usd=0.010,
    )

    run_b = BenchmarkRun(
        id="run_b",
        name="Run B",
        vendor="groq",
        model="llama-3.3-70b",
        ttft_p50=100.0,  # 50% faster
        ttft_p95=150.0,  # 50% faster
        ttft_p99=200.0,
        itl_p50=10.0,  # 66% faster
        itl_p95=15.0,
        max_itl=40.0,
        tpot_mean=12.0,
        tps_decode=150.0,  # 200% higher
        goodput_pct=98.0,  # 8.89% higher
        total_cost_usd=0.003,  # 70% cheaper
    )

    diff = DiffEngine.compare_runs(run_a, run_b)

    assert diff.run_a_id == "run_a"
    assert diff.run_b_id == "run_b"
    assert len(diff.deltas) >= 8

    # Check TTFT P95 delta
    ttft_delta = next(d for d in diff.deltas if "TTFT P95" in d.metric_name)
    assert ttft_delta.delta_value == -150.0
    assert ttft_delta.delta_pct == -50.0
    assert ttft_delta.is_improvement is True

    # Check TPS delta (higher is better)
    tps_delta = next(d for d in diff.deltas if "TPS" in d.metric_name)
    assert tps_delta.delta_value == 100.0
    assert tps_delta.delta_pct == 200.0
    assert tps_delta.is_improvement is True

    # Check Cost delta (lower is better)
    cost_delta = next(d for d in diff.deltas if "Cost" in d.metric_name)
    assert cost_delta.is_improvement is True


def test_compare_three_runs():
    """Verify delta calculation with 3 runs (Run A baseline, Run B, Run C)."""
    run_a = BenchmarkRun(
        id="run_a",
        name="Run A",
        vendor="openai",
        model="gpt-4o",
        ttft_p50=200.0,
        ttft_p95=300.0,
        ttft_p99=400.0,
        itl_p50=30.0,
        itl_p95=40.0,
        max_itl=80.0,
        tpot_mean=35.0,
        tps_decode=50.0,
        goodput_pct=90.0,
        total_cost_usd=0.010,
    )
    run_b = BenchmarkRun(
        id="run_b",
        name="Run B",
        vendor="anthropic",
        model="claude-3-7-sonnet",
        ttft_p50=180.0,
        ttft_p95=250.0,
        ttft_p99=320.0,
        itl_p50=25.0,
        itl_p95=35.0,
        max_itl=70.0,
        tpot_mean=28.0,
        tps_decode=75.0,
        goodput_pct=94.0,
        total_cost_usd=0.009,
    )
    run_c = BenchmarkRun(
        id="run_c",
        name="Run C",
        vendor="groq",
        model="llama-3.3-70b",
        ttft_p50=90.0,
        ttft_p95=120.0,
        ttft_p99=160.0,
        itl_p50=8.0,
        itl_p95=12.0,
        max_itl=30.0,
        tpot_mean=10.0,
        tps_decode=180.0,
        goodput_pct=99.0,
        total_cost_usd=0.002,
    )

    diff = DiffEngine.compare_runs(run_a, run_b, run_c)

    assert diff.run_a_id == "run_a"
    assert diff.run_b_id == "run_b"
    assert diff.run_c_id == "run_c"

    # Check TTFT P95 delta for C vs A
    ttft_delta = next(d for d in diff.deltas if "TTFT P95" in d.metric_name)
    assert ttft_delta.run_c_value == 120.0
    assert ttft_delta.delta_c_value == -180.0
    assert ttft_delta.delta_c_pct == -60.0
    assert ttft_delta.is_improvement_c is True


def test_compare_runs_workload_preset_mismatch():
    """Verify that comparing runs with different workload presets raises a ValueError."""
    import pytest

    run_a = BenchmarkRun(
        id="run_a",
        name="Run A",
        vendor="openai",
        model="gpt-4o",
        workload_preset="rate_limit_probe",
    )
    run_b = BenchmarkRun(
        id="run_b",
        name="Run B",
        vendor="groq",
        model="llama-3.3-70b",
        workload_preset="long_context_retrieval",
    )

    with pytest.raises(ValueError, match="Workload preset mismatch"):
        DiffEngine.compare_runs(run_a, run_b)


def test_compare_runs_comprehensive_common_metrics():
    """Verify that all common metrics (Error Rate, RPS, Tokens, ITL P99, TTFT P75, Network) are computed."""
    run_a = BenchmarkRun(
        id="run_a",
        name="Run A",
        vendor="openai",
        model="gpt-4o",
        workload_preset="chat_interactive",
        duration_seconds=30,
        completed_requests=60,
        total_prompt_tokens=12000,
        total_gen_tokens=9000,
        ttft_p50=180.0,
        ttft_p75=210.0,
        ttft_p95=260.0,
        ttft_p99=320.0,
        itl_p50=20.0,
        itl_p75=24.0,
        itl_p95=30.0,
        itl_p99=45.0,
        max_itl=65.0,
        tpot_mean=22.0,
        tps_decode=220.0,
        goodput_pct=95.0,
        error_rate_pct=1.5,
        total_cost_usd=0.040,
        dns_p50=10.0,
        tcp_p50=20.0,
        tls_p50=30.0,
    )
    run_b = BenchmarkRun(
        id="run_b",
        name="Run B",
        vendor="groq",
        model="llama-3.3-70b",
        workload_preset="chat_interactive",
        duration_seconds=30,
        completed_requests=150,
        total_prompt_tokens=30000,
        total_gen_tokens=22500,
        ttft_p50=90.0,
        ttft_p75=105.0,
        ttft_p95=130.0,
        ttft_p99=160.0,
        itl_p50=10.0,
        itl_p75=12.0,
        itl_p95=15.0,
        itl_p99=22.0,
        max_itl=35.0,
        tpot_mean=11.0,
        tps_decode=550.0,
        goodput_pct=99.0,
        error_rate_pct=0.0,
        total_cost_usd=0.015,
        dns_p50=8.0,
        tcp_p50=15.0,
        tls_p50=22.0,
    )

    diff = DiffEngine.compare_runs(run_a, run_b)
    metric_names = [d.metric_name for d in diff.deltas]

    # Check that critical common metrics are present
    assert "Error Rate (%)" in metric_names
    assert "Request Rate (RPS)" in metric_names
    assert "Completed Requests" in metric_names
    assert "Prompt Tokens" in metric_names
    assert "Generated Tokens" in metric_names
    assert "TTFT P75 (ms)" in metric_names
    assert "ITL P75 (ms)" in metric_names
    assert "ITL P99 (ms)" in metric_names
    assert "Cost / 1K Calls ($)" in metric_names
    assert "DNS Resolution (ms)" in metric_names
    assert "TCP Handshake (ms)" in metric_names
    assert "TLS Handshake (ms)" in metric_names

    # Verify Error Rate improvement (lower is better: 1.5% -> 0.0%)
    err_delta = next(d for d in diff.deltas if d.metric_name == "Error Rate (%)")
    assert err_delta.delta_value == -1.5
    assert err_delta.is_improvement is True

    # Verify RPS improvement (higher is better: 2.0 -> 5.0)
    rps_delta = next(d for d in diff.deltas if d.metric_name == "Request Rate (RPS)")
    assert rps_delta.run_a_value == 2.0
    assert rps_delta.run_b_value == 5.0
    assert rps_delta.delta_value == 3.0
    assert rps_delta.is_improvement is True

    # Verify preset populated
    assert diff.workload_preset == "chat_interactive"

