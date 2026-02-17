"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Brush,
  CartesianGrid,
} from "recharts";
import { formatINRShort, formatINR, formatDate } from "@/lib/format";
import { PortfolioSnapshot } from "@/types/portfolio";
import { cn } from "@/lib/utils";

interface PortfolioGrowthChartProps {
  snapshots: PortfolioSnapshot[];
}

const timeRanges = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: 0 },
];

const lineConfig = [
  { dataKey: "total_value", label: "Total", color: "#1E40AF", strokeWidth: 2, dasharray: undefined },
  { dataKey: "total_return", label: "True Return", color: "#7C3AED", strokeWidth: 2, dasharray: undefined },
  { dataKey: "holdings_value", label: "Holdings", color: "#16A34A", strokeWidth: 1.5, dasharray: "4 3" },
  { dataKey: "fd_value", label: "FD", color: "#D97706", strokeWidth: 1.5, dasharray: "4 3" },
];

export function PortfolioGrowthChart({ snapshots }: PortfolioGrowthChartProps) {
  const [selectedRange, setSelectedRange] = useState("1Y");
  const [visibleLines, setVisibleLines] = useState<Set<string>>(
    () => new Set(lineConfig.filter((l) => l.dataKey !== "total_return").map((l) => l.dataKey))
  );

  const filteredData = useMemo(() => {
    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const range = timeRanges.find((r) => r.label === selectedRange);
    if (!range || range.days === 0) return sorted;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range.days);
    return sorted.filter((s) => new Date(s.date) >= cutoff);
  }, [snapshots, selectedRange]);

  const dateRangeLabel = useMemo(() => {
    if (filteredData.length === 0) return "";
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    const first = filteredData[0].date;
    const last = filteredData[filteredData.length - 1].date;
    return `${fmt(first)} – ${fmt(last)}`;
  }, [filteredData]);

  const handleLegendClick = useCallback((dataKey: string) => {
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        if (next.size <= 1) return prev; // keep at least one visible
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <CardTitle className="text-base font-medium text-gray-500">
            Portfolio Growth
          </CardTitle>
          {dateRangeLabel && (
            <span className="text-xs text-gray-400">{dateRangeLabel}</span>
          )}
        </div>
        <div className="flex gap-1">
          {timeRanges.map((range) => (
            <Button
              key={range.label}
              variant={selectedRange === range.label ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs",
                selectedRange === range.label && "bg-blue-800 text-white hover:bg-blue-900"
              )}
              onClick={() => setSelectedRange(range.label)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
            Take a portfolio snapshot to track growth over time
          </div>
        ) : (
          <>
            <div style={{ width: "100%", minHeight: 360 }}>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                  />
                  <YAxis
                    tickFormatter={formatINRShort}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    labelFormatter={(val) => formatDate(val as string)}
                    formatter={(value, name) => {
                      const labels: Record<string, string> = { total_value: "Total", total_return: "True Return", holdings_value: "Holdings", fd_value: "FD" };
                      return [formatINR(Number(value)), labels[name as string] ?? name];
                    }}
                    itemSorter={(item) => {
                      const order: Record<string, number> = { total_value: 0, total_return: 1, holdings_value: 2, fd_value: 3 };
                      return order[item.dataKey as string] ?? 4;
                    }}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #E5E7EB",
                    }}
                  />
                  {lineConfig.map(
                    (line) =>
                      visibleLines.has(line.dataKey) && (
                        <Line
                          key={line.dataKey}
                          type="monotone"
                          dataKey={line.dataKey}
                          stroke={line.color}
                          strokeWidth={line.strokeWidth}
                          strokeDasharray={line.dasharray}
                          dot={false}
                          activeDot={{ r: line.dataKey === "total_value" ? 4 : 3 }}
                        />
                      )
                  )}
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="#1E40AF"
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
                    }}
                    key={selectedRange}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
              {lineConfig.map((line) => {
                const isVisible = visibleLines.has(line.dataKey);
                return (
                  <button
                    key={line.dataKey}
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 text-xs transition-opacity",
                      isVisible ? "opacity-100" : "opacity-50"
                    )}
                    onClick={() => handleLegendClick(line.dataKey)}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: line.color }}
                    />
                    <span className={cn(isVisible ? "" : "line-through")}>
                      {line.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
