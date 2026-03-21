"use client"

import { useState } from "react"
import { Check, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useHaptic } from "@/hooks/use-haptic"
import type { CatalogMatch, ConfirmedBomItem } from "@/lib/ai/types"
import { getMatchStockLevel, stockDotColor, stockLabel } from "@/lib/bom-utils"

interface BomConfirmationCardProps {
  match: CatalogMatch
  onAccept: (item: ConfirmedBomItem) => void
  onReject: (match: CatalogMatch) => void
  onQtyChange?: (rawText: string, qty: number) => void
}

export function BomConfirmationCard({
  match,
  onAccept,
  onReject,
  onQtyChange,
}: BomConfirmationCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [quantity, setQuantity] = useState(match.parsedItem.quantity)
  const [isAccepted, setIsAccepted] = useState(false)
  const [isRejected, setIsRejected] = useState(false)
  const haptic = useHaptic()

  function handleQtyChange(val: number) {
    setQuantity(val)
    onQtyChange?.(match.parsedItem.rawText, val)
  }

  const stockLevel = getMatchStockLevel(match, quantity)
  const isLowConfidence = match.matchConfidence < 0.5 && !match.isNonCatalog

  function buildConfirmedItem(overrideProductId?: string): ConfirmedBomItem {
    const product = match.matchedProduct
    return {
      productId: overrideProductId ?? product?.id ?? null,
      productName: product?.name ?? match.parsedItem.name,
      sku: product?.sku ?? null,
      unitOfMeasure: product?.unitOfMeasure ?? match.parsedItem.unitOfMeasure,
      tier: product?.tier === "TIER_1" ? "TIER_1" : "TIER_2",
      qtyNeeded: quantity,
      isNonCatalog: overrideProductId ? false : match.isNonCatalog,
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
  }

  function handleAccept(overrideProductId?: string) {
    if (isAccepted) return // Prevent double-tap
    setIsAccepted(true)
    haptic.success()
    // Animate out, then call parent
    setTimeout(() => {
      onAccept(buildConfirmedItem(overrideProductId))
    }, 250)
  }

  function handleReject() {
    if (isRejected) return // Prevent double-tap
    setIsRejected(true)
    haptic.warning()
    setTimeout(() => {
      onReject(match)
    }, 200)
  }

  // Exit animation states
  if (isAccepted) {
    return (
      <div className="animate-ios-spring-out rounded-xl border border-green-300 bg-green-50 p-4 flex items-center gap-3 overflow-hidden">
        <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shrink-0 animate-ios-checkmark">
          <Check className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-800 truncate">
            {match.matchedProduct?.name ?? match.parsedItem.name}
          </p>
          <p className="text-xs text-green-600">Added to BOM</p>
        </div>
      </div>
    )
  }

  if (isRejected) {
    return (
      <div className="animate-ios-spring-out rounded-xl border border-red-200 bg-red-50/50 p-4 flex items-center gap-3 overflow-hidden opacity-50">
        <X className="h-5 w-5 text-red-400 shrink-0" />
        <p className="text-sm text-red-400 truncate">
          {match.matchedProduct?.name ?? match.parsedItem.name} removed
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3 animate-ios-spring-in",
        isLowConfidence ? "border-yellow-300 bg-yellow-50" : "border-border-custom bg-white"
      )}
    >
      {/* Header: product info + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] text-navy leading-snug">
            {match.matchedProduct?.name ?? match.parsedItem.name}
          </p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {match.matchedProduct && (
              <>
                <Badge variant="secondary" className="text-xs">
                  {match.matchedProduct.categoryName}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    match.matchedProduct.tier === "TIER_1"
                      ? "text-blue-700 border-blue-200 bg-blue-50"
                      : "text-purple-700 border-purple-200 bg-purple-50"
                  )}
                >
                  {match.matchedProduct.tier === "TIER_1" ? "Tracked" : "Expensed"}
                </Badge>
              </>
            )}

            {match.isNonCatalog && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Non-catalog
              </Badge>
            )}
          </div>

          {/* Stock status */}
          {stockLevel !== "unknown" && match.matchedProduct && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={cn("h-2 w-2 rounded-full shrink-0", stockDotColor[stockLevel])} />
              <span
                className={cn(
                  "text-xs",
                  stockLevel === "sufficient" && "text-green-600",
                  stockLevel === "low" && "text-yellow-600",
                  stockLevel === "out" && "text-red-500"
                )}
              >
                {stockLabel[stockLevel]}: {match.matchedProduct.currentQty} {match.matchedProduct.unitOfMeasure}
              </span>
            </div>
          )}

          {/* Non-catalog structured fields */}
          {match.isNonCatalog && (
            <div className="text-xs text-text-muted mt-1.5 space-y-0.5">
              {match.parsedItem.category && <p>Category: {match.parsedItem.category}</p>}
              {match.parsedItem.material && <p>Material: {match.parsedItem.material}</p>}
              {match.parsedItem.finish && <p>Finish: {match.parsedItem.finish}</p>}
              {match.parsedItem.dimensions && (
                <p>
                  Dimensions:{" "}
                  {[
                    match.parsedItem.dimensions.length &&
                      `${match.parsedItem.dimensions.length}${match.parsedItem.dimensions.lengthUnit || ""}`,
                    match.parsedItem.dimensions.width &&
                      `${match.parsedItem.dimensions.width}${match.parsedItem.dimensions.widthUnit || ""}`,
                    match.parsedItem.dimensions.thickness &&
                      `${match.parsedItem.dimensions.thickness}${match.parsedItem.dimensions.thicknessUnit || ""}`,
                  ]
                    .filter(Boolean)
                    .join(" × ")}
                </p>
              )}
            </div>
          )}

          {isLowConfidence && (
            <div className="flex items-center gap-1.5 mt-2 text-yellow-600 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Low confidence — please verify</span>
            </div>
          )}

          <p className="text-xs text-text-muted mt-1.5 truncate">
            Parsed from: &ldquo;{match.parsedItem.rawText}&rdquo;
          </p>
        </div>

        {/* Accept / Reject — 44pt touch targets */}
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            className={cn(
              "h-11 w-11 flex items-center justify-center rounded-xl",
              "bg-green-50 border border-green-200 text-green-600",
              "active:bg-green-100 ios-press transition-all"
            )}
            onClick={() => handleAccept()}
          >
            <Check className="h-5 w-5" />
          </button>
          <button
            type="button"
            className={cn(
              "h-11 w-11 flex items-center justify-center rounded-xl",
              "bg-red-50 border border-red-200 text-red-500",
              "active:bg-red-100 ios-press transition-all"
            )}
            onClick={handleReject}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Editable quantity — iOS-style stepper */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0 rounded-xl border border-border-custom overflow-hidden">
          <button
            type="button"
            onClick={() => { handleQtyChange(Math.max(0, quantity - 1)); haptic.light() }}
            className="h-11 w-11 flex items-center justify-center bg-surface-secondary text-navy active:bg-border-custom transition-colors"
          >
            <span className="text-lg font-medium">−</span>
          </button>
          <input
            type="number"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => handleQtyChange(Number(e.target.value) || 0)}
            className="h-11 w-16 text-center text-[15px] font-bold text-navy bg-white border-x border-border-custom tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => { handleQtyChange(quantity + 1); haptic.light() }}
            className="h-11 w-11 flex items-center justify-center bg-surface-secondary text-navy active:bg-border-custom transition-colors"
          >
            <span className="text-lg font-medium">+</span>
          </button>
        </div>
        <span className="text-sm text-text-muted">
          {match.matchedProduct?.unitOfMeasure ?? match.parsedItem.unitOfMeasure}
        </span>
      </div>

      {/* Alternative matches */}
      {match.alternativeMatches && match.alternativeMatches.length > 0 && (
        <div>
          <button
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue min-h-[44px] py-2"
            onClick={() => setShowAlternatives(!showAlternatives)}
          >
            {showAlternatives ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {match.alternativeMatches.length} other possible match
            {match.alternativeMatches.length > 1 ? "es" : ""}
          </button>

          {showAlternatives && (
            <div className="mt-1 space-y-1">
              {match.alternativeMatches.map((alt) => (
                <button
                  key={alt.id}
                  className={cn(
                    "block w-full text-left text-sm px-4 py-3 rounded-xl",
                    "hover:bg-surface-secondary active:bg-brand-blue/5",
                    "border border-border-custom/60",
                    "min-h-[44px] ios-press transition-all"
                  )}
                  onClick={() => handleAccept(alt.id)}
                >
                  <span className="font-medium text-navy">{alt.name}</span>
                  <span className="ml-2 text-xs text-text-muted">
                    {Math.round(alt.matchConfidence * 100)}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface BomConfirmationListProps {
  matches: CatalogMatch[]
  onAccept: (item: ConfirmedBomItem) => void
  onReject: (match: CatalogMatch) => void
  onConfirmAll: () => void
  onQtyChange?: (rawText: string, qty: number) => void
}

export function BomConfirmationList({
  matches,
  onAccept,
  onReject,
  onConfirmAll,
  onQtyChange,
}: BomConfirmationListProps) {
  const haptic = useHaptic()

  if (matches.length === 0) return null

  const allHighConfidence = matches.every(
    (m) => m.matchConfidence >= 0.8 || m.isNonCatalog
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-navy">
          {matches.length} item{matches.length !== 1 ? "s" : ""} to confirm
        </h3>
        {allHighConfidence && matches.length > 1 && (
          <button
            type="button"
            onClick={() => { onConfirmAll(); haptic.success() }}
            className={cn(
              "flex items-center gap-1.5 h-11 px-4 rounded-xl",
              "bg-green-600 text-white font-semibold text-sm",
              "active:bg-green-700 ios-press transition-all"
            )}
          >
            <Check className="h-4 w-4" />
            Confirm All
          </button>
        )}
      </div>

      {matches.map((match, index) => (
        <BomConfirmationCard
          key={`${match.parsedItem.rawText}-${index}`}
          match={match}
          onAccept={onAccept}
          onReject={onReject}
          onQtyChange={onQtyChange}
        />
      ))}
    </div>
  )
}
