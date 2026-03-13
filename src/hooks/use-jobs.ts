import { useQuery } from "@tanstack/react-query"

export function useJobs(search?: string) {
  const params = new URLSearchParams()
  params.set("status", "ACTIVE")
  if (search) params.set("search", search)

  return useQuery({
    queryKey: ["jobs", search],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${res.status}`)
      }
      return res.json()
    },
  })
}
