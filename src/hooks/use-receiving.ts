"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export function useSupplierMatch() {
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/suppliers/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to match supplier")
      }
      const { data } = await res.json()
      return data as { id: string; name: string; confidence: number } | null
    },
  })
}

export function useSuppliers(search?: string) {
  const params = new URLSearchParams()
  if (search) params.set("search", search)

  return useQuery({
    queryKey: ["suppliers", search],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
  })
}

export function useCreateReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      supplierId: string
      notes?: string | null
      items: Array<{
        productId: string
        quantity: number
        unitCost: number
      }>
    }) => {
      const res = await fetch("/api/receiving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to log receipt")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
