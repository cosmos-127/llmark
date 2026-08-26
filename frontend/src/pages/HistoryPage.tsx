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
} from "lucide-react";
import { api } from "@/lib/api";
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

export const HistoryPage: React.FC = () => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
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
            className="-ml-3 h-8 font-sans font-medium text-xs text-[#2C2C2C] dark:text-[#F3F4F4] hover:text-[#853953] dark:hover:text-[#A74B6A]"
          >
            Benchmark run & model
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1.5 h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1.5 h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="font-sans">
              <div className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4] group-hover:text-[#853953] dark:group-hover:text-[#A74B6A] transition-colors">
                {r.name}
              </div>
              <div className="text-xs font-sans text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 flex items-center gap-2 mt-0.5">
                <Badge variant="default" className="text-[10px] py-0 px-1.5 font-medium">
                  {r.model}
                </Badge>
                <span className="text-[#2C2C2C]/30 dark:text-[#F3F4F4]/30">•</span>
                <span className="text-[#2C2C2C]/80 dark:text-[#F3F4F4]/80 flex items-center gap-1">
                  <ProviderLogo vendor={r.vendor} className="h-3 w-3 inline text-[#853953] dark:text-[#A74B6A]" />
                  {r.vendor}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "workload_preset",
        header: "Preset",
        cell: ({ row }) => (
          <span className="capitalize text-[#2C2C2C] dark:text-[#F3F4F4] font-sans text-xs">{row.original.workload_preset}</span>
        ),
      },
      {
        accessorKey: "concurrency",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 font-sans font-medium text-xs text-[#2C2C2C] dark:text-[#F3F4F4] hover:text-[#853953] dark:hover:text-[#A74B6A]"
          >
            Concurrency
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1.5 h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1.5 h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => <span className="text-[#2C2C2C] dark:text-[#F3F4F4] font-mono text-xs">{row.original.concurrency} streams</span>,
      },
      {
        accessorKey: "completed_requests",
        header: "Requests",
        cell: ({ row }) => <span className="text-[#2C2C2C] dark:text-[#F3F4F4] font-mono text-xs">{row.original.completed_requests} reqs</span>,
      },
      {
        accessorKey: "ttft_p95",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 font-sans font-medium text-xs text-[#853953] dark:text-[#A74B6A] hover:text-[#612D53]"
          >
            TTFT (P95)
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1.5 h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1.5 h-3 w-3 text-[#853953] dark:text-[#A74B6A]" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => <span className="text-[#853953] dark:text-[#A74B6A] font-bold font-mono text-xs">{formatMs(row.original.ttft_p95)}</span>,
      },
      {
        accessorKey: "itl_p95",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 font-sans font-medium text-xs text-[#612D53] dark:text-[#C57BB2] hover:text-[#853953]"
          >
            ITL (P95)
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1.5 h-3 w-3 text-[#612D53] dark:text-[#C57BB2]" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1.5 h-3 w-3 text-[#612D53] dark:text-[#C57BB2]" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => <span className="text-[#612D53] dark:text-[#C57BB2] font-bold font-mono text-xs">{formatMs(row.original.itl_p95)}</span>,
      },
      {
        accessorKey: "goodput_pct",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 font-sans font-medium text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
          >
            Goodput %
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1.5 h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1.5 h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.goodput_pct >= 95 ? "emerald" : "default"}
            className="text-[11px] font-medium font-mono"
          >
            {formatPct(row.original.goodput_pct)}
          </Badge>
        ),
      },
      {
        accessorKey: "total_cost_usd",
        header: "Total cost",
        cell: ({ row }) => <span className="text-[#2C2C2C] dark:text-[#F3F4F4] font-mono text-xs">{formatUsd(row.original.total_cost_usd)}</span>,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Inspect</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRunId(row.original.id);
              }}
              className="h-8 w-8 rounded-xl shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <ArrowUpRight className="h-4 w-4" />
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
      <div className="space-y-6">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#2C2C2C] dark:text-[#F3F4F4] tracking-normal flex items-center gap-2.5 font-sans">
              <div className="p-2 rounded-xl bg-[#853953]/10 dark:bg-[#A74B6A]/15 text-[#853953] dark:text-[#A74B6A] border border-[#853953]/25 dark:border-[#A74B6A]/35">
                <History className="h-5 w-5" />
              </div>
              Benchmark history explorer
            </h2>
            <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 mt-1 font-sans">
              Persisted benchmarks with column sorting, filtering, and export.
            </p>
          </div>

          {/* Search & Vendor Filter */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-1 rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] p-1 border border-[#2C2C2C]/15 dark:border-[#F3F4F4]/15 text-xs font-sans">
              {["all", "mock", "openai", "anthropic"].map((vf) => {
                const isActive = vendorFilter === vf;
                return (
                  <button
                    key={vf}
                    onClick={() => setVendorFilter(vf)}
                    className={cn(
                      "relative flex items-center gap-1.5 h-7 px-3 rounded-lg capitalize text-xs font-medium transition-colors cursor-pointer select-none",
                      isActive
                        ? "text-[#853953] dark:text-[#A74B6A] font-bold"
                        : "text-[#2C2C2C]/70 dark:text-[#F3F4F4]/70 hover:text-[#2C2C2C] dark:hover:text-[#F3F4F4]"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="history-vendor-filter-pill"
                        className="absolute inset-0 bg-white dark:bg-[#252426] rounded-lg shadow-xs border border-[#853953]/20 dark:border-[#A74B6A]/30"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    {vf !== "all" && <ProviderLogo vendor={vf} className="relative z-10 h-3 w-3" />}
                    <span className="relative z-10">{vf}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Input
                type="text"
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Filter results..."
                className="pl-9"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#2C2C2C]/40 dark:text-[#F3F4F4]/40 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* History Data Table */}
        {isLoading ? (
          <Card className="h-64 flex flex-col items-center justify-center text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-sans space-y-2">
            <Sparkles className="h-6 w-6 text-[#853953] dark:text-[#A74B6A] animate-spin" />
            <p>Loading historical benchmark executions...</p>
          </Card>
        ) : isError ? (
          <Card className="border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30">
            <CardContent className="p-5 text-xs text-rose-800 dark:text-rose-300 font-sans">
              Failed to load historical benchmarks. Please verify backend connection.
            </CardContent>
          </Card>
        ) : table.getRowModel().rows.length === 0 ? (
          <Card className="h-64 flex flex-col items-center justify-center text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 space-y-3 font-sans">
            <EmptyStateIllustration className="h-16 w-16" />
            <p>No historical runs found matching criteria.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="py-3.5 px-4">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer group hover:bg-[#F3F4F4]/70 dark:hover:bg-[#2C2C2C]/60 transition-colors"
                      onClick={() => setSelectedRunId(row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3.5 px-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* TanStack Table Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1 text-xs font-sans text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60">
              <div className="flex items-center gap-2">
                <span>
                  Showing page <strong className="text-[#2C2C2C] dark:text-[#F3F4F4] font-mono">{table.getState().pagination.pageIndex + 1}</strong> of{" "}
                  <strong className="text-[#2C2C2C] dark:text-[#F3F4F4] font-mono">{table.getPageCount() || 1}</strong>
                </span>
                <span>•</span>
                <span>Total runs: <strong className="text-[#2C2C2C] dark:text-[#F3F4F4] font-mono">{filteredData.length}</strong></span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="h-8 w-8"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="h-8 w-8"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Deep Run Details Modal with shadcn Dialog */}
        <Dialog open={!!selectedRunId} onOpenChange={(open) => !open && setSelectedRunId(null)}>
          <DialogContent className="max-w-2xl">
            {isLoadingDetails || !runDetails ? (
              <div className="h-48 flex flex-col items-center justify-center text-xs text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 font-sans space-y-2">
                <Sparkles className="h-6 w-6 text-[#853953] dark:text-[#A74B6A] animate-spin" />
                <p>Loading benchmark telemetry metrics...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-[#2C2C2C] dark:text-[#F3F4F4]">{runDetails.name}</DialogTitle>
                  <DialogDescription>
                    Model: <strong className="text-[#853953] dark:text-[#A74B6A] font-mono">{runDetails.model}</strong> • Vendor:{" "}
                    <strong className="text-[#2C2C2C] dark:text-[#F3F4F4]">{runDetails.vendor}</strong> • Preset:{" "}
                    <strong className="text-[#2C2C2C] dark:text-[#F3F4F4] capitalize">{runDetails.workload_preset}</strong>
                  </DialogDescription>
                </DialogHeader>

                {/* KPI Triplet */}
                <div className="grid grid-cols-3 gap-3 text-xs font-sans">
                  <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 p-3.5">
                    <span className="text-xs font-medium text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 block">Goodput (SLO)</span>
                    <p className="text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                      {formatPct(runDetails.percentiles.goodput_pct)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 p-3.5">
                    <span className="text-xs font-medium text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 block">Decode TPS</span>
                    <p className="text-lg font-extrabold font-mono text-[#612D53] dark:text-[#C57BB2] mt-1">
                      {runDetails.percentiles.tps_decode.toFixed(1)} tok/s
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 p-3.5">
                    <span className="text-xs font-medium text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 block">Total spend</span>
                    <p className="text-lg font-extrabold font-mono text-[#853953] dark:text-[#A74B6A] mt-1">
                      {formatUsd(runDetails.counts.total_cost_usd)}
                    </p>
                  </div>
                </div>

                {/* Unaggregated Percentile Grid */}
                <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 p-4 space-y-3 font-sans text-xs">
                  <h4 className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-2 text-xs">
                    <Activity className="h-4 w-4 text-[#853953] dark:text-[#A74B6A]" />
                    Unaggregated percentile distribution
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-white dark:bg-[#252426] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 block text-[11px]">TTFT (P50)</span>
                      <strong className="text-[#612D53] dark:text-[#C57BB2] font-mono font-bold">{formatMs(runDetails.percentiles.ttft_p50)}</strong>
                    </div>
                    <div className="bg-white dark:bg-[#252426] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 block text-[11px]">TTFT (P95)</span>
                      <strong className="text-[#853953] dark:text-[#A74B6A] font-mono font-bold">{formatMs(runDetails.percentiles.ttft_p95)}</strong>
                    </div>
                    <div className="bg-white dark:bg-[#252426] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 block text-[11px]">TTFT (P99)</span>
                      <strong className="text-[#612D53] dark:text-[#C57BB2] font-mono font-bold">{formatMs(runDetails.percentiles.ttft_p99)}</strong>
                    </div>
                    <div className="bg-white dark:bg-[#252426] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 block text-[11px]">Max ITL freeze</span>
                      <strong className="text-rose-700 dark:text-rose-400 font-mono font-bold">{formatMs(runDetails.percentiles.max_itl)}</strong>
                    </div>
                  </div>
                </div>

                {/* Network Handshake Breakdown */}
                <div className="rounded-xl bg-[#F3F4F4] dark:bg-[#2C2C2C] border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 p-4 space-y-2 font-sans text-xs">
                  <h4 className="font-medium text-[#2C2C2C] dark:text-[#F3F4F4] flex items-center gap-2 text-xs">
                    <Network className="h-4 w-4 text-[#612D53] dark:text-[#C57BB2]" />
                    Network handshake baseline
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white dark:bg-[#252426] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 block text-[11px]">DNS lookup</span>
                      <span className="text-[#2C2C2C] dark:text-[#F3F4F4] font-mono font-medium">{formatMs(runDetails.waterfall.dns_p50)}</span>
                    </div>
                    <div className="bg-white dark:bg-[#252426] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 block text-[11px]">TCP handshake</span>
                      <span className="text-[#2C2C2C] dark:text-[#F3F4F4] font-mono font-medium">{formatMs(runDetails.waterfall.tcp_p50)}</span>
                    </div>
                    <div className="bg-white dark:bg-[#252426] p-2.5 rounded-lg border border-[#2C2C2C]/10 dark:border-[#F3F4F4]/10 shadow-2xs">
                      <span className="text-[#2C2C2C]/60 dark:text-[#F3F4F4]/60 block text-[11px]">TLS handshake</span>
                      <span className="text-[#2C2C2C] dark:text-[#F3F4F4] font-mono font-medium">{formatMs(runDetails.waterfall.tls_p50)}</span>
                    </div>
                  </div>
                </div>

                {/* Multi-Format Export Hub Bar */}
                <div className="pt-3 border-t border-[#F3F4F4] dark:border-[#F3F4F4]/10 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-medium text-[#2C2C2C] dark:text-[#F3F4F4] font-sans">Export telemetry package:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-medium shadow-2xs"
                      onClick={() => downloadFile(`/api/export/pdf/${runDetails.id}`, `llmark_report_${runDetails.id}.pdf`)}
                    >
                      <Download className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                      PDF report
                    </Button>
                    <Button variant="outline" size="sm" asChild className="rounded-xl font-medium shadow-2xs cursor-pointer">
                      <a href={`/api/export/csv/${runDetails.id}`} download>
                        <Download className="h-3.5 w-3.5 text-[#853953] dark:text-[#A74B6A]" />
                        CSV data
                      </a>
                    </Button>
                    <Button variant="default" size="sm" asChild className="rounded-xl bg-[#853953] dark:bg-[#A74B6A] text-white hover:bg-[#612D53] shadow-xs font-medium cursor-pointer">
                      <a href={`/api/export/bundle/${runDetails.id}`} download>
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
