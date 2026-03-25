"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { SwipeToDelete } from "@/components/ui/swipe-to-delete"
import { cn, formatQuantity } from "@/lib/utils"
import { Search, Plus, Package } from "lucide-react"

interface ComponentItem {
  productId: string
  productName: string
  unitOfMeasure: string
  qtyUsed: number
  currentQty: number
}

interface ProductResult {
  id: string
  name: string
  sku: string | null
  unitOfMeasure: string
  currentQty: number
  category?: { name: string }
}

interface ComponentListProps {
  components: ComponentItem[]
  onAdd: (product: ProductResult) => void
  onRemove: (index: number) => void
  onQtyChange: (index: number, qty: number) => void
  batchSize?: number
}

export type { ComponentItem }

export function ComponentList({
  components,
  onAdd,
  onRemove,
  onQtyChange,
  batchSize = 1,
}: ComponentListProps) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<ProductResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const abortRef = useRef<AbortController | null>(null)

  const existingIds = useMemo(() => new Set(components.map((c) => c.productId)), [components])

  // Debounced product search
  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      try {
        const res = await fetch(
          `/api/products/browse?search=${encodeURIComponent(search)}&limit=10`,
          { signal: controller.signal }
        )
        if (res.ok) {
          const json = await res.json()
          const items = (json.data || []) as ProductResult[]
          setResults(items.filter((p) => !existingIds.has(p.id)))
          setIsOpen(true)
        }
      } catch {
        // Aborted or network error
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, existingIds])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSelect = useCallback(
    (product: ProductResult) => {
      onAdd(product)
      setSearch("")
      setResults([])
      setIsOpen(false)
    },
    [onAdd]
  )

  return (
    <div className="space-y-3">
      {/* Search-to-add */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products to add..."
            className="pl-10 h-12 rounded-xl border-2 border-border-custom focus:border-brand-blue"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Dropdown results */}
        {isOpen && results.length > 0 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-border-custom rounded-xl shadow-brand-md max-h-[240px] overflow-y-auto">
            {results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                className="w-full text-left px-3 py-2.5 min-h-[44px] flex items-center gap-3 hover:bg-surface-secondary active:bg-brand-blue/5 transition-colors border-b border-border-custom/40 last:border-0"
              >
                <Plus className="h-4 w-4 text-brand-blue shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy truncate">{product.name}</p>
                  <p className="text-xs text-text-muted">
                    {formatQuantity(product.currentQty)} {product.unitOfMeasure} in stock
                    {product.category ? ` · ${product.category.name}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {isOpen && search.length >= 2 && results.length === 0 && !loading && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-border-custom rounded-xl shadow-brand-md p-4 text-center">
            <p className="text-sm text-text-muted">No products found</p>
          </div>
        )}
      </div>

      {/* Component rows */}
      {components.length > 0 ? (
        <div className="space-y-0.5">
          {components.map((comp, index) => {
            const totalQty = comp.qtyUsed * batchSize
            const hasEnough = comp.currentQty >= totalQty
            return (
              <SwipeToDelete key={`${comp.productId}-${index}`} onDelete={() => onRemove(index)}>
                <div className="flex items-center justify-between py-2.5 px-1 border-b border-border-custom/40 last:border-0 bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">
                      {comp.productName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          hasEnough ? "bg-status-green" : "bg-status-red"
                        )}
                      />
                      <span className={cn("text-xs", hasEnough ? "text-status-green" : "text-status-red")}>
                        {formatQuantity(comp.currentQty)} {comp.unitOfMeasure} in stock
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={comp.qtyUsed}
                      onChange={(e) => onQtyChange(index, Number(e.target.value) || 0)}
                      className="w-16 rounded-xl border border-border-custom px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <span className="text-xs text-text-secondary w-10 truncate">{comp.unitOfMeasure}</span>
                  </div>
                </div>
              </SwipeToDelete>
            )
          })}
          {batchSize > 1 && (
            <p className="text-xs text-text-muted pt-1 px-1">
              Quantities shown per unit. Total = qty × {batchSize} batch size
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-secondary mx-auto mb-2">
            <Package className="h-5 w-5 text-text-muted/60" />
          </div>
          <p className="text-sm text-text-muted">Search above to add components</p>
        </div>
      )}
    </div>
  )
}
