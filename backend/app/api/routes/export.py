from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import PlainTextResponse, StreamingResponse
import io
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.report_exporter import ReportExporter
from app.models.db.models import BenchmarkRun

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/markdown/{run_id}", response_class=PlainTextResponse)
async def export_markdown(
    run_id: str,
    db: AsyncSession = Depends(get_db),
) -> str:
    """Export benchmark run results as a GitHub Flavored Markdown document."""
    query = select(BenchmarkRun).where(BenchmarkRun.id == run_id)
    result = await db.execute(query)
    run = result.scalar_one_or_none()

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark run '{run_id}' not found.",
        )

    return ReportExporter.generate_markdown(run)


@router.get("/csv/{run_id}")
async def export_csv(
    run_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export benchmark run results as an RFC 4180 CSV spreadsheet."""
    query = select(BenchmarkRun).where(BenchmarkRun.id == run_id)
    result = await db.execute(query)
    run = result.scalar_one_or_none()

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark run '{run_id}' not found.",
        )

    csv_content = ReportExporter.generate_csv(run)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=llmark_benchmark_{run_id}.csv"},
    )


@router.get("/pdf/{run_id}")
async def export_pdf(
    run_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export benchmark run results as a professional executive PDF report."""
    query = select(BenchmarkRun).where(BenchmarkRun.id == run_id)
    result = await db.execute(query)
    run = result.scalar_one_or_none()

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark run '{run_id}' not found.",
        )

    pdf_bytes = ReportExporter.generate_pdf(run)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=llmark_report_{run_id}.pdf"},
    )


@router.get("/bundle/{run_id}")
async def export_bundle(
    run_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export benchmark run results as a portable .llmark compressed archive."""
    query = select(BenchmarkRun).where(BenchmarkRun.id == run_id)
    result = await db.execute(query)
    run = result.scalar_one_or_none()

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark run '{run_id}' not found.",
        )

    bundle_bytes = ReportExporter.generate_bundle(run)
    return Response(
        content=bundle_bytes,
        media_type="application/gzip",
        headers={"Content-Disposition": f"attachment; filename=benchmark_{run_id}.llmark"},
    )
