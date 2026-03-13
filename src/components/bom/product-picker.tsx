"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
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
  category?: { name: string }
}

interface ProductPickerProps {
  onSelect: (product: ProductResult) => void
  placeholder?: string
  excludeIds?: string[]
}

export function ProductPicker({ onSelect, placeholder = "Search products...", excludeIds = [] }: ProductPickerProps) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<ProductResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/inventory?search=${encodeURIComponent(search)}&limit=10`)
        if (res.ok) {
          const json = await res.json()
          const filtered = (json.data || []).filter(
            (p: ProductResult) => !excludeIds.includes(p.id)
          )
          setResults(filtered)
          setIsOpen(filtered.length > 0)
        } else {
          setResults([])
          setIsOpen(false)
        }
      } catch {
        setResults([])
        setIsOpen(false)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, excludeIds])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleSelect(product: ProductResult) {
    onSelect(product)
    setSearch("")
    setResults([])
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-9 h-12"
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border-custom rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-text-muted text-sm">Searching...</div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full text-left px-4 py-3 hover:bg-surface-secondary border-b border-border-custom last:border-0 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {p.sku || "No SKU"} &middot; {p.unitOfMeasure}
                      {p.category ? ` &middot; ${p.category.name}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {(() => { const d = getDisplayQty(p); return `${formatQuantity(d.qty)} ${d.unit}` })()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
