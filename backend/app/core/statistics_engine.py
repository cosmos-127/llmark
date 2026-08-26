from typing import List, Optional
import numpy as np

from app.models.schemas import (
    MetricsSnapshot,
    SingleRequestMetric,
    SLOThresholds,
    WaterfallTiming,
)


class StatisticsEngine:
    @staticmethod
    def compute_percentiles(values: List[float]) -> dict[str, float]:
        """Compute P50, P75, P95, P99 from an unaggregated population array."""
        if not values:
            return {"p50": 0.0, "p75": 0.0, "p95": 0.0, "p99": 0.0, "max": 0.0, "mean": 0.0}

        arr = np.array(values, dtype=np.float64)
        return {
            "p50": round(float(np.percentile(arr, 50)), 2),
            "p75": round(float(np.percentile(arr, 75)), 2),
            "p95": round(float(np.percentile(arr, 95)), 2),
            "p99": round(float(np.percentile(arr, 99)), 2),
            "max": round(float(np.max(arr)), 2),
            "mean": round(float(np.mean(arr)), 2),
        }

    @staticmethod
    def evaluate_slo(request: SingleRequestMetric, slo: SLOThresholds) -> bool:
        """Evaluate whether an individual request strictly satisfies all user SLO targets."""
        if request.is_error or request.status_code != 200:
            return False
        if request.ttft_ms > slo.max_ttft_ms:
            return False
        if request.tpot_ms > slo.max_tpot_ms:
            return False
        if request.e2e_ms > slo.max_e2e_ms:
            return False
        return True

    @classmethod
    def calculate_snapshot(
        cls,
        benchmark_id: str,
        status: str,
        elapsed_seconds: float,
        total_requests: int,
        metrics: List[SingleRequestMetric],
        slo: SLOThresholds,
    ) -> MetricsSnapshot:
        """Aggregate in-flight or completed telemetry into a live MetricsSnapshot."""
        if not metrics:
            return MetricsSnapshot(
                benchmark_id=benchmark_id,
                status=status,
                elapsed_seconds=round(elapsed_seconds, 2),
                total_requests=total_requests,
                completed_requests=0,
                failed_requests=0,
            )

        completed_reqs = [m for m in metrics if not m.is_error]
        failed_reqs = [m for m in metrics if m.is_error]
        num_completed = len(completed_reqs)
        num_failed = len(failed_reqs)
        total_finished = num_completed + num_failed

        # Gather arrays
        ttft_values = [m.ttft_ms for m in completed_reqs if m.ttft_ms > 0]
        ttfa_values = [m.ttfa_ms for m in completed_reqs if m.ttfa_ms is not None and m.ttfa_ms > 0]
        tpot_values = [m.tpot_ms for m in completed_reqs if m.tpot_ms > 0]

        # Flatten all ITL deltas across every chunk of every request in the run
        all_itl_deltas: List[float] = []
        for m in completed_reqs:
            all_itl_deltas.extend(m.itl_deltas_ms)

        # Percentile calculations
        ttft_stats = cls.compute_percentiles(ttft_values)
        ttfa_stats = cls.compute_percentiles(ttfa_values) if ttfa_values else None
        itl_stats = cls.compute_percentiles(all_itl_deltas)
        tpot_stats = cls.compute_percentiles(tpot_values)

        # Token counting & TPS / RPS
        total_gen_tokens = sum(m.completion_tokens for m in completed_reqs)
        current_tps = round(total_gen_tokens / max(0.001, elapsed_seconds), 2)
        current_rps = round(total_finished / max(0.001, elapsed_seconds), 2)
        current_spend = sum(m.cost_usd for m in metrics)

        # Goodput & Error Rate
        successful_slo_reqs = sum(1 for m in completed_reqs if cls.evaluate_slo(m, slo))
        goodput_pct = round((successful_slo_reqs / max(1, total_finished)) * 100.0, 2)
        error_rate_pct = round((num_failed / max(1, total_finished)) * 100.0, 2)

        # Average Waterfall
        if completed_reqs:
            avg_dns = float(np.mean([m.waterfall.dns_ms for m in completed_reqs]))
            avg_tcp = float(np.mean([m.waterfall.tcp_ms for m in completed_reqs]))
            avg_tls = float(np.mean([m.waterfall.tls_ms for m in completed_reqs]))
            avg_ttft = float(np.mean([m.waterfall.ttft_ms for m in completed_reqs]))
            avg_decode = float(np.mean([m.waterfall.decode_ms for m in completed_reqs]))
            avg_e2e = float(np.mean([m.waterfall.total_e2e_ms for m in completed_reqs]))
            waterfall_avg = WaterfallTiming(
                dns_ms=round(avg_dns, 2),
                tcp_ms=round(avg_tcp, 2),
                tls_ms=round(avg_tls, 2),
                ttft_ms=round(avg_ttft, 2),
                decode_ms=round(avg_decode, 2),
                total_e2e_ms=round(avg_e2e, 2),
            )
        else:
            waterfall_avg = WaterfallTiming()

        return MetricsSnapshot(
            benchmark_id=benchmark_id,
            status=status,
            elapsed_seconds=round(elapsed_seconds, 2),
            total_requests=total_requests,
            completed_requests=num_completed,
            failed_requests=num_failed,
            current_tps=current_tps,
            current_rps=current_rps,
            current_spend_usd=round(current_spend, 6),
            waterfall_avg=waterfall_avg,
            ttft_p50=ttft_stats["p50"],
            ttft_p75=ttft_stats["p75"],
            ttft_p95=ttft_stats["p95"],
            ttft_p99=ttft_stats["p99"],
            ttfa_p50=ttfa_stats["p50"] if ttfa_stats else None,
            ttfa_p95=ttfa_stats["p95"] if ttfa_stats else None,
            itl_p50=itl_stats["p50"],
            itl_p75=itl_stats["p75"],
            itl_p95=itl_stats["p95"],
            itl_p99=itl_stats["p99"],
            max_itl=itl_stats["max"],
            tpot_mean=tpot_stats["mean"],
            goodput_pct=goodput_pct,
            error_rate_pct=error_rate_pct,
        )
