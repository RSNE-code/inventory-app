"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface BomFilters {
  search?: string
  status?: string
  page?: number
  limit?: number
}

export function useBoms(filters: BomFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.status) params.set("status", filters.status)
  params.set("page", String(filters.page || 1))
  params.set("limit", String(filters.limit || 20))

  return useQuery({
    queryKey: ["boms", filters],
    queryFn: async () => {
      const res = await fetch(`/api/boms?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
  })
}

export function useBom(id: string) {
  return useQuery({
    queryKey: ["bom", id],
    queryFn: async () => {
      const res = await fetch(`/api/boms/${id}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateBom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      jobName: string
      jobNumber?: string | null
      jobStartDate?: string | null
      notes?: string | null
      lineItems: Array<{
        productId?: string | null
        tier?: "TIER_1" | "TIER_2"
        qtyNeeded: number
        isNonCatalog?: boolean
        nonCatalogName?: string | null
        nonCatalogCategory?: string | null
        nonCatalogUom?: string | null
        nonCatalogEstCost?: number | null
        nonCatalogSpecs?: Record<string, unknown> | null
      }>
    }) => {
      const res = await fetch("/api/boms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create BOM")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boms"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useUpdateBom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      status?: string
      jobName?: string
      notes?: string | null
      addLineItems?: Array<{
        productId?: string | null
        tier?: "TIER_1" | "TIER_2"
        qtyNeeded: number
        isNonCatalog?: boolean
        nonCatalogName?: string | null
        nonCatalogCategory?: string | null
        nonCatalogUom?: string | null
        nonCatalogEstCost?: number | null
      }>
      removeLineItemIds?: string[]
      updateLineItems?: Array<{ id: string; qtyNeeded: number }>
    }) => {
      const res = await fetch(`/api/boms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to update BOM")
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bom", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["boms"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function usePanelCheckout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bomId,
      bomLineItemId,
      brand,
      width,
      thickness,
      breakout,
    }: {
      bomId: string
      bomLineItemId: string
      brand: string
      width?: number
      thickness?: number
      breakout: Array<{ height: number; quantity: number }>
    }) => {
      const res = await fetch(`/api/boms/${bomId}/panel-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bomLineItemId, brand, width, thickness, breakout }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to checkout panels")
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bom", variables.bomId] })
      queryClient.invalidateQueries({ queryKey: ["boms"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useCheckoutBom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      items,
    }: {
      id: string
      items: Array<{
        bomLineItemId: string
        type: "CHECKOUT" | "RETURN"
        quantity: number
      }>
    }) => {
      const res = await fetch(`/api/boms/${id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to checkout")
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bom", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["boms"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
