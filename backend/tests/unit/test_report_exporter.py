import gzip
import json

import pytest

from app.core.report_exporter import ReportExporter
from app.models.db.models import BenchmarkRun


@pytest.fixture
def sample_run():
    return BenchmarkRun(
        id="bmk_test_123",
        name="Canary Run",
        vendor="openai",
        model="gpt-4o",
        workload_preset="chat",
        load_curve="constant",
        concurrency=5,
        duration_seconds=30,
        status="completed",
        total_requests=50,
        completed_requests=50,
        failed_requests=0,
        total_prompt_tokens=10000,
        total_gen_tokens=7500,
        total_cost_usd=0.045,
        ttft_p50=180.0,
        ttft_p75=220.0,
        ttft_p95=280.0,
        ttft_p99=350.0,
        itl_p50=22.0,
        itl_p75=26.0,
        itl_p95=32.0,
        itl_p99=45.0,
        max_itl=78.0,
        tpot_mean=24.5,
        tps_decode=250.0,
        goodput_pct=98.0,
        error_rate_pct=0.0,
        dns_p50=12.0,
        tcp_p50=24.0,
        tls_p50=28.0,
        config_snapshot={"name": "Canary Run", "model": "gpt-4o"},
    )


def test_markdown_export(sample_run):
    md = ReportExporter.generate_markdown(sample_run)
    assert "# ⚡ LLMark Benchmark Report: Canary Run" in md
    assert "gpt-4o" in md
    assert "98.0%" in md
    assert "280.0 ms" in md


def test_csv_export(sample_run):
    csv_text = ReportExporter.generate_csv(sample_run)
    assert "Metric Category,Metric Name,Value,Unit" in csv_text
    assert "bmk_test_123" in csv_text
    assert "TTFT P95" in csv_text


def test_bundle_export(sample_run):
    bundle_bytes = ReportExporter.generate_bundle(sample_run)
    assert len(bundle_bytes) > 0
    # Decompress and verify JSON
    decompressed = gzip.decompress(bundle_bytes).decode("utf-8")
    data = json.loads(decompressed)
    assert data["benchmark_id"] == "bmk_test_123"
    assert data["summary"]["goodput_pct"] == 98.0


def test_pdf_export(sample_run):
    pdf_bytes = ReportExporter.generate_pdf(sample_run)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")


def test_pdf_export_with_special_characters():
    """Verify PDF export safely handles special XML/HTML characters without parser crashes."""
    run = BenchmarkRun(
        id="bmk_xml_test_&<>",
        name="<Canary> & 'Benchmark' \"Test\"",
        vendor="openai & azure",
        model="gpt-4o <latest> & fast",
        workload_preset="chat",
        load_curve="constant",
        concurrency=3,
        duration_seconds=10,
        status="completed",
        total_requests=10,
        completed_requests=8,
        failed_requests=2,
        total_cost_usd=0.012,
        goodput_pct=80.0,
        error_rate_pct=20.0,
        config_snapshot={"name": "Special & Chars <Run>"},
    )
    pdf_bytes = ReportExporter.generate_pdf(run)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")


def test_pdf_export_with_none_values():
    """Verify PDF export does not crash when metrics are None or sparse."""
    sparse_run = BenchmarkRun(
        id="bmk_sparse_001",
        name="",
        vendor="mock",
        model="test-model",
        workload_preset="chat",
        load_curve="constant",
        concurrency=1,
        duration_seconds=5,
        status="aborted",
        total_requests=0,
        completed_requests=0,
        failed_requests=0,
        config_snapshot={},
    )
    pdf_bytes = ReportExporter.generate_pdf(sparse_run)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")


def test_pdf_export_rate_limit_preset():
    """Verify rate limit probe preset PDF export works cleanly with custom metrics."""
    run = BenchmarkRun(
        id="bmk_rl_001",
        name="Rate Limit Saturation Test",
        vendor="openai",
        model="gpt-4o-mini",
        workload_preset="rate_limit_probe",
        load_curve="ramp",
        concurrency=15,
        duration_seconds=20,
        status="completed",
        total_requests=100,
        completed_requests=80,
        failed_requests=20,
        error_rate_pct=20.0,
        goodput_pct=80.0,
        total_cost_usd=0.004,
        ttft_p50=95.0,
        ttft_p95=140.0,
        raw_telemetry={
            "rate_limit_pct": 20.0,
            "rate_limit_count": 20,
            "current_rpm": 300.0,
            "current_tpm": 1500.0,
            "estimated_rpm_limit": 280.0,
            "estimated_tpm_limit": 1400.0,
        },
    )
    pdf_bytes = ReportExporter.generate_pdf(run)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

    md = ReportExporter.generate_markdown(run)
    assert "Rate Limit Saturation Test" in md
    assert "Estimated RPM Saturation Limit" in md


def test_pdf_export_reasoning_cot_preset():
    """Verify reasoning preset PDF export properly formats TTFA and reasoning tokens."""
    run = BenchmarkRun(
        id="bmk_cot_001",
        name="DeepSeek R1 Thinking Benchmark",
        vendor="openai_compatible",
        model="deepseek-reasoner",
        workload_preset="reasoning_cot",
        load_curve="constant",
        concurrency=4,
        duration_seconds=30,
        status="completed",
        total_requests=20,
        completed_requests=20,
        failed_requests=0,
        goodput_pct=100.0,
        total_cost_usd=0.085,
        total_prompt_tokens=4000,
        total_gen_tokens=16000,
        ttft_p50=220.0,
        ttft_p95=350.0,
        ttfa_p50=4500.0,
        ttfa_p95=7200.0,
        tps_decode=65.0,
        raw_telemetry={
            "thinking_wait_multiplier": 20.45,
            "thinking_cost_share_pct": 72.5,
            "thinking_tokens_avg": 750.0,
        },
    )
    pdf_bytes = ReportExporter.generate_pdf(run)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

    md = ReportExporter.generate_markdown(run)
    assert "Thinking Wait Multiplier" in md
    assert "Reasoning Budget Share" in md


def test_pdf_export_prefill_preset():
    """Verify prefill TTFT preset PDF export formats prefill slope and throughput."""
    run = BenchmarkRun(
        id="bmk_prefill_001",
        name="Prefill Scaling Benchmark",
        vendor="anthropic",
        model="claude-3-5-sonnet",
        workload_preset="prefill_ttft",
        load_curve="constant",
        concurrency=4,
        duration_seconds=25,
        status="completed",
        total_requests=30,
        completed_requests=30,
        failed_requests=0,
        goodput_pct=100.0,
        total_cost_usd=0.12,
        ttft_p50=450.0,
        ttft_p95=620.0,
        ttft_p99=800.0,
        raw_telemetry={
            "prefill_tps_p95": 8200.0,
            "prefill_slope_ms_per_1k": 112.5,
        },
    )
    pdf_bytes = ReportExporter.generate_pdf(run)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

    md = ReportExporter.generate_markdown(run)
    assert "Prefill Latency Slope" in md


def test_pdf_export_structured_json_preset():
    """Verify structured JSON preset PDF export properly formats grammar penalty and validity."""
    run = BenchmarkRun(
        id="bmk_json_001",
        name="JSON Schema Benchmark",
        vendor="openai",
        model="gpt-4o",
        workload_preset="structured_json",
        load_curve="constant",
        concurrency=5,
        duration_seconds=30,
        status="completed",
        total_requests=50,
        completed_requests=50,
        failed_requests=0,
        goodput_pct=100.0,
        total_cost_usd=0.035,
        raw_telemetry={
            "schema_validity_pct": 100.0,
            "grammar_penalty_pct": 14.5,
        },
    )
    pdf_bytes = ReportExporter.generate_pdf(run)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

    md = ReportExporter.generate_markdown(run)
    assert "Grammar Masking Penalty" in md
    assert "Schema / Grammar Validity" in md


def test_generate_diff_pdf_two_runs():
    """Verify generate_diff_pdf produces a valid multi-model PDF comparing 2 benchmark runs."""
    run_a = BenchmarkRun(
        id="bmk_a",
        name="GPT-4o Baseline",
        vendor="openai",
        model="gpt-4o",
        workload_preset="chat",
        load_curve="constant",
        concurrency=5,
        duration_seconds=30,
        status="completed",
        total_requests=50,
        completed_requests=50,
        failed_requests=0,
        total_cost_usd=0.02,
        ttft_p50=200.0,
        ttft_p95=300.0,
        tps_decode=100.0,
        goodput_pct=92.0,
    )
    run_b = BenchmarkRun(
        id="bmk_b",
        name="Llama-3.3-70B Candidate",
        vendor="groq",
        model="llama-3.3-70b",
        workload_preset="chat",
        load_curve="constant",
        concurrency=5,
        duration_seconds=30,
        status="completed",
        total_requests=50,
        completed_requests=50,
        failed_requests=0,
        total_cost_usd=0.01,
        ttft_p50=100.0,
        ttft_p95=150.0,
        tps_decode=250.0,
        goodput_pct=98.0,
    )
    pdf_bytes = ReportExporter.generate_diff_pdf(run_a, run_b)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")


def test_generate_diff_pdf_three_runs():
    """Verify generate_diff_pdf produces a valid multi-model PDF comparing 3 benchmark runs."""
    run_a = BenchmarkRun(
        id="bmk_a",
        name="GPT-4o Baseline",
        vendor="openai",
        model="gpt-4o",
        workload_preset="chat",
        load_curve="constant",
        concurrency=5,
        duration_seconds=30,
        status="completed",
        total_requests=50,
        completed_requests=50,
        failed_requests=0,
        total_cost_usd=0.02,
        ttft_p50=200.0,
        ttft_p95=300.0,
        tps_decode=100.0,
        goodput_pct=92.0,
    )
    run_b = BenchmarkRun(
        id="bmk_b",
        name="Llama-3.3-70B Candidate",
        vendor="groq",
        model="llama-3.3-70b",
        workload_preset="chat",
        load_curve="constant",
        concurrency=5,
        duration_seconds=30,
        status="completed",
        total_requests=50,
        completed_requests=50,
        failed_requests=0,
        total_cost_usd=0.01,
        ttft_p50=100.0,
        ttft_p95=150.0,
        tps_decode=250.0,
        goodput_pct=98.0,
    )
    run_c = BenchmarkRun(
        id="bmk_c",
        name="Claude 3.5 Sonnet",
        vendor="anthropic",
        model="claude-3-5-sonnet",
        workload_preset="chat",
        load_curve="constant",
        concurrency=5,
        duration_seconds=30,
        status="completed",
        total_requests=50,
        completed_requests=50,
        failed_requests=0,
        total_cost_usd=0.03,
        ttft_p50=180.0,
        ttft_p95=240.0,
        tps_decode=130.0,
        goodput_pct=96.0,
    )
    pdf_bytes = ReportExporter.generate_diff_pdf(run_a, run_b, run_c)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

