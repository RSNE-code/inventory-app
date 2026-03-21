"use client"

import { useState, useEffect, useRef } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, AlertTriangle, Package, ArrowRight } from "lucide-react"
import { formatQuantity } from "@/lib/utils"
import { getDisplayQty } from "@/lib/units"

interface ProductResult {
  id: string
  name: string
  sku: string | null
  unitOfMeasure: string
  shopUnit?: string | null
  currentQty: number
  dimLength?: number | null
  dimLengthUnit?: string | null
  dimWidth?: number | null
  dimWidthUnit?: string | null
  tier?: string
  category?: { name: string }
}

interface MatchCorrectionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rawText: string
  currentName: string
  onSelectProduct: (product: ProductResult) => void
  onKeepAsNonCatalog: () => void
}

export function MatchCorrectionSheet({
  open,
  onOpenChange,
  rawText,
  currentName,
  onSelectProduct,
  onKeepAsNonCatalog,
}: MatchCorrectionSheetProps) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<ProductResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset search when sheet opens
  useEffect(() => {
    if (open) {
      setSearch("")
      setResults([])
      // Pre-populate search with the raw text to help user find correct match
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  // Search products with debounce
  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/inventory?search=${encodeURIComponent(search)}&limit=12`)
        if (res.ok) {
          const json = await res.json()
          setResults(json.data || [])
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  function handleSelect(product: ProductResult) {
    onSelectProduct(product)
    onOpenChange(false)
  }

  function handleKeepNonCatalog() {
    onKeepAsNonCatalog()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-2xl max-h-[85vh] flex flex-col p-0"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-border-custom" />
        </div>

        <SheetHeader className="px-5 pb-3">
          <SheetTitle className="text-lg font-bold text-navy">Fix AI Match</SheetTitle>
          <SheetDescription className="sr-only">
            The AI matched your item with low confidence. Search for the correct product below.
          </SheetDescription>
        </SheetHeader>

        {/* What we heard vs what was matched */}
        <div className="px-5 pb-4 space-y-3">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-800">What we heard</p>
              <p className="text-base text-amber-900 font-medium mt-0.5">&ldquo;{rawText}&rdquo;</p>
              {rawText !== currentName && (
                <div className="flex items-center gap-2 mt-2">
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-sm text-amber-700">
                    Matched to: <span className="font-semibold">{currentName}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for the correct product..."
              className="pl-12 h-14 text-base rounded-xl border-border-custom"
            />
          </div>
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
          {loading ? (
            <div className="py-8 text-center text-text-muted text-base">Searching...</div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((p) => {
                const display = getDisplayQty(p)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className="w-full flex items-center justify-between gap-3 p-4 rounded-xl hover:bg-surface-secondary active:bg-brand-blue/5 active:scale-[0.98] transition-all"
                  >
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-base font-semibold text-navy truncate">{p.name}</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        {p.sku || "No SKU"} &middot; {p.unitOfMeasure}
                        {p.category ? ` · ${p.category.name}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-text-secondary">
                        {formatQuantity(display.qty)} {display.unit}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : search.length >= 2 ? (
            <div className="py-8 text-center text-text-muted text-base">No products found</div>
          ) : (
            <div className="py-8 text-center text-text-muted text-sm">
              Type at least 2 characters to search
            </div>
          )}
        </div>

        {/* Keep as non-catalog button */}
        <div className="px-5 pb-5 pt-2 border-t border-border-custom bg-white">
          <Button
            type="button"
            variant="outline"
            onClick={handleKeepNonCatalog}
            className="w-full h-14 text-base font-semibold rounded-xl"
          >
            <Package className="h-5 w-5 mr-2" />
            Keep as Non-Catalog Item
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
