from unittest.mock import AsyncMock, MagicMock
import pytest
from app.adapters.anthropic_adapter import AnthropicAdapter
from app.models.schemas import BenchmarkConfig, VendorCredential, VendorType


class DummyAnthropicUsage:
    def __init__(self, input_tokens, output_tokens):
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens


class DummyFinalMessage:
    def __init__(self, input_tokens, output_tokens):
        self.usage = DummyAnthropicUsage(input_tokens, output_tokens)


class MockAnthropicStreamContext:
    def __init__(self):
        self.text_stream = self._text_generator()

    async def _text_generator(self):
        yield "Claude "
        yield "is "
        yield "fast."

    async def get_final_message(self):
        return DummyFinalMessage(12, 4)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


@pytest.mark.asyncio
async def test_anthropic_adapter_streaming(mocker):
    """Verify AnthropicAdapter parses text stream and final message usage stats."""
    adapter = AnthropicAdapter()
    config = BenchmarkConfig(
        vendor=VendorType.ANTHROPIC,
        model="claude-3-5-sonnet-20241022",
        max_tokens=50,
    )
    cred = VendorCredential(api_key="sk-ant-test-key-12345678901234567890")

    mock_client = MagicMock()
    mock_client.messages.stream = MagicMock(return_value=MockAnthropicStreamContext())
    mock_client.close = AsyncMock()

    mocker.patch("app.adapters.anthropic_adapter.AsyncAnthropic", return_value=mock_client)

    events = []
    async for event in adapter.stream_completion(cred, config, "Test prompt"):
        events.append(event)

    assert len(events) == 4
    assert events[0].token == "Claude "
    assert events[1].token == "is "
    assert events[2].token == "fast."
    assert events[3].is_final is True
    assert events[3].usage["total_tokens"] == 16
