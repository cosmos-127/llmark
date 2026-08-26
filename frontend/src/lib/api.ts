import {
  BenchmarkConfig,
  CostEstimate,
  HistoricalRunDetails,
  HistoricalRunSummary,
  RunDiffResponse,
  VendorCredential,
  VendorType,
} from "./types";

export const api = {
  async startBenchmark(config: BenchmarkConfig): Promise<{ benchmark_id: string; status: string; name: string }> {
    const res = await fetch("/api/benchmark/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to start benchmark" }));
      throw new Error(err.detail || "Failed to start benchmark");
    }
    return res.json();
  },

  async abortBenchmark(benchmarkId: string): Promise<{ benchmark_id: string; status: string }> {
    const res = await fetch(`/api/benchmark/${encodeURIComponent(benchmarkId)}/abort`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to abort benchmark" }));
      throw new Error(err.detail || "Failed to abort benchmark");
    }
    return res.json();
  },

  async getCostEstimate(params: Record<string, any>): Promise<CostEstimate> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, String(v));
      }
    });
    const res = await fetch(`/api/benchmark/cost-estimate?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to calculate cost estimate" }));
      throw new Error(err.detail || "Failed to calculate cost estimate");
    }
    return res.json();
  },

  async listModels(
    vendorOrPayload: string | { vendor: VendorType; credential?: VendorCredential },
    credential?: VendorCredential
  ): Promise<{ vendor: string; models: string[] }> {
    let vendor: string;
    let cred: VendorCredential | undefined;

    if (typeof vendorOrPayload === "object") {
      vendor = vendorOrPayload.vendor;
      cred = vendorOrPayload.credential;
    } else {
      vendor = vendorOrPayload;
      cred = credential;
    }

    const res = await fetch("/api/benchmark/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor, credential: cred || {} }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to fetch available models" }));
      throw new Error(err.detail || "Failed to fetch available models");
    }
    return res.json();
  },

  async getHistory(limit: number = 50, offset: number = 0): Promise<HistoricalRunSummary[]> {
    const res = await fetch(`/api/history?limit=${limit}&offset=${offset}`);
    if (!res.ok) {
      throw new Error("Failed to fetch benchmark history");
    }
    return res.json();
  },

  async getRunDetails(runId: string): Promise<HistoricalRunDetails> {
    const res = await fetch(`/api/history/${encodeURIComponent(runId)}`);
    if (!res.ok) {
      throw new Error("Failed to fetch run details");
    }
    return res.json();
  },

  async getDiff(runAId: string, runBId: string): Promise<RunDiffResponse> {
    const res = await fetch(`/api/diff?run_a=${encodeURIComponent(runAId)}&run_b=${encodeURIComponent(runBId)}`);
    if (!res.ok) {
      throw new Error("Failed to calculate run diff");
    }
    return res.json();
  },
};
