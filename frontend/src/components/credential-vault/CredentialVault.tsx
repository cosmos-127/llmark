import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Eye, EyeOff, ShieldCheck, Lock, Server, CheckCircle, Info } from "lucide-react";
import { VendorCredential, VendorType } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProviderLogo } from "@/components/common/BrandLogos";

interface CredentialVaultProps {
  vendor: VendorType;
  credential: VendorCredential;
  onChange: (cred: VendorCredential) => void;
}

export const CredentialVault: React.FC<CredentialVaultProps> = ({
  vendor,
  credential,
  onChange,
}) => {
  const [showKey, setShowKey] = useState(false);

  if (vendor === "mock") {
    return (
      <Card className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 relative overflow-hidden group shadow-xs">
        <CardContent className="p-5 flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-emerald-950 dark:text-emerald-200 tracking-normal">Mock inference active</h4>
              <Badge variant="emerald">
                100% Free
              </Badge>
            </div>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
              Zero API tokens required. Emulates authentic TTFT latency distributions, DeepSeek-R1 reasoning traces, and token jitter in local RAM.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isCustomUrlAllowed = vendor === "openai_compatible" || vendor === "openai";
  const hasKey = !!credential.api_key && credential.api_key.trim().length > 0;

  return (
    <TooltipProvider>
      <Card className="relative overflow-hidden shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <motion.div
                animate={hasKey ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.3 }}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                  hasKey
                    ? "bg-[#853953]/10 dark:bg-[#D84577]/15 border-[#853953]/30 dark:border-[#E05284]/35 text-[#853953] dark:text-[#F06A9A] shadow-xs"
                    : "bg-[#F3F4F4] dark:bg-[#0B0B0E] border-[#2C2C2C]/10 dark:border-white/10 text-[#2C2C2C]/50 dark:text-slate-400"
                }`}
              >
                {hasKey ? <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Lock className="h-4 w-4" />}
              </motion.div>
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  API Key Configuration
                  {hasKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </CardTitle>
                <CardDescription className="text-xs">Process memory only • Scrubbed on session end</CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 font-sans">
                <ProviderLogo vendor={vendor} className="h-3.5 w-3.5" />
                <span className="text-[11px] font-sans font-medium capitalize text-[#2C2C2C]/80 dark:text-slate-200">
                  {vendor.replace("_", " ")}
                </span>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Badge variant="emerald" className="gap-1 cursor-pointer text-[11px]">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Scrubbed</span>
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tokens are wiped immediately when session terminates or browser tab is closed.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-4 font-sans">
          {/* Special GCP / Gemini 2-Option Vault View */}
          {vendor === "gcp_vertex" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...credential, gcp_auth_mode: "api_key" })}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    (credential.gcp_auth_mode || "api_key") === "api_key"
                      ? "bg-[#853953]/10 dark:bg-[#D84577]/15 border-[#853953]/50 dark:border-[#E05284]/50 text-[#853953] dark:text-[#F06A9A] ring-1 ring-[#853953]/30 shadow-xs"
                      : "bg-white dark:bg-[#0F0F13] border-[#2C2C2C]/10 dark:border-white/10 hover:bg-[#F3F4F4] text-[#2C2C2C] dark:text-white"
                  }`}
                >
                  <span className="text-xs font-semibold block">Gemini API Key</span>
                  <span className="text-[10px] text-[#2C2C2C]/60 dark:text-slate-400">Google AI Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...credential, gcp_auth_mode: "vertex_ai" })}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    credential.gcp_auth_mode === "vertex_ai"
                      ? "bg-[#853953]/10 dark:bg-[#D84577]/15 border-[#853953]/50 dark:border-[#E05284]/50 text-[#853953] dark:text-[#F06A9A] ring-1 ring-[#853953]/30 shadow-xs"
                      : "bg-white dark:bg-[#0F0F13] border-[#2C2C2C]/10 dark:border-white/10 hover:bg-[#F3F4F4] text-[#2C2C2C] dark:text-white"
                  }`}
                >
                  <span className="text-xs font-semibold block">GCP Project ID</span>
                  <span className="text-[10px] text-[#2C2C2C]/60 dark:text-slate-400">Vertex AI VPC</span>
                </button>
              </div>

              {(credential.gcp_auth_mode || "api_key") === "api_key" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vault-gemini-key">Gemini API key</Label>
                    <span className="text-xs text-[#853953] dark:text-[#F06A9A] font-medium font-sans">
                      aistudio.google.com
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="vault-gemini-key"
                      type={showKey ? "text" : "password"}
                      value={credential.api_key || ""}
                      onChange={(e) => onChange({ ...credential, api_key: e.target.value })}
                      placeholder="AIzaSy..."
                      className="pr-10 font-sans text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-1 top-0.5 h-8 w-8 text-[#2C2C2C]/50 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                    >
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="vault-gcp-proj">GCP Project ID</Label>
                    <Input
                      id="vault-gcp-proj"
                      value={credential.gcp_project_id || ""}
                      onChange={(e) => onChange({ ...credential, gcp_project_id: e.target.value })}
                      placeholder="my-gcp-project-123"
                      className="font-sans text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="vault-gcp-loc">GCP Region</Label>
                    <Input
                      id="vault-gcp-loc"
                      value={credential.gcp_location || "us-central1"}
                      onChange={(e) => onChange({ ...credential, gcp_location: e.target.value })}
                      placeholder="us-central1"
                      className="font-sans text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* API Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vault-api-key">
                    {vendor === "anthropic" ? "Anthropic API key" : "Provider API key"}
                  </Label>
                  <span className="text-xs font-sans text-[#2C2C2C]/50 dark:text-slate-400">
                    {hasKey ? "Key loaded" : "Required for live test"}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="vault-api-key"
                    type={showKey ? "text" : "password"}
                    value={credential.api_key || ""}
                    onChange={(e) => onChange({ ...credential, api_key: e.target.value })}
                    placeholder={vendor === "anthropic" ? "sk-ant-api03-..." : "sk-proj-..."}
                    className="pr-10 font-sans text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-1 top-0.5 h-8 w-8 text-[#2C2C2C]/50 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Base URL (for vLLM/Groq/Together/Ollama) */}
              {isCustomUrlAllowed && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vault-base-url">
                      Endpoint base URL <span className="text-[#2C2C2C]/50 dark:text-slate-400 font-normal lowercase">(optional)</span>
                    </Label>
                    <span className="text-xs font-sans text-[#2C2C2C]/50 dark:text-slate-400">vLLM / Ollama / Groq</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="vault-base-url"
                      type="text"
                      value={credential.base_url || ""}
                      onChange={(e) => onChange({ ...credential, base_url: e.target.value })}
                      placeholder="e.g. http://localhost:8000/v1 or https://api.groq.com/openai/v1"
                      className="pr-9"
                    />
                    <Server className="absolute right-3 top-2.5 h-4 w-4 text-[#2C2C2C]/40 dark:text-slate-500 pointer-events-none" />
                  </div>
                </div>
              )}
            </>
          )}

          <Separator className="my-2" />

          {/* Security Footnote */}
          <div className="flex items-center gap-2 text-xs text-[#2C2C2C]/50 dark:text-slate-400">
            <Info className="h-3.5 w-3.5 text-[#2C2C2C]/40 dark:text-slate-500 shrink-0" />
            <span>Keys are never saved to SQLite, disk storage, or telemetry bundles.</span>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
