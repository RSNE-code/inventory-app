"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ProductPicker } from "@/components/bom/product-picker"
import { BomLineItemRow } from "@/components/bom/bom-line-item-row"
import { useCreateBom } from "@/hooks/use-boms"
import { toast } from "sonner"
import { Plus } from "lucide-react"

interface LineItem {
  tempId: string
  productId?: string | null
  productName: string
  sku?: string | null
  unitOfMeasure: string
  pieceUnit?: string | null
  dimLength?: number | null
  dimLengthUnit?: string | null
  inputUnit?: string
  tier: "TIER_1" | "TIER_2"
  qtyNeeded: number
  isNonCatalog: boolean
  nonCatalogName?: string | null
  nonCatalogCategory?: string | null
  nonCatalogUom?: string | null
  nonCatalogEstCost?: number | null
}

export default function NewBomPage() {
  const router = useRouter()
  const createBom = useCreateBom()

  const [jobName, setJobName] = useState("")
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [showNonCatalog, setShowNonCatalog] = useState(false)
  const [ncName, setNcName] = useState("")
  const [ncCategory, setNcCategory] = useState("")
  const [ncUom, setNcUom] = useState("")
  const [ncQty, setNcQty] = useState("")
  const [ncCost, setNcCost] = useState("")

  function handleProductSelect(product: { id: string; name: string; sku: string | null; unitOfMeasure: string; currentQty: number; pieceUnit?: string | null; dimLength?: number | null; dimLengthUnit?: string | null }) {
    setLineItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitOfMeasure: product.unitOfMeasure,
        pieceUnit: product.pieceUnit || null,
        dimLength: product.dimLength ? Number(product.dimLength) : null,
        dimLengthUnit: product.dimLengthUnit || null,
        tier: "TIER_1",
        qtyNeeded: 1,
        isNonCatalog: false,
      },
    ])
  }

  function handleAddNonCatalog() {
    if (!ncName || !ncUom || !ncQty) {
      toast.error("Fill in name, unit, and quantity")
      return
    }
    setLineItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        productId: null,
        productName: ncName,
        unitOfMeasure: ncUom,
        tier: "TIER_2",
        qtyNeeded: parseFloat(ncQty) || 1,
        isNonCatalog: true,
        nonCatalogName: ncName,
        nonCatalogCategory: ncCategory || null,
        nonCatalogUom: ncUom,
        nonCatalogEstCost: ncCost ? parseFloat(ncCost) : null,
      },
    ])
    setNcName("")
    setNcCategory("")
    setNcUom("")
    setNcQty("")
    setNcCost("")
    setShowNonCatalog(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!jobName.trim()) {
      toast.error("Job name is required")
      return
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one item")
      return
    }

    try {
      const result = await createBom.mutateAsync({
        jobName: jobName.trim(),
        notes: notes.trim() || null,
        lineItems: lineItems.map((item) => ({
          productId: item.productId,
          tier: item.tier,
          qtyNeeded: item.qtyNeeded,
          isNonCatalog: item.isNonCatalog,
          nonCatalogName: item.nonCatalogName,
          nonCatalogCategory: item.nonCatalogCategory,
          nonCatalogUom: item.nonCatalogUom,
          nonCatalogEstCost: item.nonCatalogEstCost,
        })),
      })
      toast.success("BOM created")
      router.push(`/boms/${result.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create BOM")
    }
  }

  const excludeIds = lineItems.filter((i) => i.productId).map((i) => i.productId!)

  return (
    <div>
      <Header title="New BOM" showBack />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Job Info */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <h3 className="font-semibold text-navy">Job</h3>
          <div>
            <Label htmlFor="jobName">Job Name *</Label>
            <Input id="jobName" value={jobName} onChange={(e) => setJobName(e.target.value)} placeholder="e.g., ABC Corp Walk-in Cooler" className="h-12 mt-1" />
          </div>
        </Card>

        {/* Line Items */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-navy">Items ({lineItems.length})</h3>
          </div>

          <ProductPicker onSelect={handleProductSelect} placeholder="Search catalog to add items..." excludeIds={excludeIds} />

          {lineItems.length > 0 && (
            <div>
              {lineItems.map((item) => (
                <BomLineItemRow
                  key={item.tempId}
                  name={item.productName}
                  sku={item.sku}
                  unitOfMeasure={item.unitOfMeasure}
                  dimLength={item.dimLength}
                  dimLengthUnit={item.dimLengthUnit}
                  pieceUnit={item.pieceUnit}
                  inputUnit={item.inputUnit}
                  tier={item.tier}
                  qtyNeeded={item.qtyNeeded}
                  isNonCatalog={item.isNonCatalog}
                  nonCatalogCategory={item.nonCatalogCategory}
                  editable
                  onQtyChange={(qty) =>
                    setLineItems((prev) =>
                      prev.map((i) => (i.tempId === item.tempId ? { ...i, qtyNeeded: qty } : i))
                    )
                  }
                  onInputUnitChange={(unit) =>
                    setLineItems((prev) =>
                      prev.map((i) => (i.tempId === item.tempId ? { ...i, inputUnit: unit } : i))
                    )
                  }
                  onRemove={() =>
                    setLineItems((prev) => prev.filter((i) => i.tempId !== item.tempId))
                  }
                />
              ))}
            </div>
          )}

          {/* Non-catalog item form */}
          {showNonCatalog ? (
            <div className="space-y-2 p-3 bg-surface-secondary rounded-lg">
              <p className="text-sm font-medium text-navy">Non-Catalog Item</p>
              <Input value={ncName} onChange={(e) => setNcName(e.target.value)} placeholder="Item name *" className="h-10" />
              <Input value={ncCategory} onChange={(e) => setNcCategory(e.target.value)} placeholder="Category (optional)" className="h-10" />
              <div className="flex gap-2">
                <Input value={ncUom} onChange={(e) => setNcUom(e.target.value)} placeholder="Unit *" className="h-10 flex-1" />
                <Input type="number" value={ncQty} onChange={(e) => setNcQty(e.target.value)} placeholder="Qty *" className="h-10 w-20" min={0} step="any" />
              </div>
              <Input type="number" value={ncCost} onChange={(e) => setNcCost(e.target.value)} placeholder="Est. cost per unit (optional)" className="h-10" min={0} step="0.01" />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleAddNonCatalog} className="bg-brand-blue hover:bg-brand-blue/90 text-white">
                  Add Item
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowNonCatalog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowNonCatalog(true)} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Add Non-Catalog Item
            </Button>
          )}
        </Card>

        {/* Notes */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this BOM..."
            className="w-full rounded-lg border border-border-custom p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          disabled={createBom.isPending || !jobName.trim() || lineItems.length === 0}
          className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
        >
          {createBom.isPending ? "Creating..." : "Create BOM"}
        </Button>
      </form>
    </div>
  )
}
