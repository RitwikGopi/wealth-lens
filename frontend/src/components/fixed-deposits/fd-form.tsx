"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FixedDepositCreate } from "@/types/fixed-deposit";
import { formatINR } from "@/lib/format";

interface FDFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FixedDepositCreate) => Promise<void>;
  initialData?: FixedDepositCreate;
  mode?: "add" | "edit";
}

const emptyForm: FixedDepositCreate = {
  bank_name: "",
  principal: 0,
  interest_rate: 0,
  compounding_frequency: "quarterly",
  start_date: "",
  maturity_date: "",
  is_cumulative: true,
  auto_renew: false,
  funded_externally: true,
  notes: "",
};

export function FDForm({ open, onOpenChange, onSubmit, initialData, mode = "add" }: FDFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FixedDepositCreate>(initialData || emptyForm);

  useEffect(() => {
    if (open) {
      setForm(initialData || emptyForm);
    }
  }, [open, initialData]);

  const maturityValue = useMemo(() => {
    if (!form.principal || !form.interest_rate || !form.start_date || !form.maturity_date)
      return null;
    const p = form.principal;
    const r = form.interest_rate / 100;
    const start = new Date(form.start_date);
    const end = new Date(form.maturity_date);
    const t = (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (t <= 0) return null;

    const freqMap: Record<string, number> = {
      monthly: 12,
      quarterly: 4,
      half_yearly: 2,
      yearly: 1,
    };
    const n = freqMap[form.compounding_frequency] || 4;
    return p * Math.pow(1 + r / n, n * t);
  }, [form.principal, form.interest_rate, form.start_date, form.maturity_date, form.compounding_frequency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Fixed Deposit" : "Add Fixed Deposit"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank_name">Bank/Institution *</Label>
            <Input
              id="bank_name"
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              placeholder="e.g. SBI"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="principal">Principal Amount * (INR)</Label>
              <Input
                id="principal"
                type="number"
                step="0.01"
                value={form.principal || ""}
                onChange={(e) => setForm({ ...form, principal: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest_rate">Interest Rate * (%)</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.01"
                value={form.interest_rate || ""}
                onChange={(e) => setForm({ ...form, interest_rate: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="compounding_frequency">Compounding *</Label>
            <Select
              value={form.compounding_frequency}
              onValueChange={(val) => setForm({ ...form, compounding_frequency: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="half_yearly">Half Yearly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maturity_date">Maturity Date *</Label>
              <Input
                id="maturity_date"
                type="date"
                value={form.maturity_date}
                onChange={(e) => setForm({ ...form, maturity_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_cumulative"
                checked={form.is_cumulative}
                onCheckedChange={(checked) =>
                  setForm({ ...form, is_cumulative: checked === true })
                }
              />
              <Label htmlFor="is_cumulative">Cumulative (reinvest interest)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto_renew"
                checked={form.auto_renew}
                onCheckedChange={(checked) =>
                  setForm({ ...form, auto_renew: checked === true })
                }
              />
              <Label htmlFor="auto_renew">Auto-Renewal</Label>
            </div>
          </div>

          {mode === "add" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="funded_from_portfolio"
                checked={form.funded_externally === false}
                onCheckedChange={(checked) =>
                  setForm({ ...form, funded_externally: checked !== true })
                }
              />
              <Label htmlFor="funded_from_portfolio" className="text-sm">
                Funded from existing portfolio (e.g. stock sale proceeds)
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>

          {maturityValue && (
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-sm text-gray-500">
                Calculated Maturity Value:{" "}
                <span className="font-mono font-semibold text-gray-900">
                  {formatINR(maturityValue)}
                </span>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : mode === "edit" ? "Update FD" : "Save FD"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
