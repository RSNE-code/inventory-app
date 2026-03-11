"use client"

import { useState, useCallback, useRef } from "react"
import { Camera, PackageCheck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { AIInput, type AIInputHandle } from "@/components/ai/ai-input"
import { SupplierPicker } from "@/components/receiving/supplier-picker"
import { ReceivingConfirmationList } from "@/components/receiving/receiving-confirmation-card"
import { ReceiptSummary } from "@/components/receiving/receipt-summary"
import { useSupplierMatch, useCreateReceipt } from "@/hooks/use-receiving"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { StepProgress } from "@/components/layout/step-progress"
import type {
  CatalogMatch,
  ReceivingParseResult,
  ParseResult,
  ConfirmedReceivingItem,
} from "@/lib/ai/types"

type Phase = "INPUT" | "REVIEW" | "SUMMARY"

const RECEIVING_STEPS = ["Input", "Review", "Summary"]
const PHASE_INDEX: Record<Phase, number> = { INPUT: 0, REVIEW: 1, SUMMARY: 2 }

export function ReceivingFlow() {
  const [phase, setPhase] = useState<Phase>("INPUT")
  const aiInputRef = useRef<AIInputHandle>(null)

  // AI parse results
  const [pendingMatches, setPendingMatches] = useState<CatalogMatch[]>([])
  const [confirmedItems, setConfirmedItems] = useState<ConfirmedReceivingItem[]>([])

  // Supplier
  const [supplierId, setSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [supplierAutoMatched, setSupplierAutoMatched] = useState(false)

  // Per-card edit overrides (keyed by rawText)
  const [editOverrides, setEditOverrides] = useState<Record<string, { quantity: number; unitCost: number }>>({})

  // Notes
  const [notes, setNotes] = useState("")

  const supplierMatch = useSupplierMatch()
  const createReceipt = useCreateReceipt()

  const handleParseComplete = useCallback(
    async (result: ParseResult | ReceivingParseResult) => {
      setPendingMatches(result.items)
      setConfirmedItems([])

      // Auto-match supplier if extracted from image
      if ("supplier" in result && result.supplier) {
        try {
          const matched = await supplierMatch.mutateAsync(result.supplier)
          if (matched) {
            setSupplierId(matched.id)
            setSupplierName(matched.name)
            setSupplierAutoMatched(true)
          }
        } catch {
          // Supplier match failed — user will pick manually
        }
      }

      setPhase("REVIEW")
    },
    [supplierMatch]
  )

  function handleSupplierSelect(supplier: { id: string; name: string }) {
    setSupplierId(supplier.id)
    setSupplierName(supplier.name)
    setSupplierAutoMatched(false)
  }

  function handleAcceptItem(item: ConfirmedReceivingItem) {
    setConfirmedItems((prev) => [...prev, item])
    setPendingMatches((prev) =>
      prev.filter((m) => m.parsedItem.rawText !== item.catalogMatch.parsedItem.rawText)
    )
  }

  function handleRejectItem(match: CatalogMatch) {
    setPendingMatches((prev) =>
      prev.filter((m) => m.parsedItem.rawText !== match.parsedItem.rawText)
    )
  }

  function handleEditChange(rawText: string, edits: { quantity: number; unitCost: number }) {
    setEditOverrides((prev) => ({ ...prev, [rawText]: edits }))
  }

  function handleConfirmAll() {
    const newConfirmed: ConfirmedReceivingItem[] = pendingMatches.map((match) => {
      const override = editOverrides[match.parsedItem.rawText]
      const defaultCost = match.parsedItem.estimatedCost
        ?? match.matchedProduct?.lastCost
        ?? 0
      return {
        productId: match.matchedProduct?.id ?? null,
        productName: match.matchedProduct?.name ?? match.parsedItem.name,
        quantity: override?.quantity ?? match.parsedItem.quantity,
        unitCost: override?.unitCost ?? defaultCost,
        unitOfMeasure: match.matchedProduct?.unitOfMeasure ?? match.parsedItem.unitOfMeasure,
        isNonCatalog: match.isNonCatalog,
        catalogMatch: match,
      }
    })

    setConfirmedItems((prev) => [...prev, ...newConfirmed])
    setPendingMatches([])
    setEditOverrides({})
  }

  function handleContinueToSummary() {
    if (!supplierId) {
      toast.error("Please select a supplier before continuing")
      return
    }
    if (confirmedItems.length === 0) {
      toast.error("Confirm at least one item to continue")
      return
    }
    setPhase("SUMMARY")
  }

  async function handleSubmitReceipt() {
    const catalogItems = confirmedItems.filter((i) => !i.isNonCatalog && i.productId)
    const nonCatalogItems = confirmedItems.filter((i) => i.isNonCatalog)

    // Build notes with non-catalog items appended
    let receiptNotes = notes.trim()
    if (nonCatalogItems.length > 0) {
      const ncSummary = nonCatalogItems
        .map((i) => `${i.quantity} ${i.unitOfMeasure} ${i.productName}`)
        .join("; ")
      receiptNotes = receiptNotes
        ? `${receiptNotes}\n\nNon-catalog items: ${ncSummary}`
        : `Non-catalog items: ${ncSummary}`
    }

    try {
      await createReceipt.mutateAsync({
        supplierId,
        notes: receiptNotes || null,
        items: catalogItems.map((i) => ({
          productId: i.productId!,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      })

      toast.success(
        `Received ${catalogItems.length} item${catalogItems.length !== 1 ? "s" : ""} from ${supplierName}`
      )

      // Reset everything
      setPhase("INPUT")
      setPendingMatches([])
      setConfirmedItems([])
      setSupplierId("")
      setSupplierName("")
      setSupplierAutoMatched(false)
      setNotes("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log receipt")
    }
  }

  function handleReset() {
    setPhase("INPUT")
    setPendingMatches([])
    setConfirmedItems([])
    setEditOverrides({})
    setSupplierId("")
    setSupplierName("")
    setSupplierAutoMatched(false)
    setNotes("")
  }

  // Phase 1: INPUT
  if (phase === "INPUT") {
    return (
      <div className="space-y-4">
        <StepProgress steps={RECEIVING_STEPS} currentStep={PHASE_INDEX[phase]} />
        {/* Hero prompt */}
        <div className="text-center py-6">
          <button
            type="button"
            onClick={() => aiInputRef.current?.triggerCamera()}
            className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-orange-50 mb-3 hover:bg-orange-100 transition-colors active:scale-95"
          >
            <Camera className="h-8 w-8 text-[#E8792B]" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">Snap a packing slip</h2>
          <p className="text-sm text-gray-500 mt-1">
            Take a photo, type, or speak — AI will parse the items for you
          </p>
        </div>

        <AIInput
          ref={aiInputRef}
          onParseComplete={handleParseComplete}
          placeholder="Or type/speak: '20 sheets 4in IMP white, 5 boxes hinges...'"
        />
      </div>
    )
  }

  // Phase 2: REVIEW
  if (phase === "REVIEW") {
    return (
      <div className="space-y-4">
        <StepProgress steps={RECEIVING_STEPS} currentStep={PHASE_INDEX[phase]} />
        {/* Supplier section */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-navy">Supplier</h3>
            {supplierAutoMatched && supplierName && (
              <span className="text-xs text-green-600">Auto-matched</span>
            )}
          </div>
          <SupplierPicker
            onSelect={handleSupplierSelect}
            selectedName={supplierName || undefined}
          />
        </Card>

        {/* Pending items to review */}
        {pendingMatches.length > 0 && (
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <ReceivingConfirmationList
              matches={pendingMatches}
              onAccept={handleAcceptItem}
              onReject={handleRejectItem}
              onConfirmAll={handleConfirmAll}
              onEditChange={handleEditChange}
            />
          </Card>
        )}

        {/* Confirmed items */}
        {confirmedItems.length > 0 && (
          <Card className="p-4 rounded-xl border-border-custom space-y-2">
            <h3 className="font-semibold text-sm text-green-700">
              {confirmedItems.length} item{confirmedItems.length !== 1 ? "s" : ""} confirmed
            </h3>
            {confirmedItems.map((item, i) => (
              <div
                key={`${item.productId ?? "nc"}-${i}`}
                className="flex items-center justify-between py-1 text-sm text-gray-600"
              >
                <span className="truncate flex-1">
                  {item.quantity} {item.unitOfMeasure} {item.productName}
                </span>
                <button
                  onClick={() =>
                    setConfirmedItems((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="text-xs text-red-500 hover:underline ml-2 shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </Card>
        )}

        {/* Add more items */}
        <Card className="p-4 rounded-xl border-border-custom space-y-2">
          <h3 className="text-sm font-medium text-gray-500">Add more items</h3>
          <AIInput
            onParseComplete={(result) => {
              setPendingMatches((prev) => [...prev, ...result.items])
            }}
            placeholder="Snap another photo or type more items..."
          />
        </Card>

        {/* Continue button */}
        <Button
          onClick={handleContinueToSummary}
          disabled={confirmedItems.length === 0 || !supplierId}
          className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
        >
          <PackageCheck className="h-5 w-5 mr-2" />
          Continue to Summary ({confirmedItems.length} item{confirmedItems.length !== 1 ? "s" : ""})
        </Button>

        {/* Start over */}
        <button
          onClick={handleReset}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2"
        >
          Start over
        </button>
      </div>
    )
  }

  // Phase 3: SUMMARY
  return (
    <div className="space-y-4">
      <StepProgress steps={RECEIVING_STEPS} currentStep={PHASE_INDEX[phase]} />
      <ReceiptSummary
        supplier={{ id: supplierId, name: supplierName }}
        items={confirmedItems}
        notes={notes}
        onNotesChange={setNotes}
        onConfirm={handleSubmitReceipt}
        onBack={() => setPhase("REVIEW")}
        isSubmitting={createReceipt.isPending}
      />
    </div>
  )
}
