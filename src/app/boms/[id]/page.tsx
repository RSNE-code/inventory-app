"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useBom, useUpdateBom } from "@/hooks/use-boms"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BomStatusBadge } from "@/components/bom/bom-status-badge"
import { BomLineItemRow } from "@/components/bom/bom-line-item-row"
import { toast } from "sonner"
import { Calendar, User } from "lucide-react"

export default function BomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading } = useBom(id)
  const updateBom = useUpdateBom()
  const bom = data?.data

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
          <h3 className="font-semibold text-navy mb-2">
            Items ({bom.lineItems.length})
          </h3>
          {bom.lineItems.map((item: Record<string, unknown>) => {
            const product = item.product as Record<string, unknown> | null
            return (
              <BomLineItemRow
                key={item.id as string}
                name={
                  (item.isNonCatalog as boolean)
                    ? (item.nonCatalogName as string) || "Non-catalog item"
                    : product?.name as string || "Unknown"
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
                qtyNeeded={Number(item.qtyNeeded)}
                isNonCatalog={item.isNonCatalog as boolean}
                nonCatalogCategory={item.nonCatalogCategory as string | null}
                qtyCheckedOut={Number(item.qtyCheckedOut || 0)}
                qtyReturned={Number(item.qtyReturned || 0)}
              />
            )
          })}
        </Card>

        {/* Actions */}
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
      </div>
    </div>
  )
}
