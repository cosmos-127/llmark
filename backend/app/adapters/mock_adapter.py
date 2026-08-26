import asyncio
import random
import time
from typing import AsyncIterator, Optional

from app.adapters.base import VendorAdapter
from app.models.schemas import BenchmarkConfig, TokenEvent, VendorCredential

MOCK_WORDS = [
    "LLMark", "delivers", "ultra-fast", "microsecond", "precision", "for", "evaluating",
    "large", "language", "model", "streaming", "endpoints", "under", "realistic",
    "production", "traffic", "loads.", "Comparing", "TTFT,", "ITL,", "TPOT,", "and",
    "Goodput", "across", "OpenAI,", "Anthropic,", "Vertex,", "Bedrock,", "and", "vLLM",
    "gives", "engineering", "teams", "unmatched", "visibility", "into", "tail", "latency."
]

MOCK_THINKING_WORDS = [
    "Analyzing", "input", "query", "parameters...", "Calculating", "optimal",
    "latency", "pathways...", "Synthesizing", "comparative", "metrics..."
]


class MockVendorAdapter(VendorAdapter):
    """Simulates realistic streaming inference for local development and testing."""

    async def stream_completion(
        self,
        credential: Optional[VendorCredential],
        config: BenchmarkConfig,
        prompt: str,
    ) -> AsyncIterator[TokenEvent]:
        # 1. Simulate TTFT (Prefill delay: 80ms - 220ms based on prompt length)
        base_ttft = 0.08 + (len(prompt) / 50000.0)
        ttft_jitter = random.uniform(-0.02, 0.05)
        simulated_ttft = max(0.04, base_ttft + ttft_jitter)
        await asyncio.sleep(simulated_ttft)

        is_reasoning_model = any(r in config.model.lower() for r in ["r1", "o1", "o3", "reasoning"])
        generated_tokens = 0
        prompt_tokens = max(10, int(len(prompt.split()) * 1.3))

        # 2. Simulate Thinking Phase (if reasoning model)
        if is_reasoning_model:
            for word in MOCK_THINKING_WORDS:
                t_now = time.perf_counter()
                yield TokenEvent(
                    token="",
                    reasoning=f"{word} ",
                    timestamp=t_now,
                )
                generated_tokens += 1
                await asyncio.sleep(random.uniform(0.015, 0.035))

        # 3. Stream Answer Content Tokens
        target_token_count = min(config.max_tokens, random.randint(30, 80))
        words_cycle = MOCK_WORDS * 5

        for i in range(min(target_token_count, len(words_cycle))):
            word = words_cycle[i]
            t_now = time.perf_counter()
            generated_tokens += 1
            yield TokenEvent(
                token=f"{word} ",
                timestamp=t_now,
            )

            # Realistic inter-token gap (15ms - 30ms, with 5% chance of a 70ms KV/network jitter spike)
            is_jitter_spike = random.random() < 0.05
            inter_token_delay = random.uniform(0.06, 0.09) if is_jitter_spike else random.uniform(0.015, 0.028)
            await asyncio.sleep(inter_token_delay)

        # 4. Final Usage Event
        t_final = time.perf_counter()
        yield TokenEvent(
            token="",
            timestamp=t_final,
            usage={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": generated_tokens,
                "total_tokens": prompt_tokens + generated_tokens,
            },
            is_final=True,
        )

    async def list_models(
        self,
        credential: Optional[VendorCredential],
    ) -> list[str]:
        """Return simulated models list for mock engine."""
        return [
            "gpt-4o",
            "gpt-4o-mini",
            "o3-mini",
            "o1",
            "claude-3-5-sonnet",
            "claude-3-5-haiku",
            "claude-3-opus",
            "deepseek-ai/deepseek-r1",
            "deepseek-ai/deepseek-v3",
            "meta-llama/llama-3.3-70b-instruct",
            "meta-llama/llama-3.1-8b-instruct",
            "qwen/qwen-2.5-72b-instruct",
        ]

