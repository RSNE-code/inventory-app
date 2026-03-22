"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search, Plus } from "lucide-react"
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
  onCustomAdd?: (name: string) => void
  placeholder?: string
  excludeIds?: string[]
}

export function ProductPicker({ onSelect, onCustomAdd, placeholder = "Search products...", excludeIds = [] }: ProductPickerProps) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<ProductResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      setIsOpen(false)
      setSearchDone(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setSearchDone(false)
      try {
        const res = await fetch(`/api/inventory?search=${encodeURIComponent(search)}&limit=10`)
        if (res.ok) {
          const json = await res.json()
          const filtered = (json.data || []).filter(
            (p: ProductResult) => !excludeIds.includes(p.id)
          )
          setResults(filtered)
          // Keep dropdown open as long as search >= 2 chars (even if no results)
          setIsOpen(true)
        } else {
          setResults([])
          setIsOpen(search.length >= 2)
        }
      } catch {
        setResults([])
        setIsOpen(search.length >= 2)
      } finally {
        setLoading(false)
        setSearchDone(true)
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

  function handleCustomAdd() {
    const name = search.trim()
    if (!name) return
    if (onCustomAdd) {
      onCustomAdd(name)
    } else {
      onSelect({ id: "", name, sku: null, unitOfMeasure: "EA", currentQty: 0 })
    }
    setSearch("")
    setResults([])
    setIsOpen(false)
  }

  const customAddButton = (compact: boolean) => (
    <button
      type="button"
      onClick={handleCustomAdd}
      className={
        compact
          ? "w-full text-left px-4 py-3 flex items-center gap-2.5 bg-gradient-to-br from-orange-50/80 to-orange-100/60 border-t-2 border-brand-orange/20 hover:from-orange-100 hover:to-orange-100 transition-all"
          : "w-full text-left px-4 py-4 flex items-center gap-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-brand-orange/40 hover:scale-[1.02] transition-all"
      }
    >
      <div className={compact ? "h-7 w-7 rounded-lg bg-brand-orange/15 flex items-center justify-center shrink-0" : "h-9 w-9 rounded-xl bg-brand-orange/20 flex items-center justify-center shrink-0"}>
        <Plus className={compact ? "h-3.5 w-3.5 text-brand-orange" : "h-4.5 w-4.5 text-brand-orange"} />
      </div>
      <span className={compact ? "text-sm font-semibold text-brand-orange" : "text-sm font-bold text-brand-orange"}>
        + Add &ldquo;{search.trim()}&rdquo; as custom item
      </span>
    </button>
  )

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-9 h-12"
          onFocus={() => search.length >= 2 && setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border-custom rounded-xl shadow-lg max-h-64 overflow-y-auto animate-dropdown-in">
          {loading ? (
            <div className="p-3 text-center text-text-muted text-sm">Searching...</div>
          ) : results.length === 0 && searchDone ? (
            /* No results — prominent custom add */
            <div className="p-2">
              {customAddButton(false)}
            </div>
          ) : (
            <>
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full text-left px-4 py-3 hover:bg-surface-secondary border-b border-border-custom/40 last:border-0 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy break-words">{p.name}</p>
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
              ))}
              {/* Custom add at bottom of results */}
              {searchDone && search.trim().length >= 2 && customAddButton(true)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
