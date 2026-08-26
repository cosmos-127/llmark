import pytest

from app.adapters.mock_adapter import MockVendorAdapter
from app.models.schemas import BenchmarkConfig, VendorType, WorkloadPreset


@pytest.mark.asyncio
async def test_mock_adapter_streaming():
    """Verify mock adapter emits chunks, timestamps, and final usage event."""
    adapter = MockVendorAdapter()
    config = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="gpt-4o",
        workload_preset=WorkloadPreset.CHAT,
        max_tokens=30,
    )

    events = []
    async for event in adapter.stream_completion(None, config, "Test prompt"):
        events.append(event)

    assert len(events) >= 5
    # Verify non-decreasing timestamps
    for i in range(len(events) - 1):
        assert events[i + 1].timestamp >= events[i].timestamp

    # Verify final usage event
    final_event = events[-1]
    assert final_event.is_final is True
    assert final_event.usage is not None
    assert final_event.usage["prompt_tokens"] > 0
    assert final_event.usage["completion_tokens"] > 0


@pytest.mark.asyncio
async def test_mock_adapter_reasoning():
    """Verify reasoning tokens are emitted for reasoning models."""
    adapter = MockVendorAdapter()
    config = BenchmarkConfig(
        vendor=VendorType.MOCK,
        model="deepseek-r1",
        workload_preset=WorkloadPreset.CHAT,
        max_tokens=30,
    )

    events = []
    async for event in adapter.stream_completion(None, config, "Complex reasoning problem"):
        events.append(event)

    reasoning_events = [e for e in events if e.reasoning is not None]
    assert len(reasoning_events) > 0
