"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface Alternative {
  productId: string
  productName: string
  confidence: number
}

interface FlaggedItemResolverProps {
  rawText: string
  alternatives: Alternative[]
  onSelect: (productId: string, productName: string) => void
  onKeepAsCustom: () => void
}

export function FlaggedItemResolver({
  rawText,
  alternatives,
  onSelect,
  onKeepAsCustom,
}: FlaggedItemResolverProps) {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-navy">Match needed</p>
          <p className="text-xs text-text-muted mt-0.5">
            You wrote: <span className="font-semibold">"{rawText}"</span>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {alternatives.map((alt) => (
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

      <button
        type="button"
        onClick={onKeepAsCustom}
        className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-2"
      >
        None of these — add as custom item
      </button>
    </div>
  )
}
