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

  // Automatically scroll to top whenever navigating between pages / views
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
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
          <div className="min-h-screen bg-[#F3F4F4] dark:bg-[#08080A] text-[#2C2C2C] dark:text-white flex flex-col font-sans relative overflow-x-hidden transition-colors duration-200">
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
            <footer className="z-10 border-t border-[#2C2C2C]/10 dark:border-white/[0.08] bg-white/70 dark:bg-[#08080A]/90 backdrop-blur-xs py-4 px-6 text-xs text-[#2C2C2C]/60 dark:text-slate-400 font-sans transition-colors duration-200">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("landing")}
                    className="font-semibold text-[#2C2C2C] dark:text-white hover:text-[#853953] dark:hover:text-[#F06A9A] cursor-pointer transition-colors"
                  >
                    LLMark
                  </button>
                  <span className="text-[#2C2C2C]/30 dark:text-white/20">•</span>
                  <span className="font-normal">Microsecond Inference Telemetry & Benchmarking Studio</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-sans text-[#2C2C2C]/50 dark:text-slate-400">
                  <span>FastAPI + React 19</span>
                  <span>•</span>
                  <span>v0.1.0</span>
                  <span>•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-sans font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Operational
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
