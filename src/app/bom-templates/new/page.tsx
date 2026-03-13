"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AIInput } from "@/components/ai/ai-input"
import { useCreateBomTemplate } from "@/hooks/use-bom-templates"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

interface TemplateLineItem {
  tempId: string
  productId?: string | null
  productName: string
  sku?: string | null
  unitOfMeasure: string
  defaultQty: number
  isNonCatalog: boolean
  nonCatalogName?: string | null
  nonCatalogCategory?: string | null
  tier: "TIER_1" | "TIER_2"
}

export default function NewBomTemplatePage() {
  const router = useRouter()
  const createTemplate = useCreateBomTemplate()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [lineItems, setLineItems] = useState<TemplateLineItem[]>([])
  const [showNonCatalog, setShowNonCatalog] = useState(false)
  const [ncName, setNcName] = useState("")
  const [ncCategory, setNcCategory] = useState("")
  const [ncUom, setNcUom] = useState("")
  const [ncQty, setNcQty] = useState("")

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
        defaultQty: 1,
        isNonCatalog: false,
        tier: "TIER_1",
      },
    ])
  }

  function handleAIParse(result: { items: Array<{ matchedProduct?: { id: string; name: string; sku: string | null; unitOfMeasure: string } | null; parsedItem: { name: string; quantity: number; unitOfMeasure: string; category?: string | null }; isNonCatalog: boolean }> }) {
    for (const match of result.items) {
      if (match.matchedProduct && !match.isNonCatalog) {
        setLineItems((prev) => [
          ...prev,
          {
            tempId: crypto.randomUUID(),
            productId: match.matchedProduct!.id,
            productName: match.matchedProduct!.name,
            sku: match.matchedProduct!.sku,
            unitOfMeasure: match.matchedProduct!.unitOfMeasure,
            defaultQty: match.parsedItem.quantity,
            isNonCatalog: false,
            tier: "TIER_1",
          },
        ])
      } else {
        setLineItems((prev) => [
          ...prev,
          {
            tempId: crypto.randomUUID(),
            productId: null,
            productName: match.parsedItem.name,
            unitOfMeasure: match.parsedItem.unitOfMeasure,
            defaultQty: match.parsedItem.quantity,
            isNonCatalog: true,
            nonCatalogName: match.parsedItem.name,
            nonCatalogCategory: match.parsedItem.category || null,
            tier: "TIER_2",
          },
        ])
      }
    }
    toast.success(`Added ${result.items.length} item${result.items.length !== 1 ? "s" : ""}`)
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
        defaultQty: parseFloat(ncQty) || 1,
        isNonCatalog: true,
        nonCatalogName: ncName,
        nonCatalogCategory: ncCategory || null,
        tier: "TIER_2",
      },
    ])
    setNcName("")
    setNcCategory("")
    setNcUom("")
    setNcQty("")
    setShowNonCatalog(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Template name is required")
      return
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one item")
      return
    }

    try {
      const result = await createTemplate.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        lineItems: lineItems.map((item) => ({
          productId: item.productId,
          tier: item.tier,
          defaultQty: item.defaultQty,
          unitOfMeasure: item.unitOfMeasure,
          isNonCatalog: item.isNonCatalog,
          nonCatalogName: item.nonCatalogName,
          nonCatalogCategory: item.nonCatalogCategory,
        })),
      })
      toast.success("Template created")
      router.push(`/bom-templates/${result.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create template")
    }
  }

  const excludeIds = lineItems.filter((i) => i.productId).map((i) => i.productId!)

  return (
    <div>
      <Header title="New Template" showBack />
      <Breadcrumb items={[
        { label: "BOM Templates", href: "/bom-templates" },
        { label: "New Template" },
      ]} />

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Info */}
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Template Info</h3>
            <div>
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Standard Walk-in Cooler"
                className="h-12 mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this template..."
                className="w-full rounded-lg border border-border-custom p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue mt-1"
              />
            </div>
          </Card>

          {/* Line Items */}
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy">Items ({lineItems.length})</h3>
            </div>

            <AIInput
              onParseComplete={handleAIParse}
              onProductSelect={handleProductSelect}
              placeholder="Search catalog"
              excludeIds={excludeIds}
            />

            {lineItems.length > 0 && (
              <div>
                {lineItems.map((item) => (
                  <div
                    key={item.tempId}
                    className="py-4 border-b border-border-custom last:border-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-medium text-navy">{item.productName}</p>
                      {item.isNonCatalog && (
                        <span className="text-xs px-1.5 py-0 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                          Non-catalog
                        </span>
                      )}
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <p className="text-sm text-text-secondary">
                        {item.isNonCatalog
                          ? (item.nonCatalogCategory || "Non-catalog")
                          : (item.sku || "No SKU")}
                      </p>

                      <div className="flex items-end gap-1.5 shrink-0">
                        <div>
                          <Input
                            type="number"
                            value={item.defaultQty || ""}
                            onChange={(e) =>
                              setLineItems((prev) =>
                                prev.map((i) =>
                                  i.tempId === item.tempId
                                    ? { ...i, defaultQty: e.target.value === "" ? 0 : parseFloat(e.target.value) }
                                    : i
                                )
                              )
                            }
                            className="h-9 w-18 text-center text-base"
                            min={0}
                            step="any"
                          />
                          <label className="text-xs text-text-muted font-medium uppercase tracking-wide block text-center h-6 leading-6">
                            {item.unitOfMeasure}
                          </label>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove item"
                          onClick={() =>
                            setLineItems((prev) => prev.filter((i) => i.tempId !== item.tempId))
                          }
                          className="h-9 w-9 shrink-0 text-status-red hover:text-status-red hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Non-catalog item form */}
            {showNonCatalog ? (
              <div className="space-y-2 p-3 bg-surface-secondary rounded-lg">
                <p className="text-sm font-medium text-navy">Non-Catalog Item</p>
                <Input
                  value={ncName}
                  onChange={(e) => setNcName(e.target.value)}
                  placeholder="Item name *"
                  className="h-10"
                />
                <Input
                  value={ncCategory}
                  onChange={(e) => setNcCategory(e.target.value)}
                  placeholder="Category (optional)"
                  className="h-10"
                />
                <div className="flex gap-2">
                  <Input
                    value={ncUom}
                    onChange={(e) => setNcUom(e.target.value)}
                    placeholder="Unit *"
                    className="h-10 flex-1"
                  />
                  <Input
                    type="number"
                    value={ncQty}
                    onChange={(e) => setNcQty(e.target.value)}
                    placeholder="Qty *"
                    className="h-10 w-20"
                    min={0}
                    step="any"
                  />
                </div>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNonCatalog(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Non-Catalog Item
              </Button>
            )}
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            disabled={createTemplate.isPending || !name.trim() || lineItems.length === 0}
            className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
          >
            {createTemplate.isPending ? "Creating..." : "Create Template"}
          </Button>
        </form>
      </div>
    </div>
  )
}
