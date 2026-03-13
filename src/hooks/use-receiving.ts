"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { MatchedPO } from "@/lib/ai/types"

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

export function usePoMatch() {
  return useMutation({
    mutationFn: async (params: { poNumber?: string; vendorName?: string; amount?: number }) => {
      const res = await fetch("/api/pos/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to match PO")
      }
      const { data } = await res.json()
      return data as MatchedPO | null
    },
  })
}

export function usePoSearch(supplierId?: string, search?: string) {
  const params = new URLSearchParams()
  if (supplierId) params.set("supplierId", supplierId)
  if (search) params.set("search", search)

  return useQuery<{ data: MatchedPO[] }>({
    queryKey: ["pos", supplierId, search],
    queryFn: async () => {
      const res = await fetch(`/api/pos?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to search POs")
      }
      return res.json()
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

// ─── Receipt History ───

export interface ReceiptData {
  id: string
  supplierId: string
  purchaseOrderId: string | null
  receivedAt: string
  notes: string | null
  supplier: { name: string }
  purchaseOrder: { poNumber: string; jobName: string | null } | null
  transactions: Array<{
    id: string
    type: string
    productId: string
    quantity: string
    unitCost: string | null
    product: { name: string; unitOfMeasure: string }
  }>
}

export function useReceiptHistory(search?: string) {
  const params = new URLSearchParams()
  if (search) params.set("search", search)

  return useQuery<{ data: ReceiptData[] }>({
    queryKey: ["receipts", search],
    queryFn: async () => {
      const res = await fetch(`/api/receiving?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to load receipts")
      }
      return res.json()
    },
  })
}

export function useVoidReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (receiptId: string) => {
      const res = await fetch(`/api/receiving/${receiptId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to void receipt")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["pos"] })
    },
  })
}

export function useCreateReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      supplierId: string
      purchaseOrderId?: string | null
      notes?: string | null
      items: Array<{
        productId?: string
        quantity: number
        unitCost: number
        autoCreatePanel?: {
          brand: string
          height: number
          width: number
          thickness: number
        }
      }>
      poLineItemUpdates?: Array<{
        poLineItemId: string
        qtyReceived: number
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
