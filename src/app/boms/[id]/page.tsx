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
import { PanelCheckoutSheet } from "@/components/bom/panel-checkout-sheet"
import { Pencil, Plus, Undo2, Mic, Info, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { StepProgress } from "@/components/layout/step-progress"
import type { ParseResult, ReceivingParseResult, CatalogMatch } from "@/lib/ai/types"

type ActiveMode = "view" | "edit" | "add-material" | "return"

/** Build qty updates when checkout would exceed qtyNeeded */
function buildQtyUpdates(
  items: Array<{ bomLineItemId: string; quantity: number }>,
  allItems: Record<string, unknown>[] | undefined
): Array<{ id: string; qtyNeeded: number }> {
  const updates: Array<{ id: string; qtyNeeded: number }> = []
  if (!allItems) return updates
  for (const item of items) {
    const lineItem = allItems.find((li) => (li.id as string) === item.bomLineItemId)
    if (lineItem) {
      const currentNeeded = Number(lineItem.qtyNeeded)
      const alreadyCheckedOut = Number(lineItem.qtyCheckedOut || 0)
      const totalAfterCheckout = alreadyCheckedOut + item.quantity
      if (totalAfterCheckout > currentNeeded) {
        updates.push({ id: item.bomLineItemId, qtyNeeded: totalAfterCheckout })
      }
    }
  }
  return updates
}

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
  const [undoAction, setUndoAction] = useState<{ type: string; previousStatus: string } | null>(null)
  const [panelCheckoutItem, setPanelCheckoutItem] = useState<string | null>(null)

  const isCreator = me && bom && me.id === bom.createdById
  const canEdit = isCreator && bom && ["DRAFT", "APPROVED"].includes(bom.status)
  const canCheckout = bom && ["APPROVED", "IN_PROGRESS"].includes(bom.status) && me &&
    ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SHOP_FOREMAN"].includes(me.role)
  const canApprove = me && ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER"].includes(me.role)

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
          nonCatalogSpecs: m.panelSpecs ?? undefined,
        })),
      ]

      const updateResult = await updateBom.mutateAsync({ id, addLineItems })

      // Populate checkoutQtys for newly added items so they can be checked out immediately
      const updatedBom = updateResult?.data
      if (updatedBom?.lineItems) {
        const updatedItems = updatedBom.lineItems as Record<string, unknown>[]
        const newCheckoutQtys: Record<string, number> = { ...checkoutQtys }

        for (const catalogItem of catalogItems) {
          const matchingLine = updatedItems.find((li) => {
            const prod = li.product as Record<string, unknown> | null
            return prod && prod.id === catalogItem.matchedProduct!.id
          })
          if (matchingLine) {
            const lineId = matchingLine.id as string
            const alreadyCheckedOut = Number(matchingLine.qtyCheckedOut || 0)
            const remaining = catalogItem.parsedItem.quantity
            if (remaining > 0) {
              newCheckoutQtys[lineId] = remaining
            }
          }
        }
        setCheckoutQtys(newCheckoutQtys)
      }

      toast.success(`Added ${addLineItems.length} item${addLineItems.length !== 1 ? "s" : ""} to BOM`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add items")
    }
  }

  async function handleCheckoutAll(items: Array<{ bomLineItemId: string; type: "CHECKOUT"; quantity: number }>) {
    const qtyUpdates = buildQtyUpdates(items, bom?.lineItems as Record<string, unknown>[] | undefined)

    try {
      if (qtyUpdates.length > 0) {
        await updateBom.mutateAsync({ id, updateLineItems: qtyUpdates })
      }
      const result = await checkoutBom.mutateAsync({ id, items })
      toast.success("All materials checked out")
      if (result?.data?.warnings?.insufficientStock?.length > 0) {
        toast.warning(`Low stock warning: ${result.data.warnings.insufficientStock.join(", ")} may have insufficient inventory`)
      }
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

    const qtyUpdates = buildQtyUpdates(items, bom?.lineItems as Record<string, unknown>[] | undefined)

    try {
      if (qtyUpdates.length > 0) {
        await updateBom.mutateAsync({ id, updateLineItems: qtyUpdates })
      }
      const result = await checkoutBom.mutateAsync({ id, items })
      toast.success("Materials pulled from inventory")
      if (result?.data?.warnings?.insufficientStock?.length > 0) {
        toast.warning(`Low stock warning: ${result.data.warnings.insufficientStock.join(", ")} may have insufficient inventory`)
      }
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
        <Header title="BOM Detail" showMenu />
        <div className="text-center py-12 text-text-muted">Loading...</div>
      </div>
    )
  }

  if (!bom) {
    return (
      <div>
        <Header title="BOM Detail" showMenu />
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

  // Build checkout items for CheckoutAllButton — exclude panel items (they use panel checkout)
  const checkoutItems = allItems
    .filter((item) => {
      const specs = item.nonCatalogSpecs as Record<string, unknown> | null
      return specs?.type !== "panel"
    })
    .map((item) => {
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

  const BOM_LIFECYCLE = ["Draft", "Approved", "In Progress", "Completed"]
  const bomStepIndex = bom.status === "CANCELLED" ? -1
    : bom.status === "COMPLETED" ? 3
    : bom.status === "IN_PROGRESS" ? 2
    : bom.status === "APPROVED" ? 1
    : 0

  return (
    <div>
      <Header title="BOM Detail" showMenu />

      <div className="px-4 pt-2">
        <StepProgress steps={BOM_LIFECYCLE} currentStep={bomStepIndex} />
      </div>

      {mode !== "view" && (
        <div className={cn(
          "mx-4 mt-1 px-3 py-1.5 rounded-lg text-sm font-medium",
          mode === "edit" && "bg-brand-blue/10 text-brand-blue",
          mode === "add-material" && "bg-brand-orange/10 text-brand-orange",
          mode === "return" && "bg-status-green/10 text-status-green",
        )}>
          {mode === "edit" ? "Editing BOM" : mode === "add-material" ? "Adding & Checking Out Materials" : "Returning Materials"}
        </div>
      )}

      <div className="p-4 space-y-3 pb-48">
        {/* Job Info */}
        <Card className="px-4 py-3 rounded-xl border-border-custom">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy leading-tight">{bom.jobName}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-text-muted">
                {bom.jobNumber && <span>Job #{bom.jobNumber}</span>}
                <span>{bom.createdBy.name}</span>
                <span>{new Date(bom.createdAt).toLocaleDateString()}</span>
                {bom.approvedBy && (
                  <span className="text-status-green">Approved by {bom.approvedBy.name}</span>
                )}
              </div>
            </div>
            <BomStatusBadge status={bom.status} />
          </div>
          {bom.notes && (
            <p className="text-xs text-text-secondary bg-surface-secondary px-2.5 py-2 rounded-lg mt-2">{bom.notes}</p>
          )}
        </Card>

        {/* Line Items */}
        <Card className="px-4 py-3 rounded-xl border-border-custom">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-navy">
              {mode === "return" ? "Return Material" : `Items (${visibleItems.length})`}
            </h3>
            {canEdit && mode === "view" && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("edit")}
                className="h-12 px-4 text-brand-blue font-semibold"
              >
                <Pencil className="h-4 w-4 mr-1.5" />
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
                <Mic className="h-4 w-4 text-brand-orange" />
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
            const specs = item.nonCatalogSpecs as Record<string, unknown> | null
            const isPanelItem = specs?.type === "panel"

            return (
              <div key={lineId}>
              <BomLineItemRow
                name={
                  (item.isNonCatalog as boolean)
                    ? (item.nonCatalogName as string) || "Non-catalog item"
                    : (product?.name as string) || "Unknown"
                }
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
                fabricationSource={item.fabricationSource as string | null}
                onFabricationSourceChange={mode === "edit" ? async (source) => {
                  try {
                    await updateBom.mutateAsync({
                      id,
                      updateLineItems: [{ id: lineId, qtyNeeded: displayQty }],
                    })
                    // For now, we update the fabrication source via a separate call
                    // The updateBom hook doesn't support fabricationSource yet,
                    // so we use a direct fetch
                    await fetch(`/api/boms/${id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        updateLineItems: [{ id: lineId, fabricationSource: source }],
                      }),
                    })
                    toast.success(source === "RSNE_MADE" ? "Set to in-house" : "Set to supplier")
                  } catch {
                    toast.error("Failed to update sourcing")
                  }
                } : undefined}
              />
              {/* Panel checkout button */}
              {isPanelItem && canCheckout && mode === "view" && ["APPROVED", "IN_PROGRESS"].includes(bom.status) && (
                (() => {
                  const panelQtyNeeded = Number(item.qtyNeeded)
                  const panelQtyCheckedOut = Number(item.qtyCheckedOut || 0)
                  const panelRemaining = panelQtyNeeded - panelQtyCheckedOut
                  if (panelRemaining <= 0) return null
                  return (
                    <button
                      type="button"
                      onClick={() => setPanelCheckoutItem(lineId)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 -mt-1 mb-2 rounded-lg bg-brand-orange/10 text-brand-orange text-sm font-semibold hover:bg-brand-orange/20 transition-colors"
                    >
                      <Layers className="h-4 w-4" />
                      Check Out Panels ({panelRemaining} remaining)
                    </button>
                  )
                })()
              )}
              </div>
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

        {/* Action buttons — view mode (sticky bottom bar) */}
        {mode === "view" && (
          <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-border-custom shadow-[0_-2px_8px_rgba(0,0,0,0.06)] p-4 space-y-2">
            {/* Draft actions */}
            {bom.status === "DRAFT" && (
              <>
                {canApprove ? (
                  <Button
                    onClick={() => handleStatusChange("APPROVED")}
                    disabled={updateBom.isPending}
                    className="w-full h-14 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold text-base"
                  >
                    {updateBom.isPending ? "Approving..." : "Approve BOM"}
                  </Button>
                ) : (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-blue/5 border border-brand-blue/20">
                    <Info className="h-4 w-4 text-brand-blue shrink-0 mt-0.5" />
                    <p className="text-sm text-brand-blue">This BOM needs approval from an Admin or Office Manager.</p>
                  </div>
                )}
                <Button
                  onClick={() => handleStatusChange("CANCELLED")}
                  disabled={updateBom.isPending}
                  className="w-full h-12 bg-status-red hover:bg-status-red/90 text-white font-semibold"
                >
                  {updateBom.isPending ? "Cancelling..." : "Cancel BOM"}
                </Button>
              </>
            )}

            {/* Confirmation dialogs rendered at bottom of component */}

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
                  className="w-full h-12 border-2 border-brand-blue text-brand-blue hover:bg-brand-blue/5 font-semibold text-[15px]"
                >
                  <Plus className="h-5 w-5 mr-1.5" />
                  Adjust & Check Out
                </Button>
              </>
            )}

            {/* Approved — role-based message for non-checkout users */}
            {bom.status === "APPROVED" && !canCheckout && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-blue/5 border border-brand-blue/20">
                <Info className="h-4 w-4 text-brand-blue shrink-0 mt-0.5" />
                <p className="text-sm text-brand-blue">This BOM is approved and ready for checkout by a Shop Foreman or Admin.</p>
              </div>
            )}

            {/* In Progress — Check Out All + add material + return + complete */}
            {bom.status === "IN_PROGRESS" && canCheckout && (
              <>
                <CheckoutAllButton
                  items={checkoutItems}
                  onCheckoutAll={handleCheckoutAll}
                  isPending={checkoutBom.isPending}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={() => setMode("add-material")}
                    className="flex-1 h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-[15px]"
                  >
                    <Plus className="h-5 w-5 mr-1.5" />
                    Add Material
                  </Button>
                  {hasOutstandingMaterial && (
                    <Button
                      onClick={() => setMode("return")}
                      variant="outline"
                      className="flex-1 h-12 border-2 border-brand-blue text-brand-blue hover:bg-brand-blue/5 font-semibold text-[15px]"
                    >
                      <Undo2 className="h-5 w-5 mr-1.5" />
                      Return
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => handleStatusChange("COMPLETED")}
                  disabled={updateBom.isPending}
                  variant="outline"
                  className="w-full h-12 text-status-green border-2 border-status-green/30 hover:bg-status-green/5 font-semibold"
                >
                  {updateBom.isPending ? "Completing..." : "Mark Completed"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Dialogs removed — status changes are direct actions with toast confirmation */}

      {/* Panel Checkout Sheet */}
      {panelCheckoutItem && (() => {
        const item = allItems.find(i => (i.id as string) === panelCheckoutItem)
        if (!item) return null
        const specs = item.nonCatalogSpecs as Record<string, unknown> | null
        if (!specs || specs.type !== "panel") return null
        return (
          <PanelCheckoutSheet
            open={true}
            onOpenChange={(open) => { if (!open) setPanelCheckoutItem(null) }}
            bomId={id}
            lineItemId={panelCheckoutItem}
            panelSpecs={specs as { type: "panel"; thickness: number; cutLengthFt: number; cutLengthDisplay: string; widthIn: number; profile: string; color: string }}
            qtyNeeded={Number(item.qtyNeeded)}
            qtyCheckedOut={Number(item.qtyCheckedOut || 0)}
          />
        )
      })()}
    </div>
  )
}
