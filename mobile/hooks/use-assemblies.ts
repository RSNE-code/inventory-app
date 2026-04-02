/**
 * Assembly hooks — list, detail, create, status transitions, queue reorder, batch ship.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Assembly } from "@/types/api";

interface UseAssembliesParams {
  queueType?: "DOOR_SHOP" | "FABRICATION";
  status?: string;
}

export function useAssemblies(params: UseAssembliesParams = {}) {
  const qs = new URLSearchParams();
  if (params.queueType) qs.set("queueType", params.queueType);
  if (params.status) qs.set("status", params.status);
  return useQuery({
    queryKey: [...queryKeys.assemblies, params],
    queryFn: () => apiGet<{ data: Assembly[] }>(`/api/assemblies?${qs}`),
  });
}

export function useAssembly(id: string) {
  return useQuery({
    queryKey: queryKeys.assembly(id),
    queryFn: () => apiGet<Assembly>(`/api/assemblies/${id}`),
    enabled: !!id,
  });
}

export function useCreateAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      type: string;
      jobName?: string;
      jobNumber?: string;
      specs?: Record<string, unknown>;
      templateId?: string;
    }) => apiPost<Assembly>("/api/assemblies", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assemblies });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; priority?: number; specs?: Record<string, unknown> }) =>
      apiPut<Assembly>(`/api/assemblies/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.assembly(v.id) });
      qc.invalidateQueries({ queryKey: queryKeys.assemblies });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeleteAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/assemblies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assemblies });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useReorderAssemblies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assemblyIds: string[]) =>
      apiPost("/api/assemblies/reorder", { assemblyIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assemblies });
    },
  });
}

export function useBatchShip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assemblyIds: string[]) =>
      apiPost("/api/assemblies/batch-ship", { assemblyIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assemblies });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
