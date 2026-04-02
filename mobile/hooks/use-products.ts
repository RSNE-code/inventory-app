/**
 * Product hooks — CRUD, search, pagination, stock adjustment.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Product, Category, PaginatedResponse } from "@/types/api";

interface UseProductsParams {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useProducts({ search, category, status, page = 1, limit = 50 }: UseProductsParams = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(limit));

  return useQuery({
    queryKey: [...queryKeys.inventory, { search, category, status, page }],
    queryFn: () => apiGet<PaginatedResponse<Product>>(`/api/inventory?${params}`),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => apiGet<Product>(`/api/inventory/${id}`),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => apiGet<Category[]>("/api/categories"),
    staleTime: 1000 * 60 * 30, // 30 min — rarely changes
  });
}

interface AdjustStockParams {
  productId: string;
  quantity: number;
  direction: "up" | "down";
  reason: string;
  notes?: string;
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, ...body }: AdjustStockParams) =>
      apiPost(`/api/inventory/${productId}/adjust`, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.product(variables.productId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

interface CreateProductParams {
  name: string;
  categoryId?: string;
  sku?: string;
  unitOfMeasure: string;
  currentQty: number;
  reorderPoint: number;
  location?: string;
  unitCost?: number;
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductParams) => apiPost<Product>("/api/inventory", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<CreateProductParams>) =>
      apiPut<Product>(`/api/inventory/${id}`, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.product(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
    },
  });
}
