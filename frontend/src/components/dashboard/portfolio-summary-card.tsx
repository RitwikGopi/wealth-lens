"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { formatINR, formatPercent, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";
import { LifetimeGains } from "@/types/portfolio";

interface PortfolioSummaryCardProps {
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  lastSynced: string | null;
  lifetimeGains?: LifetimeGains | null;
}

export function PortfolioSummaryCard({
  totalValue,
  totalInvested,
  totalPnl,
  lastSynced,
  lifetimeGains,
}: PortfolioSummaryCardProps) {
  const hasLifetimeData = lifetimeGains?.lifetime_gain != null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-gray-500">
          Portfolio Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            <CurrencyDisplay value={totalValue} />
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Invested</p>
            <p className="font-mono text-lg tabular-nums">
              <CurrencyDisplay value={totalInvested} />
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Unrealized P&L</p>
            {lifetimeGains ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 text-left group cursor-pointer">
                    <span className="font-mono text-lg tabular-nums">
                      <CurrencyDisplay value={totalPnl} showSign colored />
                    </span>
                    <Info className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72">
                  <UnrealizedPnlBreakdown data={lifetimeGains} />
                </PopoverContent>
              </Popover>
            ) : (
              <p className="font-mono text-lg tabular-nums">
                <CurrencyDisplay value={totalPnl} showSign colored />
              </p>
            )}
          </div>
        </div>

        {hasLifetimeData && (
          <>
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                Lifetime Returns
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Lifetime Gain</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 text-left group cursor-pointer">
                        <span className="font-mono text-lg tabular-nums">
                          <CurrencyDisplay value={lifetimeGains!.lifetime_gain} showSign colored />
                        </span>
                        <Info className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80">
                      <LifetimeGainBreakdown data={lifetimeGains!} />
                    </PopoverContent>
                  </Popover>
                  {lifetimeGains!.lifetime_gain_pct != null && (
                    <span
                      className={cn(
                        "font-mono text-xs font-semibold tabular-nums",
                        lifetimeGains!.lifetime_gain >= 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {formatPercent(lifetimeGains!.lifetime_gain_pct, { showSign: true })}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Withdrawn</p>
                  <p className="font-mono text-lg tabular-nums">
                    <CurrencyDisplay value={lifetimeGains!.total_withdrawn} />
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-end">
          {lastSynced && (() => {
            const isStale = (Date.now() - new Date(lastSynced).getTime()) > 24 * 60 * 60 * 1000;
            return (
              <p className={cn("text-xs flex items-center gap-1", isStale ? "text-orange-500" : "text-gray-400")}>
                {isStale && <AlertTriangle className="h-3 w-3" />}
                Last synced {formatRelativeTime(lastSynced)}
              </p>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

function UnrealizedPnlBreakdown({ data }: { data: LifetimeGains }) {
  return (
    <div className="space-y-1.5 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Unrealized P&L Breakdown
      </p>
      <Row label="Holdings P&L" value={data.holdings_pnl} colored />
      <Row label="FD Interest" value={data.fd_interest} colored />
      <div className="border-t my-1.5" />
      <div className="flex justify-between font-semibold">
        <span>= Total Unrealized</span>
        <span className={cn(
          "font-mono tabular-nums",
          data.unrealized_pnl >= 0 ? "text-emerald-600" : "text-red-600"
        )}>
          {formatINR(data.unrealized_pnl, { showSign: true })}
        </span>
      </div>
    </div>
  );
}

function LifetimeGainBreakdown({ data }: { data: LifetimeGains }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        How is this calculated?
      </p>
      <div className="space-y-1.5 text-sm">
        <Row label="Current Portfolio Value" value={data.current_portfolio_value} />
        <Row label="+ Total Withdrawn" value={data.total_withdrawn} sign="+" />
        <Row label="− Total Deposited" value={data.total_invested} sign="−" />
        <div className="border-t my-1.5" />
        <div className="flex justify-between font-semibold">
          <span>= Lifetime Gain</span>
          <span className={cn(
            "font-mono tabular-nums",
            data.lifetime_gain >= 0 ? "text-emerald-600" : "text-red-600"
          )}>
            {formatINR(data.lifetime_gain, { showSign: true })}
          </span>
        </div>
      </div>
      <div className="border-t pt-2 space-y-1.5 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Breakdown
        </p>
        <Row label="Holdings P&L" value={data.holdings_pnl} colored />
        <Row label="FD Interest" value={data.fd_interest} colored />
        <Row label="Realized P&L" value={data.realized_pnl} colored />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  sign,
  colored,
}: {
  label: string;
  value: number;
  sign?: string;
  colored?: boolean;
}) {
  const display = sign === "−"
    ? `− ${formatINR(Math.abs(value))}`
    : sign === "+"
      ? `+ ${formatINR(Math.abs(value))}`
      : colored && !sign
        ? formatINR(value, { showSign: true })
        : formatINR(value);

  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={cn(
        "font-mono tabular-nums",
        colored && value > 0 && "text-emerald-600",
        colored && value < 0 && "text-red-600",
      )}>
        {display}
      </span>
    </div>
  );
}
