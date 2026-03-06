"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Package } from "lucide-react"
import { useProducts } from "@/hooks/use-products"
import { Header } from "@/components/layout/header"
import { SearchInput } from "@/components/shared/search-input"
import { CategoryFilter } from "@/components/inventory/category-filter"
import { ProductCard } from "@/components/inventory/product-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

export default function InventoryPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useProducts({ search, category, page, limit: 50 })

  const products = data?.data || []
  const totalPages = data?.totalPages || 1

  // Extract unique categories from products for filter
  const categories: { id: string; name: string }[] = []
  const seen = new Set<string>()
  for (const p of products) {
    if (p.category && !seen.has(p.category.id)) {
      seen.add(p.category.id)
      categories.push({ id: p.category.id, name: p.category.name })
    }
  }
  categories.sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <Header title="Inventory" />

      <div className="p-4 space-y-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search products or SKUs..."
        />

        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selected={category}
            onSelect={(id) => { setCategory(id); setPage(1) }}
          />
        )}
      </div>

      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-text-muted">Loading...</div>
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
            <p className="text-text-muted text-sm">{data?.total || 0} products</p>
            {products.map((p: Record<string, unknown>) => (
              <ProductCard
                key={p.id as string}
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
            ))}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-text-secondary">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
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
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white shadow-lg z-30"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}
