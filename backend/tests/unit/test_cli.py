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
