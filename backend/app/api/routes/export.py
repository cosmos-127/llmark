import time

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.orchestrator import BenchmarkOrchestrator
from app.core.report_exporter import ReportExporter
from app.core.statistics_engine import StatisticsEngine
from app.models.db.models import BenchmarkRun

router = APIRouter(prefix="/export", tags=["export"])


async def _get_run_or_active(run_id: str, db: AsyncSession) -> BenchmarkRun:
    """Retrieve benchmark run from SQLite database or active in-memory execution."""
    query = select(BenchmarkRun).where(BenchmarkRun.id == run_id)
    result = await db.execute(query)
    run = result.scalar_one_or_none()
    if run:
        return run

    # Fallback to active in-memory benchmark session if available
    execution = BenchmarkOrchestrator._active_runs.get(run_id)
    if execution:
        elapsed = time.perf_counter() - execution.start_time if execution.start_time > 0 else 0.0
        config = execution.config
        snapshot = StatisticsEngine.calculate_snapshot(
            benchmark_id=execution.benchmark_id,
            status=execution.status,
            elapsed_seconds=elapsed,
            total_requests=len(execution.metrics),
            metrics=execution.metrics,
            slo=config.slo,
        )
        return BenchmarkRun(
            id=execution.benchmark_id,
            name=config.name,
            vendor=config.vendor.value if hasattr(config.vendor, "value") else str(config.vendor),
            model=config.model,
            workload_preset=config.workload_preset.value
            if hasattr(config.workload_preset, "value")
            else str(config.workload_preset),
            load_curve=config.load_curve.value
            if hasattr(config.load_curve, "value")
            else str(config.load_curve),
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
            goodput_pct=snapshot.goodput_pct,
            error_rate_pct=snapshot.error_rate_pct,
            tps_decode=snapshot.current_tps,
            dns_p50=snapshot.waterfall_avg.dns_ms
            if snapshot.waterfall_avg
            else (
                getattr(execution, "waterfall_baseline", None).dns_ms
                if getattr(execution, "waterfall_baseline", None)
                else 0.0
            ),
            tcp_p50=snapshot.waterfall_avg.tcp_ms
            if snapshot.waterfall_avg
            else (
                getattr(execution, "waterfall_baseline", None).tcp_ms
                if getattr(execution, "waterfall_baseline", None)
                else 0.0
            ),
            tls_p50=snapshot.waterfall_avg.tls_ms
            if snapshot.waterfall_avg
            else (
                getattr(execution, "waterfall_baseline", None).tls_ms
                if getattr(execution, "waterfall_baseline", None)
                else 0.0
            ),
            config_snapshot=config.model_dump(mode="json") if hasattr(config, "model_dump") else {},
            raw_telemetry={"metrics": [m.model_dump(mode="json") for m in execution.metrics]}
            if execution.metrics
            else {},
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Benchmark run '{run_id}' not found.",
    )


@router.get("/markdown/{run_id}", response_class=PlainTextResponse)
async def export_markdown(
    run_id: str,
    db: AsyncSession = Depends(get_db),
) -> str:
    """Export benchmark run results as a GitHub Flavored Markdown document."""
    run = await _get_run_or_active(run_id, db)
    try:
        return ReportExporter.generate_markdown(run)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Markdown report: {exc}",
        )


@router.get("/csv/{run_id}")
async def export_csv(
    run_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export benchmark run results as an RFC 4180 CSV spreadsheet."""
    run = await _get_run_or_active(run_id, db)
    try:
        csv_content = ReportExporter.generate_csv(run)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate CSV report: {exc}",
        )
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
    run = await _get_run_or_active(run_id, db)
    try:
        pdf_bytes = ReportExporter.generate_pdf(run)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF report: {exc}",
        )
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
    run = await _get_run_or_active(run_id, db)
    try:
        bundle_bytes = ReportExporter.generate_bundle(run)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate bundle: {exc}",
        )
    return Response(
        content=bundle_bytes,
        media_type="application/gzip",
        headers={"Content-Disposition": f"attachment; filename=benchmark_{run_id}.llmark"},
    )
