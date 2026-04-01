"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, ChevronUp, ChevronDown } from "lucide-react"
import { useBoms, useReorderBoms } from "@/hooks/use-boms"
import { toast } from "sonner"
import { Header } from "@/components/layout/header"
import { SearchInput } from "@/components/shared/search-input"
import { BomCard } from "@/components/bom/bom-card"
import { BomPhotoCapture } from "@/components/bom/bom-photo-capture"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton } from "@/components/shared/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const statuses = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Review", value: "PENDING_REVIEW" },
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

  // Reorder support — only for APPROVED and IN_PROGRESS
  const isReorderable = ["APPROVED", "IN_PROGRESS"].includes(status)
  const reorderMutation = useReorderBoms()
  const [localOrder, setLocalOrder] = useState<Record<string, unknown>[] | null>(null)
  const pendingOrderRef = useRef<string[] | null>(null)

  // Reset local order when server data changes
  const displayBoms = localOrder && isReorderable ? localOrder : boms

  const moveItem = useCallback((index: number, direction: "up" | "down") => {
    const source = localOrder || boms
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= source.length) return

    const reordered = [...source]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)
    setLocalOrder(reordered)

    const newIds = reordered.map((b) => b.id as string)
    pendingOrderRef.current = newIds
    reorderMutation.mutate(newIds, {
      onError: () => {
        toast.error("Failed to save order")
        pendingOrderRef.current = null
        setLocalOrder(null)
      },
      onSuccess: () => {
        pendingOrderRef.current = null
      },
    })
  }, [localOrder, boms, reorderMutation])

  return (
    <div>
      <Header title="Bills of Materials" />

      {/* Tab bar — segmented control */}
      <div className="px-4 pt-3">
        <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
          <button
            onClick={() => setActiveTab("create")}
            className={cn(
              "flex-1 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all duration-300",
              activeTab === "create"
                ? "bg-white text-navy shadow-brand"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            Create BOM
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={cn(
              "flex-1 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all duration-300",
              activeTab === "list"
                ? "bg-white text-navy shadow-brand"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            BOM List
          </button>
        </div>
      </div>

      {activeTab === "create" ? (
        <div className="px-4 pt-3 pb-4">
          <BomPhotoCapture />
        </div>
      ) : (
        <>
          <div className="px-4 pt-3 space-y-2">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Search by job name or number..."
            />

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setStatus(s.value); setPage(1) }}
                  className={cn(
                    "px-4 py-2.5 min-h-[44px] rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300",
                    status === s.value
                      ? "bg-brand-blue text-white shadow-[0_2px_6px_rgba(46,125,186,0.25)]"
                      : "bg-white border border-border-custom text-navy hover:bg-surface-secondary"
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
                  for (const b of displayBoms) {
                    const jn = b.jobName as string
                    jobNameCounts[jn] = (jobNameCounts[jn] || 0) + 1
                  }
                  return displayBoms.map((bom: Record<string, unknown>, i: number) => {
                    const jn = bom.jobName as string
                    let sequenceLabel: string | null = null
                    if (jobNameCounts[jn] > 1) {
                      jobNameSeq[jn] = (jobNameSeq[jn] || 0) + 1
                      sequenceLabel = `BOM ${jobNameSeq[jn]}`
                    }
                    return (
                      <div key={bom.id as string} className={`animate-card-enter stagger-${Math.min(i + 1, 8)}`}>
                        <BomCard
                          id={bom.id as string}
                          jobName={jn}
                          jobNumber={bom.jobNumber as string | null}
                          status={bom.status as string}
                          lineItemCount={(bom._count as Record<string, number>)?.lineItems || 0}
                          createdByName={(bom.createdBy as Record<string, string>)?.name || ""}
                          createdAt={bom.createdAt as string}
                          sequenceLabel={sequenceLabel}
                          unfabricatedAssemblyCount={(bom as Record<string, unknown>).unfabricatedAssemblyCount as number || 0}
                          position={isReorderable ? i + 1 : undefined}
                          totalInList={isReorderable ? displayBoms.length : undefined}
                          onMoveUp={isReorderable ? () => moveItem(i, "up") : undefined}
                          onMoveDown={isReorderable ? () => moveItem(i, "down") : undefined}
                        />
                      </div>
                    )
                  })
                })()}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 py-4">
                    <Button variant="outline" size="sm" className="rounded-xl" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <span className="flex items-center text-sm text-text-secondary font-medium tabular-nums">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" className="rounded-xl" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
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
