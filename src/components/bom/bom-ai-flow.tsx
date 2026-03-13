"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Camera, PenLine, ClipboardList, Trash2, Plus, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AIInput, type AIInputHandle, type ProductResult } from "@/components/ai/ai-input"
import { BomConfirmationList } from "@/components/bom/bom-confirmation-card"
import { JobPicker } from "@/components/bom/job-picker"
import { useCreateBom } from "@/hooks/use-boms"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { StepProgress } from "@/components/layout/step-progress"
import type {
  CatalogMatch,
  ParseResult,
  ReceivingParseResult,
  ConfirmedBomItem,
} from "@/lib/ai/types"
import { getItemStockLevel, stockDotColor } from "@/lib/bom-utils"

const BOM_STEPS = ["Input", "Job Info", "Review & Submit"]

export function BomAIFlow() {
  const router = useRouter()
  const createBom = useCreateBom()
  const aiInputRef = useRef<AIInputHandle>(null)

  const [phase, setPhase] = useState<"INPUT" | "BUILD">("INPUT")
  const [jobName, setJobName] = useState("")
  const [jobNumber, setJobNumber] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [pendingMatches, setPendingMatches] = useState<CatalogMatch[]>([])
  const [confirmedItems, setConfirmedItems] = useState<ConfirmedBomItem[]>([])
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({})
  const [addRowOpen, setAddRowOpen] = useState(false)
  const [nonCatalogOpen, setNonCatalogOpen] = useState(false)
  const [nonCatalogName, setNonCatalogName] = useState("")
  const [nonCatalogQty, setNonCatalogQty] = useState(1)
  const [nonCatalogUom, setNonCatalogUom] = useState("each")

  const handleParseComplete = useCallback(
    (result: ParseResult | ReceivingParseResult) => {
      setPendingMatches((prev) => {
        const merged = [...prev]
        for (const newMatch of result.items) {
          const newProductId = newMatch.matchedProduct?.id
          const pendingIdx = newProductId
            ? merged.findIndex((m) => m.matchedProduct?.id === newProductId)
            : merged.findIndex((m) =>
                !m.matchedProduct?.id &&
                m.parsedItem.name.toLowerCase() === newMatch.parsedItem.name.toLowerCase()
              )
          if (pendingIdx >= 0) {
            const existing = merged[pendingIdx]
            merged[pendingIdx] = {
              ...existing,
              parsedItem: {
                ...existing.parsedItem,
                quantity: existing.parsedItem.quantity + newMatch.parsedItem.quantity,
              },
            }
            continue
          }
          const confirmedIdx = newProductId
            ? confirmedItems.findIndex((c) => c.productId === newProductId)
            : confirmedItems.findIndex((c) =>
                !c.productId &&
                c.nonCatalogName?.toLowerCase() === newMatch.parsedItem.name.toLowerCase()
              )
          if (confirmedIdx >= 0) {
            setConfirmedItems((prevConfirmed) =>
              prevConfirmed.map((c, i) =>
                i === confirmedIdx
                  ? { ...c, qtyNeeded: c.qtyNeeded + newMatch.parsedItem.quantity }
                  : c
              )
            )
            continue
          }
          merged.push(newMatch)
        }
        return merged
      })
      // Transition to BUILD phase after first AI parse
      setPhase("BUILD")
    },
    [confirmedItems]
  )

  function handleAcceptItem(item: ConfirmedBomItem) {
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

  function handleQtyOverride(rawText: string, qty: number) {
    setQtyOverrides((prev) => ({ ...prev, [rawText]: qty }))
  }

  function handleConfirmAll() {
    const newConfirmed: ConfirmedBomItem[] = pendingMatches.map((match) => {
      const product = match.matchedProduct
      const qty = qtyOverrides[match.parsedItem.rawText] ?? match.parsedItem.quantity
      return {
        productId: product?.id ?? null,
        productName: product?.name ?? match.parsedItem.name,
        sku: product?.sku ?? null,
        unitOfMeasure: product?.unitOfMeasure ?? match.parsedItem.unitOfMeasure,
        tier: product?.tier === "TIER_1" ? "TIER_1" as const : "TIER_2" as const,
        qtyNeeded: qty,
        isNonCatalog: match.isNonCatalog,
        nonCatalogName: match.isNonCatalog ? match.parsedItem.name : null,
        nonCatalogCategory: match.isNonCatalog ? (match.parsedItem.category ?? null) : null,
        nonCatalogUom: match.isNonCatalog ? match.parsedItem.unitOfMeasure : null,
        nonCatalogEstCost: match.isNonCatalog ? (match.parsedItem.estimatedCost ?? null) : null,
        currentQty: product?.currentQty ?? 0,
        reorderPoint: product?.reorderPoint ?? 0,
        dimLength: product?.dimLength ?? null,
        dimLengthUnit: product?.dimLengthUnit ?? null,
        dimWidth: product?.dimWidth ?? null,
        dimWidthUnit: product?.dimWidthUnit ?? null,
        catalogMatch: match,
      }
    })

    setConfirmedItems((prev) => [...prev, ...newConfirmed])
    setPendingMatches([])
    setQtyOverrides({})
  }

  function handleAddProduct(product: ProductResult) {
    const existingIdx = confirmedItems.findIndex((c) => c.productId === product.id)
    if (existingIdx >= 0) {
      setConfirmedItems((prev) =>
        prev.map((c, i) => i === existingIdx ? { ...c, qtyNeeded: c.qtyNeeded + 1 } : c)
      )
    } else {
      setConfirmedItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unitOfMeasure: product.unitOfMeasure,
          tier: "TIER_1" as const,
          qtyNeeded: 1,
          isNonCatalog: false,
          nonCatalogName: null,
          nonCatalogCategory: null,
          nonCatalogUom: null,
          nonCatalogEstCost: null,
          currentQty: product.currentQty,
          reorderPoint: 0,
          dimLength: product.dimLength ?? null,
          dimLengthUnit: product.dimLengthUnit ?? null,
          dimWidth: product.dimWidth ?? null,
          dimWidthUnit: product.dimWidthUnit ?? null,
          catalogMatch: {
            parsedItem: { rawText: product.name, name: product.name, quantity: 1, unitOfMeasure: product.unitOfMeasure, confidence: 1 },
            matchedProduct: { id: product.id, name: product.name, sku: product.sku, unitOfMeasure: product.unitOfMeasure, currentQty: product.currentQty, tier: "TIER_1", categoryName: "", lastCost: 0, avgCost: 0, reorderPoint: 0, dimLength: product.dimLength ?? null, dimLengthUnit: product.dimLengthUnit ?? null, dimWidth: product.dimWidth ?? null, dimWidthUnit: product.dimWidthUnit ?? null },
            matchConfidence: 1,
            isNonCatalog: false,
          },
        },
      ])
    }
    setAddRowOpen(false)
  }

  function handleAddNonCatalog() {
    if (!nonCatalogName.trim()) return
    setConfirmedItems((prev) => [
      ...prev,
      {
        productId: null,
        productName: nonCatalogName.trim(),
        sku: null,
        unitOfMeasure: nonCatalogUom,
        tier: "TIER_2" as const,
        qtyNeeded: nonCatalogQty,
        isNonCatalog: true,
        nonCatalogName: nonCatalogName.trim(),
        nonCatalogCategory: null,
        nonCatalogUom: nonCatalogUom,
        nonCatalogEstCost: null,
        currentQty: 0,
        reorderPoint: 0,
        dimLength: null,
        dimLengthUnit: null,
        dimWidth: null,
        dimWidthUnit: null,
        catalogMatch: {
          parsedItem: { rawText: nonCatalogName.trim(), name: nonCatalogName.trim(), quantity: nonCatalogQty, unitOfMeasure: nonCatalogUom, confidence: 1 },
          matchedProduct: null,
          matchConfidence: 0,
          isNonCatalog: true,
        },
      },
    ])
    setNonCatalogName("")
    setNonCatalogQty(1)
    setNonCatalogUom("each")
    setNonCatalogOpen(false)
  }

  function handleRemoveConfirmed(index: number) {
    setConfirmedItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleQtyChange(index: number, qty: number) {
    setConfirmedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qtyNeeded: qty } : item))
    )
  }

  async function handleSubmit() {
    if (!jobName.trim()) {
      toast.error("Job name is required")
      return
    }
    if (confirmedItems.length === 0) {
      toast.error("Add at least one item")
      return
    }

    try {
      const result = await createBom.mutateAsync({
        jobName: jobName.trim(),
        jobNumber: jobNumber || undefined,
        notes: notes.trim() || null,
        lineItems: confirmedItems.map((item) => ({
          productId: item.productId,
          tier: item.tier,
          qtyNeeded: item.qtyNeeded,
          isNonCatalog: item.isNonCatalog,
          nonCatalogName: item.nonCatalogName,
          nonCatalogCategory: item.nonCatalogCategory,
          nonCatalogUom: item.nonCatalogUom,
          nonCatalogEstCost: item.nonCatalogEstCost,
          nonCatalogSpecs: item.catalogMatch.panelSpecs ?? undefined,
        })),
      })
      toast.success("BOM created")
      router.push(`/boms/${result.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create BOM")
    }
  }

  function handleReset() {
    setPhase("INPUT")
    setPendingMatches([])
    setConfirmedItems([])
    setQtyOverrides({})
    setJobName("")
    setJobNumber(null)
    setNotes("")
  }

  // Nav-away protection — warn when unsaved BOM data exists
  const hasUnsavedChanges = confirmedItems.length > 0 || pendingMatches.length > 0
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasUnsavedChanges])

  const bomCurrentStep = phase === "INPUT" ? 0 : confirmedItems.length > 0 ? 2 : 1

  // ─── INPUT phase — entry-path cards (mirrors receiving module) ───
  if (phase === "INPUT") {
    return (
      <div className="space-y-3 animate-fade-in-up">
        <StepProgress steps={BOM_STEPS} currentStep={bomCurrentStep} />

        {/* Entry path cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Photo / Camera */}
          <button
            type="button"
            onClick={() => aiInputRef.current?.triggerCamera()}
            className={cn(
              "group relative flex flex-col items-center gap-2 p-4 rounded-2xl border",
              "border-brand-orange/25 bg-gradient-to-b from-orange-50/80 to-white",
              "shadow-[0_2px_12px_rgba(232,121,43,0.08)]",
              "hover:border-brand-orange/40 hover:shadow-[0_6px_24px_rgba(232,121,43,0.15)]",
              "active:scale-[0.97] transition-all duration-200"
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange/10 group-hover:bg-brand-orange/15 transition-colors">
              <Camera className="h-5.5 w-5.5 text-brand-orange" />
            </div>
            <p className="text-sm font-extrabold text-navy tracking-tight">
              Photo BOM
            </p>
          </button>

          {/* Manual Entry */}
          <button
            type="button"
            onClick={() => router.push("/boms/new?tab=manual")}
            className={cn(
              "group relative flex flex-col items-center gap-2 p-4 rounded-2xl border",
              "border-brand-blue/25 bg-gradient-to-b from-blue-50/80 to-white",
              "shadow-[0_2px_12px_rgba(46,125,186,0.08)]",
              "hover:border-brand-blue/40 hover:shadow-[0_6px_24px_rgba(46,125,186,0.15)]",
              "active:scale-[0.97] transition-all duration-200"
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 group-hover:bg-brand-blue/15 transition-colors">
              <PenLine className="h-5.5 w-5.5 text-brand-blue" />
            </div>
            <p className="text-sm font-extrabold text-navy tracking-tight">
              Manual Entry
            </p>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex-1 h-px bg-border-custom/60" />
          <span className="text-[11px] font-bold text-text-muted/50 uppercase tracking-[0.12em]">
            or type / speak below
          </span>
          <div className="flex-1 h-px bg-border-custom/60" />
        </div>

        <AIInput
          ref={aiInputRef}
          onParseComplete={handleParseComplete}
          placeholder={`"20 sheets 4in IMP white, 5 boxes hinges, 2 tubes caulk..."`}
        />
      </div>
    )
  }

  // ─── BUILD phase — job picker, items review, submit ───
  return (
    <div className="space-y-2 animate-fade-in-up">
      <StepProgress steps={BOM_STEPS} currentStep={bomCurrentStep} />

      {/* Job picker */}
      <Card className="px-3 py-2.5 rounded-xl border-border-custom space-y-2">
        <h3 className="text-sm font-semibold text-navy">Job *</h3>
        <JobPicker
          onSelect={(job) => {
            setJobName(job.name)
            setJobNumber(job.number)
          }}
          selectedName={jobName || undefined}
          selectedNumber={jobNumber}
        />
      </Card>

      {/* Pending items to review */}
      {pendingMatches.length > 0 && (
        <Card className="px-3 py-2.5 rounded-xl border-border-custom">
          <BomConfirmationList
            matches={pendingMatches}
            onAccept={handleAcceptItem}
            onReject={handleRejectItem}
            onConfirmAll={handleConfirmAll}
            onQtyChange={handleQtyOverride}
          />
        </Card>
      )}

      {/* Confirmed items */}
      {confirmedItems.length > 0 && (
        <Card className="px-3 py-2.5 rounded-xl border-border-custom space-y-1">
          <h3 className="text-xs font-semibold text-green-700">
            {confirmedItems.length} item{confirmedItems.length !== 1 ? "s" : ""} on BOM
          </h3>

          {confirmedItems.map((item, index) => {
            const stockLevel = getItemStockLevel(item)
            return (
              <div
                key={`${item.productId ?? "nc"}-${index}`}
                className="py-1.5 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-medium text-gray-900">{item.productName}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1 py-0",
                          item.tier === "TIER_1"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        )}
                      >
                        {item.tier === "TIER_1" ? "T1" : "T2"}
                      </Badge>
                      {item.isNonCatalog && (
                        <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300 px-1 py-0">
                          Non-catalog
                        </Badge>
                      )}
                    </div>

                    {/* Stock status */}
                    {stockLevel !== "unknown" && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", stockDotColor[stockLevel])} />
                        <span
                          className={cn(
                            "text-[10px]",
                            stockLevel === "sufficient" && "text-green-600",
                            stockLevel === "low" && "text-yellow-600",
                            stockLevel === "out" && "text-red-500"
                          )}
                        >
                          {item.currentQty} {item.unitOfMeasure} in stock
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={item.qtyNeeded}
                      onChange={(e) => handleQtyChange(index, Number(e.target.value) || 0)}
                      className="w-16 rounded-md border border-gray-200 px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-gray-500 w-8">{item.unitOfMeasure}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveConfirmed(index)}
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {/* Add more items — collapsed by default, expands on tap */}
      {!addRowOpen ? (
        <button
          type="button"
          onClick={() => setAddRowOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-brand-blue/30 text-brand-blue hover:bg-blue-50/50 hover:border-brand-blue/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs font-semibold">Add item</span>
        </button>
      ) : (
        <Card className="px-3 py-2.5 rounded-xl border-border-custom space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-navy">Add Item</h3>
            <button
              type="button"
              onClick={() => { setAddRowOpen(false); setNonCatalogOpen(false) }}
              className="text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <AIInput
            onParseComplete={(result) => { handleParseComplete(result); setAddRowOpen(false) }}
            onProductSelect={handleAddProduct}
            placeholder="Search catalog"
            excludeIds={confirmedItems.filter((i) => i.productId).map((i) => i.productId!)}
          />

          {!nonCatalogOpen ? (
            <button
              type="button"
              onClick={() => setNonCatalogOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-orange hover:text-brand-orange-hover transition-colors px-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Non-catalog item
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/50 p-2.5">
              <input
                type="text"
                value={nonCatalogName}
                onChange={(e) => setNonCatalogName(e.target.value)}
                placeholder="Item name or description"
                className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={nonCatalogQty}
                  onChange={(e) => setNonCatalogQty(Number(e.target.value) || 1)}
                  className="w-16 rounded-md border border-gray-200 px-1.5 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white"
                />
                <select
                  value={nonCatalogUom}
                  onChange={(e) => setNonCatalogUom(e.target.value)}
                  className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white"
                >
                  <option value="each">each</option>
                  <option value="linear ft">linear ft</option>
                  <option value="sq ft">sq ft</option>
                  <option value="sheet">sheet</option>
                  <option value="box">box</option>
                  <option value="tube">tube</option>
                  <option value="case">case</option>
                  <option value="roll">roll</option>
                  <option value="bundle">bundle</option>
                  <option value="panel">panel</option>
                </select>
                <Button
                  type="button"
                  onClick={handleAddNonCatalog}
                  disabled={!nonCatalogName.trim()}
                  className="h-8 px-3 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-lg"
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Notes */}
      {confirmedItems.length > 0 && (
        <Card className="px-3 py-2.5 rounded-xl border-border-custom space-y-1.5">
          <Label className="text-sm">Notes</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this BOM..."
            className="w-full rounded-lg border border-border-custom p-2.5 text-sm min-h-[50px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </Card>
      )}

      {/* Submit */}
      {confirmedItems.length > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={createBom.isPending || !jobName.trim()}
          className="w-full h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-sm rounded-xl"
        >
          <ClipboardList className="h-5 w-5 mr-2" />
          {createBom.isPending
            ? "Creating..."
            : `Create BOM (${confirmedItems.length} item${confirmedItems.length !== 1 ? "s" : ""})`}
        </Button>
      )}

      {/* Start over */}
      <button
        onClick={handleReset}
        className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-2 transition-colors"
      >
        Start over
      </button>
    </div>
  )
}
