"use client"

import { useState, useEffect } from "react"
import {
  PackageCheck,
  Minus,
  Plus,
  AlertTriangle,
  FileText,
  Briefcase,
  ArrowLeft,
  Clock,
  ChevronDown,
  Layers,
  Mic,
  MicOff,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { isPanelLineItem, parsePanelContext } from "@/lib/panels"
import { usePanelVoiceInput } from "@/hooks/use-panel-voice"
import { PanelBreakout } from "@/components/receiving/panel-breakout"
import type { PanelBreakoutItem, PanelProduct } from "@/components/receiving/panel-breakout"
import type { MatchedPO, POLineItemData, POReceiptHistoryItem, ConfirmedReceivingItem } from "@/lib/ai/types"

interface POReceiveCardProps {
  po: MatchedPO
  onConfirm: (items: ConfirmedReceivingItem[]) => void
  onBack: () => void
}

export function POReceiveCard({ po, onConfirm, onBack }: POReceiveCardProps) {
  const [quantities, setQuantities] = useState<number[]>(() =>
    po.lineItems.map((li) => Math.max(0, li.qtyOrdered - li.qtyReceived))
  )

  // Panel breakout state
  const [panelBreakoutLine, setPanelBreakoutLine] = useState<string | null>(null)
  const [panelBreakoutResults, setPanelBreakoutResults] = useState<
    Record<string, PanelBreakoutItem[]>
  >({})
  const [panelProducts, setPanelProducts] = useState<PanelProduct[]>([])
  const [panelContext, setPanelContext] = useState<
    Record<string, { brand: string; thickness: number; width: number; color?: string }>
  >({})
  const [panelProductsLoading, setPanelProductsLoading] = useState(false)
  const [voicePanelRows, setVoicePanelRows] = useState<
    Record<string, Array<{ height: number; quantity: number }>>
  >({})

  // Detect panel line items and parse context on mount
  useEffect(() => {
    const contexts: Record<
      string,
      { brand: string; thickness: number; width: number; color?: string }
    > = {}

    for (const li of po.lineItems) {
      if (isPanelLineItem(li)) {
        const text = `${li.productName ?? ""} ${li.description ?? ""}`
        const ctx = parsePanelContext(text)
        if (ctx.brand && ctx.thickness) {
          contexts[li.id] = {
            brand: ctx.brand,
            thickness: ctx.thickness,
            width: ctx.width ?? 44,
            color: ctx.color,
          }
        }
      }
    }

    setPanelContext(contexts)

    // Fetch panel products for detected brands/thicknesses
    const entries = Object.values(contexts)
    if (entries.length > 0) {
      const first = entries[0]
      setPanelProductsLoading(true)
      fetch(
        `/api/products/panels?brand=${encodeURIComponent(first.brand)}&thickness=${first.thickness}`
      )
        .then((res) => res.json())
        .then((json) => {
          setPanelProducts(json.data ?? [])
        })
        .catch(() => {
          // Silent fail — breakout will show warning
        })
        .finally(() => setPanelProductsLoading(false))
    }
  }, [po.lineItems])

  function updateQty(index: number, qty: number) {
    setQuantities((prev) => prev.map((q, i) => (i === index ? Math.max(0, qty) : q)))
  }

  const hasBreakout = (liId: string) => (panelBreakoutResults[liId]?.length ?? 0) > 0
  const isPanel = (liId: string) => liId in panelContext

  // Count items to receive: non-panel items with qty > 0, plus panel items with breakout results
  const itemsToReceiveCount =
    po.lineItems.filter((li, i) => {
      if (isPanel(li.id)) return hasBreakout(li.id)
      return quantities[i] > 0
    }).length

  // Filter to only non-voided receipts with items
  const activeReceipts = (po.receipts ?? []).filter((r) => !r.isVoided && r.items.length > 0)

  // Auto-expand breakout for single panel line items (UX fix C1)
  const panelLineIds = Object.keys(panelContext)
  useEffect(() => {
    if (panelLineIds.length === 1 && !panelProductsLoading && panelProducts.length > 0) {
      setPanelBreakoutLine(panelLineIds[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelProductsLoading, panelProducts.length])

  function handleThicknessChange(lineItemId: string, newThickness: number) {
    // Update context and re-fetch products for new thickness
    const ctx = panelContext[lineItemId]
    if (!ctx) return
    setPanelContext((prev) => ({
      ...prev,
      [lineItemId]: { ...prev[lineItemId], thickness: newThickness },
    }))
    setPanelProductsLoading(true)
    fetch(
      `/api/products/panels?brand=${encodeURIComponent(ctx.brand)}&thickness=${newThickness}`
    )
      .then((res) => res.json())
      .then((json) => setPanelProducts(json.data ?? []))
      .catch(() => {})
      .finally(() => setPanelProductsLoading(false))
  }

  function handleVoiceResult(lineItemId: string, rows: Array<{ height: number; quantity: number }>) {
    setVoicePanelRows((prev) => ({ ...prev, [lineItemId]: rows }))
    // Auto-expand breakout
    if (panelBreakoutLine !== lineItemId) {
      setPanelBreakoutLine(lineItemId)
    }
  }

  function handleBreakoutConfirm(lineItemId: string, items: PanelBreakoutItem[]) {
    setPanelBreakoutResults((prev) => ({ ...prev, [lineItemId]: items }))
    setPanelBreakoutLine(null)
  }

  function handleConfirm() {
    const items: ConfirmedReceivingItem[] = []

    for (let i = 0; i < po.lineItems.length; i++) {
      const li = po.lineItems[i]

      if (isPanel(li.id) && hasBreakout(li.id)) {
        // Panel breakout: one ConfirmedReceivingItem per size row
        const ctx = panelContext[li.id]
        for (const row of panelBreakoutResults[li.id]) {
          items.push({
            productId: row.productId,
            productName: row.productName,
            quantity: row.quantity,
            unitCost: row.unitCost,
            unitOfMeasure: row.unitOfMeasure,
            isNonCatalog: false,
            poLineItemId: li.id,
            isPanelBreakout: true,
            panelHeight: row.height,
            panelBrand: ctx.brand,
            panelThickness: row.thickness,
            panelColor: row.color,
            panelWidth: row.width,
            panelProfile: row.profile,
          })
        }
      } else if (!isPanel(li.id) && quantities[i] > 0) {
        // Normal line item
        items.push({
          productId: li.productId,
          productName: li.productName || li.description,
          quantity: quantities[i],
          unitCost: li.unitCost,
          unitOfMeasure: li.productId ? "sheet" : "each", // Use actual UOM where possible
          isNonCatalog: !li.productId,
          poLineItemId: li.id,
        })
      }
    }

    onConfirm(items)
  }

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* PO Header */}
      <Card className="rounded-xl border-border-custom shadow-brand-md overflow-hidden">
        <div className="bg-navy px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <FileText className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-white tabular-nums tracking-tight">
                  PO #{po.poNumber}
                </p>
                <p className="text-xs text-white/60 font-medium">
                  {po.supplierName}
                </p>
              </div>
            </div>
          </div>

          {/* Job name */}
          {po.jobName && (
            <div className="flex items-center gap-2 mt-2.5 pl-[52px]">
              <Briefcase className="h-3.5 w-3.5 text-brand-blue-bright" />
              <span className="text-sm font-semibold text-white/90">{po.jobName}</span>
            </div>
          )}
        </div>

        {/* Receipt history panel — shows previous receipts against this PO */}
        {activeReceipts.length > 0 && (
          <ReceiptHistoryPanel receipts={activeReceipts} />
        )}

        {/* Column header */}
        <div className="flex items-center px-4 py-2.5 bg-surface-secondary border-b border-border-custom text-sm font-bold text-text-muted uppercase tracking-[0.08em]">
          <span className="flex-1">Item</span>
          <span className="w-14 text-center mr-2">Ordered</span>
          <span className="w-28 text-center">Receiving</span>
        </div>

        {/* Line items */}
        <div className="divide-y divide-border-custom/30">
          {po.lineItems.map((li, index) => {
            const isPanelLi = isPanel(li.id)
            const breakoutItems = panelBreakoutResults[li.id]
            const isExpanded = panelBreakoutLine === li.id

            return (
              <div key={li.id}>
                {isPanelLi ? (
                  <PanelLineRow
                    lineItem={li}
                    hasBreakout={hasBreakout(li.id)}
                    breakoutItems={breakoutItems}
                    isExpanded={isExpanded}
                    isLoading={panelProductsLoading}
                    context={panelContext[li.id]}
                    onBreakout={() => setPanelBreakoutLine(li.id)}
                    onEdit={() => setPanelBreakoutLine(li.id)}
                    onVoiceResult={(rows) => handleVoiceResult(li.id, rows)}
                    index={index}
                  />
                ) : (
                  <ReceiveLineRow
                    lineItem={li}
                    qtyToReceive={quantities[index]}
                    onQtyChange={(qty) => updateQty(index, qty)}
                    index={index}
                  />
                )}

                {/* Panel breakout expansion */}
                {isPanelLi && isExpanded && (
                  <div className="px-3 pb-4 pt-1 bg-surface-secondary/30 border-t border-border-custom/20">
                    <PanelBreakout
                      brand={panelContext[li.id].brand}
                      thickness={panelContext[li.id].thickness}
                      width={panelContext[li.id].width}
                      color={panelContext[li.id].color}
                      poSqFt={li.qtyOrdered}
                      availableProducts={panelProducts}
                      onConfirm={(items) => handleBreakoutConfirm(li.id, items)}
                      onCancel={() => setPanelBreakoutLine(null)}
                      onThicknessChange={(t) => handleThicknessChange(li.id, t)}
                      initialRows={voicePanelRows[li.id]}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </Card>

      {/* Confirm button */}
      <Button
        onClick={handleConfirm}
        disabled={itemsToReceiveCount === 0}
        className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-base rounded-xl shadow-[0_3px_12px_rgba(232,121,43,0.3)] hover:shadow-[0_4px_16px_rgba(232,121,43,0.4)] disabled:shadow-none transition-all active:scale-[0.98]"
      >
        <PackageCheck className="h-5 w-5 mr-2" />
        Confirm Receipt ({itemsToReceiveCount} item{itemsToReceiveCount !== 1 ? "s" : ""})
      </Button>

      {/* Back */}
      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-sm text-text-muted hover:text-navy font-medium py-2 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to PO selection
      </button>
    </div>
  )
}

// ─── Panel Line Item Row ───
// Shows panel-specific UI: "Break out sizes" button or breakout summary

function PanelLineRow({
  lineItem,
  hasBreakout,
  breakoutItems,
  isExpanded,
  isLoading,
  context,
  onBreakout,
  onEdit,
  onVoiceResult,
  index,
}: {
  lineItem: POLineItemData
  hasBreakout: boolean
  breakoutItems?: PanelBreakoutItem[]
  isExpanded: boolean
  isLoading: boolean
  context: { brand: string; thickness: number; width: number; color?: string }
  onBreakout: () => void
  onEdit: () => void
  onVoiceResult: (rows: Array<{ height: number; quantity: number }>) => void
  index: number
}) {
  const [panelTextInput, setPanelTextInput] = useState("")
  const voice = usePanelVoiceInput({ brand: context.brand, thickness: context.thickness })

  // Forward voice results to parent (auto-expand + populate breakout)
  useEffect(() => {
    if (voice.parsedRows && voice.parsedRows.length > 0) {
      onVoiceResult(voice.parsedRows)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.parsedRows])

  async function handleTextSubmit() {
    if (!panelTextInput.trim()) return
    const rows = await voice.parseText(panelTextInput)
    if (rows && rows.length > 0) {
      onVoiceResult(rows)
      setPanelTextInput("")
    }
  }

  const remaining = Math.max(0, lineItem.qtyOrdered - lineItem.qtyReceived)
  const isFullyReceived = remaining === 0

  if (isFullyReceived) {
    return (
      <div
        className="flex items-center px-4 py-3.5 gap-3 border-l-[3px] border-l-transparent opacity-30 bg-surface-secondary/30 animate-fade-in"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy leading-tight truncate">
            {lineItem.productName || lineItem.description}
          </p>
          <span className="text-sm font-bold px-2 py-0.5 rounded-full text-status-green bg-status-green/10">
            COMPLETE
          </span>
        </div>
        <div className="w-14 text-center">
          <span className="text-sm font-extrabold text-navy tabular-nums">
            {lineItem.qtyOrdered}
          </span>
        </div>
        <div className="w-28 text-center text-xs text-text-muted font-semibold py-2">
          &mdash; done
        </div>
      </div>
    )
  }

  // Breakout completed — show summary
  if (hasBreakout && breakoutItems && !isExpanded) {
    const totalPanels = breakoutItems.reduce((s, i) => s + i.quantity, 0)
    const totalSqFt = breakoutItems.reduce((s, i) => s + i.sqFt, 0)
    const color = breakoutItems[0]?.color ?? ""

    return (
      <div
        className="flex items-center px-4 py-3.5 gap-3 border-l-[3px] border-l-status-green bg-status-green/[0.06] animate-fade-in"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy leading-tight truncate">
            {lineItem.productName || lineItem.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-status-green bg-status-green/10 px-2 py-0.5 rounded-full">
              <Layers className="h-3 w-3" />
              {breakoutItems.length} size{breakoutItems.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs font-bold text-navy/60 tabular-nums">
              {totalPanels} panels &middot; {Math.round(totalSqFt).toLocaleString()} sq ft
            </span>
            {color && (
              <span className="text-xs font-bold text-text-muted">
                &middot; {color}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onEdit}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-brand-blue hover:bg-brand-blue/5 transition-colors"
        >
          Edit
        </button>
      </div>
    )
  }

  // Not yet broken out — show voice/text input + breakout button
  return (
    <div
      className="border-l-[3px] border-l-brand-blue/30 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center px-4 py-3.5 gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy leading-tight truncate">
            {lineItem.productName || lineItem.description}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {lineItem.qtyReceived > 0 && (
              <span className="text-sm font-bold px-2 py-0.5 rounded-full text-brand-orange bg-orange-50">
                {lineItem.qtyReceived} of {lineItem.qtyOrdered} received
              </span>
            )}
            <span className="text-xs text-text-muted font-medium">
              {context.brand} &middot; {context.thickness}&quot;
            </span>
          </div>
        </div>

        <div className="w-14 text-center">
          <span className="text-sm font-extrabold text-navy tabular-nums">
            {lineItem.qtyOrdered}
          </span>
        </div>

        <button
          onClick={onBreakout}
          disabled={isLoading || isExpanded}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95",
            "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/15",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <Layers className="h-4 w-4" />
          {isLoading ? "Loading..." : "Break out"}
        </button>
      </div>

      {/* Voice + text panel input */}
      {!hasBreakout && (
        <PanelVoiceBar voice={voice} panelTextInput={panelTextInput} setPanelTextInput={setPanelTextInput} onTextSubmit={handleTextSubmit} />
      )}
    </div>
  )
}

// ─── Receipt History Panel ───
// Collapsible timeline of past receipts against this PO

function ReceiptHistoryPanel({ receipts }: { receipts: POReceiptHistoryItem[] }) {
  const [expanded, setExpanded] = useState(false)

  const totalItemsReceived = receipts.reduce((sum, r) => sum + r.items.length, 0)
  const lastReceipt = receipts[0] // already sorted desc by receivedAt
  const lastDate = new Date(lastReceipt.receivedAt)
  const formattedLastDate = lastDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  return (
    <div className="border-b border-border-custom">
      {/* Summary bar — tap to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors",
          "bg-amber-50/60 hover:bg-amber-50"
        )}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-orange/10">
          <Clock className="h-3.5 w-3.5 text-brand-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-brand-orange">
            {receipts.length} prior receipt{receipts.length !== 1 ? "s" : ""}
          </span>
          <span className="text-sm text-text-muted ml-1.5">
            &middot; last {formattedLastDate}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-brand-orange/50 transition-transform duration-300",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded receipt timeline */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-3 pt-1 space-y-2 bg-amber-50/30">
            {receipts.map((receipt, ri) => {
              const date = new Date(receipt.receivedAt)
              const formattedDate = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              const formattedTime = date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })

              return (
                <div
                  key={receipt.id}
                  className={cn(
                    "relative pl-5 animate-fade-in",
                    // Timeline connector line
                    ri < receipts.length - 1 && "pb-2"
                  )}
                  style={{ animationDelay: `${ri * 60}ms` }}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-[7px] h-2.5 w-2.5 rounded-full bg-brand-orange/70 ring-2 ring-amber-50/80" />

                  {/* Timeline connector */}
                  {ri < receipts.length - 1 && (
                    <div className="absolute left-[4.5px] top-[18px] bottom-0 w-[1px] bg-brand-orange/15" />
                  )}

                  {/* Receipt content */}
                  <div>
                    <p className="text-sm font-bold text-navy/80 tabular-nums">
                      {formattedDate}
                      <span className="text-text-muted/50 font-medium ml-1.5">
                        {formattedTime}
                      </span>
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {receipt.items.map((item, ii) => (
                        <div
                          key={ii}
                          className="flex items-baseline gap-2 text-sm"
                        >
                          <span className="font-bold text-navy/60 tabular-nums w-6 text-right shrink-0">
                            &times;{item.quantity}
                          </span>
                          <span className="text-text-secondary font-medium truncate">
                            {item.productName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Voice + Text Input Bar for Panels ───

function PanelVoiceBar({
  voice,
  panelTextInput,
  setPanelTextInput,
  onTextSubmit,
}: {
  voice: ReturnType<typeof usePanelVoiceInput>
  panelTextInput: string
  setPanelTextInput: (v: string) => void
  onTextSubmit: () => void
}) {
  return (
    <div className="px-4 pb-3 pt-1">
      <div className="flex items-center gap-2.5">
        {/* Mic button — bright orange CTA, stays in place */}
        {voice.isSupported && (
          <button
            type="button"
            onClick={voice.isListening ? voice.stopListening : voice.startListening}
            disabled={voice.isParsing}
            className={cn(
              "flex items-center justify-center h-12 w-12 rounded-xl shrink-0 transition-all",
              voice.isListening
                ? "bg-brand-orange text-white shadow-[0_0_20px_rgba(232,121,43,0.45)] animate-mic-listening"
                : voice.isParsing
                  ? "bg-surface-secondary text-text-muted"
                  : "bg-brand-orange text-white shadow-[0_2px_10px_rgba(232,121,43,0.35)] hover:shadow-[0_4px_16px_rgba(232,121,43,0.45)] active:scale-95"
            )}
          >
            {voice.isParsing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Input area — shows sound wave bars when listening, text input otherwise */}
        <div className="flex-1 relative">
          {voice.isListening ? (
            /* Listening state: sound wave animation inside the input area */
            <div className="w-full h-11 rounded-xl border-2 border-brand-orange/30 bg-brand-orange/5 flex items-center justify-center gap-[3px] px-4">
              <span className="text-sm font-semibold text-brand-orange/70 mr-2">Listening</span>
              <span className="w-[3px] rounded-full bg-brand-orange/60 animate-soundbar-1" />
              <span className="w-[3px] rounded-full bg-brand-orange/60 animate-soundbar-2" />
              <span className="w-[3px] rounded-full bg-brand-orange/60 animate-soundbar-3" />
              <span className="w-[3px] rounded-full bg-brand-orange/60 animate-soundbar-4" />
              <span className="w-[3px] rounded-full bg-brand-orange/60 animate-soundbar-5" />
            </div>
          ) : voice.isParsing ? (
            <div className="w-full h-11 rounded-xl border-2 border-border-custom bg-surface-secondary/50 flex items-center justify-center">
              <span className="text-sm font-medium text-text-muted">Processing...</span>
            </div>
          ) : (
            <input
              type="text"
              value={panelTextInput}
              onChange={(e) => setPanelTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  onTextSubmit()
                }
              }}
              placeholder='e.g., "11 ten-foot, 22 eight-foot"'
              className="w-full h-11 px-3 rounded-xl border-2 border-border-custom bg-white text-sm font-medium text-navy placeholder:text-text-muted/40 focus:outline-none focus:border-brand-blue/40 transition-colors"
            />
          )}
        </div>
      </div>

      {/* Error */}
      {voice.error && (
        <p className="text-xs text-status-red font-medium mt-1.5 pl-[3.6rem]">
          {voice.error}
        </p>
      )}
    </div>
  )
}

// ─── Individual Line Item Row ───

function ReceiveLineRow({
  lineItem,
  qtyToReceive,
  onQtyChange,
  index,
}: {
  lineItem: POLineItemData
  qtyToReceive: number
  onQtyChange: (qty: number) => void
  index: number
}) {
  const remaining = Math.max(0, lineItem.qtyOrdered - lineItem.qtyReceived)
  const isFullyReceived = remaining === 0
  const isReceivingFull = qtyToReceive === remaining && remaining > 0
  const isReceivingPartial = qtyToReceive > 0 && qtyToReceive < remaining
  const isReceivingNone = qtyToReceive === 0 && !isFullyReceived

  return (
    <div
      className={cn(
        "flex items-center px-4 py-3.5 gap-3 transition-all duration-200 animate-fade-in",
        // Color-coded left border for instant visual feedback
        isReceivingFull && "border-l-[3px] border-l-status-green bg-status-green/[0.06]",
        isReceivingPartial && "border-l-[3px] border-l-brand-orange bg-orange-50/20",
        isReceivingNone && "border-l-[3px] border-l-transparent opacity-40",
        isFullyReceived && "border-l-[3px] border-l-transparent opacity-30 bg-surface-secondary/30",
        // Items that aren't color-coded get default border
        !isReceivingFull && !isReceivingPartial && !isReceivingNone && !isFullyReceived && "border-l-[3px] border-l-transparent"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Item name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-navy leading-tight truncate">
          {lineItem.productName || lineItem.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {lineItem.qtyReceived > 0 && (
            <span
              className={cn(
                "text-sm font-bold px-2 py-0.5 rounded-full",
                isFullyReceived
                  ? "text-status-green bg-status-green/10"
                  : "text-brand-orange bg-orange-50"
              )}
            >
              {isFullyReceived
                ? "COMPLETE"
                : `${lineItem.qtyReceived} of ${lineItem.qtyOrdered} received`}
            </span>
          )}
        </div>
      </div>

      {/* Qty ordered */}
      <div className="w-14 text-center">
        <span className="text-sm font-extrabold text-navy tabular-nums">
          {lineItem.qtyOrdered}
        </span>
      </div>

      {/* Qty to receive — always visible, large touch targets */}
      <div className="w-28">
        {isFullyReceived ? (
          <div className="text-center text-xs text-text-muted font-semibold py-2">
            &mdash; done
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center rounded-xl border-2 transition-colors",
              isReceivingFull
                ? "border-status-green/40 bg-status-green/[0.08]"
                : isReceivingPartial
                  ? "border-brand-orange/30 bg-orange-50/30"
                  : "border-border-custom bg-white"
            )}
          >
            <button
              onClick={() => onQtyChange(qtyToReceive - 1)}
              disabled={qtyToReceive <= 0}
              className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-navy hover:bg-surface-secondary/80 disabled:opacity-20 transition-colors rounded-l-[10px] active:scale-90"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={0}
              value={qtyToReceive}
              onChange={(e) => onQtyChange(Number(e.target.value) || 0)}
              className={cn(
                "w-full text-center text-base font-extrabold bg-transparent border-0 focus:outline-none focus:ring-0 tabular-nums",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                isReceivingFull ? "text-status-green" : isReceivingPartial ? "text-brand-orange" : "text-navy"
              )}
            />
            <button
              onClick={() => onQtyChange(qtyToReceive + 1)}
              className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-navy hover:bg-surface-secondary/80 transition-colors rounded-r-[10px] active:scale-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Over-receiving warning */}
        {qtyToReceive > remaining && !isFullyReceived && (
          <div className="flex items-center justify-center gap-1 mt-1.5 text-brand-orange animate-fade-in">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-sm font-bold">Over qty</span>
          </div>
        )}
      </div>
    </div>
  )
}
