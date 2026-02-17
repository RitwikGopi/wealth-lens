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
import { TagBadge } from "@/components/shared/tag-badge";
import { formatPercent } from "@/lib/format";
import { TopHolding } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface TopHoldingsTableProps {
  holdings: TopHolding[];
}

export function TopHoldingsTable({ holdings }: TopHoldingsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-gray-500">
          Top Holdings by Value
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">P&L %</TableHead>
              <TableHead className="hidden md:table-cell">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => (
              <TableRow key={holding.id}>
                <TableCell className="font-medium">{holding.symbol}</TableCell>
                <TableCell className="hidden text-gray-500 md:table-cell">
                  {holding.instrument_type}
                </TableCell>
                <TableCell className="text-right">
                  <CurrencyDisplay value={holding.current_value} />
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      holding.pnl_percentage >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    )}
                  >
                    {formatPercent(holding.pnl_percentage, { showSign: true })}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex gap-1">
                    {holding.tags.map((tag) => (
                      <TagBadge
                        key={tag.name}
                        name={tag.name}
                        color={tag.color}
                      />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-3">
          <Link
            href="/holdings"
            className="inline-flex items-center text-sm font-medium text-blue-800 hover:text-blue-900"
          >
            View All Holdings
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
