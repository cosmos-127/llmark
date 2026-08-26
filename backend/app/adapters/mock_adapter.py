import asyncio
import random
import time
from collections.abc import AsyncIterator

from app.adapters.base import VendorAdapter
from app.models.schemas import BenchmarkConfig, TokenEvent, VendorCredential, WorkloadPreset

MOCK_WORDS = [
    "LLMark",
    "delivers",
    "ultra-fast",
    "microsecond",
    "precision",
    "for",
    "evaluating",
    "large",
    "language",
    "model",
    "streaming",
    "endpoints",
    "under",
    "realistic",
    "production",
    "traffic",
    "loads.",
    "Comparing",
    "TTFT,",
    "ITL,",
    "TPOT,",
    "and",
    "Goodput",
    "across",
    "OpenAI,",
    "Anthropic,",
    "Vertex,",
    "Bedrock,",
    "and",
    "vLLM",
    "gives",
    "engineering",
    "teams",
    "unmatched",
    "visibility",
    "into",
    "tail",
    "latency.",
]

MOCK_THINKING_WORDS = [
    "Analyzing",
    "input",
    "query",
    "parameters...",
    "Calculating",
    "optimal",
    "latency",
    "pathways...",
    "Synthesizing",
    "comparative",
    "metrics...",
]


class MockVendorAdapter(VendorAdapter):
    """Simulates realistic streaming inference for local development and testing."""

    async def stream_completion(
        self,
        credential: VendorCredential | None,
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
                    raise Exception(
                        "429 Too Many Requests: RPM/TPM quota threshold breached. Retry-After: 2.0s"
                    )

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
        is_kv_cached = (
            preset_val in ("kv_cache_reuse", WorkloadPreset.KV_CACHE_REUSE.value)
            and not config.cache_bust
        )
        if is_kv_cached:
            # 65% faster TTFT due to warm KV prefix cache hit
            base_ttft = 0.025 + (len(prompt) / 200000.0)
        else:
            base_ttft = 0.08 + (len(prompt) / 50000.0)

        # Realistic queueing delay + concurrency pressure + load jitter
        concurrency_load_factor = 1.0 + (max(1, config.concurrency) - 1) * 0.035
        is_queue_stall = random.random() < 0.12
        stall_delay = random.uniform(0.03, 0.09) if is_queue_stall else 0.0
        ttft_jitter = random.uniform(-0.025, 0.035) + stall_delay
        simulated_ttft = max(0.02, (base_ttft * concurrency_load_factor) + ttft_jitter)
        await asyncio.sleep(simulated_ttft)

        is_reasoning_mode = preset_val in (
            "reasoning_cot",
            WorkloadPreset.REASONING_COT.value,
        ) or any(r in config.model.lower() for r in ["r1", "o1", "o3", "reasoning"])
        is_json_mode = (
            preset_val
            in (
                "structured_json",
                "json_schema",
                WorkloadPreset.STRUCTURED_JSON.value,
                WorkloadPreset.JSON_SCHEMA.value,
            )
            or config.json_schema
        )
        is_tool_mode = preset_val in (
            "agentic_tool_calling",
            "tool_calling",
            WorkloadPreset.AGENTIC_TOOL_CALLING.value,
        )
        is_code_mode = preset_val in (
            "code_generation",
            "code",
            WorkloadPreset.CODE_GENERATION.value,
        )
        is_prefill_mode = preset_val in ("prefill_ttft", WorkloadPreset.PREFILL_TTFT.value)
        is_long_mode = preset_val in (
            "long_context_retrieval",
            "long_context",
            WorkloadPreset.LONG_CONTEXT_RETRIEVAL.value,
        )
        is_summarize_mode = preset_val in (
            "summarization_distill",
            "summarization",
            WorkloadPreset.SUMMARIZATION_DISTILL.value,
        )
        is_fewshot_mode = preset_val in (
            "fewshot_classification",
            WorkloadPreset.FEWSHOT_CLASSIFICATION.value,
        )
        is_vision_mode = preset_val in (
            "multimodal_vision",
            "vision",
            WorkloadPreset.MULTIMODAL_VISION.value,
            WorkloadPreset.VISION.value,
        )
        is_multiturn_mode = preset_val in (
            "multiturn_agentic",
            WorkloadPreset.MULTITURN_AGENTIC.value,
        )
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
            classification_chunks = [
                '{"category":',
                ' "rate_limit_breach",',
                ' "severity":',
                ' "SEV-1",',
                ' "tier":',
                ' "tier_1_mission_critical",',
                ' "requires_human_pager":',
                " true,",
                ' "confidence":',
                " 0.99}",
            ]
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
                '{"name":',
                ' "trigger_remediation_playbook",',
                ' "arguments":',
                " {",
                '"playbook_id":',
                ' "PB-AUTOSCALE-KV-04",',
                ' "cluster_id":',
                ' "k8s-gpu-cluster-04",',
                ' "target_service":',
                ' "inference-gateway-prod",',
                ' "action":',
                ' "scale_replicas",',
                ' "parameters":',
                ' {"replica_delta":',
                " 4,",
                ' "evict_stale_kv":',
                " true}}}",
            ]
            for chunk in tool_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.012, 0.024))
        elif is_json_mode:
            json_chunks = [
                '{"timestamp":',
                ' "2026-08-26T14:30:00Z",',
                ' "cluster_id":',
                ' "k8s-gpu-us-east-1",',
                ' "region":',
                ' "us-east-1",',
                ' "status":',
                ' "healthy",',
                ' "nodes":',
                ' [{"node_id":',
                ' "nvme-gpu-01",',
                ' "gpu_type":',
                ' "H100-SXM5-80GB",',
                ' "vram_allocated_pct":',
                " 74.5,",
                ' "active_streams":',
                " 32,",
                ' "temperature_celsius":',
                " 58.2}],",
                ' "aggregated_metrics":',
                ' {"total_tps":',
                " 1840.5,",
                ' "p95_ttft_ms":',
                " 68.4,",
                ' "p99_ttft_ms":',
                " 112.0,",
                ' "mean_tpot_ms":',
                " 14.2,",
                ' "cache_hit_pct":',
                " 88.5,",
                ' "goodput_pct":',
                " 99.4},",
                ' "active_alerts":',
                ' [{"alert_id":',
                ' "ALT-1049",',
                ' "severity":',
                ' "INFO",',
                ' "summary":',
                ' "Prefix cache warm"}]}',
            ]
            for chunk in json_chunks:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=chunk,
                    timestamp=t_now,
                )
                await asyncio.sleep(random.uniform(0.010, 0.022))
        elif is_prefill_mode:
            # Single token response for pure prefill TTFT isolation
            t_now = time.perf_counter()
            generated_tokens += 1
            yield TokenEvent(
                token="READY",
                timestamp=t_now,
            )
        elif is_vision_mode:
            vision_chunks = [
                "1. Primary Bottleneck: Node Group B (nvme-gpu-09..16) VRAM saturation (98.6%) and 100Gbps InfiniBand link at 96.4% utilization.\n",
                "2. Degraded Group Telemetry: 98.6% VRAM allocation, 28 tok/s decode throughput (throttled).\n",
                "3. Saturated Interconnect: Alpha-to-Ceph 100 Gbps InfiniBand link (96.4% saturation alert).\n",
                "4. Remediation: Trigger stale KV cache eviction on Group B and shift 20% traffic to Cluster Beta.",
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
                "Synchronizing physical KV cache blocks across WAN (us-east-1 <-> us-west-2, ~68ms RTT) introduces severe network bandwidth overhead: ",
                "at 128 bytes/token/layer across 80 layers, a 4k context requires transferring ~40MB of binary tensors per session. ",
                "In contrast, local chunked prefill with prefix caching on H100 GPUs processes 4k tokens in < 15ms. ",
                "Therefore, cross-region state should replicate session tokens / prompt text rather than physical KV cache blocks, ",
                "relying on local prefix caching for acceleration.",
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
                "1. Inter-Token Latency (ITL / TPOT) directly captures decode streaming smoothness.\n",
                "2. Radix Trees index and match shared prefix memory blocks in modern serving engines.\n",
                "3. Formula: Prefill_tps = N_prompt_tokens / (TTFT - T_network_edge).",
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
            long_chunks = [
                "1. PRIMARY_SECURITY_CERTIFICATE_THUMBPRINT: SHA256:4f8a9e21c3b7890a5d6e7f81\n",
                "2. OPTIMAL_KV_BLOCK_SIZE_BYTES: 65536\n",
                "3. GLOBAL_DISASTER_RECOVERY_OVERRIDE: PASSKEY-OMEGA-7719-ACTIVATED\n",
                "4. Peak Memory Saturation: 94.8% across GPU cluster node pool.",
            ]
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
                "Executive Briefing:\n",
                "1. Scalability: 54B annualized tokens (+120x growth) across 4 global regions, led by Chat (38%) and Enterprise RAG (32%).\n",
                "2. Latency: P95 TTFT dropped 67.5% to 78ms; ITL jitter stabilized to 16.5ms via chunked prefill & FP8 GEMM kernels.\n",
                "3. FinOps: Blended input cost down 42% ($1.04/1M), output cost down 36% ($3.96/1M), VRAM utilization at 84.5% ($1.2M saved in circuit breaker protections).\n",
                "4. Vulnerabilities & Roadmap: Outages triggered by 429 retry storms and KV leaks; 12-month focus on disaggregated prefill-decode and FP4 draft models.",
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
                "class AdaptiveSlidingWindowRateLimiter(AbstractRateLimiter):\n",
                "    def __init__(self, capacity: float, refill_rate: float, max_rpm: int):\n",
                "        self.capacity = capacity\n",
                "        self.refill_rate = refill_rate\n",
                "        self.max_rpm = max_rpm\n",
                "        self.clients: Dict[str, ClientBucketState] = {}\n",
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
                inter_token_delay = (
                    random.uniform(0.06, 0.09) if is_jitter_spike else random.uniform(0.015, 0.028)
                )
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
        credential: VendorCredential | None,
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
