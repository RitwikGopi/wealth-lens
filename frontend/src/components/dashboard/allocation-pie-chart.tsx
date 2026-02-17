"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { formatINR, formatPercent } from "@/lib/format";
import { AllocationByTag } from "@/types/portfolio";

interface AllocationPieChartProps {
  data: AllocationByTag[];
  totalValue: number;
}

export function AllocationPieChart({ data, totalValue }: AllocationPieChartProps) {
  const chartData = data.map((item) => ({
    name: item.tag_name,
    value: item.value,
    percentage: item.percentage,
    color: item.tag_color || "#6B7280",
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-gray-500">
          Allocation Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
            Set allocation targets to see breakdown
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="w-full max-w-[200px]">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    stroke="none"
                    label={(props: PieLabelRenderProps) => {
                      const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = props as unknown as Record<string, number>;
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      if (percentage < 8) return null;
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#fff"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={11}
                          fontWeight={600}
                        >
                          {`${percentage.toFixed(0)}%`}
                        </text>
                      );
                    }}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatINR(Number(value))}
                    labelFormatter={(name) => String(name)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="font-mono text-sm font-medium tabular-nums text-gray-900">
                    {formatPercent(item.percentage)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
