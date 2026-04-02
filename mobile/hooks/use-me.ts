/**
 * Current user hook. Ported from web src/hooks/use-me.ts.
 */
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiGet<{ data: CurrentUser }>("/api/me"),
    staleTime: 1000 * 60 * 5,
  });
}
