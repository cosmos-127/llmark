import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Brain, Sparkles, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);

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
    <Card className="overflow-hidden border-[#2C2C2C]/15 shadow-sm">
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
            className="h-7 w-7 text-[#F3F4F4]/70 hover:text-white hover:bg-[#853953] dark:hover:bg-[#A74B6A] cursor-pointer active:scale-[0.96]"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>

      {/* Terminal Content Body */}
      <ScrollArea className="h-[185px] p-4 bg-[#1f1f1f] font-mono text-xs text-[#F3F4F4]">
        <div className="space-y-3">
          {/* Simulated Reasoning Thinking Stream with Spring Collapse */}
          <div className="rounded-xl bg-[#612D53]/30 border border-[#612D53]/50 p-3 space-y-1">
            <div
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center justify-between gap-1.5 text-[11px] font-bold text-[#F3F4F4] cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-[#853953]" />
                <span>Reasoning Thinking Trace (TTFA Isolation)</span>
              </div>
              <motion.div animate={{ rotate: showReasoning ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-3 w-3 text-[#F3F4F4]/60" />
              </motion.div>
            </div>
            <AnimatePresence initial={false}>
              {showReasoning && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[11px] text-[#F3F4F4]/80 leading-relaxed italic overflow-hidden"
                >
                  Analyzing concurrency parameters... Evaluating KV cache memory saturation... Calculating optimal time to first answer...
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Streaming Answer Tokens with Micro-Transitions */}
          <div className="text-[#F3F4F4] leading-relaxed space-x-1 pt-1">
            <span className="text-[#853953] font-bold select-none">&gt;&gt;</span>
            {sampleTokens.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className="inline-block bg-white/[0.08] px-1 py-0.5 rounded text-[#F3F4F4] border border-white/[0.08] text-[11px]"
              >
                {word}
              </motion.span>
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
