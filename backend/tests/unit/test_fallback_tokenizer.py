import pytest
from app.core.fallback_tokenizer import FallbackTokenizer


def test_count_tokens():
    """Verify accurate tiktoken token counting."""
    sample_text = "LLMark is the Postman for LLM endpoints."
    token_count = FallbackTokenizer.count_tokens(sample_text, "gpt-4o")
    assert token_count >= 5
    assert token_count <= 12


def test_empty_tokens():
    """Ensure 0 tokens for empty string."""
    assert FallbackTokenizer.count_tokens("", "gpt-4o") == 0


def test_normalize_chunk_itl():
    """Verify chunk delta is normalized by the number of tokens in the chunk."""
    # Chunk with ~3 tokens taking 60ms should normalize to ~20ms per token
    chunk_text = " fast performance metrics"
    raw_delta_ms = 60.0

    itl_normalized = FallbackTokenizer.normalize_chunk_itl(raw_delta_ms, chunk_text, "gpt-4o")
    assert itl_normalized > 0.0
    assert itl_normalized <= raw_delta_ms
