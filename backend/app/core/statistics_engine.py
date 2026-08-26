from typing import Dict, List, Optional
import numpy as np

from app.models.schemas import (
    MetricsSnapshot,
    SingleRequestMetric,
    SLOThresholds,
    WaterfallTiming,
    WORKLOAD_METRIC_PROFILES,
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
        if request.is_error or request.is_rate_limit or request.status_code != 200:
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
        workload_preset: Optional[str] = None,
        saturation_knee_concurrency: Optional[int] = None,
        saturation_knee_detected: bool = False,
    ) -> MetricsSnapshot:
        """Aggregate in-flight or completed telemetry into a live MetricsSnapshot."""
        target_profile_metrics = (
            WORKLOAD_METRIC_PROFILES.get(workload_preset, {}).get("target_metrics", [])
            if workload_preset
            else []
        )

        if not metrics:
            return MetricsSnapshot(
                benchmark_id=benchmark_id,
                status=status,
                elapsed_seconds=round(elapsed_seconds, 2),
                total_requests=total_requests,
                completed_requests=0,
                failed_requests=0,
                saturation_knee_concurrency=saturation_knee_concurrency,
                saturation_knee_detected=saturation_knee_detected,
                profile_metrics=target_profile_metrics,
                workload_preset=workload_preset,
            )

        completed_reqs = [m for m in metrics if not m.is_error and not m.is_rate_limit and m.status_code == 200]
        failed_reqs = [m for m in metrics if m.is_error or m.is_rate_limit or m.status_code != 200]
        num_completed = len(completed_reqs)
        num_failed = len(failed_reqs)
        total_finished = len(metrics)

        # 1. Rate Limiting, HTTP Status Codes & RPM/TPM Probing
        status_counts: Dict[str, int] = {}
        rate_limit_count = 0
        for m in metrics:
            code_str = str(m.status_code)
            status_counts[code_str] = status_counts.get(code_str, 0) + 1
            if m.is_rate_limit or m.status_code == 429:
                rate_limit_count += 1

        rate_limit_pct = round((rate_limit_count / max(1, total_finished)) * 100.0, 2)
        total_all_tokens = sum(m.prompt_tokens + m.completion_tokens for m in metrics)
        current_rpm = round((total_finished / max(0.001, elapsed_seconds)) * 60.0, 1)
        current_tpm = round((total_all_tokens / max(0.001, elapsed_seconds)) * 60.0, 1)

        # Estimated rate limit ceilings if 429 encountered
        estimated_rpm_limit = None
        estimated_tpm_limit = None
        if rate_limit_count > 0:
            # Saturated capacity is non-429 throughput rate
            estimated_rpm_limit = round((num_completed / max(0.001, elapsed_seconds)) * 60.0, 1)
            completed_tokens = sum(m.prompt_tokens + m.completion_tokens for m in completed_reqs)
            estimated_tpm_limit = round((completed_tokens / max(0.001, elapsed_seconds)) * 60.0, 1)

        # 2. Latency Distributions
        ttft_values = [m.ttft_ms for m in completed_reqs if m.ttft_ms > 0]
        ttfa_values = [m.ttfa_ms for m in completed_reqs if m.ttfa_ms is not None and m.ttfa_ms > 0]
        tpot_values = [m.tpot_ms for m in completed_reqs if m.tpot_ms > 0]

        # Flatten all ITL deltas
        all_itl_deltas: List[float] = []
        for m in completed_reqs:
            all_itl_deltas.extend(m.itl_deltas_ms)

        ttft_stats = cls.compute_percentiles(ttft_values)
        ttfa_stats = cls.compute_percentiles(ttfa_values) if ttfa_values else None
        itl_stats = cls.compute_percentiles(all_itl_deltas)
        tpot_stats = cls.compute_percentiles(tpot_values)

        # 3. Prefill Processing Speed (Prompt tok/s)
        prefill_tps_values = [m.prefill_tps for m in completed_reqs if m.prefill_tps is not None and m.prefill_tps > 0]
        prefill_stats = cls.compute_percentiles(prefill_tps_values) if prefill_tps_values else None

        # 4. Reasoning / Thinking Metrics
        thinking_counts = [m.thinking_tokens for m in completed_reqs if m.thinking_tokens > 0]
        thinking_tokens_avg = round(float(np.mean(thinking_counts)), 1) if thinking_counts else None
        total_gen_tokens = sum(m.completion_tokens for m in completed_reqs)
        total_thinking_tokens = sum(m.thinking_tokens for m in completed_reqs)
        thinking_token_ratio_pct = (
            round((total_thinking_tokens / max(1, total_gen_tokens)) * 100.0, 1)
            if total_thinking_tokens > 0
            else None
        )

        # 5. Structured JSON Schema Compliance
        schema_eval_reqs = [m for m in completed_reqs if m.schema_valid is not None]
        schema_valid_count = sum(1 for m in schema_eval_reqs if m.schema_valid is True)
        schema_validity_pct = (
            round((schema_valid_count / max(1, len(schema_eval_reqs))) * 100.0, 1)
            if schema_eval_reqs
            else None
        )
        schema_error_count = len(schema_eval_reqs) - schema_valid_count

        # 6. Overall Throughput & Goodput
        current_tps = round(total_gen_tokens / max(0.001, elapsed_seconds), 2)
        current_rps = round(total_finished / max(0.001, elapsed_seconds), 2)
        current_spend = sum(m.cost_usd for m in metrics)

        successful_slo_reqs = sum(1 for m in completed_reqs if cls.evaluate_slo(m, slo))
        goodput_pct = round((successful_slo_reqs / max(1, total_finished)) * 100.0, 2)
        error_rate_pct = round((num_failed / max(1, total_finished)) * 100.0, 2)

        # 7. Average Waterfall with Edge Network vs GPU Compute Phase
        if completed_reqs:
            avg_dns = float(np.mean([m.waterfall.dns_ms for m in completed_reqs]))
            avg_tcp = float(np.mean([m.waterfall.tcp_ms for m in completed_reqs]))
            avg_tls = float(np.mean([m.waterfall.tls_ms for m in completed_reqs]))
            avg_edge = float(np.mean([m.waterfall.network_edge_ms for m in completed_reqs]))
            avg_gpu = float(np.mean([m.waterfall.server_gpu_compute_ms for m in completed_reqs]))
            avg_ttft = float(np.mean([m.waterfall.ttft_ms for m in completed_reqs]))
            avg_decode = float(np.mean([m.waterfall.decode_ms for m in completed_reqs]))
            avg_e2e = float(np.mean([m.waterfall.total_e2e_ms for m in completed_reqs]))
            waterfall_avg = WaterfallTiming(
                dns_ms=round(avg_dns, 2),
                tcp_ms=round(avg_tcp, 2),
                tls_ms=round(avg_tls, 2),
                network_edge_ms=round(avg_edge, 2),
                server_gpu_compute_ms=round(avg_gpu, 2),
                ttft_ms=round(avg_ttft, 2),
                decode_ms=round(avg_decode, 2),
                total_e2e_ms=round(avg_e2e, 2),
            )
            network_edge_avg_ms = round(avg_edge, 2)
            server_gpu_compute_avg_ms = round(avg_gpu, 2)
        else:
            waterfall_avg = WaterfallTiming()
            network_edge_avg_ms = None
            server_gpu_compute_avg_ms = None

        return MetricsSnapshot(
            benchmark_id=benchmark_id,
            status=status,
            elapsed_seconds=round(elapsed_seconds, 2),
            total_requests=total_requests,
            completed_requests=num_completed,
            failed_requests=num_failed,
            current_tps=current_tps,
            current_rps=current_rps,
            current_rpm=current_rpm,
            current_tpm=current_tpm,
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
            rate_limit_count=rate_limit_count,
            rate_limit_pct=rate_limit_pct,
            status_distribution=status_counts,
            estimated_rpm_limit=estimated_rpm_limit,
            estimated_tpm_limit=estimated_tpm_limit,
            prefill_tps_p50=prefill_stats["p50"] if prefill_stats else None,
            prefill_tps_p95=prefill_stats["p95"] if prefill_stats else None,
            thinking_tokens_avg=thinking_tokens_avg,
            thinking_token_ratio_pct=thinking_token_ratio_pct,
            schema_validity_pct=schema_validity_pct,
            schema_error_count=schema_error_count,
            saturation_knee_concurrency=saturation_knee_concurrency,
            saturation_knee_detected=saturation_knee_detected,
            network_edge_avg_ms=network_edge_avg_ms,
            server_gpu_compute_avg_ms=server_gpu_compute_avg_ms,
            profile_metrics=target_profile_metrics,
            workload_preset=workload_preset,
        )
