from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.db.models import BenchmarkRun

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_benchmark_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Retrieve historical benchmark runs ordered by creation date."""
    query = (
        select(BenchmarkRun)
        .order_by(desc(BenchmarkRun.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    runs = result.scalars().all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "vendor": r.vendor,
            "model": r.model,
            "workload_preset": r.workload_preset,
            "load_curve": r.load_curve,
            "concurrency": r.concurrency,
            "duration_seconds": r.duration_seconds,
            "status": r.status,
            "total_requests": r.total_requests,
            "completed_requests": r.completed_requests,
            "failed_requests": r.failed_requests,
            "total_cost_usd": r.total_cost_usd,
            "ttft_p50": r.ttft_p50,
            "ttft_p95": r.ttft_p95,
            "ttft_p99": r.ttft_p99,
            "itl_p95": r.itl_p95,
            "max_itl": r.max_itl,
            "goodput_pct": r.goodput_pct,
            "tps_decode": r.tps_decode,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in runs
    ]


@router.get("/{run_id}")
async def get_benchmark_run_details(
    run_id: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve full details, waterfall breakdown, and percentiles for a specific benchmark run."""
    query = select(BenchmarkRun).where(BenchmarkRun.id == run_id)
    result = await db.execute(query)
    run = result.scalar_one_or_none()

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark run '{run_id}' not found in history.",
        )

    return {
        "id": run.id,
        "name": run.name,
        "vendor": run.vendor,
        "model": run.model,
        "workload_preset": run.workload_preset,
        "load_curve": run.load_curve,
        "concurrency": run.concurrency,
        "duration_seconds": run.duration_seconds,
        "status": run.status,
        "counts": {
            "total_requests": run.total_requests,
            "completed_requests": run.completed_requests,
            "failed_requests": run.failed_requests,
            "total_prompt_tokens": run.total_prompt_tokens,
            "total_gen_tokens": run.total_gen_tokens,
            "total_cost_usd": run.total_cost_usd,
        },
        "percentiles": {
            "ttft_p50": run.ttft_p50,
            "ttft_p75": run.ttft_p75,
            "ttft_p95": run.ttft_p95,
            "ttft_p99": run.ttft_p99,
            "ttfa_p50": run.ttfa_p50,
            "ttfa_p95": run.ttfa_p95,
            "itl_p50": run.itl_p50,
            "itl_p75": run.itl_p75,
            "itl_p95": run.itl_p95,
            "itl_p99": run.itl_p99,
            "max_itl": run.max_itl,
            "tpot_mean": run.tpot_mean,
            "tps_decode": run.tps_decode,
            "goodput_pct": run.goodput_pct,
            "error_rate_pct": run.error_rate_pct,
        },
        "waterfall": {
            "dns_p50": run.dns_p50,
            "tcp_p50": run.tcp_p50,
            "tls_p50": run.tls_p50,
        },
        "config": run.config_snapshot,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }
