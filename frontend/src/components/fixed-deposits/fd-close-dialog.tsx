"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { FixedDeposit, FDCloseRequest, FixedDepositResponse } from "@/types/fixed-deposit";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

interface FDCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fd: FixedDeposit;
  onClosed: (closedFd: FixedDepositResponse) => void;
}

export function FDCloseDialog({ open, onOpenChange, fd, onClosed }: FDCloseDialogProps) {
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const maturityPassed = new Date(fd.maturity_date) <= new Date();

  const [closureDate, setClosureDate] = useState(maturityPassed ? fd.maturity_date : today);
  const [closureAmount, setClosureAmount] = useState(fd.current_value || fd.principal);
  const [premature, setPremature] = useState(!maturityPassed);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      const matPassed = new Date(fd.maturity_date) <= new Date();
      setClosureDate(matPassed ? fd.maturity_date : today);
      setClosureAmount(fd.current_value || fd.principal);
      setPremature(!matPassed);
      setNotes("");
    }
  }, [open, fd, today]);

  // Auto-set premature based on date
  useEffect(() => {
    if (closureDate) {
      setPremature(new Date(closureDate) < new Date(fd.maturity_date));
    }
  }, [closureDate, fd.maturity_date]);

  const interestEarned = useMemo(() => {
    return closureAmount - fd.principal;
  }, [closureAmount, fd.principal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: FDCloseRequest = {
        closure_date: closureDate,
        closure_amount: closureAmount,
        premature,
        notes: notes || undefined,
      };
      const closedFd = await api.post<FixedDepositResponse>(
        `/fixed-deposits/${fd.id}/close`,
        data
      );
      toast.success("Fixed deposit closed successfully");
      onClosed(closedFd);
      onOpenChange(false);
    } catch {
      toast.error("Failed to close fixed deposit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close Fixed Deposit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md bg-gray-50 p-3 text-sm">
            <p className="text-gray-500">
              {fd.bank_name} &mdash; Principal:{" "}
              <span className="font-mono font-medium text-gray-900">
                {formatINR(fd.principal)}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closure_date">Closure Date *</Label>
              <Input
                id="closure_date"
                type="date"
                value={closureDate}
                onChange={(e) => setClosureDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closure_amount">Amount Received * (INR)</Label>
              <Input
                id="closure_amount"
                type="number"
                step="0.01"
                value={closureAmount || ""}
                onChange={(e) => setClosureAmount(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="premature"
              checked={premature}
              onCheckedChange={(checked) => setPremature(checked === true)}
            />
            <Label htmlFor="premature">Premature withdrawal (before maturity)</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="close_notes">Notes</Label>
            <Textarea
              id="close_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Penalty applied, reason for early closure"
            />
          </div>

          {closureAmount > 0 && (
            <div className="rounded-md bg-gray-50 p-3 text-sm">
              <p className="text-gray-500">
                Interest earned:{" "}
                <span
                  className={`font-mono font-semibold ${
                    interestEarned >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {interestEarned >= 0 ? "+" : ""}
                  {formatINR(interestEarned)}
                </span>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Closing..." : "Close FD"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
