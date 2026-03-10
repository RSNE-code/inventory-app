"use client"

import { use, useState } from "react"
import { useAssembly, useUpdateAssembly } from "@/hooks/use-assemblies"
import { useMe } from "@/hooks/use-me"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DoorSpecSheet } from "@/components/doors/door-spec-sheet"
import { DoorManufacturingSheet } from "@/components/doors/door-manufacturing-sheet"
import { cn, formatQuantity } from "@/lib/utils"
import { toast } from "sonner"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import type { DoorSpecs } from "@/lib/door-specs"
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
} from "lucide-react"

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

// Roles that default to manufacturing sheet view
const SHOP_ROLES = ["DOOR_SHOP", "SHOP_FOREMAN", "CREW"]

export default function AssemblyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useAssembly(id)
  const { data: meData } = useMe()
  const updateAssembly = useUpdateAssembly()
  const me = meData?.data

  const [approvalNotes, setApprovalNotes] = useState("")

  // Door sheet view toggle
  const isShopRole = me && SHOP_ROLES.includes(me.role)
  const [sheetView, setSheetView] = useState<"spec" | "manufacturing">(
    isShopRole ? "manufacturing" : "spec"
  )

  const assembly = data?.data

  if (isLoading) {
    return (
      <div>
        <Header title="Assembly Detail" showBack />
        <div className="text-center py-12 text-text-muted">Loading...</div>
      </div>
    )
  }

  if (!assembly) {
    return (
      <div>
        <Header title="Assembly Detail" showBack />
        <div className="text-center py-12 text-text-muted">Assembly not found</div>
      </div>
    )
  }

  const template = assembly.template as Record<string, unknown> | null
  const producedBy = assembly.producedBy as Record<string, unknown>
  const approvedBy = assembly.approvedBy as Record<string, unknown> | null
  const components = assembly.components as Array<Record<string, unknown>>
  const changeLog = assembly.changeLog as Array<Record<string, unknown>>
  const specs = assembly.specs as Record<string, unknown> | null

  const name = template?.name || `Custom ${typeLabels[assembly.type] || assembly.type}`
  const status = assembly.status as string
  const isDoor = assembly.type === "DOOR"

  // Check if specs has the new door sheet format (has doorCategory)
  const hasNewDoorSpecs = isDoor && specs && "doorCategory" in specs

  const canApprove = me && ["ADMIN", "SALES_MANAGER"].includes(me.role) &&
    assembly.approvalStatus === "PENDING"
  const canStartBuild = ["APPROVED", "PLANNED"].includes(status) &&
    assembly.approvalStatus !== "PENDING"
  const canComplete = status === "IN_PRODUCTION"
  const canShip = status === "COMPLETED"

  async function handleApprove() {
    try {
      await updateAssembly.mutateAsync({
        id,
        approvalStatus: "APPROVED",
        approvalNotes: approvalNotes.trim() || null,
      })
      toast.success("Assembly approved")
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start build")
    }
  }

  async function handleComplete() {
    try {
      await updateAssembly.mutateAsync({ id, status: "COMPLETED" })
      toast.success("Build completed — finished good added to inventory")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete")
    }
  }

  async function handleShip() {
    try {
      await updateAssembly.mutateAsync({ id, status: "SHIPPED" })
      toast.success("Marked as shipped")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    }
  }

  return (
    <div>
      <Header title={name as string} showBack />
      <Breadcrumb items={[
        { label: "Assemblies", href: "/assemblies" },
        { label: name as string },
      ]} />

      <div className="p-4 space-y-4">
        {/* Status + Info */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-navy">
              {typeLabels[assembly.type] || assembly.type}
            </h3>
            <Badge className={cn("text-xs px-2 py-0.5", statusColors[status])}>
              {statusLabels[status] || status}
            </Badge>
          </div>

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
            {assembly.jobName && (
              <p className="text-brand-blue font-medium">Job: {assembly.jobName}</p>
            )}
            {Number(assembly.batchSize) > 1 && (
              <p className="text-gray-600">Batch size: {assembly.batchSize}</p>
            )}
          </div>

          {assembly.notes && (
            <p className="text-sm text-text-secondary bg-surface-secondary p-3 rounded-lg">
              {assembly.notes}
            </p>
          )}
          {assembly.approvalNotes && (
            <p className="text-sm text-text-secondary bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              Approval note: {assembly.approvalNotes}
            </p>
          )}
        </Card>

        {/* Door Sheet — New Format (Spec Sheet / Manufacturing Sheet toggle) */}
        {isDoor && hasNewDoorSpecs && (
          <>
            {/* View toggle */}
            <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
              <button
                onClick={() => setSheetView("manufacturing")}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                  sheetView === "manufacturing"
                    ? "bg-white text-navy shadow-sm"
                    : "text-text-muted"
                )}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Manufacturing Sheet
              </button>
              <button
                onClick={() => setSheetView("spec")}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                  sheetView === "spec"
                    ? "bg-white text-navy shadow-sm"
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
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Door Sheet Specifications</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["width", "height", "doorType", "hardware", "insulation", "finish"] as const).map(
                (field) =>
                  specs[field] ? (
                    <div key={field}>
                      <p className="text-xs text-gray-500">
                        {field === "doorType" ? "Type" : field.charAt(0).toUpperCase() + field.slice(1)}
                      </p>
                      <p className="text-sm font-medium">{String(specs[field])}</p>
                    </div>
                  ) : null
              )}
              {specs.specialNotes ? (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Special Notes</p>
                  <p className="text-sm font-medium">{String(specs.specialNotes)}</p>
                </div>
              ) : null}
            </div>
          </Card>
        )}

        {/* Components */}
        <Card className="p-4 rounded-xl border-border-custom space-y-2">
          <h3 className="font-semibold text-navy">
            Components ({components.length})
          </h3>
          {components.map((comp) => {
            const product = comp.product as Record<string, unknown>
            const category = product.category as Record<string, unknown> | null
            const qtyUsed = Number(comp.qtyUsed)
            const currentQty = Number(product.currentQty)
            const hasEnough = currentQty >= qtyUsed

            return (
              <div
                key={comp.id as string}
                className="py-2 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name as string}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {category && (
                        <span className="text-xs text-gray-400">{category.name as string}</span>
                      )}
                      {status !== "COMPLETED" && status !== "SHIPPED" && (
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              hasEnough ? "bg-green-500" : "bg-red-500"
                            )}
                          />
                          <span className={cn("text-xs", hasEnough ? "text-green-600" : "text-red-500")}>
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
                    <p className="text-xs text-gray-400">{product.unitOfMeasure as string}</p>
                  </div>
                </div>
              </div>
            )
          })}
          {assembly.cost && (
            <div className="pt-2 flex justify-between border-t border-gray-200">
              <span className="text-sm font-medium text-gray-600">Total Cost</span>
              <span className="text-sm font-bold text-navy">
                ${Number(assembly.cost).toFixed(2)}
              </span>
            </div>
          )}
        </Card>

        {/* Change Log */}
        {changeLog.length > 0 && (
          <Card className="p-4 rounded-xl border-border-custom space-y-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-gray-400" />
              <h3 className="font-semibold text-navy text-sm">Change History</h3>
            </div>
            {changeLog.map((entry) => {
              const changedBy = entry.changedBy as Record<string, unknown>
              return (
                <div key={entry.id as string} className="text-xs py-1.5 border-b border-gray-50 last:border-0">
                  <p className="text-gray-700">
                    <span className="font-medium">{String(entry.fieldName)}</span>:
                    {entry.oldValue ? <span className="text-red-400 line-through ml-1">{String(entry.oldValue)}</span> : null}
                    <span className="text-green-600 ml-1">{String(entry.newValue)}</span>
                  </p>
                  <p className="text-gray-400 mt-0.5">
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
          <Card className="p-4 rounded-xl border-yellow-300 border-2 space-y-3">
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
              onClick={handleStartBuild}
              disabled={updateAssembly.isPending}
              className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
            >
              <Play className="h-5 w-5 mr-2" />
              {updateAssembly.isPending ? "Starting..." : "Start Build"}
            </Button>
          )}

          {canComplete && (
            <Button
              onClick={handleComplete}
              disabled={updateAssembly.isPending}
              className="w-full h-14 bg-status-green hover:bg-status-green/90 text-white font-semibold text-base rounded-xl"
            >
              <Package className="h-5 w-5 mr-2" />
              {updateAssembly.isPending ? "Completing..." : "Complete Build"}
            </Button>
          )}

          {canShip && (
            <Button
              onClick={handleShip}
              disabled={updateAssembly.isPending}
              className="w-full h-14 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-base rounded-xl"
            >
              <Truck className="h-5 w-5 mr-2" />
              {updateAssembly.isPending ? "Shipping..." : "Mark as Shipped"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
