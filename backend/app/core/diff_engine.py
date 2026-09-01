from app.models.db.models import BenchmarkRun
from app.models.schemas import MetricDelta, RunDiffResponse


class DiffEngine:
    """Calculates granular percentage and absolute deltas between two or three benchmark runs."""

    @classmethod
    def compare_runs(
        cls,
        run_a: BenchmarkRun,
        run_b: BenchmarkRun,
        run_c: BenchmarkRun | None = None,
    ) -> RunDiffResponse:
        # 1. Enforce comparison between runs sharing the SAME workload preset
        preset_a = getattr(run_a, "workload_preset", None)
        preset_b = getattr(run_b, "workload_preset", None)
        preset_c = getattr(run_c, "workload_preset", None) if run_c else None

        if preset_a and preset_b and preset_a != preset_b:
            raise ValueError(
                f"Workload preset mismatch: cannot compare Run A ('{preset_a}') with Run B ('{preset_b}'). "
                "Benchmark comparisons require identical workload presets for statistically valid deltas."
            )
        if run_c and preset_a and preset_c and preset_a != preset_c:
            raise ValueError(
                f"Workload preset mismatch: cannot compare Run A ('{preset_a}') with Run C ('{preset_c}'). "
                "Benchmark comparisons require identical workload presets for statistically valid deltas."
            )

        common_preset = preset_a or preset_b or (preset_c if run_c else None)

        deltas: list[MetricDelta] = []

        def add_delta(
            name: str,
            val_a: float,
            val_b: float,
            val_c: float | None = None,
            category: str = "Latency Tail",
            lower_is_better: bool = True,
        ):
            diff_b = val_b - val_a
            pct_b = round((diff_b / val_a) * 100.0, 2) if val_a != 0 else 0.0
            is_improvement_b = (diff_b < 0) if lower_is_better else (diff_b > 0)

            diff_c: float | None = None
            pct_c: float | None = None
            is_improvement_c: bool | None = None
            val_c_rounded: float | None = None

            if val_c is not None:
                diff_c = round(val_c - val_a, 2)
                pct_c = round((diff_c / val_a) * 100.0, 2) if val_a != 0 else 0.0
                is_improvement_c = (diff_c < 0) if lower_is_better else (diff_c > 0)
                val_c_rounded = round(val_c, 2)

            deltas.append(
                MetricDelta(
                    metric_name=name,
                    category=category,
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

        # -------------------------------------------------------------------------
        # 1. Latency Tail Metrics (lower is better)
        # -------------------------------------------------------------------------
        add_delta(
            "TTFT P50 (ms)",
            run_a.ttft_p50 or 0.0,
            run_b.ttft_p50 or 0.0,
            run_c.ttft_p50 if run_c else None,
            category="Latency Tail",
            lower_is_better=True,
        )
        add_delta(
            "TTFT P75 (ms)",
            run_a.ttft_p75 or 0.0,
            run_b.ttft_p75 or 0.0,
            run_c.ttft_p75 if run_c else None,
            category="Latency Tail",
            lower_is_better=True,
        )
        add_delta(
            "TTFT P95 (ms)",
            run_a.ttft_p95 or 0.0,
            run_b.ttft_p95 or 0.0,
            run_c.ttft_p95 if run_c else None,
            category="Latency Tail",
            lower_is_better=True,
        )
        add_delta(
            "TTFT P99 (ms)",
            run_a.ttft_p99 or 0.0,
            run_b.ttft_p99 or 0.0,
            run_c.ttft_p99 if run_c else None,
            category="Latency Tail",
            lower_is_better=True,
        )

        # TTFA (Time to First Answer for reasoning/CoT models if recorded)
        if (run_a.ttfa_p95 and run_a.ttfa_p95 > 0) or (run_b.ttfa_p95 and run_b.ttfa_p95 > 0):
            add_delta(
                "TTFA P50 (ms)",
                run_a.ttfa_p50 or 0.0,
                run_b.ttfa_p50 or 0.0,
                run_c.ttfa_p50 if run_c else None,
                category="Latency Tail",
                lower_is_better=True,
            )
            add_delta(
                "TTFA P95 (ms)",
                run_a.ttfa_p95 or 0.0,
                run_b.ttfa_p95 or 0.0,
                run_c.ttfa_p95 if run_c else None,
                category="Latency Tail",
                lower_is_better=True,
            )

        add_delta(
            "ITL P50 (ms)",
            run_a.itl_p50 or 0.0,
            run_b.itl_p50 or 0.0,
            run_c.itl_p50 if run_c else None,
            category="Latency Tail",
            lower_is_better=True,
        )
        add_delta(
            "ITL P75 (ms)",
            run_a.itl_p75 or 0.0,
            run_b.itl_p75 or 0.0,
            run_c.itl_p75 if run_c else None,
            category="Latency Tail",
            lower_is_better=True,
        )
        add_delta(
            "ITL P95 (ms)",
            run_a.itl_p95 or 0.0,
            run_b.itl_p95 or 0.0,
            run_c.itl_p95 if run_c else None,
            category="Latency Tail",
            lower_is_better=True,
        )
        add_delta(
            "ITL P99 (ms)",
            run_a.itl_p99 or 0.0,
            run_b.itl_p99 or 0.0,
            run_c.itl_p99 if run_c else None,
            category="Latency Tail",
            lower_is_better=True,
        )
        add_delta(
            "Max ITL (ms)",
            run_a.max_itl or 0.0,
            run_b.max_itl or 0.0,
            run_c.max_itl if run_c else None,
            category="Latency Tail",
            lower_is_better=True,
        )
        add_delta(
            "TPOT Mean (ms)",
            run_a.tpot_mean or 0.0,
            run_b.tpot_mean or 0.0,
            run_c.tpot_mean if run_c else None,
            category="Latency Tail",
            lower_is_better=True,
        )

        # -------------------------------------------------------------------------
        # 2. Throughput & Capacity Metrics (higher is better)
        # -------------------------------------------------------------------------
        add_delta(
            "Decode TPS (tok/s)",
            run_a.tps_decode or 0.0,
            run_b.tps_decode or 0.0,
            run_c.tps_decode if run_c else None,
            category="Throughput & Capacity",
            lower_is_better=False,
        )

        rps_a = (run_a.completed_requests or 0) / max(1, run_a.duration_seconds or 1)
        rps_b = (run_b.completed_requests or 0) / max(1, run_b.duration_seconds or 1)
        rps_c = ((run_c.completed_requests or 0) / max(1, run_c.duration_seconds or 1)) if run_c else None
        add_delta(
            "Request Rate (RPS)",
            rps_a,
            rps_b,
            rps_c,
            category="Throughput & Capacity",
            lower_is_better=False,
        )

        add_delta(
            "Completed Requests",
            float(run_a.completed_requests or 0),
            float(run_b.completed_requests or 0),
            float(run_c.completed_requests or 0) if run_c else None,
            category="Throughput & Capacity",
            lower_is_better=False,
        )

        # Token counts
        add_delta(
            "Prompt Tokens",
            float(run_a.total_prompt_tokens or 0),
            float(run_b.total_prompt_tokens or 0),
            float(run_c.total_prompt_tokens or 0) if run_c else None,
            category="Throughput & Capacity",
            lower_is_better=False,
        )
        add_delta(
            "Generated Tokens",
            float(run_a.total_gen_tokens or 0),
            float(run_b.total_gen_tokens or 0),
            float(run_c.total_gen_tokens or 0) if run_c else None,
            category="Throughput & Capacity",
            lower_is_better=False,
        )

        # -------------------------------------------------------------------------
        # 3. Reliability & SLO Metrics
        # -------------------------------------------------------------------------
        add_delta(
            "Goodput (SLO Yield %)",
            run_a.goodput_pct or 0.0,
            run_b.goodput_pct or 0.0,
            run_c.goodput_pct if run_c else None,
            category="Reliability & SLO",
            lower_is_better=False,
        )
        add_delta(
            "Error Rate (%)",
            run_a.error_rate_pct or 0.0,
            run_b.error_rate_pct or 0.0,
            run_c.error_rate_pct if run_c else None,
            category="Reliability & SLO",
            lower_is_better=True,
        )

        # -------------------------------------------------------------------------
        # 4. Economic Metrics (lower is better)
        # -------------------------------------------------------------------------
        add_delta(
            "Total Cost ($)",
            run_a.total_cost_usd or 0.0,
            run_b.total_cost_usd or 0.0,
            run_c.total_cost_usd if run_c else None,
            category="Economics",
            lower_is_better=True,
        )

        cost_1k_a = (run_a.total_cost_usd / max(1, run_a.completed_requests or 1)) * 1000.0 if (run_a.total_cost_usd and run_a.completed_requests) else 0.0
        cost_1k_b = (run_b.total_cost_usd / max(1, run_b.completed_requests or 1)) * 1000.0 if (run_b.total_cost_usd and run_b.completed_requests) else 0.0
        cost_1k_c = ((run_c.total_cost_usd / max(1, run_c.completed_requests or 1)) * 1000.0 if (run_c.total_cost_usd and run_c.completed_requests) else 0.0) if run_c else None
        add_delta(
            "Cost / 1K Calls ($)",
            cost_1k_a,
            cost_1k_b,
            cost_1k_c,
            category="Economics",
            lower_is_better=True,
        )

        # -------------------------------------------------------------------------
        # 5. Network Connection Overhead (lower is better)
        # -------------------------------------------------------------------------
        if (run_a.dns_p50 or 0) > 0 or (run_b.dns_p50 or 0) > 0 or (run_a.tcp_p50 or 0) > 0 or (run_b.tcp_p50 or 0) > 0:
            add_delta(
                "DNS Resolution (ms)",
                run_a.dns_p50 or 0.0,
                run_b.dns_p50 or 0.0,
                run_c.dns_p50 if run_c else None,
                category="Network Connection",
                lower_is_better=True,
            )
            add_delta(
                "TCP Handshake (ms)",
                run_a.tcp_p50 or 0.0,
                run_b.tcp_p50 or 0.0,
                run_c.tcp_p50 if run_c else None,
                category="Network Connection",
                lower_is_better=True,
            )
            add_delta(
                "TLS Handshake (ms)",
                run_a.tls_p50 or 0.0,
                run_b.tls_p50 or 0.0,
                run_c.tls_p50 if run_c else None,
                category="Network Connection",
                lower_is_better=True,
            )

        goodput_diff = (run_b.goodput_pct or 0.0) - (run_a.goodput_pct or 0.0)
        goodput_delta_pct = round((goodput_diff / max(0.01, run_a.goodput_pct or 0.0)) * 100.0, 2)

        cost_diff = (run_b.total_cost_usd or 0.0) - (run_a.total_cost_usd or 0.0)
        cost_delta_pct = round((cost_diff / max(0.0001, run_a.total_cost_usd or 0.0)) * 100.0, 2)

        goodput_delta_c_pct: float | None = None
        cost_delta_c_pct: float | None = None
        if run_c:
            g_diff_c = (run_c.goodput_pct or 0.0) - (run_a.goodput_pct or 0.0)
            goodput_delta_c_pct = round((g_diff_c / max(0.01, run_a.goodput_pct or 0.0)) * 100.0, 2)
            c_diff_c = (run_c.total_cost_usd or 0.0) - (run_a.total_cost_usd or 0.0)
            cost_delta_c_pct = round(
                (c_diff_c / max(0.0001, run_a.total_cost_usd or 0.0)) * 100.0, 2
            )

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
            run_a_preset=preset_a,
            run_b_preset=preset_b,
            run_c_preset=preset_c,
            workload_preset=common_preset,
            deltas=deltas,
            goodput_delta_pct=goodput_delta_pct,
            cost_delta_pct=cost_delta_pct,
            goodput_delta_c_pct=goodput_delta_c_pct,
            cost_delta_c_pct=cost_delta_c_pct,
        )
