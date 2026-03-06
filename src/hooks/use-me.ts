"use client"

import { useQuery } from "@tanstack/react-query"

interface CurrentUser {
  id: string
  name: string
  email: string
  role: string
}

export function useMe() {
  return useQuery<{ data: CurrentUser }>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me")
      if (!res.ok) throw new Error("Not authenticated")
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}
