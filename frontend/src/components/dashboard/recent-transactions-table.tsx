"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/format";
import { Transaction } from "@/types/transaction";
import { ArrowRight } from "lucide-react";

interface RecentTransactionsTableProps {
  transactions: Transaction[];
}

const typeVariantMap: Record<string, "active" | "error" | "info" | "pending" | "neutral"> = {
  deposit: "active",
  withdrawal: "error",
  buy: "info",
  sell: "warning" as "pending",
  dividend: "pending",
  interest: "pending",
  fd_open: "info",
  fd_close: "neutral",
};

export function RecentTransactionsTable({
  transactions,
}: RecentTransactionsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-gray-500">
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell className="text-gray-500">
                  {formatDate(txn.date)}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={typeVariantMap[txn.type] || "neutral"}>
                    {txn.type}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-right">
                  <CurrencyDisplay value={txn.amount} />
                </TableCell>
                <TableCell className="text-gray-500">
                  {txn.notes || "--"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-3">
          <Link
            href="/transactions"
            className="inline-flex items-center text-sm font-medium text-blue-800 hover:text-blue-900"
          >
            View All Transactions
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
