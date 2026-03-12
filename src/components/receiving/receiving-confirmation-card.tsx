"use client"

import { useState } from "react"
import { Check, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CatalogMatch, ConfirmedReceivingItem } from "@/lib/ai/types"

interface ReceivingConfirmationCardProps {
  match: CatalogMatch
  onAccept: (item: ConfirmedReceivingItem) => void
  onReject: (match: CatalogMatch) => void
  onEditChange?: (rawText: string, edits: { quantity: number; unitCost: number }) => void
}

export function ReceivingConfirmationCard({
  match,
  onAccept,
  onReject,
  onEditChange,
}: ReceivingConfirmationCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [quantity, setQuantity] = useState(match.parsedItem.quantity)
  const defaultCost = match.parsedItem.estimatedCost
    ?? match.matchedProduct?.lastCost
    ?? 0

  function handleQtyChange(val: number) {
    setQuantity(val)
    onEditChange?.(match.parsedItem.rawText, { quantity: val, unitCost: defaultCost })
  }

  const confidenceColor =
    match.matchConfidence >= 0.8
      ? "text-green-600"
      : match.matchConfidence >= 0.5
        ? "text-yellow-600"
        : "text-red-500"

  const isLowConfidence = match.matchConfidence < 0.5 && !match.isNonCatalog

  function handleAccept(overrideProductId?: string) {
    const product = match.matchedProduct
    onAccept({
      productId: overrideProductId ?? product?.id ?? null,
      productName: product?.name ?? match.parsedItem.name,
      quantity,
      unitCost: defaultCost,
      unitOfMeasure: product?.unitOfMeasure ?? match.parsedItem.unitOfMeasure,
      isNonCatalog: overrideProductId ? false : match.isNonCatalog,
      catalogMatch: match,
    })
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

          {match.matchedProduct && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {match.matchedProduct.categoryName}
              </Badge>
              <span className="text-xs text-gray-500">
                In stock: {match.matchedProduct.currentQty} {match.matchedProduct.unitOfMeasure}
              </span>
            </div>
          )}

          {match.isNonCatalog && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 mt-1">
              Non-catalog
            </Badge>
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

      {/* Editable field: qty only */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Qty Received</label>
          <input
            type="number"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => handleQtyChange(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-gray-400 pt-5">
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
                  <span className={cn("ml-2 text-xs", confidenceColor)}>
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

interface ReceivingConfirmationListProps {
  matches: CatalogMatch[]
  onAccept: (item: ConfirmedReceivingItem) => void
  onReject: (match: CatalogMatch) => void
  onConfirmAll: () => void
  onEditChange?: (rawText: string, edits: { quantity: number; unitCost: number }) => void
}

export function ReceivingConfirmationList({
  matches,
  onAccept,
  onReject,
  onConfirmAll,
  onEditChange,
}: ReceivingConfirmationListProps) {
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
        <ReceivingConfirmationCard
          key={`${match.parsedItem.rawText}-${index}`}
          match={match}
          onAccept={onAccept}
          onReject={onReject}
          onEditChange={onEditChange}
        />
      ))}
    </div>
  )
}
