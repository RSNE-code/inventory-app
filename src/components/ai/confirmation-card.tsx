"use client"

import { useState } from "react"
import { Check, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CatalogMatch } from "@/lib/ai/types"

interface ConfirmationCardProps {
  match: CatalogMatch
  onAccept: (match: CatalogMatch, selectedProductId?: string) => void
  onReject: (match: CatalogMatch) => void
  onEdit: (match: CatalogMatch) => void
}

export function ConfirmationCard({
  match,
  onAccept,
  onReject,
  onEdit,
}: ConfirmationCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)

  const confidenceColor =
    match.matchConfidence >= 0.8
      ? "text-status-green"
      : match.matchConfidence >= 0.5
        ? "text-yellow-600"
        : "text-status-red"

  const isLowConfidence = match.matchConfidence < 0.5 && !match.isNonCatalog

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        isLowConfidence ? "border-yellow-300 bg-yellow-50" : "border-border-custom bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base">
              {match.parsedItem.quantity} {match.parsedItem.unitOfMeasure}
            </span>
            {match.matchedProduct ? (
              <span className="text-navy">{match.matchedProduct.name}</span>
            ) : (
              <span className="text-navy">{match.parsedItem.name}</span>
            )}
          </div>

          {match.matchedProduct && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {match.matchedProduct.categoryName}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {match.matchedProduct.tier === "TIER_1" ? "Tracked" : "Expensed"}
              </Badge>
              <span className="text-xs text-text-secondary">
                In stock: {match.matchedProduct.currentQty} {match.matchedProduct.unitOfMeasure}
              </span>
            </div>
          )}

          {match.isNonCatalog && (
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Non-catalog — needs sourcing
              </Badge>
            </div>
          )}

          {isLowConfidence && (
            <div className="flex items-center gap-1 mt-1 text-yellow-600 text-xs">
              <AlertTriangle className="h-3 w-3" />
              <span>Low confidence match — please verify</span>
            </div>
          )}

          {/* Show what the AI parsed from the raw input */}
          <p className="text-xs text-text-muted mt-1 truncate">
            Parsed from: &ldquo;{match.parsedItem.rawText}&rdquo;
          </p>
        </div>

        <div className="flex gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 text-status-green hover:bg-status-green/10"
            onClick={() => onAccept(match)}
          >
            <Check className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 text-status-red hover:bg-status-red/10"
            onClick={() => onReject(match)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Alternative matches */}
      {match.alternativeMatches && match.alternativeMatches.length > 0 && (
        <div>
          <button
            className="text-xs text-brand-blue flex items-center gap-1"
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
                  className="block w-full text-left text-sm px-3 py-2 rounded hover:bg-surface-secondary border border-border-custom/40"
                  onClick={() => onAccept(match, alt.id)}
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

interface ConfirmationListProps {
  matches: CatalogMatch[]
  onAccept: (match: CatalogMatch, selectedProductId?: string) => void
  onReject: (match: CatalogMatch) => void
  onEdit: (match: CatalogMatch) => void
  onConfirmAll: () => void
}

export function ConfirmationList({
  matches,
  onAccept,
  onReject,
  onEdit,
  onConfirmAll,
}: ConfirmationListProps) {
  if (matches.length === 0) return null

  const allHighConfidence = matches.every(
    (m) => m.matchConfidence >= 0.8 || m.isNonCatalog
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-text-primary">
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
        <ConfirmationCard
          key={`${match.parsedItem.rawText}-${index}`}
          match={match}
          onAccept={onAccept}
          onReject={onReject}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}
