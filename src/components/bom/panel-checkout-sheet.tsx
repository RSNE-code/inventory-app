"use client"

import { useState, useEffect, useCallback } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, formatQuantity } from "@/lib/utils"
import {
  PANEL_BRANDS,
  COMMON_HEIGHTS,
  PANEL_HEIGHTS,
  panelSqFt,
} from "@/lib/panels"
import { usePanelCheckout } from "@/hooks/use-boms"
import { useHaptic } from "@/hooks/use-haptic"
import { toast } from "sonner"
import { Trash2, PackageCheck, ChevronDown, Scissors, AlertTriangle, Minus, Plus } from "lucide-react"

interface PanelSpecs {
  type: "panel"
  thickness: number
  cutLengthFt: number
  cutLengthDisplay: string
  widthIn: number
  profile: string
  color: string
}

interface PanelCheckoutSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bomId: string
  lineItemId: string
  panelSpecs: PanelSpecs
  qtyNeeded: number
  qtyCheckedOut: number
}

interface BreakoutRow {
  id: string
  height: number | null
  quantity: number
  availableSqFt?: number
}

// Fetch available stock for a panel product name
async function fetchProductStock(productName: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/products?search=${encodeURIComponent(productName)}&limit=1`)
    if (!res.ok) return null
    const data = await res.json()
    const product = data.data?.find((p: { name: string }) => p.name === productName)
    return product ? Number(product.currentQty) : null
  } catch {
    return null
  }
}

export function PanelCheckoutSheet({
  open,
  onOpenChange,
  bomId,
  lineItemId,
  panelSpecs,
  qtyNeeded,
  qtyCheckedOut,
}: PanelCheckoutSheetProps) {
  const panelCheckout = usePanelCheckout()
  const haptic = useHaptic()
  const remaining = qtyNeeded - qtyCheckedOut

  const brands = Object.keys(PANEL_BRANDS)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [rows, setRows] = useState<BreakoutRow[]>([])
  const [showAllHeights, setShowAllHeights] = useState(false)
  const [stockCache, setStockCache] = useState<Record<string, number | null>>({})

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSelectedBrand(null)
      setRows([])
      setShowAllHeights(false)
      setStockCache({})
    }
  }, [open])

  // Fetch stock for a specific row when brand + height are set
  const fetchStock = useCallback(async (brand: string, height: number) => {
    const key = `${brand}-${height}`
    if (stockCache[key] !== undefined) return
    const productName = `Insulated Metal Panel (${brand})-${height}'-${panelSpecs.widthIn}-${panelSpecs.thickness}`
    const stock = await fetchProductStock(productName)
    setStockCache(prev => ({ ...prev, [key]: stock }))
  }, [stockCache, panelSpecs.widthIn, panelSpecs.thickness])

  // Fetch stock for all rows when brand changes
  useEffect(() => {
    if (!selectedBrand) return
    rows.forEach(row => {
      if (row.height) fetchStock(selectedBrand, row.height)
    })
  }, [selectedBrand, rows, fetchStock])

  function addRow(height: number) {
    haptic.light()
    // If height already exists, increment quantity
    const existing = rows.find(r => r.height === height)
    if (existing) {
      setRows(prev => prev.map(r =>
        r.id === existing.id ? { ...r, quantity: r.quantity + 1 } : r
      ))
      return
    }

    setRows(prev => [...prev, {
      id: crypto.randomUUID(),
      height,
      quantity: 1,
    }])

    if (selectedBrand) {
      fetchStock(selectedBrand, height)
    }
  }

  function updateRowQty(id: string, qty: number) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, quantity: Math.max(0, qty) } : r))
  }

  function removeRow(id: string) {
    haptic.warning()
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const totalPanels = rows.reduce((sum, r) => sum + (r.height ? r.quantity : 0), 0)
  // Minimum stock height that can cover the cut length
  const minHeight = Math.ceil(panelSpecs.cutLengthFt)

  // Filter heights that can accommodate the cut length
  const validHeights = PANEL_HEIGHTS.filter(h => h >= minHeight)
  const quickHeights = COMMON_HEIGHTS.filter(h => h >= minHeight).slice(0, 5)
  const moreHeights = showAllHeights ? validHeights.filter(h => !quickHeights.includes(h)) : []

  async function handleConfirm() {
    if (!selectedBrand) {
      toast.error("Select a brand")
      return
    }
    if (rows.length === 0 || totalPanels === 0) {
      toast.error("Add at least one height row")
      return
    }

    const validRows = rows.filter(r => r.height && r.quantity > 0)
    if (validRows.length === 0) {
      toast.error("Add at least one valid row")
      return
    }

    try {
      const result = await panelCheckout.mutateAsync({
        bomId,
        bomLineItemId: lineItemId,
        brand: selectedBrand,
        width: panelSpecs.widthIn,
        thickness: panelSpecs.thickness,
        breakout: validRows.map(r => ({
          height: r.height!,
          quantity: r.quantity,
        })),
      })

      if (result.data?.warnings?.insufficientStock?.length > 0) {
        toast.warning(`Low stock: ${result.data.warnings.insufficientStock.join(", ")}`)
      } else {
        haptic.success()
        toast.success(`Checked out ${totalPanels} panels`)
      }
      onOpenChange(false)
    } catch (err) {
      haptic.error()
      toast.error(err instanceof Error ? err.message : "Checkout failed")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-2xl p-0 flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-border-custom" />
        </div>

        <SheetHeader className="px-5 pb-3">
          <SheetTitle className="text-lg font-bold text-navy">Panel Checkout</SheetTitle>
          <SheetDescription className="text-sm text-text-muted">
            {panelSpecs.thickness}" panel × {panelSpecs.cutLengthDisplay} cut — {remaining} panels remaining
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="space-y-5">
            {/* Step 1: Brand Selection */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                1. Confirm Brand
              </p>
              <div className="flex gap-2 flex-wrap">
                {brands.map(brand => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => { setSelectedBrand(brand); haptic.light() }}
                    className={cn(
                      "h-12 px-5 rounded-xl text-[15px] font-semibold ios-press transition-all",
                      selectedBrand === brand
                        ? "bg-brand-blue text-white shadow-sm"
                        : "bg-white border border-border-custom text-navy active:border-brand-blue/40"
                    )}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Height Breakout */}
            {selectedBrand && (
              <div className="animate-ios-slide-up">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                  2. Select Stock Heights
                </p>

                {/* Quick-add height buttons */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {quickHeights.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => addRow(h)}
                      className={cn(
                        "h-12 min-w-[48px] px-4 rounded-xl text-[15px] font-medium",
                        "bg-white border border-border-custom text-navy",
                        "active:border-brand-blue/40 active:bg-blue-50",
                        "ios-press transition-all"
                      )}
                    >
                      {h}&prime;
                    </button>
                  ))}
                  {validHeights.length > quickHeights.length && (
                    <button
                      type="button"
                      onClick={() => setShowAllHeights(!showAllHeights)}
                      className="h-12 px-4 rounded-xl text-[15px] font-medium text-brand-blue active:bg-blue-50 ios-press transition-all flex items-center gap-1"
                    >
                      More <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showAllHeights && "rotate-180")} />
                    </button>
                  )}
                </div>
                {showAllHeights && moreHeights.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-4 animate-ios-spring-in">
                    {moreHeights.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => addRow(h)}
                        className={cn(
                          "h-12 min-w-[48px] px-4 rounded-xl text-[15px] font-medium",
                          "bg-white border border-border-custom text-navy",
                          "active:border-brand-blue/40 active:bg-blue-50",
                          "ios-press transition-all"
                        )}
                      >
                        {h}&prime;
                      </button>
                    ))}
                  </div>
                )}

                {/* Breakout rows */}
                {rows.length > 0 && (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-center gap-3 text-xs font-semibold text-text-muted uppercase tracking-wide px-1">
                      <span className="w-14">Height</span>
                      <span className="w-[120px] text-center">Panels</span>
                      <span className="flex-1">Stock</span>
                      <span className="w-11" />
                    </div>

                    {rows.map(row => {
                      const sqFtPerPanel = row.height ? panelSqFt(row.height, panelSpecs.widthIn) : 0
                      const stockKey = selectedBrand && row.height ? `${selectedBrand}-${row.height}` : null
                      const stockSqFt = stockKey ? stockCache[stockKey] : undefined
                      const stockPanels = stockSqFt !== undefined && stockSqFt !== null && sqFtPerPanel > 0
                        ? Math.floor(stockSqFt / sqFtPerPanel)
                        : null

                      return (
                        <div key={row.id} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl animate-ios-spring-in">
                          <span className="w-14 text-[15px] font-bold text-navy tabular-nums">
                            {row.height ? `${row.height}'` : "—"}
                          </span>

                          {/* iOS-style stepper */}
                          <div className="flex items-center gap-0 rounded-xl border border-border-custom overflow-hidden">
                            <button
                              type="button"
                              onClick={() => { updateRowQty(row.id, row.quantity - 1); haptic.light() }}
                              className="h-11 w-11 flex items-center justify-center bg-white text-navy active:bg-surface-secondary transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <div className="h-11 w-12 flex items-center justify-center border-x border-border-custom bg-white">
                              <span className="text-[15px] font-bold text-navy tabular-nums">{row.quantity}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { updateRowQty(row.id, row.quantity + 1); haptic.light() }}
                              className="h-11 w-11 flex items-center justify-center bg-white text-navy active:bg-surface-secondary transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex-1 text-xs">
                            {stockPanels !== null ? (
                              <span className={cn(
                                "font-medium",
                                stockPanels >= row.quantity ? "text-status-green" : "text-status-red"
                              )}>
                                {stockPanels} avail
                              </span>
                            ) : stockSqFt === null ? (
                              <span className="text-amber-500 font-medium">New</span>
                            ) : (
                              <span className="text-text-muted">...</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="h-11 w-11 flex items-center justify-center rounded-xl text-red-400 active:text-red-600 active:bg-status-red/10 ios-press transition-all shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Running total */}
                {rows.length > 0 && (() => {
                  const totalWasteSqFt = rows.reduce((sum, r) => {
                    if (!r.height) return sum
                    const wasteFt = r.height - panelSpecs.cutLengthFt
                    return sum + (wasteFt * (panelSpecs.widthIn / 12) * r.quantity)
                  }, 0)
                  const hasWaste = totalWasteSqFt > 0
                  const excessiveWaste = rows.some(r => r.height && r.height > panelSpecs.cutLengthFt + 4)

                  return (
                    <div className="mt-4 p-4 rounded-xl bg-navy/5 border border-navy/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-navy">Panels</span>
                        <div className="text-right">
                          <span className={cn(
                            "text-xl font-bold tabular-nums",
                            totalPanels === remaining ? "text-status-green" :
                            totalPanels > remaining ? "text-status-red" : "text-navy"
                          )}>
                            {totalPanels}
                          </span>
                          <span className="text-sm text-text-muted ml-1">
                            of {remaining} needed
                          </span>
                        </div>
                      </div>

                      {/* Per-panel breakdown */}
                      {rows.filter(r => r.height && r.quantity > 0).map(r => {
                        const wasteFt = r.height! - panelSpecs.cutLengthFt
                        const isSameHeight = wasteFt === 0
                        return (
                          <div key={r.id} className="flex items-center gap-2 text-xs text-text-muted">
                            {isSameHeight ? (
                              <span>{r.quantity}× {r.height}&prime; stock → {panelSpecs.cutLengthFt}&prime; panels (exact fit)</span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Scissors className="h-3 w-3" />
                                {r.quantity}× {r.height}&prime; stock → {panelSpecs.cutLengthFt}&prime; cut ({wasteFt}&prime; drop each)
                              </span>
                            )}
                          </div>
                        )
                      })}

                      {/* Waste summary */}
                      {hasWaste && (
                        <div className={cn(
                          "flex items-center gap-2 text-xs pt-2 border-t border-navy/10",
                          excessiveWaste ? "text-amber-600" : "text-text-muted"
                        )}>
                          {excessiveWaste && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                          <span>
                            Total waste: {formatQuantity(totalWasteSqFt)} sq ft
                            {excessiveWaste && " — consider shorter stock panels"}
                          </span>
                        </div>
                      )}

                      {totalPanels > remaining && (
                        <p className="text-xs text-status-red font-medium">
                          Exceeds remaining by {totalPanels - remaining} panels
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Defaults reminder */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {panelSpecs.widthIn}" wide
              </Badge>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {panelSpecs.profile}
              </Badge>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {panelSpecs.color}
              </Badge>
            </div>

            {/* Submit */}
            <Button
              onClick={handleConfirm}
              disabled={
                panelCheckout.isPending ||
                !selectedBrand ||
                totalPanels === 0 ||
                totalPanels > remaining
              }
              className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-[15px] rounded-xl ios-press transition-all"
            >
              <PackageCheck className="h-5 w-5 mr-2" />
              {panelCheckout.isPending
                ? "Processing..."
                : `Check Out ${totalPanels} Panel${totalPanels !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
