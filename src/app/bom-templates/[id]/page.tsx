"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AIInput } from "@/components/ai/ai-input"
import {
  useBomTemplate,
  useUpdateBomTemplate,
  useDeleteBomTemplate,
} from "@/hooks/use-bom-templates"
import { toast } from "sonner"
import { Calendar, Pencil, Plus, Trash2, FileStack } from "lucide-react"
import { formatQuantity } from "@/lib/utils"

export default function BomTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading } = useBomTemplate(id)
  const updateTemplate = useUpdateBomTemplate()
  const deleteTemplate = useDeleteBomTemplate()
  const template = data?.data

  const [mode, setMode] = useState<"view" | "edit">("view")
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [pendingQtyChanges, setPendingQtyChanges] = useState<Record<string, number>>({})
  const [pendingRemovals, setPendingRemovals] = useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Non-catalog form state for edit mode
  const [showNonCatalog, setShowNonCatalog] = useState(false)
  const [ncName, setNcName] = useState("")
  const [ncCategory, setNcCategory] = useState("")
  const [ncUom, setNcUom] = useState("")
  const [ncQty, setNcQty] = useState("")

  function enterEditMode() {
    if (!template) return
    setEditName(template.name)
    setEditDescription(template.description || "")
    setPendingQtyChanges({})
    setPendingRemovals([])
    setShowNonCatalog(false)
    setMode("edit")
  }

  function resetMode() {
    setMode("view")
    setPendingQtyChanges({})
    setPendingRemovals([])
    setShowNonCatalog(false)
    setNcName("")
    setNcCategory("")
    setNcUom("")
    setNcQty("")
  }

  async function handleAddProduct(product: {
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
    try {
      await updateTemplate.mutateAsync({
        id,
        addLineItems: [{
          productId: product.id,
          tier: "TIER_1",
          defaultQty: 1,
          unitOfMeasure: product.unitOfMeasure,
        }],
      })
      toast.success(`Added ${product.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item")
    }
  }

  async function handleAIParse(result: { items: Array<{ matchedProduct?: { id: string; name: string; sku: string | null; unitOfMeasure: string } | null; parsedItem: { name: string; quantity: number; unitOfMeasure: string; category?: string | null }; isNonCatalog: boolean }> }) {
    const addItems = result.items.map((match) => {
      if (match.matchedProduct && !match.isNonCatalog) {
        return {
          productId: match.matchedProduct.id,
          tier: "TIER_1" as const,
          defaultQty: match.parsedItem.quantity,
          unitOfMeasure: match.matchedProduct.unitOfMeasure,
        }
      }
      return {
        productId: null as string | null,
        tier: "TIER_2" as const,
        defaultQty: match.parsedItem.quantity,
        unitOfMeasure: match.parsedItem.unitOfMeasure,
        isNonCatalog: true,
        nonCatalogName: match.parsedItem.name,
        nonCatalogCategory: match.parsedItem.category || null,
      }
    })
    try {
      await updateTemplate.mutateAsync({ id, addLineItems: addItems })
      toast.success(`Added ${result.items.length} item${result.items.length !== 1 ? "s" : ""}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add items")
    }
  }

  async function handleAddNonCatalog() {
    if (!ncName || !ncUom || !ncQty) {
      toast.error("Fill in name, unit, and quantity")
      return
    }
    try {
      await updateTemplate.mutateAsync({
        id,
        addLineItems: [{
          tier: "TIER_2",
          defaultQty: parseFloat(ncQty) || 1,
          unitOfMeasure: ncUom,
          isNonCatalog: true,
          nonCatalogName: ncName,
          nonCatalogCategory: ncCategory || null,
        }],
      })
      toast.success(`Added ${ncName}`)
      setNcName("")
      setNcCategory("")
      setNcUom("")
      setNcQty("")
      setShowNonCatalog(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item")
    }
  }

  async function handleSaveEdits() {
    const updateLineItems = Object.entries(pendingQtyChanges).map(([lineId, qty]) => ({
      id: lineId,
      defaultQty: qty,
    }))

    const hasNameChange = editName.trim() !== template?.name
    const hasDescChange = editDescription.trim() !== (template?.description || "")

    try {
      await updateTemplate.mutateAsync({
        id,
        ...(hasNameChange ? { name: editName.trim() } : {}),
        ...(hasDescChange ? { description: editDescription.trim() || null } : {}),
        removeLineItemIds: pendingRemovals.length > 0 ? pendingRemovals : undefined,
        updateLineItems: updateLineItems.length > 0 ? updateLineItems : undefined,
      })
      toast.success("Template updated")
      resetMode()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes")
    }
  }

  async function handleDelete() {
    try {
      await deleteTemplate.mutateAsync({ id })
      toast.success("Template deleted")
      router.push("/bom-templates")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template")
    }
  }

  const hasPendingChanges =
    Object.keys(pendingQtyChanges).length > 0 ||
    pendingRemovals.length > 0 ||
    editName.trim() !== (template?.name || "") ||
    editDescription.trim() !== (template?.description || "")

  if (isLoading) {
    return (
      <div>
        <Header title="Template Detail" showBack />
        <div className="p-4 space-y-3">
          <div className="h-20 rounded-xl skeleton-shimmer" />
          <div className="h-48 rounded-xl skeleton-shimmer stagger-1" />
          <div className="h-32 rounded-xl skeleton-shimmer stagger-2" />
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div>
        <Header title="Template Detail" showBack />
        <div className="text-center py-12 text-text-muted">Template not found</div>
      </div>
    )
  }

  const allItems = (template.lineItems || []) as Record<string, unknown>[]
  const visibleItems = allItems.filter(
    (item) => !pendingRemovals.includes(item.id as string)
  )

  const existingProductIds = visibleItems
    .filter((item) => !(item.isNonCatalog as boolean) && item.product)
    .map((item) => (item.product as Record<string, unknown>).id as string)

  return (
    <div>
      <Header title={template.name} showBack />
      <Breadcrumb items={[
        { label: "BOM Templates", href: "/bom-templates" },
        { label: template.name },
      ]} />

      <div className="p-4 space-y-4">
        {/* Template Info */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-navy">Template Details</h3>
            {mode === "view" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={enterEditMode}
                className="text-brand-blue"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>

          {mode === "edit" ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="editName">Template Name *</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Template name"
                  className="h-12 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description..."
                  className="w-full rounded-lg border border-border-custom p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {template.description && (
                <p className="text-text-secondary bg-surface-secondary p-3 rounded-lg">
                  {template.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-text-secondary">
                <FileStack className="h-4 w-4 text-text-muted" />
                <span>{allItems.length} item{allItems.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Calendar className="h-4 w-4 text-text-muted" />
                <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Line Items */}
        <Card className="p-4 rounded-xl border-border-custom">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-navy">Items ({visibleItems.length})</h3>
          </div>

          {/* Edit mode — product picker */}
          {mode === "edit" && (
            <div className="mb-3">
              <AIInput
                onParseComplete={handleAIParse}
                onProductSelect={handleAddProduct}
                placeholder="Search catalog"
                excludeIds={existingProductIds}
              />
            </div>
          )}

          {visibleItems.length === 0 && (
            <p className="text-center text-sm text-text-muted py-6">
              No items in this template.
            </p>
          )}

          {visibleItems.map((item) => {
            const product = item.product as Record<string, unknown> | null
            const lineId = item.id as string
            const originalQty = Number(item.defaultQty)
            const displayQty = pendingQtyChanges[lineId] ?? originalQty
            const isNonCatalog = item.isNonCatalog as boolean
            const itemName = isNonCatalog
              ? (item.nonCatalogName as string) || "Non-catalog item"
              : (product?.name as string) || "Unknown"
            const uom = isNonCatalog
              ? (item.unitOfMeasure as string) || ""
              : (product?.unitOfMeasure as string) || (item.unitOfMeasure as string) || ""

            return (
              <div key={lineId} className="py-4 border-b border-border-custom last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-base font-medium text-navy">{itemName}</p>
                  {isNonCatalog && (
                    <span className="text-xs px-1.5 py-0 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                      Non-catalog
                    </span>
                  )}
                </div>

                <div className="flex items-end justify-between gap-3">
                  <p className="text-sm text-text-secondary">
                    {isNonCatalog
                      ? (item.nonCatalogCategory as string) || "Non-catalog"
                      : (product?.sku as string) || "No SKU"}
                  </p>

                  {mode === "edit" ? (
                    <div className="flex items-end gap-1.5 shrink-0">
                      <div>
                        <Input
                          type="number"
                          value={displayQty || ""}
                          onChange={(e) =>
                            setPendingQtyChanges((prev) => ({
                              ...prev,
                              [lineId]: e.target.value === "" ? 0 : parseFloat(e.target.value),
                            }))
                          }
                          className="h-9 w-18 text-center text-base"
                          min={0}
                          step="any"
                        />
                        <label className="text-xs text-text-muted font-medium uppercase tracking-wide block text-center h-6 leading-6">
                          {uom}
                        </label>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove item"
                        onClick={() =>
                          setPendingRemovals((prev) => [...prev, lineId])
                        }
                        className="h-9 w-9 shrink-0 text-status-red hover:text-status-red hover:bg-status-red/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-left shrink-0">
                      <span className="text-xl font-bold text-navy tabular-nums">
                        {formatQuantity(originalQty)}
                      </span>
                      <span className="text-base font-medium text-navy ml-1">
                        {uom}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Non-catalog item form in edit mode */}
          {mode === "edit" && (
            <>
              {showNonCatalog ? (
                <div className="space-y-2 p-3 bg-surface-secondary rounded-lg mt-3">
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
                  className="w-full mt-3"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Non-Catalog Item
                </Button>
              )}
            </>
          )}
        </Card>

        {/* Edit Save/Cancel */}
        {mode === "edit" && (
          <div className="flex gap-2">
            <Button
              onClick={handleSaveEdits}
              disabled={updateTemplate.isPending || !hasPendingChanges}
              className="flex-1 h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
            >
              {updateTemplate.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button onClick={resetMode} variant="outline" className="h-12">
              Cancel
            </Button>
          </div>
        )}

        {/* View mode actions */}
        {mode === "view" && (
          <div className="space-y-2">
            <Button
              onClick={() => router.push(`/boms/new?templateId=${id}`)}
              className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
            >
              Use Template
            </Button>

            {showDeleteConfirm ? (
              <div className="flex gap-2">
                <Button
                  onClick={handleDelete}
                  disabled={deleteTemplate.isPending}
                  className="flex-1 h-12 bg-status-red hover:bg-status-red/90 text-white font-semibold"
                >
                  {deleteTemplate.isPending ? "Deleting..." : "Confirm Delete"}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="h-12"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                className="w-full h-12 text-status-red border-status-red/30 hover:bg-status-red/5"
              >
                Delete Template
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
