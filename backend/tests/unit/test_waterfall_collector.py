import pytest

from app.core.waterfall_collector import WaterfallCollector
from app.models.schemas import BenchmarkConfig, VendorType


@pytest.mark.asyncio
async def test_mock_waterfall_measurement():
    """Verify mock waterfall baseline returns expected values."""
    config = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
    )
    waterfall = await WaterfallCollector.measure_connection_waterfall(config)
    assert waterfall.dns_ms > 0.0
    assert waterfall.tcp_ms > 0.0
    assert waterfall.tls_ms > 0.0
    assert waterfall.total_e2e_ms > 0.0


@pytest.mark.asyncio
async def test_real_waterfall_fallback():
    """Verify WaterfallCollector gracefully returns fallback values if host is invalid."""
    config = BenchmarkConfig(
        vendor=VendorType.OPENAI_COMPATIBLE,
        model="custom-model",
    )
    waterfall = await WaterfallCollector.measure_connection_waterfall(config)
    assert waterfall.dns_ms > 0.0
    assert waterfall.tcp_ms > 0.0
    assert waterfall.tls_ms > 0.0
