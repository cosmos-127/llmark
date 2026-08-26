import React from "react";
import { Terminal, Brain, Sparkles, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TokenTerminalProps {
  status: string;
  elapsedSeconds: number;
  completedRequests: number;
  currentTps: number;
}

export const TokenTerminal: React.FC<TokenTerminalProps> = ({
  status,
  elapsedSeconds,
  completedRequests,
  currentTps,
}) => {
  const [copied, setCopied] = React.useState(false);

  const sampleTokens = [
    "LLMark", "delivers", "microsecond-level", "streaming", "precision", "for",
    "benchmarking", "frontier", "models.", "Capturing", "TTFT,", "ITL,", "TPOT,", "and",
    "Goodput", "yield", "under", "concurrency", "exposes", "tail", "latency", "spikes."
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleTokens.join(" "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden border-[#2C2C2C]/15">
      {/* Terminal Titlebar */}
      <div className="bg-[#2C2C2C] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#853953]" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#F3F4F4]">
            <Terminal className="h-3.5 w-3.5 text-[#853953]" />
            <span>live_token_stream.log</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#F3F4F4]">
            <Badge variant="emerald" className="font-mono text-[10px] py-0 px-2 bg-emerald-950 text-emerald-300 border-emerald-700">
              {currentTps.toFixed(1)} tok/s
            </Badge>
            <span>•</span>
            <span className="text-[#F3F4F4]/70">{completedRequests} streams finished</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-7 w-7 text-[#F3F4F4]/70 hover:text-white hover:bg-[#612D53]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Terminal Content Body */}
      <ScrollArea className="h-[180px] p-4 bg-[#1f1f1f] font-mono text-xs text-[#F3F4F4]">
        <div className="space-y-3">
          {/* Simulated Reasoning Thinking Stream */}
          <div className="rounded-xl bg-[#612D53]/30 border border-[#612D53]/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#F3F4F4]">
              <Brain className="h-3.5 w-3.5 text-[#853953]" />
              <span>Reasoning Thinking Trace (TTFA Isolation)</span>
            </div>
            <p className="text-[11px] text-[#F3F4F4]/80 leading-relaxed italic">
              Analyzing concurrency parameters... Evaluating KV cache memory saturation... Calculating optimal time to first answer...
            </p>
          </div>

          {/* Streaming Answer Tokens */}
          <div className="text-[#F3F4F4] leading-relaxed space-x-1 pt-1">
            <span className="text-[#853953] font-bold">&gt;&gt;</span>
            {sampleTokens.map((word, i) => (
              <span
                key={i}
                className="inline-block bg-white/[0.08] px-1 py-0.5 rounded text-[#F3F4F4] border border-white/[0.08]"
              >
                {word}
              </span>
            ))}
            {status === "running" && (
              <span className="inline-block h-3.5 w-2 bg-[#853953] animate-blink ml-1 align-middle" />
            )}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
};
