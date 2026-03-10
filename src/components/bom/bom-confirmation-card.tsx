"use client"

import { useState } from "react"
import { Check, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CatalogMatch, ConfirmedBomItem } from "@/lib/ai/types"

type StockLevel = "sufficient" | "low" | "out" | "unknown"

function getStockLevel(match: CatalogMatch, qtyNeeded: number): StockLevel {
  if (match.isNonCatalog || !match.matchedProduct) return "unknown"
  const qty = match.matchedProduct.currentQty
  if (qty <= 0) return "out"
  if (qty < qtyNeeded) return "low"
  return "sufficient"
}

const stockDotColor: Record<StockLevel, string> = {
  sufficient: "bg-green-500",
  low: "bg-yellow-500",
  out: "bg-red-500",
  unknown: "bg-gray-300",
}

const stockLabel: Record<StockLevel, string> = {
  sufficient: "In stock",
  low: "Low stock",
  out: "Out of stock",
  unknown: "",
}

interface BomConfirmationCardProps {
  match: CatalogMatch
  onAccept: (item: ConfirmedBomItem) => void
  onReject: (match: CatalogMatch) => void
}

export function BomConfirmationCard({
  match,
  onAccept,
  onReject,
}: BomConfirmationCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [quantity, setQuantity] = useState(match.parsedItem.quantity)

  const stockLevel = getStockLevel(match, quantity)
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
    onAccept(buildConfirmedItem(overrideProductId))
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        isLowConfidence ? "border-yellow-300 bg-yellow-50" : "border-gray-200 bg-white"
      )}
    >
      {/* Header: product info + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base text-gray-900">
            {match.matchedProduct?.name ?? match.parsedItem.name}
          </p>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
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
            <div className="flex items-center gap-1.5 mt-1.5">
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
            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
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
                    .join(" x ")}
                </p>
              )}
            </div>
          )}

          {isLowConfidence && (
            <div className="flex items-center gap-1 mt-1 text-yellow-600 text-xs">
              <AlertTriangle className="h-3 w-3" />
              <span>Low confidence — please verify</span>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-1 truncate">
            Parsed from: &ldquo;{match.parsedItem.rawText}&rdquo;
          </p>
        </div>

        <div className="flex gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 text-green-600 hover:bg-green-50"
            onClick={() => handleAccept()}
          >
            <Check className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 text-red-500 hover:bg-red-50"
            onClick={() => onReject(match)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Editable quantity */}
      <div className="flex items-center gap-3">
        <div className="w-28">
          <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
          <input
            type="number"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-sm text-gray-500 pt-5">
          {match.matchedProduct?.unitOfMeasure ?? match.parsedItem.unitOfMeasure}
        </div>
      </div>

      {/* Alternative matches */}
      {match.alternativeMatches && match.alternativeMatches.length > 0 && (
        <div>
          <button
            className="text-xs text-blue-600 flex items-center gap-1"
            onClick={() => setShowAlternatives(!showAlternatives)}
          >
            {showAlternatives ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {match.alternativeMatches.length} other possible match
            {match.alternativeMatches.length > 1 ? "es" : ""}
          </button>

          {showAlternatives && (
            <div className="mt-2 space-y-1">
              {match.alternativeMatches.map((alt) => (
                <button
                  key={alt.id}
                  className="block w-full text-left text-sm px-3 py-2 rounded hover:bg-gray-50 border border-gray-100"
                  onClick={() => handleAccept(alt.id)}
                >
                  <span>{alt.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
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
}

export function BomConfirmationList({
  matches,
  onAccept,
  onReject,
  onConfirmAll,
}: BomConfirmationListProps) {
  if (matches.length === 0) return null

  const allHighConfidence = matches.every(
    (m) => m.matchConfidence >= 0.8 || m.isNonCatalog
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">
          {matches.length} item{matches.length !== 1 ? "s" : ""} parsed
        </h3>
        {allHighConfidence && matches.length > 1 && (
          <Button size="sm" onClick={onConfirmAll} className="bg-green-600 hover:bg-green-700">
            <Check className="h-4 w-4 mr-1" />
            Confirm All
          </Button>
        )}
      </div>

      {matches.map((match, index) => (
        <BomConfirmationCard
          key={`${match.parsedItem.rawText}-${index}`}
          match={match}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </div>
  )
}
