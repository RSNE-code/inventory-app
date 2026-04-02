/**
 * BOM template hooks — CRUD. Ported from web src/hooks/use-bom-templates.ts.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

interface BomTemplate {
  id: string;
  name: string;
  description?: string | null;
  lineItems: Array<{
    id: string;
    productId?: string | null;
    defaultQty: number;
    unitOfMeasure: string;
    isNonCatalog?: boolean;
    nonCatalogName?: string | null;
  }>;
  createdAt: string;
}

export function useBomTemplates(filters?: { search?: string }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  return useQuery({
    queryKey: [...queryKeys.bomTemplates, filters],
    queryFn: () => apiGet<{ data: BomTemplate[] }>(`/api/bom-templates?${params}`),
  });
}

export function useBomTemplate(id: string) {
  return useQuery({
    queryKey: queryKeys.bomTemplate(id),
    queryFn: () => apiGet<{ data: BomTemplate }>(`/api/bom-templates/${id}`),
    enabled: !!id,
  });
}

export function useCreateBomTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string; lineItems: unknown[] }) =>
      apiPost<BomTemplate>("/api/bom-templates", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bomTemplates });
    },
  });
}

export function useUpdateBomTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; description?: string; lineItems?: unknown[] }) =>
      apiPut<BomTemplate>(`/api/bom-templates/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.bomTemplate(v.id) });
      qc.invalidateQueries({ queryKey: queryKeys.bomTemplates });
    },
  });
}

export function useDeleteBomTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/bom-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bomTemplates });
    },
  });
}
