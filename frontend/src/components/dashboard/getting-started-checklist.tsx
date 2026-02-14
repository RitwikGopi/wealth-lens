"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Check,
  Circle,
  X,
  ArrowRight,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const DISMISSED_KEY = "onboarding_dismissed";

interface StepStatus {
  zerodhaConnected: boolean;
  hasHoldings: boolean;
  hasFDs: boolean;
  hasTags: boolean;
  hasPlans: boolean;
  hasDeposits: boolean;
}

interface ChecklistStep {
  key: keyof StepStatus;
  label: string;
  hint: string;
  href?: string;
  action?: "sync";
}

const STEPS: ChecklistStep[] = [
  {
    key: "zerodhaConnected",
    label: "Connect your Zerodha account",
    hint: "Go to Settings and enter your Kite API Key and Secret from developers.kite.trade",
    href: "/settings",
  },
  {
    key: "hasHoldings",
    label: "Sync or add your holdings",
    hint: "Pull your holdings from Zerodha, or add them manually",
    action: "sync",
  },
  {
    key: "hasFDs",
    label: "Add Fixed Deposits",
    hint: "Track your FDs to see maturity dates and accrued interest",
    href: "/fixed-deposits",
  },
  {
    key: "hasTags",
    label: "Create tags to organize investments",
    hint: "e.g. Equity, Debt, Gold, Large Cap, Mid Cap",
    href: "/tags",
  },
  {
    key: "hasPlans",
    label: "Set up an allocation plan",
    hint: "Define target percentages and track how your portfolio drifts",
    href: "/allocations",
  },
  {
    key: "hasDeposits",
    label: "Record a deposit transaction",
    hint: "Deposit records are needed to calculate lifetime gains accurately",
    href: "/transactions",
  },
];

export function GettingStartedChecklist({
  onSyncComplete,
}: {
  onSyncComplete?: () => void;
}) {
  const [dismissed, setDismissed] = useState(true); // default hidden until we check
  const [status, setStatus] = useState<StepStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    setDismissed(wasDismissed);

    if (!wasDismissed) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchStatus() {
    try {
      const [config, holdings, fds, tags, plans, transactions] =
        await Promise.all([
          api
            .get<{ connected: boolean }>("/zerodha/config")
            .catch(() => ({ connected: false })),
          api.get<{ id: number }[]>("/holdings").catch(() => []),
          api.get<{ id: number }[]>("/fixed-deposits").catch(() => []),
          api.get<{ id: number }[]>("/tags").catch(() => []),
          api.get<{ id: number }[]>("/allocations/plans").catch(() => []),
          api
            .get<{ id: number; type: string }[]>("/transactions")
            .catch(() => []),
        ]);

      setStatus({
        zerodhaConnected: config.connected,
        hasHoldings: holdings.length > 0,
        hasFDs: fds.length > 0,
        hasTags: tags.length > 0,
        hasPlans: plans.length > 0,
        hasDeposits: transactions.some((t) => t.type === "deposit"),
      });
    } catch {
      // If all APIs fail, show checklist with everything unchecked
      setStatus({
        zerodhaConnected: false,
        hasHoldings: false,
        hasFDs: false,
        hasTags: false,
        hasPlans: false,
        hasDeposits: false,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await api.post<{ message: string }>("/zerodha/sync");
      toast.success(result.message);
      onSyncComplete?.();
      await fetchStatus();
    } catch {
      toast.error(
        "Failed to sync. Check Zerodha connection in Settings."
      );
    } finally {
      setSyncing(false);
    }
  }

  if (dismissed) return null;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <Skeleton className="mb-3 h-5 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const completedCount = STEPS.filter((s) => status[s.key]).length;
  const totalCount = STEPS.length;

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-gray-900">
            Getting Started
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {completedCount} of {totalCount} complete
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-2">
        {STEPS.map((step) => {
          const done = status[step.key];
          return (
            <div
              key={step.key}
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-2",
                done ? "opacity-60" : "bg-white/60"
              )}
            >
              {done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    done && "line-through text-gray-500"
                  )}
                >
                  {step.label}
                </p>
                {!done && (
                  <p className="mt-0.5 text-xs text-gray-500">{step.hint}</p>
                )}
              </div>
              {!done && step.href && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-blue-700 hover:text-blue-800"
                  asChild
                >
                  <Link href={step.href}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {!done && step.action === "sync" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-blue-700 hover:text-blue-800"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
