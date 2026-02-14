"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { TagBadge } from "@/components/shared/tag-badge";
import { TagPicker } from "@/components/shared/tag-picker";
import { formatPercent, formatDate } from "@/lib/format";
import { api } from "@/lib/api";
import { Holding } from "@/types/holding";
import { Transaction } from "@/types/transaction";
import { mockHoldings, mockTransactions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function HoldingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [holding, setHolding] = useState<Holding | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [holdingData, txnData] = await Promise.all([
          api.get<Holding>(`/holdings/${id}`),
          api.get<Transaction[]>("/transactions", { holding_id: id }),
        ]);
        setHolding(holdingData);
        setTransactions(txnData);
      } catch {
        const mock = mockHoldings.find((h) => h.id === Number(id));
        setHolding(mock ? { ...mock, tags: [] } : null);
        setTransactions(
          mockTransactions.filter((t) => t.holding_id === Number(id))
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function handleDelete() {
    try {
      await api.delete(`/holdings/${id}`);
      toast.success("Holding deleted");
      router.push("/holdings");
    } catch {
      toast.error("Failed to delete holding");
    }
  }

  async function handleAssignTags(tagIds: number[]) {
    await api.post(`/holdings/${id}/tags`, { tag_ids: tagIds });
    const updated = await api.get<Holding>(`/holdings/${id}`);
    setHolding(updated);
    toast.success("Tag added");
  }

  async function handleRemoveTag(tagId: number) {
    await api.delete(`/holdings/${id}/tags/${tagId}`);
    if (holding) {
      setHolding({ ...holding, tags: holding.tags.filter((t) => t.id !== tagId) });
    }
    toast.success("Tag removed");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!holding) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-500">Holding not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/holdings">Back to Holdings</Link>
        </Button>
      </div>
    );
  }

  const pnlPct =
    holding.average_price > 0
      ? (((holding.current_price || 0) / holding.average_price) - 1) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/holdings" className="hover:text-gray-700">
          Holdings
        </Link>
        <span>/</span>
        <span className="text-gray-900">{holding.symbol}</span>
      </div>

      {/* Holding Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">{holding.symbol}</CardTitle>
            <p className="text-sm text-gray-500">
              {holding.exchange} | {holding.instrument_type} | Source:{" "}
              {holding.source}
            </p>
          </div>
          <div className="flex gap-2">
            {holding.source === "manual" && (
              <Button variant="outline" size="sm">
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {holding.symbol}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this holding. Transaction records
                    will be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Quantity</p>
              <p className="font-mono text-lg tabular-nums">{holding.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Price</p>
              <p className="font-mono text-lg tabular-nums">
                <CurrencyDisplay value={holding.average_price} />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Price</p>
              <p className="font-mono text-lg tabular-nums">
                <CurrencyDisplay value={holding.current_price || 0} />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Value</p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                <CurrencyDisplay value={holding.current_value || 0} />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">P&L</p>
              <p className="font-mono text-lg tabular-nums">
                <CurrencyDisplay
                  value={holding.pnl || 0}
                  showSign
                  colored
                />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">P&L %</p>
              <p
                className={cn(
                  "font-mono text-lg tabular-nums",
                  pnlPct >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {formatPercent(pnlPct, { showSign: true })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags + Notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {holding.tags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  name={tag.name}
                  color={tag.color}
                  size="md"
                  removable
                  onRemove={() => handleRemoveTag(tag.id)}
                />
              ))}
              <TagPicker
                assignedTags={holding.tags}
                onAssign={handleAssignTags}
                onRemove={handleRemoveTag}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {holding.notes || "No notes added yet."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Related Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Related Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No transactions recorded for this holding.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{formatDate(txn.date)}</TableCell>
                    <TableCell className="capitalize">{txn.type}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {txn.quantity ?? "--"}
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.price ? (
                        <CurrencyDisplay value={txn.price} />
                      ) : (
                        "--"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay value={txn.amount} />
                    </TableCell>
                    <TableCell>
                      {txn.source === "auto_sync" && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Auto
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
