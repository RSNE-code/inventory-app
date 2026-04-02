/**
 * Cycle count hooks — suggestions, recording, history.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CycleCountSuggestion, CycleCount } from "@/types/api";

export function useCycleCountData() {
  return useQuery({
    queryKey: queryKeys.cycleCounts,
    queryFn: () =>
      apiGet<{ suggestions: CycleCountSuggestion[]; history: CycleCount[] }>("/api/cycle-counts"),
  });
}

interface RecordCountParams {
  productId: string;
  expectedQty: number;
  actualQty: number;
  reason?: string;
}

export function useRecordCycleCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordCountParams) => apiPost("/api/cycle-counts", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cycleCounts });
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
