"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { api } from "@/lib/api";
import { Eye, EyeOff, Info, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [backfillJson, setBackfillJson] = useState("");
  const [backfillLoading, setBackfillLoading] = useState(false);

  // Handle Zerodha OAuth redirect params
  useEffect(() => {
    const authSuccess = searchParams.get("zerodha_auth");
    const authError = searchParams.get("zerodha_error");

    if (authSuccess === "success") {
      toast.success("Zerodha authenticated successfully!");
      setConnected(true);
      // Clean URL
      window.history.replaceState({}, "", "/settings");
    } else if (authError) {
      toast.error(`Zerodha authentication failed: ${authError}`);
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await api.get<{
          connected: boolean;
          api_key: string | null;
          last_sync_at: string | null;
          token_expiry: string | null;
        }>("/zerodha/config");
        setConnected(config.connected);
        if (config.api_key) {
          setApiKey(config.api_key);
          setHasCredentials(true);
        }
        if (config.last_sync_at) {
          setLastSyncAt(config.last_sync_at);
        }
      } catch {
        // Config not yet created, leave defaults
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  async function handleSaveCredentials() {
    setSaving(true);
    try {
      await api.put("/zerodha/config", {
        api_key: apiKey,
        api_secret: apiSecret,
      });
      setHasCredentials(true);
      toast.success("Credentials saved");
    } catch {
      toast.error("Failed to save credentials");
    } finally {
      setSaving(false);
    }
  }

  async function handleAuthenticate() {
    try {
      const data = await api.get<{ login_url: string }>("/zerodha/login-url");
      // Redirect in same window — Zerodha will redirect back to our backend
      // callback, which then redirects to this page with success/error params
      window.location.href = data.login_url;
    } catch {
      toast.error("Failed to get login URL. Save your credentials first.");
    }
  }

  async function handleDisconnect() {
    try {
      await api.put("/zerodha/config", {
        api_key: "",
        api_secret: "",
      });
      setApiKey("");
      setApiSecret("");
      setConnected(false);
      setHasCredentials(false);
      setLastSyncAt(null);
      toast.success("Zerodha disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  async function handleSnapshot() {
    try {
      await api.post("/portfolio/snapshots");
      toast.success("Portfolio snapshot saved");
    } catch {
      toast.error("Failed to save snapshot");
    }
  }

  async function handleBackfill() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(backfillJson);
    } catch {
      toast.error("Invalid JSON. Please paste the raw JSON from Kite portal.");
      return;
    }

    setBackfillLoading(true);
    try {
      const result = await api.post<{
        message: string;
        snapshots_created: number;
        snapshots_updated: number;
        errors: string[];
      }>("/portfolio/backfill", {
        kite_data: parsed,
      });
      if (result.snapshots_created > 0 || result.snapshots_updated > 0) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
      if (result.errors?.length) {
        for (const e of result.errors) {
          toast.warning(e, { duration: 8000 });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import data");
    } finally {
      setBackfillLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Zerodha Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zerodha Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            <StatusBadge
              variant={
                connected
                  ? "connected"
                  : hasCredentials
                    ? "warning"
                    : "disconnected"
              }
            >
              {connected
                ? "Connected"
                : hasCredentials
                  ? "Credentials Saved (Not Authenticated)"
                  : "Disconnected"}
            </StatusBadge>
          </div>
          {lastSyncAt && (
            <p className="text-sm text-gray-500">
              Last synced: {new Date(lastSyncAt).toLocaleString()}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="api-key">API Key</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="cursor-pointer">
                    <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 text-sm">
                  <p className="text-gray-600">
                    Get your API Key and Secret from{" "}
                    <strong>developers.kite.trade</strong>. Create a new app,
                    and copy the API Key and API Secret from the app details page.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Zerodha API Key"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-secret">API Secret</Label>
            <div className="flex gap-2">
              <Input
                id="api-secret"
                type={showSecret ? "text" : "password"}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={
                  hasCredentials && !apiSecret
                    ? "••••••••  (already saved, enter new to update)"
                    : "Enter Zerodha API Secret"
                }
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSaveCredentials}
              disabled={saving || !apiKey || !apiSecret}
            >
              {saving ? "Saving..." : "Save Credentials"}
            </Button>
            <Button variant="outline" onClick={handleAuthenticate}>
              Authenticate with Zerodha
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  Disconnect Zerodha
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Zerodha?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all Zerodha credentials. Your synced
                    holdings will remain but will no longer update automatically.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" onClick={handleSnapshot}>
            Take Portfolio Snapshot Now
          </Button>
        </CardContent>
      </Card>

      {/* Historical Data Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            Import Historical Data
            <Popover>
              <PopoverTrigger asChild>
                <button className="cursor-pointer">
                  <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 text-sm">
                <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-2">How to get the data</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Log into <strong>kite.zerodha.com</strong></li>
                  <li>Open browser DevTools (F12)</li>
                  <li>Go to the <strong>Network</strong> tab</li>
                  <li>Navigate to your Holdings or Console page</li>
                  <li>Look for the portfolio/holdings API call</li>
                  <li>Right-click the request &rarr; Copy Response</li>
                  <li>Paste the full JSON below</li>
                </ol>
              </PopoverContent>
            </Popover>
          </CardTitle>
          <p className="text-sm text-gray-500">
            Paste the JSON response from Kite&apos;s portfolio historical API to populate
            the Portfolio Growth chart with past data. FD values are calculated automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backfill-json">Kite Portal JSON</Label>
            <Textarea
              id="backfill-json"
              placeholder='Paste JSON here (starts with {"status":"success","data":{...}})'
              value={backfillJson}
              onChange={(e) => setBackfillJson(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
            <p className="text-xs text-gray-400">
              In Kite web, open DevTools &rarr; Network tab, look for the historical
              portfolio API call, and copy the full JSON response.
            </p>
          </div>
          <Button
            onClick={handleBackfill}
            disabled={backfillLoading || !backfillJson.trim()}
          >
            {backfillLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Historical Data"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
