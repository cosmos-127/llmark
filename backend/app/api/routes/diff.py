from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.diff_engine import DiffEngine
from app.models.db.models import BenchmarkRun
from app.models.schemas import RunDiffResponse
from app.observability.logging import logger

router = APIRouter(prefix="/diff", tags=["diff"])


@router.get("", response_model=RunDiffResponse)
async def compare_benchmark_runs(
    run_a: str = Query(..., description="Benchmark Run A ID"),
    run_b: str = Query(..., description="Benchmark Run B ID"),
    run_c: str | None = Query(None, description="Optional Benchmark Run C ID"),
    db: AsyncSession = Depends(get_db),
) -> RunDiffResponse:
    """Compare up to three benchmark runs head-to-head and return metric percentage deltas."""
    try:
        query_a = select(BenchmarkRun).where(BenchmarkRun.id == run_a)
        result_a = await db.execute(query_a)
        run_a_obj = result_a.scalar_one_or_none()

        query_b = select(BenchmarkRun).where(BenchmarkRun.id == run_b)
        result_b = await db.execute(query_b)
        run_b_obj = result_b.scalar_one_or_none()

        run_c_obj = None
        if run_c:
            query_c = select(BenchmarkRun).where(BenchmarkRun.id == run_c)
            result_c = await db.execute(query_c)
            run_c_obj = result_c.scalar_one_or_none()
    except Exception as exc:
        logger.error(
            "Failed to query benchmark runs for diff",
            run_a=run_a,
            run_b=run_b,
            run_c=run_c,
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while querying benchmark runs for comparison: {str(exc)}",
        )

    if not run_a_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark Run A '{run_a}' not found.",
        )
    if not run_b_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark Run B '{run_b}' not found.",
        )
    if run_c and not run_c_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark Run C '{run_c}' not found.",
        )

    try:
        return DiffEngine.compare_runs(run_a_obj, run_b_obj, run_c_obj)
    except ValueError as exc:
        logger.warning("Workload preset mismatch in diff comparison", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("Failed to calculate diff deltas", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate comparison diff: {str(exc)}",
        )
