"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SupplierPicker } from "@/components/receiving/supplier-picker"
import { ProductPicker } from "@/components/bom/product-picker"
import { ReceiptLineRow } from "@/components/receiving/receipt-line-row"
import { ReceivingFlow } from "@/components/receiving/receiving-flow"
import { useCreateReceipt } from "@/hooks/use-receiving"
import { toast } from "sonner"
import { formatCurrency, cn } from "@/lib/utils"
import { PackageCheck } from "lucide-react"
import { Breadcrumb } from "@/components/layout/breadcrumb"

type Tab = "ai" | "manual"

interface ReceiptLine {
  tempId: string
  productId: string
  productName: string
  unitOfMeasure: string
  quantity: number
  unitCost: number
}

export default function ReceivingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ai")

  return (
    <div>
      <Header title="Receive Material" showBack showMenu />
      <Breadcrumb items={[{ label: "Receiving" }]} />

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-4">
        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "ai"
              ? "border-[#E8792B] text-[#E8792B]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          AI Receive
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "manual"
              ? "border-[#E8792B] text-[#E8792B]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Manual Entry
        </button>
      </div>

      <div className="p-4">
        {activeTab === "ai" ? <ReceivingFlow /> : <ManualReceivingForm />}
      </div>
    </div>
  )
}

function ManualReceivingForm() {
  const createReceipt = useCreateReceipt()

  const [supplierId, setSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [lines, setLines] = useState<ReceiptLine[]>([])
  const [notes, setNotes] = useState("")

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
        quantity: 1,
        unitCost: 0,
      },
    ])
  }

  const totalCost = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)
  const excludeIds = lines.map((l) => l.productId)
  const canSubmit =
    supplierId && lines.length > 0 && lines.every((l) => l.quantity > 0 && l.unitCost >= 0)

  async function handleSubmit() {
    if (!canSubmit) return

    try {
      await createReceipt.mutateAsync({
        supplierId,
        notes: notes.trim() || null,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      })
      toast.success(
        `Received ${lines.length} item${lines.length !== 1 ? "s" : ""} from ${supplierName}`
      )
      setSupplierId("")
      setSupplierName("")
      setLines([])
      setNotes("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log receipt")
    }
  }

  return (
    <div className="space-y-4">
      {/* Supplier */}
      <Card className="p-4 rounded-xl border-border-custom space-y-3">
        <h3 className="font-semibold text-navy">Supplier</h3>
        <SupplierPicker
          onSelect={handleSupplierSelect}
          selectedName={supplierName || undefined}
        />
      </Card>

      {/* Items */}
      {supplierId && (
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
                <ReceiptLineRow
                  key={line.tempId}
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
      )}

      {/* Notes */}
      {supplierId && lines.length > 0 && (
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
      {supplierId && lines.length > 0 && (
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
  )
}
