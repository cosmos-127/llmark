from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.diff_engine import DiffEngine
from app.models.db.models import BenchmarkRun
from app.models.schemas import RunDiffResponse

router = APIRouter(prefix="/diff", tags=["diff"])


@router.get("", response_model=RunDiffResponse)
async def compare_benchmark_runs(
    run_a: str = Query(..., description="Benchmark Run A ID"),
    run_b: str = Query(..., description="Benchmark Run B ID"),
    db: AsyncSession = Depends(get_db),
) -> RunDiffResponse:
    """Compare two benchmark runs head-to-head and return metric percentage deltas."""
    query_a = select(BenchmarkRun).where(BenchmarkRun.id == run_a)
    result_a = await db.execute(query_a)
    run_a_obj = result_a.scalar_one_or_none()

    query_b = select(BenchmarkRun).where(BenchmarkRun.id == run_b)
    result_b = await db.execute(query_b)
    run_b_obj = result_b.scalar_one_or_none()

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

    return DiffEngine.compare_runs(run_a_obj, run_b_obj)
