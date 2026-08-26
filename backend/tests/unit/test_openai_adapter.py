from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from app.adapters.openai_adapter import OpenAICompatAdapter
from app.models.schemas import BenchmarkConfig, VendorCredential, VendorType


class DummyChoiceDelta:
    def __init__(self, content="", reasoning_content=None):
        self.content = content
        self.reasoning_content = reasoning_content


class DummyChoice:
    def __init__(self, delta):
        self.delta = delta


class DummyUsage:
    def __init__(self, prompt_tokens, completion_tokens, total_tokens):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = total_tokens


class DummyChunk:
    def __init__(self, content="", reasoning=None, usage=None):
        self.choices = [DummyChoice(DummyChoiceDelta(content, reasoning))] if content or reasoning else []
        self.usage = usage


async def mock_chat_stream(*args, **kwargs):
    yield DummyChunk(content="Hello", reasoning="Thinking about response")
    yield DummyChunk(content=" world!")
    yield DummyChunk(usage=DummyUsage(10, 5, 15))


@pytest.mark.asyncio
async def test_openai_adapter_streaming(mocker):
    """Verify OpenAICompatAdapter parses chunks, reasoning, and usage correctly."""
    adapter = OpenAICompatAdapter()
    config = BenchmarkConfig(
        vendor=VendorType.OPENAI,
        model="gpt-4o",
        max_tokens=50,
    )
    cred = VendorCredential(api_key="sk-test-key-12345678901234567890")

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=mock_chat_stream)
    mock_client.close = AsyncMock()

    mocker.patch("app.adapters.openai_adapter.AsyncOpenAI", return_value=mock_client)

    events = []
    async for event in adapter.stream_completion(cred, config, "Test prompt"):
        events.append(event)

    assert len(events) >= 2
    assert events[0].token == "Hello"
    assert events[0].reasoning == "Thinking about response"
    assert events[1].token == " world!"
    assert events[2].usage["total_tokens"] == 15


@pytest.mark.asyncio
async def test_openai_adapter_list_models(mocker):
    """Verify OpenAICompatAdapter lists models from endpoint."""
    adapter = OpenAICompatAdapter()
    cred = VendorCredential(api_key="sk-test-key", base_url="http://localhost:8000/v1")

    class DummyModel:
        def __init__(self, id):
            self.id = id

    class DummyModelList:
        def __init__(self, data):
            self.data = data

    mock_client = MagicMock()
    mock_client.models.list = AsyncMock(return_value=DummyModelList([
        DummyModel("meta-llama/llama-3.3-70b-instruct"),
        DummyModel("deepseek-ai/deepseek-r1"),
    ]))
    mock_client.close = AsyncMock()

    mocker.patch("app.adapters.openai_adapter.AsyncOpenAI", return_value=mock_client)

    models = await adapter.list_models(cred)
    assert len(models) == 2
    assert "deepseek-ai/deepseek-r1" in models
    assert "meta-llama/llama-3.3-70b-instruct" in models

