import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Copy,
  Check,
  Sparkles,
  Layers,
  Zap,
  Activity,
  BarChart3,
  Table as TableIcon,
  X,
  FileSpreadsheet,
  Share2,
  CheckCircle2,
  ArrowLeftRight,
  Trophy,
  ShieldCheck,
  DollarSign,
  Search,
  SlidersHorizontal,
  Info,
  Clock,
  Cpu,
  Flame,
  PieChart,
  HelpCircle,
  Network,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import { api, getApiUrl } from "@/lib/api";
import { HistoricalRunSummary, RunDiffResponse, MetricDelta } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyStateIllustration } from "@/components/common/AnimatedSvg";
import { ProviderLogo } from "@/components/common/BrandLogos";
import { downloadFile, formatMs, formatPct, formatUsd, cn } from "@/lib/utils";

export const DiffPage: React.FC = () => {
  const [runAId, setRunAId] = useState<string>("");
  const [runBId, setRunBId] = useState<string>("");
  const [runCId, setRunCId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tableSortKey, setTableSortKey] = useState<"name" | "delta_pct" | "category">("category");
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("desc");
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedDecision, setCopiedDecision] = useState(false);

  const { data: runs, isLoading: isLoadingRuns } = useQuery<HistoricalRunSummary[]>({
    queryKey: ["benchmark-history"],
    queryFn: () => api.getHistory(50, 0),
  });

  const { data: diffData, isLoading: isLoadingDiff, isError, error: diffError } = useQuery<RunDiffResponse, Error>({
    queryKey: ["benchmark-diff", runAId, runBId, runCId],
    queryFn: async () => {
      let endpoint = `/api/diff?run_a=${encodeURIComponent(runAId)}&run_b=${encodeURIComponent(runBId)}`;
      if (runCId && runCId.trim().length > 0 && runCId !== runAId && runCId !== runBId) {
        endpoint += `&run_c=${encodeURIComponent(runCId)}`;
      }
      const res = await fetch(getApiUrl(endpoint));
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to calculate run diff");
      }
      return res.json();
    },
    enabled: !!runAId && !!runBId && runAId !== runBId,
  });

  // Selected run objects
  const selectedRunA = useMemo(() => runs?.find((r) => r.id === runAId), [runs, runAId]);
  const selectedRunB = useMemo(() => runs?.find((r) => r.id === runBId), [runs, runBId]);
  const selectedRunC = useMemo(() => runs?.find((r) => r.id === runCId), [runs, runCId]);

  // Preset matching logic: Candidate B and C MUST share Run A's workload preset
  const candidateRuns = useMemo(() => {
    if (!runs) return [];
    if (!selectedRunA) return runs;
    return runs.filter((r) => (r.workload_preset || "chat") === (selectedRunA.workload_preset || "chat"));
  }, [runs, selectedRunA]);

  // Group historical runs by preset for quick presets
  const runsGroupedByPreset = useMemo(() => {
    if (!runs) return {};
    const groups: Record<string, HistoricalRunSummary[]> = {};
    runs.forEach((r) => {
      const p = r.workload_preset || "chat";
      if (!groups[p]) groups[p] = [];
      groups[p].push(r);
    });
    return groups;
  }, [runs]);

  // Re-align Run B and C if Run A's preset changes
  React.useEffect(() => {
    if (selectedRunA && selectedRunB && (selectedRunA.workload_preset || "chat") !== (selectedRunB.workload_preset || "chat")) {
      const match = candidateRuns.find((r) => r.id !== selectedRunA.id);
      setRunBId(match ? match.id : "");
    }
    if (selectedRunA && selectedRunC && (selectedRunA.workload_preset || "chat") !== (selectedRunC.workload_preset || "chat")) {
      setRunCId("");
    }
  }, [selectedRunA, selectedRunB, selectedRunC, candidateRuns]);

  // Quick Pair action handler
  const handleQuickPair = (rA: string, rB: string, rC?: string) => {
    setRunAId(rA);
    setRunBId(rB);
    if (rC) setRunCId(rC);
    else setRunCId("");
  };

  // Swap A and B
  const handleSwapAAndB = () => {
    if (!runAId || !runBId) return;
    const oldA = runAId;
    const oldB = runBId;
    setRunAId(oldB);
    setRunBId(oldA);
  };

  // Copy Decision Brief
  const handleCopyDecisionBrief = () => {
    if (!diffData) return;
    const runAName = diffData.run_a_name;
    const runBName = diffData.run_b_name;
    const runCName = diffData.run_c_name;

    let brief = `📊 **LLMark Benchmark Decision Brief**\n`;
    brief += `• **Preset**: ${(diffData.workload_preset || "chat").toUpperCase()}\n`;
    brief += `• **Baseline (A)**: ${runAName}\n`;
    brief += `• **Candidate 1 (B)**: ${runBName} (Goodput: ${diffData.goodput_delta_pct > 0 ? "+" : ""}${diffData.goodput_delta_pct}%, Cost: ${diffData.cost_delta_pct > 0 ? "+" : ""}${diffData.cost_delta_pct}%)\n`;
    if (runCName && diffData.goodput_delta_c_pct !== undefined && diffData.goodput_delta_c_pct !== null) {
      brief += `• **Candidate 2 (C)**: ${runCName} (Goodput: ${diffData.goodput_delta_c_pct > 0 ? "+" : ""}${diffData.goodput_delta_c_pct}%, Cost: ${diffData.cost_delta_c_pct! > 0 ? "+" : ""}${diffData.cost_delta_c_pct}%)\n`;
    }
    brief += `\n**Key Metric Deltas vs Baseline:**\n`;
    diffData.deltas.forEach((d) => {
      let line = `- ${d.metric_name}: A=${d.run_a_value} | B=${d.run_b_value} (${d.delta_pct > 0 ? "+" : ""}${d.delta_pct}%)`;
      if (d.run_c_value !== undefined && d.run_c_value !== null) {
        line += ` | C=${d.run_c_value} (${d.delta_c_pct! > 0 ? "+" : ""}${d.delta_c_pct}%)`;
      }
      brief += `${line}\n`;
    });

    navigator.clipboard.writeText(brief);
    setCopiedDecision(true);
    setTimeout(() => setCopiedDecision(false), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!diffData) return;
    let csv = "Metric Name,Category,Run A Value,Run B Value,B vs A Delta Pct";
    if (diffData.run_c_name) {
      csv += ",Run C Value,C vs A Delta Pct";
    }
    csv += "\n";

    diffData.deltas.forEach((d) => {
      let line = `"${d.metric_name}","${d.category || ""}",${d.run_a_value},${d.run_b_value},${d.delta_pct}%`;
      if (diffData.run_c_name) {
        line += `,${d.run_c_value !== undefined ? d.run_c_value : ""},${d.delta_c_pct !== undefined ? d.delta_c_pct + "%" : ""}`;
      }
      csv += line + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `llmark_diff_${diffData.run_a_id}_vs_${diffData.run_b_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Sort deltas for table
  const filteredAndSortedDeltas = useMemo(() => {
    if (!diffData) return [];
    let list = diffData.deltas;

    // Filter by Category
    if (categoryFilter !== "all") {
      list = list.filter((d) => d.category === categoryFilter);
    }

    // Filter by Search
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.metric_name.toLowerCase().includes(q) ||
          (d.category && d.category.toLowerCase().includes(q))
      );
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (tableSortKey === "name") {
        return tableSortDir === "asc"
          ? a.metric_name.localeCompare(b.metric_name)
          : b.metric_name.localeCompare(a.metric_name);
      }
      if (tableSortKey === "category") {
        const catA = a.category || "";
        const catB = b.category || "";
        return tableSortDir === "asc"
          ? catA.localeCompare(catB)
          : catB.localeCompare(catA);
      }
      if (tableSortKey === "delta_pct") {
        const absA = Math.abs(a.delta_pct);
        const absB = Math.abs(b.delta_pct);
        return tableSortDir === "asc" ? absA - absB : absB - absA;
      }
      return 0;
    });
  }, [diffData, categoryFilter, searchQuery, tableSortKey, tableSortDir]);

  const availableCategories = useMemo(() => {
    if (!diffData) return [];
    const cats = Array.from(new Set(diffData.deltas.map((d) => d.category).filter(Boolean))) as string[];
    return cats;
  }, [diffData]);

  // Executive Verdict Synthesis & Champions
  const executiveVerdict = useMemo(() => {
    if (!diffData) return null;

    const findDelta = (name: string) => diffData.deltas.find((d) => d.metric_name.includes(name));

    const ttftDelta = findDelta("TTFT P95");
    const itlDelta = findDelta("ITL P95");
    const tpsDelta = findDelta("Decode TPS");
    const goodputDelta = findDelta("Goodput");
    const costDelta = findDelta("Total Cost");
    const cost1kDelta = findDelta("Cost / 1K");

    // Latency evaluation (Lower is better)
    const ttftA = ttftDelta?.run_a_value ?? 99999;
    const ttftB = ttftDelta?.run_b_value ?? 99999;
    const ttftC = (diffData.run_c_name && ttftDelta?.run_c_value !== undefined && ttftDelta?.run_c_value !== null) ? ttftDelta.run_c_value : 99999;
    let minTtft = Math.min(ttftA, ttftB, ttftC);
    let latencyLeader = minTtft === ttftB ? "Candidate B" : minTtft === ttftC ? "Candidate C" : "Baseline A";

    // Throughput evaluation (Higher is better)
    const tpsA = tpsDelta?.run_a_value ?? 0;
    const tpsB = tpsDelta?.run_b_value ?? 0;
    const tpsC = (diffData.run_c_name && tpsDelta?.run_c_value !== undefined && tpsDelta?.run_c_value !== null) ? tpsDelta.run_c_value : 0;
    let maxTps = Math.max(tpsA, tpsB, tpsC);
    let tpsLeader = maxTps === tpsB ? "Candidate B" : maxTps === tpsC ? "Candidate C" : "Baseline A";

    // Goodput evaluation (Higher is better)
    const gpA = goodputDelta?.run_a_value ?? 0;
    const gpB = goodputDelta?.run_b_value ?? 0;
    const gpC = (diffData.run_c_name && goodputDelta?.run_c_value !== undefined && goodputDelta?.run_c_value !== null) ? goodputDelta.run_c_value : 0;
    let maxGp = Math.max(gpA, gpB, gpC);
    let goodputLeader = maxGp === gpB ? "Candidate B" : maxGp === gpC ? "Candidate C" : "Baseline A";

    // Cost evaluation (Lower is better)
    const costA = cost1kDelta?.run_a_value ?? costDelta?.run_a_value ?? 99999;
    const costB = cost1kDelta?.run_b_value ?? costDelta?.run_b_value ?? 99999;
    const costC = (diffData.run_c_name && cost1kDelta?.run_c_value !== undefined && cost1kDelta?.run_c_value !== null) ? cost1kDelta.run_c_value : 99999;
    let minCost = Math.min(costA, costB, costC);
    let costLeader = minCost === costB ? "Candidate B" : minCost === costC ? "Candidate C" : "Baseline A";

    // Overall Score / Recommendation
    let verdictTitle = "";
    let verdictSummary = "";
    let winnerTag = "";

    const bFaster = (ttftDelta?.delta_pct || 0) < 0;
    const bCheaper = (costDelta?.delta_pct || 0) < 0;
    const bBetterGp = (goodputDelta?.delta_pct || 0) >= 0;

    if (bFaster && bCheaper && bBetterGp) {
      winnerTag = "Candidate B Dominates";
      verdictTitle = "Strict Pareto Dominance Detected";
      verdictSummary = `Candidate B achieves ${Math.abs(ttftDelta?.delta_pct || 0)}% faster TTFT P95 while reducing inference spend by ${Math.abs(costDelta?.delta_pct || 0)}% with equal or superior SLO yield. High-confidence upgrade recommendation.`;
    } else if (bFaster && !bCheaper) {
      winnerTag = "Speed vs Cost Trade-off";
      verdictTitle = "Ultra-Low Latency with Cost Premium";
      verdictSummary = `Candidate B delivers ${Math.abs(ttftDelta?.delta_pct || 0)}% faster TTFT P95 at a ${costDelta?.delta_pct}% cost premium. Recommended for real-time interactive user-facing flows where response responsiveness is prioritized over token cost.`;
    } else if (!bFaster && bCheaper) {
      winnerTag = "Budget / High-Throughput Pick";
      verdictTitle = "High-Efficiency Cost Reduction";
      verdictSummary = `Baseline A maintains lower tail latency, but Candidate B reduces overall cost by ${Math.abs(costDelta?.delta_pct || 0)}%. Recommended for asynchronous batch processing, summarization, or background pipelines.`;
    } else {
      winnerTag = "Balanced Contenders";
      verdictTitle = "Close Performance Parity";
      verdictSummary = `Both models show closely matched latency distributions with minor variations across tail percentiles. Consult the detailed metrics matrix below for specialized SLA requirements.`;
    }

    return {
      winnerTag,
      verdictTitle,
      verdictSummary,
      latencyLeader,
      tpsLeader,
      goodputLeader,
      costLeader,
      ttftDelta: ttftDelta?.delta_pct || 0,
      tpsDelta: tpsDelta?.delta_pct || 0,
      costDelta: costDelta?.delta_pct || 0,
      goodputDelta: goodputDelta?.delta_pct || 0,
    };
  }, [diffData]);

  // Tab 1: Radar Chart Dataset (Normalized 0-100 across dimensions)
  const radarChartData = useMemo(() => {
    if (!diffData) return [];

    const getVal = (name: string, model: "a" | "b" | "c") => {
      const d = diffData.deltas.find((item) => item.metric_name.includes(name));
      if (!d) return 0;
      if (model === "a") return d.run_a_value;
      if (model === "b") return d.run_b_value;
      if (model === "c") return d.run_c_value ?? 0;
      return 0;
    };

    // TTFT Speed (Inverse latency: lower ms = higher score)
    const ttftA = getVal("TTFT P95", "a") || 500;
    const ttftB = getVal("TTFT P95", "b") || 500;
    const ttftC = getVal("TTFT P95", "c") || 500;
    const minTtft = Math.min(ttftA, ttftB, diffData.run_c_name ? ttftC : Infinity);
    const scoreTtft = (v: number) => Math.round(Math.min(100, Math.max(10, (minTtft / Math.max(v, 1)) * 100)));

    // Decode Throughput (Higher TPS = higher score)
    const tpsA = getVal("Decode TPS", "a") || 10;
    const tpsB = getVal("Decode TPS", "b") || 10;
    const tpsC = getVal("Decode TPS", "c") || 10;
    const maxTps = Math.max(tpsA, tpsB, diffData.run_c_name ? tpsC : 0);
    const scoreTps = (v: number) => Math.round(Math.min(100, Math.max(10, (v / Math.max(maxTps, 1)) * 100)));

    // Goodput Yield (Direct percentage)
    const gpA = getVal("Goodput", "a") || 90;
    const gpB = getVal("Goodput", "b") || 90;
    const gpC = getVal("Goodput", "c") || 90;

    // Cost Efficiency (Inverse cost)
    const costA = getVal("Cost / 1K", "a") || getVal("Total Cost", "a") || 0.01;
    const costB = getVal("Cost / 1K", "b") || getVal("Total Cost", "b") || 0.01;
    const costC = getVal("Cost / 1K", "c") || getVal("Total Cost", "c") || 0.01;
    const minCost = Math.min(costA, costB, diffData.run_c_name ? costC : Infinity);
    const scoreCost = (v: number) => Math.round(Math.min(100, Math.max(10, (minCost / Math.max(v, 0.0001)) * 100)));

    // Tail Stability (Inverse ratio of P99 to P50)
    const p50A = getVal("TTFT P50", "a") || 100;
    const p99A = getVal("TTFT P99", "a") || 200;
    const p50B = getVal("TTFT P50", "b") || 100;
    const p99B = getVal("TTFT P99", "b") || 200;
    const p50C = getVal("TTFT P50", "c") || 100;
    const p99C = getVal("TTFT P99", "c") || 200;
    const stabScore = (p50: number, p99: number) => Math.round(Math.min(100, Math.max(10, (p50 / Math.max(p99, p50)) * 100)));

    return [
      {
        subject: "TTFT Speed",
        fullMark: 100,
        [diffData.run_a_name]: scoreTtft(ttftA),
        [diffData.run_b_name]: scoreTtft(ttftB),
        ...(diffData.run_c_name ? { [diffData.run_c_name]: scoreTtft(ttftC) } : {}),
      },
      {
        subject: "Decode TPS",
        fullMark: 100,
        [diffData.run_a_name]: scoreTps(tpsA),
        [diffData.run_b_name]: scoreTps(tpsB),
        ...(diffData.run_c_name ? { [diffData.run_c_name]: scoreTps(tpsC) } : {}),
      },
      {
        subject: "SLO Goodput",
        fullMark: 100,
        [diffData.run_a_name]: Math.round(gpA),
        [diffData.run_b_name]: Math.round(gpB),
        ...(diffData.run_c_name ? { [diffData.run_c_name]: Math.round(gpC) } : {}),
      },
      {
        subject: "Cost Efficiency",
        fullMark: 100,
        [diffData.run_a_name]: scoreCost(costA),
        [diffData.run_b_name]: scoreCost(costB),
        ...(diffData.run_c_name ? { [diffData.run_c_name]: scoreCost(costC) } : {}),
      },
      {
        subject: "Tail Stability",
        fullMark: 100,
        [diffData.run_a_name]: stabScore(p50A, p99A),
        [diffData.run_b_name]: stabScore(p50B, p99B),
        ...(diffData.run_c_name ? { [diffData.run_c_name]: stabScore(p50C, p99C) } : {}),
      },
    ];
  }, [diffData]);

  // Tab 2: Latency Percentile Spectrum Dataset (P50, P75, P95, P99)
  const latencySpectrumData = useMemo(() => {
    if (!diffData) return [];
    const metrics = [
      { key: "TTFT P50 (ms)", label: "TTFT P50" },
      { key: "TTFT P75 (ms)", label: "TTFT P75" },
      { key: "TTFT P95 (ms)", label: "TTFT P95" },
      { key: "TTFT P99 (ms)", label: "TTFT P99" },
      { key: "ITL P50 (ms)", label: "ITL P50" },
      { key: "ITL P95 (ms)", label: "ITL P95" },
      { key: "ITL P99 (ms)", label: "ITL P99" },
      { key: "TPOT Mean (ms)", label: "TPOT Mean" },
    ];

    return metrics
      .map((m) => {
        const d = diffData.deltas.find((item) => item.metric_name === m.key);
        if (!d) return null;
        const entry: Record<string, any> = {
          metric: m.label,
          [diffData.run_a_name]: d.run_a_value,
          [diffData.run_b_name]: d.run_b_value,
        };
        if (diffData.run_c_name && d.run_c_value !== undefined && d.run_c_value !== null) {
          entry[diffData.run_c_name] = d.run_c_value;
        }
        return entry;
      })
      .filter(Boolean);
  }, [diffData]);

  // Tab 3: Waterfall Stage Decomposition (DNS -> TCP -> TLS -> Prefill/TTFT -> Decode)
  const waterfallData = useMemo(() => {
    if (!diffData) return [];
    const stages = [
      { key: "DNS Resolution", label: "DNS Lookup" },
      { key: "TCP Handshake", label: "TCP Connect" },
      { key: "TLS Handshake", label: "TLS Handshake" },
      { key: "TTFT P50", label: "Prefill (TTFT P50)" },
      { key: "ITL P50", label: "Decode (ITL P50)" },
    ];

    return stages
      .map((s) => {
        const d = diffData.deltas.find((item) => item.metric_name.includes(s.key));
        if (!d) return null;
        const entry: Record<string, any> = {
          stage: s.label,
          [diffData.run_a_name]: d.run_a_value,
          [diffData.run_b_name]: d.run_b_value,
        };
        if (diffData.run_c_name && d.run_c_value !== undefined && d.run_c_value !== null) {
          entry[diffData.run_c_name] = d.run_c_value;
        }
        return entry;
      })
      .filter(Boolean);
  }, [diffData]);

  // Tab 4: Pareto Cost vs Throughput Efficiency
  const paretoData = useMemo(() => {
    if (!diffData) return [];
    const findMetric = (name: string) => diffData.deltas.find((d) => d.metric_name.includes(name));

    const tps = findMetric("Decode TPS");
    const cost1k = findMetric("Cost / 1K") || findMetric("Total Cost");
    const goodput = findMetric("Goodput");

    const points = [
      {
        name: diffData.run_a_name,
        role: "Baseline (A)",
        color: "#612D53",
        tps: tps?.run_a_value || 0,
        cost: cost1k?.run_a_value || 0,
        goodput: goodput?.run_a_value || 100,
      },
      {
        name: diffData.run_b_name,
        role: "Candidate 1 (B)",
        color: "#E05284",
        tps: tps?.run_b_value || 0,
        cost: cost1k?.run_b_value || 0,
        goodput: goodput?.run_b_value || 100,
      },
    ];

    if (diffData.run_c_name && tps?.run_c_value !== undefined && tps?.run_c_value !== null) {
      points.push({
        name: diffData.run_c_name,
        role: "Candidate 2 (C)",
        color: "#10b981",
        tps: tps.run_c_value || 0,
        cost: cost1k?.run_c_value || 0,
        goodput: goodput?.run_c_value || 100,
      });
    }

    return points;
  }, [diffData]);

  return (
    <TooltipProvider>
      <div className="space-y-6 font-sans pb-12">
        {/* Top Header & Context Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2C2C2C]/10 dark:border-white/10 pb-5">
          <div>
            <h2 className="text-xl font-bold text-[#2C2C2C] dark:text-white tracking-tight flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#853953]/10 dark:bg-[#E05284]/15 text-[#853953] dark:text-[#F06A9A] border border-[#853953]/25 dark:border-[#E05284]/35 shadow-xs">
                <GitCompare className="h-5 w-5" />
              </div>
              <span>Model Comparison</span>
            </h2>
            <p className="text-xs text-[#2C2C2C]/60 dark:text-slate-400 mt-1">
              Side-by-side A/B/C differential analysis, tail latency distributions, and cost trade-offs.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {diffData && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDecisionBrief}
                  className="rounded-xl font-medium shadow-2xs hover:shadow-xs cursor-pointer text-xs gap-1.5 h-8.5 bg-white dark:bg-[#14141B]"
                >
                  {copiedDecision ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-[#853953] dark:text-[#F06A9A]" />}
                  <span>{copiedDecision ? "Copied to Clipboard!" : "Copy Decision Brief"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="rounded-xl font-medium shadow-2xs hover:shadow-xs cursor-pointer text-xs gap-1.5 h-8.5 bg-white dark:bg-[#14141B]"
                  title="Export raw deltas as CSV spreadsheet"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Export CSV</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-medium shadow-2xs hover:shadow-xs cursor-pointer text-xs gap-1.5 h-8.5 bg-white dark:bg-[#14141B]"
                  onClick={() => {
                    let endpoint = `/api/export/diff/pdf?run_a=${encodeURIComponent(runAId)}&run_b=${encodeURIComponent(runBId)}`;
                    if (runCId && runCId.trim().length > 0 && runCId !== runAId && runCId !== runBId) {
                      endpoint += `&run_c=${encodeURIComponent(runCId)}`;
                    }
                    downloadFile(getApiUrl(endpoint), `llmark_diff_${runAId}_vs_${runBId}.pdf`);
                  }}
                >
                  <Download className="h-3.5 w-3.5 text-[#853953] dark:text-[#F06A9A]" />
                  <span>PDF Comparison</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 3-Model Selector Cards Grid */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Run A (Baseline) */}
            <motion.div whileHover={{ y: -1 }} transition={{ duration: 0.15 }} className="w-full">
              <Card className="shadow-xs hover:shadow-sm border-l-4 border-l-[#612D53] dark:border-l-[#C14594] transition-all bg-white/80 dark:bg-[#0E0E14]/80 backdrop-blur-xs">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xs flex items-center gap-2 font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#612D53] dark:bg-[#C14594] shrink-0" />
                      <span>Run A (Baseline Anchor)</span>
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase font-medium">Baseline</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3">
                  <Select value={runAId} onValueChange={setRunAId}>
                    <SelectTrigger className="focus:border-[#612D53] dark:focus:border-[#C14594] text-xs bg-white dark:bg-[#0B0B0E] w-full">
                      <SelectValue placeholder="Select baseline run A..." />
                    </SelectTrigger>
                    <SelectContent className="max-w-[min(calc(100vw-2rem),520px)]">
                      {runs?.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">
                          <div className="flex items-center gap-2 w-full">
                            <ProviderLogo vendor={r.vendor} className="h-3.5 w-3.5 text-[#853953] dark:text-[#F06A9A] shrink-0" />
                            <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 uppercase font-medium">
                              {r.workload_preset || "chat"}
                            </span>
                            <span className="truncate font-medium">
                              {r.name} <span className="text-neutral-400 font-normal">({r.model})</span>
                            </span>
                            <span className="text-[11px] text-neutral-400 ml-auto tabular-nums font-mono">
                              {r.ttft_p95.toFixed(0)}ms
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Selected Run A Info Pill */}
                  {selectedRunA && (
                    <div className="p-2.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-[11px] space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#2C2C2C] dark:text-white truncate flex items-center gap-1.5">
                          <ProviderLogo vendor={selectedRunA.vendor} className="h-3.5 w-3.5 inline" />
                          {selectedRunA.model}
                        </span>
                        <span className="text-[#612D53] dark:text-[#E270BB] font-semibold tabular-nums">
                          {formatMs(selectedRunA.ttft_p95)} P95
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#2C2C2C]/60 dark:text-slate-400 text-[10.5px]">
                        <span>TPS: {selectedRunA.tps_decode ? selectedRunA.tps_decode.toFixed(1) : "—"} tok/s</span>
                        <span>Goodput: {formatPct(selectedRunA.goodput_pct)}</span>
                        <span>Cost: {formatUsd(selectedRunA.total_cost_usd)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Run B (Candidate 1) */}
            <motion.div whileHover={{ y: -1 }} transition={{ duration: 0.15 }} className="w-full">
              <Card className="shadow-xs hover:shadow-sm border-l-4 border-l-[#853953] dark:border-l-[#E05284] transition-all bg-white/80 dark:bg-[#0E0E14]/80 backdrop-blur-xs">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xs flex items-center gap-2 font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#853953] dark:bg-[#E05284] shrink-0" />
                      <span>Run B (Candidate 1)</span>
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase font-medium">Candidate</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3">
                  <Select value={runBId} onValueChange={setRunBId}>
                    <SelectTrigger className="focus:border-[#853953] dark:focus:border-[#E05284] text-xs bg-white dark:bg-[#0B0B0E] w-full">
                      <SelectValue placeholder="Select candidate run B..." />
                    </SelectTrigger>
                    <SelectContent className="max-w-[min(calc(100vw-2rem),520px)]">
                      {candidateRuns?.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">
                          <div className="flex items-center gap-2 w-full">
                            <ProviderLogo vendor={r.vendor} className="h-3.5 w-3.5 text-[#853953] dark:text-[#F06A9A] shrink-0" />
                            <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 uppercase font-medium">
                              {r.workload_preset || "chat"}
                            </span>
                            <span className="truncate font-medium">
                              {r.name} <span className="text-neutral-400 font-normal">({r.model})</span>
                            </span>
                            <span className="text-[11px] text-neutral-400 ml-auto tabular-nums font-mono">
                              {r.ttft_p95.toFixed(0)}ms
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Selected Run B Info Pill */}
                  {selectedRunB && (
                    <div className="p-2.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-[11px] space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#2C2C2C] dark:text-white truncate flex items-center gap-1.5">
                          <ProviderLogo vendor={selectedRunB.vendor} className="h-3.5 w-3.5 inline" />
                          {selectedRunB.model}
                        </span>
                        <span className="text-[#853953] dark:text-[#F06A9A] font-semibold tabular-nums">
                          {formatMs(selectedRunB.ttft_p95)} P95
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#2C2C2C]/60 dark:text-slate-400 text-[10.5px]">
                        <span>TPS: {selectedRunB.tps_decode ? selectedRunB.tps_decode.toFixed(1) : "—"} tok/s</span>
                        <span>Goodput: {formatPct(selectedRunB.goodput_pct)}</span>
                        <span>Cost: {formatUsd(selectedRunB.total_cost_usd)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Run C (Candidate 2 - Optional) */}
            <motion.div whileHover={{ y: -1 }} transition={{ duration: 0.15 }} className="w-full">
              <Card className="shadow-xs hover:shadow-sm border-l-4 border-l-emerald-500 transition-all bg-white/80 dark:bg-[#0E0E14]/80 backdrop-blur-xs">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xs flex items-center gap-2 font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Run C (Optional 3rd)</span>
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {runCId && (
                        <button
                          type="button"
                          onClick={() => setRunCId("")}
                          className="text-[11px] text-[#2C2C2C]/50 dark:text-slate-400 hover:text-rose-500 flex items-center gap-0.5 cursor-pointer mr-1"
                          title="Remove 3rd run"
                        >
                          <X className="h-3 w-3" /> Clear
                        </button>
                      )}
                      <Badge variant="secondary" className="font-mono text-[10px] font-medium">3-Way</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3">
                  <Select value={runCId} onValueChange={setRunCId}>
                    <SelectTrigger className="focus:border-emerald-500 text-xs bg-white dark:bg-[#0B0B0E] w-full">
                      <SelectValue placeholder="Select optional 3rd run C..." />
                    </SelectTrigger>
                    <SelectContent className="max-w-[min(calc(100vw-2rem),520px)]">
                      {candidateRuns?.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">
                          <div className="flex items-center gap-2 w-full">
                            <ProviderLogo vendor={r.vendor} className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 uppercase font-medium">
                              {r.workload_preset || "chat"}
                            </span>
                            <span className="truncate font-medium">
                              {r.name} <span className="text-neutral-400 font-normal">({r.model})</span>
                            </span>
                            <span className="text-[11px] text-neutral-400 ml-auto tabular-nums font-mono">
                              {r.ttft_p95.toFixed(0)}ms
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Selected Run C Info Pill */}
                  {selectedRunC ? (
                    <div className="p-2.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-[11px] space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#2C2C2C] dark:text-white truncate flex items-center gap-1.5">
                          <ProviderLogo vendor={selectedRunC.vendor} className="h-3.5 w-3.5 inline" />
                          {selectedRunC.model}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                          {formatMs(selectedRunC.ttft_p95)} P95
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#2C2C2C]/60 dark:text-slate-400 text-[10.5px]">
                        <span>TPS: {selectedRunC.tps_decode ? selectedRunC.tps_decode.toFixed(1) : "—"} tok/s</span>
                        <span>Goodput: {formatPct(selectedRunC.goodput_pct)}</span>
                        <span>Cost: {formatUsd(selectedRunC.total_cost_usd)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 text-[11px] text-[#2C2C2C]/40 dark:text-slate-500 text-center py-3">
                      Add a 3rd run to compare 3 models simultaneously.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Swap A <-> B Button */}
          {runAId && runBId && (
            <div className="flex justify-center -my-2 relative z-20">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwapAAndB}
                className="h-7 px-3 text-[11px] font-medium rounded-full bg-white dark:bg-[#1A1A24] border-neutral-200 dark:border-neutral-700 shadow-xs hover:shadow-sm text-[#853953] dark:text-[#F06A9A] gap-1.5 cursor-pointer"
                title="Swap Baseline A and Candidate B"
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>Swap A ⇄ B</span>
              </Button>
            </div>
          )}
        </div>

        {/* Preset Alignment Indicator & Quick-Pair Recommendations */}
        {selectedRunA && (
          <div className="p-3 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/60 border border-neutral-200/90 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider bg-white dark:bg-[#14141B] border-[#853953]/30 text-[#853953] dark:text-[#F06A9A] font-semibold">
                Workload: {(selectedRunA.workload_preset || "chat").replace("_", " ")}
              </Badge>
              <span className="text-[#2C2C2C]/75 dark:text-neutral-300 text-[11.5px]">
                Dropdowns locked to identical workload preset to ensure statistically sound A/B/C deltas.
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#2C2C2C]/50 dark:text-neutral-400">
              <span>{candidateRuns.length} matching run{candidateRuns.length === 1 ? "" : "s"} found</span>
            </div>
          </div>
        )}

        {/* State: Prompt to Select Models or Loading */}
        {!runAId || !runBId ? (
          <Card className="p-8 sm:p-12 border-dashed border-2 border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#0B0B0E]/50 shadow-xs">
            <div className="max-w-xl mx-auto flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-[#853953]/10 dark:bg-[#E05284]/15 text-[#853953] dark:text-[#F06A9A] border border-[#853953]/25 dark:border-[#E05284]/35">
                <GitCompare className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#2C2C2C] dark:text-white">
                  Select Baseline & Candidate Runs
                </h3>
                <p className="text-xs text-[#2C2C2C]/60 dark:text-slate-400">
                  Pick any two benchmark executions above to compute differential latency distributions, Goodput compliance shifts, and Pareto token economics.
                </p>
              </div>

              {/* Quick Preset 1-Click Comparison Recommendations */}
              {runs && runs.length >= 2 && (
                <div className="w-full pt-4 border-t border-neutral-200 dark:border-neutral-800/80 space-y-2.5">
                  <span className="text-[11px] font-semibold text-[#2C2C2C]/70 dark:text-slate-400 uppercase tracking-wider block">
                    Quick-Compare Suggestions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(runsGroupedByPreset).map(([preset, pRuns]) => {
                      if (pRuns.length < 2) return null;
                      const [r1, r2, r3] = pRuns;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleQuickPair(r1.id, r2.id, r3?.id)}
                          className="p-3 rounded-xl bg-white dark:bg-[#14141B] border border-neutral-200 dark:border-neutral-800 hover:border-[#853953]/40 dark:hover:border-[#E05284]/50 text-left transition-all hover:shadow-xs group cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="secondary" className="text-[9.5px] uppercase font-mono">
                              {preset}
                            </Badge>
                            <span className="text-[10px] text-[#853953] dark:text-[#F06A9A] group-hover:underline flex items-center gap-1 font-medium">
                              Load Comparison <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-[#2C2C2C] dark:text-white truncate">
                            {r1.model} vs {r2.model} {r3 ? `vs ${r3.model}` : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : runAId === runBId ? (
          <Card className="border-[#853953]/30 dark:border-[#E05284]/40 bg-[#853953]/10 dark:bg-[#E05284]/15 shadow-xs">
            <CardContent className="p-4 text-xs text-[#853953] dark:text-[#F06A9A] font-medium text-center">
              Run A and Run B must be distinct benchmark executions to calculate differential shifts.
            </CardContent>
          </Card>
        ) : isLoadingDiff ? (
          <Card className="h-64 flex flex-col items-center justify-center text-xs text-[#2C2C2C]/60 dark:text-slate-400 space-y-3 shadow-xs">
            <Sparkles className="h-6 w-6 text-[#853953] dark:text-[#F06A9A] animate-spin" />
            <p className="font-medium">Calculating statistical distributions across microsecond telemetry logs...</p>
          </Card>
        ) : isError || !diffData ? (
          <Card className="border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 shadow-xs">
            <CardContent className="p-4 text-xs text-rose-800 dark:text-rose-300 font-sans">
              {diffError?.message || "Failed to compute diff response. Please verify run presets match."}
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* EXECUTIVE VERDICT & WINNER SCORECARD HERO */}
            {executiveVerdict && (
              <Card className="border-neutral-200/90 dark:border-white/10 shadow-sm bg-gradient-to-br from-white via-white to-neutral-50/80 dark:from-[#0E0E14] dark:via-[#111118] dark:to-[#161622] overflow-hidden">
                <CardContent className="p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200/70 dark:border-white/10 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="emerald" className="text-xs py-0.5 px-2.5 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Trophy className="h-3.5 w-3.5" />
                          {executiveVerdict.winnerTag}
                        </Badge>
                        <h3 className="text-base font-bold text-[#2C2C2C] dark:text-white">
                          {executiveVerdict.verdictTitle}
                        </h3>
                      </div>
                      <p className="text-xs text-[#2C2C2C]/70 dark:text-slate-300 leading-relaxed max-w-3xl">
                        {executiveVerdict.verdictSummary}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="font-mono text-xs py-1 px-3 bg-white/60 dark:bg-[#0B0B0E]/60 border-neutral-300 dark:border-neutral-700">
                        {diffData.workload_preset?.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* 4 Dimension Winner Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Dim 1: TTFT Speed */}
                    <div className="p-3.5 rounded-xl bg-neutral-100/70 dark:bg-[#151520] border border-neutral-200/80 dark:border-neutral-800/80 space-y-1">
                      <span className="text-[10.5px] font-semibold text-[#2C2C2C]/60 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Activity className="h-3 w-3 text-[#853953] dark:text-[#F06A9A]" /> TTFT Leader
                      </span>
                      <div className="text-xs font-bold text-[#2C2C2C] dark:text-white truncate">
                        {executiveVerdict.latencyLeader}
                      </div>
                      <div className="text-[11px] font-semibold font-mono">
                        <span className={executiveVerdict.ttftDelta <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}>
                          {executiveVerdict.ttftDelta > 0 ? `+${executiveVerdict.ttftDelta}%` : `${executiveVerdict.ttftDelta}%`}
                        </span>
                        <span className="text-[10px] text-[#2C2C2C]/50 dark:text-slate-500 font-normal ml-1">B vs A</span>
                      </div>
                    </div>

                    {/* Dim 2: Throughput Velocity */}
                    <div className="p-3.5 rounded-xl bg-neutral-100/70 dark:bg-[#151520] border border-neutral-200/80 dark:border-neutral-800/80 space-y-1">
                      <span className="text-[10.5px] font-semibold text-[#2C2C2C]/60 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Zap className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> TPS Leader
                      </span>
                      <div className="text-xs font-bold text-[#2C2C2C] dark:text-white truncate">
                        {executiveVerdict.tpsLeader}
                      </div>
                      <div className="text-[11px] font-semibold font-mono">
                        <span className={executiveVerdict.tpsDelta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}>
                          {executiveVerdict.tpsDelta > 0 ? `+${executiveVerdict.tpsDelta}%` : `${executiveVerdict.tpsDelta}%`}
                        </span>
                        <span className="text-[10px] text-[#2C2C2C]/50 dark:text-slate-500 font-normal ml-1">B vs A</span>
                      </div>
                    </div>

                    {/* Dim 3: SLO Goodput Yield */}
                    <div className="p-3.5 rounded-xl bg-neutral-100/70 dark:bg-[#151520] border border-neutral-200/80 dark:border-neutral-800/80 space-y-1">
                      <span className="text-[10.5px] font-semibold text-[#2C2C2C]/60 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> SLO Yield Leader
                      </span>
                      <div className="text-xs font-bold text-[#2C2C2C] dark:text-white truncate">
                        {executiveVerdict.goodputLeader}
                      </div>
                      <div className="text-[11px] font-semibold font-mono">
                        <span className={executiveVerdict.goodputDelta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}>
                          {executiveVerdict.goodputDelta > 0 ? `+${executiveVerdict.goodputDelta}%` : `${executiveVerdict.goodputDelta}%`}
                        </span>
                        <span className="text-[10px] text-[#2C2C2C]/50 dark:text-slate-500 font-normal ml-1">B vs A</span>
                      </div>
                    </div>

                    {/* Dim 4: Cost Efficiency */}
                    <div className="p-3.5 rounded-xl bg-neutral-100/70 dark:bg-[#151520] border border-neutral-200/80 dark:border-neutral-800/80 space-y-1">
                      <span className="text-[10.5px] font-semibold text-[#2C2C2C]/60 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-[#853953] dark:text-[#F06A9A]" /> Cost Leader
                      </span>
                      <div className="text-xs font-bold text-[#2C2C2C] dark:text-white truncate">
                        {executiveVerdict.costLeader}
                      </div>
                      <div className="text-[11px] font-semibold font-mono">
                        <span className={executiveVerdict.costDelta <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}>
                          {executiveVerdict.costDelta > 0 ? `+${executiveVerdict.costDelta}%` : `${executiveVerdict.costDelta}%`}
                        </span>
                        <span className="text-[10px] text-[#2C2C2C]/50 dark:text-slate-500 font-normal ml-1">B vs A</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Visual Analytics Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 max-w-3xl h-9 p-1 bg-neutral-200/60 dark:bg-[#14141B]">
                <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <PieChart className="h-3.5 w-3.5" />
                  <span>Overview Radar</span>
                </TabsTrigger>
                <TabsTrigger value="spectrum" className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Tail Spectrum</span>
                </TabsTrigger>
                <TabsTrigger value="waterfall" className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Network className="h-3.5 w-3.5" />
                  <span>Waterfall Delta</span>
                </TabsTrigger>
                <TabsTrigger value="pareto" className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Cost Pareto</span>
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Metrics Matrix</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: RADAR OVERVIEW & MULTI-DIMENSIONAL SCORECARD */}
              <TabsContent value="overview" className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Radar Chart (Left 5 Cols) */}
                  <Card className="lg:col-span-5 p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#2C2C2C]/10 dark:border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
                        <CardTitle className="text-xs font-bold">5-Pillar Normalized Radar</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Normalized 0–100</Badge>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarChartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                          <PolarGrid stroke="#888888" opacity={0.2} />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#888888" }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Radar
                            name={diffData.run_a_name}
                            dataKey={diffData.run_a_name}
                            stroke="#612D53"
                            fill="#612D53"
                            fillOpacity={0.35}
                          />
                          <Radar
                            name={diffData.run_b_name}
                            dataKey={diffData.run_b_name}
                            stroke="#E05284"
                            fill="#E05284"
                            fillOpacity={0.35}
                          />
                          {diffData.run_c_name && (
                            <Radar
                              name={diffData.run_c_name}
                              dataKey={diffData.run_c_name}
                              stroke="#10b981"
                              fill="#10b981"
                              fillOpacity={0.25}
                            />
                          )}
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, backgroundColor: "#14141B", borderColor: "rgba(255,255,255,0.1)", color: "#FFFFFF" }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* High-Impact Core Metric Cards (Right 7 Cols) */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* KPI 1: TTFT P95 */}
                    {(() => {
                      const d = diffData.deltas.find((item) => item.metric_name === "TTFT P95 (ms)");
                      return (
                        <Card className="p-4 space-y-2.5 shadow-xs border-l-4 border-l-[#853953] dark:border-l-[#F06A9A]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#2C2C2C]/70 dark:text-slate-300">TTFT Tail Latency (P95)</span>
                            <Badge variant={d?.is_improvement ? "emerald" : "destructive"} className="text-[10px] font-mono font-bold">
                              {d?.delta_pct ? (d.delta_pct > 0 ? `+${d.delta_pct}%` : `${d.delta_pct}%`) : "0%"}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#2C2C2C]/60 dark:text-slate-400">Baseline (A):</span>
                              <span className="font-semibold tabular-nums">{d?.run_a_value ?? 0} ms</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#853953] dark:text-[#F06A9A] font-medium">Candidate (B):</span>
                              <span className="font-bold tabular-nums text-[#853953] dark:text-[#F06A9A]">{d?.run_b_value ?? 0} ms</span>
                            </div>
                            {diffData.run_c_name && d?.run_c_value !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Candidate (C):</span>
                                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{d?.run_c_value} ms</span>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })()}

                    {/* KPI 2: Decode Throughput */}
                    {(() => {
                      const d = diffData.deltas.find((item) => item.metric_name.includes("Decode TPS"));
                      return (
                        <Card className="p-4 space-y-2.5 shadow-xs border-l-4 border-l-emerald-500">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#2C2C2C]/70 dark:text-slate-300">Decode Speed (TPS)</span>
                            <Badge variant={d?.is_improvement ? "emerald" : "destructive"} className="text-[10px] font-mono font-bold">
                              {d?.delta_pct ? (d.delta_pct > 0 ? `+${d.delta_pct}%` : `${d.delta_pct}%`) : "0%"}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#2C2C2C]/60 dark:text-slate-400">Baseline (A):</span>
                              <span className="font-semibold tabular-nums">{d?.run_a_value ?? 0} tok/s</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#853953] dark:text-[#F06A9A] font-medium">Candidate (B):</span>
                              <span className="font-bold tabular-nums text-[#853953] dark:text-[#F06A9A]">{d?.run_b_value ?? 0} tok/s</span>
                            </div>
                            {diffData.run_c_name && d?.run_c_value !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Candidate (C):</span>
                                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{d?.run_c_value} tok/s</span>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })()}

                    {/* KPI 3: Goodput (SLO Yield) */}
                    {(() => {
                      const d = diffData.deltas.find((item) => item.metric_name.includes("Goodput"));
                      return (
                        <Card className="p-4 space-y-2.5 shadow-xs border-l-4 border-l-emerald-600">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#2C2C2C]/70 dark:text-slate-300">Goodput SLO Compliance</span>
                            <Badge variant={d?.is_improvement ? "emerald" : "destructive"} className="text-[10px] font-mono font-bold">
                              {d?.delta_pct ? (d.delta_pct > 0 ? `+${d.delta_pct}%` : `${d.delta_pct}%`) : "0%"}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#2C2C2C]/60 dark:text-slate-400">Baseline (A):</span>
                              <span className="font-semibold tabular-nums">{formatPct(d?.run_a_value ?? 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#853953] dark:text-[#F06A9A] font-medium">Candidate (B):</span>
                              <span className="font-bold tabular-nums text-[#853953] dark:text-[#F06A9A]">{formatPct(d?.run_b_value ?? 0)}</span>
                            </div>
                            {diffData.run_c_name && d?.run_c_value !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Candidate (C):</span>
                                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatPct(d?.run_c_value ?? 0)}</span>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })()}

                    {/* KPI 4: Cost per 1K Calls */}
                    {(() => {
                      const d = diffData.deltas.find((item) => item.metric_name.includes("Cost / 1K") || item.metric_name.includes("Total Cost"));
                      return (
                        <Card className="p-4 space-y-2.5 shadow-xs border-l-4 border-l-[#612D53] dark:border-l-[#C14594]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#2C2C2C]/70 dark:text-slate-300">Economic Spend</span>
                            <Badge variant={d?.is_improvement ? "emerald" : "destructive"} className="text-[10px] font-mono font-bold">
                              {d?.delta_pct ? (d.delta_pct > 0 ? `+${d.delta_pct}%` : `${d.delta_pct}%`) : "0%"}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#2C2C2C]/60 dark:text-slate-400">Baseline (A):</span>
                              <span className="font-semibold tabular-nums">{formatUsd(d?.run_a_value ?? 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#853953] dark:text-[#F06A9A] font-medium">Candidate (B):</span>
                              <span className="font-bold tabular-nums text-[#853953] dark:text-[#F06A9A]">{formatUsd(d?.run_b_value ?? 0)}</span>
                            </div>
                            {diffData.run_c_name && d?.run_c_value !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Candidate (C):</span>
                                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatUsd(d?.run_c_value ?? 0)}</span>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })()}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: LATENCY TAIL SPECTRUM */}
              <TabsContent value="spectrum" className="space-y-6 animate-fadeIn">
                <Card className="p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#2C2C2C]/10 dark:border-white/10 pb-3">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
                        <span>Latency Distribution Tail Shift (ms)</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Compares TTFT and ITL percentiles (P50, P75, P95, P99) side-by-side to expose tail degradation.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">Lower is better</Badge>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={latencySpectrumData} margin={{ top: 15, right: 10, left: -20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="ms" />
                        <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, backgroundColor: "#14141B", borderColor: "rgba(255,255,255,0.1)", color: "#FFFFFF" }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey={diffData.run_a_name} fill="#612D53" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={diffData.run_b_name} fill="#E05284" radius={[4, 4, 0, 0]} />
                        {diffData.run_c_name && (
                          <Bar dataKey={diffData.run_c_name} fill="#10b981" radius={[4, 4, 0, 0]} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </TabsContent>

              {/* TAB 3: WATERFALL DECOMPOSITION */}
              <TabsContent value="waterfall" className="space-y-6 animate-fadeIn">
                <Card className="p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#2C2C2C]/10 dark:border-white/10 pb-3">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Network className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
                        <span>Latency Waterfall Stage Decomposition</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Decomposes response latency across DNS, TCP Handshake, TLS Negotiation, TTFT Prefill Compute, and Decode Stream.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Bottleneck Analysis</Badge>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waterfallData} margin={{ top: 15, right: 10, left: -20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="ms" />
                        <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, backgroundColor: "#14141B", borderColor: "rgba(255,255,255,0.1)", color: "#FFFFFF" }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey={diffData.run_a_name} fill="#612D53" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={diffData.run_b_name} fill="#E05284" radius={[4, 4, 0, 0]} />
                        {diffData.run_c_name && (
                          <Bar dataKey={diffData.run_c_name} fill="#10b981" radius={[4, 4, 0, 0]} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </TabsContent>

              {/* TAB 4: PARETO COST VS THROUGHPUT */}
              <TabsContent value="pareto" className="space-y-6 animate-fadeIn">
                <Card className="p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#2C2C2C]/10 dark:border-white/10 pb-3">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Pareto Frontier: Cost vs Decode Throughput</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Identifies the most cost-efficient inference endpoint per token generated.
                      </CardDescription>
                    </div>
                    <Badge variant="emerald" className="text-[10px]">Pareto Optimal</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {paretoData.map((pt, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-[#14141B]/80 border border-neutral-200 dark:border-neutral-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#2C2C2C] dark:text-white truncate">
                            {pt.role}
                          </span>
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: pt.color }} />
                        </div>
                        <div className="text-[11px] text-[#2C2C2C]/60 dark:text-slate-400 truncate">
                          {pt.name}
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-neutral-200/80 dark:border-neutral-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#2C2C2C]/60 dark:text-slate-400">Decode Speed:</span>
                            <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{pt.tps.toFixed(1)} tok/s</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#2C2C2C]/60 dark:text-slate-400">Cost per 1K calls:</span>
                            <span className="font-bold tabular-nums text-[#853953] dark:text-[#F06A9A]">{formatUsd(pt.cost)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#2C2C2C]/60 dark:text-slate-400">Goodput Yield:</span>
                            <span className="font-semibold tabular-nums">{formatPct(pt.goodput)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              {/* TAB 5: ADVANCED SEARCHABLE & SORTABLE METRICS MATRIX */}
              <TabsContent value="table" className="space-y-4 animate-fadeIn">
                {/* Search & Category Filter Header */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#2C2C2C]/40 dark:text-slate-400" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search metric name (e.g. P95, Cost, TPS)..."
                      className="pl-8.5 h-8.5 text-xs bg-white dark:bg-[#0B0B0E]"
                    />
                  </div>

                  {/* Category Pills */}
                  {availableCategories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-neutral-200/50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() => setCategoryFilter("all")}
                        className={cn(
                          "px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer",
                          categoryFilter === "all"
                            ? "bg-white dark:bg-[#1A1A24] text-[#853953] dark:text-[#F06A9A] shadow-xs font-semibold"
                            : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                        )}
                      >
                        All ({diffData.deltas.length})
                      </button>
                      {availableCategories.map((cat) => {
                        const count = diffData.deltas.filter((d) => d.category === cat).length;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategoryFilter(cat)}
                            className={cn(
                              "px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap",
                              categoryFilter === cat
                                ? "bg-white dark:bg-[#1A1A24] text-[#853953] dark:text-[#F06A9A] shadow-xs font-semibold"
                                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                            )}
                          >
                            {cat} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Table Card */}
                <Card className="overflow-hidden shadow-xs border-neutral-200/80 dark:border-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#2C2C2C]/10 dark:border-white/10 bg-[#2C2C2C]/5 dark:bg-white/[0.03]">
                        <TableHead className="py-3 px-5 text-xs font-bold text-[#2C2C2C] dark:text-white">
                          <button
                            type="button"
                            onClick={() => {
                              if (tableSortKey === "name") {
                                setTableSortDir(tableSortDir === "asc" ? "desc" : "asc");
                              } else {
                                setTableSortKey("name");
                                setTableSortDir("asc");
                              }
                            }}
                            className="flex items-center gap-1 hover:text-[#853953] dark:hover:text-[#F06A9A] cursor-pointer"
                          >
                            Metric Dimension
                          </button>
                        </TableHead>
                        <TableHead className="py-3 px-3 text-xs font-bold text-[#2C2C2C] dark:text-white">Run A (Baseline)</TableHead>
                        <TableHead className="py-3 px-3 text-xs font-bold text-[#2C2C2C] dark:text-white">Run B (Candidate 1)</TableHead>
                        <TableHead className="py-3 px-3 text-xs font-bold text-[#2C2C2C] dark:text-white">
                          <button
                            type="button"
                            onClick={() => {
                              if (tableSortKey === "delta_pct") {
                                setTableSortDir(tableSortDir === "asc" ? "desc" : "asc");
                              } else {
                                setTableSortKey("delta_pct");
                                setTableSortDir("desc");
                              }
                            }}
                            className="flex items-center gap-1 hover:text-[#853953] dark:hover:text-[#F06A9A] cursor-pointer"
                          >
                            B vs A Delta Shift
                          </button>
                        </TableHead>
                        {diffData.run_c_name && (
                          <>
                            <TableHead className="py-3 px-3 text-xs font-bold text-[#2C2C2C] dark:text-white">Run C (Candidate 2)</TableHead>
                            <TableHead className="py-3 px-5 text-right text-xs font-bold text-[#2C2C2C] dark:text-white">C vs A Delta Shift</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedDeltas.map((d: MetricDelta, idx: number) => {
                        const absDelta = Math.min(100, Math.abs(d.delta_pct));
                        return (
                          <TableRow
                            key={idx}
                            className="border-b border-[#2C2C2C]/10 dark:border-white/[0.06] transition-colors hover:bg-neutral-100/60 dark:hover:bg-white/[0.04]"
                          >
                            <TableCell className="py-3 px-5 font-medium text-[#2C2C2C] dark:text-white">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold">{d.metric_name}</span>
                                {d.category && (
                                  <Badge variant="outline" className="text-[9.5px] py-0 px-1.5 font-normal text-neutral-500 dark:text-neutral-400">
                                    {d.category}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-3 px-3 text-[#2C2C2C]/70 dark:text-slate-400 font-sans tabular-nums text-xs">
                              {d.run_a_value}
                            </TableCell>

                            <TableCell className="py-3 px-3 text-[#2C2C2C] dark:text-white font-semibold font-sans tabular-nums text-xs">
                              {d.run_b_value}
                            </TableCell>

                            {/* B vs A Delta with Visual Progress Bar */}
                            <TableCell className="py-3 px-3">
                              <div className="space-y-1 max-w-[140px]">
                                <Badge
                                  variant={
                                    d.delta_pct === 0
                                      ? "secondary"
                                      : d.is_improvement
                                      ? "emerald"
                                      : "destructive"
                                  }
                                  className="gap-1 py-0.5 px-2 text-[11px] font-semibold font-sans tabular-nums"
                                >
                                  {d.delta_pct === 0 ? (
                                    <Minus className="h-3 w-3" />
                                  ) : d.is_improvement ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {d.delta_pct > 0 ? `+${d.delta_pct}%` : `${d.delta_pct}%`}
                                </Badge>
                                {/* Magnitude Bar */}
                                {d.delta_pct !== 0 && (
                                  <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full",
                                        d.is_improvement ? "bg-emerald-500" : "bg-rose-500"
                                      )}
                                      style={{ width: `${absDelta}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Run C and C vs A */}
                            {diffData.run_c_name && (
                              <>
                                <TableCell className="py-3 px-3 text-[#2C2C2C] dark:text-white font-semibold font-sans tabular-nums text-xs">
                                  {d.run_c_value !== undefined && d.run_c_value !== null ? d.run_c_value : "—"}
                                </TableCell>
                                <TableCell className="py-3 px-5 text-right">
                                  {d.delta_c_pct !== undefined && d.delta_c_pct !== null ? (
                                    <div className="space-y-1 max-w-[140px] ml-auto">
                                      <Badge
                                        variant={
                                          d.delta_c_pct === 0
                                            ? "secondary"
                                            : d.is_improvement_c
                                            ? "emerald"
                                            : "destructive"
                                        }
                                        className="gap-1 py-0.5 px-2 text-[11px] font-semibold font-sans tabular-nums"
                                      >
                                        {d.delta_c_pct === 0 ? (
                                          <Minus className="h-3 w-3" />
                                        ) : d.is_improvement_c ? (
                                          <TrendingUp className="h-3 w-3" />
                                        ) : (
                                          <TrendingDown className="h-3 w-3" />
                                        )}
                                        {d.delta_c_pct > 0 ? `+${d.delta_c_pct}%` : `${d.delta_c_pct}%`}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-[#2C2C2C]/50 dark:text-slate-500">—</span>
                                  )}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};

