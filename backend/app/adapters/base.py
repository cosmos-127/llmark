from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from app.models.schemas import BenchmarkConfig, TokenEvent, VendorCredential


class VendorAdapter(ABC):
    """Abstract Base Class for all LLM Vendor Streaming Adapters."""

    @abstractmethod
    async def stream_completion(
        self,
        credential: VendorCredential | None,
        config: BenchmarkConfig,
        prompt: str,
    ) -> AsyncIterator[TokenEvent]:
        """Stream token events with microsecond timestamps and usage stats.

        Yields:
            TokenEvent instances containing delta text, optional reasoning tokens,
            microsecond perf_counter timestamp, and token usage chunks.
        """
        ...

    async def list_models(
        self,
        credential: VendorCredential | None,
    ) -> list[str]:
        """Fetch all listed models available at this vendor/base URL."""
        return []
