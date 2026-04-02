/**
 * BOM hooks — list, detail, create, checkout, status transitions.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Bom, BomWithDetails } from "@/types/api";

interface UseBomsParams {
  search?: string;
  status?: string;
  page?: number;
}

export function useBoms({ search, status, page = 1 }: UseBomsParams = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return useQuery({
    queryKey: [...queryKeys.boms, { search, status, page }],
    queryFn: () => apiGet<{ data: Bom[]; totalPages: number }>(`/api/boms?${params}`),
  });
}

export function useBom(id: string) {
  return useQuery({
    queryKey: queryKeys.bom(id),
    queryFn: () => apiGet<BomWithDetails>(`/api/boms/${id}`),
    enabled: !!id,
  });
}

interface CreateBomParams {
  jobName: string;
  jobNumber?: string;
  lineItems: { productName: string; quantity: number; unit: string; productId?: string }[];
}

export function useCreateBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBomParams) => apiPost<Bom>("/api/boms", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.boms });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<CreateBomParams>) =>
      apiPut<Bom>(`/api/boms/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.bom(v.id) });
      qc.invalidateQueries({ queryKey: queryKeys.boms });
    },
  });
}

export function useDeleteBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/boms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.boms });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useSubmitForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/api/boms/${id}/review`, {}),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.bom(id) });
      qc.invalidateQueries({ queryKey: queryKeys.boms });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useCheckoutBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bomId, lineItemIds }: { bomId: string; lineItemIds: string[] }) =>
      apiPost(`/api/boms/${bomId}/checkout`, { lineItemIds }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.bom(v.bomId) });
      qc.invalidateQueries({ queryKey: queryKeys.boms });
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useReorderBoms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bomIds: string[]) => apiPost("/api/boms/reorder", { bomIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.boms });
    },
  });
}
