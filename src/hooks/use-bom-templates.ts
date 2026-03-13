"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface BomTemplateFilters {
  search?: string
}

export function useBomTemplates(filters: BomTemplateFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)

  return useQuery({
    queryKey: ["bom-templates", filters],
    queryFn: async () => {
      const res = await fetch(`/api/bom-templates?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
  })
}

export function useBomTemplate(id: string) {
  return useQuery({
    queryKey: ["bom-template", id],
    queryFn: async () => {
      const res = await fetch(`/api/bom-templates/${id}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateBomTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string | null
      lineItems: Array<{
        productId?: string | null
        tier?: "TIER_1" | "TIER_2"
        defaultQty: number
        unitOfMeasure: string
        isNonCatalog?: boolean
        nonCatalogName?: string | null
        nonCatalogCategory?: string | null
        notes?: string | null
      }>
    }) => {
      const res = await fetch("/api/bom-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create BOM template")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom-templates"] })
    },
  })
}

export function useUpdateBomTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      name?: string
      description?: string | null
      isActive?: boolean
      addLineItems?: Array<{
        productId?: string | null
        tier?: "TIER_1" | "TIER_2"
        defaultQty: number
        unitOfMeasure: string
        isNonCatalog?: boolean
        nonCatalogName?: string | null
        nonCatalogCategory?: string | null
        notes?: string | null
      }>
      removeLineItemIds?: string[]
      updateLineItems?: Array<{ id: string; defaultQty: number }>
    }) => {
      const res = await fetch(`/api/bom-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to update BOM template")
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bom-template", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["bom-templates"] })
    },
  })
}

export function useDeleteBomTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/bom-templates/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete BOM template")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom-templates"] })
    },
  })
}
