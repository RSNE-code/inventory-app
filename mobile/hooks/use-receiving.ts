/**
 * Receiving hooks — receipt CRUD, PO matching, history.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Receipt, Supplier, PurchaseOrder } from "@/types/api";

export function useReceiptHistory(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  return useQuery({
    queryKey: [...queryKeys.receipts, { search }],
    queryFn: () => apiGet<Receipt[]>(`/api/receiving?${params}`),
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: queryKeys.receipt(id),
    queryFn: () => apiGet<Receipt>(`/api/receiving/${id}`),
    enabled: !!id,
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.suppliers,
    queryFn: () => apiGet<Supplier[]>("/api/suppliers"),
    staleTime: 1000 * 60 * 30,
  });
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: queryKeys.pos,
    queryFn: () => apiGet<PurchaseOrder[]>("/api/pos"),
  });
}

interface CreateReceiptParams {
  supplierName: string;
  supplierId?: string;
  purchaseOrderId?: string;
  notes?: string;
  lineItems: {
    productId?: string;
    productName: string;
    quantity: number;
    unitCost: number;
    unit: string;
  }[];
}

export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReceiptParams) =>
      apiPost<Receipt>("/api/receiving", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.receipts });
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useParseReceivingText() {
  return useMutation({
    mutationFn: (text: string) =>
      apiPost("/api/ai/parse", { text, context: "receiving" }),
  });
}

export function useParseReceivingImage() {
  return useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      const filename = imageUri.split("/").pop() || "photo.jpg";
      formData.append("image", {
        uri: imageUri,
        name: filename,
        type: "image/jpeg",
      } as unknown as Blob);
      formData.append("context", "receiving");

      // Use raw fetch for FormData (no JSON Content-Type)
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const { ENV } = await import("@/lib/env");

      const res = await fetch(`${ENV.API_URL}/api/ai/parse-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to parse image");
      return res.json();
    },
  });
}
