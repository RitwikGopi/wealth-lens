"use client";

import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";

interface CurrencyDisplayProps {
  value: number;
  showSign?: boolean;
  colored?: boolean;
  className?: string;
}

export function CurrencyDisplay({
  value,
  showSign = false,
  colored = false,
  className,
}: CurrencyDisplayProps) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        colored && value > 0 && "text-emerald-600",
        colored && value < 0 && "text-red-600",
        className
      )}
    >
      {formatINR(value, { showSign })}
    </span>
  );
}
