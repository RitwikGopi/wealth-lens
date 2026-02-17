"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function QuickActionsCard({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await api.post<{ synced_count: number; message: string }>("/zerodha/sync");
      toast.success(result.message);
      onSyncComplete?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sync. Check Zerodha connection in Settings.";
      if (message.toLowerCase().includes("session expired")) {
        toast.error(message, {
          action: { label: "Authenticate", onClick: () => window.location.href = "/settings" },
          duration: 8000,
        });
      } else {
        toast.error(message);
      }
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-gray-500">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button variant="outline" size="sm" className="justify-start" asChild>
          <Link href="/holdings?action=add">
            <Plus className="mr-2 h-4 w-4" />
            Add Holding
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="justify-start" asChild>
          <Link href="/fixed-deposits?action=add">
            <Plus className="mr-2 h-4 w-4" />
            Add FD
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="justify-start"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {syncing ? "Syncing..." : "Sync Zerodha"}
        </Button>
      </CardContent>
    </Card>
  );
}
