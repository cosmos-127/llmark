import React from "react";
import { motion } from "framer-motion";
import {
  Zap,
  History,
  GitCompare,
  ShieldCheck,
  Cpu,
  Sparkles,
  Server,
  Layers,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Sliders,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { NavTab } from "@/lib/types";

interface AppSidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
}) => {
  const navItems = [
    {
      id: "landing" as NavTab,
      label: "Home overview",
      icon: Sparkles,
      badge: "Hub",
      badgeVariant: "default" as const,
      description: "Landing hub with core operations",
    },
    {
      id: "benchmark" as NavTab,
      label: "Benchmark studio",
      icon: Zap,
      badge: "Live",
      badgeVariant: "default" as const,
      description: "Interactive real-time endpoint stress tester",
    },
    {
      id: "diff" as NavTab,
      label: "Diff matrix",
      icon: GitCompare,
      badge: "Diff",
      badgeVariant: "violet" as const,
      description: "Compare candidate runs vs baseline benchmarks",
    },
    {
      id: "history" as NavTab,
      label: "History explorer",
      icon: History,
      badge: "SQLite",
      badgeVariant: "secondary" as const,
      description: "Inspect persisted runs, unaggregated tail percentiles & exports",
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "sticky top-0 z-30 flex h-screen min-h-screen max-h-screen flex-col justify-between shrink-0 self-stretch border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] backdrop-blur-md transition-all duration-300 select-none overflow-y-auto",
          collapsed ? "w-18" : "w-64"
        )}
      >
        {/* Sidebar Header / Brand */}
        <div>
          <div className="flex h-16 items-center justify-between px-4 border-b border-[var(--border-subtle)]">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("landing")}
              className="flex items-center gap-3 cursor-pointer overflow-hidden group"
              title="Return to Landing Page"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl btn-brand-glow shadow-sm group-hover:scale-105 transition-transform">
                <Zap className="h-4.5 w-4.5 text-white fill-white" />
              </div>
              {!collapsed && (
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tracking-normal text-[var(--text-main)] font-sans">
                      LLMark
                    </span>
                    <span className="text-[var(--brand-primary)] text-xs font-semibold tracking-wide">
                      Stream
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate font-sans font-medium tracking-wide">v0.1.0-alpha</p>
                </div>
              )}
            </motion.div>

            {/* Collapse toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex h-7 w-7 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)]"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Nav Links */}
          <div className="space-y-1 p-3">
            {!collapsed && (
              <p className="px-3 pt-2 pb-1.5 text-xs font-semibold text-[var(--text-subtle)] font-sans">
                Benchmark suite
              </p>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const buttonContent = (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-xl p-2.5 text-xs font-medium transition-all cursor-pointer font-sans select-none",
                    isActive
                      ? "text-[var(--brand-primary)] font-semibold"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-main)]"
                  )}
                >
                  {/* Sliding active background indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="active-sidebar-pill"
                      className="absolute inset-0 rounded-xl bg-[var(--brand-primary-light)] border border-[var(--brand-primary-border)] shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}

                  <div
                    className={cn(
                      "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-[var(--brand-primary)] text-white shadow-xs"
                        : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] group-hover:text-[var(--text-main)] group-hover:bg-[var(--bg-surface-hover)]"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", isActive && "fill-white")} />
                  </div>
                  {!collapsed && (
                    <div className="relative z-10 flex flex-1 items-center justify-between truncate">
                      <span className="truncate">{item.label}</span>
                      <Badge variant={isActive ? "default" : "secondary"} className="text-[11px] px-2 py-0.5 font-medium">
                        {item.badge}
                      </Badge>
                    </div>
                  )}
                </button>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-[11px] text-[var(--text-muted)] font-normal">{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return buttonContent;
            })}
          </div>
        </div>

        {/* Sidebar Footer Engine Info & Theme Switcher */}
        <div className="border-t border-[var(--border-subtle)] p-3 space-y-2">
          {/* Theme Switcher in Sidebar */}
          <div className="rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
            <ThemeToggle variant="sidebar" collapsed={collapsed} />
          </div>

          {!collapsed ? (
            <div className="rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] p-3 space-y-2 font-sans text-xs">
              <div className="flex items-center justify-between text-[var(--text-main)]">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  In-memory session
                </span>
                <Badge variant="emerald" className="text-[11px] py-0 px-1.5 font-medium">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[var(--text-main)]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Cpu className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  SQLite WAL
                </span>
                <span className="text-[var(--text-main)] font-medium font-sans text-[11px] tracking-wide">Local</span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-main)]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Gauge className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                  SSE telemetry
                </span>
                <span className="text-[var(--brand-primary)] font-medium font-sans text-[11px] tracking-wide">100Hz</span>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center p-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] cursor-pointer">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>System online: In-memory session & SQLite WAL active</p>
              </TooltipContent>
            </Tooltip>
          )}

          {!collapsed && (
            <div className="px-2 pt-0.5 text-[11px] text-[var(--text-subtle)] font-medium text-center tracking-tight">
              LLMark Benchmark Engine
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};
