import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  Key,
  Eye,
  EyeOff,
  HelpCircle,
  ArrowUpRight,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { EXPERT_KNOWLEDGE, TOPIC_SUGGESTED_QUESTIONS, getExpertAnswer } from "@/lib/expertKnowledge";
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
  source?: string;
  model?: string;
  timestamp: string;
}

interface AskExpertDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context?: AskExpertContext | null;
  vendor?: string;
  model?: string;
  credential?: any;
}

export const AskExpertDrawer: React.FC<AskExpertDrawerProps> = ({
  isOpen,
  onClose,
  context,
  vendor = "openai_compatible",
  model = "gpt-4o-mini",
  credential,
}) => {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string>("workload-preset");

  // Groq API Key state from client
  const [groqApiKey, setGroqApiKey] = useState<string>(() => {
    return localStorage.getItem("llmark_groq_api_key") || "";
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [keySavedBadge, setKeySavedBadge] = useState(false);

  // Backend status (checks if GROQ_API_KEY is present in backend .env)
  const [backendGroqStatus, setBackendGroqStatus] = useState<{ has_groq_key: boolean; model: string }>({
    has_groq_key: false,
    model: "llama-3.3-70b-versatile",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine effective Groq API key from client or credential
  const effectiveClientGroqKey =
    groqApiKey.trim() ||
    (credential?.groq_api_key ? credential.groq_api_key.trim() : "") ||
    (vendor === "groq" || String(credential?.base_url || "").includes("groq")
      ? credential?.api_key || ""
      : "");

  const hasGroqKey = backendGroqStatus.has_groq_key || !!effectiveClientGroqKey;
  const activeGroqModel = backendGroqStatus.model || "llama-3.3-70b-versatile";

  // Query backend status when drawer opens
  useEffect(() => {
    if (isOpen) {
      api.getExpertStatus()
        .then((res) => {
          if (res) {
            setBackendGroqStatus({
              has_groq_key: res.has_groq_key,
              model: res.model || "llama-3.3-70b-versatile",
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Lock body & document scroll when drawer is open to eliminate background jitter
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // When context changes or drawer opens: focus input without auto-prefilling text
  useEffect(() => {
    if (isOpen) {
      const targetTopic = context?.topicId || "workload-preset";
      setActiveTopicId(targetTopic);
      setInputQuery("");

      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [context, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSaveGroqKey = (newKey: string) => {
    setGroqApiKey(newKey);
    if (newKey.trim()) {
      localStorage.setItem("llmark_groq_api_key", newKey.trim());
      setKeySavedBadge(true);
      setTimeout(() => setKeySavedBadge(false), 2000);
    } else {
      localStorage.removeItem("llmark_groq_api_key");
    }
  };

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
      // Build conversation history for multi-turn chat
      const historyPayload = messages.map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      // High-precision local matching fallback
      const localResolved = getExpertAnswer(textToSend, activeTopicId);
      let resAnswer = localResolved.answer;
      let resTopic = localResolved.topic;
      let resFollowups = localResolved.followups;
      let resSource = "knowledge_engine";
      let resModel: string | undefined = undefined;

      try {
        const res = await api.askExpert({
          query: textToSend,
          context_topic: activeTopicId,
          vendor,
          model,
          groq_api_key: effectiveClientGroqKey || undefined,
          credential,
          messages: historyPayload,
        });
        if (res && res.answer) {
          resAnswer = res.answer;
          resTopic = res.topic;
          resFollowups = res.suggested_followups;
          resSource = res.source;
          resModel = res.model;
        }
      } catch {
        // Fallback already prepared via localResolved
      }

      const expertMsg: Message = {
        id: `expert-${Date.now()}`,
        sender: "expert",
        text: resAnswer,
        topic: resTopic,
        suggestedFollowups: resFollowups,
        source: resSource,
        model: resModel,
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
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const activeTopicGroup =
    TOPIC_SUGGESTED_QUESTIONS[activeTopicId] || TOPIC_SUGGESTED_QUESTIONS["workload-preset"];

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] pointer-events-none flex justify-end">
          {/* Backdrop with High Z-Index & Clean Dimming to obscure all header/footer/body elements without distraction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 z-[99998] pointer-events-auto bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-over Sheet Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Inference Copilot"
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="pointer-events-auto relative z-[99999] h-full w-full max-w-lg md:max-w-xl bg-white dark:bg-[#0F0F13] border-l border-[#2C2C2C]/15 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header: Minimal yet Effective */}
            <div className="p-3.5 px-4.5 border-b border-[#2C2C2C]/10 dark:border-white/10 bg-[#F3F4F4]/80 dark:bg-[#14141B]/95 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#853953]/15 dark:bg-[#D84577]/20 text-[#853953] dark:text-[#F06A9A] border border-[#853953]/30 dark:border-[#E05284]/40 shadow-xs">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#2C2C2C] dark:text-white font-sans">
                      Inference Copilot
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowKeyInput((prev) => !prev)}
                      className="cursor-pointer"
                      title={hasGroqKey ? "Groq LLM Active" : "Click to connect Groq API key"}
                    >
                      {hasGroqKey ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 font-medium border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Groq LPU Active</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="purple"
                          className="text-[10px] py-0 px-1.5 font-medium shadow-2xs flex items-center gap-1"
                        >
                          <BookOpen className="h-2.5 w-2.5" />
                          <span>Knowledge Base</span>
                        </Badge>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400 truncate max-w-[260px]">
                    {context?.title ? `Topic: ${context.title}` : `Target: ${model}`}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    title="Clear chat conversation"
                    className="h-8 px-2.5 rounded-xl text-xs font-medium text-[#2C2C2C]/70 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-rose-500/10 border border-[#2C2C2C]/10 dark:border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-[11px] font-medium">Clear Chat</span>
                  </button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKeyInput((prev) => !prev)}
                  title="Configure Groq API Key for live AI responses"
                  className={`h-8 w-8 cursor-pointer relative ${
                    showKeyInput || hasGroqKey
                      ? "text-[#853953] dark:text-[#F06A9A] bg-[#853953]/10 dark:bg-[#D84577]/15"
                      : "text-[#2C2C2C]/60 hover:text-[#2C2C2C] dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Key className="h-3.5 w-3.5" />
                  {hasGroqKey && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  title="Close expert panel (Esc)"
                  className="h-8 w-8 text-[#2C2C2C]/60 hover:text-[#2C2C2C] dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Groq API Key Configuration Drawer Bar */}
            <AnimatePresence>
              {showKeyInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-amber-500/5 dark:bg-amber-500/10 border-b border-amber-500/20 p-3 px-4 overflow-hidden text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                      <Zap className="h-3.5 w-3.5" />
                      <span>Groq API Key (Live LLM Endpoint)</span>
                    </div>
                    {keySavedBadge && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                        <Check className="h-3 w-3" /> Saved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKeySecret ? "text" : "password"}
                        value={groqApiKey}
                        onChange={(e) => handleSaveGroqKey(e.target.value)}
                        placeholder={
                          backendGroqStatus.has_groq_key
                            ? "Active via backend .env (or override here: gsk_...)"
                            : "gsk_..."
                        }
                        className="pr-8 h-8 text-xs font-mono bg-white dark:bg-[#0B0B0E] border-[#2C2C2C]/15 dark:border-white/10 focus:border-[#853953]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeySecret((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#2C2C2C]/40 hover:text-[#2C2C2C] dark:text-slate-500 cursor-pointer"
                      >
                        {showKeySecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                    {groqApiKey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveGroqKey("")}
                        className="h-8 px-2 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#2C2C2C]/60 dark:text-slate-400 mt-1.5 leading-tight flex items-center justify-between">
                    <span>
                      {backendGroqStatus.has_groq_key
                        ? "✨ Key loaded from .env. Powered by Llama 3.3 70B at 500+ tok/s."
                        : "Key is stored in browser. You can also add GROQ_API_KEY in .env."}
                    </span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Minimal Topic Selector Ribbon */}
            <div className="px-3 py-1.5 bg-[#853953]/5 dark:bg-[#D84577]/5 border-b border-[#853953]/10 dark:border-[#E05284]/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
              {Object.entries(TOPIC_SUGGESTED_QUESTIONS).map(([key, item]) => {
                const isActive = activeTopicId === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTopicId(key)}
                    className={`px-2 py-0.5 rounded-md shrink-0 transition-all font-medium text-[11px] cursor-pointer select-none ${
                      isActive
                        ? "bg-[#853953] text-white dark:bg-[#D84577] shadow-xs"
                        : "bg-white dark:bg-[#0F0F13] text-[#2C2C2C]/70 dark:text-slate-300 hover:bg-[#853953]/15 hover:text-[#853953] dark:hover:text-[#F06A9A] border border-[#2C2C2C]/10 dark:border-white/10"
                    }`}
                  >
                    {item.title.split(" ")[0]}
                  </button>
                );
              })}
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {/* If no messages yet, show Clean Suggested Questions */}
              {messages.length === 0 ? (
                <div className="py-1 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[#2C2C2C]/80 dark:text-slate-200 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                      <span>Suggested Questions • {activeTopicGroup.title.split(" ")[0]}</span>
                    </span>
                    <span className="text-[10px] text-[#2C2C2C]/50 dark:text-slate-400">
                      Click to ask
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {activeTopicGroup.questions.map((qText, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => handleSendMessage(qText)}
                        className="text-left p-2.5 px-3 rounded-xl bg-white dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 hover:border-[#853953]/50 dark:hover:border-[#E05284]/50 hover:bg-[#853953]/5 dark:hover:bg-[#E05284]/10 shadow-2xs hover:shadow-xs transition-all group flex items-center justify-between gap-2.5 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md bg-[#853953]/10 dark:bg-[#D84577]/15 text-[#853953] dark:text-[#F06A9A] text-[9.5px] font-bold">
                            {qIdx + 1}
                          </span>
                          <span className="text-xs font-medium text-[#2C2C2C]/85 dark:text-white/85 group-hover:text-[#853953] dark:group-hover:text-[#F06A9A] transition-colors leading-snug">
                            {qText}
                          </span>
                        </div>
                        <ArrowUpRight className="h-3.5 w-3.5 text-[#2C2C2C]/30 dark:text-white/20 group-hover:text-[#853953] dark:group-hover:text-[#F06A9A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat Conversation Stream */
                <AnimatePresence mode="popLayout">
                  {messages.map((msg, idx) => {
                    const isUser = msg.sender === "user";
                    return (
                      <motion.div
                        key={msg.id || idx}
                        initial={{ opacity: 0, y: 8, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-[#2C2C2C]/50 dark:text-slate-400 px-1">
                          {isUser ? (
                            <>
                              <span>You</span>
                              <span>•</span>
                              <span>{msg.timestamp}</span>
                            </>
                          ) : (
                            <>
                              <Bot className="h-3 w-3 text-[#853953] dark:text-[#F06A9A]" />
                              <span className="font-semibold text-[#853953] dark:text-[#F06A9A]">
                                {msg.topic || "Inference Copilot"}
                              </span>
                              {msg.source === "groq_llm" || msg.source === "openai_llm" ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] py-0 px-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                >
                                  ⚡ {msg.model || "Live LLM"}
                                </Badge>
                              ) : msg.source === "key_required" ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                >
                                  🔑 Key Required
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] py-0 px-1 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10"
                                >
                                  📚 Curated Guide
                                </Badge>
                              )}
                              <span>•</span>
                              <span>{msg.timestamp}</span>
                            </>
                          )}
                        </div>

                        <div
                          className={`relative group ${
                            isUser
                              ? "max-w-[85%] p-2.5 px-3 bg-[#853953] dark:bg-[#D84577] text-white rounded-2xl rounded-tr-xs shadow-2xs text-xs font-sans leading-normal"
                              : "max-w-[92%] p-2.5 px-3.5 bg-[#F3F4F4] dark:bg-[#0B0B0E] text-[#2C2C2C] dark:text-white border border-[#2C2C2C]/10 dark:border-white/10 rounded-2xl rounded-tl-xs shadow-2xs text-xs leading-relaxed"
                          }`}
                        >
                          {/* Markdown Rendered Content */}
                          {isUser ? (
                            <div className="font-sans whitespace-pre-wrap">{msg.text}</div>
                          ) : (
                            <MarkdownRenderer content={msg.text} />
                          )}

                          {/* Copy button for Expert answers */}
                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.id, msg.text)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-white/80 dark:bg-[#0B0B0E]/80 text-[#2C2C2C]/70 dark:text-slate-300 hover:text-[#853953] dark:hover:text-[#F06A9A] shadow-2xs cursor-pointer"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? (
                                <Check className="h-3 w-3 text-emerald-600 animate-in zoom-in-50 duration-200" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Suggested Follow-up Prompt Chips */}
                        {!isUser && msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                          <div className="pt-1 space-y-1 w-full pl-0.5">
                            <span className="text-[10px] font-semibold text-[#2C2C2C]/50 dark:text-slate-400 flex items-center gap-1">
                              <Lightbulb className="h-3 w-3 text-amber-500" /> Follow-up inquiries:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {msg.suggestedFollowups.map((followup, fIdx) => (
                                <button
                                  key={fIdx}
                                  type="button"
                                  onClick={() => {
                                    setInputQuery(followup);
                                    setTimeout(() => {
                                      inputRef.current?.focus();
                                    }, 50);
                                  }}
                                  title="Fill question in input field"
                                  className="text-[10.5px] text-left py-0.5 px-2 rounded-md bg-white dark:bg-[#0F0F13] border border-[#2C2C2C]/10 dark:border-white/10 hover:border-[#853953]/50 dark:hover:border-[#E05284]/50 text-[#2C2C2C]/80 dark:text-slate-200 hover:text-[#853953] dark:hover:text-[#F06A9A] hover:bg-[#853953]/5 dark:hover:bg-[#E05284]/10 shadow-2xs transition-all flex items-center gap-1 group cursor-pointer"
                                >
                                  <span>{followup}</span>
                                  <ChevronRight className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform text-[#853953] dark:text-[#F06A9A]" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}

              {/* Pulsing AI Typing indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 text-xs text-[#2C2C2C]/70 dark:text-slate-300 w-fit shadow-2xs">
                  <Sparkles className="h-3 w-3 text-[#853953] dark:text-[#F06A9A] animate-spin" />
                  <span className="font-medium text-[11px]">
                    {hasGroqKey ? "Querying Groq Copilot..." : "Synthesizing inference analysis..."}
                  </span>
                  <div className="flex items-center gap-1 pl-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#853953] dark:bg-[#D84577] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#853953] dark:bg-[#D84577] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#853953] dark:bg-[#D84577] animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Polished Input Bar */}
            <div className="p-2.5 px-3 border-t border-[#2C2C2C]/10 dark:border-white/10 bg-white/95 dark:bg-[#0F0F13]/95 backdrop-blur-xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-1.5"
              >
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder={
                      hasGroqKey
                        ? "Ask anything about LLMs, GPU architectures, or load curves..."
                        : "Ask about TTFT, Goodput, VRAM sizing, or connect Groq..."
                    }
                    className="pr-8 text-xs h-9 rounded-lg bg-[#F3F4F4]/70 dark:bg-[#0B0B0E] border-[#2C2C2C]/15 dark:border-white/10 focus:border-[#853953] dark:focus:border-[#E05284] transition-all focus:ring-1 focus:ring-[#853953]/20"
                  />
                  {inputQuery && (
                    <button
                      type="button"
                      onClick={() => setInputQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#2C2C2C]/40 hover:text-[#2C2C2C] dark:text-slate-500 dark:hover:text-white cursor-pointer p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!inputQuery.trim() || isLoading}
                  size="sm"
                  className="h-9 px-3 rounded-lg bg-[#853953] hover:bg-[#722f46] text-white dark:bg-[#D84577] dark:hover:bg-[#E05284] shadow-xs cursor-pointer flex items-center gap-1 font-medium text-xs"
                >
                  <span>Send</span>
                  <Send className="h-3 w-3" />
                </Button>
              </form>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};


