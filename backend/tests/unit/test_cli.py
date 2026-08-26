import os
import pytest
from app.cli import load_config_from_file, run_headless_benchmark
from app.models.schemas import BenchmarkConfig, VendorType, WorkloadPreset


def test_load_config_from_file(tmp_path):
    """Verify loading BenchmarkConfig from YAML file."""
    yaml_content = """
name: "Test Canary"
vendor: "mock"
model: "gpt-4o"
workload_preset: "chat"
concurrency: 2
duration_seconds: 5
hard_spend_cap: 1.0
"""
    config_file = tmp_path / "test_config.yaml"
    config_file.write_text(yaml_content, encoding="utf-8")

    config = load_config_from_file(str(config_file))
    assert config.name == "Test Canary"
    assert config.vendor == VendorType.MOCK
    assert config.model == "gpt-4o"
    assert config.concurrency == 2
    assert config.duration_seconds == 5


@pytest.mark.asyncio
async def test_headless_cli_pass():
    """Verify headless CLI returns exit code 0 when Goodput threshold is met."""
    config = BenchmarkConfig(
        name="CLI Pass Test",
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.CHAT,
        concurrency=2,
        duration_seconds=2,
        warmup_requests=0,
    )

    exit_code = await run_headless_benchmark(config, fail_under_goodput=50.0)
    assert exit_code == 0


@pytest.mark.asyncio
async def test_headless_cli_fail_threshold():
    """Verify headless CLI returns exit code 1 when Goodput is below threshold."""
    config = BenchmarkConfig(
        name="CLI Fail Test",
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.CHAT,
        concurrency=2,
        duration_seconds=2,
        warmup_requests=0,
    )

    exit_code = await run_headless_benchmark(config, fail_under_goodput=101.0)
    assert exit_code == 1


def test_evaluate_assertions_unit():
    """Verify evaluate_assertions correctly assesses multiple metric conditions."""
    from app.cli import evaluate_assertions
    from app.models.db.models import BenchmarkRun

    run_record = BenchmarkRun(
        id="test_run",
        name="Test Run",
        vendor="openai",
        model="gpt-4o",
        ttft_p50=120.0,
        ttft_p95=350.0,
        itl_p95=25.0,
        tps_decode=65.0,
        goodput_pct=99.2,
        error_rate_pct=0.0,
        total_cost_usd=0.045,
    )

    passed, logs = evaluate_assertions(
        run_record,
        [
            "p95_ttft < 500",
            "goodput >= 95",
            "tps >= 50",
            "max_cost <= 0.10",
        ],
    )
    assert passed is True
    assert len(logs) == 4

    failed, fail_logs = evaluate_assertions(
        run_record,
        [
            "p95_ttft < 200",  # 350 < 200 is False
            "goodput >= 99.5", # 99.2 >= 99.5 is False
        ],
    )
    assert failed is False
    assert any("[FAIL]" in l for l in fail_logs)
