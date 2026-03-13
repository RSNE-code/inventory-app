"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { useBoms } from "@/hooks/use-boms"
import { Header } from "@/components/layout/header"
import { SearchInput } from "@/components/shared/search-input"
import { BomCard } from "@/components/bom/bom-card"
import { BomAIFlow } from "@/components/bom/bom-ai-flow"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton } from "@/components/shared/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const statuses = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Approved", value: "APPROVED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
]

type Tab = "create" | "list"

export default function BomsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("create")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useBoms({ search, status, page })
  const boms = data?.data || []
  const totalPages = data?.totalPages || 1

  return (
    <div>
      <Header title="Bills of Materials" />

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-4">
        <button
          onClick={() => setActiveTab("create")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "create"
              ? "border-brand-orange text-brand-orange"
              : "border-transparent text-text-muted hover:text-navy"
          )}
        >
          Create BOM
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "list"
              ? "border-brand-orange text-brand-orange"
              : "border-transparent text-text-muted hover:text-navy"
          )}
        >
          BOM List
        </button>
      </div>

      {activeTab === "create" ? (
        <div className="p-4">
          <BomAIFlow />
        </div>
      ) : (
        <>
          <div className="p-4 space-y-3">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Search by job name or number..."
            />

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setStatus(s.value); setPage(1) }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                    status === s.value
                      ? "bg-brand-blue text-white shadow-[0_2px_6px_rgba(46,125,186,0.25)]"
                      : "bg-surface-secondary text-text-secondary hover:bg-border-custom"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 space-y-3 pb-24">
            {isLoading ? (
              <ListSkeleton count={5} />
            ) : boms.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No BOMs found"
                description={search || status ? "Try different filters" : "Create your first Bill of Materials"}
                actionLabel={!search && !status ? "Create BOM" : undefined}
                onAction={!search && !status ? () => setActiveTab("create") : undefined}
              />
            ) : (
              <>
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wide">{data?.total || 0} BOMs</p>
                {(() => {
                  const jobNameCounts: Record<string, number> = {}
                  const jobNameSeq: Record<string, number> = {}
                  for (const b of boms) {
                    const jn = b.jobName as string
                    jobNameCounts[jn] = (jobNameCounts[jn] || 0) + 1
                  }
                  return boms.map((bom: Record<string, unknown>, i: number) => {
                    const jn = bom.jobName as string
                    let sequenceLabel: string | null = null
                    if (jobNameCounts[jn] > 1) {
                      jobNameSeq[jn] = (jobNameSeq[jn] || 0) + 1
                      sequenceLabel = `BOM ${jobNameSeq[jn]}`
                    }
                    return (
                      <div key={bom.id as string} className={`animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}>
                        <BomCard
                          id={bom.id as string}
                          jobName={jn}
                          jobNumber={bom.jobNumber as string | null}
                          status={bom.status as string}
                          lineItemCount={(bom._count as Record<string, number>)?.lineItems || 0}
                          createdByName={(bom.createdBy as Record<string, string>)?.name || ""}
                          createdAt={bom.createdAt as string}
                          sequenceLabel={sequenceLabel}
                        />
                      </div>
                    )
                  })
                })()}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 py-4">
                    <Button variant="outline" size="sm" className="rounded-lg" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <span className="flex items-center text-sm text-text-secondary font-medium tabular-nums">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" className="rounded-lg" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
