"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { FixedDeposit, FDRenewRequest, FDRenewResponse } from "@/types/fixed-deposit";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

interface FDRenewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fd: FixedDeposit;
  onRenewed: (response: FDRenewResponse) => void;
}

export function FDRenewDialog({ open, onOpenChange, fd, onRenewed }: FDRenewDialogProps) {
  const [loading, setLoading] = useState(false);

  const [newMaturityDate, setNewMaturityDate] = useState("");
  const [newPrincipal, setNewPrincipal] = useState(fd.current_value || fd.principal);
  const [newInterestRate, setNewInterestRate] = useState(fd.interest_rate);
  const [newCompoundingFreq, setNewCompoundingFreq] = useState(fd.compounding_frequency);
  const [newBankName, setNewBankName] = useState(fd.bank_name);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setNewPrincipal(fd.current_value || fd.principal);
      setNewInterestRate(fd.interest_rate);
      setNewCompoundingFreq(fd.compounding_frequency);
      setNewBankName(fd.bank_name);
      setNewMaturityDate("");
      setNotes("");
    }
  }, [open, fd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: FDRenewRequest = {
        new_maturity_date: newMaturityDate,
        new_principal: newPrincipal,
        new_interest_rate: newInterestRate,
        new_compounding_frequency: newCompoundingFreq,
        new_bank_name: newBankName,
        notes: notes || undefined,
      };
      const response = await api.post<FDRenewResponse>(
        `/fixed-deposits/${fd.id}/renew`,
        data
      );
      toast.success("Fixed deposit renewed successfully");
      onRenewed(response);
      onOpenChange(false);
    } catch {
      toast.error("Failed to renew fixed deposit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Renew Fixed Deposit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Old FD summary */}
          <div className="rounded-md bg-gray-50 p-3 text-sm space-y-1">
            <p className="font-medium text-gray-700">Current FD</p>
            <p className="text-gray-500">
              {fd.bank_name} &mdash; Principal:{" "}
              <span className="font-mono">{formatINR(fd.principal)}</span>
              {" "}&mdash; Rate: {fd.interest_rate}%
            </p>
            <p className="text-gray-500">
              Current Value:{" "}
              <span className="font-mono font-medium text-gray-900">
                {formatINR(fd.current_value || fd.principal)}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_bank_name">Bank/Institution</Label>
            <Input
              id="new_bank_name"
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_principal">New Principal (INR)</Label>
              <Input
                id="new_principal"
                type="number"
                step="0.01"
                value={newPrincipal || ""}
                onChange={(e) => setNewPrincipal(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_interest_rate">Interest Rate (%)</Label>
              <Input
                id="new_interest_rate"
                type="number"
                step="0.01"
                value={newInterestRate || ""}
                onChange={(e) => setNewInterestRate(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_compounding_freq">Compounding</Label>
              <Select
                value={newCompoundingFreq}
                onValueChange={setNewCompoundingFreq}
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
            <div className="space-y-2">
              <Label htmlFor="new_maturity_date">New Maturity Date *</Label>
              <Input
                id="new_maturity_date"
                type="date"
                value={newMaturityDate}
                onChange={(e) => setNewMaturityDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="renew_notes">Notes</Label>
            <Textarea
              id="renew_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Renewing..." : "Renew FD"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
