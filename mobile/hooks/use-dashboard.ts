/**
 * Dashboard data hook — fetches summary, alerts, pipelines, low stock, transactions.
 */
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardData } from "@/types/api";

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiGet<DashboardData>("/api/dashboard"),
  });
}
