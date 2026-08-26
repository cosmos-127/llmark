from typing import List
from app.models.db.models import BenchmarkRun
from app.models.schemas import MetricDelta, RunDiffResponse


class DiffEngine:
    """Calculates granular percentage and absolute deltas between two benchmark runs."""

    @classmethod
    def compare_runs(cls, run_a: BenchmarkRun, run_b: BenchmarkRun) -> RunDiffResponse:
        deltas: List[MetricDelta] = []

        def add_delta(name: str, val_a: float, val_b: float, lower_is_better: bool = True):
            diff = val_b - val_a
            pct = 0.0
            if val_a != 0:
                pct = round((diff / val_a) * 100.0, 2)
            is_improvement = (diff < 0) if lower_is_better else (diff > 0)
            deltas.append(
                MetricDelta(
                    metric_name=name,
                    run_a_value=round(val_a, 2),
                    run_b_value=round(val_b, 2),
                    delta_value=round(diff, 2),
                    delta_pct=pct,
                    is_improvement=is_improvement,
                )
            )

        # Latency metrics (lower is better)
        add_delta("TTFT P50 (ms)", run_a.ttft_p50 or 0.0, run_b.ttft_p50 or 0.0, lower_is_better=True)
        add_delta("TTFT P95 (ms)", run_a.ttft_p95 or 0.0, run_b.ttft_p95 or 0.0, lower_is_better=True)
        add_delta("TTFT P99 (ms)", run_a.ttft_p99 or 0.0, run_b.ttft_p99 or 0.0, lower_is_better=True)
        add_delta("ITL P50 (ms)", run_a.itl_p50 or 0.0, run_b.itl_p50 or 0.0, lower_is_better=True)
        add_delta("ITL P95 (ms)", run_a.itl_p95 or 0.0, run_b.itl_p95 or 0.0, lower_is_better=True)
        add_delta("Max ITL (ms)", run_a.max_itl or 0.0, run_b.max_itl or 0.0, lower_is_better=True)
        add_delta("TPOT Mean (ms)", run_a.tpot_mean or 0.0, run_b.tpot_mean or 0.0, lower_is_better=True)

        # Throughput & SLO metrics (higher is better)
        add_delta("Decode TPS (tok/s)", run_a.tps_decode or 0.0, run_b.tps_decode or 0.0, lower_is_better=False)
        add_delta("Goodput (SLO Yield %)", run_a.goodput_pct or 0.0, run_b.goodput_pct or 0.0, lower_is_better=False)

        # Cost metric (lower is better)
        add_delta("Total Cost ($)", run_a.total_cost_usd or 0.0, run_b.total_cost_usd or 0.0, lower_is_better=True)

        goodput_diff = (run_b.goodput_pct or 0.0) - (run_a.goodput_pct or 0.0)
        goodput_delta_pct = round((goodput_diff / max(0.01, run_a.goodput_pct or 0.0)) * 100.0, 2)

        cost_diff = (run_b.total_cost_usd or 0.0) - (run_a.total_cost_usd or 0.0)
        cost_delta_pct = round((cost_diff / max(0.0001, run_a.total_cost_usd or 0.0)) * 100.0, 2)

        return RunDiffResponse(
            run_a_id=run_a.id,
            run_b_id=run_b.id,
            run_a_name=f"{run_a.name} ({run_a.model})",
            run_b_name=f"{run_b.name} ({run_b.model})",
            deltas=deltas,
            goodput_delta_pct=goodput_delta_pct,
            cost_delta_pct=cost_delta_pct,
        )
