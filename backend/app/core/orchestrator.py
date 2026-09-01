import asyncio
import json
import re
import time
import uuid

import numpy as np
import structlog

from app.adapters.registry import AdapterRegistry
from app.core.cost_guard import CostGuard
from app.core.prompt_presets import get_preset_prompt
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
        self.metrics: list[SingleRequestMetric] = []
        self.subscribers: set[asyncio.Queue] = set()
        self.status: str = "initializing"
        self.waterfall_baseline: WaterfallTiming = WaterfallTiming()
        self.total_cost_usd: float = 0.0

    def add_subscriber(self, queue: asyncio.Queue) -> None:
        self.subscribers.add(queue)

    def remove_subscriber(self, queue: asyncio.Queue) -> None:
        self.subscribers.discard(queue)

    async def broadcast(self, event_type: str, data: dict) -> None:
        payload = {"event": event_type, "data": data}
        for q in list(self.subscribers):
            try:
                q.put_nowait(payload)
            except Exception:
                pass


class BenchmarkOrchestrator:
    _active_runs: dict[str, BenchmarkExecution] = {}

    @classmethod
    def get_run(cls, benchmark_id: str) -> BenchmarkExecution | None:
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

        # Launch background execution task and retain a strong reference to prevent GC
        task = asyncio.create_task(cls._execute_benchmark_lifecycle(execution))
        execution._task = task  # type: ignore[attr-defined]
        return benchmark_id

    @classmethod
    async def _execute_benchmark_lifecycle(cls, execution: BenchmarkExecution) -> None:
        config = execution.config
        benchmark_id = execution.benchmark_id
        adapter = AdapterRegistry.get_adapter(config.vendor)

        logger.info(
            "Starting benchmark execution",
            benchmark_id=benchmark_id,
            vendor=config.vendor.value,
            model=config.model,
        )

        execution.status = "running"
        execution.start_time = time.perf_counter()

        try:
            # Determine prompt content from custom prompt or calibrated Workload Preset
            if config.custom_prompt and config.custom_prompt.strip():
                base_prompt = config.custom_prompt.strip()
            else:
                base_prompt = get_preset_prompt(config.workload_preset)

            # 1. Measure Network Waterfall Baseline (DNS, TCP, TLS)
            execution.waterfall_baseline = await WaterfallCollector.measure_connection_waterfall(
                config
            )
            await execution.broadcast(
                "waterfall_baseline", execution.waterfall_baseline.model_dump()
            )

            # 2. Warmup Phase (Discarded from metrics)
            for _ in range(config.warmup_requests):
                if execution.cancel_token.is_cancelled:
                    break
                try:
                    async for _ in adapter.stream_completion(
                        config.credential, config, base_prompt
                    ):
                        pass
                except Exception as e:
                    logger.warning("Warmup request failed", error=str(e))

            # Reset start timestamp to accurately benchmark from t=0.0s after warmup finishes
            execution.start_time = time.perf_counter()

            # 3. Workload Concurrency & Load Curve Setup
            is_knee_probe = config.load_curve == "saturation_knee" or (
                hasattr(config.load_curve, "value") and config.load_curve.value == "saturation_knee"
            )
            target_max_concurrency = max(1, config.concurrency)
            raw_stages = [1, 3, 8, 16, 25, 40, target_max_concurrency]
            stepped_stages = sorted(
                list(set([s for s in raw_stages if s <= target_max_concurrency]))
            )
            if not stepped_stages:
                stepped_stages = [target_max_concurrency]

            stage_duration = config.duration_seconds / max(1, len(stepped_stages))
            current_active_workers = stepped_stages[0] if is_knee_probe else target_max_concurrency
            saturation_knee_concurrency: int | None = None
            saturation_knee_detected: bool = False
            baseline_stage_ttft: float | None = None

            workers_count = target_max_concurrency
            request_counter = 0
            curve_val = getattr(config.load_curve, "value", str(config.load_curve))
            counter_lock = asyncio.Lock()

            async def worker_loop(worker_id: int):
                nonlocal request_counter
                while not execution.cancel_token.is_cancelled:
                    elapsed = time.perf_counter() - execution.start_time

                    # Load Curve Waveform Arrival Gating
                    if curve_val == "ramp_up":
                        progress = min(1.0, elapsed / max(0.1, config.duration_seconds))
                        current_limit = max(1, int(1 + progress * (target_max_concurrency - 1)))
                        if worker_id >= current_limit:
                            await asyncio.sleep(0.05)
                            continue
                    elif curve_val == "spike":
                        # Periodic surge waves: 4s baseline (25% workers), 2s burst (100% workers)
                        cycle_time = elapsed % 6.0
                        is_spike_active = cycle_time >= 4.0
                        spike_workers = (
                            target_max_concurrency
                            if is_spike_active
                            else max(1, int(target_max_concurrency * 0.25))
                        )
                        if worker_id >= spike_workers:
                            await asyncio.sleep(0.05)
                            continue
                    elif is_knee_probe:
                        if worker_id >= current_active_workers:
                            await asyncio.sleep(0.05)
                            continue
                    elif curve_val == "poisson":
                        # Stochastic Poisson inter-arrival jitter
                        if np.random.random() < 0.20:
                            await asyncio.sleep(float(np.random.exponential(0.08)))

                    # Mode-based termination check
                    if (
                        config.test_mode == TestMode.REQUESTS
                        and config.total_requests
                        and config.total_requests > 0
                    ):
                        async with counter_lock:
                            if request_counter >= config.total_requests:
                                break
                            request_counter += 1
                    else:
                        if elapsed >= config.duration_seconds:
                            break

                    # Cold vs Warm Prefix Cache Discovery
                    is_this_cold = False
                    preset_str = getattr(config.workload_preset, "value", str(config.workload_preset))
                    if (config.measure_cache_speedup or preset_str in ("kv_cache_reuse", "long_context_retrieval")):
                        async with counter_lock:
                            if request_counter <= 1:
                                is_this_cold = True

                    prompt = base_prompt
                    if config.cache_bust or is_this_cold:
                        prompt = f"{prompt} [Nonce: {uuid.uuid4().hex[:8]}]"

                    # Check spend cap circuit breaker
                    if CostGuard.is_spend_cap_exceeded(
                        execution.total_cost_usd, config.hard_spend_cap
                    ):
                        execution.cancel_token.cancel("Hard spend cap exceeded")
                        execution.status = "budget_exceeded"
                        await execution.broadcast(
                            "budget_warning",
                            {
                                "current_spend_usd": execution.total_cost_usd,
                                "spend_cap_usd": config.hard_spend_cap,
                            },
                        )
                        break

                    # Stream single request
                    req_metric = await cls._stream_single_request(
                        adapter, config, prompt, execution.waterfall_baseline, execution.start_time, is_this_cold
                    )
                    execution.metrics.append(req_metric)
                    execution.total_cost_usd += req_metric.cost_usd

                    # Yield control
                    await asyncio.sleep(0.01)

            # Periodic SSE Snapshot Broadcaster Task
            async def broadcast_loop():
                nonlocal \
                    current_active_workers, \
                    baseline_stage_ttft, \
                    saturation_knee_concurrency, \
                    saturation_knee_detected
                while execution.status == "running" and not execution.cancel_token.is_cancelled:
                    elapsed = time.perf_counter() - execution.start_time

                    if is_knee_probe:
                        stage_idx = min(
                            len(stepped_stages) - 1, int(elapsed / max(0.1, stage_duration))
                        )
                        current_active_workers = stepped_stages[stage_idx]

                        # Detect TTFT saturation knee inflection (>50% spike over 1-stream baseline)
                        if len(execution.metrics) >= 4:
                            comp = [
                                m
                                for m in execution.metrics
                                if not m.is_error and m.status_code == 200
                            ]
                            if comp:
                                current_p95 = float(np.percentile([m.ttft_ms for m in comp], 95))
                                if (
                                    baseline_stage_ttft is None
                                    and stage_idx == 0
                                    and len(comp) >= 3
                                ):
                                    baseline_stage_ttft = current_p95
                                elif (
                                    baseline_stage_ttft
                                    and current_p95 >= 1.5 * baseline_stage_ttft
                                    and not saturation_knee_detected
                                    and stage_idx > 0
                                ):
                                    saturation_knee_concurrency = stepped_stages[stage_idx - 1]
                                    saturation_knee_detected = True

                    snapshot = StatisticsEngine.calculate_snapshot(
                        benchmark_id=benchmark_id,
                        status=execution.status,
                        elapsed_seconds=elapsed,
                        total_requests=len(execution.metrics),
                        metrics=execution.metrics,
                        slo=config.slo,
                        workload_preset=config.workload_preset.value,
                        saturation_knee_concurrency=saturation_knee_concurrency,
                        saturation_knee_detected=saturation_knee_detected,
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
                logger.error(
                    "Error during workload execution", errors=[str(e) for e in eg.exceptions]
                )

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
                workload_preset=config.workload_preset.value,
                saturation_knee_concurrency=saturation_knee_concurrency,
                saturation_knee_detected=saturation_knee_detected,
            )

            # Persist to database
            await cls._persist_run_to_db(execution, final_snapshot)

            # Broadcast completion
            await execution.broadcast("run_complete", final_snapshot.model_dump())
            logger.info(
                "Benchmark finished",
                benchmark_id=benchmark_id,
                status=execution.status,
                completed=final_snapshot.completed_requests,
            )

        except Exception as e:
            logger.error(
                "Unhandled exception in benchmark lifecycle",
                benchmark_id=benchmark_id,
                error=str(e),
            )
            execution.cancel_token.cancel("Internal error")
            execution.status = "failed"
            total_elapsed = time.perf_counter() - execution.start_time
            error_snapshot = StatisticsEngine.calculate_snapshot(
                benchmark_id=benchmark_id,
                status=execution.status,
                elapsed_seconds=total_elapsed,
                total_requests=len(execution.metrics),
                metrics=execution.metrics,
                slo=config.slo,
                workload_preset=config.workload_preset.value,
                saturation_knee_concurrency=saturation_knee_concurrency
                if "saturation_knee_concurrency" in locals()
                else None,
                saturation_knee_detected=saturation_knee_detected
                if "saturation_knee_detected" in locals()
                else False,
            )
            await cls._persist_run_to_db(execution, error_snapshot)
            await execution.broadcast("run_complete", error_snapshot.model_dump())

    @classmethod
    async def _stream_single_request(
        cls,
        adapter,
        config: BenchmarkConfig,
        prompt: str,
        baseline_waterfall: WaterfallTiming,
        start_time: float = 0.0,
        is_cache_cold: bool = False,
    ) -> SingleRequestMetric:
        req_id = f"req_{uuid.uuid4().hex[:8]}"
        t_request_sent = time.perf_counter()
        t_first_chunk: float | None = None
        t_first_answer: float | None = None
        t_prev_chunk: float | None = None
        itl_deltas_ms: list[float] = []
        collected_tokens: list[str] = []
        thinking_token_count = 0

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

                if event.reasoning:
                    thinking_token_count += 1
                if event.token:
                    collected_tokens.append(event.token)

                # Record Inter-Token/Chunk Delays
                if t_prev_chunk is not None and t_now > t_prev_chunk:
                    delta_ms = (t_now - t_prev_chunk) * 1000.0
                    chunk_tokens = max(1, len(event.token or "") // 4)
                    itl_deltas_ms.append(round(delta_ms / chunk_tokens, 3))
                    t_prev_chunk = t_now

                # Extract token usage if provided in final chunk
                if event.usage:
                    prompt_tokens = event.usage.get("prompt_tokens", 0)
                    completion_tokens = event.usage.get("completion_tokens", 0)

            t_last = time.perf_counter()
            completed_elapsed = round(t_last - start_time, 3) if start_time > 0 else 0.0
            ttft_ms = round((t_first_chunk - t_request_sent) * 1000.0, 2) if t_first_chunk else 0.0
            ttfa_ms = (
                round((t_first_answer - t_request_sent) * 1000.0, 2) if t_first_answer else None
            )
            e2e_ms = round((t_last - t_request_sent) * 1000.0, 2)

            if completion_tokens == 0:
                completion_tokens = max(1, len(itl_deltas_ms))
            if prompt_tokens == 0:
                prompt_tokens = max(10, int(len(prompt.split()) * 1.3))

            decode_duration_ms = max(0.001, (t_last - (t_first_chunk or t_last)) * 1000.0)
            if t_first_chunk is None or t_first_chunk == t_last:
                tpot_ms = round((t_last - t_request_sent) * 1000.0 / max(1, completion_tokens), 3)
            else:
                tpot_ms = round(decode_duration_ms / max(1, completion_tokens), 3)

            # Prefill Token Velocity (Prompt tok/s)
            prefill_tps = (
                round(prompt_tokens / max(0.0001, (ttft_ms / 1000.0)), 1) if ttft_ms > 0 else None
            )

            # Structured JSON validation check if requested
            schema_valid = None
            is_json_workload = (
                config.workload_preset
                in (
                    "structured_json",
                    "json_schema",
                    WorkloadPreset.STRUCTURED_JSON,
                    WorkloadPreset.JSON_SCHEMA,
                )
                or config.json_schema is not None
            )
            if is_json_workload:
                full_text = "".join(collected_tokens).strip()
                try:
                    json.loads(full_text)
                    schema_valid = True
                except Exception:
                    schema_valid = False

            cost_usd = CostGuard.calculate_request_cost(
                config.model,
                prompt_tokens,
                completion_tokens,
                config.custom_prompt_price_per_1m,
                config.custom_completion_price_per_1m,
            )

            edge_network_ms = round(
                baseline_waterfall.dns_ms + baseline_waterfall.tcp_ms + baseline_waterfall.tls_ms, 2
            )
            server_gpu_compute_ms = max(0.0, round(ttft_ms - edge_network_ms, 2))

            waterfall = WaterfallTiming(
                dns_ms=baseline_waterfall.dns_ms,
                tcp_ms=baseline_waterfall.tcp_ms,
                tls_ms=baseline_waterfall.tls_ms,
                network_edge_ms=edge_network_ms,
                server_gpu_compute_ms=server_gpu_compute_ms,
                ttft_ms=ttft_ms,
                decode_ms=round(decode_duration_ms, 2),
                total_e2e_ms=e2e_ms,
            )

            metric = SingleRequestMetric(
                request_id=req_id,
                status_code=200,
                is_error=False,
                is_rate_limit=False,
                is_cache_cold=is_cache_cold,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                thinking_tokens=thinking_token_count,
                prefill_tps=prefill_tps,
                schema_valid=schema_valid,
                waterfall=waterfall,
                ttft_ms=ttft_ms,
                ttfa_ms=ttfa_ms,
                tpot_ms=tpot_ms,
                e2e_ms=e2e_ms,
                itl_deltas_ms=itl_deltas_ms,
                cost_usd=cost_usd,
                completed_at_elapsed=completed_elapsed,
            )
            metric.meets_slo = StatisticsEngine.evaluate_slo(metric, config.slo)
            return metric

        except Exception as e:
            t_last = time.perf_counter()
            completed_elapsed = round(t_last - start_time, 3) if start_time > 0 else 0.0
            err_str = str(e)
            is_429 = (
                "429" in err_str
                or "rate limit" in err_str.lower()
                or "too many requests" in err_str.lower()
                or "quota" in err_str.lower()
            )
            status_code = 429 if is_429 else getattr(e, "status_code", 500)

            # Extract Retry-After if present in message
            retry_ms = None
            retry_match = re.search(r"Retry-After[:\s]+([\d\.]+)", err_str, re.IGNORECASE)
            if retry_match:
                try:
                    retry_ms = float(retry_match.group(1)) * 1000.0
                except Exception:
                    pass

            return SingleRequestMetric(
                request_id=req_id,
                status_code=status_code,
                is_error=not is_429,
                is_rate_limit=is_429,
                retry_after_ms=retry_ms,
                error_message=err_str,
                e2e_ms=round((t_last - t_request_sent) * 1000.0, 2),
                completed_at_elapsed=completed_elapsed,
                meets_slo=False,
            )

    @classmethod
    async def _persist_run_to_db(
        cls, execution: BenchmarkExecution, snapshot: MetricsSnapshot
    ) -> None:
        """Persist aggregated benchmark metadata and metrics to SQLite."""
        config = execution.config
        try:
            from app.db.session import ensure_db_initialized

            await ensure_db_initialized()
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
                    raw_telemetry=snapshot.model_dump(),
                    config_snapshot=config.model_dump(exclude={"credential"}),
                )
                session.add(run_db)
                await session.commit()
        except Exception as e:
            logger.error("Failed to save benchmark run to DB", error=str(e))
