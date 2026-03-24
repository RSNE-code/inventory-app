"use client"

import { useState, useEffect, useRef } from "react"
import { useAssemblies } from "@/hooks/use-assemblies"
import { useUpdateAssembly } from "@/hooks/use-assemblies"
import { useMe } from "@/hooks/use-me"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ListSkeleton } from "@/components/shared/skeleton"
import { cn, formatQuantity } from "@/lib/utils"
import { Plus, Factory, DoorOpen, Layers, Snowflake, Thermometer, ChevronRight, Truck, Package, Search, LinkIcon } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { FinishedGoodsList } from "@/components/shipping/finished-goods-list"
import { BomStatusBadge } from "@/components/bom/bom-status-badge"

type QueueTab = "DOOR_SHOP" | "FABRICATION" | "SHIPPING"
type StatusFilter = "all" | "AWAITING_APPROVAL" | "APPROVED" | "PLANNED" | "IN_PRODUCTION" | "COMPLETED"

const statusColors: Record<string, string> = {
  PLANNED: "bg-surface-secondary text-text-secondary",
  AWAITING_APPROVAL: "bg-status-yellow/15 text-status-yellow",
  APPROVED: "bg-brand-blue/15 text-brand-blue",
  IN_PRODUCTION: "bg-brand-orange/15 text-brand-orange",
  COMPLETED: "bg-status-green/15 text-status-green",
  ALLOCATED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-surface-secondary text-text-secondary",
}

const statusAccentClass: Record<string, string> = {
  PLANNED: "card-accent-gray",
  AWAITING_APPROVAL: "card-accent-yellow",
  APPROVED: "card-accent-blue",
  IN_PRODUCTION: "card-accent-orange",
  COMPLETED: "card-accent-green",
  ALLOCATED: "card-accent-blue",
  SHIPPED: "card-accent-gray",
}

const statusDots: Record<string, string> = {
  PLANNED: "bg-text-muted",
  AWAITING_APPROVAL: "bg-status-yellow animate-pulse",
  APPROVED: "bg-brand-blue",
  IN_PRODUCTION: "bg-brand-orange animate-pulse",
  COMPLETED: "bg-status-green",
  ALLOCATED: "bg-purple-500",
  SHIPPED: "bg-text-muted",
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
  const tabContainerRef = useRef<HTMLDivElement>(null)
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 })

  // Measure active tab for sliding indicator
  useEffect(() => {
    const container = tabContainerRef.current
    if (!container) return
    const tabs: QueueTab[] = ["DOOR_SHOP", "FABRICATION", "SHIPPING"]
    const idx = tabs.indexOf(queueTab)
    const buttons = container.querySelectorAll<HTMLButtonElement>("button")
    if (buttons[idx]) {
      const btn = buttons[idx]
      setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth })
    }
  }, [queueTab])
  const { data: meData } = useMe()
  const me = meData?.data

  const { data, isLoading } = useAssemblies(
    queueTab !== "SHIPPING" ? {
      queueType: queueTab as "DOOR_SHOP" | "FABRICATION",
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    } : {}
  )

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
        {/* Queue tabs with sliding indicator */}
        <div ref={tabContainerRef} className="relative flex gap-1 bg-surface-secondary rounded-xl p-1">
          {/* Sliding pill indicator */}
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-white shadow-brand tab-indicator"
            style={{ left: tabIndicator.left, width: tabIndicator.width }}
          />
          <button
            onClick={() => setQueueTab("DOOR_SHOP")}
            className={cn(
              "relative z-10 flex-1 py-3 min-h-[44px] rounded-lg text-sm font-semibold transition-colors duration-300 flex items-center justify-center gap-1.5",
              queueTab === "DOOR_SHOP"
                ? "text-navy"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <DoorOpen className="h-4 w-4" />
            Door Shop
          </button>
          <button
            onClick={() => setQueueTab("FABRICATION")}
            className={cn(
              "relative z-10 flex-1 py-3 min-h-[44px] rounded-lg text-sm font-semibold transition-colors duration-300 flex items-center justify-center gap-1.5",
              queueTab === "FABRICATION"
                ? "text-navy"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Layers className="h-4 w-4" />
            Fabrication
          </button>
          <button
            onClick={() => setQueueTab("SHIPPING")}
            className={cn(
              "relative z-10 flex-1 py-3 min-h-[44px] rounded-lg text-sm font-semibold transition-colors duration-300 flex items-center justify-center gap-1.5",
              queueTab === "SHIPPING"
                ? "text-navy"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Truck className="h-4 w-4" />
            Ship
          </button>
        </div>

        {/* Shipping tab — separate content */}
        {queueTab === "SHIPPING" ? (
          <FinishedGoodsList />
        ) : (
        <>
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
              <div className="space-y-3 animate-fade-in-up stagger-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-text-muted" />
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Not Started
                  </h3>
                  <span className="text-xs text-text-muted/60 tabular-nums">{notStarted.length}</span>
                </div>
                {notStarted.map((assembly: Record<string, unknown>, i: number) => (
                  <div key={assembly.id as string} className={`animate-card-enter stagger-${Math.min(i + 1, 8)}`}>
                    <AssemblyCard assembly={assembly} />
                  </div>
                ))}
              </div>
            )}

            {/* In Progress */}
            {inProgress.length > 0 && (
              <div className="space-y-3 animate-fade-in-up stagger-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-orange animate-pulse" />
                  <h3 className="text-xs font-bold text-brand-orange uppercase tracking-wider">
                    In Progress
                  </h3>
                  <span className="text-xs text-brand-orange/60 tabular-nums">{inProgress.length}</span>
                </div>
                {inProgress.map((assembly: Record<string, unknown>, i: number) => (
                  <div key={assembly.id as string} className={`animate-card-enter stagger-${Math.min(i + 1, 8)}`}>
                    <AssemblyCard assembly={assembly} />
                  </div>
                ))}
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="space-y-3 animate-fade-in-up stagger-5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-status-green" />
                  <h3 className="text-xs font-bold text-status-green uppercase tracking-wider">
                    Completed
                  </h3>
                  <span className="text-xs text-status-green/60 tabular-nums">{completed.length}</span>
                </div>
                {completed.map((assembly: Record<string, unknown>, i: number) => (
                  <div key={assembly.id as string} className={`animate-card-enter stagger-${Math.min(i + 1, 8)}`}>
                    <AssemblyCard assembly={assembly} />
                  </div>
                ))}
              </div>
            )}
          </>
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
  const matchedBoms = (assembly.matchedBoms || []) as Array<{
    id: string
    jobName: string
    status: string
    lineItemCount: number
  }>

  const name = template?.name || `Custom ${typeLabels[assembly.type as string] || assembly.type}`
  const status = assembly.status as string

  const [linkSheetOpen, setLinkSheetOpen] = useState(false)

  return (
    <>
      <Link href={`/assemblies/${assembly.id}`}>
        <Card className={cn("p-4 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] group overflow-hidden", statusAccentClass[status] || "card-accent-gray")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-navy text-base">{name as string}</p>
                <Badge className={cn("text-[12px] px-2.5 py-1 gap-1.5 border-0", statusColors[status])}>
                  <span className={cn("h-2 w-2 rounded-full shrink-0", statusDots[status])} />
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
                          ? "bg-brand-blue/10 text-brand-blue"
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
              {/* BOM match badges — door assemblies only */}
              {assembly.type === "DOOR" && (
                <div className="mt-2">
                  {matchedBoms.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {matchedBoms.map((bom) => (
                        <span
                          key={bom.id}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.location.href = `/boms/${bom.id}`
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-brand-blue/8 border border-brand-blue/15 text-xs font-medium text-brand-blue cursor-pointer hover:bg-brand-blue/15 active:scale-[0.97] transition-all"
                        >
                          <Package className="h-3 w-3 shrink-0" />
                          <BomStatusBadge status={bom.status} />
                          <span className="text-text-muted">{bom.lineItemCount} item{bom.lineItemCount !== 1 ? "s" : ""}</span>
                        </span>
                      ))}
                    </div>
                  ) : assembly.jobName ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setLinkSheetOpen(true)
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-lg border border-dashed border-text-muted/30 text-xs font-medium text-text-muted hover:border-brand-blue/40 hover:text-brand-blue hover:bg-brand-blue/5 active:scale-[0.97] transition-all"
                    >
                      <LinkIcon className="h-3 w-3" />
                      No BOM linked — tap to search
                    </button>
                  ) : null}
                </div>
              )}
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

      {/* Manual BOM link Sheet */}
      {assembly.type === "DOOR" && (
        <BomLinkSheet
          open={linkSheetOpen}
          onOpenChange={setLinkSheetOpen}
          jobName={assembly.jobName as string | null}
        />
      )}
    </>
  )
}

function BomLinkSheet({ open, onOpenChange, jobName }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobName: string | null
}) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Array<{
    id: string
    jobName: string
    status: string
    _count: { lineItems: number }
    createdBy: { name: string }
  }>>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Auto-search with job name when sheet opens
  useEffect(() => {
    if (open && jobName) {
      setSearch(jobName)
    }
  }, [open, jobName])

  // Debounced search
  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/boms?search=${encodeURIComponent(search)}&limit=10`)
        if (res.ok) {
          const json = await res.json()
          setResults(json.data || [])
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const bomStatusLabel: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_REVIEW: "Review",
    APPROVED: "Approved",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Find BOM for this door</SheetTitle>
          {jobName && (
            <p className="text-sm text-text-muted">Job: {jobName}</p>
          )}
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job name or number..."
              className="pl-9 h-12"
            />
          </div>

          <div className="space-y-2 max-h-[calc(80vh-180px)] overflow-y-auto">
            {loading ? (
              <div className="p-4 flex items-center justify-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-orange animate-building-pulse" style={{ animationDelay: "0s" }} />
                <div className="h-1.5 w-1.5 rounded-full bg-brand-orange animate-building-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="h-1.5 w-1.5 rounded-full bg-brand-orange animate-building-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            ) : results.length === 0 && search.length >= 2 ? (
              <p className="text-center text-sm text-text-muted py-8">
                No BOMs found for &ldquo;{search}&rdquo;
              </p>
            ) : (
              results.map((bom) => (
                <button
                  key={bom.id}
                  type="button"
                  onClick={() => {
                    window.location.href = `/boms/${bom.id}`
                    onOpenChange(false)
                  }}
                  className="w-full text-left p-3 min-h-[44px] rounded-xl border border-border-custom hover:border-brand-blue/40 hover:bg-brand-blue/5 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy">{bom.jobName}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {bomStatusLabel[bom.status] || bom.status} &middot; {bom._count.lineItems} item{bom._count.lineItems !== 1 ? "s" : ""} &middot; {bom.createdBy.name}
                      </p>
                    </div>
                    <BomStatusBadge status={bom.status} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
