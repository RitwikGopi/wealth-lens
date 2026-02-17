"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatPercent } from "@/lib/format";
import { api } from "@/lib/api";
import {
  AllocationDrift,
  AllocationDriftAPI,
  AllocationPlanAPI,
  AllocationTarget,
} from "@/types/allocation";
import { Tag } from "@/types/tag";
import { PortfolioSummaryAPI } from "@/types/portfolio";
import { mockAllocationDrift } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function AllocationsPage() {
  const [plans, setPlans] = useState<AllocationPlanAPI[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [drift, setDrift] = useState<AllocationDrift | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditTargets, setShowEditTargets] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [showCreateTargets, setShowCreateTargets] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  const fetchPlans = useCallback(async () => {
    try {
      const data = await api.get<AllocationPlanAPI[]>("/allocations/plans");
      setPlans(data);
      return data;
    } catch {
      setPlans([]);
      return [];
    }
  }, []);

  const fetchDrift = useCallback(
    async (planId: number) => {
      try {
        const [driftData, summaryData] = await Promise.all([
          api.get<AllocationDriftAPI[]>(`/allocations/plans/${planId}/drift`),
          api.get<PortfolioSummaryAPI>("/portfolio/summary"),
        ]);

        const allocations: AllocationTarget[] = driftData.map((d, i) => ({
          id: i + 1,
          tag_id: d.tag_id,
          tag_name: d.tag_name,
          tag_color: d.tag_color,
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
      } catch {
        setDrift(mockAllocationDrift);
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      const fetched = await fetchPlans();
      if (fetched.length > 0) {
        // Default to primary plan, or first plan
        const primary = fetched.find((p) => p.is_primary) ?? fetched[0];
        setSelectedPlanId(primary.id);
        await fetchDrift(primary.id);
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePlanChange(planId: string) {
    const id = Number(planId);
    setSelectedPlanId(id);
    await fetchDrift(id);
  }

  async function handleDeletePlan() {
    if (!selectedPlanId) return;
    try {
      await api.delete(`/allocations/plans/${selectedPlanId}`);
      toast.success("Plan deleted");
      const fetched = await fetchPlans();
      if (fetched.length > 0) {
        const primary = fetched.find((p) => p.is_primary) ?? fetched[0];
        setSelectedPlanId(primary.id);
        await fetchDrift(primary.id);
      } else {
        setSelectedPlanId(null);
        setDrift(null);
      }
    } catch {
      toast.error("Failed to delete plan");
    }
  }

  async function handleSetPrimary() {
    if (!selectedPlanId) return;
    try {
      await api.put(`/allocations/plans/${selectedPlanId}`, {
        is_primary: true,
      });
      toast.success("Plan set as primary");
      await fetchPlans();
    } catch {
      toast.error("Failed to update plan");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // No plans exist yet
  if (plans.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Allocation Planning
        </h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-gray-900">
              No allocation plans yet
            </p>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Set target percentages for each category (e.g. 60% Equity, 30%
              Debt, 10% Gold) and track how your actual portfolio drifts over
              time.
            </p>
            <Button className="mt-4" onClick={() => setShowCreatePlan(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </CardContent>
        </Card>
        <CreatePlanDialog
          open={showCreatePlan}
          onOpenChange={setShowCreatePlan}
          onSave={async () => {
            const fetched = await fetchPlans();
            if (fetched.length > 0) {
              const primary =
                fetched.find((p) => p.is_primary) ?? fetched[0];
              setSelectedPlanId(primary.id);
              await fetchDrift(primary.id);
            }
          }}
        />
      </div>
    );
  }

  // Plan selected but no targets
  const hasTargets = drift && drift.allocations.length > 0;

  // Prepare chart data (no "Untagged" — actuals are plan-scoped)
  const chartData = hasTargets
    ? drift.allocations.map((a) => ({
        name: a.tag_name,
        target: a.target_pct,
        actual: a.actual_pct,
        color: a.tag_color || "#6B7280",
      }))
    : [];

  function renderAllocationRow(
    alloc: AllocationTarget,
    isChild: boolean = false
  ) {
    return (
      <TableRow key={alloc.tag_id}>
        <TableCell className={cn(isChild && "pl-8")}>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: alloc.tag_color || "#6B7280" }}
            />
            <span className={cn(isChild ? "text-gray-600" : "font-medium")}>
              {alloc.tag_name}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums">
          {formatPercent(alloc.target_pct)}
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums">
          {formatPercent(alloc.actual_pct)}
        </TableCell>
        <TableCell className="text-right">
          <span
            className={cn(
              "font-mono tabular-nums",
              alloc.drift_pct > 0 ? "text-blue-600" : "text-orange-600",
              Math.abs(alloc.drift_pct) >= 5 && "font-bold"
            )}
          >
            {alloc.drift_pct > 0 ? "+" : ""}
            {alloc.drift_pct.toFixed(1)}pp
          </span>
        </TableCell>
        <TableCell className="hidden text-right md:table-cell">
          <CurrencyDisplay value={alloc.drift_value} showSign colored />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with plan selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            Allocation Planning
          </h1>
          <Select
            value={selectedPlanId?.toString() ?? ""}
            onValueChange={handlePlanChange}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  <span className="flex items-center gap-1.5">
                    {p.name}
                    {p.is_primary && (
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreatePlan(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            New Plan
          </Button>
          {selectedPlan && !selectedPlan.is_primary && (
            <Button variant="outline" size="sm" onClick={handleSetPrimary}>
              <Star className="mr-1 h-4 w-4" />
              Set Primary
            </Button>
          )}
          {selectedPlan && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditPlan(true)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Edit Plan
            </Button>
          )}
          {selectedPlan && (
            <Button variant="outline" size="sm" onClick={handleDeletePlan}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Plan description */}
      {selectedPlan?.description && (
        <p className="text-sm text-gray-500">{selectedPlan.description}</p>
      )}

      {/* No targets in this plan */}
      {!hasTargets && selectedPlanId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-gray-900">
              No targets set for this plan
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Select tags and set target percentages for this allocation plan.
            </p>
            <Button
              className="mt-4"
              onClick={() => setShowCreateTargets(true)}
            >
              Set Target Allocation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Has targets — show chart + table */}
      {hasTargets && (
        <>
          {/* Bar Chart Comparison */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 text-base font-medium text-gray-500">
                  Planned vs Actual
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="cursor-pointer">
                        <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-64 text-sm">
                      <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1">Allocation Drift</p>
                      <p className="text-gray-600">
                        Shows how far your actual investment mix has drifted from your target percentages.
                        Positive drift means over-allocated, negative means under-allocated.
                      </p>
                    </PopoverContent>
                  </Popover>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditTargets(true)}
                >
                  Edit Targets
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", minHeight: 200 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} layout="vertical" barGap={4}>
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value) => `${Number(value).toFixed(1)}%`}
                    />
                    <Legend />
                    <Bar
                      dataKey="target"
                      name="Target"
                      barSize={16}
                      radius={[0, 4, 4, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} opacity={0.35} />
                      ))}
                      <LabelList
                        dataKey="target"
                        position="right"
                        formatter={(v: unknown) => `${Number(v).toFixed(1)}%`}
                        style={{ fontSize: 11, fill: "#6B7280" }}
                      />
                    </Bar>
                    <Bar
                      dataKey="actual"
                      name="Actual"
                      barSize={16}
                      radius={[0, 4, 4, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="actual"
                        position="right"
                        formatter={(v: unknown) => `${Number(v).toFixed(1)}%`}
                        style={{ fontSize: 11, fill: "#374151" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Allocation Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead className="text-right">Target %</TableHead>
                    <TableHead className="text-right">Actual %</TableHead>
                    <TableHead className="text-right">Drift</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Drift (INR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drift.allocations.map((alloc) => (
                    <React.Fragment key={alloc.tag_id}>
                      {renderAllocationRow(alloc)}
                      {alloc.children?.map((child) =>
                        renderAllocationRow(child, true)
                      )}
                    </React.Fragment>
                  ))}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatPercent(
                        drift.allocations.reduce(
                          (s, a) => s + a.target_pct,
                          0
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatPercent(
                        drift.allocations.reduce(
                          (s, a) => s + a.actual_pct,
                          0
                        )
                      )}
                    </TableCell>
                    <TableCell />
                    <TableCell className="hidden md:table-cell" />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialogs */}
      <CreatePlanDialog
        open={showCreatePlan}
        onOpenChange={setShowCreatePlan}
        onSave={async () => {
          const fetched = await fetchPlans();
          if (fetched.length > 0 && !selectedPlanId) {
            const primary = fetched.find((p) => p.is_primary) ?? fetched[0];
            setSelectedPlanId(primary.id);
            await fetchDrift(primary.id);
          }
        }}
      />

      {selectedPlan && (
        <EditPlanDialog
          open={showEditPlan}
          onOpenChange={setShowEditPlan}
          plan={selectedPlan}
          onSave={async () => {
            await fetchPlans();
          }}
        />
      )}

      {selectedPlanId && hasTargets && (
        <EditTargetsDialog
          open={showEditTargets}
          onOpenChange={setShowEditTargets}
          planId={selectedPlanId}
          allocations={drift.allocations}
          onSave={async () => {
            await fetchDrift(selectedPlanId);
            toast.success("Targets updated");
          }}
        />
      )}

      {selectedPlanId && (
        <CreateTargetsDialog
          open={showCreateTargets}
          onOpenChange={setShowCreateTargets}
          planId={selectedPlanId}
          onSave={async () => {
            await fetchDrift(selectedPlanId);
            toast.success("Targets created");
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Create Plan Dialog                                                        */
/* -------------------------------------------------------------------------- */

function CreatePlanDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setIsPrimary(false);
    }
  }, [open]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/allocations/plans", {
        name: name.trim(),
        description: description.trim() || null,
        is_primary: isPrimary,
      });
      onOpenChange(false);
      toast.success("Plan created");
      await onSave();
    } catch {
      toast.error("Failed to create plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Allocation Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Name</Label>
            <Input
              id="plan-name"
              placeholder="e.g. Asset Class, Equity Breakdown"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-desc">Description (optional)</Label>
            <Textarea
              id="plan-desc"
              placeholder="Describe what this plan tracks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="plan-primary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="plan-primary" className="text-sm">
              Set as primary plan (shown on dashboard)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Creating..." : "Create Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Edit Plan Dialog                                                          */
/* -------------------------------------------------------------------------- */

function EditPlanDialog({
  open,
  onOpenChange,
  plan,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: AllocationPlanAPI;
  onSave: () => Promise<void>;
}) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(plan.name);
      setDescription(plan.description ?? "");
    }
  }, [open, plan]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.put(`/allocations/plans/${plan.id}`, {
        name: name.trim(),
        description: description.trim() || null,
      });
      onOpenChange(false);
      toast.success("Plan updated");
      await onSave();
    } catch {
      toast.error("Failed to update plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-plan-name">Name</Label>
            <Input
              id="edit-plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-plan-desc">Description</Label>
            <Textarea
              id="edit-plan-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Edit Targets Dialog                                                       */
/* -------------------------------------------------------------------------- */

function EditTargetsDialog({
  open,
  onOpenChange,
  planId,
  allocations,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  allocations: AllocationTarget[];
  onSave: () => Promise<void>;
}) {
  const [targets, setTargets] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial: Record<number, number> = {};
    for (const a of allocations) {
      initial[a.tag_id] = a.target_pct;
    }
    setTargets(initial);
  }, [allocations]);

  const total = Object.values(targets).reduce((s, v) => s + v, 0);

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(targets).map(([tagId, pct]) =>
          api.put(`/allocations/plans/${planId}/targets/${tagId}`, {
            target_pct: pct,
          })
        )
      );
      onOpenChange(false);
      await onSave();
    } catch {
      toast.error("Failed to save targets");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Allocation Targets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Set target allocation for each tag. Percentages must sum to 100%.
          </p>
          {allocations.map((alloc) => (
            <div key={alloc.tag_id} className="flex items-center gap-4">
              <div className="flex w-24 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: alloc.tag_color || "#6B7280" }}
                />
                <span className="text-sm font-medium truncate">
                  {alloc.tag_name}
                </span>
              </div>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={targets[alloc.tag_id] ?? 0}
                onChange={(e) =>
                  setTargets({
                    ...targets,
                    [alloc.tag_id]: Number(e.target.value),
                  })
                }
                className="w-20 font-mono"
              />
              <span className="text-sm text-gray-500">%</span>
              <div className="hidden flex-1 sm:block">
                <Slider
                  value={[targets[alloc.tag_id] ?? 0]}
                  onValueChange={([val]) =>
                    setTargets({ ...targets, [alloc.tag_id]: val })
                  }
                  max={100}
                  step={0.5}
                />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2">
            <span className="font-medium">Total:</span>
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                Math.abs(total - 100) < 0.01
                  ? "text-emerald-600"
                  : "text-red-600"
              )}
            >
              {total.toFixed(1)}%
            </span>
          </div>
          {Math.abs(total - 100) >= 0.01 && (
            <p className="text-sm text-red-600">Total must equal 100%</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={Math.abs(total - 100) >= 0.01 || saving}
          >
            {saving ? "Saving..." : "Save Targets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Create Targets Dialog                                                     */
/* -------------------------------------------------------------------------- */

function CreateTargetsDialog({
  open,
  onOpenChange,
  planId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  onSave: () => Promise<void>;
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [targets, setTargets] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      api.get<Tag[]>("/tags").then((allTags) => {
        setTags(allTags);
        const initial: Record<number, number> = {};
        for (const t of allTags) {
          initial[t.id] = 0;
        }
        setTargets(initial);
      });
    }
  }, [open]);

  const total = Object.values(targets).reduce((s, v) => s + v, 0);

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(targets)
          .filter(([, pct]) => pct > 0)
          .map(([tagId, pct]) =>
            api.put(`/allocations/plans/${planId}/targets/${tagId}`, {
              target_pct: pct,
            })
          )
      );
      onOpenChange(false);
      await onSave();
    } catch {
      toast.error("Failed to create targets");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Allocation Targets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Select tags and set target percentages. Percentages must sum to
            100%.
          </p>
          {tags.length === 0 ? (
            <p className="text-sm text-gray-500">
              No tags found. Create tags first.
            </p>
          ) : (
            tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-4">
                <div className="flex w-24 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color || "#6B7280" }}
                  />
                  <span className="text-sm font-medium truncate">
                    {tag.name}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={targets[tag.id] ?? 0}
                  onChange={(e) =>
                    setTargets({
                      ...targets,
                      [tag.id]: Number(e.target.value),
                    })
                  }
                  className="w-20 font-mono"
                />
                <span className="text-sm text-gray-500">%</span>
                <div className="hidden flex-1 sm:block">
                  <Slider
                    value={[targets[tag.id] ?? 0]}
                    onValueChange={([val]) =>
                      setTargets({ ...targets, [tag.id]: val })
                    }
                    max={100}
                    step={0.5}
                  />
                </div>
              </div>
            ))
          )}
          <div className="flex items-center justify-between border-t pt-2">
            <span className="font-medium">Total:</span>
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                Math.abs(total - 100) < 0.01
                  ? "text-emerald-600"
                  : "text-red-600"
              )}
            >
              {total.toFixed(1)}%
            </span>
          </div>
          {Math.abs(total - 100) >= 0.01 && (
            <p className="text-sm text-red-600">Total must equal 100%</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={Math.abs(total - 100) >= 0.01 || saving}
          >
            {saving ? "Saving..." : "Save Targets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
