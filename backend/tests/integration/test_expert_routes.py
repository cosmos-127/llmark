import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_expert_status_endpoint(async_client: AsyncClient):
    """Test GET /api/expert/status."""
    response = await async_client.get("/api/expert/status")
    assert response.status_code == 200
    data = response.json()
    assert "has_groq_key" in data
    assert "model" in data
    assert "source" in data


@pytest.mark.asyncio
async def test_expert_ask_dedicated_qa(async_client: AsyncClient):
    """Test asking dedicated questions mapped accurately to expert knowledge."""
    questions = [
        "Why is TTFT critical for RAG vs. Chat?",
        "What is Goodput and why is it superior to Raw Throughput?",
        "How to find the saturation cliff of a cluster?",
        "How is KV cache memory calculated per stream?",
        "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
        "How do I optimize my benchmark parameters?",
    ]

    for q in questions:
        response = await async_client.post(
            "/api/expert/ask",
            json={"query": q},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["answer"]
        assert len(data["suggested_followups"]) > 0
        assert data["source"] in ("knowledge_engine", "groq_llm")


@pytest.mark.asyncio
async def test_expert_ask_with_groq_mock(async_client: AsyncClient):
    """Test asking expert with simulated Groq LLM response."""
    from unittest.mock import MagicMock
    mock_choice = MagicMock()
    mock_choice.message.content = (
        "### ⚡ Groq LPU Accelerated Answer\n\n"
        "Continuous batching with chunked prefill delivers optimal Goodput.\n\n"
        "FOLLOWUP_QUESTIONS: [\"How to size VRAM?\", \"What is TPOT?\", \"How to measure ITL?\"]"
    )
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("openai.resources.chat.completions.AsyncCompletions.create", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_response
        response = await async_client.post(
            "/api/expert/ask",
            json={
                "query": "Explain continuous batching in detail",
                "groq_api_key": "gsk_test_mock_key_123456",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["source"] == "groq_llm"
        assert "Groq LPU Accelerated Answer" in data["answer"]
        assert "How to size VRAM?" in data["suggested_followups"]


@pytest.mark.asyncio
async def test_expert_ask_custom_question_without_key(async_client: AsyncClient):
    """Test that custom questions without an active API key return a clear key_required notice rather than generic filler."""
    response = await async_client.post(
        "/api/expert/ask",
        json={
            "query": "What is the capital of Mars and how many servers are there in 2099?",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "key_required"
    assert "Live AI Response Unavailable" in data["answer"]
    assert len(data["suggested_followups"]) > 0

