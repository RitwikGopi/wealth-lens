"use client";

import { useState } from "react";
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
import { HoldingCreate } from "@/types/holding";

interface HoldingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: HoldingCreate) => Promise<void>;
}

export function HoldingForm({ open, onOpenChange, onSubmit }: HoldingFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<HoldingCreate>({
    symbol: "",
    exchange: "NSE",
    instrument_type: "EQ",
    quantity: 0,
    average_price: 0,
    current_price: 0,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
      setForm({
        symbol: "",
        exchange: "NSE",
        instrument_type: "EQ",
        quantity: 0,
        average_price: 0,
        current_price: 0,
        notes: "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Holding</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol *</Label>
            <Input
              id="symbol"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g. INFY"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange</Label>
              <Select
                value={form.exchange}
                onValueChange={(val) => setForm({ ...form, exchange: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NSE">NSE</SelectItem>
                  <SelectItem value="BSE">BSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instrument_type">Type</Label>
              <Select
                value={form.instrument_type}
                onValueChange={(val) => setForm({ ...form, instrument_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EQ">Equity</SelectItem>
                  <SelectItem value="ETF">ETF</SelectItem>
                  <SelectItem value="MF">Mutual Fund</SelectItem>
                  <SelectItem value="Bond">Bond</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.000001"
                value={form.quantity || ""}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="average_price">Avg Price *</Label>
              <Input
                id="average_price"
                type="number"
                step="0.01"
                value={form.average_price || ""}
                onChange={(e) => setForm({ ...form, average_price: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_price">Current Price</Label>
            <Input
              id="current_price"
              type="number"
              step="0.01"
              value={form.current_price || ""}
              onChange={(e) => setForm({ ...form, current_price: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Holding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
