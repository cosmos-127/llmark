from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


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
        'FOLLOWUP_QUESTIONS: ["How to size VRAM?", "What is TPOT?", "How to measure ITL?"]'
    )
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", new_callable=AsyncMock
    ) as mock_create:
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


def test_clean_llm_markdown_and_latex_unit():
    """Verify backend Markdown & LaTeX sanitizer fixes common LLM generation issues."""
    from app.api.routes.expert import _clean_llm_markdown_and_latex

    # 1. Convert ```latex or ```math fences to $$ blocks
    input_fenced = (
        "Here is the formula:\n"
        "```latex\n"
        "\\text{TTFT} = \\frac{N}{\\text{Latency}}\n"
        "```\n"
    )
    cleaned = _clean_llm_markdown_and_latex(input_fenced)
    assert "$$\n\\text{TTFT} = \\frac{N}{\\text{Latency}}\n$$" in cleaned
    assert "```latex" not in cleaned

    # 2. Convert \[ ... \] display brackets to $$ ... $$
    input_brackets = "Formula:\n\\[\n\\text{Goodput} = \\text{RPS} \\times \\text{Yield}\n\\]"
    cleaned_brackets = _clean_llm_markdown_and_latex(input_brackets)
    assert "$$\n\n\\text{Goodput} = \\text{RPS} \\times \\text{Yield}\n\n$$" in cleaned_brackets
    assert "\\[" not in cleaned_brackets

    # 3. Convert \( ... \) inline brackets to $ ... $
    input_inline = "Where \\(\\lambda = 10\\) requests/sec."
    cleaned_inline = _clean_llm_markdown_and_latex(input_inline)
    assert "Where $\\lambda = 10$ requests/sec." == cleaned_inline

    # 4. Fix double-escaped commands like \\\\text -> \text
    input_escaped = "Metric: \\\\text{TPOT} \\le 30\\\\text{ms}"
    cleaned_escaped = _clean_llm_markdown_and_latex(input_escaped)
    assert "\\text{TPOT} \\le 30\\text{ms}" in cleaned_escaped


@pytest.mark.asyncio
async def test_expert_ask_with_latex_and_list_followups(async_client: AsyncClient):
    """Test asking expert when model returns LaTeX in ```math block and followups in bullet list."""
    from unittest.mock import MagicMock

    mock_choice = MagicMock()
    mock_choice.message.content = (
        "### 💡 In Simple Terms\n"
        "Prefill throughput measures how quickly initial tokens are processed.\n\n"
        "### 🔬 Key Mechanics\n"
        "```math\n"
        "\\text{Throughput} = \\frac{\\text{Tokens}}{\\Delta t}\n"
        "```\n\n"
        "### 🛠️ Benchmark Tip\n"
        "Use concurrency = 16 for saturation probing.\n\n"
        "FOLLOWUP_QUESTIONS:\n"
        "- What is the optimal batch size?\n"
        "- How to measure P99 latency?\n"
        "- When does queue saturation occur?"
    )
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch(
        "openai.resources.chat.completions.AsyncCompletions.create", new_callable=AsyncMock
    ) as mock_create:
        mock_create.return_value = mock_response
        response = await async_client.post(
            "/api/expert/ask",
            json={
                "query": "How is throughput calculated in prefill?",
                "groq_api_key": "gsk_test_mock_key_987654",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["source"] == "groq_llm"
        # Verify ```math fence was converted to $$ block
        assert "$$\n\\text{Throughput} = \\frac{\\text{Tokens}}{\\Delta t}\n$$" in data["answer"]
        assert "```math" not in data["answer"]
        # Verify FOLLOWUP_QUESTIONS was stripped from answer text
        assert "FOLLOWUP_QUESTIONS:" not in data["answer"]
        # Verify followups were extracted from bullet list
        assert len(data["suggested_followups"]) == 3
        assert "What is the optimal batch size?" in data["suggested_followups"]
        assert "When does queue saturation occur?" in data["suggested_followups"]

