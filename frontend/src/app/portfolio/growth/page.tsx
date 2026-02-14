"use client";

import { useEffect, useState } from "react";
import { PortfolioGrowthChart } from "@/components/dashboard/portfolio-growth-chart";
import { PortfolioSnapshot } from "@/types/portfolio";
import { api } from "@/lib/api";
import { mockSnapshots } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortfolioGrowthPage() {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await api.get<PortfolioSnapshot[]>(
          "/portfolio/snapshots"
        );
        setSnapshots(data);
      } catch {
        setSnapshots(mockSnapshots);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Portfolio Growth</h1>
      <PortfolioGrowthChart snapshots={snapshots} />
    </div>
  );
}
