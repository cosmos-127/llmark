import asyncio
import random
import time
from typing import AsyncIterator, Optional

from app.adapters.base import VendorAdapter
from app.models.schemas import BenchmarkConfig, TokenEvent, VendorCredential, WorkloadPreset

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
        preset_val = getattr(config.workload_preset, "value", str(config.workload_preset))
        is_probe_mode = preset_val in ("rate_limit_probe", WorkloadPreset.RATE_LIMIT_PROBE.value)
        if is_probe_mode:
            # Simulate micro-prefill latency (10-30ms)
            await asyncio.sleep(random.uniform(0.01, 0.03))
            # If high concurrency in probe mode, trigger simulated HTTP 429 rate limit errors
            if config.concurrency >= 10:
                throttle_prob = 0.40 if config.concurrency >= 15 else 0.20
                if random.random() < throttle_prob:
                    await asyncio.sleep(0.02)
                    raise Exception("429 Too Many Requests: RPM/TPM quota threshold breached. Retry-After: 2.0s")

            # Micro-call output (1-2 tokens)
            t_now = time.perf_counter()
            yield TokenEvent(
                token="pong",
                timestamp=t_now,
            )
            yield TokenEvent(
                token="",
                timestamp=time.perf_counter(),
                usage={"prompt_tokens": 5, "completion_tokens": 1, "total_tokens": 6},
                is_final=True,
            )
            return

        # 2. Simulate TTFT (Prefill delay: 80ms - 220ms based on prompt length, with prefix cache reduction if applicable)
        is_kv_cached = preset_val in ("kv_cache_reuse", WorkloadPreset.KV_CACHE_REUSE.value) and not config.cache_bust
        if is_kv_cached:
            # 65% faster TTFT due to warm KV prefix cache hit
            base_ttft = 0.025 + (len(prompt) / 200000.0)
        else:
            base_ttft = 0.08 + (len(prompt) / 50000.0)

        ttft_jitter = random.uniform(-0.015, 0.035)
        simulated_ttft = max(0.02, base_ttft + ttft_jitter)
        await asyncio.sleep(simulated_ttft)

        is_reasoning_mode = (
            preset_val in ("reasoning_cot", WorkloadPreset.REASONING_COT.value)
            or any(r in config.model.lower() for r in ["r1", "o1", "o3", "reasoning"])
        )
        is_json_mode = preset_val in ("structured_json", "json_schema", WorkloadPreset.STRUCTURED_JSON.value, WorkloadPreset.JSON_SCHEMA.value) or config.json_schema
        is_tool_mode = preset_val in ("agentic_tool_calling", "tool_calling", WorkloadPreset.AGENTIC_TOOL_CALLING.value)
        is_code_mode = preset_val in ("code_generation", "code", WorkloadPreset.CODE_GENERATION.value)
        is_prefill_mode = preset_val in ("prefill_ttft", WorkloadPreset.PREFILL_TTFT.value)
        is_long_mode = preset_val in ("long_context_retrieval", "long_context", WorkloadPreset.LONG_CONTEXT_RETRIEVAL.value)
        is_summarize_mode = preset_val in ("summarization_distill", "summarization", WorkloadPreset.SUMMARIZATION_DISTILL.value)
        is_fewshot_mode = preset_val in ("fewshot_classification", WorkloadPreset.FEWSHOT_CLASSIFICATION.value)
        is_vision_mode = preset_val in ("multimodal_vision", "vision", WorkloadPreset.MULTIMODAL_VISION.value, WorkloadPreset.VISION.value)
        is_multiturn_mode = preset_val in ("multiturn_agentic", WorkloadPreset.MULTITURN_AGENTIC.value)
        is_cache_mode = preset_val in ("kv_cache_reuse", WorkloadPreset.KV_CACHE_REUSE.value)

        generated_tokens = 0
        prompt_tokens = max(10, int(len(prompt.split()) * 1.3))

        # 3. Simulate Thinking Phase (if reasoning mode)
        if is_reasoning_mode:
            for word in MOCK_THINKING_WORDS:
                t_now = time.perf_counter()
                yield TokenEvent(
                    token="",
                    reasoning=f"{word} ",
                    timestamp=t_now,
                )
                generated_tokens += 1
                await asyncio.sleep(random.uniform(0.015, 0.035))

        # 4. Stream Tokens According to Workload Profile
        if is_fewshot_mode:
            classification_chunks = ['{"intent":', ' "billing_dispute",', ' "confidence":', ' 0.99}']
            for chunk in classification_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.008, 0.018))
        elif is_tool_mode:
            tool_chunks = [
                '{"name":', ' "calculate_p95_metric",', ' "arguments":', ' {"timeseries_id":', ' "cluster-us-east-1",', ' "window_seconds":', ' 300}}'
            ]
            for chunk in tool_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.015, 0.03))
        elif is_json_mode:
            json_chunks = ['{"service":', ' "llmark",', ' "status":', ' "healthy",', ' "latency_ms":', ' 38.4,', ' "goodput":', ' 99.8}']
            for chunk in json_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.015, 0.03))
        elif is_prefill_mode:
            # Single token response for pure prefill TTFT isolation
            t_now = time.perf_counter()
            generated_tokens += 1
            yield TokenEvent(
                token="OK",
                timestamp=t_now,
            )
        elif is_vision_mode:
            vision_chunks = [
                "Optical Character Recognition Summary:\n",
                "• 8 Active GPU nodes detected\n",
                "• NVLink saturation: 42%\n",
                "• Bottleneck: Cross-rack InfiniBand link #3 at 94% capacity."
            ]
            for chunk in vision_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.015, 0.028))
        elif is_multiturn_mode:
            turn_chunks = [
                "To minimize ITL jitter with block size 16:\n",
                "1. Bind CUDA execution streams to specific NUMA sockets\n",
                "2. Enable continuous batching with dynamic KV eviction\n",
                "3. Use FP8 KV cache quantization to reduce memory bandwidth stalls."
            ]
            for chunk in turn_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.014, 0.026))
        elif is_cache_mode:
            cache_chunks = [
                "The metric that directly captures decode streaming smoothness is ",
                "Inter-Token Latency (ITL / TPOT), ",
                "measured between consecutive token emissions."
            ]
            for chunk in cache_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.012, 0.022))
        elif is_long_mode:
            long_chunks = ["SECRET_AUTHENTICATION_TOKEN", " = ", "'LLMARK_ALPHA_9942_PASSKEY'.", " Cache", " hit", " rate", " is", " 98.2%."]
            for chunk in long_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.015, 0.025))
        elif is_summarize_mode:
            summary_chunks = [
                "• Q2 volume: 4.2B tokens\n",
                "• P95 TTFT improved 34% via speculative decoding\n",
                "• ITL jitter dropped to 18ms\n",
                "• Bottleneck: HTTP 429 quota spikes during surge\n",
                "• Cost: -22% per 1M tokens with FP8 quantization."
            ]
            for chunk in summary_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.015, 0.03))
        elif is_code_mode:
            code_chunks = [
                "import asyncio\n", "from typing import Optional\n", "class TokenBucketLimiter:\n",
                "    def __init__(self, rate: float, burst: int):\n", "        self.rate = rate\n",
                "        self.burst = burst\n", "        self.tokens = burst\n"
            ]
            for chunk in code_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.015, 0.025))
        else:
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

        # 5. Final Usage Event
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

