"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ProductPicker } from "@/components/bom/product-picker"
import { BomLineItemRow } from "@/components/bom/bom-line-item-row"
import { BomAIFlow } from "@/components/bom/bom-ai-flow"
import { useCreateBom } from "@/hooks/use-boms"
import { useBomTemplate } from "@/hooks/use-bom-templates"
import { JobPicker } from "@/components/bom/job-picker"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Plus, Layers } from "lucide-react"
import { PanelLineItemForm, type PanelLineItem } from "@/components/bom/panel-line-item-form"

type Tab = "ai" | "manual"

export default function NewBomPage() {
  return (
    <Suspense>
      <NewBomPageContent />
    </Suspense>
  )
}

function NewBomPageContent() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get("templateId")
  const [activeTab, setActiveTab] = useState<Tab>(templateId ? "manual" : "ai")

  return (
    <div>
      <Header title="New BOM" showMenu />

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-4">
        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "ai"
              ? "border-brand-orange text-brand-orange"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          AI Build
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "manual"
              ? "border-brand-orange text-brand-orange"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Manual Entry
        </button>
      </div>

      <div className="p-4">
        {activeTab === "ai" ? <BomAIFlow /> : <ManualBomForm templateId={templateId} />}
      </div>
    </div>
  )
}

interface LineItem {
  tempId: string
  productId?: string | null
  productName: string
  sku?: string | null
  unitOfMeasure: string
  dimLength?: number | null
  dimLengthUnit?: string | null
  dimWidth?: number | null
  dimWidthUnit?: string | null
  inputUnit?: string
  tier: "TIER_1" | "TIER_2"
  qtyNeeded: number
  isNonCatalog: boolean
  nonCatalogName?: string | null
  nonCatalogCategory?: string | null
  nonCatalogUom?: string | null
  nonCatalogEstCost?: number | null
  nonCatalogSpecs?: Record<string, unknown> | null
}

function ManualBomForm({ templateId }: { templateId?: string | null }) {
  const router = useRouter()
  const createBom = useCreateBom()
  const { data: templateData } = useBomTemplate(templateId || "")

  const [jobName, setJobName] = useState("")
  const [jobNumber, setJobNumber] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [templateLoaded, setTemplateLoaded] = useState(false)

  // Pre-fill line items from template
  useEffect(() => {
    if (!templateId || templateLoaded || !templateData?.data) return
    const template = templateData.data
    const items: LineItem[] = (template.lineItems || []).map((li: Record<string, unknown>) => {
      const product = li.product as Record<string, unknown> | null
      return {
        tempId: crypto.randomUUID(),
        productId: (li.productId as string) || null,
        productName: product ? (product.name as string) : (li.nonCatalogName as string) || "Unknown",
        sku: product ? (product.sku as string | null) : null,
        unitOfMeasure: (li.unitOfMeasure as string) || "",
        dimLength: product?.dimLength ? Number(product.dimLength) : null,
        dimLengthUnit: product?.dimLengthUnit as string | null ?? null,
        dimWidth: product?.dimWidth ? Number(product.dimWidth) : null,
        dimWidthUnit: product?.dimWidthUnit as string | null ?? null,
        tier: (li.tier as "TIER_1" | "TIER_2") || "TIER_1",
        qtyNeeded: Number(li.defaultQty) || 1,
        isNonCatalog: (li.isNonCatalog as boolean) || false,
        nonCatalogName: (li.nonCatalogName as string) || null,
        nonCatalogCategory: (li.nonCatalogCategory as string) || null,
        nonCatalogUom: (li.isNonCatalog as boolean) ? (li.unitOfMeasure as string) || null : null,
      }
    })
    setLineItems(items)
    setTemplateLoaded(true)
    toast.success(`Loaded template: ${template.name}`)
  }, [templateId, templateData, templateLoaded])
  const [showPanel, setShowPanel] = useState(false)
  const [showNonCatalog, setShowNonCatalog] = useState(false)
  const [ncName, setNcName] = useState("")
  const [ncCategory, setNcCategory] = useState("")
  const [ncUom, setNcUom] = useState("")
  const [ncQty, setNcQty] = useState("")
  const [ncCost, setNcCost] = useState("")
  const [ncErrors, setNcErrors] = useState<Record<string, string>>({})

  function handleProductSelect(product: {
    id: string
    name: string
    sku: string | null
    unitOfMeasure: string
    currentQty: number
    dimLength?: number | null
    dimLengthUnit?: string | null
    dimWidth?: number | null
    dimWidthUnit?: string | null
  }) {
    setLineItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitOfMeasure: product.unitOfMeasure,
        dimLength: product.dimLength ? Number(product.dimLength) : null,
        dimLengthUnit: product.dimLengthUnit || null,
        dimWidth: product.dimWidth ? Number(product.dimWidth) : null,
        dimWidthUnit: product.dimWidthUnit || null,
        tier: "TIER_1",
        qtyNeeded: 1,
        isNonCatalog: false,
      },
    ])
  }

  function handleAddNonCatalog() {
    const errors: Record<string, string> = {}
    if (!ncName.trim()) errors.name = "Item name is required"
    if (!ncUom.trim()) errors.uom = "Unit is required"
    if (!ncQty || parseFloat(ncQty) <= 0) errors.qty = "Quantity must be greater than 0"
    if (Object.keys(errors).length > 0) {
      setNcErrors(errors)
      return
    }
    setNcErrors({})
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
        jobNumber: jobNumber || undefined,
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
          nonCatalogSpecs: item.nonCatalogSpecs,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Job Info */}
      <Card className="p-4 rounded-xl border-border-custom space-y-3">
        <h3 className="font-semibold text-navy">Job *</h3>
        <JobPicker
          onSelect={(job) => {
            setJobName(job.name)
            setJobNumber(job.number)
          }}
          selectedName={jobName || undefined}
          selectedNumber={jobNumber}
        />
      </Card>

      {/* Line Items */}
      <Card className="p-4 rounded-xl border-border-custom space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-navy">Items ({lineItems.length})</h3>
        </div>

        <ProductPicker
          onSelect={handleProductSelect}
          placeholder="Search catalog to add items..."
          excludeIds={excludeIds}
        />

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
                dimWidth={item.dimWidth}
                dimWidthUnit={item.dimWidthUnit}
                inputUnit={item.inputUnit}
                tier={item.tier}
                qtyNeeded={item.qtyNeeded}
                isNonCatalog={item.isNonCatalog}
                nonCatalogCategory={item.nonCatalogCategory}
                editable
                onQtyChange={(qty) =>
                  setLineItems((prev) =>
                    prev.map((i) =>
                      i.tempId === item.tempId ? { ...i, qtyNeeded: qty } : i
                    )
                  )
                }
                onInputUnitChange={(unit) =>
                  setLineItems((prev) =>
                    prev.map((i) =>
                      i.tempId === item.tempId ? { ...i, inputUnit: unit } : i
                    )
                  )
                }
                onRemove={() =>
                  setLineItems((prev) => prev.filter((i) => i.tempId !== item.tempId))
                }
              />
            ))}
          </div>
        )}

        {/* Panel line item form */}
        {showPanel && (
          <PanelLineItemForm
            onAdd={(panelItem: PanelLineItem) => {
              setLineItems((prev) => [...prev, panelItem])
              setShowPanel(false)
            }}
            onCancel={() => setShowPanel(false)}
          />
        )}

        {/* Non-catalog item form */}
        {showNonCatalog ? (
          <div className="space-y-2 p-3 bg-surface-secondary rounded-lg">
            <p className="text-sm font-medium text-navy">Non-Catalog Item</p>
            <div>
              <Input
                value={ncName}
                onChange={(e) => { setNcName(e.target.value); setNcErrors((prev) => { const { name, ...rest } = prev; return rest }) }}
                placeholder="Item name *"
                className={cn("h-10", ncErrors.name && "border-status-red")}
              />
              {ncErrors.name && <p className="text-xs text-status-red mt-0.5">{ncErrors.name}</p>}
            </div>
            <Input
              value={ncCategory}
              onChange={(e) => setNcCategory(e.target.value)}
              placeholder="Category (optional)"
              className="h-10"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={ncUom}
                  onChange={(e) => { setNcUom(e.target.value); setNcErrors((prev) => { const { uom, ...rest } = prev; return rest }) }}
                  placeholder="Unit *"
                  className={cn("h-10", ncErrors.uom && "border-status-red")}
                />
                {ncErrors.uom && <p className="text-xs text-status-red mt-0.5">{ncErrors.uom}</p>}
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  value={ncQty}
                  onChange={(e) => { setNcQty(e.target.value); setNcErrors((prev) => { const { qty, ...rest } = prev; return rest }) }}
                  placeholder="Qty *"
                  className={cn("h-10", ncErrors.qty && "border-status-red")}
                  min={0}
                  step="any"
                />
                {ncErrors.qty && <p className="text-xs text-status-red mt-0.5">{ncErrors.qty}</p>}
              </div>
            </div>
            <Input
              type="number"
              value={ncCost}
              onChange={(e) => setNcCost(e.target.value)}
              placeholder="Est. cost per unit (optional)"
              className="h-10"
              min={0}
              step="0.01"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleAddNonCatalog}
                className="bg-brand-blue hover:bg-brand-blue/90 text-white"
              >
                Add Item
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowNonCatalog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {!showPanel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setShowPanel(true); setShowNonCatalog(false) }}
                className="flex-1"
              >
                <Layers className="h-4 w-4 mr-1" />
                Add Panel
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowNonCatalog(true); setShowPanel(false) }}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              Non-Catalog Item
            </Button>
          </div>
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
  )
}
