"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface ProductFilters {
  search?: string
  category?: string
  tier?: string
  status?: string
  page?: number
  limit?: number
}

export function useProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.category) params.set("category", filters.category)
  if (filters.tier) params.set("tier", filters.tier)
  if (filters.status) params.set("status", filters.status)
  params.set("page", String(filters.page || 1))
  params.set("limit", String(filters.limit || 50))

  return useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?${params}`)
      if (!res.ok) throw new Error("Failed to fetch products")
      return res.json()
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/${id}`)
      if (!res.ok) throw new Error("Failed to fetch product")
      return res.json()
    },
    enabled: !!id,
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productId, ...data }: { productId: string; quantity: number; direction: "up" | "down"; reason: string; notes?: string }) => {
      const res = await fetch(`/api/inventory/${productId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to adjust stock")
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product", variables.productId] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
