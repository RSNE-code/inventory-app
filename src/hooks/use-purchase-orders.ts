"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export function usePurchaseOrders(params?: {
  supplierId?: string
  openOnly?: boolean
}) {
  const searchParams = new URLSearchParams()
  if (params?.supplierId) searchParams.set("supplierId", params.supplierId)
  if (params?.openOnly) searchParams.set("openOnly", "true")

  return useQuery({
    queryKey: ["purchase-orders", params?.supplierId, params?.openOnly],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders?${searchParams}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
    enabled: params?.supplierId ? !!params.supplierId : true,
  })
}

export function usePurchaseOrder(id: string | null) {
  return useQuery({
    queryKey: ["purchase-order", id],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${id}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      poNumber: string
      supplierId: string
      expectedDelivery?: string | null
      notes?: string | null
      lineItems: Array<{
        productId: string
        qtyOrdered: number
        unitCost: number
      }>
    }) => {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create purchase order")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
  })
}
