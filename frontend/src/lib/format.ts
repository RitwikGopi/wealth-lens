/**
 * Format a number in Indian numbering system (lakhs, crores)
 */
export function formatINR(
  value: number,
  options?: { showSign?: boolean; decimals?: number }
): string {
  const { showSign = false, decimals = 2 } = options || {};
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : value > 0 && showSign ? "+" : "";

  const formatted = absValue.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${sign}${formatted}`;
}

/**
 * Format a number as a short INR string (e.g., 1.2L, 1.5Cr)
 */
export function formatINRShort(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_00_00_000) {
    return `${sign}${(absValue / 1_00_00_000).toFixed(1)}Cr`;
  }
  if (absValue >= 1_00_000) {
    return `${sign}${(absValue / 1_00_000).toFixed(1)}L`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1)}K`;
  }
  return `${sign}${absValue.toFixed(0)}`;
}

/**
 * Format percentage
 */
export function formatPercent(
  value: number,
  options?: { showSign?: boolean; decimals?: number }
): string {
  const { showSign = false, decimals = 2 } = options || {};
  const sign = value < 0 ? "-" : value > 0 && showSign ? "+" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/**
 * Format a date string
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date as relative time (e.g., "10 min ago")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return formatDate(dateStr);
}
