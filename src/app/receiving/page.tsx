"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SupplierPicker } from "@/components/receiving/supplier-picker"
import { POPicker, type PurchaseOrderOption } from "@/components/receiving/po-picker"
import { ProductPicker } from "@/components/bom/product-picker"
import { ReceiptLineRow } from "@/components/receiving/receipt-line-row"
import { useCreateReceipt } from "@/hooks/use-receiving"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { PackageCheck } from "lucide-react"

interface ReceiptLine {
  tempId: string
  productId: string
  productName: string
  unitOfMeasure: string
  quantity: number
  unitCost: number
  poLineItemId?: string | null
  qtyOrdered?: number
  qtyPreviouslyReceived?: number
}

export default function ReceivingPage() {
  const createReceipt = useCreateReceipt()

  const [supplierId, setSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderOption | null>(null)
  const [poSkipped, setPoSkipped] = useState(false)
  const [lines, setLines] = useState<ReceiptLine[]>([])
  const [notes, setNotes] = useState("")

  function handleSupplierSelect(supplier: { id: string; name: string }) {
    setSupplierId(supplier.id)
    setSupplierName(supplier.name)
    // Reset PO state when supplier changes
    setSelectedPO(null)
    setPoSkipped(false)
    setLines([])
  }

  function handlePOSelect(po: PurchaseOrderOption) {
    setSelectedPO(po)
    // Pre-populate lines from PO items that still need receiving
    const poLines: ReceiptLine[] = po.lineItems
      .filter((li) => Number(li.qtyOrdered) > Number(li.qtyReceived))
      .map((li) => ({
        tempId: crypto.randomUUID(),
        productId: li.product.id,
        productName: li.product.name,
        unitOfMeasure: li.product.unitOfMeasure,
        quantity: Number(li.qtyOrdered) - Number(li.qtyReceived),
        unitCost: Number(li.unitCost),
        poLineItemId: li.id,
        qtyOrdered: Number(li.qtyOrdered),
        qtyPreviouslyReceived: Number(li.qtyReceived),
      }))
    setLines(poLines)
  }

  function handlePOSkip() {
    setSelectedPO(null)
    setPoSkipped(true)
    setLines([])
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
        quantity: 1,
        unitCost: 0,
      },
    ])
  }

  const totalCost = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)
  const excludeIds = lines.map((l) => l.productId)
  const canSubmit =
    supplierId && lines.length > 0 && lines.every((l) => l.quantity > 0 && l.unitCost >= 0)

  const showItemsSection = supplierId && (selectedPO || poSkipped)

  async function handleSubmit() {
    if (!canSubmit) return

    try {
      await createReceipt.mutateAsync({
        supplierId,
        purchaseOrderId: selectedPO?.id || null,
        notes: notes.trim() || null,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitCost: l.unitCost,
          poLineItemId: l.poLineItemId || null,
        })),
      })
      toast.success(
        `Received ${lines.length} item${lines.length !== 1 ? "s" : ""} from ${supplierName}${selectedPO ? ` (PO #${selectedPO.poNumber})` : ""}`
      )
      // Reset form
      setSupplierId("")
      setSupplierName("")
      setSelectedPO(null)
      setPoSkipped(false)
      setLines([])
      setNotes("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log receipt")
    }
  }

  return (
    <div>
      <Header title="Receive Material" showBack />

      <div className="p-4 space-y-4">
        {/* Supplier */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <h3 className="font-semibold text-navy">Supplier</h3>
          <SupplierPicker
            onSelect={handleSupplierSelect}
            selectedName={supplierName || undefined}
          />
        </Card>

        {/* PO Matching */}
        {supplierId && !selectedPO && !poSkipped && (
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Purchase Order</h3>
            <POPicker
              supplierId={supplierId}
              onSelect={handlePOSelect}
              onSkip={handlePOSkip}
            />
          </Card>
        )}

        {/* Selected PO indicator */}
        {selectedPO && (
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Purchase Order</h3>
            <POPicker
              supplierId={supplierId}
              onSelect={handlePOSelect}
              onSkip={handlePOSkip}
              selectedPoNumber={selectedPO.poNumber}
            />
          </Card>
        )}

        {/* Items */}
        {showItemsSection && (
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Items ({lines.length})</h3>

            {!selectedPO && (
              <ProductPicker
                onSelect={handleProductSelect}
                placeholder="Search catalog to add items..."
                excludeIds={excludeIds}
              />
            )}

            {lines.length > 0 && (
              <div>
                {lines.map((line) => (
                  <div key={line.tempId}>
                    {line.poLineItemId && (
                      <div className="flex items-center gap-2 pt-2 text-xs text-text-muted">
                        <span>
                          PO: {line.qtyOrdered} ordered
                          {(line.qtyPreviouslyReceived ?? 0) > 0 &&
                            `, ${line.qtyPreviouslyReceived} previously received`}
                        </span>
                      </div>
                    )}
                    <ReceiptLineRow
                      productName={line.productName}
                      unitOfMeasure={line.unitOfMeasure}
                      quantity={line.quantity}
                      unitCost={line.unitCost}
                      onQuantityChange={(qty) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.tempId === line.tempId ? { ...l, quantity: qty } : l
                          )
                        )
                      }
                      onCostChange={(cost) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.tempId === line.tempId ? { ...l, unitCost: cost } : l
                          )
                        )
                      }
                      onRemove={() =>
                        setLines((prev) => prev.filter((l) => l.tempId !== line.tempId))
                      }
                    />
                  </div>
                ))}

                {/* Allow adding extra items even with a PO */}
                {selectedPO && (
                  <div className="pt-3 mt-2 border-t border-border-custom">
                    <p className="text-xs text-text-muted mb-2">Add extra items not on the PO:</p>
                    <ProductPicker
                      onSelect={handleProductSelect}
                      placeholder="Search catalog..."
                      excludeIds={excludeIds}
                    />
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 mt-2 border-t border-border-custom">
                  <span className="text-sm font-medium text-text-secondary">Total Cost</span>
                  <span className="text-lg font-semibold text-navy">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Notes */}
        {showItemsSection && lines.length > 0 && (
          <Card className="p-4 rounded-xl border-border-custom space-y-2">
            <label className="text-sm font-medium text-navy">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional delivery notes..."
              className="w-full rounded-lg border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </Card>
        )}

        {/* Submit */}
        {showItemsSection && lines.length > 0 && (
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createReceipt.isPending}
            className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
          >
            <PackageCheck className="h-5 w-5 mr-2" />
            {createReceipt.isPending
              ? "Processing..."
              : `Confirm Receipt (${lines.length} items)`}
          </Button>
        )}

        {/* Empty state */}
        {!supplierId && (
          <div className="text-center py-8 text-text-muted">
            <PackageCheck className="h-12 w-12 mx-auto mb-3 text-text-muted/50" />
            <p className="text-sm">Select a supplier to start receiving material</p>
          </div>
        )}
      </div>
    </div>
  )
}
