"use client"

import { useState, useEffect, useRef, useCallback, useReducer } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { JobPicker } from "@/components/bom/job-picker"
import { useCreateBom } from "@/hooks/use-boms"
import { toast } from "sonner"
import { cn, formatQuantity } from "@/lib/utils"
import { PanelLineItemForm, type PanelLineItem } from "@/components/bom/panel-line-item-form"
import {
  ClipboardList,
  Minus,
  Plus,
  Search,
  Mic,
  ShoppingCart,
  X,
  ChevronUp,
} from "lucide-react"

// ─── Types ────────────────────────────────────────

interface BrowseProduct {
  id: string
  name: string
  unitOfMeasure: string
  tier: string
  currentQty: number | string
  category: { name: string }
}

interface CartItem {
  productId: string
  productName: string
  unitOfMeasure: string
  tier: "TIER_1" | "TIER_2"
  qtyNeeded: number
  isNonCatalog?: boolean
  nonCatalogName?: string
  nonCatalogCategory?: string
  nonCatalogUom?: string
  nonCatalogSpecs?: Record<string, unknown>
}

// ─── Cart Reducer ─────────────────────────────────

type CartAction =
  | { type: "ADD"; product: BrowseProduct }
  | { type: "ADD_PANEL"; panel: PanelLineItem }
  | { type: "INCREMENT"; productId: string }
  | { type: "DECREMENT"; productId: string }
  | { type: "SET_QTY"; productId: string; qty: number }
  | { type: "REMOVE"; productId: string }
  | { type: "LOAD"; items: CartItem[] }

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "ADD_PANEL":
      return [
        ...state,
        {
          productId: action.panel.tempId,
          productName: action.panel.productName,
          unitOfMeasure: action.panel.unitOfMeasure,
          tier: action.panel.tier,
          qtyNeeded: action.panel.qtyNeeded,
          isNonCatalog: true,
          nonCatalogName: action.panel.nonCatalogName,
          nonCatalogCategory: action.panel.nonCatalogCategory,
          nonCatalogUom: action.panel.nonCatalogUom,
          nonCatalogSpecs: action.panel.nonCatalogSpecs,
        },
      ]
    case "ADD": {
      const existing = state.find((i) => i.productId === action.product.id)
      if (existing) {
        return state.map((i) =>
          i.productId === action.product.id
            ? { ...i, qtyNeeded: i.qtyNeeded + 1 }
            : i
        )
      }
      return [
        ...state,
        {
          productId: action.product.id,
          productName: action.product.name,
          unitOfMeasure: action.product.unitOfMeasure,
          tier: action.product.tier === "TIER_2" ? "TIER_2" : "TIER_1",
          qtyNeeded: 1,
        },
      ]
    }
    case "INCREMENT":
      return state.map((i) =>
        i.productId === action.productId
          ? { ...i, qtyNeeded: i.qtyNeeded + 1 }
          : i
      )
    case "DECREMENT": {
      const item = state.find((i) => i.productId === action.productId)
      if (item && item.qtyNeeded <= 1) {
        return state.filter((i) => i.productId !== action.productId)
      }
      return state.map((i) =>
        i.productId === action.productId
          ? { ...i, qtyNeeded: i.qtyNeeded - 1 }
          : i
      )
    }
    case "SET_QTY":
      if (action.qty <= 0) {
        return state.filter((i) => i.productId !== action.productId)
      }
      return state.map((i) =>
        i.productId === action.productId ? { ...i, qtyNeeded: action.qty } : i
      )
    case "REMOVE":
      return state.filter((i) => i.productId !== action.productId)
    case "LOAD":
      return action.items
    default:
      return state
  }
}

// ─── Category tabs ────────────────────────────────

const CATEGORIES = [
  "★ Recent",
  "Panels",
  "Trim",
  "Fasteners",
  "Sealants",
  "Metal",
  "Foam",
  "Hardware",
]

const CATEGORY_MAP: Record<string, string> = {
  "Panels": "Insulated Metal Panel",
  "Trim": "Trim & Accessories",
  "Fasteners": "Fasteners",
  "Sealants": "Caulking & Sealants",
  "Metal": "Metal Raw Materials",
  "Foam": "Foam Insulation",
  "Hardware": "Door Hardware/Parts",
}

// ─── Product Row ──────────────────────────────────

function ProductRow({
  product,
  cartQty,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  product: BrowseProduct
  cartQty: number
  onAdd: () => void
  onIncrement: () => void
  onDecrement: () => void
}) {
  const stock = Number(product.currentQty)

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border-custom/40 last:border-0 active:bg-surface-secondary/60 transition-colors">
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-navy leading-snug truncate">
          {product.name}
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          {formatQuantity(stock)} {product.unitOfMeasure} in stock
        </p>
      </div>

      {/* Add / Stepper */}
      {cartQty > 0 ? (
        <div className="flex items-center gap-0 shrink-0">
          <button
            type="button"
            onClick={onDecrement}
            className="h-12 w-12 flex items-center justify-center rounded-l-xl bg-surface-secondary border border-border-custom text-navy active:bg-border-custom transition-colors"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="h-12 w-12 flex items-center justify-center border-y border-border-custom bg-white">
            <span className="text-base font-bold text-brand-blue tabular-nums">{cartQty}</span>
          </div>
          <button
            type="button"
            onClick={onIncrement}
            className="h-12 w-12 flex items-center justify-center rounded-r-xl bg-surface-secondary border border-border-custom text-navy active:bg-border-custom transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="h-12 w-12 flex items-center justify-center rounded-xl bg-brand-blue text-white active:bg-brand-blue/80 transition-colors shrink-0"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}

// ─── Cart Summary Bar ─────────────────────────────

function CartBar({
  cart,
  onToggleExpand,
  expanded,
  onSetQty,
  onRemove,
  onSubmit,
  isPending,
  disabled,
}: {
  cart: CartItem[]
  onToggleExpand: () => void
  expanded: boolean
  onSetQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
  onSubmit: () => void
  isPending: boolean
  disabled: boolean
}) {
  if (cart.length === 0) return null

  const totalItems = cart.reduce((sum, i) => sum + i.qtyNeeded, 0)

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-border-custom shadow-[0_-4px_12px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
      {/* Expanded cart */}
      {expanded && (
        <div className="max-h-64 overflow-y-auto border-b border-border-custom">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 px-4 py-3 border-b border-border-custom/30 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy truncate">{item.productName}</p>
                <p className="text-xs text-text-muted">{item.unitOfMeasure}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onSetQty(item.productId, item.qtyNeeded - 1)}
                  className="h-10 w-10 flex items-center justify-center rounded-lg border border-border-custom text-navy"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={item.qtyNeeded}
                  onChange={(e) => onSetQty(item.productId, Number(e.target.value) || 0)}
                  className="w-14 h-10 text-center text-sm font-bold rounded-lg border border-border-custom"
                  min={0}
                  step="any"
                />
                <button
                  type="button"
                  onClick={() => onSetQty(item.productId, item.qtyNeeded + 1)}
                  className="h-10 w-10 flex items-center justify-center rounded-lg border border-border-custom text-navy"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.productId)}
                className="h-10 w-10 flex items-center justify-center text-red-400 hover:text-red-600 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 space-y-2">
        {/* Cart summary row */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-secondary"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-brand-blue" />
            <span className="text-sm font-bold text-navy">
              {cart.length} item{cart.length !== 1 ? "s" : ""} ({totalItems} total)
            </span>
          </div>
          <ChevronUp className={cn("h-4 w-4 text-text-muted transition-transform", expanded && "rotate-180")} />
        </button>

        {/* Create BOM button */}
        <Button
          onClick={onSubmit}
          disabled={isPending || disabled}
          className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-base rounded-xl"
        >
          <ClipboardList className="h-5 w-5 mr-2" />
          {isPending ? "Creating..." : `Create BOM (${cart.length} item${cart.length !== 1 ? "s" : ""})`}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────

export function BomQuickPick() {
  const router = useRouter()
  const createBom = useCreateBom()

  // Core state
  const [jobName, setJobName] = useState("")
  const [jobNumber, setJobNumber] = useState<string | null>(null)
  const [cart, dispatch] = useReducer(cartReducer, [])
  const [cartExpanded, setCartExpanded] = useState(false)

  // Browse state
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("★ Recent")
  const [products, setProducts] = useState<BrowseProduct[]>([])
  const [loading, setLoading] = useState(true)
  const searchRef = useRef<ReturnType<typeof setTimeout>>(null)

  // ─── Product fetching (unified) ─────────────

  const fetchProducts = useCallback(async (searchTerm: string, category: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "50" })
      if (searchTerm.length >= 2) {
        params.set("search", searchTerm)
      } else if (category !== "★ Recent") {
        const apiCategory = CATEGORY_MAP[category]
        if (apiCategory) params.set("category", apiCategory)
      }
      // "★ Recent" with no search = no params = favorites

      const res = await fetch(`/api/products/browse?${params}`)
      if (res.ok) {
        const json = await res.json()
        setProducts(json.data || [])
      }
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchProducts("", "★ Recent")
  }, [fetchProducts])

  // Search with debounce
  function handleSearchChange(value: string) {
    setSearch(value)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      fetchProducts(value, activeCategory)
    }, 300)
  }

  // Detect whether we should show the panel form instead of catalog products
  const PANEL_SEARCH_TERMS = ["panel", "imp", "insulated metal"]
  const isPanelSearch = search.length >= 2 && PANEL_SEARCH_TERMS.some(
    (term) => search.toLowerCase().includes(term)
  )
  const showPanelForm = activeCategory === "Panels" || isPanelSearch

  // Category change
  function handleCategoryChange(category: string) {
    setActiveCategory(category)
    setSearch("")
    if (category !== "Panels") {
      fetchProducts("", category)
    }
  }

  // ─── Cart helpers ───────────────────────────

  function getCartQty(productId: string): number {
    return cart.find((i) => i.productId === productId)?.qtyNeeded || 0
  }

  // ─── Clone from previous BOM ────────────────

  async function handleClone(bomId: string) {
    try {
      const res = await fetch(`/api/boms/${bomId}`)
      if (!res.ok) throw new Error("Failed to load BOM")
      const json = await res.json()
      const bom = json.data

      const items: CartItem[] = (bom.lineItems || [])
        .filter((li: Record<string, unknown>) => !li.isNonCatalog && li.product)
        .map((li: Record<string, unknown>) => {
          const product = li.product as Record<string, unknown>
          return {
            productId: product.id as string,
            productName: product.name as string,
            unitOfMeasure: (product.unitOfMeasure as string) || "",
            tier: (li.tier as "TIER_1" | "TIER_2") || "TIER_1",
            qtyNeeded: Number(li.qtyNeeded) || 1,
          }
        })

      dispatch({ type: "LOAD", items })
      toast.success(`Loaded ${items.length} items from ${bom.jobName}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load BOM")
    }
  }

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
        lineItems: cart.map((item) => item.isNonCatalog ? ({
          tier: item.tier,
          qtyNeeded: item.qtyNeeded,
          isNonCatalog: true,
          nonCatalogName: item.nonCatalogName,
          nonCatalogCategory: item.nonCatalogCategory,
          nonCatalogUom: item.nonCatalogUom,
          nonCatalogSpecs: item.nonCatalogSpecs,
        }) : ({
          productId: item.productId,
          tier: item.tier,
          qtyNeeded: item.qtyNeeded,
        })),
      })
      toast.success("BOM created")
      router.push(`/boms/${result.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create BOM")
    }
  }

  // ─── Render ─────────────────────────────────

  return (
    <div className={cn("flex flex-col", cart.length > 0 ? "pb-52" : "pb-20")}>
      {/* ── Zone 1: Job Bar ── */}
      <div className="px-4 pt-2 pb-3">
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
        {!jobName && cart.length > 0 && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-orange/10 border border-brand-orange/20 animate-fade-in-up">
            <span className="text-brand-orange text-sm font-semibold">Select a job to create this BOM</span>
          </div>
        )}
      </div>

      {/* ── Zone 2: Search Bar ── */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search products..."
            className="pl-12 pr-12 h-14 text-base rounded-xl border-border-custom"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); fetchProducts("", activeCategory) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-surface-secondary text-text-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Zone 3: Category Tabs ── */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryChange(cat)}
            className={cn(
              "h-11 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0",
              activeCategory === cat
                ? "bg-brand-blue text-white shadow-sm"
                : "bg-surface-secondary text-navy active:bg-border-custom"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Zone 4: Product List or Panel Form ── */}
      <div className="flex-1 bg-white rounded-t-2xl border-t border-border-custom/60">
        {showPanelForm ? (
          <div className="p-4">
            <PanelLineItemForm
              onAdd={(panel) => {
                dispatch({ type: "ADD_PANEL", panel })
                toast.success(`Added ${panel.productName}`)
              }}
              onCancel={() => {
                setActiveCategory("★ Recent")
                setSearch("")
                fetchProducts("", "★ Recent")
              }}
            />
          </div>
        ) : loading ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-muted">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-base font-semibold text-navy">No products found</p>
            <p className="text-sm text-text-muted mt-1">
              {search ? "Try a different search" : "No products in this category"}
            </p>
          </div>
        ) : (
          products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              cartQty={getCartQty(product.id)}
              onAdd={() => dispatch({ type: "ADD", product })}
              onIncrement={() => dispatch({ type: "INCREMENT", productId: product.id })}
              onDecrement={() => dispatch({ type: "DECREMENT", productId: product.id })}
            />
          ))
        )}
      </div>

      {/* ── Zone 5: Cart Bar (sticky bottom) ── */}
      <CartBar
        cart={cart}
        expanded={cartExpanded}
        onToggleExpand={() => setCartExpanded(!cartExpanded)}
        onSetQty={(id, qty) => dispatch({ type: "SET_QTY", productId: id, qty })}
        onRemove={(id) => dispatch({ type: "REMOVE", productId: id })}
        onSubmit={handleSubmit}
        isPending={createBom.isPending}
        disabled={!jobName.trim() || cart.length === 0}
      />
    </div>
  )
}
