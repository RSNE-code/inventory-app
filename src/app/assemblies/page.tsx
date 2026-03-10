"use client"

import { useState } from "react"
import { useAssemblies } from "@/hooks/use-assemblies"
import { useUpdateAssembly } from "@/hooks/use-assemblies"
import { useMe } from "@/hooks/use-me"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, formatQuantity } from "@/lib/utils"
import { Plus, Factory, DoorOpen, Layers, Snowflake, Thermometer } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type QueueTab = "DOOR_SHOP" | "FABRICATION"
type StatusFilter = "all" | "AWAITING_APPROVAL" | "APPROVED" | "PLANNED" | "IN_PRODUCTION" | "COMPLETED"

const statusColors: Record<string, string> = {
  PLANNED: "bg-gray-100 text-gray-700",
  AWAITING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  IN_PRODUCTION: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  ALLOCATED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-gray-100 text-gray-500",
}

const statusLabels: Record<string, string> = {
  PLANNED: "Planned",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  IN_PRODUCTION: "In Production",
  COMPLETED: "Completed",
  ALLOCATED: "Allocated",
  SHIPPED: "Shipped",
}

const typeLabels: Record<string, string> = {
  DOOR: "Door",
  FLOOR_PANEL: "Floor Panel",
  WALL_PANEL: "Wall Panel",
}

export default function AssembliesPage() {
  const [queueTab, setQueueTab] = useState<QueueTab>("DOOR_SHOP")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const { data: meData } = useMe()
  const me = meData?.data

  const { data, isLoading } = useAssemblies({
    queueType: queueTab,
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  })

  const assemblies = data?.data || []

  // Group by status for swimlane-like display
  const notStarted = assemblies.filter((a: Record<string, unknown>) =>
    ["PLANNED", "AWAITING_APPROVAL", "APPROVED"].includes(a.status as string)
  )
  const inProgress = assemblies.filter((a: Record<string, unknown>) =>
    a.status === "IN_PRODUCTION"
  )
  const completed = assemblies.filter((a: Record<string, unknown>) =>
    ["COMPLETED", "ALLOCATED", "SHIPPED"].includes(a.status as string)
  )

  return (
    <div>
      <Header title="Assemblies" />

      <div className="p-4 space-y-4">
        {/* Queue tabs */}
        <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
          <button
            onClick={() => setQueueTab("DOOR_SHOP")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5",
              queueTab === "DOOR_SHOP"
                ? "bg-white text-navy shadow-sm"
                : "text-text-muted"
            )}
          >
            <DoorOpen className="h-4 w-4" />
            Door Shop
          </button>
          <button
            onClick={() => setQueueTab("FABRICATION")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5",
              queueTab === "FABRICATION"
                ? "bg-white text-navy shadow-sm"
                : "text-text-muted"
            )}
          >
            <Layers className="h-4 w-4" />
            Fabrication
          </button>
        </div>

        {/* Create button */}
        <Link href="/assemblies/new">
          <Button className="w-full h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold rounded-xl">
            <Plus className="h-5 w-5 mr-2" />
            {queueTab === "DOOR_SHOP" ? "New Door" : "New Panel / Floor"}
          </Button>
        </Link>

        {isLoading ? (
          <div className="text-center py-12 text-text-muted">Loading queue...</div>
        ) : assemblies.length === 0 ? (
          <div className="text-center py-12">
            <Factory className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-text-muted">No assemblies in the queue</p>
            <p className="text-xs text-gray-400 mt-1">
              Tap the button above to start a new build
            </p>
          </div>
        ) : (
          <>
            {/* Not Started */}
            {notStarted.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Not Started ({notStarted.length})
                </h3>
                {notStarted.map((assembly: Record<string, unknown>) => (
                  <AssemblyCard key={assembly.id as string} assembly={assembly} />
                ))}
              </div>
            )}

            {/* In Progress */}
            {inProgress.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                  In Progress ({inProgress.length})
                </h3>
                {inProgress.map((assembly: Record<string, unknown>) => (
                  <AssemblyCard key={assembly.id as string} assembly={assembly} />
                ))}
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                  Completed ({completed.length})
                </h3>
                {completed.map((assembly: Record<string, unknown>) => (
                  <AssemblyCard key={assembly.id as string} assembly={assembly} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AssemblyCard({ assembly }: { assembly: Record<string, unknown> }) {
  const template = assembly.template as Record<string, unknown> | null
  const producedBy = assembly.producedBy as Record<string, unknown>
  const specs = assembly.specs as Record<string, unknown> | null

  const name = template?.name || `Custom ${typeLabels[assembly.type as string] || assembly.type}`
  const status = assembly.status as string

  return (
    <Link href={`/assemblies/${assembly.id}`}>
      <Card className="p-4 rounded-xl border-border-custom hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-navy text-sm">{name as string}</p>
              <Badge className={cn("text-xs px-1.5 py-0", statusColors[status])}>
                {statusLabels[status] || status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
              <span>{typeLabels[assembly.type as string]}</span>
              {Number(assembly.batchSize) > 1 && (
                <span>Batch: {assembly.batchSize as number}</span>
              )}
            </div>
            {/* Door-specific specs on queue card */}
            {assembly.type === "DOOR" && specs && (() => {
              const ds = specs as Record<string, unknown>
              const w = ds.widthInClear ? String(ds.widthInClear) : null
              const h = ds.heightInClear ? String(ds.heightInClear) : null
              const temp = ds.temperatureType ? String(ds.temperatureType) : null
              const frame = ds.frameType ? String(ds.frameType) : null
              return (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {w && h && (
                    <span className="text-xs font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                      {w} x {h}
                    </span>
                  )}
                  {temp && (
                    <Badge className={cn(
                      "text-[10px] px-1.5 py-0",
                      temp === "FREEZER"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-cyan-100 text-cyan-700"
                    )}>
                      {temp === "FREEZER" ? (
                        <><Snowflake className="h-2.5 w-2.5 mr-0.5" />Freezer</>
                      ) : (
                        <><Thermometer className="h-2.5 w-2.5 mr-0.5" />Cooler</>
                      )}
                    </Badge>
                  )}
                  {frame && (
                    <span className="text-[10px] text-gray-500">
                      {frame.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  )}
                </div>
              )
            })()}
            {assembly.jobName ? (
              <p className="text-xs text-brand-blue mt-1">
                Job: {String(assembly.jobName)}
              </p>
            ) : null}
            <p className="text-xs text-gray-400 mt-1">
              By {producedBy.name as string}
            </p>
          </div>
          <div className="text-right shrink-0">
            {assembly.priority !== undefined && Number(assembly.priority) > 0 && (
              <Badge variant="outline" className="text-xs">
                P{assembly.priority as number}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
