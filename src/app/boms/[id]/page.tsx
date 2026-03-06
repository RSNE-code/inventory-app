"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { useBom, useUpdateBom } from "@/hooks/use-boms"
import { useMe } from "@/hooks/use-me"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BomStatusBadge } from "@/components/bom/bom-status-badge"
import { BomLineItemRow } from "@/components/bom/bom-line-item-row"
import { ProductPicker } from "@/components/bom/product-picker"
import { toast } from "sonner"
import { Calendar, User, Pencil } from "lucide-react"

export default function BomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading } = useBom(id)
  const { data: meData } = useMe()
  const updateBom = useUpdateBom()
  const bom = data?.data
  const me = meData?.data

  const [editing, setEditing] = useState(false)
  const [pendingQtyChanges, setPendingQtyChanges] = useState<Record<string, number>>({})
  const [pendingRemovals, setPendingRemovals] = useState<string[]>([])

  const isCreator = me && bom && me.id === bom.createdById
  const canEdit = isCreator && bom?.status === "DRAFT"

  async function handleStatusChange(status: string) {
    try {
      await updateBom.mutateAsync({ id, status })
      toast.success(
        status === "APPROVED"
          ? "BOM approved"
          : status === "CANCELLED"
          ? "BOM cancelled"
          : status === "COMPLETED"
          ? "BOM completed"
          : "Status updated"
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  async function handleSaveEdits() {
    const updateLineItems = Object.entries(pendingQtyChanges).map(([lineId, qty]) => ({
      id: lineId,
      qtyNeeded: qty,
    }))

    try {
      await updateBom.mutateAsync({
        id,
        removeLineItemIds: pendingRemovals.length > 0 ? pendingRemovals : undefined,
        updateLineItems: updateLineItems.length > 0 ? updateLineItems : undefined,
      })
      toast.success("BOM updated")
      setEditing(false)
      setPendingQtyChanges({})
      setPendingRemovals([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes")
    }
  }

  async function handleAddProduct(product: { id: string; name: string; sku: string | null; unitOfMeasure: string; currentQty: number; pieceSize?: number | null; pieceUnit?: string | null }) {
    try {
      await updateBom.mutateAsync({
        id,
        addLineItems: [{
          productId: product.id,
          tier: "TIER_1",
          qtyNeeded: 1,
        }],
      })
      toast.success(`Added ${product.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item")
    }
  }

  function handleCancelEdits() {
    setEditing(false)
    setPendingQtyChanges({})
    setPendingRemovals([])
  }

  if (isLoading) {
    return (
      <div>
        <Header title="BOM Detail" showBack />
        <div className="text-center py-12 text-text-muted">Loading...</div>
      </div>
    )
  }

  if (!bom) {
    return (
      <div>
        <Header title="BOM Detail" showBack />
        <div className="text-center py-12 text-text-muted">BOM not found</div>
      </div>
    )
  }

  const visibleItems = (bom.lineItems as Record<string, unknown>[]).filter(
    (item) => !pendingRemovals.includes(item.id as string)
  )

  const existingProductIds = visibleItems
    .filter((item) => !(item.isNonCatalog as boolean) && item.product)
    .map((item) => (item.product as Record<string, unknown>).id as string)

  const hasPendingChanges = Object.keys(pendingQtyChanges).length > 0 || pendingRemovals.length > 0

  return (
    <div>
      <Header title={bom.jobName} showBack />

      <div className="p-4 space-y-4">
        {/* Status + Job Info */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-navy">Job Details</h3>
            <BomStatusBadge status={bom.status} />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <User className="h-4 w-4 text-text-muted" />
              <span>Created by {bom.createdBy.name}</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar className="h-4 w-4 text-text-muted" />
              <span>{new Date(bom.createdAt).toLocaleDateString()}</span>
            </div>
            {bom.approvedBy && (
              <div className="flex items-center gap-2 text-text-secondary">
                <User className="h-4 w-4 text-status-green" />
                <span>Approved by {bom.approvedBy.name} on {new Date(bom.approvedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {bom.notes && (
            <p className="text-sm text-text-secondary bg-surface-secondary p-3 rounded-lg">{bom.notes}</p>
          )}
        </Card>

        {/* Line Items */}
        <Card className="p-4 rounded-xl border-border-custom">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-navy">
              Items ({visibleItems.length})
            </h3>
            {canEdit && !editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                className="text-brand-blue"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>

          {editing && (
            <div className="mb-3">
              <ProductPicker
                onSelect={handleAddProduct}
                placeholder="Search catalog to add items..."
                excludeIds={existingProductIds}
              />
            </div>
          )}

          {visibleItems.map((item) => {
            const product = item.product as Record<string, unknown> | null
            const lineId = item.id as string
            const originalQty = Number(item.qtyNeeded)
            const displayQty = pendingQtyChanges[lineId] ?? originalQty

            return (
              <BomLineItemRow
                key={lineId}
                name={
                  (item.isNonCatalog as boolean)
                    ? (item.nonCatalogName as string) || "Non-catalog item"
                    : (product?.name as string) || "Unknown"
                }
                sku={product?.sku as string | null}
                unitOfMeasure={
                  (item.isNonCatalog as boolean)
                    ? (item.nonCatalogUom as string) || ""
                    : (product?.unitOfMeasure as string) || ""
                }
                pieceSize={product?.pieceSize ? Number(product.pieceSize) : null}
                pieceUnit={product?.pieceUnit as string | null}
                tier={item.tier as string}
                qtyNeeded={displayQty}
                isNonCatalog={item.isNonCatalog as boolean}
                nonCatalogCategory={item.nonCatalogCategory as string | null}
                qtyCheckedOut={Number(item.qtyCheckedOut || 0)}
                qtyReturned={Number(item.qtyReturned || 0)}
                editable={editing}
                onQtyChange={(qty) =>
                  setPendingQtyChanges((prev) => ({ ...prev, [lineId]: qty }))
                }
                onRemove={() =>
                  setPendingRemovals((prev) => [...prev, lineId])
                }
              />
            )
          })}
        </Card>

        {/* Edit Save/Cancel */}
        {editing && (
          <div className="flex gap-2">
            <Button
              onClick={handleSaveEdits}
              disabled={updateBom.isPending || !hasPendingChanges}
              className="flex-1 h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
            >
              {updateBom.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              onClick={handleCancelEdits}
              variant="outline"
              className="h-12"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Actions */}
        {!editing && (
          <div className="space-y-2">
            {bom.status === "DRAFT" && (
              <>
                <Button
                  onClick={() => handleStatusChange("APPROVED")}
                  disabled={updateBom.isPending}
                  className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
                >
                  Approve BOM
                </Button>
                <Button
                  onClick={() => handleStatusChange("CANCELLED")}
                  disabled={updateBom.isPending}
                  variant="outline"
                  className="w-full h-12 text-status-red border-status-red/30 hover:bg-status-red/5"
                >
                  Cancel BOM
                </Button>
              </>
            )}

            {bom.status === "APPROVED" && (
              <p className="text-center text-sm text-text-muted py-4">
                Ready for checkout (coming soon)
              </p>
            )}

            {bom.status === "IN_PROGRESS" && (
              <Button
                onClick={() => handleStatusChange("COMPLETED")}
                disabled={updateBom.isPending}
                className="w-full h-12 bg-status-green hover:bg-status-green/90 text-white font-semibold"
              >
                Mark Completed
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
