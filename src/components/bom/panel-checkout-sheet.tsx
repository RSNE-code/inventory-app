"use client"

import { useState, useEffect, useCallback } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn, formatQuantity } from "@/lib/utils"
import {
  PANEL_BRANDS,
  COMMON_HEIGHTS,
  PANEL_HEIGHTS,
  panelSqFt,
} from "@/lib/panels"
import { usePanelCheckout } from "@/hooks/use-boms"
import { toast } from "sonner"
import { Plus, Trash2, PackageCheck, ChevronDown, Scissors, AlertTriangle } from "lucide-react"

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
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const totalPanels = rows.reduce((sum, r) => sum + (r.height ? r.quantity : 0), 0)
  const totalSqFtValue = rows.reduce((sum, r) => {
    if (!r.height) return sum
    return sum + panelSqFt(r.height, panelSpecs.widthIn) * r.quantity
  }, 0)

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
        toast.success(`Checked out ${totalPanels} panels`)
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-navy">Panel Checkout</SheetTitle>
          <SheetDescription>
            {panelSpecs.thickness}" panel × {panelSpecs.cutLengthDisplay} cut — {remaining} panels remaining
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Step 1: Brand Selection */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              1. Confirm Brand
            </p>
            <div className="flex gap-2 flex-wrap">
              {brands.map(brand => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setSelectedBrand(brand)}
                  className={cn(
                    "h-12 px-5 rounded-lg text-[15px] font-semibold transition-all",
                    selectedBrand === brand
                      ? "bg-brand-blue text-white shadow-sm"
                      : "bg-white border border-border-custom text-navy hover:border-brand-blue/40"
                  )}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Height Breakout */}
          {selectedBrand && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                2. Select Stock Heights
              </p>

              {/* Quick-add height buttons */}
              <div className="flex gap-2 flex-wrap mb-3">
                {quickHeights.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => addRow(h)}
                    className="h-12 min-w-12 px-4 rounded-lg text-[15px] font-medium bg-white border border-border-custom text-navy hover:border-brand-blue/40 hover:bg-blue-50 transition-all"
                  >
                    {h}'
                  </button>
                ))}
                {validHeights.length > quickHeights.length && (
                  <button
                    type="button"
                    onClick={() => setShowAllHeights(!showAllHeights)}
                    className="h-12 px-4 rounded-lg text-[15px] font-medium text-brand-blue hover:bg-blue-50 transition-all flex items-center gap-1"
                  >
                    More <ChevronDown className={cn("h-4 w-4 transition-transform", showAllHeights && "rotate-180")} />
                  </button>
                )}
              </div>
              {showAllHeights && moreHeights.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {moreHeights.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => addRow(h)}
                      className="h-12 min-w-12 px-4 rounded-lg text-[15px] font-medium bg-white border border-border-custom text-navy hover:border-brand-blue/40 hover:bg-blue-50 transition-all"
                    >
                      {h}'
                    </button>
                  ))}
                </div>
              )}

              {/* Breakout rows */}
              {rows.length > 0 && (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide px-1">
                    <span className="w-16">Height</span>
                    <span className="w-20 text-center">Panels</span>
                    <span className="flex-1">Stock</span>
                    <span className="w-8" />
                  </div>

                  {rows.map(row => {
                    const sqFtPerPanel = row.height ? panelSqFt(row.height, panelSpecs.widthIn) : 0
                    const sqFtNeeded = sqFtPerPanel * row.quantity
                    const stockKey = selectedBrand && row.height ? `${selectedBrand}-${row.height}` : null
                    const stockSqFt = stockKey ? stockCache[stockKey] : undefined
                    // Convert stock sq ft to panel count for display
                    const stockPanels = stockSqFt !== undefined && stockSqFt !== null && sqFtPerPanel > 0
                      ? Math.floor(stockSqFt / sqFtPerPanel)
                      : null

                    return (
                      <div key={row.id} className="flex items-center gap-2 p-2 bg-surface-secondary rounded-lg">
                        <span className="w-16 text-sm font-semibold text-navy">
                          {row.height ? `${row.height}'` : "—"}
                        </span>

                        <Input
                          type="number"
                          value={row.quantity || ""}
                          onChange={e => updateRowQty(row.id, parseInt(e.target.value) || 0)}
                          className="w-20 h-12 text-center text-sm"
                          min={0}
                          step={1}
                        />

                        <div className="flex-1 text-xs">
                          {stockPanels !== null ? (
                            <span className={cn(
                              "font-medium",
                              stockPanels >= row.quantity ? "text-green-600" : "text-red-500"
                            )}>
                              {stockPanels} panels avail
                            </span>
                          ) : stockSqFt === null ? (
                            <span className="text-amber-500 font-medium">New product</span>
                          ) : (
                            <span className="text-text-muted">Loading...</span>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          className="h-12 w-12 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Running total */}
              {rows.length > 0 && (() => {
                // Calculate waste per row
                const totalWasteSqFt = rows.reduce((sum, r) => {
                  if (!r.height) return sum
                  const wasteFt = r.height - panelSpecs.cutLengthFt
                  return sum + (wasteFt * (panelSpecs.widthIn / 12) * r.quantity)
                }, 0)
                const hasWaste = totalWasteSqFt > 0
                // Warn if any row has excessive waste (stock > cut + 4')
                const excessiveWaste = rows.some(r => r.height && r.height > panelSpecs.cutLengthFt + 4)

                return (
                  <div className="mt-3 p-3 rounded-lg bg-navy/5 border border-navy/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-navy">Panels</span>
                      <div className="text-right">
                        <span className={cn(
                          "text-lg font-bold tabular-nums",
                          totalPanels === remaining ? "text-green-600" :
                          totalPanels > remaining ? "text-red-500" : "text-navy"
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
                            <span>{r.quantity}× {r.height}' stock → {panelSpecs.cutLengthFt}' panels (exact fit)</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Scissors className="h-3 w-3" />
                              {r.quantity}× {r.height}' stock → {panelSpecs.cutLengthFt}' cut ({wasteFt}' drop each)
                            </span>
                          )}
                        </div>
                      )
                    })}

                    {/* Waste summary */}
                    {hasWaste && (
                      <div className={cn(
                        "flex items-center gap-2 text-xs pt-1 border-t border-navy/10",
                        excessiveWaste ? "text-amber-600" : "text-text-muted"
                      )}>
                        {excessiveWaste && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                        <span>
                          Total waste: {formatQuantity(totalWasteSqFt)} sq ft
                          {excessiveWaste && " — consider using shorter stock panels to reduce waste"}
                        </span>
                      </div>
                    )}

                    {totalPanels > remaining && (
                      <p className="text-xs text-red-500">
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
            className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
          >
            <PackageCheck className="h-5 w-5 mr-2" />
            {panelCheckout.isPending
              ? "Processing..."
              : `Check Out ${totalPanels} Panel${totalPanels !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
