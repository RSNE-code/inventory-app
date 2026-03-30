"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAssembly, useUpdateAssembly, useDeleteAssembly } from "@/hooks/use-assemblies"
import { useMe } from "@/hooks/use-me"
import { useCelebration } from "@/hooks/use-celebration"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DoorSpecSheet } from "@/components/doors/door-spec-sheet"
import { DoorManufacturingSheet } from "@/components/doors/door-manufacturing-sheet"
import { StartBuildModal } from "@/components/shared/start-build-modal"
import { cn, formatQuantity } from "@/lib/utils"
import { toast } from "sonner"
import type { DoorSpecs } from "@/lib/door-specs"
import { getDoorFieldLabel, formatDoorFieldValue } from "@/lib/door-field-labels"
import { StepProgress } from "@/components/layout/step-progress"
import { SwipeToDelete } from "@/components/ui/swipe-to-delete"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Play,
  Package,
  History,
  Truck,
  FileText,
  ClipboardList,
  Hammer,
  Layers,
  Triangle,
  DoorOpen,
  Trash2,
} from "lucide-react"

const statusColors: Record<string, string> = {
  PLANNED: "bg-surface-secondary text-text-primary",
  AWAITING_APPROVAL: "bg-status-yellow/15 text-status-yellow",
  APPROVED: "bg-brand-blue/15 text-brand-blue",
  IN_PRODUCTION: "bg-brand-orange/15 text-brand-orange",
  COMPLETED: "bg-status-green/15 text-status-green",
  ALLOCATED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-surface-secondary text-text-secondary",
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
  RAMP: "Ramp",
}

const typeIcons: Record<string, typeof DoorOpen> = {
  DOOR: DoorOpen,
  FLOOR_PANEL: Layers,
  WALL_PANEL: Layers,
  RAMP: Triangle,
}

// Lifecycle tracker steps and status mapping
const LIFECYCLE_STEPS = ["Created", "Building", "Complete", "Shipped"]
function getLifecycleStep(status: string): number {
  switch (status) {
    case "PLANNED":
    case "AWAITING_APPROVAL":
    case "APPROVED":
      return 0
    case "IN_PRODUCTION":
      return 1
    case "COMPLETED":
    case "ALLOCATED":
      return 2
    case "SHIPPED":
      return 3
    default:
      return 0
  }
}

// Roles that default to manufacturing sheet view
const SHOP_ROLES = ["DOOR_SHOP", "SHOP_FOREMAN", "CREW"]

export default function AssemblyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading } = useAssembly(id)
  const { data: meData } = useMe()
  const updateAssembly = useUpdateAssembly()
  const deleteAssembly = useDeleteAssembly()
  const { celebrate } = useCelebration()
  const me = meData?.data

  const [approvalNotes, setApprovalNotes] = useState("")
  const [showStartBuildModal, setShowStartBuildModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Door sheet view toggle
  const [sheetView, setSheetView] = useState<"spec" | "manufacturing">("spec")

  useEffect(() => {
    if (me) {
      const isShop = SHOP_ROLES.includes(me.role)
      if (isShop) setSheetView("manufacturing")
    }
  }, [me])

  const assembly = data?.data
  const isAdmin = me && me.role === "ADMIN"
  const canDeleteAssembly = isAdmin && assembly && ["PLANNED", "AWAITING_APPROVAL", "APPROVED"].includes(assembly.status)

  async function handleDeleteAssembly() {
    try {
      await deleteAssembly.mutateAsync(id)
      toast.success("Assembly deleted")
      router.push("/assemblies")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete assembly")
    }
    setShowDeleteConfirm(false)
  }

  if (isLoading) {
    return (
      <div className="overscroll-fix">
        <Header title="Assembly Detail" showBack />
        <div className="p-4 space-y-3">
          <div className="h-20 rounded-xl skeleton-shimmer" />
          <div className="h-48 rounded-xl skeleton-shimmer stagger-1" />
          <div className="h-32 rounded-xl skeleton-shimmer stagger-2" />
        </div>
      </div>
    )
  }

  if (!assembly) {
    return (
      <div className="overscroll-fix">
        <Header title="Assembly Detail" showBack />
        <div className="text-center py-12 text-text-muted">Assembly not found</div>
      </div>
    )
  }

  const template = assembly.template as Record<string, unknown> | null
  const producedBy = assembly.producedBy as Record<string, unknown>
  const approvedBy = assembly.approvedBy as Record<string, unknown> | null
  const startedBy = assembly.startedBy as Record<string, unknown> | null
  const components = assembly.components as Array<Record<string, unknown>>
  const changeLog = assembly.changeLog as Array<Record<string, unknown>>
  const specs = assembly.specs as Record<string, unknown> | null

  const name = assembly.jobName
    ? String(assembly.jobName)
    : template?.name || `Custom ${typeLabels[assembly.type] || assembly.type}`
  const status = assembly.status as string
  const isDoor = assembly.type === "DOOR"

  // Check if specs has the new door sheet format (has doorCategory)
  const hasNewDoorSpecs = isDoor && specs && "doorCategory" in specs

  const canApprove = me && ["ADMIN", "SALES_MANAGER"].includes(me.role) &&
    assembly.approvalStatus === "PENDING"
  const canStartBuild = ["APPROVED", "PLANNED"].includes(status) &&
    assembly.approvalStatus !== "PENDING"
  const canComplete = status === "IN_PRODUCTION"
  const canShip = status === "COMPLETED" || status === "ALLOCATED"

  async function handleApprove() {
    try {
      await updateAssembly.mutateAsync({
        id,
        approvalStatus: "APPROVED",
        approvalNotes: approvalNotes.trim() || null,
      })
      toast.success("Assembly approved")
      celebrate()
      setApprovalNotes("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve")
    }
  }

  async function handleReject() {
    if (!approvalNotes.trim()) {
      toast.error("Please add a note explaining the rejection")
      return
    }
    try {
      await updateAssembly.mutateAsync({
        id,
        approvalStatus: "REJECTED",
        approvalNotes: approvalNotes.trim(),
      })
      toast.success("Assembly rejected")
      setApprovalNotes("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject")
    }
  }

  async function handleStartBuild() {
    try {
      await updateAssembly.mutateAsync({ id, status: "IN_PRODUCTION" })
      toast.success("Build started — materials deducted from inventory")
      celebrate()
      setShowStartBuildModal(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start build")
    }
  }

  async function handleComplete() {
    try {
      await updateAssembly.mutateAsync({ id, status: "COMPLETED" })
      toast.success("Build completed — finished good added to inventory")
      celebrate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete")
    }
  }

  async function handleShip() {
    try {
      await updateAssembly.mutateAsync({ id, status: "SHIPPED" })
      toast.success("Marked as shipped")
      celebrate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    }
  }

  return (
    <div className="overscroll-fix">
      <Header title={name as string} showBack />

      <div className="p-4 space-y-4">
        {/* Status + Info */}
        <Card className="p-5 rounded-xl border-border-custom space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const TypeIcon = typeIcons[assembly.type] || Layers
                return (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-blue/10">
                    <TypeIcon className="h-4 w-4 text-brand-blue" />
                  </div>
                )
              })()}
              <h3 className="font-semibold text-navy">
                {typeLabels[assembly.type] || assembly.type}
              </h3>
            </div>
            <Badge className={cn("text-xs px-2 py-0.5", statusColors[status])}>
              {statusLabels[status] || status}
            </Badge>
          </div>

          {/* Job info — prominent display */}
          {assembly.jobName && (
            <div>
              <p className="text-base font-bold text-navy">{assembly.jobName}</p>
              {assembly.jobNumber && (
                <p className="text-xs text-brand-blue font-medium">Job #{String(assembly.jobNumber)}</p>
              )}
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <User className="h-4 w-4 text-text-muted" />
              <span>Created by {producedBy.name as string}</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar className="h-4 w-4 text-text-muted" />
              <span>{new Date(assembly.createdAt).toLocaleDateString()}</span>
            </div>
            {approvedBy && (
              <div className="flex items-center gap-2 text-text-secondary">
                <CheckCircle className="h-4 w-4 text-status-green" />
                <span>
                  Approved by {approvedBy.name as string}
                  {assembly.approvedAt && ` on ${new Date(assembly.approvedAt).toLocaleDateString()}`}
                </span>
              </div>
            )}
            {startedBy && (
              <div className="flex items-center gap-2 text-text-secondary">
                <Hammer className="h-4 w-4 text-brand-orange" />
                <span>
                  Started by {startedBy.name as string}
                  {assembly.startedAt && ` on ${new Date(assembly.startedAt).toLocaleDateString()}`}
                </span>
              </div>
            )}
            {assembly.completedAt && (
              <div className="flex items-center gap-2 text-text-secondary">
                <Package className="h-4 w-4 text-status-green" />
                <span>Completed on {new Date(assembly.completedAt).toLocaleDateString()}</span>
              </div>
            )}
            {Number(assembly.batchSize) > 1 && (
              <p className="text-text-secondary">Quantity: {assembly.batchSize}</p>
            )}
          </div>

          {assembly.notes && (
            <p className="text-sm text-text-secondary bg-surface-secondary p-3 rounded-xl">
              {assembly.notes}
            </p>
          )}
          {assembly.approvalNotes && (
            <p className="text-sm text-text-secondary bg-status-yellow/10 p-3 rounded-xl border border-status-yellow/30">
              Approval note: {assembly.approvalNotes}
            </p>
          )}
        </Card>

        {/* Lifecycle Tracker */}
        <StepProgress
          steps={LIFECYCLE_STEPS}
          currentStep={getLifecycleStep(status)}
        />

        {/* Panel/Ramp Specs (non-door assemblies with specs) */}
        {!isDoor && specs && Object.keys(specs).length > 0 && (() => {
          const s = (key: string) => specs[key] ? String(specs[key]) : ""
          const specRows: [string, string][] = [
            ["Width", s("width") ? formatSpecDim(s("width")) : ""],
            ["Length", s("length") ? formatSpecDim(s("length")) : ""],
            ["Height", s("height") ? `${s("height")}"` : ""],
            ["Bottom Lip", s("bottomLip") ? `${s("bottomLip")}"` : ""],
            ["Top Lip", s("topLip") ? `${s("topLip")}"` : ""],
            ["Insulation", s("insulation")],
            ["Thickness", s("insulationThickness") ? `${s("insulationThickness")}"` : ""],
            ["Side 1", s("side1Material") !== "None" ? s("side1Material") : ""],
            ["Side 2", s("side2Material") !== "None" ? s("side2Material") : ""],
            ["Diamond Plate", s("diamondPlateThickness") ? `${s("diamondPlateThickness")}"` : ""],
          ].filter(([, val]) => !!val) as [string, string][]

          return (
            <Card className="p-5 rounded-xl border-border-custom space-y-2">
              <h3 className="font-semibold text-navy text-sm">Specifications</h3>
              <div className="space-y-1.5 text-sm">
                {specRows.map(([label, value], i) => (
                  <div key={label} className={cn("flex items-center justify-between py-1", i < specRows.length - 1 && "border-b border-border-custom/30")}>
                    <span className="text-text-secondary">{label}</span>
                    <span className="font-semibold text-navy">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )
        })()}

        {/* Door Sheet — New Format (Spec Sheet / Manufacturing Sheet toggle) */}
        {isDoor && hasNewDoorSpecs && (
          <>
            {/* View toggle */}
            <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
              <button
                onClick={() => setSheetView("manufacturing")}
                className={cn(
                  "flex-1 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                  sheetView === "manufacturing"
                    ? "bg-white text-navy shadow-brand"
                    : "text-text-muted"
                )}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Manufacturing Sheet
              </button>
              <button
                onClick={() => setSheetView("spec")}
                className={cn(
                  "flex-1 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                  sheetView === "spec"
                    ? "bg-white text-navy shadow-brand"
                    : "text-text-muted"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                Full Spec Sheet
              </button>
            </div>

            {sheetView === "manufacturing" ? (
              <DoorManufacturingSheet
                specs={specs as Partial<DoorSpecs>}
                createdAt={assembly.createdAt}
                onToggleView={() => setSheetView("spec")}
              />
            ) : (
              <DoorSpecSheet
                specs={specs as Partial<DoorSpecs>}
                approvedBy={approvedBy?.name as string | undefined}
                approvedAt={assembly.approvedAt as string | undefined}
                approvalStatus={assembly.approvalStatus as string}
              />
            )}
          </>
        )}

        {/* Door Sheet — Old Format (backward compatibility) */}
        {isDoor && specs && !hasNewDoorSpecs && Object.keys(specs).length > 0 && (
          <Card className="p-5 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Door Sheet Specifications</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["width", "height", "doorType", "hardware", "insulation", "finish"] as const).map(
                (field) =>
                  specs[field] ? (
                    <div key={field}>
                      <p className="text-xs text-text-secondary">
                        {getDoorFieldLabel(field)}
                      </p>
                      <p className="text-sm font-medium">{String(specs[field])}</p>
                    </div>
                  ) : null
              )}
              {specs.specialNotes ? (
                <div className="col-span-2">
                  <p className="text-xs text-text-secondary">Special Notes</p>
                  <p className="text-sm font-medium">{String(specs.specialNotes)}</p>
                </div>
              ) : null}
            </div>
          </Card>
        )}

        {/* Components */}
        <Card className="p-5 rounded-xl border-border-custom space-y-2">
          <h3 className="font-semibold text-navy">
            Components ({components.length})
          </h3>
          {components.map((comp) => {
            const product = comp.product as Record<string, unknown>
            const category = product.category as Record<string, unknown> | null
            const qtyUsed = Number(comp.qtyUsed)
            const currentQty = Number(product.currentQty)
            const hasEnough = currentQty >= qtyUsed
            const isEditable = ["PLANNED", "APPROVED"].includes(status)

            const row = (
              <div
                key={comp.id as string}
                className="py-2 border-b border-border-custom/40 last:border-0 bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">
                      {product.name as string}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {category && (
                        <span className="text-xs text-text-muted">{category.name as string}</span>
                      )}
                      {status !== "COMPLETED" && status !== "SHIPPED" && (
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              hasEnough ? "bg-status-green" : "bg-status-red"
                            )}
                          />
                          <span className={cn("text-xs", hasEnough ? "text-status-green" : "text-status-red")}>
                            {formatQuantity(currentQty)} avail
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatQuantity(qtyUsed)}
                    </p>
                    <p className="text-xs text-text-muted">{product.unitOfMeasure as string}</p>
                  </div>
                </div>
              </div>
            )

            return isEditable ? (
              <SwipeToDelete key={comp.id as string} onDelete={() => { /* TODO: delete component API */ }}>
                {row}
              </SwipeToDelete>
            ) : (
              <div key={comp.id as string}>{row}</div>
            )
          })}
          {assembly.cost && (
            <div className="pt-2 flex justify-between border-t border-border-custom">
              <span className="text-sm font-medium text-text-secondary">Total Cost</span>
              <span className="text-sm font-bold text-navy">
                ${Number(assembly.cost).toFixed(2)}
              </span>
            </div>
          )}
        </Card>

        {/* Change Log */}
        {changeLog.length > 0 && (
          <Card className="p-5 rounded-xl border-border-custom space-y-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-text-muted" />
              <h3 className="font-semibold text-navy text-sm">Change History</h3>
            </div>
            {changeLog.map((entry) => {
              const changedBy = entry.changedBy as Record<string, unknown>
              return (
                <div key={entry.id as string} className="text-xs py-1.5 border-b border-border-custom/40 last:border-0">
                  <p className="text-text-primary">
                    <span className="font-medium">{getDoorFieldLabel(String(entry.fieldName))}</span>:
                    {entry.oldValue ? <span className="text-status-red/70 line-through ml-1">{String(entry.oldValue)}</span> : null}
                    <span className="text-status-green ml-1">{String(entry.newValue)}</span>
                  </p>
                  <p className="text-text-muted mt-0.5">
                    {String(changedBy.name)} — {new Date(String(entry.createdAt)).toLocaleString()}
                    {entry.reason ? ` — ${String(entry.reason)}` : null}
                  </p>
                </div>
              )
            })}
          </Card>
        )}

        {/* Approval actions */}
        {canApprove && (
          <Card className="p-5 rounded-xl border-yellow-300 border-2 space-y-3">
            <h3 className="font-semibold text-navy">Approval Required</h3>
            <Input
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Optional approval note..."
              className="h-10"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={updateAssembly.isPending}
                className="flex-1 h-12 bg-status-green hover:bg-status-green/90 text-white font-semibold"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Approve
              </Button>
              <Button
                onClick={handleReject}
                disabled={updateAssembly.isPending}
                variant="outline"
                className="flex-1 h-12 text-status-red border-status-red/30"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
            </div>
          </Card>
        )}

        {/* Production actions */}
        <div className="space-y-2">
          {canStartBuild && (
            <Button
              onClick={() => setShowStartBuildModal(true)}
              disabled={updateAssembly.isPending}
              className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl shadow-[0_2px_8px_rgba(232,121,43,0.25)]"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Build
            </Button>
          )}

          {canComplete && (
            <Button
              onClick={handleComplete}
              disabled={updateAssembly.isPending}
              className="w-full h-14 bg-status-green hover:bg-status-green/90 text-white font-semibold text-base rounded-xl shadow-[0_2px_8px_rgba(34,197,94,0.25)]"
            >
              <Package className="h-5 w-5 mr-2" />
              {updateAssembly.isPending ? "Completing..." : "Complete Build"}
            </Button>
          )}

          {canShip && (
            <Button
              onClick={handleShip}
              disabled={updateAssembly.isPending}
              className="w-full h-14 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-base rounded-xl shadow-[0_2px_8px_rgba(46,125,186,0.25)]"
            >
              <Truck className="h-5 w-5 mr-2" />
              {updateAssembly.isPending ? "Shipping..." : "Mark as Shipped"}
            </Button>
          )}
        </div>
      </div>

      {/* Start Build Confirmation Modal */}
      <StartBuildModal
        open={showStartBuildModal}
        onOpenChange={setShowStartBuildModal}
        onConfirm={handleStartBuild}
        assemblyName={name as string}
        components={components as Array<{
          id: string
          product: { name: string; unitOfMeasure: string; currentQty: number }
          qtyUsed: number | string
        }>}
        isPending={updateAssembly.isPending}
      />

      {/* Delete Assembly — ADMIN only, before production */}
      {canDeleteAssembly && (
        <div className="px-4 pb-4">
          <Button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            className="w-full h-12 border-2 border-status-red/30 text-status-red hover:bg-status-red/5 font-semibold"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete Assembly
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-navy">Delete Assembly?</DialogTitle>
            <DialogDescription className="text-text-secondary">
              This will permanently delete this {typeLabels[assembly.type] || assembly.type}{assembly.jobName ? ` for ${assembly.jobName}` : ""}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 h-12">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleDeleteAssembly}
              disabled={deleteAssembly.isPending}
              className="flex-1 h-12 bg-status-red hover:bg-status-red/90 text-white font-semibold"
            >
              {deleteAssembly.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Format inches to feet'inches" for panel spec display
function formatSpecDim(inches: string): string {
  const val = parseFloat(inches)
  if (!val) return `${inches}"`
  const ft = Math.floor(val / 12)
  const rem = val % 12
  if (ft === 0) return `${rem}"`
  if (rem === 0) return `${ft}'`
  return `${ft}'${rem}"`
}
