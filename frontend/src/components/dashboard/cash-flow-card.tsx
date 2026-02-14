"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { cn } from "@/lib/utils";
import { LifetimeGains } from "@/types/portfolio";
import { ArrowRight } from "lucide-react";

interface CashFlowCardProps {
  data: LifetimeGains;
}

export function CashFlowCard({ data }: CashFlowCardProps) {
  const items = [
    {
      label: "Total Invested",
      value: data.total_invested,
      color: "bg-blue-500",
      textColor: "text-blue-700",
    },
    {
      label: "Withdrawn",
      value: data.total_withdrawn,
      color: "bg-amber-500",
      textColor: "text-amber-700",
    },
    {
      label: "Current Value",
      value: data.current_portfolio_value,
      color: "bg-emerald-500",
      textColor: "text-emerald-700",
    },
    {
      label: "Lifetime Gain",
      value: data.lifetime_gain,
      color: data.lifetime_gain >= 0 ? "bg-emerald-500" : "bg-red-500",
      textColor: data.lifetime_gain >= 0 ? "text-emerald-700" : "text-red-700",
    },
  ];

  // Calculate max value for proportional widths
  const maxVal = Math.max(...items.map((i) => Math.abs(i.value)), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-gray-500">
          Cash Flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {items.map((item, idx) => (
            <div key={item.label} className="flex items-center gap-2" style={{ flex: Math.max(Math.abs(item.value) / maxVal, 0.15) }}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-gray-500">{item.label}</p>
                <div
                  className={cn(
                    "mt-1 rounded-md px-2 py-2",
                    item.color,
                    "bg-opacity-15"
                  )}
                >
                  <p className={cn("font-mono text-sm font-semibold tabular-nums", item.textColor)}>
                    <CurrencyDisplay
                      value={item.value}
                      showSign={item.label === "Lifetime Gain"}
                    />
                  </p>
                </div>
              </div>
              {idx < items.length - 1 && (
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
              )}
            </div>
          ))}
        </div>

        {/* Secondary breakdown */}
        <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-gray-500">
          <span>
            Unrealized P&L:{" "}
            <span className={cn("font-mono font-semibold", data.unrealized_pnl >= 0 ? "text-emerald-600" : "text-red-600")}>
              <CurrencyDisplay value={data.unrealized_pnl} showSign />
            </span>
          </span>
          <span>
            Realized P&L:{" "}
            <span className={cn("font-mono font-semibold", data.realized_pnl >= 0 ? "text-emerald-600" : "text-red-600")}>
              <CurrencyDisplay value={data.realized_pnl} showSign />
            </span>
          </span>
          <span>
            Withdrawals:{" "}
            <span className="font-mono font-semibold text-gray-700">
              {data.withdrawal_count}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
