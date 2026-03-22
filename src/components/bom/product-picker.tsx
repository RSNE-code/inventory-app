"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Search, Plus, Sparkles } from "lucide-react"
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
  const abortRef = useRef<AbortController | null>(null)

  // Stabilize excludeIds to prevent effect re-fires from array reference changes
  const excludeKey = useMemo(() => excludeIds.join(","), [excludeIds])

  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      setIsOpen(false)
      setSearchDone(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      // Abort any in-flight request
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setSearchDone(false)
      try {
        const res = await fetch(`/api/inventory?search=${encodeURIComponent(search)}&limit=10`, {
          signal: controller.signal,
        })
        if (res.ok) {
          const json = await res.json()
          const excludeSet = new Set(excludeIds)
          const filtered = (json.data || []).filter(
            (p: ProductResult) => !excludeSet.has(p.id)
          )
          setResults(filtered)
          setIsOpen(true)
        } else {
          setResults([])
          setIsOpen(search.length >= 2)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setResults([])
        setIsOpen(search.length >= 2)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setSearchDone(true)
        }
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, excludeKey])

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
          ? "w-full text-left px-4 py-3.5 flex items-center gap-3 bg-brand-orange/[0.06] border-t-2 border-brand-orange/15 hover:bg-brand-orange/[0.12] transition-all active:scale-[0.98]"
          : "w-full text-left px-4 py-4 flex items-center gap-3 bg-brand-orange text-white rounded-xl shadow-[0_4px_16px_rgba(232,121,43,0.3)] hover:shadow-[0_6px_24px_rgba(232,121,43,0.4)] hover:scale-[1.02] transition-all active:scale-[0.97]"
      }
    >
      <div className={
        compact
          ? "h-8 w-8 rounded-lg bg-brand-orange/15 flex items-center justify-center shrink-0"
          : "h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"
      }>
        {compact ? (
          <Plus className="h-4 w-4 text-brand-orange" />
        ) : (
          <Sparkles className="h-5 w-5 text-white" />
        )}
      </div>
      <div className="min-w-0">
        <span className={
          compact
            ? "text-sm font-bold text-brand-orange"
            : "text-[15px] font-bold text-white"
        }>
          Add &ldquo;{search.trim()}&rdquo; as custom item
        </span>
        {!compact && (
          <p className="text-xs text-white/70 mt-0.5">Not in catalog — add it manually</p>
        )}
      </div>
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
          onFocus={() => search.length >= 2 && results.length > 0 && setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border-custom rounded-xl shadow-lg max-h-64 overflow-y-auto animate-dropdown-in">
          {loading ? (
            <div className="p-4 flex items-center justify-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-orange animate-building-pulse" style={{ animationDelay: "0s" }} />
              <div className="h-1.5 w-1.5 rounded-full bg-brand-orange animate-building-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="h-1.5 w-1.5 rounded-full bg-brand-orange animate-building-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
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
                  className="w-full text-left px-4 py-3 hover:bg-surface-secondary border-b border-border-custom/40 last:border-0 transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy break-words">{p.name}</p>
                      <p className="text-xs text-text-muted">
                        {p.sku || "No SKU"} &middot; {p.unitOfMeasure}
                        {p.category ? ` · ${p.category.name}` : ""}
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
