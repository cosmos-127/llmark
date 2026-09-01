import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import {
  History,
  Search,
  ArrowUpRight,
  X,
  Network,
  Activity,
  Layers,
  Download,
  Calendar,
  Filter,
  DollarSign,
  Cpu,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { api, getApiUrl } from "@/lib/api";
import { HistoricalRunDetails, HistoricalRunSummary } from "@/lib/types";
import { formatMs, formatPct, formatUsd, downloadFile, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ProviderLogo } from "@/components/common/BrandLogos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyStateIllustration } from "@/components/common/AnimatedSvg";
import { LatencyDistributionChart } from "@/components/live-dashboard/LatencyDistributionChart";
import { KvCacheSpeedupCard } from "@/components/live-dashboard/KvCacheSpeedupCard";

interface HistoryPageProps {
  initialView?: string;
  initialRunId?: string | null;
  onNavigateToBenchmark?: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  initialRunId = null,
  onNavigateToBenchmark,
}) => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initialRunId);
  const [globalFilter, setGlobalFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);

  const { data: runs = [], isLoading, isError } = useQuery<HistoricalRunSummary[]>({
    queryKey: ["benchmark-history"],
    queryFn: () => api.getHistory(100, 0),
  });

  const { data: runDetails, isLoading: isLoadingDetails } = useQuery<HistoricalRunDetails>({
    queryKey: ["run-details", selectedRunId],
    queryFn: () => api.getRunDetails(selectedRunId!),
    enabled: !!selectedRunId,
  });

  const filteredData = useMemo(() => {
    return runs.filter((r) => {
      const matchesVendor = vendorFilter === "all" || r.vendor.toLowerCase() === vendorFilter.toLowerCase();
      return matchesVendor;
    });
  }, [runs, vendorFilter]);

  const columns = useMemo<ColumnDef<HistoricalRunSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 font-sans font-medium text-xs text-[#2C2C2C] dark:text-white hover:text-[#853953] dark:hover:text-[#F06A9A]"
          >
            Benchmark run & model
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1.5 h-3 w-3 text-[#853953] dark:text-[#F06A9A]" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1.5 h-3 w-3 text-[#853953] dark:text-[#F06A9A]" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="font-sans">
              <div className="font-medium text-[#2C2C2C] dark:text-white group-hover:text-[#853953] dark:group-hover:text-[#F06A9A] transition-colors">
                {r.name}
              </div>
              <div className="text-xs font-sans text-[#2C2C2C]/60 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <Badge variant="default" className="text-[11px] py-0 px-1.5 font-medium font-mono">
                  {r.model}
                </Badge>
                <span className="text-[#2C2C2C]/30 dark:text-white/20">•</span>
                <span className="text-[#2C2C2C]/80 dark:text-slate-300 flex items-center gap-1">
                  <ProviderLogo vendor={r.vendor as any} className="h-3 w-3 inline text-[#853953] dark:text-[#F06A9A]" />
                  {r.vendor}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "workload_preset",
        header: "Workload",
        cell: ({ row }) => (
          <span className="capitalize text-[#2C2C2C] dark:text-white font-sans text-xs">
            {row.original.workload_preset?.replace("_", " ")}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 font-sans font-medium text-xs text-[#2C2C2C] dark:text-white hover:text-[#853953] dark:hover:text-[#F06A9A]"
          >
            Timestamp
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1.5 h-3 w-3 text-[#853953] dark:text-[#F06A9A]" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1.5 h-3 w-3 text-[#853953] dark:text-[#F06A9A]" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const val = row.original.created_at;
          return (
            <span className="text-xs text-[#2C2C2C]/70 dark:text-slate-400 font-sans tabular-nums">
              {val ? new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
            </span>
          );
        },
      },
      {
        accessorKey: "ttft_p50",
        header: "TTFT (P50)",
        cell: ({ row }) => (
          <span className="font-sans tabular-nums font-semibold text-xs text-[#612D53] dark:text-[#E270BB]">
            {formatMs(row.original.ttft_p50)}
          </span>
        ),
      },
      {
        accessorKey: "goodput_pct",
        header: "Goodput",
        cell: ({ row }) => {
          const pct = row.original.goodput_pct;
          const isHigh = pct >= 95;
          return (
            <Badge variant={isHigh ? "emerald" : "default"} className="font-sans tabular-nums text-xs">
              {formatPct(pct)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "total_cost_usd",
        header: "Run Cost",
        cell: ({ row }) => (
          <span className="text-[#2C2C2C] dark:text-white font-sans tabular-nums text-xs font-medium">
            {formatUsd(row.original.total_cost_usd)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="text-right flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRunId(row.original.id);
              }}
              className="h-8 text-[11px] px-3 rounded-xl shadow-2xs hover:shadow-xs cursor-pointer text-[#853953] dark:text-[#F06A9A] border-[#853953]/25 dark:border-[#E05284]/35 hover:bg-[#853953]/10 dark:hover:bg-[#E05284]/15 flex items-center gap-1.5 font-medium"
              title="Inspect unaggregated percentiles & raw telemetry"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Inspect Telemetry</span>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <TooltipProvider>
      <div className="space-y-6 font-sans pb-8">
        {/* Header & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2C2C]/10 dark:border-white/10 pb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#2C2C2C] dark:text-white tracking-normal flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#853953]/10 dark:bg-[#E05284]/15 text-[#853953] dark:text-[#F06A9A] border border-[#853953]/25 dark:border-[#E05284]/35">
                <History className="h-5 w-5" />
              </div>
              <span>Benchmark Runs</span>
            </h2>
            <p className="text-xs text-[#2C2C2C]/60 dark:text-slate-400 mt-1">
              Review saved benchmarks, tail percentiles, and export audit reports.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onNavigateToBenchmark && (
              <Button
                type="button"
                size="sm"
                onClick={onNavigateToBenchmark}
                className="text-xs bg-[#853953] dark:bg-[#D84577] hover:bg-[#743663] dark:hover:bg-[#E05284] text-white cursor-pointer shadow-xs"
              >
                <span>Open Studio</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search & Provider Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#2C2C2C]/40 dark:text-slate-400" />
            <Input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter benchmark runs by name, model, preset..."
              className="pl-8.5 h-8.5 text-xs bg-white dark:bg-[#0B0B0E]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {["all", "mock", "openai", "anthropic", "gemini", "aws_bedrock"].map((vf) => {
              const isActive = vendorFilter === vf;
              return (
                <button
                  key={vf}
                  type="button"
                  onClick={() => setVendorFilter(vf)}
                  className={cn(
                    "relative flex items-center gap-1.5 h-7 px-3 rounded-lg capitalize text-xs font-medium transition-colors cursor-pointer select-none whitespace-nowrap",
                    isActive
                      ? "text-[#853953] dark:text-[#F06A9A] font-semibold"
                      : "text-[#2C2C2C]/70 dark:text-slate-400 hover:text-[#2C2C2C] dark:hover:text-white"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="history-vendor-filter-pill"
                      className="absolute inset-0 bg-white dark:bg-[#1A1A24] rounded-lg shadow-xs border border-[#853953]/20 dark:border-[#E05284]/40"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  {vf !== "all" && <ProviderLogo vendor={vf as any} className="relative z-10 h-3 w-3" />}
                  <span className="relative z-10">{vf.replace("_", " ")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Benchmark History Table Card */}
        <Card className="border-[#2C2C2C]/10 dark:border-white/[0.08] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F3F4F4]/60 dark:bg-[#0B0B0E] border-b border-[#2C2C2C]/10 dark:border-white/10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs font-semibold text-[#2C2C2C] dark:text-white">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="divide-y divide-[#2C2C2C]/5 dark:divide-white/[0.06]">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-xs text-[#2C2C2C]/60 dark:text-slate-400">
                      Loading persisted benchmark executions from SQLite...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => {
                        setSelectedRunId(row.original.id);
                      }}
                      className="hover:bg-[#F3F4F4]/50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors group"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <EmptyStateIllustration className="h-10 w-10 text-[#2C2C2C]/30 dark:text-white/20" />
                        <p className="text-xs font-medium text-[#2C2C2C]/70 dark:text-slate-300">
                          No historical benchmark runs found
                        </p>
                        <p className="text-[11px] text-[#2C2C2C]/50 dark:text-slate-500">
                          Execute a benchmark in the Studio to record your first telemetry audit log.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Pagination */}
          {table.getPageCount() > 1 && (
            <div className="p-3 border-t border-[#2C2C2C]/10 dark:border-white/10 flex items-center justify-between text-xs text-[#2C2C2C]/60 dark:text-slate-400 font-sans">
              <div className="flex items-center gap-1">
                <span>Page</span>
                <strong className="text-[#2C2C2C] dark:text-white">
                  {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </strong>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Run Details Inspection Dialog */}
        <Dialog open={!!selectedRunId} onOpenChange={(open) => !open && setSelectedRunId(null)}>
          <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {runDetails && <ProviderLogo vendor={runDetails.vendor} className="h-5 w-5" />}
                <DialogTitle className="text-base font-bold font-sans text-[#2C2C2C] dark:text-white">
                  {runDetails?.name || "Benchmark Execution Details"}
                </DialogTitle>
              </div>

              <DialogDescription className="text-xs text-[#2C2C2C]/60 dark:text-slate-400 font-sans">
                Engine: {runDetails?.vendor} • Model: {runDetails?.model} • Workload: {runDetails?.workload_preset}
              </DialogDescription>
            </DialogHeader>

            {isLoadingDetails || !runDetails ? (
              <div className="p-8 text-center text-xs text-[#2C2C2C]/60 dark:text-slate-400 font-sans">
                Fetching microsecond trace percentiles and waterfall telemetry...
              </div>
            ) : (
              <div className="space-y-5 pt-2">
                {/* Metrics Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans">
                  <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 p-3.5">
                    <span className="text-xs font-medium text-[#2C2C2C]/60 dark:text-slate-400 block">Goodput Yield</span>
                    <p className="text-lg font-semibold font-sans tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                      {formatPct(runDetails.percentiles.goodput_pct)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 p-3.5">
                    <span className="text-xs font-medium text-[#2C2C2C]/60 dark:text-slate-400 block">Completed reqs</span>
                    <p className="text-lg font-semibold font-sans tabular-nums text-[#2C2C2C] dark:text-white mt-1">
                      {runDetails.counts.completed_requests} / {runDetails.counts.total_requests}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 p-3.5">
                    <span className="text-xs font-medium text-[#2C2C2C]/60 dark:text-slate-400 block">Decode TPS</span>
                    <p className="text-lg font-semibold font-sans tabular-nums text-[#612D53] dark:text-[#E270BB] mt-1">
                      {runDetails.percentiles.tps_decode.toFixed(1)} tok/s
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 p-3.5">
                    <span className="text-xs font-medium text-[#2C2C2C]/60 dark:text-slate-400 block">Run Spend</span>
                    <p className="text-lg font-semibold font-sans tabular-nums text-[#853953] dark:text-[#F06A9A] mt-1">
                      {formatUsd(runDetails.counts.total_cost_usd)}
                    </p>
                  </div>
                </div>

                {/* Unaggregated Percentile Grid */}
                <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 p-4 space-y-3 font-sans text-xs">
                  <h4 className="font-semibold text-[#2C2C2C] dark:text-white flex items-center gap-2 text-xs">
                    <Activity className="h-4 w-4 text-[#853953] dark:text-[#F06A9A]" />
                    Unaggregated percentile distribution
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-white dark:bg-[#0F0F13] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-white/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-slate-400 block text-[11px]">TTFT (P50)</span>
                      <strong className="text-[#612D53] dark:text-[#E270BB] font-sans font-semibold tabular-nums">{formatMs(runDetails.percentiles.ttft_p50)}</strong>
                    </div>
                    <div className="bg-white dark:bg-[#0F0F13] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-white/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-slate-400 block text-[11px]">TTFT (P95)</span>
                      <strong className="text-[#853953] dark:text-[#F06A9A] font-sans font-semibold tabular-nums">{formatMs(runDetails.percentiles.ttft_p95)}</strong>
                    </div>
                    <div className="bg-white dark:bg-[#0F0F13] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-white/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-slate-400 block text-[11px]">TTFT (P99)</span>
                      <strong className="text-[#612D53] dark:text-[#E270BB] font-sans font-semibold tabular-nums">{formatMs(runDetails.percentiles.ttft_p99)}</strong>
                    </div>
                    <div className="bg-white dark:bg-[#0F0F13] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-white/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-slate-400 block text-[11px]">Max ITL freeze</span>
                      <strong className="text-rose-700 dark:text-rose-400 font-sans font-semibold tabular-nums">{formatMs(runDetails.percentiles.max_itl)}</strong>
                    </div>
                  </div>
                </div>

                {/* Network Handshake Breakdown */}
                <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 p-4 space-y-2 font-sans text-xs">
                  <h4 className="font-semibold text-[#2C2C2C] dark:text-white flex items-center gap-2 text-xs">
                    <Network className="h-4 w-4 text-[#612D53] dark:text-[#E270BB]" />
                    Network handshake baseline
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white dark:bg-[#0F0F13] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-white/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-slate-400 block text-[11px]">DNS lookup</span>
                      <span className="text-[#2C2C2C] dark:text-white font-sans font-semibold tabular-nums">{formatMs(runDetails.waterfall.dns_p50)}</span>
                    </div>
                    <div className="bg-white dark:bg-[#0F0F13] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-white/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-slate-400 block text-[11px]">TCP handshake</span>
                      <span className="text-[#2C2C2C] dark:text-white font-sans font-semibold tabular-nums">{formatMs(runDetails.waterfall.tcp_p50)}</span>
                    </div>
                    <div className="bg-white dark:bg-[#0F0F13] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-white/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-slate-400 block text-[11px]">TLS handshake</span>
                      <span className="text-[#2C2C2C] dark:text-white font-sans font-semibold tabular-nums">{formatMs(runDetails.waterfall.tls_p50)}</span>
                    </div>
                  </div>
                </div>

                {/* Prefix Cache Hit Acceleration if present in raw telemetry */}
                {runDetails.raw_telemetry && (
                  <KvCacheSpeedupCard
                    snapshot={runDetails.raw_telemetry as any}
                    workloadPreset={runDetails.workload_preset}
                  />
                )}

                {/* Tail Latency Distribution Histogram if present in raw telemetry */}
                {runDetails.raw_telemetry && (
                  <LatencyDistributionChart snapshot={runDetails.raw_telemetry as any} />
                )}

                {/* Multi-Format Export Hub Bar */}
                <div className="pt-3 border-t border-[#2C2C2C]/10 dark:border-white/10 flex flex-wrap items-center justify-end gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-medium shadow-2xs"
                      onClick={() => downloadFile(getApiUrl(`/api/export/pdf/${runDetails.id}`), `llmark_report_${runDetails.id}.pdf`)}
                    >
                      <Download className="h-3.5 w-3.5 text-[#853953] dark:text-[#F06A9A]" />
                      PDF report
                    </Button>
                    <Button variant="outline" size="sm" asChild className="rounded-xl font-medium shadow-2xs cursor-pointer">
                      <a href={getApiUrl(`/api/export/csv/${runDetails.id}`)} download>
                        <Download className="h-3.5 w-3.5 text-[#853953] dark:text-[#F06A9A]" />
                        CSV data
                      </a>
                    </Button>
                    <Button variant="default" size="sm" asChild className="rounded-xl bg-[#853953] dark:bg-[#D84577] text-white hover:bg-[#612D53] dark:hover:bg-[#E05284] shadow-xs font-medium cursor-pointer">
                      <a href={getApiUrl(`/api/export/bundle/${runDetails.id}`)} download>
                        <Download className="h-3.5 w-3.5 text-white" />
                        .llmark bundle
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
