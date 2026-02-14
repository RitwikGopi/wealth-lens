"use client";

import { useEffect, useState } from "react";
import { PortfolioSummaryCard } from "@/components/dashboard/portfolio-summary-card";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { GettingStartedChecklist } from "@/components/dashboard/getting-started-checklist";
import { AllocationPieChart } from "@/components/dashboard/allocation-pie-chart";
import { PortfolioGrowthChart } from "@/components/dashboard/portfolio-growth-chart";
import { CashFlowCard } from "@/components/dashboard/cash-flow-card";
import { TopHoldingsTable } from "@/components/dashboard/top-holdings-table";
import { RecentTransactionsTable } from "@/components/dashboard/recent-transactions-table";
import { api } from "@/lib/api";
import {
  PortfolioSummary,
  PortfolioSummaryAPI,
  PortfolioSnapshot,
  LifetimeGains,
  AllocationByTag,
  TopHolding,
} from "@/types/portfolio";
import { HoldingResponse } from "@/types/holding";
import { Transaction } from "@/types/transaction";
import { AllocationDriftAPI } from "@/types/allocation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  mockPortfolioSummary,
  mockSnapshots,
  mockTransactions,
  mockLifetimeGains,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lifetimeGains, setLifetimeGains] = useState<LifetimeGains | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
        const [summaryAPI, snapshotsData, txnData, holdingsData, driftData, gainsData] =
          await Promise.all([
            api.get<PortfolioSummaryAPI>("/portfolio/summary"),
            api.get<PortfolioSnapshot[]>("/portfolio/snapshots"),
            api.get<Transaction[]>("/transactions", { limit: "5" }),
            api.get<HoldingResponse[]>("/holdings"),
            api.get<AllocationDriftAPI[]>("/allocations/drift").catch(() => []),
            api.get<LifetimeGains>("/portfolio/lifetime-gains").catch(() => null),
          ]);

        // Prefer deposit-based total_invested from lifetime-gains API, fall back to cost basis
        const totalInvested = gainsData?.total_invested ?? (summaryAPI.total_value - summaryAPI.total_pnl);
        const pnlPercentage =
          totalInvested > 0 ? (summaryAPI.total_pnl / totalInvested) * 100 : 0;

        // Build allocation breakdown from drift data
        const allocationByTag: AllocationByTag[] = driftData.map((d) => ({
          tag_id: d.tag_id,
          tag_name: d.tag_name,
          tag_color: d.tag_color,
          value: d.current_value,
          percentage: d.current_pct,
        }));

        // Build top holdings from holdings data
        const topHoldings: TopHolding[] = holdingsData
          .filter((h) => h.current_value != null)
          .sort((a, b) => (b.current_value || 0) - (a.current_value || 0))
          .slice(0, 5)
          .map((h) => ({
            id: h.id,
            symbol: h.symbol,
            instrument_type: h.instrument_type,
            current_value: h.current_value || 0,
            pnl_percentage:
              h.average_price > 0
                ? (((h.current_price || 0) / h.average_price) - 1) * 100
                : 0,
            tags: [],
          }));

        const enrichedSummary: PortfolioSummary = {
          ...summaryAPI,
          total_invested: totalInvested,
          pnl_percentage: pnlPercentage,
          last_synced: summaryAPI.last_sync_at,
          allocation_by_tag: allocationByTag,
          top_holdings: topHoldings,
        };

        setSummary(enrichedSummary);
        setSnapshots(snapshotsData);
        setTransactions(txnData);
        setLifetimeGains(gainsData);
      } catch {
        // Fall back to mock data when backend is unavailable
        setSummary(mockPortfolioSummary);
        setSnapshots(mockSnapshots);
        setTransactions(mockTransactions.slice(0, 5));
        setLifetimeGains(mockLifetimeGains);
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!summary) {
    return <EmptyDashboard />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Getting Started Checklist */}
      <GettingStartedChecklist onSyncComplete={fetchData} />

      {/* Top row: Summary + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioSummaryCard
            totalValue={summary.total_value}
            totalInvested={summary.total_invested}
            totalPnl={summary.total_pnl}
            lastSynced={summary.last_synced}
            lifetimeGains={lifetimeGains}
          />
        </div>
        <QuickActionsCard onSyncComplete={fetchData} />
      </div>

      {/* Charts row: Allocation + Growth */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AllocationPieChart
          data={summary.allocation_by_tag}
          totalValue={summary.total_value}
        />
        <PortfolioGrowthChart snapshots={snapshots} />
      </div>

      {/* Cash Flow */}
      {lifetimeGains && <CashFlowCard data={lifetimeGains} />}

      {/* Tables row: Top Holdings + Recent Transactions */}
      <TopHoldingsTable holdings={summary.top_holdings} />
      <RecentTransactionsTable transactions={transactions} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-48 lg:col-span-2" />
        <Skeleton className="h-48" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome to Portfolio Tracker
      </h1>
      <p className="mt-2 text-gray-500">
        Get started by adding your first investments:
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Step 1</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your Zerodha account
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Step 2</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your FDs and other assets
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Step 3</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create tags to organize your investments
          </p>
        </div>
      </div>
    </div>
  );
}
