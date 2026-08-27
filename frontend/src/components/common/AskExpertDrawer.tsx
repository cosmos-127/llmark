import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  Copy,
  Check,
  ChevronRight,
  Lightbulb,
  BookOpen,
  Zap,
  MessageSquare,
  HelpCircle,
  Sliders,
} from "lucide-react";
import { EXPERT_KNOWLEDGE, getExpertAnswer } from "@/lib/expertKnowledge";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MarkdownRenderer } from "./MarkdownRenderer";

export interface AskExpertContext {
  topicId: string;
  title?: string;
  defaultQuestion?: string;
  contextParams?: Record<string, any>;
}

interface Message {
  id: string;
  sender: "user" | "expert";
  text: string;
  topic?: string;
  suggestedFollowups?: string[];
  timestamp: string;
}

interface AskExpertDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context?: AskExpertContext | null;
  vendor?: string;
  model?: string;
}

export const AskExpertDrawer: React.FC<AskExpertDrawerProps> = ({
  isOpen,
  onClose,
  context,
  vendor = "openai_compatible",
  model = "gpt-4o-mini",
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize or update conversation when context changes
  useEffect(() => {
    if (context && isOpen) {
      const initialQA = getExpertAnswer(context.defaultQuestion || context.title || "", context.topicId);
      const article = EXPERT_KNOWLEDGE[context.topicId];
      const initialTopic = article ? article.topic : initialQA.topic;
      const initialAnswer = article ? article.markdown : initialQA.answer;
      const initialFollowups = article ? article.suggestedFollowups : initialQA.followups;

      // Set initial welcome / context message
      setMessages([
        {
          id: "msg-welcome",
          sender: "expert",
          text: initialAnswer,
          topic: initialTopic,
          suggestedFollowups: initialFollowups,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      if (context.defaultQuestion) {
        setInputQuery(context.defaultQuestion);
      }
    } else if (isOpen && messages.length === 0) {
      // Default welcome message
      const defaultArticle = EXPERT_KNOWLEDGE["workload-preset"];
      setMessages([
        {
          id: "msg-default-welcome",
          sender: "expert",
          text: `### 🤖 Welcome to the LLMark Inference Copilot\n\nAsk me anything about LLM benchmarking theory, queuing models, GPU VRAM sizing, or setting production SLO thresholds.\n\nClick any topic chip below or type your question:`,
          topic: "Benchmark Guidance",
          suggestedFollowups: [
            "Why is TTFT critical for RAG vs. Chat?",
            "What is Goodput and why is it superior to Raw Throughput?",
            "How to find the saturation cliff of a cluster?",
            "Why use Temperature = 0 for throughput tests?",
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [context, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      // Check local dedicated QA resolution first for sub-millisecond precision
      const localResolved = getExpertAnswer(textToSend, context?.topicId);

      // Try backend API for potential live dynamic updates
      let resAnswer = localResolved.answer;
      let resTopic = localResolved.topic;
      let resFollowups = localResolved.followups;

      try {
        const res = await api.askExpert({
          query: textToSend,
          context_topic: context?.topicId,
          vendor,
          model,
        });
        if (res && res.answer) {
          resAnswer = res.answer;
          resTopic = res.topic;
          resFollowups = res.suggested_followups;
        }
      } catch {
        // Fallback already prepared via localResolved
      }

      // Small natural micro-delay for smooth animation feedback
      await new Promise((r) => setTimeout(r, 180));

      const expertMsg: Message = {
        id: `expert-${Date.now()}`,
        sender: "expert",
        text: resAnswer,
        topic: resTopic,
        suggestedFollowups: resFollowups,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, expertMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([]);
    setInputQuery("");
    if (context && EXPERT_KNOWLEDGE[context.topicId]) {
      const article = EXPERT_KNOWLEDGE[context.topicId];
      setMessages([
        {
          id: "msg-welcome-reset",
          sender: "expert",
          text: article.markdown,
          topic: article.topic,
          suggestedFollowups: article.suggestedFollowups,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Sheet Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-[#1E1E20] border-l border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header with Micro-Animations */}
            <div className="p-4 px-5 border-b border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-[#F3F4F4]/70 dark:bg-[#252426]/90 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.08, rotate: 5 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#853953]/15 dark:bg-[#A74B6A]/20 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/30 dark:border-[#A74B6A]/40 shadow-xs cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F3F4F4] font-sans">
                      Ask the Inference Expert
                    </h3>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Badge variant="purple" className="text-[10px] py-0 px-1.5 font-medium shadow-2xs">
                        AI Copilot
                      </Badge>
                    </motion.div>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 truncate max-w-[240px]">
                    {context?.title ? `Context: ${context.title}` : `Target: ${model}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReset}
                    title="Reset conversation"
                    className="h-8 w-8 text-[#2C2C2C]/60 hover:text-[#2C2C2C] dark:text-[#F3F4F4]/60 dark:hover:text-[#F3F4F4] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 text-[#2C2C2C]/60 hover:text-[#2C2C2C] dark:text-[#F3F4F4]/60 dark:hover:text-[#F3F4F4] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Quick Context Topic Ribbon */}
            <div className="px-4 py-2 bg-[#853953]/5 dark:bg-[#A74B6A]/5 border-b border-[#853953]/10 dark:border-[#A74B6A]/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
              <span className="text-[#853953] dark:text-[#A74B6A] font-semibold shrink-0 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Topics:
              </span>
              {Object.entries(EXPERT_KNOWLEDGE).map(([key, item]) => {
                const isActive = context?.topicId === key;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setMessages([
                        {
                          id: `topic-${key}-${Date.now()}`,
                          sender: "expert",
                          text: item.markdown,
                          topic: item.topic,
                          suggestedFollowups: item.suggestedFollowups,
                          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        },
                      ]);
                      setInputQuery(item.defaultQuestion);
                    }}
                    className={`px-2.5 py-1 rounded-md shrink-0 transition-all font-medium text-[11px] cursor-pointer ${
                      isActive
                        ? "bg-[#853953] text-white dark:bg-[#A74B6A] shadow-xs"
                        : "bg-white dark:bg-[#252426] text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:bg-[#853953]/15 hover:text-[#853953] dark:hover:text-[#A74B6A] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10"
                    }`}
                  >
                    {item.topic.split(" ")[0]}
                  </motion.button>
                );
              })}
            </div>

            {/* Chat Body / Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <AnimatePresence mode="popLayout">
                {messages.map((msg, idx) => {
                  const isUser = msg.sender === "user";
                  return (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", damping: 26, stiffness: 340 }}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 px-1">
                        {isUser ? (
                          <>
                            <span>You</span>
                            <span>•</span>
                            <span>{msg.timestamp}</span>
                          </>
                        ) : (
                          <>
                            <Bot className="h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
                            <span className="font-semibold text-[#853953] dark:text-[#A74B6A]">
                              {msg.topic || "Inference Expert"}
                            </span>
                            <span>•</span>
                            <span>{msg.timestamp}</span>
                          </>
                        )}
                      </div>

                      <motion.div
                        layout
                        className={`relative group max-w-[94%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? "bg-[#853953] dark:bg-[#A74B6A] text-white rounded-tr-xs shadow-xs"
                            : "bg-[#F3F4F4] dark:bg-[#252426] text-[#2C2C2C] dark:text-[#F3F4F4] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 rounded-tl-xs shadow-2xs"
                        }`}
                      >
                        {/* Formatted Markdown Content */}
                        {isUser ? (
                          <div className="font-sans whitespace-pre-wrap">{msg.text}</div>
                        ) : (
                          <MarkdownRenderer content={msg.text} />
                        )}

                        {/* Copy action for expert answers */}
                        {!isUser && (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-white/80 dark:bg-[#1E1E20]/80 text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#853953] dark:hover:text-[#A74B6A] shadow-2xs cursor-pointer"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="h-3 w-3 text-emerald-600 animate-in zoom-in-50 duration-200" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </motion.button>
                        )}
                      </motion.div>

                      {/* Suggested Follow-up Prompts with Micro-Animations */}
                      {!isUser && msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="pt-1.5 space-y-1.5 w-full pl-1"
                        >
                          <span className="text-[10px] font-semibold text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3 text-amber-500" /> Suggested questions:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.suggestedFollowups.map((followup, idx) => (
                              <motion.button
                                key={idx}
                                type="button"
                                whileHover={{ scale: 1.025, x: 2 }}
                                whileTap={{ scale: 0.975 }}
                                onClick={() => handleSendMessage(followup)}
                                className="text-[11px] text-left py-1 px-2.5 rounded-lg bg-white dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 hover:border-[#853953]/50 dark:hover:border-[#A74B6A]/50 text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 hover:text-[#853953] dark:hover:text-[#A74B6A] hover:bg-[#853953]/5 dark:hover:bg-[#A74B6A]/5 shadow-2xs transition-all flex items-center gap-1.5 group cursor-pointer"
                              >
                                <span>{followup}</span>
                                <ChevronRight className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform text-[#853953] dark:text-[#A74B6A]" />
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Pulsing AI Wave Micro-Animation */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#F3F4F4] dark:bg-[#252426] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-xs text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 w-fit shadow-2xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A] animate-spin" />
                  <span className="font-medium">Synthesizing inference analysis</span>
                  <div className="flex items-center gap-1 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#853953] dark:bg-[#A74B6A] animate-bounce" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar with Accent Glow */}
            <div className="p-3.5 border-t border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 bg-white dark:bg-[#1E1E20]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1 group">
                  <Input
                    ref={inputRef}
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask about TTFT, Goodput, VRAM sizing, or load curves..."
                    className="pr-9 text-xs h-9.5 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#252426] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 focus:border-[#853953] dark:focus:border-[#A74B6A] transition-all focus:ring-1 focus:ring-[#853953]/20"
                  />
                  {inputQuery && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      type="button"
                      onClick={() => setInputQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2C2C2C]/40 hover:text-[#2C2C2C] dark:text-[#F3F4F4]/40 dark:hover:text-[#F3F4F4] cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </motion.button>
                  )}
                </div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="submit"
                    disabled={!inputQuery.trim() || isLoading}
                    size="sm"
                    className="h-9.5 px-3.5 rounded-xl bg-[#853953] hover:bg-[#722f46] text-white dark:bg-[#A74B6A] dark:hover:bg-[#913f5b] shadow-xs cursor-pointer transition-transform"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
