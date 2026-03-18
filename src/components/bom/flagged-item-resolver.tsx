"use client"

import { AlertCircle, Star } from "lucide-react"

interface Alternative {
  productId: string
  productName: string
  confidence: number
}

interface FlaggedItemResolverProps {
  rawText: string
  primaryMatch?: Alternative | null
  alternatives: Alternative[]
  onSelect: (productId: string, productName: string) => void
  onKeepAsCustom: () => void
  isPanel?: boolean
}

export function FlaggedItemResolver({
  rawText,
  primaryMatch,
  alternatives,
  onSelect,
  onKeepAsCustom,
  isPanel,
}: FlaggedItemResolverProps) {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-navy">Confirm match</p>
          <p className="text-xs text-text-muted mt-0.5">
            You wrote: <span className="font-semibold">"{rawText}"</span>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {/* Primary match — shown first, visually distinguished */}
        {primaryMatch && (
          <button
            type="button"
            onClick={() => onSelect(primaryMatch.productId, primaryMatch.productName)}
            className="w-full text-left p-3 rounded-lg bg-blue-50 border-2 border-brand-blue/30 hover:border-brand-blue/60 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-brand-blue shrink-0" />
              <p className="text-sm font-bold text-navy">{primaryMatch.productName}</p>
            </div>
            <p className="text-xs text-brand-blue font-medium mt-0.5">
              Best match — {Math.round(primaryMatch.confidence * 100)}%
            </p>
          </button>
        )}

        {/* Alternative matches */}
        {alternatives
          .filter((alt) => alt.productId !== primaryMatch?.productId)
          .map((alt) => (
          <button
            key={alt.productId}
            type="button"
            onClick={() => onSelect(alt.productId, alt.productName)}
            className="w-full text-left p-3 rounded-lg bg-white border border-border-custom hover:border-brand-blue/40 hover:bg-blue-50 active:scale-[0.99] transition-all"
          >
            <p className="text-sm font-semibold text-navy">{alt.productName}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {Math.round(alt.confidence * 100)}% match
            </p>
          </button>
        ))}
      </div>

      {isPanel ? (
        <p className="text-center text-xs text-text-muted py-2">
          Panel item — dimensions can be edited below
        </p>
      ) : (
        <button
          type="button"
          onClick={onKeepAsCustom}
          className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-2"
        >
          None of these — add as custom item
        </button>
      )}
    </div>
  )
}
