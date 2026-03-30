"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface AssemblyFilters {
  queueType?: "DOOR_SHOP" | "FABRICATION"
  status?: string
}

export function useAssemblies(filters: AssemblyFilters = {}) {
  const params = new URLSearchParams()
  if (filters.queueType) params.set("queueType", filters.queueType)
  if (filters.status) params.set("status", filters.status)

  return useQuery({
    queryKey: ["assemblies", filters],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
  })
}

export function useAssembly(id: string) {
  return useQuery({
    queryKey: ["assembly", id],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${id}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
    enabled: !!id,
  })
}

export function useAssemblyTemplates() {
  return useQuery({
    queryKey: ["assembly-templates"],
    queryFn: async () => {
      const res = await fetch("/api/assembly-templates")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
  })
}

export function useCreateAssembly() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      templateId?: string | null
      type: "DOOR" | "FLOOR_PANEL" | "WALL_PANEL" | "RAMP"
      specs?: Record<string, unknown> | null
      batchSize?: number
      jobName?: string | null
      jobNumber?: string | null
      priority?: number
      notes?: string | null
      requiresApproval?: boolean
      components: Array<{ productId: string; qtyUsed: number }>
    }) => {
      const res = await fetch("/api/assemblies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create assembly")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assemblies"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useUpdateAssembly() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      status?: string
      specs?: Record<string, unknown>
      priority?: number
      notes?: string | null
      approvalStatus?: "APPROVED" | "REJECTED"
      approvalNotes?: string | null
      specChanges?: Array<{
        fieldName: string
        oldValue?: string | null
        newValue: string
        reason?: string | null
      }>
    }) => {
      const res = await fetch(`/api/assemblies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to update assembly")
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assembly", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["assemblies"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useDeleteAssembly() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/assemblies/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete assembly")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assemblies"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useReorderAssemblies() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch("/api/assemblies/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to reorder assemblies")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assemblies"] })
    },
  })
}

export function useBatchShip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (assemblyIds: string[]) => {
      const res = await fetch("/api/assemblies/batch-ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assemblyIds }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to ship assemblies")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assemblies"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
