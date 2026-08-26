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
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")
