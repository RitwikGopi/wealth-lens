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
import { Textarea } from "@/components/ui/textarea";
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
import { formatDate } from "@/lib/format";
import { api } from "@/lib/api";
import { AllocationDrift, AllocationDriftAPI } from "@/types/allocation";
import { PortfolioSummaryAPI } from "@/types/portfolio";
import { mockAllocationDrift } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface RebalancingMoveForm {
  action: "sell" | "buy";
  investment: string;
  amount: number;
}

interface RebalancingOp {
  id: number;
  name: string;
  date: string;
  notes: string | null;
  status: string;
  created_at: string;
  moves: { id: number; action: string; investment: string; amount: number }[];
  total_sells: number;
  total_buys: number;
}

export default function RebalancingPage() {
  const [drift, setDrift] = useState<AllocationDrift | null>(null);
  const [history, setHistory] = useState<RebalancingOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Rebalancing form
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formNotes, setFormNotes] = useState("");
  const [moves, setMoves] = useState<RebalancingMoveForm[]>([
    { action: "sell", investment: "", amount: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [driftData, summaryData, ops] = await Promise.all([
        api.get<AllocationDriftAPI[]>("/allocations/drift"),
        api.get<PortfolioSummaryAPI>("/portfolio/summary"),
        api.get<RebalancingOp[]>("/rebalancing"),
      ]);

      const allocations = driftData.map((d, i) => ({
        id: i + 1,
        tag_id: d.tag_id,
        tag_name: d.tag_name,
        tag_color: null,
        target_pct: d.target_pct,
        actual_pct: d.current_pct,
        actual_value: d.current_value,
        drift_pct: d.drift,
        drift_value: (d.drift / 100) * summaryData.total_value,
      }));

      setDrift({
        total_portfolio_value: summaryData.total_value,
        allocations,
      });
      setHistory(ops);
    } catch {
      setDrift(mockAllocationDrift);
    } finally {
      setLoading(false);
    }
  }

  function addMove() {
    setMoves([...moves, { action: "buy", investment: "", amount: 0 }]);
  }

  function removeMove(index: number) {
    setMoves(moves.filter((_, i) => i !== index));
  }

  function updateMove(index: number, field: keyof RebalancingMoveForm, value: string | number) {
    const updated = [...moves];
    updated[index] = { ...updated[index], [field]: value };
    setMoves(updated);
  }

  const totalSells = moves
    .filter((m) => m.action === "sell")
    .reduce((s, m) => s + m.amount, 0);
  const totalBuys = moves
    .filter((m) => m.action === "buy")
    .reduce((s, m) => s + m.amount, 0);

  async function handleSubmit() {
    setSaving(true);
    try {
      await api.post("/rebalancing", {
        name: formName,
        date: formDate,
        notes: formNotes || null,
        moves: moves.filter((m) => m.investment && m.amount > 0),
      });
      toast.success("Rebalancing operation created");
      setShowCreateForm(false);
      setFormName("");
      setFormNotes("");
      setMoves([{ action: "sell", investment: "", amount: 0 }]);
      await fetchData();
    } catch {
      toast.error("Failed to create rebalancing operation");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(opId: number) {
    try {
      await api.delete(`/rebalancing/${opId}`);
      toast.success("Rebalancing operation deleted");
      setHistory(history.filter((h) => h.id !== opId));
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const overAllocated = drift?.allocations.filter((a) => a.drift_pct > 0) || [];
  const underAllocated = drift?.allocations.filter((a) => a.drift_pct < 0) || [];

  const totalActualPct = drift?.allocations.reduce((s, a) => s + a.actual_pct, 0) ?? 0;
  const untaggedPct = 100 - totalActualPct;
  const hasUntagged = untaggedPct > 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Rebalancing</h1>

      {/* Current Drift Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-gray-500">
            Current Drift Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {drift && (
            <p className="text-sm text-gray-500">
              Total Portfolio:{" "}
              <span className="font-mono font-semibold text-gray-900">
                <CurrencyDisplay value={drift.total_portfolio_value} />
              </span>
            </p>
          )}

          {overAllocated.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700">
                Over-Allocated:
              </p>
              <div className="mt-1 space-y-1">
                {overAllocated.map((a) => (
                  <div
                    key={a.tag_id}
                    className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium text-blue-800">
                      {a.tag_name}
                    </span>
                    <span className="font-mono text-blue-700 tabular-nums">
                      +{a.drift_pct.toFixed(1)}pp (
                      <CurrencyDisplay value={a.drift_value} showSign />)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {underAllocated.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700">
                Under-Allocated:
              </p>
              <div className="mt-1 space-y-1">
                {underAllocated.map((a) => (
                  <div
                    key={a.tag_id}
                    className="flex items-center justify-between rounded-md bg-orange-50 px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium text-orange-800">
                      {a.tag_name}
                    </span>
                    <span className="font-mono text-orange-700 tabular-nums">
                      {a.drift_pct.toFixed(1)}pp (
                      <CurrencyDisplay value={a.drift_value} showSign />)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasUntagged && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <span className="font-medium">{untaggedPct.toFixed(1)}%</span> of
                your portfolio is untagged and not included in drift
                calculations.{" "}
                <Link href="/holdings" className="font-medium underline hover:text-amber-900">
                  Tag holdings
                </Link>
              </div>
            </div>
          )}

          <Button onClick={() => setShowCreateForm(true)}>
            Create Rebalancing Operation
          </Button>
        </CardContent>
      </Card>

      {/* Rebalancing History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-gray-500">
            Rebalancing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No rebalancing operations yet. When your portfolio drifts from your
              target allocation, create a rebalancing operation to record the
              adjustments.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Sells</TableHead>
                  <TableHead className="text-right">Buys</TableHead>
                  <TableHead>Moves</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium">{op.name}</TableCell>
                    <TableCell>{formatDate(op.date)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      <CurrencyDisplay value={op.total_sells} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      <CurrencyDisplay value={op.total_buys} />
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {op.moves.map((m) => (
                        <span key={m.id} className="mr-2">
                          {m.action === "sell" ? "Sell" : "Buy"} {m.investment}
                        </span>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(op.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Rebalancing Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Rebalancing Operation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Q1 2026 Rebalance"
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Moves</Label>
              {moves.map((move, index) => (
                <div
                  key={index}
                  className="flex items-end gap-2 rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Action</Label>
                    <Select
                      value={move.action}
                      onValueChange={(val) =>
                        updateMove(index, "action", val)
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sell">Sell</SelectItem>
                        <SelectItem value="buy">Buy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Investment</Label>
                    <Input
                      value={move.investment}
                      onChange={(e) =>
                        updateMove(index, "investment", e.target.value)
                      }
                      placeholder="Search..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Amount (INR)</Label>
                    <Input
                      type="number"
                      value={move.amount || ""}
                      onChange={(e) =>
                        updateMove(index, "amount", Number(e.target.value))
                      }
                      className="w-[120px]"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => removeMove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addMove}>
                <Plus className="mr-1 h-4 w-4" />
                Add Move
              </Button>
            </div>

            {/* Summary */}
            <div className="rounded-md bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span>Total Sells:</span>
                <span className="font-mono tabular-nums">
                  <CurrencyDisplay value={totalSells} />
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Buys:</span>
                <span className="font-mono tabular-nums">
                  <CurrencyDisplay value={totalBuys} />
                </span>
              </div>
              <div className="flex justify-between border-t pt-1 font-medium">
                <span>Net:</span>
                <span className="font-mono tabular-nums">
                  <CurrencyDisplay value={totalSells - totalBuys} showSign />
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formName.trim() || saving}>
              {saving ? "Saving..." : "Execute Rebalance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
