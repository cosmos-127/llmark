import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.adapters.registry import AdapterRegistry
from app.core.cost_guard import CostGuard
from app.core.orchestrator import BenchmarkOrchestrator
from app.models.schemas import (
    BenchmarkConfig,
    CostEstimate,
    ListModelsRequest,
    ListModelsResponse,
    TestMode,
    VendorType,
    WorkloadPreset,
)
from app.observability.logging import logger

router = APIRouter(prefix="/benchmark", tags=["benchmark"])


@router.post("/run", status_code=status.HTTP_201_CREATED)
async def start_benchmark(config: BenchmarkConfig) -> dict:
    """Start a new benchmark run in the background."""
    try:
        benchmark_id = await BenchmarkOrchestrator.start_benchmark(config)
    except Exception as exc:
        logger.error("Failed to start benchmark", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start benchmark: {str(exc)}",
        )
    return {"benchmark_id": benchmark_id, "status": "running", "name": config.name}


@router.post("/{benchmark_id}/abort", status_code=status.HTTP_200_OK)
async def abort_benchmark(benchmark_id: str) -> dict:
    """Abort an active in-flight benchmark run immediately."""
    aborted = BenchmarkOrchestrator.abort_run(benchmark_id)
    if not aborted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active benchmark '{benchmark_id}' not found or already terminated.",
        )
    return {"benchmark_id": benchmark_id, "status": "aborted"}


@router.get("/cost-estimate", response_model=CostEstimate)
async def get_cost_estimate(
    vendor: str = Query(..., description="Vendor identifier (openai, anthropic, mock, etc.)"),
    model: str = Query(..., description="Model name"),
    workload_preset: str = Query("chat", description="Workload preset (chat, rag, code, etc.)"),
    concurrency: int = Query(5, ge=1, le=100),
    duration_seconds: int = Query(30, ge=1, le=300),
    hard_spend_cap: float = Query(2.0, ge=0.0),
    test_mode: str = Query("duration", description="Testing mode: duration or requests"),
    total_requests: int | None = Query(None, ge=1, le=1000),
    max_tokens: int = Query(512, ge=1, le=8192),
    custom_prompt_price_per_1m: float | None = Query(None, ge=0.0),
    custom_completion_price_per_1m: float | None = Query(None, ge=0.0),
) -> CostEstimate:
    """Get pre-flight cost and token bounds calculation before launching a benchmark."""
    try:
        config = BenchmarkConfig(
            vendor=VendorType(vendor),
            model=model,
            workload_preset=WorkloadPreset(workload_preset),
            concurrency=concurrency,
            duration_seconds=duration_seconds,
            hard_spend_cap=hard_spend_cap,
            test_mode=TestMode(test_mode),
            total_requests=total_requests,
            max_tokens=max_tokens,
            custom_prompt_price_per_1m=custom_prompt_price_per_1m,
            custom_completion_price_per_1m=custom_completion_price_per_1m,
        )
        return CostGuard.estimate_benchmark_cost(config)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameter for cost estimation: {str(val_err)}",
        )
    except Exception as exc:
        logger.error("Failed to estimate benchmark cost", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate cost estimate: {str(exc)}",
        )


@router.get("/stream")
async def stream_benchmark_telemetry(
    benchmark_id: str = Query(..., description="Benchmark ID"),
) -> StreamingResponse:
    """Server-Sent Events (SSE) endpoint providing live microsecond telemetry snapshots."""
    execution = BenchmarkOrchestrator.get_run(benchmark_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark '{benchmark_id}' not found.",
        )

    async def event_generator() -> AsyncGenerator[str, None]:
        queue: asyncio.Queue = asyncio.Queue()
        execution.add_subscriber(queue)
        try:
            # Yield initial connection ping
            yield f"event: connection_open\ndata: {json.dumps({'benchmark_id': benchmark_id, 'status': execution.status})}\n\n"

            while True:
                # Wait for broadcasted snapshot or termination
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    event_type = msg.get("event", "message")
                    data = msg.get("data", {})
                    yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

                    if event_type in ("run_complete", "run_aborted"):
                        break
                except TimeoutError:
                    # Keep-alive heartbeat
                    yield ": keep-alive ping\n\n"

        except asyncio.CancelledError:
            pass
        finally:
            execution.remove_subscriber(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{benchmark_id}")
async def get_benchmark_status(benchmark_id: str) -> dict:
    """Get status and metrics for an active run."""
    execution = BenchmarkOrchestrator.get_run(benchmark_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark '{benchmark_id}' not found.",
        )
    return {
        "benchmark_id": benchmark_id,
        "status": execution.status,
        "total_requests": len(execution.metrics),
        "total_cost_usd": execution.total_cost_usd,
    }


@router.post("/models", response_model=ListModelsResponse)
async def list_vendor_models(req: ListModelsRequest) -> ListModelsResponse:
    """Fetch listed models for a vendor and base URL with the provided credentials."""
    adapter = AdapterRegistry.get_adapter(req.vendor)
    try:
        models = await adapter.list_models(req.credential)
        return ListModelsResponse(vendor=req.vendor, models=models)
    except Exception as exc:
        logger.error("Failed to list models from endpoint", vendor=req.vendor, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch models: {str(exc)}",
        )


@router.get("/presets")
async def list_workload_presets() -> list[dict]:
    """Return all production workload presets with calibrated token metadata and full prompt texts."""
    from app.core.fallback_tokenizer import FallbackTokenizer
    from app.core.prompt_presets import PROMPT_PRESET_TEXT
    from app.models.schemas import WORKLOAD_METRIC_PROFILES, WorkloadPreset

    canonical_presets = [
        WorkloadPreset.RATE_LIMIT_PROBE,
        WorkloadPreset.PREFILL_TTFT,
        WorkloadPreset.DECODE_THROUGHPUT,
        WorkloadPreset.REASONING_COT,
        WorkloadPreset.AGENTIC_TOOL_CALLING,
        WorkloadPreset.CODE_GENERATION,
        WorkloadPreset.RAG_SYNTHESIS,
        WorkloadPreset.LONG_CONTEXT_RETRIEVAL,
        WorkloadPreset.SUMMARIZATION_DISTILL,
        WorkloadPreset.STRUCTURED_JSON,
        WorkloadPreset.CHAT_INTERACTIVE,
        WorkloadPreset.FEWSHOT_CLASSIFICATION,
        WorkloadPreset.MULTIMODAL_VISION,
        WorkloadPreset.MULTITURN_AGENTIC,
        WorkloadPreset.KV_CACHE_REUSE,
        WorkloadPreset.CUSTOM,
    ]

    result = []
    for p in canonical_presets:
        prompt_text = PROMPT_PRESET_TEXT.get(p, "")
        profile = WORKLOAD_METRIC_PROFILES.get(p.value, {})
        tok_count = FallbackTokenizer.count_tokens(prompt_text)
        result.append(
            {
                "id": p.value,
                "name": profile.get("name", p.value),
                "tagline": profile.get("tagline", ""),
                "prompt": prompt_text,
                "prompt_tokens_measured": tok_count,
                "default_in_tokens": profile.get("default_in_tokens", tok_count),
                "default_out_tokens": profile.get("default_out_tokens", 100),
                "default_concurrency": profile.get("default_concurrency", 4),
                "default_max_tokens": profile.get("default_max_tokens", 512),
                "target_metrics": profile.get("target_metrics", []),
            }
        )

    return result
