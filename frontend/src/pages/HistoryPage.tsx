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
            className="-ml-3 h-8 font-sans font-medium text-xs text-[var(--text-main)] hover:text-[var(--brand-primary)]"
          >
            Benchmark run & model
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1.5 h-3 w-3 text-[var(--brand-primary)]" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1.5 h-3 w-3 text-[var(--brand-primary)]" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="font-sans">
              <div className="font-medium text-[var(--text-main)] group-hover:text-[var(--brand-primary)] dark:group-hover:text-[var(--brand-primary)] transition-colors">
                {r.name}
              </div>
              <div className="text-xs font-sans text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                <Badge variant="default" className="text-[11px] py-0 px-1.5 font-medium font-mono">
                  {r.model}
                </Badge>
                <span className="text-[var(--text-main)]/30 dark:text-white/20">•</span>
                <span className="text-[var(--text-subheading)] dark:text-[var(--text-body)] flex items-center gap-1">
                  <ProviderLogo vendor={r.vendor as any} className="h-3 w-3 inline text-[var(--brand-primary)]" />
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
          <span className="capitalize text-[var(--text-main)] font-sans text-xs">
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
            className="-ml-3 h-8 font-sans font-medium text-xs text-[var(--text-main)] hover:text-[var(--brand-primary)]"
          >
            Timestamp
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1.5 h-3 w-3 text-[var(--brand-primary)]" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1.5 h-3 w-3 text-[var(--brand-primary)]" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const val = row.original.created_at;
          return (
            <span className="text-xs text-[var(--text-muted)] font-sans tabular-nums">
              {val ? new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
            </span>
          );
        },
      },
      {
        accessorKey: "ttft_p50",
        header: "TTFT (P50)",
        cell: ({ row }) => (
          <span className="font-sans tabular-nums font-semibold text-xs text-[var(--brand-secondary)]">
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
          <span className="text-[var(--text-main)] font-sans tabular-nums text-xs font-medium">
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
              className="h-8 text-[11px] px-3 rounded-xl shadow-2xs hover:shadow-xs cursor-pointer text-[var(--brand-primary)] border-[var(--brand-primary-border)] hover:bg-[var(--brand-primary-light)] dark:hover:bg-[var(--brand-primary-light)] flex items-center gap-1.5 font-medium"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-main)] tracking-normal flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary-border)]">
                <History className="h-5 w-5" />
              </div>
              <span>Benchmark Runs</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Review saved benchmarks, tail percentiles, and export audit reports.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onNavigateToBenchmark && (
              <Button
                type="button"
                size="sm"
                onClick={onNavigateToBenchmark}
                className="text-xs bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--text-inverse)] cursor-pointer shadow-xs"
              >
                <span>Open Studio</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search & Provider Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-placeholder)] dark:text-[var(--text-muted)]" />
            <Input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter benchmark runs by name, model, preset..."
              className="pl-9 h-9 text-xs bg-white dark:bg-[var(--bg-surface-subtle)]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface-subtle)]/70 dark:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] overflow-x-auto pb-1 sm:pb-1">
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
                      ? "text-[var(--brand-primary)] font-semibold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="history-vendor-filter-pill"
                      className="absolute inset-0 bg-[var(--bg-surface-elevated)] rounded-lg shadow-xs border border-[var(--brand-primary-border)]"
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
        <Card className="border-[var(--border-subtle)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[var(--bg-surface-subtle)]/60 dark:bg-[var(--bg-surface-subtle)] border-b border-[var(--border-subtle)]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-9 px-4 text-xs font-semibold text-[var(--text-main)]">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="divide-y divide-[#0F172A]/5 dark:divide-white/[0.06]">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-xs text-[var(--text-muted)]">
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
                      className="hover:bg-[var(--bg-surface-hover)]/50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors group"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3 px-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <EmptyStateIllustration className="h-10 w-10 text-[var(--text-main)]/30 dark:text-white/20" />
                        <p className="text-xs font-medium text-[var(--text-body)]">
                          No historical benchmark runs found
                        </p>
                        <p className="text-[11px] text-[var(--text-subtle)] dark:text-[var(--text-subtle)]">
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
            <div className="p-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)] font-sans">
              <div className="flex items-center gap-1">
                <span>Page</span>
                <strong className="text-[var(--text-main)]">
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
                <DialogTitle className="text-base font-bold font-sans text-[var(--text-main)]">
                  {runDetails?.name || "Benchmark Execution Details"}
                </DialogTitle>
              </div>

              <DialogDescription className="text-xs text-[var(--text-muted)] font-sans">
                Engine: {runDetails?.vendor} • Model: {runDetails?.model} • Workload: {runDetails?.workload_preset}
              </DialogDescription>
            </DialogHeader>

            {isLoadingDetails || !runDetails ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] font-sans">
                Fetching microsecond trace percentiles and waterfall telemetry...
              </div>
            ) : (
              <div className="space-y-5 pt-2">
                {/* Metrics Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans">
                  <div className="rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] p-3.5">
                    <span className="text-xs font-medium text-[var(--text-muted)] block">Goodput Yield</span>
                    <p className="text-lg font-semibold font-sans tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                      {formatPct(runDetails.percentiles.goodput_pct)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] p-3.5">
                    <span className="text-xs font-medium text-[var(--text-muted)] block">Completed reqs</span>
                    <p className="text-lg font-semibold font-sans tabular-nums text-[var(--text-main)] mt-1">
                      {runDetails.counts.completed_requests} / {runDetails.counts.total_requests}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] p-3.5">
                    <span className="text-xs font-medium text-[var(--text-muted)] block">Decode TPS</span>
                    <p className="text-lg font-semibold font-sans tabular-nums text-[var(--brand-secondary)] mt-1">
                      {runDetails.percentiles.tps_decode.toFixed(1)} tok/s
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] p-3.5">
                    <span className="text-xs font-medium text-[var(--text-muted)] block">Run Spend</span>
                    <p className="text-lg font-semibold font-sans tabular-nums text-[var(--brand-primary)] mt-1">
                      {formatUsd(runDetails.counts.total_cost_usd)}
                    </p>
                  </div>
                </div>

                {/* Unaggregated Percentile Grid */}
                <div className="rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] p-4 space-y-3 font-sans text-xs">
                  <h4 className="font-semibold text-[var(--text-main)] flex items-center gap-2 text-xs">
                    <Activity className="h-4 w-4 text-[var(--brand-primary)]" />
                    Unaggregated percentile distribution
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-[var(--bg-card)] p-2.5 rounded-lg border border-[var(--border-subtle)] shadow-2xs">
                      <span className="text-[var(--text-muted)] block text-[11px]">TTFT (P50)</span>
                      <strong className="text-[var(--brand-secondary)] font-sans font-semibold tabular-nums">{formatMs(runDetails.percentiles.ttft_p50)}</strong>
                    </div>
                    <div className="bg-[var(--bg-card)] p-2.5 rounded-lg border border-[var(--border-subtle)] shadow-2xs">
                      <span className="text-[var(--text-muted)] block text-[11px]">TTFT (P95)</span>
                      <strong className="text-[var(--brand-primary)] font-sans font-semibold tabular-nums">{formatMs(runDetails.percentiles.ttft_p95)}</strong>
                    </div>
                    <div className="bg-[var(--bg-card)] p-2.5 rounded-lg border border-[var(--border-subtle)] shadow-2xs">
                      <span className="text-[var(--text-muted)] block text-[11px]">TTFT (P99)</span>
                      <strong className="text-[var(--brand-secondary)] font-sans font-semibold tabular-nums">{formatMs(runDetails.percentiles.ttft_p99)}</strong>
                    </div>
                    <div className="bg-[var(--bg-card)] p-2.5 rounded-lg border border-[var(--border-subtle)] shadow-2xs">
                      <span className="text-[var(--text-muted)] block text-[11px]">Max ITL freeze</span>
                      <strong className="text-rose-700 dark:text-rose-400 font-sans font-semibold tabular-nums">{formatMs(runDetails.percentiles.max_itl)}</strong>
                    </div>
                  </div>
                </div>

                {/* Network Handshake Breakdown */}
                <div className="rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] p-4 space-y-2 font-sans text-xs">
                  <h4 className="font-semibold text-[var(--text-main)] flex items-center gap-2 text-xs">
                    <Network className="h-4 w-4 text-[var(--brand-secondary)]" />
                    Network handshake baseline
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[var(--bg-card)] p-2.5 rounded-lg border border-[var(--border-subtle)] shadow-2xs">
                      <span className="text-[var(--text-muted)] block text-[11px]">DNS lookup</span>
                      <span className="text-[var(--text-main)] font-sans font-semibold tabular-nums">{formatMs(runDetails.waterfall.dns_p50)}</span>
                    </div>
                    <div className="bg-[var(--bg-card)] p-2.5 rounded-lg border border-[var(--border-subtle)] shadow-2xs">
                      <span className="text-[var(--text-muted)] block text-[11px]">TCP handshake</span>
                      <span className="text-[var(--text-main)] font-sans font-semibold tabular-nums">{formatMs(runDetails.waterfall.tcp_p50)}</span>
                    </div>
                    <div className="bg-[var(--bg-card)] p-2.5 rounded-lg border border-[var(--border-subtle)] shadow-2xs">
                      <span className="text-[var(--text-muted)] block text-[11px]">TLS handshake</span>
                      <span className="text-[var(--text-main)] font-sans font-semibold tabular-nums">{formatMs(runDetails.waterfall.tls_p50)}</span>
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
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-end gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-medium shadow-2xs"
                      onClick={() => downloadFile(getApiUrl(`/api/export/pdf/${runDetails.id}`), `llmark_report_${runDetails.id}.pdf`)}
                    >
                      <Download className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                      PDF report
                    </Button>
                    <Button variant="outline" size="sm" asChild className="rounded-xl font-medium shadow-2xs cursor-pointer">
                      <a href={getApiUrl(`/api/export/csv/${runDetails.id}`)} download>
                        <Download className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                        CSV data
                      </a>
                    </Button>
                    <Button variant="default" size="sm" asChild className="rounded-xl bg-[var(--brand-primary)] text-[var(--text-inverse)] hover:bg-[var(--brand-primary-hover)] shadow-xs font-medium cursor-pointer">
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
