import asyncio
import time
import uuid
from typing import AsyncGenerator, Dict, List, Optional, Set
import structlog

from app.adapters.registry import AdapterRegistry
from app.core.cost_guard import CostGuard, PRESET_TOKEN_PROFILES
from app.core.statistics_engine import StatisticsEngine
from app.core.waterfall_collector import WaterfallCollector
from app.db.session import async_session_factory
from app.models.db.models import BenchmarkRun
from app.models.schemas import (
    BenchmarkConfig,
    MetricsSnapshot,
    SingleRequestMetric,
    TestMode,
    WaterfallTiming,
    WorkloadPreset,
)


logger = structlog.get_logger()

# Pre-defined prompt templates for presets
PROMPT_PRESET_TEXT = {
    WorkloadPreset.CHAT: "Explain the architectural difference between REST and Server-Sent Events in 2 paragraphs.",
    WorkloadPreset.RAG: (
        "Context: Kubernetes is an open-source container orchestration system for automating software deployment, "
        "scaling, and management. Pods are the smallest deployable units of computing that you can create and manage. "
        "A Pod encapsulates one or more applications containers, storage resources, a unique network IP, and options "
        "that govern how the containers should run.\n\n"
        "Question: Explain how Pod lifecycle management interacts with container restart policies and node affinity."
    ),
    WorkloadPreset.CODE: "Write a high-performance, asynchronous Python connection pool manager using asyncio and httpx.",
    WorkloadPreset.LONG_CONTEXT: "Analyze the full operational history of distributed KV caching mechanisms across modern GPU clusters. " * 30,
    WorkloadPreset.VISION: "Describe the primary latency bottlenecks shown in the attached benchmark histogram.",
    WorkloadPreset.JSON_SCHEMA: "Return a structured JSON object containing user profiles, permissions, and session timeouts.",
    WorkloadPreset.CUSTOM: "Benchmark standard evaluation prompt.",
}


class CancellationToken:
    def __init__(self) -> None:
        self._cancelled: bool = False
        self._reason: str = ""

    @property
    def is_cancelled(self) -> bool:
        return self._cancelled

    @property
    def reason(self) -> str:
        return self._reason

    def cancel(self, reason: str = "User aborted") -> None:
        self._cancelled = True
        self._reason = reason


class BenchmarkExecution:
    def __init__(self, benchmark_id: str, config: BenchmarkConfig) -> None:
        self.benchmark_id = benchmark_id
        self.config = config
        self.cancel_token = CancellationToken()
        self.start_time: float = 0.0
        self.metrics: List[SingleRequestMetric] = []
        self.subscribers: Set[asyncio.Queue] = set()
        self.status: str = "initializing"
        self.waterfall_baseline: WaterfallTiming = WaterfallTiming()
        self.total_cost_usd: float = 0.0

    def add_subscriber(self, queue: asyncio.Queue) -> None:
        self.subscribers.add(queue)

    def remove_subscriber(self, queue: asyncio.Queue) -> None:
        self.subscribers.discard(queue)

    async def broadcast(self, event_type: str, data: Dict) -> None:
        payload = {"event": event_type, "data": data}
        for q in list(self.subscribers):
            try:
                q.put_nowait(payload)
            except Exception:
                pass


class BenchmarkOrchestrator:
    _active_runs: Dict[str, BenchmarkExecution] = {}

    @classmethod
    def get_run(cls, benchmark_id: str) -> Optional[BenchmarkExecution]:
        return cls._active_runs.get(benchmark_id)

    @classmethod
    def abort_run(cls, benchmark_id: str, reason: str = "User requested abort") -> bool:
        run = cls.get_run(benchmark_id)
        if run and not run.cancel_token.is_cancelled:
            run.cancel_token.cancel(reason)
            run.status = "aborted"
            logger.info("Benchmark run aborted", benchmark_id=benchmark_id, reason=reason)
            return True
        return False

    @classmethod
    async def start_benchmark(cls, config: BenchmarkConfig) -> str:
        benchmark_id = f"bmk_{uuid.uuid4().hex[:12]}"
        execution = BenchmarkExecution(benchmark_id, config)
        cls._active_runs[benchmark_id] = execution

        # Launch background execution task
        asyncio.create_task(cls._execute_benchmark_lifecycle(execution))
        return benchmark_id

    @classmethod
    async def _execute_benchmark_lifecycle(cls, execution: BenchmarkExecution) -> None:
        config = execution.config
        benchmark_id = execution.benchmark_id
        adapter = AdapterRegistry.get_adapter(config.vendor)

        logger.info("Starting benchmark execution", benchmark_id=benchmark_id, vendor=config.vendor.value, model=config.model)

        execution.status = "running"
        execution.start_time = time.perf_counter()

        # Determine prompt content
        base_prompt = config.custom_prompt or PROMPT_PRESET_TEXT.get(config.workload_preset, "Benchmark test prompt")

        # 1. Measure Network Waterfall Baseline (DNS, TCP, TLS)
        execution.waterfall_baseline = await WaterfallCollector.measure_connection_waterfall(config)
        await execution.broadcast("waterfall_baseline", execution.waterfall_baseline.model_dump())

        # 2. Warmup Phase (Discarded from metrics)
        for i in range(config.warmup_requests):
            if execution.cancel_token.is_cancelled:
                break
            try:
                async for _ in adapter.stream_completion(config.credential, config, base_prompt):
                    pass
            except Exception as e:
                logger.warning("Warmup request failed", error=str(e))

        # 3. Workload Concurrency Execution
        workers_count = config.concurrency
        worker_tasks = []
        request_counter = 0
        counter_lock = asyncio.Lock()

        async def worker_loop(worker_id: int):
            nonlocal request_counter
            while not execution.cancel_token.is_cancelled:
                # Mode-based termination check
                if config.test_mode == TestMode.REQUESTS and config.total_requests and config.total_requests > 0:
                    async with counter_lock:
                        if request_counter >= config.total_requests:
                            break
                        request_counter += 1
                else:
                    elapsed = time.perf_counter() - execution.start_time
                    if elapsed >= config.duration_seconds:
                        break

                # Prepare prompt (Cache-warm vs Cache-bust nonce)
                prompt = base_prompt
                if config.cache_bust:
                    prompt = f"{base_prompt} [Nonce: {uuid.uuid4().hex[:8]}]"

                # Check spend cap circuit breaker
                if CostGuard.is_spend_cap_exceeded(execution.total_cost_usd, config.hard_spend_cap):
                    execution.cancel_token.cancel("Hard spend cap exceeded")
                    execution.status = "budget_exceeded"
                    await execution.broadcast(
                        "budget_warning",
                        {"current_spend_usd": execution.total_cost_usd, "spend_cap_usd": config.hard_spend_cap},
                    )
                    break

                # Stream single request
                req_metric = await cls._stream_single_request(
                    adapter, config, prompt, execution.waterfall_baseline
                )
                execution.metrics.append(req_metric)
                execution.total_cost_usd += req_metric.cost_usd

                # Yield control
                await asyncio.sleep(0.01)


        # Periodic SSE Snapshot Broadcaster Task
        async def broadcast_loop():
            while execution.status == "running" and not execution.cancel_token.is_cancelled:
                elapsed = time.perf_counter() - execution.start_time
                snapshot = StatisticsEngine.calculate_snapshot(
                    benchmark_id=benchmark_id,
                    status=execution.status,
                    elapsed_seconds=elapsed,
                    total_requests=len(execution.metrics),
                    metrics=execution.metrics,
                    slo=config.slo,
                )
                await execution.broadcast("progress_snapshot", snapshot.model_dump())
                await asyncio.sleep(0.1)

        broadcast_task = asyncio.create_task(broadcast_loop())

        # Run concurrent workers
        try:
            async with asyncio.TaskGroup() as tg:
                for w in range(workers_count):
                    tg.create_task(worker_loop(w))
        except* Exception as eg:
            logger.error("Error during workload execution", errors=[str(e) for e in eg.exceptions])

        # Finalize
        broadcast_task.cancel()
        if execution.status == "running":
            execution.status = "completed"

        total_elapsed = time.perf_counter() - execution.start_time
        final_snapshot = StatisticsEngine.calculate_snapshot(
            benchmark_id=benchmark_id,
            status=execution.status,
            elapsed_seconds=total_elapsed,
            total_requests=len(execution.metrics),
            metrics=execution.metrics,
            slo=config.slo,
        )

        # Persist to database
        await cls._persist_run_to_db(execution, final_snapshot)

        # Broadcast completion
        await execution.broadcast("run_complete", final_snapshot.model_dump())
        logger.info("Benchmark finished", benchmark_id=benchmark_id, status=execution.status, completed=final_snapshot.completed_requests)


    @classmethod
    async def _stream_single_request(
        cls,
        adapter,
        config: BenchmarkConfig,
        prompt: str,
        baseline_waterfall: WaterfallTiming,
    ) -> SingleRequestMetric:
        req_id = f"req_{uuid.uuid4().hex[:8]}"
        t_request_sent = time.perf_counter()
        t_first_chunk: Optional[float] = None
        t_first_answer: Optional[float] = None
        t_prev_chunk: Optional[float] = None
        itl_deltas_ms: List[float] = []

        prompt_tokens = 0
        completion_tokens = 0

        try:
            async for event in adapter.stream_completion(config.credential, config, prompt):
                t_now = event.timestamp

                # Capture TTFT (First chunk of any kind)
                if t_first_chunk is None:
                    t_first_chunk = t_now
                    t_prev_chunk = t_now

                # Capture TTFA (First non-reasoning answer token)
                if event.token and t_first_answer is None:
                    t_first_answer = t_now

                # Record Inter-Token/Chunk Delays
                if t_prev_chunk is not None and t_now > t_prev_chunk:
                    delta_ms = (t_now - t_prev_chunk) * 1000.0
                    itl_deltas_ms.append(round(delta_ms, 3))
                    t_prev_chunk = t_now

                # Extract token usage if provided in final chunk
                if event.usage:
                    prompt_tokens = event.usage.get("prompt_tokens", 0)
                    completion_tokens = event.usage.get("completion_tokens", 0)

            t_last = time.perf_counter()
            ttft_ms = round((t_first_chunk - t_request_sent) * 1000.0, 2) if t_first_chunk else 0.0
            ttfa_ms = round((t_first_answer - t_request_sent) * 1000.0, 2) if t_first_answer else None
            e2e_ms = round((t_last - t_request_sent) * 1000.0, 2)

            if completion_tokens == 0:
                completion_tokens = max(1, len(itl_deltas_ms))
            if prompt_tokens == 0:
                prompt_tokens = max(10, int(len(prompt.split()) * 1.3))

            decode_duration_ms = max(0.001, (t_last - (t_first_chunk or t_last)) * 1000.0)
            tpot_ms = round(decode_duration_ms / max(1, completion_tokens), 3)

            cost_usd = CostGuard.calculate_request_cost(
                config.model,
                prompt_tokens,
                completion_tokens,
                config.custom_prompt_price_per_1m,
                config.custom_completion_price_per_1m,
            )

            waterfall = WaterfallTiming(
                dns_ms=baseline_waterfall.dns_ms,
                tcp_ms=baseline_waterfall.tcp_ms,
                tls_ms=baseline_waterfall.tls_ms,
                ttft_ms=ttft_ms,
                decode_ms=round(decode_duration_ms, 2),
                total_e2e_ms=e2e_ms,
            )

            metric = SingleRequestMetric(
                request_id=req_id,
                status_code=200,
                is_error=False,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                waterfall=waterfall,
                ttft_ms=ttft_ms,
                ttfa_ms=ttfa_ms,
                tpot_ms=tpot_ms,
                e2e_ms=e2e_ms,
                itl_deltas_ms=itl_deltas_ms,
                cost_usd=cost_usd,
            )
            metric.meets_slo = StatisticsEngine.evaluate_slo(metric, config.slo)
            return metric

        except Exception as e:
            t_last = time.perf_counter()
            return SingleRequestMetric(
                request_id=req_id,
                status_code=500,
                is_error=True,
                error_message=str(e),
                e2e_ms=round((t_last - t_request_sent) * 1000.0, 2),
                meets_slo=False,
            )

    @classmethod
    async def _persist_run_to_db(cls, execution: BenchmarkExecution, snapshot: MetricsSnapshot) -> None:
        """Persist aggregated benchmark metadata and metrics to SQLite."""
        config = execution.config
        try:
            async with async_session_factory() as session:
                run_db = BenchmarkRun(
                    id=execution.benchmark_id,
                    name=config.name,
                    vendor=config.vendor.value,
                    model=config.model,
                    workload_preset=config.workload_preset.value,
                    load_curve=config.load_curve.value,
                    concurrency=config.concurrency,
                    duration_seconds=config.duration_seconds,
                    status=execution.status,
                    total_requests=snapshot.total_requests,
                    completed_requests=snapshot.completed_requests,
                    failed_requests=snapshot.failed_requests,
                    total_prompt_tokens=sum(m.prompt_tokens for m in execution.metrics),
                    total_gen_tokens=sum(m.completion_tokens for m in execution.metrics),
                    total_cost_usd=snapshot.current_spend_usd,
                    ttft_p50=snapshot.ttft_p50,
                    ttft_p75=snapshot.ttft_p75,
                    ttft_p95=snapshot.ttft_p95,
                    ttft_p99=snapshot.ttft_p99,
                    ttfa_p50=snapshot.ttfa_p50,
                    ttfa_p95=snapshot.ttfa_p95,
                    itl_p50=snapshot.itl_p50,
                    itl_p75=snapshot.itl_p75,
                    itl_p95=snapshot.itl_p95,
                    itl_p99=snapshot.itl_p99,
                    max_itl=snapshot.max_itl,
                    tpot_mean=snapshot.tpot_mean,
                    tps_decode=snapshot.current_tps,
                    goodput_pct=snapshot.goodput_pct,
                    error_rate_pct=snapshot.error_rate_pct,
                    dns_p50=execution.waterfall_baseline.dns_ms,
                    tcp_p50=execution.waterfall_baseline.tcp_ms,
                    tls_p50=execution.waterfall_baseline.tls_ms,
                    config_snapshot=config.model_dump(exclude={"credential"}),
                )
                session.add(run_db)
                await session.commit()
        except Exception as e:
            logger.error("Failed to save benchmark run to DB", error=str(e))
