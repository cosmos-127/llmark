import { useEffect, useRef, useState, useCallback } from "react";
import { MetricsSnapshot, WaterfallTiming } from "../lib/types";
import { api } from "../lib/api";

export interface TimeSeriesPoint {
  timestamp: number;
  elapsed: number;
  ttft_p95: number;
  itl_p95: number;
  tps: number;
  goodput: number;
  spend: number;
  rate_limit_pct?: number;
  rpm?: number;
  tpm?: number;
  prefill_tps_p95?: number;
  schema_validity_pct?: number;
  thinking_tokens_avg?: number;
}

export function useBenchmarkSSE(benchmarkId: string | null, onComplete?: (finalSnapshot: MetricsSnapshot) => void) {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [waterfallBaseline, setWaterfallBaseline] = useState<WaterfallTiming | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isAborting, setIsAborting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!benchmarkId) {
      setSnapshot(null);
      setWaterfallBaseline(null);
      setTimeSeries([]);
      setBudgetWarning(null);
      setIsFinished(false);
      setIsAborting(false);
      setError(null);
      return;
    }

    const url = `/api/benchmark/stream?benchmark_id=${encodeURIComponent(benchmarkId)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("connection_open", (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log("SSE Connected:", data);
      } catch (err) {
        console.error("SSE Parse Error:", err);
      }
    });

    es.addEventListener("waterfall_baseline", (e) => {
      try {
        const data = JSON.parse(e.data) as WaterfallTiming;
        setWaterfallBaseline(data);
      } catch (err) {
        console.error("Waterfall parse error:", err);
      }
    });

    es.addEventListener("progress_snapshot", (e) => {
      try {
        const data = JSON.parse(e.data) as MetricsSnapshot;
        setSnapshot(data);
        setTimeSeries((prev) => [
          ...prev.slice(-40), // Keep last 40 time-series points
          {
            timestamp: Date.now(),
            elapsed: data.elapsed_seconds,
            ttft_p95: data.ttft_p95,
            itl_p95: data.itl_p95,
            tps: data.current_tps,
            goodput: data.goodput_pct,
            spend: data.current_spend_usd,
            rate_limit_pct: data.rate_limit_pct,
            rpm: data.current_rpm || (data.current_rps || 0) * 60,
            tpm: data.current_tpm,
            prefill_tps_p95: data.prefill_tps_p95,
            schema_validity_pct: data.schema_validity_pct,
            thinking_tokens_avg: data.thinking_tokens_avg,
          },
        ]);
      } catch (err) {
        console.error("Progress snapshot parse error:", err);
      }
    });

    es.addEventListener("budget_warning", (e) => {
      try {
        const data = JSON.parse(e.data);
        setBudgetWarning(data.message || `Budget spend cap of $${data.spend_cap_usd} reached.`);
      } catch (err) {
        console.error("Budget warning parse error:", err);
      }
    });

    es.addEventListener("run_complete", (e) => {
      try {
        const data = JSON.parse(e.data) as MetricsSnapshot;
        setSnapshot(data);
        setIsFinished(true);
        es.close();
        if (onComplete) onComplete(data);
      } catch (err) {
        console.error("Run complete parse error:", err);
      }
    });

    es.onerror = (err) => {
      console.warn("SSE stream event closed or disconnected", err);
      setError("Live stream disconnected. The benchmark may still be running.");
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [benchmarkId, onComplete]);

  const abort = useCallback(async () => {
    if (!benchmarkId || isFinished || isAborting) return;
    try {
      setIsAborting(true);
      await api.abortBenchmark(benchmarkId);
      setIsFinished(true);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    } catch (err: any) {
      setError(err.message || "Failed to abort benchmark");
    } finally {
      setIsAborting(false);
    }
  }, [benchmarkId, isFinished, isAborting]);

  return {
    snapshot,
    waterfallBaseline,
    timeSeries,
    budgetWarning,
    isFinished,
    isAborting,
    error,
    abort,
  };
}
