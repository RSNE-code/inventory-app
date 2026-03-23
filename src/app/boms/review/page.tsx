"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProductPicker } from "@/components/bom/product-picker"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Check, X, AlertCircle, ClipboardCheck, ChevronRight } from "lucide-react"

export default function ReviewQueuePage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["boms", "review"],
    queryFn: async () => {
      const res = await fetch("/api/boms/review")
      if (!res.ok) throw new Error("Failed to fetch review queue")
      return res.json()
    },
  })

  const boms = data?.data || []

  const [expandedBomId, setExpandedBomId] = useState<string | null>(null)
  const [fixingItemId, setFixingItemId] = useState<string | null>(null)

  const reviewMutation = useMutation({
    mutationFn: async ({ bomId, ...body }: { bomId: string; action: string; lineItemId?: string; newProductId?: string }) => {
      const res = await fetch(`/api/boms/${bomId}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Review action failed")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boms", "review"] })
      queryClient.invalidateQueries({ queryKey: ["boms"] })
    },
  })

  function handleConfirmItem(bomId: string, lineItemId: string) {
    reviewMutation.mutate({ bomId, action: "confirm", lineItemId })
    toast.success("Match confirmed")
  }

  function handleFixItem(bomId: string, lineItemId: string, newProductId: string) {
    reviewMutation.mutate({ bomId, action: "fix", lineItemId, newProductId })
    setFixingItemId(null)
    toast.success("Match corrected")
  }

  function handleApproveAll(bomId: string) {
    reviewMutation.mutate({ bomId, action: "approve" })
    toast.success("BOM approved")
    setExpandedBomId(null)
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Review Queue" showMenu />
        <div className="text-center py-12 text-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Review Queue" showMenu />

      <div className="p-4 space-y-3 pb-24">
        {boms.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="h-12 w-12 text-status-green/50 mx-auto mb-3" />
            <p className="text-base font-semibold text-navy">All caught up</p>
            <p className="text-sm text-text-muted mt-1">No BOMs pending review</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              {boms.length} BOM{boms.length !== 1 ? "s" : ""} pending review
            </p>

            {boms.map((bom: Record<string, unknown>) => {
              const bomId = bom.id as string
              const isExpanded = expandedBomId === bomId
              const lineItems = (bom.lineItems || []) as Record<string, unknown>[]
              const flaggedCount = lineItems.filter(
                (li) => li.matchConfidence !== null && Number(li.matchConfidence) < 0.85
              ).length

              return (
                <Card key={bomId} className="rounded-xl border-border-custom overflow-hidden">
                  {/* BOM header */}
                  <button
                    type="button"
                    onClick={() => setExpandedBomId(isExpanded ? null : bomId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-surface-secondary/50 transition-colors"
                  >
                    <div className="text-left min-w-0">
                      <p className="text-[15px] font-bold text-navy truncate">{bom.jobName as string}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {lineItems.length} items &middot; {(bom.createdBy as Record<string, string>)?.name}
                        {flaggedCount > 0 && (
                          <span className="text-orange-500 font-semibold"> &middot; {flaggedCount} flagged</span>
                        )}
                      </p>
                    </div>
                    <ChevronRight className={cn("h-5 w-5 text-text-muted transition-transform", isExpanded && "rotate-90")} />
                  </button>

                  {/* Expanded line items */}
                  {isExpanded && (
                    <div className="border-t border-border-custom">
                      {lineItems.map((li) => {
                        const liId = li.id as string
                        const product = li.product as Record<string, unknown> | null
                        const confidence = li.matchConfidence as number | null
                        const rawText = li.rawText as string | null
                        const isLow = confidence !== null && confidence < 0.85
                        const isConfirmed = confidence !== null && confidence >= 1.0
                        const isFixing = fixingItemId === liId

                        return (
                          <div key={liId} className={cn(
                            "px-4 py-3 border-b border-border-custom/40 last:border-0",
                            isLow && "bg-brand-orange/10"
                          )}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-navy truncate">
                                  {product ? (product.name as string) : (li.nonCatalogName as string) || "Unknown"}
                                </p>
                                {rawText && (
                                  <p className="text-xs text-text-muted mt-0.5">
                                    Raw: "{rawText}"
                                  </p>
                                )}
                                {confidence !== null && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-16 h-1.5 rounded-full bg-border-custom overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full",
                                          confidence >= 0.9 ? "bg-status-green" :
                                          confidence >= 0.7 ? "bg-status-yellow" : "bg-status-red"
                                        )}
                                        style={{ width: `${confidence * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-text-muted font-medium">
                                      {Math.round(confidence * 100)}%
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-sm font-bold text-navy tabular-nums mr-2">
                                  ×{Number(li.qtyNeeded)}
                                </span>
                                {!isConfirmed && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmItem(bomId, liId)}
                                      disabled={reviewMutation.isPending}
                                      className="h-10 w-10 flex items-center justify-center rounded-lg bg-status-green/10 text-status-green hover:bg-status-green/20 active:scale-95"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setFixingItemId(isFixing ? null : liId)}
                                      className="h-10 w-10 flex items-center justify-center rounded-lg bg-status-red/10 text-status-red hover:bg-status-red/20 active:scale-95"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                {isConfirmed && (
                                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-status-green/15">
                                    <Check className="h-4 w-4 text-status-green" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Fix mode — product picker */}
                            {isFixing && (
                              <div className="mt-3">
                                <ProductPicker
                                  onSelect={(p) => handleFixItem(bomId, liId, p.id)}
                                  placeholder="Search for correct product..."
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Approve all button */}
                      <div className="p-4">
                        <Button
                          onClick={() => handleApproveAll(bomId)}
                          disabled={reviewMutation.isPending}
                          className="w-full h-14 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold text-base rounded-xl"
                        >
                          <ClipboardCheck className="h-5 w-5 mr-2" />
                          Confirm All & Approve BOM
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
