"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { HoldingForm } from "@/components/holdings/holding-form";
import { formatPercent, formatRelativeTime } from "@/lib/format";
import { api } from "@/lib/api";
import { HoldingResponse, HoldingCreate } from "@/types/holding";
import { Tag } from "@/types/tag";
import { mockHoldings } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Tags, X } from "lucide-react";
import { toast } from "sonner";

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<HoldingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Selection for bulk tagging
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [bulkTagging, setBulkTagging] = useState(false);

  // Filters
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchHoldings();
  }, []);

  async function fetchHoldings() {
    try {
      const data = await api.get<HoldingResponse[]>("/holdings");
      setHoldings(data);
    } catch {
      setHoldings(mockHoldings);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await api.post("/zerodha/sync");
      await fetchHoldings();
      toast.success("Holdings synced successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sync holdings. Check your Zerodha connection.";
      if (message.toLowerCase().includes("session expired")) {
        toast.error(message, {
          action: { label: "Authenticate", onClick: () => window.location.href = "/settings" },
          duration: 8000,
        });
      } else {
        toast.error(message);
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddHolding(data: HoldingCreate) {
    try {
      await api.post("/holdings", data);
      await fetchHoldings();
      toast.success("Holding added successfully");
    } catch {
      toast.error("Failed to add holding");
    }
  }

  function toggleSelection(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredHoldings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHoldings.map((h) => h.id)));
    }
  }

  async function handleBulkTag(tagId: number) {
    setBulkTagging(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((holdingId) =>
          api.post(`/holdings/${holdingId}/tags`, { tag_ids: [tagId] })
        )
      );
      toast.success(`Tag assigned to ${selectedIds.size} holding(s)`);
      setSelectedIds(new Set());
      setTagPickerOpen(false);
      await fetchHoldings();
    } catch {
      toast.error("Failed to assign tags");
    } finally {
      setBulkTagging(false);
    }
  }

  const filteredHoldings = holdings.filter((h) => {
    if (sourceFilter !== "all" && h.source !== sourceFilter) return false;
    if (typeFilter !== "all" && h.instrument_type !== typeFilter) return false;
    if (search && !h.symbol.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Holdings</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Holding
          </Button>
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            Sync Zerodha
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="zerodha">Zerodha</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="EQ">Equity</SelectItem>
            <SelectItem value="ETF">ETF</SelectItem>
            <SelectItem value="MF">Mutual Fund</SelectItem>
            <SelectItem value="Bond">Bond</SelectItem>
            <SelectItem value="Gold">Gold</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search by symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-[200px]"
        />
      </div>

      {/* Table */}
      {filteredHoldings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-gray-900">No holdings yet</p>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Track your stocks, ETFs, and mutual funds &mdash; synced
              automatically from Zerodha or added manually.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={handleSync}>
                Connect Zerodha
              </Button>
              <Button onClick={() => setShowAddForm(true)}>Add Holding</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        filteredHoldings.length > 0 &&
                        selectedIds.size === filteredHoldings.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="hidden md:table-cell">Exchange</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Avg Price</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Current Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">P&L %</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHoldings.map((holding) => {
                  const pnlPct =
                    holding.average_price > 0
                      ? ((holding.current_price || 0) / holding.average_price -
                          1) *
                        100
                      : 0;
                  return (
                    <TableRow key={holding.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(holding.id)}
                          onCheckedChange={() => toggleSelection(holding.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/holdings/${holding.id}`}
                          className="font-medium text-blue-800 hover:underline"
                        >
                          {holding.symbol}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-gray-500 md:table-cell">
                        {holding.exchange}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {holding.instrument_type}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {holding.quantity}
                      </TableCell>
                      <TableCell className="hidden text-right md:table-cell">
                        <CurrencyDisplay value={holding.average_price} />
                      </TableCell>
                      <TableCell className="hidden text-right md:table-cell">
                        <CurrencyDisplay
                          value={holding.current_price || 0}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay
                          value={holding.current_value || 0}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay
                          value={holding.pnl || 0}
                          showSign
                          colored
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "font-mono text-sm tabular-nums",
                            pnlPct >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          )}
                        >
                          {formatPercent(pnlPct, { showSign: true })}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-gray-500 capitalize md:table-cell">
                        {holding.source}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50 flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg md:left-1/2 md:right-auto md:-translate-x-1/2">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size} selected
          </span>
          <Popover
            open={tagPickerOpen}
            onOpenChange={(open) => {
              setTagPickerOpen(open);
              if (open) {
                api.get<Tag[]>("/tags").then(setAvailableTags).catch(() => {});
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button size="sm" disabled={bulkTagging}>
                <Tags className="mr-2 h-4 w-4" />
                Assign Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="center" side="top">
              {availableTags.length === 0 ? (
                <p className="px-2 py-1 text-xs text-gray-500">No tags available</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleBulkTag(tag.id)}
                      disabled={bulkTagging}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
                    >
                      {tag.color && (
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        </div>
      )}

      <HoldingForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSubmit={handleAddHolding}
      />
    </div>
  );
}
