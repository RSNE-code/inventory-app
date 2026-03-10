"use client"

import { use, useState } from "react"
import { useBom, useUpdateBom, useCheckoutBom } from "@/hooks/use-boms"
import { useMe } from "@/hooks/use-me"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BomStatusBadge } from "@/components/bom/bom-status-badge"
import { BomLineItemRow } from "@/components/bom/bom-line-item-row"
import { ProductPicker } from "@/components/bom/product-picker"
import { CheckoutAllButton } from "@/components/bom/checkout-all-button"
import { AIInput } from "@/components/ai/ai-input"
import { toast } from "sonner"
import { Calendar, User, Pencil, Plus, Undo2, Mic } from "lucide-react"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import type { ParseResult, ReceivingParseResult, CatalogMatch } from "@/lib/ai/types"

type ActiveMode = "view" | "edit" | "add-material" | "return"

export default function BomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useBom(id)
  const { data: meData } = useMe()
  const updateBom = useUpdateBom()
  const checkoutBom = useCheckoutBom()
  const bom = data?.data
  const me = meData?.data

  const [mode, setMode] = useState<ActiveMode>("view")
  const [pendingQtyChanges, setPendingQtyChanges] = useState<Record<string, number>>({})
  const [pendingUnitChanges, setPendingUnitChanges] = useState<Record<string, string>>({})
  const [pendingRemovals, setPendingRemovals] = useState<string[]>([])
  const [checkoutQtys, setCheckoutQtys] = useState<Record<string, number>>({})
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({})

  const isCreator = me && bom && me.id === bom.createdById
  const canEdit = isCreator && bom && ["DRAFT", "APPROVED"].includes(bom.status)
  const canCheckout = bom && ["APPROVED", "IN_PROGRESS"].includes(bom.status) && me &&
    ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SHOP_FOREMAN"].includes(me.role)

  function resetMode() {
    setMode("view")
    setPendingQtyChanges({})
    setPendingUnitChanges({})
    setPendingRemovals([])
    setCheckoutQtys({})
    setReturnQtys({})
  }

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
      resetMode()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes")
    }
  }

  async function handleAddProduct(product: { id: string; name: string; sku: string | null; unitOfMeasure: string; currentQty: number; dimLength?: number | null; dimLengthUnit?: string | null; dimWidth?: number | null; dimWidthUnit?: string | null }) {
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

  // AI-parsed items → add to BOM + auto-checkout
  async function handleAIAddItems(result: ParseResult | ReceivingParseResult) {
    const catalogItems = result.items.filter((m: CatalogMatch) => !m.isNonCatalog && m.matchedProduct)
    const nonCatalogItems = result.items.filter((m: CatalogMatch) => m.isNonCatalog)

    if (catalogItems.length === 0 && nonCatalogItems.length === 0) {
      toast.error("No items recognized")
      return
    }

    try {
      // Add items to the BOM
      const addLineItems = [
        ...catalogItems.map((m: CatalogMatch) => ({
          productId: m.matchedProduct!.id,
          tier: m.matchedProduct!.tier as "TIER_1" | "TIER_2",
          qtyNeeded: m.parsedItem.quantity,
        })),
        ...nonCatalogItems.map((m: CatalogMatch) => ({
          tier: "TIER_2" as const,
          qtyNeeded: m.parsedItem.quantity,
          isNonCatalog: true,
          nonCatalogName: m.parsedItem.name,
          nonCatalogCategory: m.parsedItem.category ?? null,
          nonCatalogUom: m.parsedItem.unitOfMeasure,
        })),
      ]

      await updateBom.mutateAsync({ id, addLineItems })
      toast.success(`Added ${addLineItems.length} item${addLineItems.length !== 1 ? "s" : ""} to BOM`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add items")
    }
  }

  async function handleCheckoutAll(items: Array<{ bomLineItemId: string; type: "CHECKOUT"; quantity: number }>) {
    // Auto-adjust qtyNeeded if checkout exceeds it
    const allItems = bom?.lineItems as Record<string, unknown>[] | undefined
    const qtyUpdates: Array<{ id: string; qtyNeeded: number }> = []
    if (allItems) {
      for (const item of items) {
        const lineItem = allItems.find((li) => (li.id as string) === item.bomLineItemId)
        if (lineItem) {
          const currentNeeded = Number(lineItem.qtyNeeded)
          const alreadyCheckedOut = Number(lineItem.qtyCheckedOut || 0)
          const totalAfterCheckout = alreadyCheckedOut + item.quantity
          if (totalAfterCheckout > currentNeeded) {
            qtyUpdates.push({ id: item.bomLineItemId, qtyNeeded: totalAfterCheckout })
          }
        }
      }
    }

    try {
      if (qtyUpdates.length > 0) {
        await updateBom.mutateAsync({ id, updateLineItems: qtyUpdates })
      }
      await checkoutBom.mutateAsync({ id, items })
      toast.success("All materials checked out")
      resetMode()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed")
    }
  }

  async function handleCheckout() {
    const items = Object.entries(checkoutQtys)
      .filter(([, qty]) => qty > 0)
      .map(([bomLineItemId, quantity]) => ({
        bomLineItemId,
        type: "CHECKOUT" as const,
        quantity,
      }))

    if (items.length === 0) {
      toast.error("Enter quantities to pull")
      return
    }

    // Auto-adjust qtyNeeded if checkout exceeds it
    const allItems = bom?.lineItems as Record<string, unknown>[] | undefined
    const qtyUpdates: Array<{ id: string; qtyNeeded: number }> = []
    if (allItems) {
      for (const item of items) {
        const lineItem = allItems.find((li) => (li.id as string) === item.bomLineItemId)
        if (lineItem) {
          const currentNeeded = Number(lineItem.qtyNeeded)
          const alreadyCheckedOut = Number(lineItem.qtyCheckedOut || 0)
          const totalAfterCheckout = alreadyCheckedOut + item.quantity
          if (totalAfterCheckout > currentNeeded) {
            qtyUpdates.push({ id: item.bomLineItemId, qtyNeeded: totalAfterCheckout })
          }
        }
      }
    }

    try {
      if (qtyUpdates.length > 0) {
        await updateBom.mutateAsync({ id, updateLineItems: qtyUpdates })
      }
      await checkoutBom.mutateAsync({ id, items })
      toast.success("Materials pulled from inventory")
      resetMode()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed")
    }
  }

  async function handleReturnAll() {
    const items = Object.entries(returnQtys)
      .filter(([, qty]) => qty > 0)
      .map(([bomLineItemId, quantity]) => ({
        bomLineItemId,
        type: "RETURN" as const,
        quantity,
      }))

    if (items.length === 0) {
      toast.error("Enter quantities to return")
      return
    }

    try {
      await checkoutBom.mutateAsync({ id, items })
      toast.success("Materials returned to inventory")
      resetMode()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Return failed")
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

  const allItems = bom.lineItems as Record<string, unknown>[]
  const visibleItems = allItems.filter(
    (item) => !pendingRemovals.includes(item.id as string)
  )

  const existingProductIds = visibleItems
    .filter((item) => !(item.isNonCatalog as boolean) && item.product)
    .map((item) => (item.product as Record<string, unknown>).id as string)

  const hasPendingChanges = Object.keys(pendingQtyChanges).length > 0 || pendingRemovals.length > 0
  const hasCheckoutQtys = Object.values(checkoutQtys).some((q) => q > 0)
  const hasReturnQtys = Object.values(returnQtys).some((q) => q > 0)

  const hasOutstandingMaterial = allItems.some((item) => {
    const checkedOut = Number(item.qtyCheckedOut || 0)
    const returned = Number(item.qtyReturned || 0)
    return checkedOut - returned > 0
  })

  // Build checkout items for CheckoutAllButton
  const checkoutItems = allItems.map((item) => {
    const product = item.product as Record<string, unknown> | null
    return {
      id: item.id as string,
      name: (item.isNonCatalog as boolean)
        ? (item.nonCatalogName as string) || "Non-catalog item"
        : (product?.name as string) || "Unknown",
      qtyNeeded: Number(item.qtyNeeded),
      qtyCheckedOut: Number(item.qtyCheckedOut || 0),
      qtyReturned: Number(item.qtyReturned || 0),
      unitOfMeasure: (item.isNonCatalog as boolean)
        ? (item.nonCatalogUom as string) || ""
        : (product?.unitOfMeasure as string) || "",
      isNonCatalog: item.isNonCatalog as boolean,
    }
  })

  return (
    <div>
      <Header title={bom.jobName} showBack />
      <Breadcrumb items={[
        { label: "BOMs", href: "/boms" },
        { label: bom.jobName },
      ]} />

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
              {mode === "return" ? "Return Material" : `Items (${visibleItems.length})`}
            </h3>
            {canEdit && mode === "view" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMode("edit")}
                className="text-brand-blue"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>

          {/* Return mode instructions */}
          {mode === "return" && (
            <p className="text-xs text-text-muted mb-3 bg-surface-secondary p-2.5 rounded-lg">
              Enter the quantity being returned for each item. Only items with outstanding material are shown.
            </p>
          )}

          {/* Add material mode — product picker + AI input */}
          {mode === "add-material" && (
            <div className="mb-3 space-y-3">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-[#E8792B]" />
                <p className="text-sm text-gray-500">Speak or type to add more items</p>
              </div>
              <AIInput
                onParseComplete={handleAIAddItems}
                placeholder={`"Also grabbing 2 tubes caulk and 10 zip ties..."`}
              />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-400">or search catalog</span>
                </div>
              </div>
              <ProductPicker
                onSelect={handleAddProduct}
                placeholder="Search catalog to add items..."
                excludeIds={existingProductIds}
              />
            </div>
          )}

          {/* Edit mode — product picker */}
          {mode === "edit" && (
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
                dimLength={product?.dimLength ? Number(product.dimLength) : null}
                dimLengthUnit={product?.dimLengthUnit as string | null}
                dimWidth={product?.dimWidth ? Number(product.dimWidth) : null}
                dimWidthUnit={product?.dimWidthUnit as string | null}
                tier={item.tier as string}
                qtyNeeded={displayQty}
                isNonCatalog={item.isNonCatalog as boolean}
                nonCatalogCategory={item.nonCatalogCategory as string | null}
                qtyCheckedOut={Number(item.qtyCheckedOut || 0)}
                qtyReturned={Number(item.qtyReturned || 0)}
                inputUnit={pendingUnitChanges[lineId]}
                editable={mode === "edit"}
                checkoutMode={mode === "add-material"}
                returnMode={mode === "return"}
                checkoutQty={checkoutQtys[lineId]}
                returnQty={returnQtys[lineId]}
                onQtyChange={(qty) =>
                  setPendingQtyChanges((prev) => ({ ...prev, [lineId]: qty }))
                }
                onInputUnitChange={(unit) =>
                  setPendingUnitChanges((prev) => ({ ...prev, [lineId]: unit }))
                }
                onRemove={() =>
                  setPendingRemovals((prev) => [...prev, lineId])
                }
                onCheckoutQtyChange={(qty) =>
                  setCheckoutQtys((prev) => ({ ...prev, [lineId]: qty }))
                }
                onReturnQtyChange={(qty) =>
                  setReturnQtys((prev) => ({ ...prev, [lineId]: qty }))
                }
              />
            )
          })}

          {mode === "return" && !hasOutstandingMaterial && (
            <p className="text-center text-sm text-text-muted py-6">
              No outstanding material to return.
            </p>
          )}
        </Card>

        {/* Edit Save/Cancel */}
        {mode === "edit" && (
          <div className="flex gap-2">
            <Button
              onClick={handleSaveEdits}
              disabled={updateBom.isPending || !hasPendingChanges}
              className="flex-1 h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
            >
              {updateBom.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button onClick={resetMode} variant="outline" className="h-12">
              Cancel
            </Button>
          </div>
        )}

        {/* Add Material confirm/cancel */}
        {mode === "add-material" && (
          <div className="flex gap-2">
            <Button
              onClick={handleCheckout}
              disabled={checkoutBom.isPending || !hasCheckoutQtys}
              className="flex-1 h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
            >
              {checkoutBom.isPending ? "Pulling..." : "Confirm Checkout"}
            </Button>
            <Button onClick={resetMode} variant="outline" className="h-12">
              Cancel
            </Button>
          </div>
        )}

        {/* Return confirm/cancel */}
        {mode === "return" && (
          <div className="flex gap-2">
            <Button
              onClick={handleReturnAll}
              disabled={checkoutBom.isPending || !hasReturnQtys}
              className="flex-1 h-12 bg-status-green hover:bg-status-green/90 text-white font-semibold"
            >
              {checkoutBom.isPending ? "Returning..." : "Confirm Returns"}
            </Button>
            <Button onClick={resetMode} variant="outline" className="h-12">
              Cancel
            </Button>
          </div>
        )}

        {/* Action buttons — view mode */}
        {mode === "view" && (
          <div className="space-y-2">
            {/* Draft actions */}
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

            {/* Approved — Check Out All as primary action */}
            {bom.status === "APPROVED" && canCheckout && (
              <>
                <CheckoutAllButton
                  items={checkoutItems}
                  onCheckoutAll={handleCheckoutAll}
                  isPending={checkoutBom.isPending}
                />
                <Button
                  onClick={() => setMode("add-material")}
                  variant="outline"
                  className="w-full h-12 border-brand-blue text-brand-blue hover:bg-brand-blue/5 font-semibold"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Adjust & Check Out
                </Button>
              </>
            )}

            {/* In Progress — Check Out All + add material + return + complete */}
            {bom.status === "IN_PROGRESS" && canCheckout && (
              <>
                <CheckoutAllButton
                  items={checkoutItems}
                  onCheckoutAll={handleCheckoutAll}
                  isPending={checkoutBom.isPending}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => setMode("add-material")}
                    className="flex-1 h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Material
                  </Button>
                  {hasOutstandingMaterial && (
                    <Button
                      onClick={() => setMode("return")}
                      variant="outline"
                      className="flex-1 h-12 border-brand-blue text-brand-blue hover:bg-brand-blue/5 font-semibold"
                    >
                      <Undo2 className="h-4 w-4 mr-1.5" />
                      Return Material
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => handleStatusChange("COMPLETED")}
                  disabled={updateBom.isPending}
                  variant="outline"
                  className="w-full h-12 text-status-green border-status-green/30 hover:bg-status-green/5 font-semibold"
                >
                  Mark Completed
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
