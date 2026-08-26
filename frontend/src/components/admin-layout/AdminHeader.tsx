import React from "react";
import {
  Menu,
  Zap,
  GitCompare,
  History,
  ShieldCheck,
  Cpu,
  RotateCcw,
  Sparkles,
  Command,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/lib/theme";
import { NavTab } from "./AppSidebar";

interface AdminHeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
}) => {
  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case "benchmark":
        return "Benchmark studio";
      case "diff":
        return "Head-to-head diff matrix";
      case "history":
        return "Benchmark history & export";
      default:
        return "Dashboard";
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white/90 dark:bg-[#252426]/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md transition-colors duration-200">
        {/* Left: Mobile Toggle & Breadcrumb */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="lg:hidden h-8 w-8 text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4] hover:bg-[#F3F4F4] dark:hover:bg-[#2C2C2C]"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 text-xs font-sans">
            <span className="text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-normal">LLMark</span>
            <span className="text-[#2C2C2C]/30 dark:text-[#F3F4F4]/30">/</span>
            <span className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4]">{getTabBreadcrumb()}</span>
          </div>
        </div>

        {/* Right: Quick Telemetry, Tab Switcher & Theme Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Tab Switcher Pills */}
          <div className="hidden sm:flex items-center gap-1 rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] p-1 border border-[#2C2C2C]/15 dark:border-[#F3F4F4]/15 text-[11px] font-sans transition-colors duration-200">
            <button
              onClick={() => setActiveTab("benchmark")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "benchmark"
                  ? "bg-white dark:bg-[#252426] text-[#853953] dark:text-[#A74B6A] font-bold shadow-xs border border-[#853953]/20 dark:border-[#A74B6A]/30"
                  : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
              }`}
            >
              <Zap className="h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
              Studio
            </button>
            <button
              onClick={() => setActiveTab("diff")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "diff"
                  ? "bg-white dark:bg-[#252426] text-[#612D53] dark:text-[#C57BB2] font-bold shadow-xs border border-[#612D53]/20 dark:border-[#7E3B6C]/30"
                  : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
              }`}
            >
              <GitCompare className="h-3 w-3 text-[#612D53] dark:text-[#C57BB2]" />
              Diff
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-[#252426] text-[#2C2C2C] dark:text-[#F3F4F4] font-bold shadow-xs border border-[#2C2C2C]/20 dark:border-[#F3F4F4]/20"
                  : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
              }`}
            >
              <History className="h-3 w-3 text-[#2C2C2C] dark:text-[#F3F4F4]" />
              History
            </button>
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle variant="icon" />

          {/* Status Indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 border border-emerald-200 dark:border-emerald-800 text-xs font-sans font-medium text-emerald-800 dark:text-emerald-300 shadow-xs cursor-pointer">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Engine ready</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Backend API & telemetry stream connected</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
};
