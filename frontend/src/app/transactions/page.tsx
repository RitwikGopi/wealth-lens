"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/format";
import { api } from "@/lib/api";
import {
  Transaction,
  TransactionCreate,
  TransactionType,
} from "@/types/transaction";
import { LifetimeGains } from "@/types/portfolio";
import { mockTransactions } from "@/lib/mock-data";
import { Plus, Pencil, Trash2, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

const transactionTypes: TransactionType[] = [
  "deposit", "withdrawal", "buy", "sell", "dividend", "interest", "fd_open", "fd_close",
];

const typeVariantMap: Record<string, "active" | "error" | "info" | "pending" | "neutral"> = {
  deposit: "active",
  withdrawal: "error",
  buy: "info",
  sell: "pending",
  dividend: "pending",
  interest: "pending",
  fd_open: "info",
  fd_close: "neutral",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Form state
  const [form, setForm] = useState<TransactionCreate>({
    type: "deposit",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  // Lifetime gains
  const [lifetimeGains, setLifetimeGains] = useState<LifetimeGains | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchLifetimeGains();
  }, []);

  async function fetchTransactions() {
    try {
      const params: Record<string, string> = {};
      if (typeFilter !== "all") params.type = typeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await api.get<Transaction[]>("/transactions", params);
      setTransactions(data);
    } catch {
      setTransactions(mockTransactions);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLifetimeGains() {
    try {
      const data = await api.get<LifetimeGains>("/portfolio/lifetime-gains");
      setLifetimeGains(data);
    } catch {
      // Silently ignore — card just won't show
    }
  }

  async function handleAddTransaction() {
    setFormLoading(true);
    try {
      await api.post("/transactions", form);
      await fetchTransactions();
      setShowAddForm(false);
      setForm({
        type: "deposit",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      toast.success("Transaction added");
    } catch {
      toast.error("Failed to add transaction");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/transactions/${id}`);
      await fetchTransactions();
      toast.success("Transaction deleted");
    } catch {
      toast.error("Failed to delete transaction");
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    return true;
  });

  // Summary calculations
  const totalDeposited = filteredTransactions
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = filteredTransactions
    .filter((t) => t.type === "withdrawal")
    .reduce((s, t) => s + t.amount, 0);
  const netInvested = totalDeposited - totalWithdrawn;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Transactions</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Deposited</p>
            <p className="font-mono text-lg font-semibold tabular-nums sm:text-xl">
              <CurrencyDisplay value={totalDeposited} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Withdrawn</p>
            <p className="font-mono text-lg font-semibold tabular-nums sm:text-xl">
              <CurrencyDisplay value={totalWithdrawn} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer group">
                  Net Invested
                  <Info className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 text-sm">
                <p className="text-gray-600">
                  Total deposits minus total withdrawals. This is the actual money you&apos;ve put into investments.
                </p>
              </PopoverContent>
            </Popover>
            <p className="font-mono text-lg font-semibold tabular-nums sm:text-xl">
              <CurrencyDisplay value={netInvested} showSign colored />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer group">
                  Lifetime Gain
                  <Info className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 text-sm">
                <p className="text-gray-600">
                  Total profit across your entire investment journey.
                  Formula: Current Value + Withdrawals &minus; Deposits.
                </p>
              </PopoverContent>
            </Popover>
            <p className="font-mono text-lg font-semibold tabular-nums sm:text-xl">
              <CurrencyDisplay
                value={lifetimeGains?.lifetime_gain ?? 0}
                showSign
                colored
              />
            </p>
            {lifetimeGains?.lifetime_gain_pct != null && (
              <p className={`font-mono text-xs font-semibold tabular-nums ${
                lifetimeGains.lifetime_gain_pct >= 0 ? "text-emerald-600" : "text-red-600"
              }`}>
                {lifetimeGains.lifetime_gain_pct >= 0 ? "+" : ""}
                {lifetimeGains.lifetime_gain_pct.toFixed(2)}%
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {transactionTypes.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-500">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-[160px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-500">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-[160px]"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <p className="font-medium text-gray-900">
                      No transactions recorded
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Track deposits, withdrawals, buys, sells, and dividends
                      for accurate lifetime gain calculations.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-gray-500">
                      {formatDate(txn.date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={typeVariantMap[txn.type] || "neutral"}>
                        {txn.type.replace("_", " ")}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay value={txn.amount} />
                    </TableCell>
                    <TableCell className="hidden text-gray-500 md:table-cell">
                      {txn.notes || "--"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {txn.source === "auto_sync" ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Auto
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Manual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(txn.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="txn-date">Date *</Label>
              <Input
                id="txn-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="txn-type">Type *</Label>
              <Select
                value={form.type}
                onValueChange={(val) =>
                  setForm({ ...form, type: val as TransactionType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="txn-amount">Amount * (INR)</Label>
              <Input
                id="txn-amount"
                type="number"
                step="0.01"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="txn-notes">Description</Label>
              <Input
                id="txn-notes"
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTransaction} disabled={formLoading}>
              {formLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
