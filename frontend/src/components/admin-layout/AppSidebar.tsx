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

export type NavTab = "landing" | "benchmark" | "diff" | "history";

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
      description: "Landing hub with the 3 core operations",
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
          "sticky top-0 z-30 flex h-screen min-h-screen max-h-screen flex-col justify-between shrink-0 self-stretch border-r border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white/95 dark:bg-[#212022]/95 backdrop-blur-md transition-all duration-300 select-none overflow-y-auto",
          collapsed ? "w-18" : "w-64"
        )}
      >
        {/* Sidebar Header / Brand */}
        <div>
          <div className="flex h-16 items-center justify-between px-4 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("landing")}
              className="flex items-center gap-3 cursor-pointer overflow-hidden group"
              title="Return to Landing Page"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#853953] via-[#743663] to-[#612D53] shadow-sm ring-1 ring-[#853953]/30 group-hover:scale-105 transition-transform">
                <Zap className="h-4.5 w-4.5 text-white fill-white" />
              </div>
              {!collapsed && (
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tracking-normal text-[#2C2C2C] dark:text-[#F3F4F4] font-sans">
                      LLMark
                    </span>
                    <span className="text-[#853953] dark:text-[#A74B6A] text-xs font-medium tracking-wide">
                      Stream
                    </span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 truncate font-sans font-medium tracking-wide">v0.1.0-alpha</p>
                </div>
              )}
            </motion.div>

            {/* Collapse toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex h-7 w-7 text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4] hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C]"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Nav Links */}
          <div className="space-y-1 p-3">
            {!collapsed && (
              <p className="px-3 pt-2 pb-1.5 text-xs font-semibold text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-sans">
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
                      ? "text-[#853953] dark:text-[#A74B6A] font-semibold"
                      : "text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 hover:bg-[#F3F4F4]/70 dark:hover:bg-[#2C2C2C]/50 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                  )}
                >
                  {/* Sliding active background indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="active-sidebar-pill"
                      className="absolute inset-0 rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 border border-[#853953]/30 dark:border-[#A74B6A]/40 shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}

                  <div
                    className={cn(
                      "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-[#853953] dark:bg-[#A74B6A] text-white shadow-xs"
                        : "bg-[#F3F4F4] dark:bg-[#2C2C2C] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 group-hover:text-[#2C2C2C] dark:group-hover:text-[#F3F4F4] group-hover:bg-[#e6e8e8] dark:group-hover:bg-[#353337]"
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
                      <p className="text-[11px] text-slate-300 font-normal">{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return buttonContent;
            })}
          </div>
        </div>

        {/* Sidebar Footer Engine Info & Theme Switcher */}
        <div className="border-t border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 p-3 space-y-2">
          {/* Theme Switcher in Sidebar */}
          <div className="rounded-xl bg-[#F3F4F4]/70 dark:bg-[#2C2C2C]/70 border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10">
            <ThemeToggle variant="sidebar" collapsed={collapsed} />
          </div>

          {!collapsed ? (
            <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 p-3 space-y-2 font-sans text-xs">
              <div className="flex items-center justify-between text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Ephemeral vault
                </span>
                <Badge variant="emerald" className="text-[11px] py-0 px-1.5 font-medium">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                <span className="flex items-center gap-1.5 font-medium">
                  <Cpu className="h-3.5 w-3.5 text-[#612D53] dark:text-[#C57BB2]" />
                  SQLite WAL
                </span>
                <span className="text-[#2C2C2C] dark:text-[#F3F4F4] font-medium font-sans text-[11px] tracking-wide">Local</span>
              </div>
              <div className="flex items-center justify-between text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80">
                <span className="flex items-center gap-1.5 font-medium">
                  <Gauge className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                  SSE telemetry
                </span>
                <span className="text-[#853953] dark:text-[#A74B6A] font-medium font-sans text-[11px] tracking-wide">100Hz</span>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center p-2 rounded-xl bg-[#F3F4F4] dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 cursor-pointer">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>System online: Ephemeral vault & SQLite WAL active</p>
              </TooltipContent>
            </Tooltip>
          )}

          {!collapsed && (
            <div className="px-2 pt-0.5 text-[11px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-semibold text-center tracking-wider uppercase">
              LLMark Benchmark Engine
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};
