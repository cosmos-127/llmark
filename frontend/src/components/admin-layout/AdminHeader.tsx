import React from "react";
import { motion } from "framer-motion";
import { Icons } from "@/components/common/HugeIcons";
import { LLMarkLogo } from "@/components/common/BrandLogos";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/lib/theme";
import { NavTab } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const navTabs = [
    { id: "landing" as NavTab, label: "Overview", shortLabel: "Home", Icon: Icons.Home },
    { id: "benchmark" as NavTab, label: "Studio", shortLabel: "Studio", Icon: Icons.Benchmark },
    { id: "diff" as NavTab, label: "Compare", shortLabel: "Compare", Icon: Icons.Diff },
    { id: "history" as NavTab, label: "Runs", shortLabel: "Runs", Icon: Icons.History },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <header className="sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-header)] backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Brand Logo & Title */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0 group"
            onClick={() => setActiveTab("landing")}
            title="Return to Landing Page"
          >
            <div className="relative flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl group-hover:shadow-md group-hover:shadow-[var(--brand-primary-light)] transition-all">
              <LLMarkLogo className="h-9 w-9" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-[var(--text-heading)] font-sans">
                  LLMark
                </span>
                <span className="text-[var(--brand-primary)] text-[10px] font-semibold tracking-wider uppercase font-mono px-1.5 py-0.5 rounded-md bg-[var(--brand-primary-light)] border border-[var(--brand-primary-border)]">
                  Profiler
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono font-medium border-[var(--border-subtle)] text-[var(--text-muted)]">
                  v0.1.0
                </Badge>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-sans hidden md:block">
                Inference Telemetry & Load Profiling
              </p>
            </div>
          </motion.div>

          {/* Center: Sticky Top Nav Tab Switcher (The 4 core options) */}
          <nav className="flex items-center gap-1 bg-[var(--bg-surface-subtle)] p-1 rounded-xl border border-[var(--border-subtle)] font-sans text-xs shadow-inner">
            {navTabs.map((tab) => {
              const Icon = tab.Icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer select-none",
                    isActive
                      ? "text-[var(--brand-primary)] font-semibold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-top-nav-tab"
                      className="absolute inset-0 bg-[var(--bg-card)] rounded-lg shadow-xs border border-[var(--brand-primary-border)]"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <Icon className={cn("relative z-10 h-3.5 w-3.5", isActive && "text-[var(--brand-primary)]")} />
                  <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                  <span className="relative z-10 sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Status indicator & Theme Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>100Hz Telemetry</span>
            </div>

            {/* Theme Toggle Button */}
            <ThemeToggle variant="icon" />
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
};
