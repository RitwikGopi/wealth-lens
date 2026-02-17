"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { TagBadge } from "@/components/shared/tag-badge";
import { FDForm } from "@/components/fixed-deposits/fd-form";
import { formatPercent, formatDate } from "@/lib/format";
import { api } from "@/lib/api";
import { FixedDeposit, FixedDepositCreate, getFDStatus } from "@/types/fixed-deposit";
import { mockFixedDeposits } from "@/lib/mock-data";
import { Plus, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

type StatusFilter = "all" | "active" | "closed";

export default function FixedDepositsPage() {
  const [fds, setFds] = useState<FixedDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    fetchFDs();
  }, []);

  async function fetchFDs() {
    try {
      const data = await api.get<FixedDeposit[]>("/fixed-deposits");
      setFds(data);
    } catch {
      setFds(mockFixedDeposits);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddFD(data: FixedDepositCreate) {
    try {
      await api.post("/fixed-deposits", data);
      await fetchFDs();
      toast.success("Fixed deposit added successfully");
    } catch {
      toast.error("Failed to add fixed deposit");
    }
  }

  const activeFDs = fds.filter((fd) => fd.status !== "closed");
  const filteredFDs =
    statusFilter === "all"
      ? fds
      : fds.filter((fd) => fd.status === statusFilter);
  const totalPrincipal = activeFDs.reduce((sum, fd) => sum + fd.principal, 0);
  const totalCurrentValue = activeFDs.reduce(
    (sum, fd) => sum + (fd.current_value || fd.principal),
    0
  );
  const totalInterest = totalCurrentValue - totalPrincipal;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Fixed Deposits</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add FD
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Principal</p>
            <p className="font-mono text-lg font-semibold tabular-nums sm:text-xl">
              <CurrencyDisplay value={totalPrincipal} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Current Value</p>
            <p className="font-mono text-lg font-semibold tabular-nums sm:text-xl">
              <CurrencyDisplay value={totalCurrentValue} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer group">
                  Interest Earned
                  <Info className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-60 text-sm">
                <p className="text-gray-600">
                  Interest earned so far, calculated using compound interest based on each FD&apos;s rate, compounding frequency, and tenure.
                </p>
              </PopoverContent>
            </Popover>
            <p className="font-mono text-lg font-semibold tabular-nums sm:text-xl">
              <CurrencyDisplay value={totalInterest} showSign colored />
            </p>
            {totalPrincipal > 0 && (
              <p className="mt-1 font-mono text-sm text-emerald-600 tabular-nums">
                {formatPercent((totalInterest / totalPrincipal) * 100, {
                  showSign: true,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      {fds.length > 0 && (
        <div className="flex gap-2">
          {(["all", "active", "closed"] as StatusFilter[]).map((f) => (
            <Button
              key={f}
              variant={statusFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f)}
            >
              {f === "all" ? `All (${fds.length})` : f === "active" ? `Active (${activeFDs.length})` : `Closed (${fds.length - activeFDs.length})`}
            </Button>
          ))}
        </div>
      )}

      {/* FD Table */}
      {fds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-gray-900">
              No fixed deposits yet
            </p>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Add your FDs to track maturity dates, see accrued interest in
              real-time, and include them in your total portfolio value.
            </p>
            <Button className="mt-4" onClick={() => setShowAddForm(true)}>
              + Add Fixed Deposit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="hidden md:table-cell">Start</TableHead>
                  <TableHead className="hidden md:table-cell">Maturity</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Interest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFDs.map((fd) => {
                  const status = getFDStatus(fd);
                  const interest = (fd.current_value || fd.principal) - fd.principal;
                  const statusVariant =
                    status === "active"
                      ? "active"
                      : status === "maturing_soon"
                      ? "maturing"
                      : status === "closed"
                      ? "closed"
                      : "matured";

                  return (
                    <TableRow key={fd.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <Link
                          href={`/fixed-deposits/${fd.id}`}
                          className="font-medium text-blue-800 hover:underline"
                        >
                          {fd.bank_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay value={fd.principal} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {fd.interest_rate}%
                      </TableCell>
                      <TableCell className="hidden text-gray-500 md:table-cell">
                        {formatDate(fd.start_date)}
                      </TableCell>
                      <TableCell className="hidden text-gray-500 md:table-cell">
                        {formatDate(fd.maturity_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay
                          value={fd.current_value || fd.principal}
                        />
                      </TableCell>
                      <TableCell className="hidden text-right md:table-cell">
                        <CurrencyDisplay value={interest} showSign colored />
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={statusVariant}>
                          {status === "active"
                            ? "Active"
                            : status === "maturing_soon"
                            ? "Maturing Soon"
                            : status === "closed"
                            ? "Closed"
                            : "Matured"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex gap-1">
                          {fd.tags?.map((tag) => (
                            <TagBadge
                              key={tag.id}
                              name={tag.name}
                              color={tag.color}
                            />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <FDForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSubmit={handleAddFD}
      />
    </div>
  );
}
