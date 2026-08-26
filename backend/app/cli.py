import argparse
import asyncio
import os
import sys
import time
from typing import List, Optional, Tuple
import yaml

# Ensure UTF-8 output encoding if supported
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.core.orchestrator import BenchmarkOrchestrator
from app.core.report_exporter import ReportExporter
from app.db.session import async_session_factory, init_db
from app.models.db.models import BenchmarkRun
from app.models.schemas import BenchmarkConfig, SLOThresholds, VendorType, WorkloadPreset
from sqlalchemy import select


def load_config_from_file(config_path: str) -> BenchmarkConfig:
    """Load and parse BenchmarkConfig from YAML or JSON file."""
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    return BenchmarkConfig(**data)


async def run_headless_benchmark(
    config: BenchmarkConfig,
    fail_under_goodput: Optional[float] = None,
    output_md: Optional[str] = None,
    output_json: Optional[str] = None,
    output_pdf: Optional[str] = None,
) -> int:
    """Execute benchmark headlessly in CI/CD mode and return appropriate exit code."""
    await init_db()

    print(f"\n=======================================================")
    print(f">> LLMark CI Runner: {config.name}")
    print(f"   Model: {config.model} | Vendor: {config.vendor.value}")
    print(f"   Workload: {config.workload_preset.value} | Concurrency: {config.concurrency} streams")
    print(f"   Duration: {config.duration_seconds}s | Spend Cap: ${config.hard_spend_cap or 0.0:.2f}")
    print(f"=======================================================\n")

    # Start benchmark
    benchmark_id = await BenchmarkOrchestrator.start_benchmark(config)
    execution = BenchmarkOrchestrator.get_run(benchmark_id)
    if not execution:
        print(f"[ERROR] Failed to initialize benchmark execution {benchmark_id}")
        return 2

    # Poll until complete
    start_time = time.time()
    while execution.status in ("initializing", "running"):
        await asyncio.sleep(0.5)
        elapsed = time.time() - start_time
        print(f"\r[RUNNING] Elapsed: {elapsed:.1f}s | Finished Reqs: {len(execution.metrics)}", end="", flush=True)

    print(f"\n\n[STATUS] Benchmark {execution.status.upper()} in {time.time() - start_time:.1f}s")

    # Fetch persisted database record
    run_record = None
    for _ in range(10):
        async with async_session_factory() as session:
            query = select(BenchmarkRun).where(BenchmarkRun.id == benchmark_id)
            result = await session.execute(query)
            run_record = result.scalar_one_or_none()
            if run_record:
                break
        await asyncio.sleep(0.15)


    if not run_record:
        print(f"[ERROR] Benchmark run {benchmark_id} not found in database.")
        return 2

    # Print summary table
    print("\n[RESULTS] Benchmark Performance Summary:")
    print(f"   * Goodput (SLO Yield):  {run_record.goodput_pct:.1f}%")
    print(f"   * Decode Throughput:    {run_record.tps_decode:.1f} tokens/sec")
    print(f"   * TTFT (P50 / P95):     {run_record.ttft_p50:.1f} ms / {run_record.ttft_p95:.1f} ms")
    print(f"   * ITL  (P50 / P95):     {run_record.itl_p50:.1f} ms / {run_record.itl_p95:.1f} ms")
    print(f"   * Max ITL (Freeze):     {run_record.max_itl:.1f} ms")
    print(f"   * Requests Completed:   {run_record.completed_requests} / {run_record.total_requests}")
    print(f"   * Total Cost:           ${run_record.total_cost_usd:.4f} USD\n")

    # Export outputs if requested
    if output_md:
        md_content = ReportExporter.generate_markdown(run_record)
        with open(output_md, "w", encoding="utf-8") as f:
            f.write(md_content)
        print(f"[EXPORT] Saved Markdown report to: {output_md}")

def evaluate_assertions(run_record: BenchmarkRun, assertions: List[str]) -> tuple[bool, List[str]]:
    """Evaluate quality gate assertion strings against a BenchmarkRun record.

    Example assertions:
      - "p95_ttft < 800"
      - "goodput >= 95"
      - "max_cost <= 0.50"
      - "tps >= 40"
      - "error_rate <= 1.0"
    """
    all_passed = True
    results: List[str] = []

    metrics_map = {
        "p95_ttft": run_record.ttft_p95,
        "ttft_p95": run_record.ttft_p95,
        "ttft": run_record.ttft_p95,
        "p50_ttft": run_record.ttft_p50,
        "ttft_p50": run_record.ttft_p50,
        "p95_itl": run_record.itl_p95,
        "itl_p95": run_record.itl_p95,
        "itl": run_record.itl_p95,
        "max_itl": run_record.max_itl,
        "tps": run_record.tps_decode,
        "tps_decode": run_record.tps_decode,
        "throughput": run_record.tps_decode,
        "tpot": run_record.tpot_mean,
        "tpot_mean": run_record.tpot_mean,
        "goodput": run_record.goodput_pct,
        "goodput_pct": run_record.goodput_pct,
        "error_rate": run_record.error_rate_pct,
        "error_rate_pct": run_record.error_rate_pct,
        "cost": run_record.total_cost_usd,
        "max_cost": run_record.total_cost_usd,
        "total_cost": run_record.total_cost_usd,
        "spend": run_record.total_cost_usd,
    }

    import re
    for raw_ast in assertions:
        ast = raw_ast.strip()
        # Parse metric, operator, threshold
        match = re.match(r"^([a-zA-Z0-9_]+)\s*(<=|>=|<|>|==|!=)\s*([0-9\.]+)%?(?:ms|s|\$)?$", ast)
        if not match:
            all_passed = False
            results.append(f"[ERROR] Invalid assertion format: '{ast}' (expected e.g. 'p95_ttft < 800' or 'goodput >= 95')")
            continue

        metric_key, op, threshold_str = match.groups()
        metric_key = metric_key.lower()
        threshold = float(threshold_str)

        if metric_key not in metrics_map:
            all_passed = False
            results.append(f"[ERROR] Unknown assertion metric: '{metric_key}'. Available: {list(metrics_map.keys())[:8]}")
            continue

        actual_val = metrics_map[metric_key]
        passed = False
        if op == "<":
            passed = actual_val < threshold
        elif op == "<=":
            passed = actual_val <= threshold
        elif op == ">":
            passed = actual_val > threshold
        elif op == ">=":
            passed = actual_val >= threshold
        elif op == "==":
            passed = abs(actual_val - threshold) < 1e-5
        elif op == "!=":
            passed = abs(actual_val - threshold) >= 1e-5

        if passed:
            results.append(f"[PASS] Assertion '{ast}': actual = {actual_val}")
        else:
            all_passed = False
            results.append(f"[FAIL] Assertion '{ast}': actual = {actual_val} (VIOLATED)")

    return all_passed, results


async def run_headless_benchmark(
    config: BenchmarkConfig,
    fail_under_goodput: Optional[float] = None,
    assertions: Optional[List[str]] = None,
    output_md: Optional[str] = None,
    output_json: Optional[str] = None,
    output_pdf: Optional[str] = None,
) -> int:
    """Execute benchmark headlessly in CI/CD mode and return appropriate exit code."""
    await init_db()

    print(f"\n=======================================================")
    print(f">> LLMark CI Runner: {config.name}")
    print(f"   Model: {config.model} | Vendor: {config.vendor.value}")
    print(f"   Workload: {config.workload_preset.value} | Concurrency: {config.concurrency} streams")
    print(f"   Duration: {config.duration_seconds}s | Spend Cap: ${config.hard_spend_cap or 0.0:.2f}")
    print(f"=======================================================\n")

    # Start benchmark
    benchmark_id = await BenchmarkOrchestrator.start_benchmark(config)
    execution = BenchmarkOrchestrator.get_run(benchmark_id)
    if not execution:
        print(f"[ERROR] Failed to initialize benchmark execution {benchmark_id}")
        return 2

    # Poll until complete
    start_time = time.time()
    while execution.status in ("initializing", "running"):
        await asyncio.sleep(0.5)
        elapsed = time.time() - start_time
        print(f"\r[RUNNING] Elapsed: {elapsed:.1f}s | Finished Reqs: {len(execution.metrics)}", end="", flush=True)

    print(f"\n\n[STATUS] Benchmark {execution.status.upper()} in {time.time() - start_time:.1f}s")

    # Fetch persisted database record
    run_record = None
    for _ in range(10):
        async with async_session_factory() as session:
            query = select(BenchmarkRun).where(BenchmarkRun.id == benchmark_id)
            result = await session.execute(query)
            run_record = result.scalar_one_or_none()
            if run_record:
                break
        await asyncio.sleep(0.15)

    if not run_record:
        print(f"[ERROR] Benchmark run {benchmark_id} not found in database.")
        return 2

    # Print summary table
    print("\n[RESULTS] Benchmark Performance Summary:")
    print(f"   * Goodput (SLO Yield):  {run_record.goodput_pct:.1f}%")
    print(f"   * Decode Throughput:    {run_record.tps_decode:.1f} tokens/sec")
    print(f"   * TTFT (P50 / P95):     {run_record.ttft_p50:.1f} ms / {run_record.ttft_p95:.1f} ms")
    print(f"   * ITL  (P50 / P95):     {run_record.itl_p50:.1f} ms / {run_record.itl_p95:.1f} ms")
    print(f"   * Max ITL (Freeze):     {run_record.max_itl:.1f} ms")
    print(f"   * Requests Completed:   {run_record.completed_requests} / {run_record.total_requests}")
    print(f"   * Total Cost:           ${run_record.total_cost_usd:.4f} USD\n")

    # Export outputs if requested
    if output_md:
        md_content = ReportExporter.generate_markdown(run_record)
        with open(output_md, "w", encoding="utf-8") as f:
            f.write(md_content)
        print(f"[EXPORT] Saved Markdown report to: {output_md}")

    if output_pdf:
        pdf_bytes = ReportExporter.generate_pdf(run_record)
        with open(output_pdf, "wb") as f:
            f.write(pdf_bytes)
        print(f"[EXPORT] Saved PDF report to: {output_pdf}")

    # Evaluate legacy Goodput gate
    gate_failed = False
    if fail_under_goodput is not None:
        if run_record.goodput_pct < fail_under_goodput:
            print(f"[FAILED] CI GATE: Goodput {run_record.goodput_pct:.1f}% is below required threshold {fail_under_goodput:.1f}%")
            gate_failed = True
        else:
            print(f"[PASSED] CI GATE: Goodput {run_record.goodput_pct:.1f}% satisfies threshold >= {fail_under_goodput:.1f}%")

    # Evaluate assertions
    if assertions:
        print("\n[CI ASSERTIONS] Evaluating Quality Gate Assertions:")
        passed, log_lines = evaluate_assertions(run_record, assertions)
        for line in log_lines:
            print(f"   {line}")
        if not passed:
            gate_failed = True

    return 1 if gate_failed else 0


def main():
    parser = argparse.ArgumentParser(description="LLMark Headless CI/CD Benchmark Runner")
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    run_parser = subparsers.add_parser("run", help="Run a benchmark from a configuration file")
    run_parser.add_argument("--config", type=str, help="Path to YAML or JSON config file")
    run_parser.add_argument("--vendor", type=str, default="mock", help="Vendor name (mock, openai, anthropic, openai_compatible)")
    run_parser.add_argument("--model", type=str, default="gpt-4o", help="Model identifier")
    run_parser.add_argument("--preset", type=str, default="chat", help="Workload preset (chat, rag, code, etc.)")
    run_parser.add_argument("--concurrency", type=int, default=5, help="Number of concurrent workers")
    run_parser.add_argument("--duration", type=int, default=15, help="Benchmark duration in seconds")
    run_parser.add_argument("--spend-cap", type=float, default=2.0, help="Hard spend cap in USD")
    run_parser.add_argument("--fail-under-goodput", type=float, default=None, help="Fail with exit code 1 if Goodput % is below this value")
    run_parser.add_argument("--assert", "-a", dest="assertions", action="append", help="Assertion rule e.g. 'p95_ttft < 800' or 'goodput >= 95' (can be specified multiple times)")
    run_parser.add_argument("--output-md", type=str, default=None, help="Output path for Markdown summary report")
    run_parser.add_argument("--output-pdf", type=str, default=None, help="Output path for executive PDF report")

    args = parser.parse_args()

    if args.command != "run":
        parser.print_help()
        sys.exit(0)

    # Build or load configuration
    if args.config:
        config = load_config_from_file(args.config)
    else:
        config = BenchmarkConfig(
            name="CLI Benchmark Run",
            vendor=VendorType(args.vendor),
            model=args.model,
            workload_preset=WorkloadPreset(args.preset),
            concurrency=args.concurrency,
            duration_seconds=args.duration,
            hard_spend_cap=args.spend_cap,
            warmup_requests=1,
            slo=SLOThresholds(max_ttft_ms=1500.0, max_tpot_ms=50.0, max_e2e_ms=10000.0),
        )

    exit_code = asyncio.run(
        run_headless_benchmark(
            config=config,
            fail_under_goodput=args.fail_under_goodput,
            assertions=args.assertions,
            output_md=args.output_md,
            output_pdf=args.output_pdf,
        )
    )

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
