import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, ShieldCheck, Lock, Server, CheckCircle, Info } from "lucide-react";
import { VendorCredential, VendorType } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
      <Card className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 relative overflow-hidden group">
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
      <Card className="relative overflow-hidden">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                  hasKey
                    ? "bg-[#853953]/10 dark:bg-[#A74B6A]/15 border-[#853953]/30 dark:border-[#A74B6A]/35 text-[#853953] dark:text-[#A74B6A] shadow-xs"
                    : "bg-[#F3F4F4] dark:bg-[#2C2C2C] border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50"
                }`}
              >
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  Ephemeral security vault
                  {hasKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </CardTitle>
                <CardDescription className="text-xs">Zero persistence • Process memory only</CardDescription>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Badge variant="emerald" className="gap-1 cursor-pointer">
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
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-4">
          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="vault-api-key">
                {vendor === "anthropic" ? "Anthropic API key" : "Provider API key"}
              </Label>
              <span className="text-xs font-mono text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">
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
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-1 top-0.5 h-8 w-8 text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
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
                  Endpoint base URL <span className="text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50 font-normal lowercase">(optional)</span>
                </Label>
                <span className="text-xs font-mono text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40">vLLM / Ollama / Groq</span>
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
                <Server className="absolute right-3 top-2.5 h-4 w-4 text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40 pointer-events-none" />
              </div>
            </div>
          )}

          <Separator className="my-2" />

          {/* Security Footnote */}
          <div className="flex items-center gap-2 text-xs text-[#2C2C2C]/50 dark:text-[#F3F4F4]/50">
            <Info className="h-3.5 w-3.5 text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40 shrink-0" />
            <span>Keys are never saved to SQLite, disk storage, or telemetry bundles.</span>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
