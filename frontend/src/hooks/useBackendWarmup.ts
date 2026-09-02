import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

export type BackendHealthState = "idle" | "warming" | "ready" | "error";

export interface BackendWarmupStatus {
  state: BackendHealthState;
  latencyMs: number | null;
  lastChecked: number | null;
  error: string | null;
  retryCount: number;
}

// Global shared state so all components (Header, BenchmarkPage, App) share real-time warmup status
let globalStatus: BackendWarmupStatus = {
  state: "idle",
  latencyMs: null,
  lastChecked: null,
  error: null,
  retryCount: 0,
};

let activeWarmupPromise: Promise<boolean> | null = null;
const listeners = new Set<(status: BackendWarmupStatus) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...globalStatus }));
}

/**
 * Triggers a non-blocking background health check to awaken cold-started backends (e.g. on Render).
 * Automatically debounces requests if already verified within `maxAgeMs` (default: 45 seconds).
 * If a cold start is detected or initial request fails, it automatically retries with backoff.
 */
export async function triggerBackendWarmup(force = false, maxAgeMs = 45000): Promise<boolean> {
  const now = Date.now();
  if (
    !force &&
    globalStatus.state === "ready" &&
    globalStatus.lastChecked &&
    now - globalStatus.lastChecked < maxAgeMs
  ) {
    return true;
  }

  if (activeWarmupPromise) {
    return activeWarmupPromise;
  }

  globalStatus = {
    ...globalStatus,
    state: globalStatus.state === "ready" ? "ready" : "warming",
    error: null,
  };
  notifyListeners();

  const startTime = performance.now();

  activeWarmupPromise = (async () => {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        await api.checkHealth();
        const elapsed = Math.round(performance.now() - startTime);
        globalStatus = {
          state: "ready",
          latencyMs: elapsed,
          lastChecked: Date.now(),
          error: null,
          retryCount: attempt,
        };
        notifyListeners();
        return true;
      } catch (err: any) {
        attempt++;
        if (attempt < maxAttempts) {
          // Wait 2s before retry while backend is spinning up on Render
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          const elapsed = Math.round(performance.now() - startTime);
          globalStatus = {
            state: "error",
            latencyMs: elapsed,
            lastChecked: Date.now(),
            error: err?.message || "Failed to reach backend",
            retryCount: attempt,
          };
          notifyListeners();
          return false;
        }
      }
    }
    return false;
  })().finally(() => {
    activeWarmupPromise = null;
  });

  return activeWarmupPromise;
}

export function useBackendWarmup(autoWarm = true) {
  const [status, setStatus] = useState<BackendWarmupStatus>(globalStatus);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const handleChange = (newStatus: BackendWarmupStatus) => {
      setStatus({ ...newStatus });
    };

    listeners.add(handleChange);
    // Sync current global state immediately
    setStatus({ ...globalStatus });

    if (autoWarm && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      triggerBackendWarmup(false);
    }

    return () => {
      listeners.delete(handleChange);
    };
  }, [autoWarm]);

  const warmNow = useCallback((force = true) => {
    return triggerBackendWarmup(force);
  }, []);

  return {
    ...status,
    isWarming: status.state === "warming",
    isReady: status.state === "ready",
    isError: status.state === "error",
    warmNow,
  };
}
