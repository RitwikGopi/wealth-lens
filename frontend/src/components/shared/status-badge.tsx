"use client";

import { cn } from "@/lib/utils";

type StatusVariant =
  | "active"
  | "connected"
  | "warning"
  | "maturing"
  | "error"
  | "matured"
  | "expired"
  | "disconnected"
  | "info"
  | "pending"
  | "neutral"
  | "manual"
  | "closed";

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  active: "bg-emerald-100 text-emerald-700",
  connected: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  maturing: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  matured: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
  disconnected: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  pending: "bg-blue-100 text-blue-700",
  neutral: "bg-gray-100 text-gray-700",
  manual: "bg-gray-100 text-gray-700",
  closed: "bg-gray-100 text-gray-700",
};

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
