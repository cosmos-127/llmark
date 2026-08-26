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

        # 2. Simulate TTFT (Prefill delay: based on prompt length, with prefix cache reduction if applicable)
        is_kv_cached = (
            preset_val in ("kv_cache_reuse", WorkloadPreset.KV_CACHE_REUSE.value)
            and not config.cache_bust
        )
        if is_kv_cached:
            # 65% faster TTFT due to warm KV prefix cache hit
            base_ttft = 0.022 + (len(prompt) / 250000.0)
        else:
            base_ttft = 0.065 + (len(prompt) / 45000.0)

        # Realistic queueing delay + concurrency pressure + load jitter
        concurrency_load_factor = 1.0 + (max(1, config.concurrency) - 1) * 0.028
        is_queue_stall = random.random() < 0.10
        stall_delay = random.uniform(0.02, 0.06) if is_queue_stall else 0.0
        ttft_jitter = random.gauss(0.0, 0.015) + stall_delay
        simulated_ttft = max(0.018, (base_ttft * concurrency_load_factor) + ttft_jitter)
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
            thinking_pool = [
                "Deconstructing", "prompt", "parameters", "and", "identifying", "computational",
                "constraints...", "Verifying", "mathematical", "invariants", "across", "tensor",
                "dimensions...", "Analyzing", "edge-case", "boundary", "conditions...",
                "Synthesizing", "optimal", "execution", "pathway", "for", "final", "output."
            ]
            think_count = random.randint(10, 18)
            selected_thinking = (thinking_pool * 2)[:think_count]
            for word in selected_thinking:
                t_now = time.perf_counter()
                yield TokenEvent(
                    token="",
                    reasoning=f"{word} ",
                    timestamp=t_now,
                )
                generated_tokens += 1
                await asyncio.sleep(random.uniform(0.008, 0.018))

        # 4. Stream Tokens According to Workload Profile
        if is_fewshot_mode:
            classification_tokens = [
                '{"category":', '"incident_response",', '"severity":', '"SEV-1",',
                '"tier":', '"tier_1_mission_critical",', '"requires_human_pager":', 'true,',
                '"target_cluster":', '"k8s-gpu-prod-04",', '"confidence":', f"{random.uniform(0.95, 0.99):.3f}",
                '"recommended_action":', '"scale_worker_pool"}',
            ]
            for tok in classification_tokens:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(token=f"{tok} ", timestamp=t_now)
                await asyncio.sleep(random.uniform(0.006, 0.014))

        elif is_tool_mode:
            tool_tokens = [
                '{"name":', '"trigger_remediation_playbook",', '"arguments":', '{',
                '"playbook_id":', f'"PB-AUTOSCALE-KV-0{random.randint(1, 9)}",',
                '"cluster_id":', '"k8s-gpu-cluster-04",',
                '"target_service":', '"inference-gateway-prod",',
                '"action":', '"scale_replicas",',
                '"parameters":', '{', '"replica_delta":', f"{random.randint(2, 6)},",
                '"evict_stale_kv":', 'true,', '"warmup_models":', '["gpt-4o", "llama-70b"]',
                '}}}',
            ]
            for tok in tool_tokens:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(token=f"{tok} ", timestamp=t_now)
                await asyncio.sleep(random.uniform(0.007, 0.015))

        elif is_json_mode:
            json_text = (
                f'{{"timestamp": "2026-08-26T14:30:00Z", "cluster_id": "k8s-gpu-us-east-1", '
                f'"status": "healthy", "nodes": [{{"node_id": "nvme-gpu-{random.randint(1, 8):02d}", '
                f'"vram_allocated_pct": {random.uniform(70.0, 88.0):.1f}, "active_streams": {random.randint(16, 48)}, '
                f'"temperature_celsius": {random.uniform(54.0, 62.0):.1f}}}], '
                f'"aggregated_metrics": {{"total_tps": {random.uniform(1600.0, 2100.0):.1f}, '
                f'"p95_ttft_ms": {random.uniform(55.0, 85.0):.1f}, "goodput_pct": {random.uniform(97.0, 99.8):.1f}}}}}'
            )
            words = json_text.split(" ")
            for w in words:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(token=f"{w} ", timestamp=t_now)
                await asyncio.sleep(random.uniform(0.006, 0.014))

        elif is_prefill_mode:
            # Single token response for pure prefill TTFT isolation
            t_now = time.perf_counter()
            generated_tokens += 1
            yield TokenEvent(
                token="READY",
                timestamp=t_now,
            )

        elif is_code_mode:
            code_lines = [
                "class AdaptiveRateLimiter:\n",
                "    def __init__(self, capacity: float, refill_rate: float, max_rpm: int):\n",
                "        self.capacity = capacity\n",
                "        self.refill_rate = refill_rate\n",
                "        self.max_rpm = max_rpm\n",
                "        self.tokens = capacity\n",
                "        self.last_update = time.monotonic()\n\n",
                "    async def acquire(self, tokens: float = 1.0) -> bool:\n",
                "        now = time.monotonic()\n",
                "        elapsed = now - self.last_update\n",
                "        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)\n",
                "        self.last_update = now\n",
                "        if self.tokens >= tokens:\n",
                "            self.tokens -= tokens\n",
                "            return True\n",
                "        return False\n",
            ]
            for line in code_lines:
                words = line.split(" ")
                for w in words:
                    t_now = time.perf_counter()
                    generated_tokens += 1
                    yield TokenEvent(token=f"{w} " if not w.endswith("\n") else w, timestamp=t_now)
                    await asyncio.sleep(random.uniform(0.007, 0.016))

        elif is_summarize_mode:
            summary_sentences = [
                "Executive Architecture Briefing:\n",
                f"1. Scale: {random.randint(45, 60)}B annualized tokens (+120x YoY growth) across global regions.\n",
                f"2. Latency: P95 TTFT dropped to {random.randint(65, 85)}ms; ITL jitter stabilized at {random.uniform(14.0, 18.0):.1f}ms.\n",
                f"3. Efficiency: Prefix caching yielded {random.uniform(2.8, 3.8):.1f}x speedup; VRAM utilization optimized to {random.uniform(78.0, 86.0):.1f}%.\n",
                "4. Reliability: Zero HTTP 429 rate limit outages with proactive token-bucket circuit breaking.\n",
            ]
            for s in summary_sentences:
                words = s.split(" ")
                for w in words:
                    t_now = time.perf_counter()
                    generated_tokens += 1
                    yield TokenEvent(token=f"{w} " if not w.endswith("\n") else w, timestamp=t_now)
                    await asyncio.sleep(random.uniform(0.007, 0.016))

        elif is_vision_mode:
            vision_sentences = [
                "1. Primary Bottleneck: Node Group B (nvme-gpu-09..16) VRAM saturation (98.6%) and 100Gbps InfiniBand link at 96.4% utilization.\n",
                "2. Degraded Group Telemetry: 98.6% VRAM allocation, 28 tok/s decode throughput (throttled).\n",
                "3. Saturated Interconnect: Alpha-to-Ceph 100 Gbps InfiniBand link (96.4% saturation alert).\n",
                "4. Remediation: Trigger stale KV cache eviction on Group B and shift 20% traffic to Cluster Beta.\n",
            ]
            for s in vision_sentences:
                words = s.split(" ")
                for w in words:
                    t_now = time.perf_counter()
                    generated_tokens += 1
                    yield TokenEvent(token=f"{w} " if not w.endswith("\n") else w, timestamp=t_now)
                    await asyncio.sleep(random.uniform(0.007, 0.015))

        elif is_multiturn_mode:
            turn_sentences = [
                "Synchronizing physical KV cache blocks across WAN (us-east-1 <-> us-west-2, ~68ms RTT) introduces severe network bandwidth overhead: ",
                "at 128 bytes/token/layer across 80 layers, a 4k context requires transferring ~40MB of binary tensors per session. ",
                "In contrast, local chunked prefill with prefix caching on H100 GPUs processes 4k tokens in < 15ms. ",
                "Therefore, cross-region state should replicate session tokens / prompt text rather than physical KV cache blocks, ",
                "relying on local prefix caching for acceleration.\n",
            ]
            for s in turn_sentences:
                words = s.split(" ")
                for w in words:
                    t_now = time.perf_counter()
                    generated_tokens += 1
                    yield TokenEvent(token=f"{w} " if not w.endswith("\n") else w, timestamp=t_now)
                    await asyncio.sleep(random.uniform(0.007, 0.015))

        elif is_cache_mode:
            cache_sentences = [
                "1. Inter-Token Latency (ITL / TPOT) directly captures decode streaming smoothness.\n",
                "2. Radix Trees index and match shared prefix memory blocks in modern serving engines.\n",
                "3. Formula: Prefill_tps = N_prompt_tokens / (TTFT - T_network_edge).\n",
            ]
            for s in cache_sentences:
                words = s.split(" ")
                for w in words:
                    t_now = time.perf_counter()
                    generated_tokens += 1
                    yield TokenEvent(token=f"{w} " if not w.endswith("\n") else w, timestamp=t_now)
                    await asyncio.sleep(random.uniform(0.007, 0.015))

        elif is_long_mode:
            long_sentences = [
                "1. PRIMARY_SECURITY_CERTIFICATE_THUMBPRINT: SHA256:4f8a9e21c3b7890a5d6e7f81\n",
                "2. OPTIMAL_KV_BLOCK_SIZE_BYTES: 65536\n",
                "3. GLOBAL_DISASTER_RECOVERY_OVERRIDE: PASSKEY-OMEGA-7719-ACTIVATED\n",
                "4. Peak Memory Saturation: 94.8% across GPU cluster node pool.\n",
            ]
            for s in long_sentences:
                words = s.split(" ")
                for w in words:
                    t_now = time.perf_counter()
                    generated_tokens += 1
                    yield TokenEvent(token=f"{w} " if not w.endswith("\n") else w, timestamp=t_now)
                    await asyncio.sleep(random.uniform(0.007, 0.015))

        else:
            # Dynamic natural response length scaled to config.max_tokens
            target_token_count = max(18, min(config.max_tokens, random.randint(28, 55)))
            words_cycle = (MOCK_WORDS * 6)[:target_token_count]

            for word in words_cycle:
                t_now = time.perf_counter()
                generated_tokens += 1
                yield TokenEvent(
                    token=f"{word} ",
                    timestamp=t_now,
                )

                # Realistic inter-token gap (8ms - 16ms, with 3% chance of a 45ms batch/network jitter spike)
                is_jitter_spike = random.random() < 0.03
                inter_token_delay = (
                    random.uniform(0.035, 0.055) if is_jitter_spike else random.uniform(0.008, 0.016)
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
