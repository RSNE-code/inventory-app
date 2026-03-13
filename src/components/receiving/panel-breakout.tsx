"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  X,
  Plus,
  Minus,
  AlertTriangle,
  ChevronDown,
  PackageCheck,
  Layers,
  Palette,
  Ruler,
  Gauge,
  LayoutGrid,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  PANEL_BRANDS,
  PANEL_COLORS,
  PANEL_THICKNESSES,
  PANEL_PROFILES,
  COMMON_HEIGHTS,
  BUNDLE_SIZES,
  panelSqFt,
  buildPanelProductName,
} from "@/lib/panels"

// ─── Types ───

export interface PanelProduct {
  id: string
  name: string
  height: number
  width: number
  unitOfMeasure: string
  currentQty: number
  lastCost: number
}

export interface PanelBreakoutItem {
  productId: string | null
  productName: string
  height: number
  quantity: number
  sqFt: number
  unitCost: number
  unitOfMeasure: string
  color: string
  width: number
  profile: string
  thickness: number
  isAutoCreate?: boolean
}

interface SizeRow {
  id: string
  height: number | null
  bundles: string
  panels: string
}

interface PanelBreakoutProps {
  brand: string
  thickness: number
  width: number
  color?: string
  profile?: string
  poSqFt?: number
  availableProducts: PanelProduct[]
  onConfirm: (items: PanelBreakoutItem[]) => void
  onCancel: () => void
  onThicknessChange?: (thickness: number) => void
  initialRows?: Array<{ height: number; quantity: number }>
}

// ─── Component ───

export function PanelBreakout({
  brand,
  thickness: initialThickness,
  width: initialWidth,
  color: initialColor,
  profile: initialProfile,
  poSqFt,
  availableProducts,
  onConfirm,
  onCancel,
  onThicknessChange,
  initialRows,
}: PanelBreakoutProps) {
  const brandConfig = PANEL_BRANDS[brand as keyof typeof PANEL_BRANDS]
  const brandColors = PANEL_COLORS[brand] ?? []

  const [selectedThickness, setSelectedThickness] = useState(initialThickness)
  const [selectedWidth, setSelectedWidth] = useState(initialWidth)
  const [selectedColor, setSelectedColor] = useState(
    initialColor ?? brandColors[0] ?? ""
  )
  const [selectedProfile, setSelectedProfile] = useState(
    initialProfile ?? "Mesa"
  )
  const [rows, setRows] = useState<SizeRow[]>([])
  const [activeWarningId, setActiveWarningId] = useState<string | null>(null)
  const [showThicknessPicker, setShowThicknessPicker] = useState(false)
  const [showWidthPicker, setShowWidthPicker] = useState(false)
  const [showProfilePicker, setShowProfilePicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const lastAddedRef = useRef<string | null>(null)
  const panelsPerBundle = BUNDLE_SIZES[selectedThickness] ?? 0

  // Available widths from brand config
  const availableWidths = brandConfig?.widths ?? [initialWidth]

  // Build product lookup: height → product
  const productByHeight = new Map<number, PanelProduct>()
  for (const p of availableProducts) {
    // Match products to current selected width
    if (p.width === selectedWidth || Math.abs(p.width - selectedWidth) < 0.5) {
      productByHeight.set(p.height, p)
    }
  }

  // All selectable heights: 1ft increments from 8 to 60
  const allHeights = Array.from({ length: 53 }, (_, i) => i + 8)

  // Heights already used in rows
  const usedHeights = new Set(rows.map((r) => r.height).filter((h): h is number => h !== null))

  // Scroll to the last added row (no focus — avoids keyboard popup on mobile)
  useEffect(() => {
    if (lastAddedRef.current) {
      const el = document.getElementById(`panels-${lastAddedRef.current}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
      lastAddedRef.current = null
    }
  }, [rows.length])

  // Populate from initialRows (voice/text parse results)
  const initialRowsRef = useRef<Array<{ height: number; quantity: number }> | undefined>(undefined)
  useEffect(() => {
    if (!initialRows || initialRows.length === 0) return
    // Only process when initialRows actually changes
    if (initialRowsRef.current === initialRows) return
    initialRowsRef.current = initialRows

    setRows((prev) => {
      const heightMap = new Map(prev.map((r) => [r.height, r]))
      const newRows = [...prev]

      for (const ir of initialRows) {
        const existing = heightMap.get(ir.height)
        if (existing) {
          // Update existing row's quantity (voice is authoritative)
          const bundles = panelsPerBundle > 0 ? String(Math.round(ir.quantity / panelsPerBundle * 10) / 10) : ""
          const idx = newRows.findIndex((r) => r.id === existing.id)
          if (idx >= 0) {
            newRows[idx] = { ...newRows[idx], panels: String(ir.quantity), bundles }
          }
        } else {
          // Add new row
          const id = crypto.randomUUID()
          const bundles = panelsPerBundle > 0 ? String(Math.round(ir.quantity / panelsPerBundle * 10) / 10) : ""
          newRows.push({ id, height: ir.height, panels: String(ir.quantity), bundles })
        }
      }

      return newRows
    })
  }, [initialRows, panelsPerBundle])

  function addRow(height?: number) {
    const id = crypto.randomUUID()
    lastAddedRef.current = id
    setRows((prev) => [
      ...prev,
      { id, height: height ?? null, bundles: "", panels: height ? "1" : "" },
    ])
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function updateRow(id: string, updates: Partial<SizeRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updated = { ...r, ...updates }

        // If bundles changed, auto-calculate panels
        if ("bundles" in updates && panelsPerBundle > 0) {
          const bdl = parseFloat(updates.bundles ?? "")
          if (!isNaN(bdl) && bdl > 0) {
            updated.panels = String(Math.round(bdl * panelsPerBundle))
          }
        }

        return updated
      })
    )
  }

  // Calculate totals
  const rowData = rows.map((r) => {
    const panels = parseInt(r.panels, 10) || 0
    const height = r.height ?? 0
    const sq = panels * panelSqFt(height, selectedWidth)
    const product = height ? productByHeight.get(height) : undefined
    const hasProduct = !!product
    return { ...r, panelCount: panels, sqFt: sq, product, hasProduct }
  })

  const totalPanels = rowData.reduce((s, r) => s + r.panelCount, 0)
  const totalSqFtValue = rowData.reduce((s, r) => s + r.sqFt, 0)
  const hasAnyWarning = rowData.some(
    (r) => r.height !== null && r.panelCount > 0 && !r.hasProduct
  )
  const canConfirm =
    totalPanels > 0 && rows.every((r) => r.height !== null)

  // PO comparison
  const sqFtRatio = poSqFt && poSqFt > 0 ? totalSqFtValue / poSqFt : null
  const tallyColor =
    sqFtRatio === null
      ? "text-text-muted"
      : sqFtRatio >= 0.95 && sqFtRatio <= 1.05
        ? "text-status-green"
        : sqFtRatio > 1.2
          ? "text-status-red"
          : "text-brand-orange"

  function handleConfirm() {
    const items: PanelBreakoutItem[] = rowData
      .filter((r) => r.panelCount > 0 && r.height !== null)
      .map((r) => ({
        productId: r.product?.id ?? null,
        productName:
          r.product?.name ??
          buildPanelProductName(brand, r.height!, selectedWidth, selectedThickness),
        height: r.height!,
        quantity: r.panelCount,
        sqFt: r.sqFt,
        unitCost: r.product?.lastCost ?? 0,
        unitOfMeasure: r.product?.unitOfMeasure ?? "sq ft",
        color: selectedColor,
        width: selectedWidth,
        profile: selectedProfile,
        thickness: selectedThickness,
        isAutoCreate: !r.product,
      }))

    onConfirm(items)
  }

  return (
    <div className="rounded-xl border border-border-custom overflow-hidden shadow-brand-md animate-fade-in-up">
      {/* ─── Context Header ─── */}
      <div className="bg-navy px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <Layers className="h-4.5 w-4.5 text-white/80" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-extrabold text-white tracking-tight">
              {brand}{" "}
              <span className="text-white/50 font-bold">&middot;</span>{" "}
              {selectedThickness}&quot; Panels
            </p>
            <p className="text-xs text-white/50 font-medium mt-0.5">
              Break out sizes from PO line item
            </p>
          </div>
        </div>

        {/* Attribute selectors — row 1: Thickness + Width */}
        <div className="flex items-center gap-2 mt-3 pl-12">
          {/* Thickness pill */}
          <button
            type="button"
            onClick={() => {
              setShowThicknessPicker(!showThicknessPicker)
              setShowWidthPicker(false)
              setShowProfilePicker(false)
              setShowColorPicker(false)
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold transition-all",
              showThicknessPicker
                ? "bg-brand-blue text-white"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            )}
          >
            <Gauge className="h-3 w-3" />
            {selectedThickness}&quot;
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showThicknessPicker && "rotate-180"
              )}
            />
          </button>

          {/* Width pill */}
          <button
            type="button"
            onClick={() => {
              setShowWidthPicker(!showWidthPicker)
              setShowThicknessPicker(false)
              setShowProfilePicker(false)
              setShowColorPicker(false)
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold transition-all",
              showWidthPicker
                ? "bg-brand-blue text-white"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            )}
          >
            <Ruler className="h-3 w-3" />
            {selectedWidth}&quot;
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showWidthPicker && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Attribute selectors — row 2: Profile + Color */}
        <div className="flex items-center gap-2 mt-2 pl-12">
          {/* Profile pill */}
          <button
            type="button"
            onClick={() => {
              setShowProfilePicker(!showProfilePicker)
              setShowThicknessPicker(false)
              setShowWidthPicker(false)
              setShowColorPicker(false)
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold transition-all",
              showProfilePicker
                ? "bg-brand-blue text-white"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            )}
          >
            <LayoutGrid className="h-3 w-3" />
            {selectedProfile}
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showProfilePicker && "rotate-180"
              )}
            />
          </button>

          {/* Color pill */}
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker)
              setShowThicknessPicker(false)
              setShowWidthPicker(false)
              setShowProfilePicker(false)
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold transition-all",
              showColorPicker
                ? "bg-brand-blue text-white"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            )}
          >
            <Palette className="h-3 w-3" />
            {selectedColor || "Color"}
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showColorPicker && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Thickness picker dropdown */}
        {showThicknessPicker && (
          <div className="mt-2 pl-12 flex flex-wrap gap-1.5 animate-fade-in">
            {PANEL_THICKNESSES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setSelectedThickness(t)
                  setShowThicknessPicker(false)
                  onThicknessChange?.(t)
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                  t === selectedThickness
                    ? "bg-brand-blue text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                )}
              >
                {t}&quot;
              </button>
            ))}
          </div>
        )}

        {/* Width picker dropdown */}
        {showWidthPicker && (
          <div className="mt-2 pl-12 flex flex-wrap gap-1.5 animate-fade-in">
            {availableWidths.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  setSelectedWidth(w)
                  setShowWidthPicker(false)
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                  w === selectedWidth
                    ? "bg-brand-blue text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                )}
              >
                {w}&quot;
              </button>
            ))}
          </div>
        )}

        {/* Profile picker dropdown */}
        {showProfilePicker && (
          <div className="mt-2 pl-12 flex flex-wrap gap-1.5 animate-fade-in">
            {PANEL_PROFILES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setSelectedProfile(p)
                  setShowProfilePicker(false)
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                  p === selectedProfile
                    ? "bg-brand-blue text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Color picker dropdown */}
        {showColorPicker && (
          <div className="mt-2 pl-12 flex flex-wrap gap-1.5 animate-fade-in">
            {brandColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setSelectedColor(c)
                  setShowColorPicker(false)
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                  c === selectedColor
                    ? "bg-brand-blue text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Quick Add Buttons ─── */}
      <div className="px-4 py-3 border-b border-border-custom bg-surface-secondary/50">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.1em] mb-2">
          Quick Add
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMON_HEIGHTS.map((h) => {
            const isUsed = usedHeights.has(h)
            const hasProduct = productByHeight.has(h)
            return (
              <button
                key={h}
                type="button"
                disabled={isUsed}
                onClick={() => addRow(h)}
                className={cn(
                  "relative h-11 min-w-[3.5rem] px-4 rounded-xl text-base font-extrabold transition-all active:scale-95",
                  isUsed
                    ? "bg-surface-secondary text-text-muted/30 cursor-not-allowed"
                    : hasProduct
                      ? "bg-white border-2 border-brand-blue/20 text-navy hover:border-brand-blue/40 hover:bg-brand-blue/5 shadow-sm"
                      : "bg-white border-2 border-dashed border-border-custom text-text-muted hover:border-brand-orange/40"
                )}
              >
                {h}&apos;
                {isUsed && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-status-green flex items-center justify-center shadow-sm">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Size Rows ─── */}
      <div className="divide-y divide-border-custom/40">
        {/* Column header — widths match row inputs exactly */}
        {rows.length > 0 && (
          <div className="flex items-center px-4 py-2 bg-surface-secondary/30 text-[11px] font-bold text-text-muted uppercase tracking-[0.08em] gap-2">
            <span className="w-[4.5rem]">Height</span>
            {panelsPerBundle > 0 && (
              <span className="w-[4.5rem] text-center">Bdls</span>
            )}
            {panelsPerBundle > 0 && (
              <span className="w-3 shrink-0" /> /* arrow spacer */
            )}
            <span className="w-[4.5rem] text-center">Panels</span>
            <span className="flex-1 text-right">Sq Ft</span>
          </div>
        )}

        {rowData.map((row, idx) => (
          <SizeRowInput
            key={row.id}
            row={row}
            index={idx}
            allHeights={allHeights}
            usedHeights={usedHeights}
            productByHeight={productByHeight}
            panelsPerBundle={panelsPerBundle}
            selectedWidth={selectedWidth}
            onUpdate={(updates) => updateRow(row.id, updates)}
            onRemove={() => removeRow(row.id)}
            onAddNext={() => addRow()}
            showWarning={activeWarningId === row.id}
            onToggleWarning={(show) => setActiveWarningId(show ? row.id : null)}
          />
        ))}

        {/* Add size button */}
        <button
          type="button"
          onClick={() => addRow()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-brand-blue hover:text-brand-blue-bright hover:bg-brand-blue/5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add size
        </button>
      </div>

      {/* ─── Running Tally ─── */}
      <div className="sticky bottom-0 bg-surface-secondary border-t border-border-custom px-4 py-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-navy tabular-nums">
              {totalPanels}
            </span>
            <span className="text-sm font-bold text-text-muted">
              panel{totalPanels !== 1 ? "s" : ""}
            </span>
            <span className="text-text-muted/40 font-bold">&middot;</span>
            <span className="text-base font-extrabold text-navy tabular-nums">
              {Math.round(totalSqFtValue).toLocaleString()}
            </span>
            <span className="text-sm font-bold text-text-muted">sq ft</span>
          </div>

          {poSqFt != null && poSqFt > 0 && (
            <div className={cn("text-sm font-bold tabular-nums", tallyColor)}>
              of {Math.round(poSqFt).toLocaleString()} on PO
            </div>
          )}
        </div>

        {/* Progress bar */}
        {poSqFt != null && poSqFt > 0 && (
          <div className="mt-2 h-1.5 rounded-full bg-border-custom/50 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                sqFtRatio !== null && sqFtRatio >= 0.95 && sqFtRatio! <= 1.05
                  ? "bg-status-green"
                  : sqFtRatio !== null && sqFtRatio > 1.2
                    ? "bg-status-red"
                    : "bg-brand-orange"
              )}
              style={{
                width: `${Math.min(100, ((totalSqFtValue / poSqFt) * 100))}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* ─── Actions ─── */}
      <div className="px-4 py-3 bg-white border-t border-border-custom space-y-2">
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="w-full h-13 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-base rounded-xl shadow-[0_3px_12px_rgba(232,121,43,0.3)] hover:shadow-[0_4px_16px_rgba(232,121,43,0.4)] disabled:shadow-none transition-all active:scale-[0.98]"
        >
          <PackageCheck className="h-5 w-5 mr-2" />
          Confirm {totalPanels} Panel{totalPanels !== 1 ? "s" : ""}
        </Button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-1.5 transition-colors"
        >
          Cancel breakout
        </button>
      </div>
    </div>
  )
}

// ─── Size Row ───

function SizeRowInput({
  row,
  index,
  allHeights,
  usedHeights,
  productByHeight,
  panelsPerBundle,
  selectedWidth,
  onUpdate,
  onRemove,
  onAddNext,
  showWarning,
  onToggleWarning,
}: {
  row: SizeRow & {
    panelCount: number
    sqFt: number
    product: PanelProduct | undefined
    hasProduct: boolean
  }
  index: number
  allHeights: number[]
  usedHeights: Set<number>
  productByHeight: Map<number, PanelProduct>
  panelsPerBundle: number
  selectedWidth: number
  onUpdate: (updates: Partial<SizeRow>) => void
  onRemove: () => void
  onAddNext: () => void
  showWarning: boolean
  onToggleWarning: (show: boolean) => void
}) {
  const noProduct = row.height !== null && !row.hasProduct && row.panelCount > 0
  const [warningPos, setWarningPos] = useState<{ top: number; right: number } | null>(null)
  const warningBtnRef = useRef<HTMLButtonElement>(null)

  // Swipe-to-delete state
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const swipeThreshold = 80 // px to trigger delete
  const lockedAxisRef = useRef<"x" | "y" | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    lockedAxisRef.current = null
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y

    // Lock axis after 10px of movement
    if (!lockedAxisRef.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
    }

    // Only handle horizontal swipes
    if (lockedAxisRef.current !== "x") return

    // Prevent vertical scroll while swiping horizontally
    e.preventDefault()

    const clampedX = Math.min(0, dx) // only swipe left
    setSwipeX(clampedX)
    if (!isSwiping && clampedX < -10) setIsSwiping(true)
  }

  function handleTouchEnd() {
    if (swipeX < -swipeThreshold) {
      // Animate off-screen then remove
      setSwipeX(-300)
      setTimeout(onRemove, 200)
    } else {
      setSwipeX(0)
    }
    setIsSwiping(false)
    touchStartRef.current = null
    lockedAxisRef.current = null
  }

  // Derived delete zone visibility
  const deleteRevealed = swipeX < -10
  const deleteReady = swipeX < -swipeThreshold

  return (
    <div
      className="relative overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Delete zone (only visible during swipe) */}
      {swipeX < 0 && (
        <div className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end px-5 transition-colors",
          deleteReady ? "bg-status-red" : "bg-status-red/80"
        )}>
          <Trash2 className={cn("h-5 w-5 text-white transition-transform", deleteReady && "scale-110")} />
        </div>
      )}

      {/* Swipeable row content */}
      <div
        className={cn(
          "relative flex items-center px-4 py-3 gap-2 bg-white",
          noProduct && "bg-red-50/50",
          isSwiping ? "" : "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Height selector */}
        <div className="relative w-[4.5rem]">
          <select
            value={row.height ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null
              onUpdate({ height: val })
            }}
            className={cn(
              "w-full h-11 pl-2 pr-6 rounded-xl border-2 text-base font-extrabold appearance-none bg-white transition-colors",
              "[&>option]:font-medium",
              row.height !== null
                ? "border-brand-blue/20 text-navy"
                : "border-border-custom text-text-muted"
            )}
          >
            <option value="">ft</option>
            {allHeights.map((h) => (
              <option
                key={h}
                value={h}
                disabled={h !== row.height && usedHeights.has(h)}
              >
                {h}&apos;
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
        </div>

        {/* Bundle input (only if applicable) */}
        {panelsPerBundle > 0 && (
          <div className="w-[4.5rem]">
            <input
              type="number"
              min={0}
              step={1}
              value={row.bundles}
              onChange={(e) => onUpdate({ bundles: e.target.value })}
              placeholder="0"
              className={cn(
                "w-full h-11 text-center rounded-xl border-2 border-border-custom bg-white text-base font-bold tabular-nums transition-colors",
                "focus:border-brand-blue/40 focus:outline-none",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                row.bundles ? "text-navy" : "text-text-muted"
              )}
            />
          </div>
        )}

        {/* Arrow (visual separator) */}
        {panelsPerBundle > 0 && (
          <span className="w-3 text-center text-text-muted/30 text-xs font-bold shrink-0">
            &rarr;
          </span>
        )}

        {/* Panels input */}
        <div className="w-[4.5rem]">
          <input
            id={`panels-${row.id}`}
            type="number"
            min={0}
            step={1}
            value={row.panels}
            onChange={(e) => onUpdate({ panels: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                onAddNext()
              }
            }}
            placeholder="0"
            className={cn(
              "w-full h-11 text-center rounded-xl border-2 bg-white text-base font-extrabold tabular-nums transition-colors",
              "focus:border-brand-blue/40 focus:outline-none",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              row.panelCount > 0
                ? "border-brand-blue/25 text-navy"
                : "border-border-custom text-text-muted"
            )}
          />
        </div>

        {/* Sq ft + warning indicator */}
        <div className="flex-1 flex items-center justify-end gap-1.5">
          {row.panelCount > 0 && row.height ? (
            <span className="text-sm font-bold text-text-secondary tabular-nums">
              {Math.round(row.sqFt).toLocaleString()}
              <span className="text-text-muted/60 ml-0.5">ft&sup2;</span>
            </span>
          ) : (
            <span className="text-sm text-text-muted/30">&mdash;</span>
          )}
          {noProduct && (
            <button
              ref={warningBtnRef}
              type="button"
              onClick={() => {
                if (!showWarning && warningBtnRef.current) {
                  const rect = warningBtnRef.current.getBoundingClientRect()
                  setWarningPos({
                    top: rect.bottom + 4,
                    right: window.innerWidth - rect.right,
                  })
                }
                onToggleWarning(!showWarning)
              }}
              className="h-7 w-7 flex items-center justify-center rounded-md text-status-red hover:bg-red-50 transition-colors shrink-0"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Hazard tooltip — portaled to document.body so iOS form inputs can't render above it */}
      {showWarning && warningPos && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9999]" onClick={() => onToggleWarning(false)} />
          <div
            className="fixed z-[10000] w-56 px-3 py-2.5 rounded-xl bg-navy text-white text-xs font-medium shadow-2xl animate-fade-in leading-relaxed"
            style={{ top: warningPos.top, right: warningPos.right }}
          >
            <p>This height/width combo doesn&apos;t exist in your catalog yet. When you confirm, the product will be automatically created and inventory will be tracked.</p>
            <button
              type="button"
              onClick={() => onToggleWarning(false)}
              className="mt-1.5 text-white/60 hover:text-white text-[11px] font-bold transition-colors"
            >
              Got it
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
