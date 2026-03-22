"use client"

import { useState } from "react"
import { useAssemblies } from "@/hooks/use-assemblies"
import { useUpdateAssembly } from "@/hooks/use-assemblies"
import { useMe } from "@/hooks/use-me"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ListSkeleton } from "@/components/shared/skeleton"
import { cn, formatQuantity } from "@/lib/utils"
import { Plus, Factory, DoorOpen, Layers, Snowflake, Thermometer, ChevronRight } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type QueueTab = "DOOR_SHOP" | "FABRICATION"
type StatusFilter = "all" | "AWAITING_APPROVAL" | "APPROVED" | "PLANNED" | "IN_PRODUCTION" | "COMPLETED"

const statusColors: Record<string, string> = {
  PLANNED: "bg-gray-100 text-gray-600",
  AWAITING_APPROVAL: "bg-status-yellow/8 text-status-yellow",
  APPROVED: "bg-brand-blue/8 text-brand-blue",
  IN_PRODUCTION: "bg-brand-orange/8 text-brand-orange",
  COMPLETED: "bg-status-green/8 text-status-green",
  ALLOCATED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-gray-100 text-gray-500",
}

const statusDots: Record<string, string> = {
  PLANNED: "bg-gray-400",
  AWAITING_APPROVAL: "bg-status-yellow animate-pulse",
  APPROVED: "bg-brand-blue",
  IN_PRODUCTION: "bg-brand-orange animate-pulse",
  COMPLETED: "bg-status-green",
  ALLOCATED: "bg-purple-500",
  SHIPPED: "bg-gray-400",
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
                ? "bg-white text-navy shadow-brand"
                : "text-text-muted hover:text-text-secondary"
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
                ? "bg-white text-navy shadow-brand"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Layers className="h-4 w-4" />
            Fabrication
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {([
            { value: "all", label: "All" },
            { value: "AWAITING_APPROVAL", label: "Pending" },
            { value: "APPROVED", label: "Approved" },
            { value: "IN_PRODUCTION", label: "Building" },
            { value: "COMPLETED", label: "Done" },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value as StatusFilter)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                statusFilter === tab.value
                  ? "bg-brand-blue text-white shadow-[0_2px_6px_rgba(46,125,186,0.25)]"
                  : "bg-surface-secondary text-text-secondary hover:bg-border-custom"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create button */}
        <Link href="/assemblies/new">
          <Button className="w-full h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(232,121,43,0.25)] transition-all">
            <Plus className="h-5 w-5 mr-2" />
            {queueTab === "DOOR_SHOP" ? "New Door" : "New Panel / Floor"}
          </Button>
        </Link>

        {isLoading ? (
          <ListSkeleton count={4} />
        ) : assemblies.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="relative inline-block mb-5">
              <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-surface-secondary">
                <Factory className="h-8 w-8 text-text-muted/60" />
              </div>
              <div className="absolute -inset-2 rounded-3xl border-2 border-dashed border-border-custom/40" />
            </div>
            <p className="text-text-secondary font-semibold">No assemblies in the queue</p>
            <p className="text-xs text-text-muted mt-1">
              Tap the button above to start a new build
            </p>
          </div>
        ) : (
          <>
            {/* Not Started */}
            {notStarted.length > 0 && (
              <div className="space-y-2 animate-fade-in-up stagger-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Not Started
                  </h3>
                  <span className="text-xs text-text-muted/60 tabular-nums">{notStarted.length}</span>
                </div>
                {notStarted.map((assembly: Record<string, unknown>) => (
                  <AssemblyCard key={assembly.id as string} assembly={assembly} />
                ))}
              </div>
            )}

            {/* In Progress */}
            {inProgress.length > 0 && (
              <div className="space-y-2 animate-fade-in-up stagger-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-orange animate-pulse" />
                  <h3 className="text-xs font-bold text-brand-orange uppercase tracking-wider">
                    In Progress
                  </h3>
                  <span className="text-xs text-brand-orange/60 tabular-nums">{inProgress.length}</span>
                </div>
                {inProgress.map((assembly: Record<string, unknown>) => (
                  <AssemblyCard key={assembly.id as string} assembly={assembly} />
                ))}
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="space-y-2 animate-fade-in-up stagger-5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-status-green" />
                  <h3 className="text-xs font-bold text-status-green uppercase tracking-wider">
                    Completed
                  </h3>
                  <span className="text-xs text-status-green/60 tabular-nums">{completed.length}</span>
                </div>
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
      <Card className="p-4 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md transition-all duration-300 active:scale-[0.98] group">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-navy text-sm">{name as string}</p>
              <Badge className={cn("text-[12px] px-1.5 py-0 gap-1", statusColors[status])}>
                <span className={cn("h-1 w-1 rounded-full shrink-0", statusDots[status])} />
                {statusLabels[status] || status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-text-muted font-medium">
              <span>{typeLabels[assembly.type as string]}</span>
              {Number(assembly.batchSize) > 1 && (
                <span>Batch: {assembly.batchSize as number}</span>
              )}
            </div>
            {/* Door-specific specs */}
            {assembly.type === "DOOR" && specs && (() => {
              const ds = specs as Record<string, unknown>
              const w = ds.widthInClear ? String(ds.widthInClear) : null
              const h = ds.heightInClear ? String(ds.heightInClear) : null
              const temp = ds.temperatureType ? String(ds.temperatureType) : null
              const frame = ds.frameType ? String(ds.frameType) : null
              return (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {w && h && (
                    <span className="text-xs font-semibold text-navy/70 bg-surface-secondary px-1.5 py-0.5 rounded">
                      {w} x {h}
                    </span>
                  )}
                  {temp && (
                    <Badge className={cn(
                      "text-[12px] px-1.5 py-0 border-0",
                      temp === "FREEZER"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-cyan-50 text-cyan-600"
                    )}>
                      {temp === "FREEZER" ? (
                        <><Snowflake className="h-2.5 w-2.5 mr-0.5" />Freezer</>
                      ) : (
                        <><Thermometer className="h-2.5 w-2.5 mr-0.5" />Cooler</>
                      )}
                    </Badge>
                  )}
                  {frame && (
                    <span className="text-[12px] text-text-muted font-medium">
                      {frame.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  )}
                </div>
              )
            })()}
            {assembly.jobName ? (
              <p className="text-xs text-brand-blue font-medium mt-1">
                Job: {String(assembly.jobName)}
              </p>
            ) : null}
            <p className="text-xs text-text-muted mt-1">
              By {producedBy.name as string}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {assembly.priority !== undefined && Number(assembly.priority) > 0 && (
              <Badge variant="outline" className="text-xs font-semibold">
                P{assembly.priority as number}
              </Badge>
            )}
            <ChevronRight className="h-4 w-4 text-text-muted/30 group-hover:text-text-muted/60 transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
