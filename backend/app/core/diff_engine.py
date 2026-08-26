from typing import List, Optional
from app.models.db.models import BenchmarkRun
from app.models.schemas import MetricDelta, RunDiffResponse


class DiffEngine:
    """Calculates granular percentage and absolute deltas between two or three benchmark runs."""

    @classmethod
    def compare_runs(
        cls,
        run_a: BenchmarkRun,
        run_b: BenchmarkRun,
        run_c: Optional[BenchmarkRun] = None,
    ) -> RunDiffResponse:
        deltas: List[MetricDelta] = []

        def add_delta(
            name: str,
            val_a: float,
            val_b: float,
            val_c: Optional[float] = None,
            lower_is_better: bool = True,
        ):
            diff_b = val_b - val_a
            pct_b = round((diff_b / val_a) * 100.0, 2) if val_a != 0 else 0.0
            is_improvement_b = (diff_b < 0) if lower_is_better else (diff_b > 0)

            diff_c: Optional[float] = None
            pct_c: Optional[float] = None
            is_improvement_c: Optional[bool] = None
            val_c_rounded: Optional[float] = None

            if val_c is not None:
                diff_c = round(val_c - val_a, 2)
                pct_c = round((diff_c / val_a) * 100.0, 2) if val_a != 0 else 0.0
                is_improvement_c = (diff_c < 0) if lower_is_better else (diff_c > 0)
                val_c_rounded = round(val_c, 2)

            deltas.append(
                MetricDelta(
                    metric_name=name,
                    run_a_value=round(val_a, 2),
                    run_b_value=round(val_b, 2),
                    run_c_value=val_c_rounded,
                    delta_value=round(diff_b, 2),
                    delta_pct=pct_b,
                    delta_c_value=diff_c,
                    delta_c_pct=pct_c,
                    is_improvement=is_improvement_b,
                    is_improvement_c=is_improvement_c,
                )
            )

        # Latency metrics (lower is better)
        add_delta("TTFT P50 (ms)", run_a.ttft_p50 or 0.0, run_b.ttft_p50 or 0.0, run_c.ttft_p50 if run_c else None, lower_is_better=True)
        add_delta("TTFT P95 (ms)", run_a.ttft_p95 or 0.0, run_b.ttft_p95 or 0.0, run_c.ttft_p95 if run_c else None, lower_is_better=True)
        add_delta("TTFT P99 (ms)", run_a.ttft_p99 or 0.0, run_b.ttft_p99 or 0.0, run_c.ttft_p99 if run_c else None, lower_is_better=True)
        add_delta("ITL P50 (ms)", run_a.itl_p50 or 0.0, run_b.itl_p50 or 0.0, run_c.itl_p50 if run_c else None, lower_is_better=True)
        add_delta("ITL P95 (ms)", run_a.itl_p95 or 0.0, run_b.itl_p95 or 0.0, run_c.itl_p95 if run_c else None, lower_is_better=True)
        add_delta("Max ITL (ms)", run_a.max_itl or 0.0, run_b.max_itl or 0.0, run_c.max_itl if run_c else None, lower_is_better=True)
        add_delta("TPOT Mean (ms)", run_a.tpot_mean or 0.0, run_b.tpot_mean or 0.0, run_c.tpot_mean if run_c else None, lower_is_better=True)

        # Throughput & SLO metrics (higher is better)
        add_delta("Decode TPS (tok/s)", run_a.tps_decode or 0.0, run_b.tps_decode or 0.0, run_c.tps_decode if run_c else None, lower_is_better=False)
        add_delta("Goodput (SLO Yield %)", run_a.goodput_pct or 0.0, run_b.goodput_pct or 0.0, run_c.goodput_pct if run_c else None, lower_is_better=False)

        # Cost metric (lower is better)
        add_delta("Total Cost ($)", run_a.total_cost_usd or 0.0, run_b.total_cost_usd or 0.0, run_c.total_cost_usd if run_c else None, lower_is_better=True)

        goodput_diff = (run_b.goodput_pct or 0.0) - (run_a.goodput_pct or 0.0)
        goodput_delta_pct = round((goodput_diff / max(0.01, run_a.goodput_pct or 0.0)) * 100.0, 2)

        cost_diff = (run_b.total_cost_usd or 0.0) - (run_a.total_cost_usd or 0.0)
        cost_delta_pct = round((cost_diff / max(0.0001, run_a.total_cost_usd or 0.0)) * 100.0, 2)

        goodput_delta_c_pct: Optional[float] = None
        cost_delta_c_pct: Optional[float] = None
        if run_c:
            g_diff_c = (run_c.goodput_pct or 0.0) - (run_a.goodput_pct or 0.0)
            goodput_delta_c_pct = round((g_diff_c / max(0.01, run_a.goodput_pct or 0.0)) * 100.0, 2)
            c_diff_c = (run_c.total_cost_usd or 0.0) - (run_a.total_cost_usd or 0.0)
            cost_delta_c_pct = round((c_diff_c / max(0.0001, run_a.total_cost_usd or 0.0)) * 100.0, 2)

        return RunDiffResponse(
            run_a_id=run_a.id,
            run_b_id=run_b.id,
            run_c_id=run_c.id if run_c else None,
            run_a_name=f"{run_a.name} ({run_a.model})",
            run_b_name=f"{run_b.name} ({run_b.model})",
            run_c_name=f"{run_c.name} ({run_c.model})" if run_c else None,
            run_a_vendor=run_a.vendor,
            run_b_vendor=run_b.vendor,
            run_c_vendor=run_c.vendor if run_c else None,
            run_a_model=run_a.model,
            run_b_model=run_b.model,
            run_c_model=run_c.model if run_c else None,
            deltas=deltas,
            goodput_delta_pct=goodput_delta_pct,
            cost_delta_pct=cost_delta_pct,
            goodput_delta_c_pct=goodput_delta_c_pct,
            cost_delta_c_pct=cost_delta_c_pct,
        )
