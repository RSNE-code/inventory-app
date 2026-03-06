"use client"

import { useQuery } from "@tanstack/react-query"
import type { DashboardData } from "@/types"

export function useDashboard() {
  return useQuery<{ data: DashboardData }>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard")
      if (!res.ok) throw new Error("Failed to fetch dashboard")
      return res.json()
    },
    refetchInterval: 30 * 1000,
  })
}
