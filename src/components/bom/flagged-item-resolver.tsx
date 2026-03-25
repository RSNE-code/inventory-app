"use client"

import { useState } from "react"
import { AlertCircle, Star, Plus, Search } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ProductPicker } from "@/components/bom/product-picker"

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
  onManualMatch?: (productId: string, productName: string) => void
  isPanel?: boolean
}

export function FlaggedItemResolver({
  rawText,
  primaryMatch,
  alternatives,
  onSelect,
  onKeepAsCustom,
  onManualMatch,
  isPanel,
}: FlaggedItemResolverProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="bg-brand-orange/10 border border-brand-orange/20 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-brand-orange shrink-0 mt-0.5" />
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
            className="w-full text-left p-3 rounded-xl bg-blue-50 border-2 border-brand-blue/30 hover:border-brand-blue/60 active:scale-[0.99] transition-all"
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
            className="w-full text-left p-3 rounded-xl bg-white border border-border-custom hover:border-brand-blue/40 hover:bg-blue-50 active:scale-[0.99] transition-all"
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-brand-blue text-brand-blue font-semibold text-sm hover:bg-brand-blue/5 active:scale-[0.97] transition-all"
          >
            <Search className="h-4 w-4" />
            Match to catalog item
          </button>
          <button
            type="button"
            onClick={onKeepAsCustom}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-brand-orange text-white font-semibold text-sm shadow-[0_4px_12px_rgba(232,121,43,0.25)] hover:shadow-[0_6px_20px_rgba(232,121,43,0.35)] active:scale-[0.97] transition-all"
          >
            <Plus className="h-4 w-4" />
            Add as custom item
          </button>
        </div>
      )}

      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Find catalog item</SheetTitle>
            <p className="text-sm text-text-muted">Matching: &ldquo;{rawText}&rdquo;</p>
          </SheetHeader>
          <div className="mt-4">
            <ProductPicker
              onSelect={(product) => {
                if (onManualMatch) {
                  onManualMatch(product.id, product.name)
                } else {
                  onSelect(product.id, product.name)
                }
                setSearchOpen(false)
              }}
              placeholder="Search by name, SKU, or description..."
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
