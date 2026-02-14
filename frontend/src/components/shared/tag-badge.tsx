"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface TagBadgeProps {
  name: string;
  color?: string | null;
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function TagBadge({
  name,
  color,
  size = "sm",
  removable = false,
  onRemove,
  onClick,
  className,
}: TagBadgeProps) {
  const bgColor = color || "#6B7280";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        onClick && "cursor-pointer hover:opacity-80",
        className
      )}
      style={{
        backgroundColor: `${bgColor}20`,
        color: bgColor,
      }}
      onClick={onClick}
    >
      {name}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 hover:opacity-60"
        >
          <X className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
        </button>
      )}
    </span>
  );
}
