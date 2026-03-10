"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Mic, ClipboardList, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AIInput } from "@/components/ai/ai-input"
import { BomConfirmationList } from "@/components/bom/bom-confirmation-card"
import { useCreateBom } from "@/hooks/use-boms"
import { toast } from "sonner"
import { cn, formatQuantity } from "@/lib/utils"
import { StepProgress } from "@/components/layout/step-progress"
import type {
  CatalogMatch,
  ParseResult,
  ReceivingParseResult,
  ConfirmedBomItem,
} from "@/lib/ai/types"

const BOM_STEPS = ["Job Info", "Add Materials", "Review & Submit"]

type StockLevel = "sufficient" | "low" | "out" | "unknown"

function getItemStockLevel(item: ConfirmedBomItem): StockLevel {
  if (item.isNonCatalog) return "unknown"
  if (item.currentQty <= 0) return "out"
  if (item.currentQty < item.qtyNeeded) return "low"
  return "sufficient"
}

const stockDotColor: Record<StockLevel, string> = {
  sufficient: "bg-green-500",
  low: "bg-yellow-500",
  out: "bg-red-500",
  unknown: "bg-gray-300",
}

export function BomAIFlow() {
  const router = useRouter()
  const createBom = useCreateBom()

  const [jobName, setJobName] = useState("")
  const [notes, setNotes] = useState("")
  const [pendingMatches, setPendingMatches] = useState<CatalogMatch[]>([])
  const [confirmedItems, setConfirmedItems] = useState<ConfirmedBomItem[]>([])

  const handleParseComplete = useCallback(
    (result: ParseResult | ReceivingParseResult) => {
      setPendingMatches((prev) => [...prev, ...result.items])
    },
    []
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

  function handleConfirmAll() {
    const newConfirmed: ConfirmedBomItem[] = pendingMatches.map((match) => {
      const product = match.matchedProduct
      return {
        productId: product?.id ?? null,
        productName: product?.name ?? match.parsedItem.name,
        sku: product?.sku ?? null,
        unitOfMeasure: product?.unitOfMeasure ?? match.parsedItem.unitOfMeasure,
        tier: product?.tier === "TIER_1" ? "TIER_1" as const : "TIER_2" as const,
        qtyNeeded: match.parsedItem.quantity,
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
        })),
      })
      toast.success("BOM created")
      router.push(`/boms/${result.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create BOM")
    }
  }

  const bomCurrentStep = confirmedItems.length > 0 ? 2 : (jobName.trim() ? 1 : 0)

  return (
    <div className="space-y-4">
      <StepProgress steps={BOM_STEPS} currentStep={bomCurrentStep} />

      {/* Job name */}
      <Card className="p-4 rounded-xl border-border-custom space-y-3">
        <h3 className="font-semibold text-navy">Job</h3>
        <div>
          <Label htmlFor="ai-jobName">Job Name *</Label>
          <Input
            id="ai-jobName"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            placeholder="e.g., ABC Corp Walk-in Cooler"
            className="h-12 mt-1"
          />
        </div>
      </Card>

      {/* AI Input — always visible */}
      <Card className="p-4 rounded-xl border-border-custom space-y-3">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-[#E8792B]" />
          <h3 className="font-semibold text-navy">Add Materials</h3>
        </div>
        <p className="text-sm text-gray-500">
          Speak, type, or snap a photo of your material list
        </p>
        <AIInput
          onParseComplete={handleParseComplete}
          placeholder={`"20 sheets 4in IMP white, 5 boxes hinges, 2 tubes caulk..."`}
        />
      </Card>

      {/* Pending items to review */}
      {pendingMatches.length > 0 && (
        <Card className="p-4 rounded-xl border-border-custom">
          <BomConfirmationList
            matches={pendingMatches}
            onAccept={handleAcceptItem}
            onReject={handleRejectItem}
            onConfirmAll={handleConfirmAll}
          />
        </Card>
      )}

      {/* Confirmed items */}
      {confirmedItems.length > 0 && (
        <Card className="p-4 rounded-xl border-border-custom space-y-2">
          <h3 className="font-semibold text-sm text-green-700">
            {confirmedItems.length} item{confirmedItems.length !== 1 ? "s" : ""} on BOM
          </h3>

          {confirmedItems.map((item, index) => {
            const stockLevel = getItemStockLevel(item)
            return (
              <div
                key={`${item.productId ?? "nc"}-${index}`}
                className="py-3 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-1.5 py-0",
                          item.tier === "TIER_1"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        )}
                      >
                        {item.tier === "TIER_1" ? "T1" : "T2"}
                      </Badge>
                      {item.isNonCatalog && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 px-1.5 py-0">
                          Non-catalog
                        </Badge>
                      )}
                    </div>

                    {/* Stock status */}
                    {stockLevel !== "unknown" && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", stockDotColor[stockLevel])} />
                        <span
                          className={cn(
                            "text-xs",
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
                      className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500 w-10">{item.unitOfMeasure}</span>
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

      {/* Notes */}
      {confirmedItems.length > 0 && (
        <Card className="p-4 rounded-xl border-border-custom space-y-2">
          <Label>Notes</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this BOM..."
            className="w-full rounded-lg border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </Card>
      )}

      {/* Submit */}
      {confirmedItems.length > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={createBom.isPending || !jobName.trim()}
          className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
        >
          <ClipboardList className="h-5 w-5 mr-2" />
          {createBom.isPending
            ? "Creating..."
            : `Create BOM (${confirmedItems.length} item${confirmedItems.length !== 1 ? "s" : ""})`}
        </Button>
      )}

      {/* Empty state when no items yet and no pending */}
      {confirmedItems.length === 0 && pendingMatches.length === 0 && (
        <div className="text-center py-6 text-gray-400">
          <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Use the input above to add materials to your BOM</p>
        </div>
      )}
    </div>
  )
}
