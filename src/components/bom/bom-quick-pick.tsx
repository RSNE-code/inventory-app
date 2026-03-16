"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AIInput } from "@/components/ai/ai-input"
import { JobPicker } from "@/components/bom/job-picker"
import { ProductPicker } from "@/components/bom/product-picker"
import { PanelLineItemForm, type PanelLineItem } from "@/components/bom/panel-line-item-form"
import { useCreateBom } from "@/hooks/use-boms"
import { Input } from "@/components/ui/input"
import { useFavoriteProducts } from "@/hooks/use-products"
import { toast } from "sonner"
import { cn, formatQuantity } from "@/lib/utils"
import { getDisplayQty } from "@/lib/units"
import {
  ClipboardList,
  Minus,
  Plus,
  Trash2,
  Star,
  Copy,
  Search,
  Layers,
  ChevronDown,
} from "lucide-react"
import type { ParseResult, ReceivingParseResult, CatalogMatch } from "@/lib/ai/types"

// ─── Types ────────────────────────────────────────

interface CartItem {
  tempId: string
  productId?: string | null
  productName: string
  sku?: string | null
  unitOfMeasure: string
  dimLength?: number | null
  dimLengthUnit?: string | null
  dimWidth?: number | null
  dimWidthUnit?: string | null
  tier: "TIER_1" | "TIER_2"
  qtyNeeded: number
  isNonCatalog: boolean
  nonCatalogName?: string | null
  nonCatalogCategory?: string | null
  nonCatalogUom?: string | null
  nonCatalogEstCost?: number | null
  nonCatalogSpecs?: Record<string, unknown> | null
  categoryName?: string
  currentQty?: number
  aiConfidence?: "high" | "low"
}

interface FavoriteProduct {
  id: string
  name: string
  sku: string | null
  unitOfMeasure: string
  shopUnit: string | null
  tier: string
  currentQty: unknown
  category: { id: string; name: string }
  dimLength: unknown
  dimLengthUnit: string | null
  dimWidth: unknown
  dimWidthUnit: string | null
  frequency: number
}

interface ClonableBom {
  id: string
  jobName: string
  jobNumber: string | null
  status: string
  createdAt: string
  itemCount: number
}

// Priority categories for pills (most common in insulation work)
const CATEGORY_PILLS = [
  "Insulated Metal Panel",
  "Trim & Accessories",
  "Fasteners",
  "Caulking & Sealants",
  "Metal Raw Materials",
  "Foam Insulation",
  "Door Hardware/Parts",
  "FRP",
]

// ─── Component ────────────────────────────────────

export function BomQuickPick() {
  const router = useRouter()
  const createBom = useCreateBom()
  const { data: favData } = useFavoriteProducts()

  const favorites: FavoriteProduct[] = favData?.data || []

  // ─── State ──────────────────────────────────
  const [jobName, setJobName] = useState("")
  const [jobNumber, setJobNumber] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryProducts, setCategoryProducts] = useState<FavoriteProduct[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [notes, setNotes] = useState("")

  // Clone from previous BOM
  const [cloneExpanded, setCloneExpanded] = useState(false)
  const [cloneSearch, setCloneSearch] = useState("")
  const [cloneResults, setCloneResults] = useState<ClonableBom[]>([])
  const [cloneLoading, setCloneLoading] = useState(false)
  const cloneDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  function handleCloneSearch(value: string) {
    setCloneSearch(value)
    if (cloneDebounceRef.current) clearTimeout(cloneDebounceRef.current)

    cloneDebounceRef.current = setTimeout(async () => {
      setCloneLoading(true)
      try {
        const params = new URLSearchParams({ limit: "20" })
        if (value.length >= 1) params.set("search", value)
        const res = await fetch(`/api/boms/clonable?${params}`)
        if (res.ok) {
          const json = await res.json()
          setCloneResults(json.data || [])
        }
      } catch {
        setCloneResults([])
      } finally {
        setCloneLoading(false)
      }
    }, 300)
  }

  function handleCloneExpand() {
    const next = !cloneExpanded
    setCloneExpanded(next)
    if (next && cloneResults.length === 0) {
      // Load initial results
      handleCloneSearch("")
    }
  }

  // ─── Cart operations ────────────────────────

  function addToCart(product: {
    id: string
    name: string
    sku?: string | null
    unitOfMeasure: string
    currentQty?: unknown
    tier?: string
    dimLength?: unknown
    dimLengthUnit?: string | null
    dimWidth?: unknown
    dimWidthUnit?: string | null
    category?: { name: string }
  }) {
    // If product already in cart, increment qty
    const existing = cart.find((item) => item.productId === product.id)
    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.productId === product.id
            ? { ...item, qtyNeeded: item.qtyNeeded + 1 }
            : item
        )
      )
      return
    }

    setCart((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitOfMeasure: product.unitOfMeasure,
        dimLength: product.dimLength ? Number(product.dimLength) : null,
        dimLengthUnit: product.dimLengthUnit || null,
        dimWidth: product.dimWidth ? Number(product.dimWidth) : null,
        dimWidthUnit: product.dimWidthUnit || null,
        tier: product.tier === "TIER_2" ? "TIER_2" : "TIER_1",
        qtyNeeded: 1,
        isNonCatalog: false,
        categoryName: product.category?.name,
        currentQty: typeof product.currentQty === "number" ? product.currentQty : Number(product.currentQty || 0),
      },
    ])
  }

  function updateQty(tempId: string, delta: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item
        const newQty = Math.max(0, item.qtyNeeded + delta)
        return { ...item, qtyNeeded: newQty }
      }).filter((item) => item.qtyNeeded > 0)
    )
  }

  function setQty(tempId: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.tempId !== tempId))
    } else {
      setCart((prev) =>
        prev.map((item) => (item.tempId === tempId ? { ...item, qtyNeeded: qty } : item))
      )
    }
  }

  function removeFromCart(tempId: string) {
    setCart((prev) => prev.filter((item) => item.tempId !== tempId))
  }

  // ─── Category drill-down ────────────────────

  async function handleCategorySelect(categoryName: string) {
    if (selectedCategory === categoryName) {
      setSelectedCategory(null)
      setCategoryProducts([])
      return
    }
    setSelectedCategory(categoryName)
    setCategoryLoading(true)
    try {
      const res = await fetch(`/api/inventory?category=${encodeURIComponent(categoryName)}&limit=50`)
      if (res.ok) {
        const json = await res.json()
        setCategoryProducts(json.data || [])
      }
    } catch {
      setCategoryProducts([])
    } finally {
      setCategoryLoading(false)
    }
  }

  // ─── Clone BOM ──────────────────────────────

  async function handleClone(bomId: string) {
    try {
      const res = await fetch(`/api/boms/${bomId}`)
      if (!res.ok) throw new Error("Failed to load BOM")
      const json = await res.json()
      const bom = json.data

      const clonedItems: CartItem[] = (bom.lineItems || []).map(
        (li: Record<string, unknown>) => {
          const product = li.product as Record<string, unknown> | null
          return {
            tempId: crypto.randomUUID(),
            productId: product?.id as string | null,
            productName: (li.isNonCatalog as boolean)
              ? (li.nonCatalogName as string) || "Non-catalog item"
              : (product?.name as string) || "Unknown",
            sku: product?.sku as string | null,
            unitOfMeasure: (li.isNonCatalog as boolean)
              ? (li.nonCatalogUom as string) || ""
              : (product?.unitOfMeasure as string) || "",
            dimLength: product?.dimLength ? Number(product.dimLength) : null,
            dimLengthUnit: (product?.dimLengthUnit as string) || null,
            dimWidth: product?.dimWidth ? Number(product.dimWidth) : null,
            dimWidthUnit: (product?.dimWidthUnit as string) || null,
            tier: (li.tier as "TIER_1" | "TIER_2") || "TIER_1",
            qtyNeeded: Number(li.qtyNeeded) || 1,
            isNonCatalog: (li.isNonCatalog as boolean) || false,
            nonCatalogName: (li.nonCatalogName as string) || null,
            nonCatalogCategory: (li.nonCatalogCategory as string) || null,
            nonCatalogUom: (li.nonCatalogUom as string) || null,
            nonCatalogEstCost: li.nonCatalogEstCost ? Number(li.nonCatalogEstCost) : null,
            nonCatalogSpecs: (li.nonCatalogSpecs as Record<string, unknown>) || null,
            currentQty: product?.currentQty ? Number(product.currentQty) : 0,
          }
        }
      )

      setCart(clonedItems)
      toast.success(`Loaded ${clonedItems.length} items from ${bom.jobName}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clone BOM")
    }
  }

  // ─── AI parse handler ───────────────────────

  const handleAIParse = useCallback(
    (result: ParseResult | ReceivingParseResult) => {
      const newItems: CartItem[] = []
      let autoAdded = 0

      for (const match of result.items) {
        const product = match.matchedProduct
        const isHighConfidence = match.matchConfidence >= 0.85 && product

        if (product) {
          // Check if already in cart
          const existingIdx = cart.findIndex((c) => c.productId === product.id)
          if (existingIdx >= 0) {
            setCart((prev) =>
              prev.map((c, i) =>
                i === existingIdx
                  ? { ...c, qtyNeeded: c.qtyNeeded + match.parsedItem.quantity }
                  : c
              )
            )
            autoAdded++
            continue
          }

          newItems.push({
            tempId: crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            unitOfMeasure: product.unitOfMeasure,
            dimLength: product.dimLength ? Number(product.dimLength) : null,
            dimLengthUnit: product.dimLengthUnit || null,
            dimWidth: product.dimWidth ? Number(product.dimWidth) : null,
            dimWidthUnit: product.dimWidthUnit || null,
            tier: product.tier === "TIER_2" ? "TIER_2" : "TIER_1",
            qtyNeeded: match.parsedItem.quantity,
            isNonCatalog: false,
            currentQty: Number(product.currentQty || 0),
            aiConfidence: isHighConfidence ? "high" : "low",
          })
          autoAdded++
        } else {
          // Non-catalog item
          newItems.push({
            tempId: crypto.randomUUID(),
            productId: null,
            productName: match.parsedItem.name,
            unitOfMeasure: match.parsedItem.unitOfMeasure,
            tier: "TIER_2",
            qtyNeeded: match.parsedItem.quantity,
            isNonCatalog: true,
            nonCatalogName: match.parsedItem.name,
            nonCatalogCategory: match.parsedItem.category ?? null,
            nonCatalogUom: match.parsedItem.unitOfMeasure,
            nonCatalogEstCost: match.parsedItem.estimatedCost ?? null,
            nonCatalogSpecs: match.panelSpecs ?? null,
            aiConfidence: "low",
          })
          autoAdded++
        }
      }

      if (newItems.length > 0) {
        setCart((prev) => [...prev, ...newItems])
      }

      if (autoAdded > 0) {
        toast.success(`Added ${autoAdded} item${autoAdded !== 1 ? "s" : ""}`)
      }
    },
    [cart]
  )

  // ─── Submit ─────────────────────────────────

  async function handleSubmit() {
    if (!jobName.trim()) {
      toast.error("Select a job first")
      return
    }
    if (cart.length === 0) {
      toast.error("Add at least one item")
      return
    }

    try {
      const result = await createBom.mutateAsync({
        jobName: jobName.trim(),
        jobNumber: jobNumber || undefined,
        notes: notes.trim() || null,
        lineItems: cart.map((item) => ({
          productId: item.productId,
          tier: item.tier,
          qtyNeeded: item.qtyNeeded,
          isNonCatalog: item.isNonCatalog,
          nonCatalogName: item.nonCatalogName,
          nonCatalogCategory: item.nonCatalogCategory,
          nonCatalogUom: item.nonCatalogUom,
          nonCatalogEstCost: item.nonCatalogEstCost,
          nonCatalogSpecs: item.nonCatalogSpecs,
        })),
      })
      toast.success("BOM created")
      router.push(`/boms/${result.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create BOM")
    }
  }

  // Cart product IDs for exclusion
  const cartProductIds = cart.filter((i) => i.productId).map((i) => i.productId!)

  // Get qty in cart for a product (for badge display on favorites)
  function getCartQty(productId: string): number {
    return cart.find((i) => i.productId === productId)?.qtyNeeded || 0
  }

  // ─── Render ─────────────────────────────────

  return (
    <div className="space-y-3 pb-36">
      {/* Job picker */}
      <Card className="p-4 rounded-xl border-border-custom space-y-3">
        <h3 className="font-semibold text-navy">Job *</h3>
        <JobPicker
          onSelect={(job) => {
            if (job.name) {
              setJobName(job.name)
              setJobNumber(job.number)
            } else {
              setJobName("")
              setJobNumber(null)
            }
          }}
          selectedName={jobName || undefined}
          selectedNumber={jobNumber}
        />
      </Card>

      {/* Clone from previous BOM — collapsible */}
      {cart.length === 0 && (
        <Card className="rounded-xl border-border-custom overflow-hidden">
          <button
            type="button"
            onClick={handleCloneExpand}
            className="w-full flex items-center justify-between gap-2 p-4 hover:bg-surface-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-brand-blue" />
              <h3 className="font-semibold text-navy text-sm">Start from previous BOM</h3>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-text-muted transition-transform", cloneExpanded && "rotate-180")} />
          </button>

          {cloneExpanded && (
            <div className="px-4 pb-4 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <Input
                  value={cloneSearch}
                  onChange={(e) => handleCloneSearch(e.target.value)}
                  placeholder="Search your BOMs..."
                  className="pl-9 h-12"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {cloneLoading ? (
                  <p className="text-sm text-text-muted text-center py-4">Searching...</p>
                ) : cloneResults.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">
                    {cloneSearch ? "No matching BOMs found" : "No previous BOMs"}
                  </p>
                ) : (
                  cloneResults.map((bom) => (
                    <button
                      key={bom.id}
                      type="button"
                      onClick={() => {
                        handleClone(bom.id)
                        setCloneExpanded(false)
                      }}
                      className="w-full flex items-center justify-between gap-2 p-3 rounded-lg hover:bg-surface-secondary transition-colors"
                    >
                      <div className="text-left min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">{bom.jobName}</p>
                        <p className="text-xs text-text-muted">
                          {bom.itemCount} items &middot; {new Date(bom.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Favorites grid */}
      {favorites.length > 0 && (
        <Card className="p-4 rounded-xl border-border-custom space-y-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-navy text-sm">Favorites</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {favorites.map((fav) => {
              const inCartQty = getCartQty(fav.id)
              const cartItem = cart.find((i) => i.productId === fav.id)
              return (
                <div
                  key={fav.id}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 rounded-xl border transition-all min-h-16",
                    inCartQty > 0
                      ? "border-brand-blue/30 bg-brand-blue/5"
                      : "border-border-custom bg-white"
                  )}
                >
                  {inCartQty > 0 ? (
                    /* In cart — show stepper */
                    <div className="flex flex-col items-center gap-1 p-2 w-full">
                      <p className="text-[11px] font-semibold text-navy text-center leading-tight line-clamp-1">
                        {fav.name.length > 20 ? fav.name.slice(0, 18) + "..." : fav.name}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => cartItem && updateQty(cartItem.tempId, -1)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border-custom text-navy hover:bg-surface-secondary active:scale-95"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-brand-blue tabular-nums">
                          {inCartQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(fav)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border-custom text-navy hover:bg-surface-secondary active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Not in cart — tap to add */
                    <button
                      type="button"
                      onClick={() => addToCart(fav)}
                      className="flex flex-col items-center justify-center gap-1 p-3 w-full h-full hover:bg-blue-50 active:scale-[0.97] transition-all rounded-xl"
                    >
                      <p className="text-xs font-semibold text-navy text-center leading-tight line-clamp-2">
                        {fav.name.length > 30 ? fav.name.slice(0, 28) + "..." : fav.name}
                      </p>
                      <span className="text-[10px] text-text-muted">
                        +1 {fav.unitOfMeasure}
                      </span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Category pills */}
      <Card className="p-4 rounded-xl border-border-custom space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-text-muted" />
          <h3 className="font-semibold text-navy text-sm">Browse or Search</h3>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {CATEGORY_PILLS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategorySelect(cat)}
              className={cn(
                "h-10 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                selectedCategory === cat
                  ? "bg-brand-blue text-white"
                  : "bg-surface-secondary text-navy hover:bg-brand-blue/10"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Category product list */}
        {selectedCategory && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {categoryLoading ? (
              <p className="text-sm text-text-muted text-center py-4">Loading...</p>
            ) : categoryProducts.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">No products found</p>
            ) : (
              categoryProducts.map((p: FavoriteProduct) => {
                const inCartQty = getCartQty(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-3 rounded-lg hover:bg-surface-secondary transition-colors"
                  >
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy truncate">{p.name}</p>
                      <p className="text-xs text-text-muted">{p.unitOfMeasure}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {inCartQty > 0 && (
                        <Badge className="bg-brand-blue text-white text-[10px] h-5 px-1.5">
                          {inCartQty}
                        </Badge>
                      )}
                      <Plus className="h-5 w-5 text-brand-blue" />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* Product search (always visible) */}
        <ProductPicker
          onSelect={addToCart}
          placeholder="Search all products..."
          excludeIds={[]}
        />

        {/* Panel + Non-catalog buttons */}
        {showPanel ? (
          <PanelLineItemForm
            onAdd={(panelItem: PanelLineItem) => {
              setCart((prev) => [...prev, panelItem as unknown as CartItem])
              setShowPanel(false)
            }}
            onCancel={() => setShowPanel(false)}
          />
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPanel(true)}
              className="flex-1 h-12 text-[15px] font-semibold"
            >
              <Layers className="h-4 w-4 mr-1.5" />
              Add Panel
            </Button>
          </div>
        )}
      </Card>

      {/* Cart — Added items */}
      {cart.length > 0 && (
        <Card className="p-4 rounded-xl border-border-custom space-y-2">
          <h3 className="font-semibold text-navy text-sm">
            Added ({cart.length} item{cart.length !== 1 ? "s" : ""})
          </h3>

          {cart.map((item) => (
            <div
              key={item.tempId}
              className={cn(
                "flex items-center gap-2 py-3 border-b border-border-custom/40 last:border-0",
                item.aiConfidence === "low" && "bg-amber-50/50 -mx-2 px-2 rounded-lg"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-navy truncate">{item.productName}</p>
                  {item.aiConfidence === "low" && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 px-1 py-0 shrink-0">
                      ?
                    </Badge>
                  )}
                  {item.isNonCatalog && (
                    <Badge variant="outline" className="text-[10px] text-brand-orange border-brand-orange/30 px-1 py-0 shrink-0">
                      NC
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-text-muted">{item.unitOfMeasure}</p>
              </div>

              {/* Qty stepper */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => updateQty(item.tempId, -1)}
                  className="h-10 w-10 flex items-center justify-center rounded-lg border border-border-custom text-navy hover:bg-surface-secondary active:scale-95 transition-all"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={item.qtyNeeded}
                  onChange={(e) => setQty(item.tempId, Number(e.target.value) || 0)}
                  className="w-14 h-10 text-center text-sm font-semibold rounded-lg border border-border-custom focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  min={0}
                  step="any"
                />
                <button
                  type="button"
                  onClick={() => updateQty(item.tempId, 1)}
                  className="h-10 w-10 flex items-center justify-center rounded-lg border border-border-custom text-navy hover:bg-surface-secondary active:scale-95 transition-all"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => removeFromCart(item.tempId)}
                className="h-10 w-10 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </Card>
      )}

      {/* Notes */}
      {cart.length > 0 && (
        <Card className="p-4 rounded-xl border-border-custom space-y-2">
          <label className="text-sm font-semibold text-navy">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this BOM..."
            className="w-full rounded-lg border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </Card>
      )}

      {/* Sticky bottom bar — sits above the h-16 bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-border-custom shadow-[0_-2px_8px_rgba(0,0,0,0.06)] p-4 space-y-2">
        {/* AI input bar */}
        <AIInput
          onParseComplete={handleAIParse}
          placeholder={`Voice, type, or photo to add items...`}
        />

        {/* Create BOM button */}
        <Button
          onClick={handleSubmit}
          disabled={createBom.isPending || !jobName.trim() || cart.length === 0}
          className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-base rounded-xl"
        >
          <ClipboardList className="h-5 w-5 mr-2" />
          {createBom.isPending
            ? "Creating..."
            : cart.length > 0
              ? `Create BOM (${cart.length} item${cart.length !== 1 ? "s" : ""})`
              : "Create BOM"}
        </Button>
      </div>
    </div>
  )
}
