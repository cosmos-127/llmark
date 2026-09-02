import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AdminHeader } from "./components/admin-layout/AdminHeader";
import { LandingPage } from "./pages/LandingPage";
import { BenchmarkPage } from "./pages/BenchmarkPage";
import { DiffPage } from "./pages/DiffPage";
import { HistoryPage } from "./pages/HistoryPage";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./lib/theme";
import { NavTab } from "./lib/types";
import { LLMarkLogo } from "./components/common/BrandLogos";
import { triggerBackendWarmup, useBackendWarmup } from "./hooks/useBackendWarmup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("landing");
  const [historyInitialView, setHistoryInitialView] = useState<"history" | "roi">("history");
  const [historySelectedRunId, setHistorySelectedRunId] = useState<string | null>(null);

  // Initialize background backend warmup
  useBackendWarmup(true);

  // Automatically scroll to top and warm up backend when navigating (especially to Studio)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (activeTab === "benchmark") {
      triggerBackendWarmup();
    }
  }, [activeTab]);

  const handleNavigateToHistory = (view?: "history" | "roi", runId?: string) => {
    if (view) setHistoryInitialView(view);
    if (runId) setHistorySelectedRunId(runId);
    setActiveTab("history");
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col font-sans relative overflow-x-clip transition-colors duration-200">
            {/* Ambient Grid & Palette Glows */}
            <div className="fixed inset-0 bg-grid-pattern opacity-40 pointer-events-none z-0" />
            <div className="fixed -top-28 left-1/2 -translate-x-1/2 w-[900px] max-w-[100vw] h-[450px] ambient-glow-plum pointer-events-none z-0" />
            <div className="fixed top-1/4 -right-16 w-[600px] h-[600px] ambient-glow-deepplum pointer-events-none z-0" />
            <div className="fixed -bottom-20 left-1/12 w-[520px] h-[520px] ambient-glow-charcoal pointer-events-none z-0" />

            {/* Unified Sticky Top Navigation Bar — Persistent in ALL views */}
            <AdminHeader
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            {/* Main Application Canvas */}
            <div className="flex-1 flex flex-col min-w-0 z-10 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex-1 flex flex-col"
                >
                  {activeTab === "landing" && (
                    <LandingPage onNavigate={(tab: NavTab) => {
                      if (tab === "history") {
                        setHistoryInitialView("history");
                      }
                      setActiveTab(tab);
                    }} />
                  )}

                  {activeTab !== "landing" && (
                    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7">
                      {activeTab === "benchmark" && <BenchmarkPage />}
                      {activeTab === "diff" && <DiffPage />}
                      {activeTab === "history" && (
                        <HistoryPage
                          initialView={historyInitialView}
                          initialRunId={historySelectedRunId}
                          onNavigateToBenchmark={() => setActiveTab("benchmark")}
                        />
                      )}
                    </main>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Unified Clean Minimalist Footer */}
            <footer className="z-10 border-t border-[var(--border-subtle)] bg-[var(--bg-header)] backdrop-blur-xs py-4 px-6 text-xs text-[var(--text-muted)] font-sans transition-colors duration-200">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setActiveTab("landing")}
                    className="flex items-center gap-2 font-semibold text-[var(--text-main)] hover:text-[var(--brand-primary)] cursor-pointer transition-colors group"
                  >
                    <LLMarkLogo className="h-4.5 w-4.5" />
                    <span>LLMark</span>
                  </button>
                  <span className="text-[var(--text-main)]/30 dark:text-white/20">•</span>
                  <span className="font-normal text-[var(--text-muted)]">
                    High-Precision Inference Telemetry & Load Profiler
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-sans text-[var(--text-subtle)]">
                  <span className="font-mono">FastAPI + React 19</span>
                  <span>•</span>
                  <span className="font-mono">v0.1.0</span>
                  <span>•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-sans font-medium flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    100Hz Engine Operational
                  </span>
                </div>
              </div>
            </footer>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
