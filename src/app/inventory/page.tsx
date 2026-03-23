"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Package } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useProducts } from "@/hooks/use-products"
import { Header } from "@/components/layout/header"
import { SearchInput } from "@/components/shared/search-input"
import { CategoryFilter } from "@/components/inventory/category-filter"
import { ProductCard } from "@/components/inventory/product-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton } from "@/components/shared/skeleton"
import { Button } from "@/components/ui/button"

export default function InventoryPage() {
  return (
    <Suspense fallback={<div><Header title="Inventory" /><div className="p-4"><ListSkeleton count={6} /></div></div>}>
      <InventoryContent />
    </Suspense>
  )
}

function InventoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const urlStatus = searchParams.get("status")
    if (urlStatus) setStatus(urlStatus)
  }, [searchParams])

  const { data, isLoading } = useProducts({ search, category, status, page, limit: 50 })

  const products = data?.data || []
  const totalPages = data?.totalPages || 1

  const { data: categoriesData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories")
      if (!res.ok) throw new Error("Failed to fetch categories")
      return res.json()
    },
  })
  const categories = categoriesData?.data || []

  return (
    <div>
      <Header title="Inventory" />

      <div className="p-4 space-y-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search products or SKUs..."
        />

        <CategoryFilter
          categories={categories}
          selected={category}
          onSelect={(id) => { setCategory(id); setPage(1) }}
        />

        {status && (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-sm text-text-muted font-medium">
              Showing: {status === "low" ? "Low stock" : status === "out" ? "Out of stock" : status}
            </span>
            <button
              onClick={() => setStatus("")}
              className="text-xs text-brand-blue font-semibold hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="px-4 space-y-3 pb-24">
        {isLoading ? (
          <ListSkeleton count={6} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={search ? "Try a different search term" : "Add your first product to get started"}
            actionLabel={!search ? "Add Product" : undefined}
            onAction={!search ? () => router.push("/inventory/new") : undefined}
          />
        ) : (
          <>
            <p className="text-text-muted text-xs font-semibold uppercase tracking-wide">{data?.total || 0} products</p>
            {products.map((p: Record<string, unknown>, i: number) => (
              <div key={p.id as string} className={`animate-fade-in-up stagger-${Math.min(i + 1, 12)}`}>
                <ProductCard
                  id={p.id as string}
                  name={p.name as string}
                  categoryName={(p.category as Record<string, string>)?.name || ""}
                  currentQty={Number(p.currentQty)}
                  reorderPoint={Number(p.reorderPoint)}
                  unitOfMeasure={p.unitOfMeasure as string}
                  shopUnit={p.shopUnit as string | null}
                  dimLength={p.dimLength ? Number(p.dimLength) : null}
                  dimLengthUnit={p.dimLengthUnit as string | null}
                  dimWidth={p.dimWidth ? Number(p.dimWidth) : null}
                  dimWidthUnit={p.dimWidthUnit as string | null}
                  location={p.location as string | null}
                />
              </div>
            ))}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-text-secondary font-medium tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Button
        onClick={() => router.push("/inventory/new")}
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white shadow-[0_4px_14px_rgba(232,121,43,0.35)] hover:shadow-[0_6px_20px_rgba(232,121,43,0.45)] z-30 transition-all duration-300 md:bottom-6"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}
