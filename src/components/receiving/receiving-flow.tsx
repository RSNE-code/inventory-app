"use client"

import { useState, useCallback, useRef } from "react"
import { Camera, PackageCheck, FileText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { AIInput, type AIInputHandle } from "@/components/ai/ai-input"
import { SupplierPicker } from "@/components/receiving/supplier-picker"
import { ReceivingConfirmationList } from "@/components/receiving/receiving-confirmation-card"
import { ReceiptSummary } from "@/components/receiving/receipt-summary"
import { POMatchCard } from "@/components/receiving/po-match-card"
import { POReceiveCard } from "@/components/receiving/po-receive-card"
import { usePoMatch, useCreateReceipt } from "@/hooks/use-receiving"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { StepProgress } from "@/components/layout/step-progress"
import type {
  CatalogMatch,
  ReceivingParseResult,
  ParseResult,
  ConfirmedReceivingItem,
  MatchedPO,
} from "@/lib/ai/types"

type Phase = "INPUT" | "PO_MATCH" | "PO_RECEIVE" | "REVIEW" | "SUMMARY"

const STEPS_PO = ["Input", "PO Match", "Receive", "Summary"]
const STEPS_NO_PO = ["Input", "Review", "Summary"]

function getSteps(hasPO: boolean) {
  return hasPO ? STEPS_PO : STEPS_NO_PO
}

function getStepIndex(phase: Phase, hasPO: boolean): number {
  if (hasPO) {
    const map: Record<Phase, number> = {
      INPUT: 0,
      PO_MATCH: 1,
      PO_RECEIVE: 2,
      REVIEW: 2,
      SUMMARY: 3,
    }
    return map[phase]
  }
  const map: Record<Phase, number> = {
    INPUT: 0,
    PO_MATCH: 0,
    PO_RECEIVE: 1,
    REVIEW: 1,
    SUMMARY: 2,
  }
  return map[phase]
}

export function ReceivingFlow() {
  const [phase, setPhase] = useState<Phase>("INPUT")
  const aiInputRef = useRef<AIInputHandle>(null)

  // AI parse results (used for ad-hoc / no-PO flow)
  const [pendingMatches, setPendingMatches] = useState<CatalogMatch[]>([])
  const [confirmedItems, setConfirmedItems] = useState<ConfirmedReceivingItem[]>([])

  // Supplier
  const [supplierId, setSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [supplierAutoMatched, setSupplierAutoMatched] = useState(false)

  // PO
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null)
  const [matchedPO, setMatchedPO] = useState<MatchedPO | null>(null)
  const [showPOStep, setShowPOStep] = useState(false)

  // Per-card edit overrides (keyed by rawText) — for ad-hoc flow
  const [editOverrides, setEditOverrides] = useState<Record<string, { quantity: number; unitCost: number }>>({})

  // Notes
  const [notes, setNotes] = useState("")

  const poMatch = usePoMatch()
  const createReceipt = useCreateReceipt()

  const handleParseComplete = useCallback(
    async (result: ParseResult | ReceivingParseResult) => {
      setPendingMatches(result.items)
      setConfirmedItems([])

      // AI handles supplier matching
      if ("supplierId" in result && result.supplierId) {
        setSupplierId(result.supplierId)
        setSupplierName(result.supplier || "")
        setSupplierAutoMatched(true)
      } else if ("supplier" in result && result.supplier) {
        setSupplierName(result.supplier)
      }

      // AI matched a PO directly
      if ("poId" in result && result.poId) {
        try {
          const po = await poMatch.mutateAsync({
            poNumber: result.poNumber || "",
            vendorName: result.supplier,
          })
          if (po) {
            setMatchedPO(po)
            setShowPOStep(true)

            if (!result.supplierId) {
              setSupplierId(po.supplierId)
              setSupplierName(po.supplierName)
              setSupplierAutoMatched(true)
            }

            setPhase("PO_MATCH")
            return
          }
        } catch {
          // Fall through
        }
      } else if ("poNumber" in result && result.poNumber) {
        try {
          const po = await poMatch.mutateAsync({
            poNumber: result.poNumber,
            vendorName: result.supplier,
          })
          if (po) {
            setMatchedPO(po)
            setShowPOStep(true)

            if (!result.supplierId) {
              setSupplierId(po.supplierId)
              setSupplierName(po.supplierName)
              setSupplierAutoMatched(true)
            }

            setPhase("PO_MATCH")
            return
          }
        } catch {
          // PO match failed
        }
      }

      // Show PO step for manual search
      setShowPOStep(true)
      setPhase("PO_MATCH")
    },
    [poMatch]
  )

  function handlePOConfirm(po: MatchedPO) {
    setPurchaseOrderId(po.id)
    setMatchedPO(po)

    if (!supplierId) {
      setSupplierId(po.supplierId)
      setSupplierName(po.supplierName)
      setSupplierAutoMatched(true)
    }

    // Go to PO receive phase (show PO items as checklist)
    setPhase("PO_RECEIVE")
  }

  function handlePOSkip() {
    setPurchaseOrderId(null)
    // No PO — go to ad-hoc review with AI-parsed items
    setPhase("REVIEW")
  }

  function handlePOReceiveConfirm(items: ConfirmedReceivingItem[]) {
    setConfirmedItems(items)
    setPhase("SUMMARY")
  }

  function handleSupplierSelect(supplier: { id: string; name: string }) {
    setSupplierId(supplier.id)
    setSupplierName(supplier.name)
    setSupplierAutoMatched(false)
  }

  function handleAcceptItem(item: ConfirmedReceivingItem) {
    setConfirmedItems((prev) => [...prev, item])
    setPendingMatches((prev) =>
      prev.filter((m) => m.parsedItem.rawText !== item.catalogMatch?.parsedItem.rawText)
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
      // Build PO line item updates
      const poLineItemUpdates = confirmedItems
        .filter((i) => i.poLineItemId)
        .map((i) => ({
          poLineItemId: i.poLineItemId!,
          qtyReceived: i.quantity,
        }))

      await createReceipt.mutateAsync({
        supplierId,
        purchaseOrderId: purchaseOrderId || null,
        notes: receiptNotes || null,
        items: catalogItems.map((i) => ({
          productId: i.productId!,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
        poLineItemUpdates: poLineItemUpdates.length > 0 ? poLineItemUpdates : undefined,
      })

      toast.success(
        `Received ${catalogItems.length} item${catalogItems.length !== 1 ? "s" : ""} from ${supplierName}`
      )

      handleReset()
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
    setPurchaseOrderId(null)
    setMatchedPO(null)
    setShowPOStep(false)
    setNotes("")
  }

  const steps = getSteps(showPOStep)
  const currentStep = getStepIndex(phase, showPOStep)

  // Phase 1: INPUT
  if (phase === "INPUT") {
    return (
      <div className="space-y-4">
        <StepProgress steps={steps} currentStep={currentStep} />
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

  // Phase 2: PO MATCH
  if (phase === "PO_MATCH") {
    return (
      <div className="space-y-4">
        <StepProgress steps={steps} currentStep={currentStep} />

        <POMatchCard
          matchedPO={matchedPO}
          supplierId={supplierId || undefined}
          onConfirm={handlePOConfirm}
          onSkip={handlePOSkip}
        />

        <button
          onClick={handleReset}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2"
        >
          Start over
        </button>
      </div>
    )
  }

  // Phase 3: PO RECEIVE — show PO line items as a receiving checklist
  if (phase === "PO_RECEIVE" && matchedPO) {
    return (
      <div className="space-y-4">
        <StepProgress steps={steps} currentStep={currentStep} />

        <POReceiveCard
          po={matchedPO}
          onConfirm={handlePOReceiveConfirm}
          onBack={() => setPhase("PO_MATCH")}
        />
      </div>
    )
  }

  // Phase 4: REVIEW (ad-hoc, no PO)
  if (phase === "REVIEW") {
    return (
      <div className="space-y-4">
        <StepProgress steps={steps} currentStep={currentStep} />

        {/* PO badge (if somehow matched but skipped PO receive) */}
        {purchaseOrderId && matchedPO && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-brand-blue/5 border border-brand-blue/10">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-brand-blue" />
              <span className="text-xs font-semibold text-brand-blue">
                PO #{matchedPO.poNumber}
              </span>
              <span className="text-[11px] text-text-muted">
                {matchedPO.supplierName}
              </span>
            </div>
            <button
              onClick={() => setPhase("PO_MATCH")}
              className="text-[10px] text-text-muted hover:text-brand-blue font-semibold transition-colors"
            >
              Change
            </button>
          </div>
        )}

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

        <button
          onClick={handleReset}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2"
        >
          Start over
        </button>
      </div>
    )
  }

  // Phase 5: SUMMARY
  return (
    <div className="space-y-4">
      <StepProgress steps={steps} currentStep={currentStep} />
      <ReceiptSummary
        supplier={{ id: supplierId, name: supplierName }}
        items={confirmedItems}
        notes={notes}
        onNotesChange={setNotes}
        onConfirm={handleSubmitReceipt}
        onBack={() => setPhase(matchedPO ? "PO_RECEIVE" : "REVIEW")}
        isSubmitting={createReceipt.isPending}
      />
    </div>
  )
}
