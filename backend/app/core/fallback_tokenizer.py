import structlog
import tiktoken

logger = structlog.get_logger()


class FallbackTokenizer:
    """Fast local token counter and chunk-to-token normalizer."""

    _encoders: dict[str, tiktoken.Encoding] = {}

    @classmethod
    def get_encoder(cls, model_name: str = "gpt-4o") -> tiktoken.Encoding:
        """Get or initialize a cached tiktoken encoding."""
        encoding_name = (
            "o200k_base"
            if any(m in model_name.lower() for m in ["4o", "o1", "o3"])
            else "cl100k_base"
        )
        if encoding_name not in cls._encoders:
            try:
                cls._encoders[encoding_name] = tiktoken.get_encoding(encoding_name)
            except Exception:
                cls._encoders[encoding_name] = tiktoken.get_encoding("cl100k_base")
        return cls._encoders[encoding_name]

    @classmethod
    def count_tokens(cls, text: str, model_name: str = "gpt-4o") -> int:
        """Accurately count tokens in a string using tiktoken with character fallback."""
        if not text:
            return 0
        try:
            encoder = cls.get_encoder(model_name)
            return len(encoder.encode(text))
        except Exception as e:
            logger.debug("Tiktoken encoding failed, using character estimation", error=str(e))
            # Fast heuristic fallback: ~4 characters per token
            return max(1, int(len(text) / 3.8))

    @classmethod
    def normalize_chunk_itl(
        cls, chunk_delta_ms: float, chunk_text: str, model_name: str = "gpt-4o"
    ) -> float:
        """Normalize Inter-Chunk Latency (ICL) to true Inter-Token Latency (ITL) based on token count in chunk."""
        if chunk_delta_ms <= 0:
            return 0.0
        token_count = max(1, cls.count_tokens(chunk_text, model_name))
        return round(chunk_delta_ms / token_count, 3)
