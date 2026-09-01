import React from "react";
import { Zap, History, GitCompare, ShieldCheck, Cpu, Sparkles, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type NavTab = "benchmark" | "diff" | "history";

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <TooltipProvider delayDuration={200}>
      <header className="sticky top-0 z-40 w-full border-b border-[#2C2C2C]/10 dark:border-white/10 bg-white/90 dark:bg-[#08080A]/90 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#853953] to-[#612D53] dark:from-[#D84577] dark:to-[#8E2869] shadow-sm ring-1 ring-[#853953]/30 group cursor-pointer">
              <Zap className="h-5 w-5 text-white fill-white transition-transform duration-200 group-hover:scale-110" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-normal text-[#2C2C2C] dark:text-white font-sans flex items-center gap-1.5">
                  LLMark <span className="text-[#853953] dark:text-[#F06A9A] text-xs font-medium">Stream</span>
                </span>
                <Badge variant="default" className="text-[11px] py-0.5 font-medium">
                  v0.1.0-alpha
                </Badge>
              </div>
              <p className="text-xs text-[#2C2C2C]/60 dark:text-slate-400 font-normal tracking-normal font-sans">
                The Postman for LLM endpoints & real-time telemetry
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] p-1 border border-[#2C2C2C]/10 dark:border-white/10 shadow-xs font-sans">
            <Button
              variant={activeTab === "benchmark" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("benchmark")}
              className={`rounded-lg px-3.5 font-medium transition-all cursor-pointer ${
                activeTab === "benchmark"
                  ? "bg-[#853953] dark:bg-[#D84577] text-white shadow-xs"
                  : "text-[#2C2C2C]/70 dark:text-slate-300 hover:text-[#853953] dark:hover:text-[#F06A9A]"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              Benchmark studio
            </Button>
            <Button
              variant={activeTab === "diff" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("diff")}
              className={`rounded-lg px-3.5 font-medium transition-all cursor-pointer ${
                activeTab === "diff"
                  ? "bg-[#853953] dark:bg-[#D84577] text-white shadow-xs"
                  : "text-[#2C2C2C]/70 dark:text-slate-300 hover:text-[#853953] dark:hover:text-[#F06A9A]"
              }`}
            >
              <GitCompare className="h-3.5 w-3.5" />
              Diff matrix
            </Button>
            <Button
              variant={activeTab === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("history")}
              className={`rounded-lg px-3.5 font-medium transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-[#853953] dark:bg-[#D84577] text-white shadow-xs"
                  : "text-[#2C2C2C]/70 dark:text-slate-300 hover:text-[#853953] dark:hover:text-[#F06A9A]"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              History
            </Button>
          </nav>

          {/* Security & Engine Status Badges */}
          <div className="hidden sm:flex items-center gap-2.5 font-sans">

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Badge variant="secondary" className="gap-1.5 py-1 px-3 text-xs font-medium shadow-xs">
                    <Cpu className="h-3 w-3 text-[#612D53] dark:text-[#E270BB]" />
                    <span>SQLite WAL</span>
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Local-first high-speed persistence with write-ahead logging.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
};
