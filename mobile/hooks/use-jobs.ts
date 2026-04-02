/**
 * Job hooks — list, create. Ported from web src/hooks/use-jobs.ts.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Job } from "@/types/api";

export function useJobs(search?: string) {
  const params = new URLSearchParams({ status: "ACTIVE" });
  if (search) params.set("search", search);
  return useQuery({
    queryKey: [...queryKeys.jobs, search],
    queryFn: () => apiGet<{ data: Job[] }>(`/api/jobs?${params}`),
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; number?: string }) =>
      apiPost<Job>("/api/jobs", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jobs });
    },
  });
}
