import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BenchmarkConfig, VendorCredential } from "@/lib/types";
import { TestConfigurator } from "@/components/test-configurator/TestConfigurator";
import { LiveDashboard } from "@/components/live-dashboard/LiveDashboard";
import { useBenchmarkSSE } from "@/hooks/useBenchmarkSSE";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const DEFAULT_CONFIG: BenchmarkConfig = {
  name: "Production Performance Canary",
  vendor: "mock",
  model: "gpt-4o",
  credential: {},
  workload_preset: undefined,
  test_mode: "duration",

  total_requests: 50,
  max_tokens: 256,
  temperature: 0.7,
  load_curve: "constant",
  concurrency: 5,
  duration_seconds: 20,
  warmup_requests: 1,
  cache_bust: false,
  hard_spend_cap: 2.0,

  slo: {
    max_ttft_ms: 1500.0,
    max_tpot_ms: 50.0,
    max_e2e_ms: 10000.0,
    max_error_rate_pct: 1.0,
  },
};

export const BenchmarkPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<BenchmarkConfig>(DEFAULT_CONFIG);
  const [credential, setCredential] = useState<VendorCredential>({});
  const [activeBenchmarkId, setActiveBenchmarkId] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const {
    snapshot,
    timeSeries,
    budgetWarning,
    isFinished,
    isAborting,
    abort,
  } = useBenchmarkSSE(activeBenchmarkId);

  // Automatically scroll to top whenever launching benchmark or resetting back to configurator
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeBenchmarkId]);

  useEffect(() => {
    if (isFinished) {
      queryClient.invalidateQueries({ queryKey: ["benchmark-history"] });
    }
  }, [isFinished, queryClient]);

  const handleLaunch = async () => {
    setIsLaunching(true);
    setLaunchError(null);
    try {
      const payload: BenchmarkConfig = {
        ...config,
        credential: credential,
      };
      const res = await api.startBenchmark(payload);
      setActiveBenchmarkId(res.benchmark_id);
    } catch (err: any) {
      setLaunchError(err.message || "Failed to start benchmark session");
    } finally {
      setIsLaunching(false);
    }
  };

  const handleReset = () => {
    setActiveBenchmarkId(null);
  };

  return (
    <div className="space-y-6">
      {/* Launch Error Banner */}
      {launchError && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 flex items-center gap-2.5 text-xs text-rose-800 font-medium font-sans">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{launchError}</span>
          </CardContent>
        </Card>
      )}

      {/* Active Live Dashboard View or Multi-Step Benchmark Wizard */}
      {activeBenchmarkId ? (
        <LiveDashboard
          config={config}
          benchmarkId={activeBenchmarkId}
          snapshot={snapshot}
          timeSeries={timeSeries}
          budgetWarning={budgetWarning}
          isFinished={isFinished}
          isAborting={isAborting}
          onAbort={abort}
          onReset={handleReset}
        />
      ) : (
        <TestConfigurator
          config={config}
          credential={credential}
          onChange={setConfig}
          onCredentialChange={setCredential}
          onLaunch={handleLaunch}
          isLaunching={isLaunching}
        />
      )}
    </div>
  );
};
