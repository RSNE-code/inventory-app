/**
 * Dashboard data hooks — fetches summary, alerts, pipelines, low stock, transactions, trend.
 */
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardData, DashboardTrendData } from "@/types/api";

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiGet<DashboardData>("/api/dashboard"),
    refetchInterval: 30_000,
  });
}

export function useDashboardTrend(categoryId?: string) {
  const params = categoryId ? `?categoryId=${categoryId}` : "";
  return useQuery({
    queryKey: [...queryKeys.dashboardTrend, categoryId ?? "all"],
    queryFn: () => apiGet<{ data: DashboardTrendData }>(`/api/dashboard/trend${params}`),
    refetchInterval: 60_000,
  });
}
