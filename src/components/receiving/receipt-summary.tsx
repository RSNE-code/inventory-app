"use client"

import { useEffect, useMemo } from "react"
import { PackageCheck, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ConfirmedReceivingItem } from "@/lib/ai/types"

interface ReceiptSummaryProps {
  supplier: { id: string; name: string }
  items: ConfirmedReceivingItem[]
  notes: string
  onNotesChange: (notes: string) => void
  onConfirm: () => void
  isSubmitting: boolean
}

export function ReceiptSummary({
  supplier,
  items,
  notes,
  onNotesChange,
  onConfirm,
  isSubmitting,
}: ReceiptSummaryProps) {
  const panelItems = items.filter((i) => i.isPanelBreakout)
  const nonPanelCatalogItems = items.filter((i) => !i.isPanelBreakout && !i.isNonCatalog)
  const nonCatalogItems = items.filter((i) => i.isNonCatalog)

  // Group panel items by brand+thickness+color+profile
  const panelGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        brand: string
        thickness: number
        color: string
        width: number
        profile: string
        items: ConfirmedReceivingItem[]
      }
    >()

    for (const item of panelItems) {
      const key = `${item.panelBrand}-${item.panelThickness}-${item.panelColor}-${item.panelProfile ?? ""}`
      if (!groups.has(key)) {
        groups.set(key, {
          brand: item.panelBrand ?? "",
          thickness: item.panelThickness ?? 0,
          color: item.panelColor ?? "",
          width: item.panelWidth ?? 0,
          profile: item.panelProfile ?? "",
          items: [],
        })
      }
      groups.get(key)!.items.push(item)
    }

    return Array.from(groups.values())
  }, [panelItems])

  // Auto-append panel color to notes
  useEffect(() => {
    if (panelGroups.length === 0) return

    const colorLines = panelGroups.map(
      (g) => `Panel: ${g.color}${g.profile ? ` / ${g.profile}` : ""} (${g.brand} ${g.thickness}")`
    )
    const colorText = colorLines.join("; ")

    // Only append if not already present
    if (!notes.includes("Panel:") && !notes.includes("Panel color:")) {
      const updated = notes.trim()
        ? `${notes.trim()}\n\n${colorText}`
        : colorText
      onNotesChange(updated)
    }
  }, [panelGroups.length]) // Only run when groups change, not on every render

  return (
    <div className="space-y-4">
      <Card className="p-5 rounded-xl border-border-custom">
        <h3 className="font-semibold text-navy mb-3">Receipt Summary</h3>

        {/* Supplier */}
        <div className="flex items-center justify-between py-2 border-b border-border-custom/40">
          <span className="text-sm text-text-secondary">Supplier</span>
          <span className="text-sm font-medium text-navy">{supplier.name}</span>
        </div>

        {/* Panel breakout groups */}
        {panelGroups.map((group, gi) => {
          const totalPanels = group.items.reduce((s, i) => s + i.quantity, 0)
          const totalSqFt = group.items.reduce((s, i) => {
            const h = i.panelHeight ?? 0
            const w = i.panelWidth ?? 0
            return s + i.quantity * h * (w / 12)
          }, 0)

          return (
            <div key={gi} className="mt-3">
              {/* Group header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10">
                  <Layers className="h-3.5 w-3.5 text-brand-blue" />
                </div>
                <span className="text-sm font-bold text-navy">
                  {group.brand} {group.thickness}&quot; Panels
                </span>
                {group.color && (
                  <span className="text-xs font-bold text-text-muted px-2 py-0.5 rounded-full bg-surface-secondary">
                    {group.color}
                  </span>
                )}
              </div>

              {/* Size rows */}
              <div className="space-y-1 pl-8">
                {group.items
                  .sort((a, b) => (a.panelHeight ?? 0) - (b.panelHeight ?? 0))
                  .map((item, i) => {
                    const sqFt = (item.panelHeight ?? 0) * ((item.panelWidth ?? 0) / 12) * item.quantity
                    return (
                      <div
                        key={`panel-${gi}-${i}`}
                        className="flex items-center justify-between py-1.5 border-b border-border-custom/40"
                      >
                        <span className="text-sm text-text-primary">
                          {item.panelHeight}&apos; tall
                        </span>
                        <span className="text-sm font-bold text-navy tabular-nums">
                          {item.quantity} panel{item.quantity !== 1 ? "s" : ""}
                          <span className="text-text-muted font-medium ml-1.5">
                            ({Math.round(sqFt).toLocaleString()} ft&sup2;)
                          </span>
                        </span>
                      </div>
                    )
                  })}
              </div>

              {/* Group total */}
              <div className="flex items-center justify-between pl-8 pt-1.5 mt-1">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wide">
                  Subtotal
                </span>
                <span className="text-sm font-bold text-navy tabular-nums">
                  {totalPanels} panels &middot;{" "}
                  {Math.round(totalSqFt).toLocaleString()} ft&sup2;
                </span>
              </div>
            </div>
          )
        })}

        {/* Non-panel catalog items */}
        <div className="mt-3 space-y-2">
          {nonPanelCatalogItems.map((item, i) => (
            <div
              key={`${item.productId}-${i}`}
              className="flex items-center justify-between py-2 border-b border-border-custom/40"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy truncate">
                  {item.productName}
                </p>
              </div>
              <span className="text-sm font-bold text-navy ml-3 tabular-nums">
                {item.quantity} {item.unitOfMeasure}
              </span>
            </div>
          ))}

          {nonCatalogItems.length > 0 && (
            <>
              <p className="text-xs text-text-muted pt-2">Non-catalog items (logged only)</p>
              {nonCatalogItems.map((item, i) => (
                <div
                  key={`nc-${i}`}
                  className="flex items-center justify-between py-2 border-b border-border-custom/40 opacity-60"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{item.productName}</p>
                  </div>
                  <span className="text-sm text-text-secondary ml-3 tabular-nums">
                    {item.quantity} {item.unitOfMeasure}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Item count */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-border-custom">
          <span className="text-sm font-semibold text-text-primary">Total</span>
          <span className="text-sm font-semibold text-navy">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
      </Card>

      {/* Notes */}
      <Card className="p-5 rounded-xl border-border-custom space-y-2">
        <label className="text-sm font-medium text-navy">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Optional delivery notes..."
          className="w-full rounded-xl border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
      </Card>

      {/* Confirm */}
      <Button
        onClick={onConfirm}
        disabled={isSubmitting || items.length === 0}
        className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
      >
        <PackageCheck className="h-5 w-5 mr-2" />
        {isSubmitting
          ? "Processing..."
          : `Confirm Receipt (${items.length} item${items.length !== 1 ? "s" : ""})`}
      </Button>
    </div>
  )
}
