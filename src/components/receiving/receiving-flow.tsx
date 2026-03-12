"use client"

import { useState, useCallback, useRef } from "react"
import { Camera, PackageCheck, FileText, ClipboardList } from "lucide-react"
import { Card } from "@/components/ui/card"
import { AIInput, type AIInputHandle } from "@/components/ai/ai-input"
import { SupplierPicker } from "@/components/receiving/supplier-picker"
import { ReceivingConfirmationList } from "@/components/receiving/receiving-confirmation-card"
import { ReceiptSummary } from "@/components/receiving/receipt-summary"
import { POMatchCard } from "@/components/receiving/po-match-card"
import { POReceiveCard } from "@/components/receiving/po-receive-card"
import { POBrowser } from "@/components/receiving/po-browser"
import { usePoMatch, useCreateReceipt } from "@/hooks/use-receiving"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { StepProgress } from "@/components/layout/step-progress"
import { cn } from "@/lib/utils"
import type {
  CatalogMatch,
  ReceivingParseResult,
  ParseResult,
  ConfirmedReceivingItem,
  MatchedPO,
} from "@/lib/ai/types"

type Phase = "INPUT" | "PO_MATCH" | "PO_BROWSE" | "PO_RECEIVE" | "REVIEW" | "SUMMARY"

const STEPS_PO = ["Input", "Select PO", "Receive", "Summary"]
const STEPS_NO_PO = ["Input", "Review", "Summary"]

function getSteps(hasPO: boolean) {
  return hasPO ? STEPS_PO : STEPS_NO_PO
}

function getStepIndex(phase: Phase, hasPO: boolean): number {
  if (hasPO) {
    const map: Record<Phase, number> = {
      INPUT: 0,
      PO_MATCH: 1,
      PO_BROWSE: 1,
      PO_RECEIVE: 2,
      REVIEW: 2,
      SUMMARY: 3,
    }
    return map[phase]
  }
  const map: Record<Phase, number> = {
    INPUT: 0,
    PO_MATCH: 0,
    PO_BROWSE: 0,
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
  const [showPOStep, setShowPOStep] = useState(true)

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

    setPhase("PO_RECEIVE")
  }

  function handlePOSkip() {
    setPurchaseOrderId(null)
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
    setShowPOStep(true)
    setNotes("")
  }

  const steps = getSteps(showPOStep)
  const currentStep = getStepIndex(phase, showPOStep)

  function handleStepClick(stepIndex: number) {
    if (stepIndex === currentStep) return

    if (showPOStep) {
      // PO flow: Input(0) → Select PO(1) → Receive(2) → Summary(3)
      const phaseMap: Phase[] = ["INPUT", matchedPO ? "PO_MATCH" : "PO_BROWSE", "PO_RECEIVE", "SUMMARY"]
      const target = phaseMap[stepIndex]
      if (target) setPhase(target)
    } else {
      // Ad-hoc flow: Input(0) → Review(1) → Summary(2)
      const phaseMap: Phase[] = ["INPUT", "REVIEW", "SUMMARY"]
      const target = phaseMap[stepIndex]
      if (target) setPhase(target)
    }
  }

  // ─── Phase 1: INPUT — Two entry paths ───
  if (phase === "INPUT") {
    return (
      <div className="space-y-5 animate-fade-in-up">
        <StepProgress steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />

        {/* Entry path cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Packing Slip */}
          <button
            type="button"
            onClick={() => aiInputRef.current?.triggerCamera()}
            className={cn(
              "group relative flex flex-col items-center gap-3 p-5 rounded-2xl border",
              "border-brand-orange/25 bg-gradient-to-b from-orange-50/80 to-white",
              "shadow-[0_2px_12px_rgba(232,121,43,0.08)]",
              "hover:border-brand-orange/40 hover:shadow-[0_6px_24px_rgba(232,121,43,0.15)]",
              "active:scale-[0.97] transition-all duration-200"
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10 group-hover:bg-brand-orange/15 transition-colors">
              <Camera className="h-7 w-7 text-brand-orange" />
            </div>
            <p className="text-[15px] font-extrabold text-navy tracking-tight">
              Packing Slip
            </p>
          </button>

          {/* Browse POs */}
          <button
            type="button"
            onClick={() => {
              setShowPOStep(true)
              setPhase("PO_BROWSE")
            }}
            className={cn(
              "group relative flex flex-col items-center gap-3 p-5 rounded-2xl border",
              "border-brand-blue/25 bg-gradient-to-b from-blue-50/80 to-white",
              "shadow-[0_2px_12px_rgba(46,125,186,0.08)]",
              "hover:border-brand-blue/40 hover:shadow-[0_6px_24px_rgba(46,125,186,0.15)]",
              "active:scale-[0.97] transition-all duration-200"
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/10 group-hover:bg-brand-blue/15 transition-colors">
              <ClipboardList className="h-7 w-7 text-brand-blue" />
            </div>
            <p className="text-[15px] font-extrabold text-navy tracking-tight">
              Browse POs
            </p>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex-1 h-px bg-border-custom/60" />
          <span className="text-[10px] font-bold text-text-muted/50 uppercase tracking-[0.12em]">
            or type / speak below
          </span>
          <div className="flex-1 h-px bg-border-custom/60" />
        </div>

        <AIInput
          ref={aiInputRef}
          onParseComplete={handleParseComplete}
          context="receiving"
          placeholder="'20 panels from Metl-Span on PO 345...'"
        />
      </div>
    )
  }

  // ─── Phase 2a: PO MATCH (after AI parse, with auto-match) ───
  if (phase === "PO_MATCH") {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <StepProgress steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />

        <POMatchCard
          matchedPO={matchedPO}
          supplierId={supplierId || undefined}
          onConfirm={handlePOConfirm}
          onSkip={handlePOSkip}
        />

        <button
          onClick={handleReset}
          className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-2 transition-colors"
        >
          Start over
        </button>
      </div>
    )
  }

  // ─── Phase 2b: PO BROWSE (direct PO browser, no AI parse) ───
  if (phase === "PO_BROWSE") {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <StepProgress steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />

        <POBrowser
          onSelect={handlePOConfirm}
          onBack={handleReset}
        />
      </div>
    )
  }

  // ─── Phase 3: PO RECEIVE — show PO line items as a receiving checklist ───
  if (phase === "PO_RECEIVE" && matchedPO) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <StepProgress steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />

        <POReceiveCard
          po={matchedPO}
          onConfirm={handlePOReceiveConfirm}
          onBack={() => setPhase(pendingMatches.length > 0 ? "PO_MATCH" : "PO_BROWSE")}
        />
      </div>
    )
  }

  // ─── Phase 4: REVIEW (ad-hoc, no PO) ───
  if (phase === "REVIEW") {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <StepProgress steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />

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

        <Card className="p-4 rounded-xl border-border-custom space-y-2">
          <h3 className="text-sm font-medium text-gray-500">Add more items</h3>
          <AIInput
            onParseComplete={(result) => {
              setPendingMatches((prev) => [...prev, ...result.items])
            }}
            placeholder="Snap another photo or type more items..."
          />
        </Card>

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
          className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-2 transition-colors"
        >
          Start over
        </button>
      </div>
    )
  }

  // ─── Phase 5: SUMMARY ───
  return (
    <div className="space-y-4 animate-fade-in-up">
      <StepProgress steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />
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
