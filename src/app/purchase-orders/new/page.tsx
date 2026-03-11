"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SupplierPicker } from "@/components/receiving/supplier-picker"
import { ProductPicker } from "@/components/bom/product-picker"
import { useCreatePurchaseOrder } from "@/hooks/use-purchase-orders"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { FileText, Trash2 } from "lucide-react"

interface POLine {
  tempId: string
  productId: string
  productName: string
  unitOfMeasure: string
  qtyOrdered: number
  unitCost: number
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const createPO = useCreatePurchaseOrder()

  const [poNumber, setPoNumber] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [expectedDelivery, setExpectedDelivery] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<POLine[]>([])

  function handleSupplierSelect(supplier: { id: string; name: string }) {
    setSupplierId(supplier.id)
    setSupplierName(supplier.name)
  }

  function handleProductSelect(product: {
    id: string
    name: string
    sku: string | null
    unitOfMeasure: string
    currentQty: number
  }) {
    setLines((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        unitOfMeasure: product.unitOfMeasure,
        qtyOrdered: 1,
        unitCost: 0,
      },
    ])
  }

  const totalCost = lines.reduce((sum, l) => sum + l.qtyOrdered * l.unitCost, 0)
  const excludeIds = lines.map((l) => l.productId)
  const canSubmit =
    poNumber.trim() &&
    supplierId &&
    lines.length > 0 &&
    lines.every((l) => l.qtyOrdered > 0 && l.unitCost >= 0)

  async function handleSubmit() {
    if (!canSubmit) return

    try {
      await createPO.mutateAsync({
        poNumber: poNumber.trim(),
        supplierId,
        expectedDelivery: expectedDelivery
          ? new Date(expectedDelivery).toISOString()
          : null,
        notes: notes.trim() || null,
        lineItems: lines.map((l) => ({
          productId: l.productId,
          qtyOrdered: l.qtyOrdered,
          unitCost: l.unitCost,
        })),
      })
      toast.success(`PO #${poNumber.trim()} created`)
      router.push("/purchase-orders")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create PO")
    }
  }

  return (
    <div>
      <Header title="New Purchase Order" showBack />

      <div className="p-4 space-y-4">
        {/* PO Number */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <label className="text-sm font-semibold text-navy">PO Number</label>
          <Input
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            placeholder="e.g. PO-2024-001"
            className="h-12"
          />
        </Card>

        {/* Supplier */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <h3 className="font-semibold text-navy">Supplier</h3>
          <SupplierPicker
            onSelect={handleSupplierSelect}
            selectedName={supplierName || undefined}
          />
        </Card>

        {/* Expected Delivery */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <label className="text-sm font-semibold text-navy">Expected Delivery</label>
          <Input
            type="date"
            value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)}
            className="h-12"
          />
        </Card>

        {/* Line Items */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <h3 className="font-semibold text-navy">Items ({lines.length})</h3>

          <ProductPicker
            onSelect={handleProductSelect}
            placeholder="Search catalog to add items..."
            excludeIds={excludeIds}
          />

          {lines.length > 0 && (
            <div>
              {lines.map((line) => (
                <div key={line.tempId} className="py-3 border-b border-border-custom last:border-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy truncate">
                        {line.productName}
                      </p>
                      <p className="text-xs text-text-muted">{line.unitOfMeasure}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setLines((prev) => prev.filter((l) => l.tempId !== line.tempId))
                      }
                      className="h-8 w-8 text-status-red hover:text-status-red hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-text-muted mb-1 block">Qty Ordered</label>
                      <Input
                        type="number"
                        value={line.qtyOrdered || ""}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.tempId === line.tempId
                                ? { ...l, qtyOrdered: parseFloat(e.target.value) || 0 }
                                : l
                            )
                          )
                        }
                        className="h-10"
                        min={0}
                        step="any"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-text-muted mb-1 block">Unit Cost ($)</label>
                      <Input
                        type="number"
                        value={line.unitCost || ""}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.tempId === line.tempId
                                ? { ...l, unitCost: parseFloat(e.target.value) || 0 }
                                : l
                            )
                          )
                        }
                        className="h-10"
                        min={0}
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-3 mt-2 border-t border-border-custom">
                <span className="text-sm font-medium text-text-secondary">Total Cost</span>
                <span className="text-lg font-semibold text-navy">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Notes */}
        <Card className="p-4 rounded-xl border-border-custom space-y-2">
          <label className="text-sm font-medium text-navy">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            className="w-full rounded-lg border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </Card>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || createPO.isPending}
          className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
        >
          <FileText className="h-5 w-5 mr-2" />
          {createPO.isPending ? "Creating..." : "Create Purchase Order"}
        </Button>
      </div>
    </div>
  )
}
