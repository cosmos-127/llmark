from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import String, Float, Integer, DateTime, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    vendor: Mapped[str] = mapped_column(String(64), nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    workload_preset: Mapped[str] = mapped_column(String(64), nullable=False)
    load_curve: Mapped[str] = mapped_column(String(64), nullable=False)
    concurrency: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # completed, aborted, budget_exceeded, failed

    # Financial & Count Summaries
    total_requests: Mapped[int] = mapped_column(Integer, default=0)
    completed_requests: Mapped[int] = mapped_column(Integer, default=0)
    failed_requests: Mapped[int] = mapped_column(Integer, default=0)
    total_prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_gen_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)

    # Latency Percentiles (Milliseconds)
    ttft_p50: Mapped[float] = mapped_column(Float, default=0.0)
    ttft_p75: Mapped[float] = mapped_column(Float, default=0.0)
    ttft_p95: Mapped[float] = mapped_column(Float, default=0.0)
    ttft_p99: Mapped[float] = mapped_column(Float, default=0.0)

    ttfa_p50: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ttfa_p95: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    itl_p50: Mapped[float] = mapped_column(Float, default=0.0)
    itl_p75: Mapped[float] = mapped_column(Float, default=0.0)
    itl_p95: Mapped[float] = mapped_column(Float, default=0.0)
    itl_p99: Mapped[float] = mapped_column(Float, default=0.0)
    max_itl: Mapped[float] = mapped_column(Float, default=0.0)

    tpot_mean: Mapped[float] = mapped_column(Float, default=0.0)
    tps_decode: Mapped[float] = mapped_column(Float, default=0.0)
    goodput_pct: Mapped[float] = mapped_column(Float, default=0.0)
    error_rate_pct: Mapped[float] = mapped_column(Float, default=0.0)

    # Network Waterfall Baseline
    dns_p50: Mapped[float] = mapped_column(Float, default=0.0)
    tcp_p50: Mapped[float] = mapped_column(Float, default=0.0)
    tls_p50: Mapped[float] = mapped_column(Float, default=0.0)

    # Raw Microsecond Arrays & Config (Stored as JSON)
    raw_telemetry: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    config_snapshot: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
