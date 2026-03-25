"use client"

import { useState } from "react"
import { useAssemblies, useUpdateAssembly, useBatchShip } from "@/hooks/use-assemblies"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/shared/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { cn, formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import {
  DoorOpen,
  Layers,
  Truck,
  CheckCircle,
  Package,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"

type ShippingView = "ready" | "shipped"

const typeIcons: Record<string, typeof DoorOpen> = {
  DOOR: DoorOpen,
  FLOOR_PANEL: Layers,
  WALL_PANEL: Layers,
  RAMP: Layers,
}

const typeLabels: Record<string, string> = {
  DOOR: "Door",
  FLOOR_PANEL: "Floor Panel",
  WALL_PANEL: "Wall Panel",
  RAMP: "Ramp",
}

function getSpecsSummary(type: string, specs: Record<string, unknown> | null): string {
  if (!specs) return ""
  if (type === "DOOR") {
    const parts: string[] = []
    if (specs.widthInClear && specs.heightInClear) {
      parts.push(`${specs.widthInClear}×${specs.heightInClear}`)
    }
    if (specs.doorCategory) {
      const cat = String(specs.doorCategory)
      if (cat.includes("Freezer")) parts.push("Freezer")
      else if (cat.includes("Cooler")) parts.push("Cooler")
    }
    if (specs.operationType) {
      parts.push(String(specs.operationType) === "SLIDING" ? "Slider" : "Swing")
    }
    return parts.join(" · ")
  }
  // Panel
  const parts: string[] = []
  if (specs.thickness) parts.push(`${specs.thickness}"`)
  if (specs.cutLengthDisplay) parts.push(String(specs.cutLengthDisplay))
  return parts.join(" × ")
}

export function FinishedGoodsList() {
  const [view, setView] = useState<ShippingView>("ready")
  const completedQuery = useAssemblies({ status: "COMPLETED" })
  const shippedQuery = useAssemblies({ status: "SHIPPED" })
  const updateAssembly = useUpdateAssembly()
  const batchShip = useBatchShip()

  const completed: Record<string, unknown>[] = completedQuery.data?.data || []
  const shipped: Record<string, unknown>[] = shippedQuery.data?.data || []

  // Group completed by jobName
  const jobGroups: Record<string, Record<string, unknown>[]> = {}
  for (const item of completed) {
    const job = (item.jobName as string) || "No Job Assigned"
    if (!jobGroups[job]) jobGroups[job] = []
    jobGroups[job].push(item)
  }

  // Sort: named jobs first (by count desc), "No Job Assigned" last
  const sortedJobs = Object.entries(jobGroups).sort(([a, itemsA]: [string, Record<string, unknown>[]], [b, itemsB]: [string, Record<string, unknown>[]]) => {
    if (a === "No Job Assigned") return 1
    if (b === "No Job Assigned") return -1
    return itemsB.length - itemsA.length
  })

  async function handleShipOne(assemblyId: string, jobName: string) {
    try {
      await updateAssembly.mutateAsync({ id: assemblyId, status: "SHIPPED" })
      toast.success(`Shipped to ${jobName}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to ship")
    }
  }

  async function handleShipAll(assemblyIds: string[], jobName: string) {
    try {
      await batchShip.mutateAsync(assemblyIds)
      toast.success(`Shipped ${assemblyIds.length} item${assemblyIds.length !== 1 ? "s" : ""} to ${jobName}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to ship")
    }
  }

  const isLoading = view === "ready" ? completedQuery.isLoading : shippedQuery.isLoading
  const hasError = completedQuery.error || shippedQuery.error

  if (hasError) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-status-red/10 mx-auto mb-3">
          <AlertTriangle className="h-7 w-7 text-status-red" />
        </div>
        <p className="text-text-secondary font-medium mb-1">Failed to load shipping data</p>
        <p className="text-text-muted text-sm">Check your connection and try again</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
        <button
          onClick={() => setView("ready")}
          className={cn(
            "flex-1 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all duration-300",
            view === "ready"
              ? "bg-white text-navy shadow-brand"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          Ready to Ship{completed.length > 0 && ` (${completed.length})`}
        </button>
        <button
          onClick={() => setView("shipped")}
          className={cn(
            "flex-1 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all duration-300",
            view === "shipped"
              ? "bg-white text-navy shadow-brand"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          Recently Shipped
        </button>
      </div>

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : view === "ready" ? (
        // Ready to Ship — grouped by job
        sortedJobs.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All Shipped"
            description="No completed items waiting to ship"
          />
        ) : (
          <div className="space-y-3">
            {sortedJobs.map(([jobName, items], groupIdx) => {
              const assemblyIds = items.map((i) => i.id as string)
              return (
                <Card
                  key={jobName}
                  className={`rounded-xl border-border-custom shadow-brand card-accent-green overflow-hidden animate-fade-in-up stagger-${Math.min(groupIdx + 1, 12)}`}
                >
                  {/* Job header */}
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-navy">{jobName}</h3>
                      {items[0].jobNumber ? (
                        <p className="text-xs text-text-muted font-medium">Job #{String(items[0].jobNumber)}</p>
                      ) : null}
                    </div>
                    <span className="text-xs font-bold text-status-green bg-status-green/15 px-2.5 py-1 rounded-full">
                      {items.length} ready
                    </span>
                  </div>

                  {/* Item rows */}
                  <div>
                    {items.map((item: Record<string, unknown>, i: number) => {
                      const type = item.type as string
                      const specs = item.specs as Record<string, unknown> | null
                      const Icon = typeIcons[type] || Package
                      const specsSummary = getSpecsSummary(type, specs)

                      return (
                        <div
                          key={item.id as string}
                          className={cn(
                            "flex items-center gap-3 px-4 min-h-[52px] py-3",
                            i < items.length - 1 && "border-b border-border-custom/40"
                          )}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-status-green/10">
                            <Icon className="h-4 w-4 text-status-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-navy truncate">
                              {typeLabels[type] || type}
                            </p>
                            {specsSummary && (
                              <p className="text-xs text-text-muted truncate">{specsSummary}</p>
                            )}
                            <p className="text-xs text-text-muted">
                              Completed {new Date(item.completedAt as string).toLocaleDateString()}
                              {item.cost ? ` · ${formatCurrency(Number(item.cost))}` : null}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShipOne(item.id as string, jobName)}
                            disabled={updateAssembly.isPending}
                            className="h-10 px-3 text-sm font-semibold text-brand-blue border-brand-blue/30 hover:bg-brand-blue/5 shrink-0"
                          >
                            <Truck className="h-3.5 w-3.5 mr-1.5" />
                            Ship
                          </Button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Ship All button */}
                  {items.length > 1 && (
                    <div className="px-4 pb-4 pt-2">
                      <Button
                        onClick={() => handleShipAll(assemblyIds, jobName)}
                        disabled={batchShip.isPending}
                        className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        {batchShip.isPending ? "Shipping..." : `Ship All ${items.length} Items`}
                      </Button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )
      ) : (
        // Recently Shipped
        shipped.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Shipments Yet"
            description="Shipped items will appear here"
          />
        ) : (
          <div className="space-y-2">
            {shipped.slice(0, 20).map((item: Record<string, unknown>, i: number) => {
              const type = item.type as string
              const Icon = typeIcons[type] || Package
              return (
                <Link key={item.id as string} href={`/assemblies/${item.id}`}>
                  <Card className={`px-4 py-3 rounded-xl border-border-custom shadow-brand card-accent-gray overflow-hidden hover:shadow-brand-md transition-all duration-300 animate-fade-in-up stagger-${Math.min(i + 1, 12)}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
                        <Icon className="h-4 w-4 text-text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">
                          {typeLabels[type] || type}
                          {item.jobName ? <span className="text-text-muted font-normal"> — {String(item.jobName)}</span> : null}
                        </p>
                        <p className="text-xs text-text-muted">
                          Shipped {item.shippedAt ? new Date(item.shippedAt as string).toLocaleDateString() : ""}
                          {item.cost ? ` · ${formatCurrency(Number(item.cost))}` : null}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-muted/30 shrink-0" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
