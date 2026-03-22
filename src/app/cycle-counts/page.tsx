"use client"

import { useState } from "react"
import { useCycleCounts, useCreateCycleCount } from "@/hooks/use-cycle-counts"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn, formatQuantity } from "@/lib/utils"
import { toast } from "sonner"
import { ClipboardCheck, ArrowRight, History, MapPin } from "lucide-react"
import { Breadcrumb } from "@/components/layout/breadcrumb"

type ActiveCount = {
  productId: string
  productName: string
  unitOfMeasure: string
  location: string | null
} | null

export default function CycleCountsPage() {
  const { data, isLoading, refetch } = useCycleCounts()
  const createCount = useCreateCycleCount()

  const [activeCount, setActiveCount] = useState<ActiveCount>(null)
  const [actualQty, setActualQty] = useState("")
  const [reason, setReason] = useState("")
  const [showResult, setShowResult] = useState<{
    systemQty: number
    actualQty: number
    variance: number
    unitOfMeasure: string
  } | null>(null)
  const [tab, setTab] = useState<"count" | "history">("count")

  const suggestions = data?.data?.suggestions || []
  const recentCounts = data?.data?.recentCounts || []

  function handleStartCount(item: {
    id: string
    name: string
    unitOfMeasure: string
    location: string | null
  }) {
    setActiveCount({
      productId: item.id,
      productName: item.name,
      unitOfMeasure: item.unitOfMeasure,
      location: item.location,
    })
    setActualQty("")
    setReason("")
    setShowResult(null)
  }

  async function handleSubmitCount() {
    if (!activeCount) return
    const qty = Number(actualQty)
    if (isNaN(qty) || qty < 0) {
      toast.error("Enter a valid quantity")
      return
    }

    try {
      const result = await createCount.mutateAsync({
        productId: activeCount.productId,
        actualQty: qty,
        reason: reason.trim() || null,
      })

      const data = result.data
      setShowResult({
        systemQty: data.systemQty,
        actualQty: data.actualQty,
        variance: data.variance,
        unitOfMeasure: data.unitOfMeasure,
      })
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record count")
    }
  }

  function handleDoneWithResult() {
    setActiveCount(null)
    setShowResult(null)
    setActualQty("")
    setReason("")
  }

  return (
    <div>
      <Header title="Cycle Count" showBack />
      <Breadcrumb items={[{ label: "Cycle Counts" }]} />

      <div className="p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
          <button
            onClick={() => setTab("count")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all",
              tab === "count" ? "bg-white text-navy shadow-sm" : "text-text-muted"
            )}
          >
            Count
          </button>
          <button
            onClick={() => setTab("history")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all",
              tab === "history" ? "bg-white text-navy shadow-sm" : "text-text-muted"
            )}
          >
            History
          </button>
        </div>

        {tab === "count" && (
          <>
            {/* Active count in progress */}
            {activeCount && !showResult && (
              <Card className="p-4 rounded-xl border-[#E8792B] border-2 space-y-3">
                <h3 className="font-semibold text-navy">{activeCount.productName}</h3>
                {activeCount.location && (
                  <div className="flex items-center gap-1.5 text-sm text-text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {activeCount.location}
                  </div>
                )}
                <p className="text-sm text-text-secondary">
                  Count this item, then enter the actual quantity below.
                </p>
                <div>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={actualQty}
                    onChange={(e) => setActualQty(e.target.value)}
                    placeholder={`Actual count (${activeCount.unitOfMeasure})`}
                    className="h-14 text-lg text-center font-semibold"
                  />
                </div>
                <div>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for variance (optional)"
                    className="h-10 text-center"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitCount}
                    disabled={createCount.isPending || !actualQty}
                    className="flex-1 h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold"
                  >
                    {createCount.isPending ? "Recording..." : "Submit Count"}
                  </Button>
                  <Button
                    onClick={() => setActiveCount(null)}
                    variant="outline"
                    className="h-12"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            {/* Result after count */}
            {showResult && (
              <Card className="p-4 rounded-xl border-border-custom space-y-3">
                <h3 className="font-semibold text-navy">{activeCount?.productName}</h3>
                <div className="flex items-center justify-center gap-4 py-3">
                  <div className="text-center">
                    <p className="text-xs text-text-secondary">System</p>
                    <p className="text-2xl font-bold tabular-nums text-text-muted">
                      {formatQuantity(showResult.systemQty)}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-muted/60" />
                  <div className="text-center">
                    <p className="text-xs text-text-secondary">Actual</p>
                    <p className="text-2xl font-bold tabular-nums text-navy">
                      {formatQuantity(showResult.actualQty)}
                    </p>
                  </div>
                </div>

                {showResult.variance !== 0 ? (
                  <div className={cn(
                    "text-center p-3 rounded-lg",
                    showResult.variance > 0 ? "bg-green-50" : "bg-red-50"
                  )}>
                    <p className={cn(
                      "text-lg font-bold",
                      showResult.variance > 0 ? "text-green-600" : "text-red-500"
                    )}>
                      {showResult.variance > 0 ? "+" : ""}{formatQuantity(showResult.variance)} {showResult.unitOfMeasure}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">Stock adjusted automatically</p>
                  </div>
                ) : (
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">No variance</p>
                    <p className="text-xs text-text-secondary">Count matches system</p>
                  </div>
                )}

                <Button
                  onClick={handleDoneWithResult}
                  className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
                >
                  Done
                </Button>
              </Card>
            )}

            {/* Suggestions */}
            {!activeCount && (
              <>
                <h3 className="font-semibold text-navy text-sm">
                  Suggested Items to Count
                </h3>
                {isLoading ? (
                  <div className="text-center py-8 text-text-muted">Loading suggestions...</div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-text-muted/60" />
                    <p className="text-text-muted">All items recently counted</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((item: Record<string, unknown>) => (
                      <Card
                        key={item.id as string}
                        className="p-3 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md transition-all duration-300 cursor-pointer active:scale-[0.98]"
                        onClick={() => handleStartCount({
                          id: item.id as string,
                          name: item.name as string,
                          unitOfMeasure: item.unitOfMeasure as string,
                          location: item.location as string | null,
                        })}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-navy truncate">
                              {item.name as string}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-xs">
                                {item.categoryName as string}
                              </Badge>
                              {item.location ? (
                                <span className="text-xs text-text-muted flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {String(item.location)}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">
                              {item.lastCountedAt
                                ? `Last counted: ${new Date(item.lastCountedAt as string).toLocaleDateString()}`
                                : "Never counted"}
                              {Number(item.recentTransactions) > 0 &&
                                ` — ${item.recentTransactions} recent transactions`}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="text-brand-blue shrink-0">
                            Count
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "history" && (
          <>
            <h3 className="font-semibold text-navy text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Counts
            </h3>
            {recentCounts.length === 0 ? (
              <p className="text-center py-8 text-text-muted">No counts recorded yet</p>
            ) : (
              <div className="space-y-2">
                {recentCounts.map((count: Record<string, unknown>) => {
                  const variance = Number(count.variance)
                  return (
                    <Card key={count.id as string} className="p-3 rounded-xl border-border-custom shadow-brand">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-navy">
                            {count.productName as string}
                          </p>
                          <p className="text-xs text-text-muted">
                            {count.countedBy as string} — {new Date(count.countedAt as string).toLocaleString()}
                          </p>
                          {count.reason ? (
                            <p className="text-xs text-text-secondary mt-0.5">{String(count.reason)}</p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-sm tabular-nums">
                            {formatQuantity(Number(count.systemQty))} → {formatQuantity(Number(count.actualQty))}
                          </p>
                          <p className={cn(
                            "text-xs font-semibold tabular-nums",
                            variance === 0 ? "text-green-600" :
                            variance > 0 ? "text-blue-600" : "text-red-500"
                          )}>
                            {variance === 0 ? "Match" : `${variance > 0 ? "+" : ""}${formatQuantity(variance)}`}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
