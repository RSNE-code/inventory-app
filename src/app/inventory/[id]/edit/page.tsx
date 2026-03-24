"use client"

import { use } from "react"
import { useProduct } from "@/hooks/use-products"
import { Header } from "@/components/layout/header"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { ProductForm } from "@/components/inventory/product-form"

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useProduct(id)
  const product = data?.data

  if (isLoading) {
    return (
      <div>
        <Header title="Edit Product" showBack />
        <div className="p-4 space-y-3">
          <div className="h-20 rounded-xl skeleton-shimmer" />
          <div className="h-48 rounded-xl skeleton-shimmer stagger-1" />
          <div className="h-32 rounded-xl skeleton-shimmer stagger-2" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div>
        <Header title="Not Found" showBack />
        <div className="p-4 text-center text-text-muted py-12">Product not found</div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Edit Product" showBack />
      <Breadcrumb items={[
        { label: "Inventory", href: "/inventory" },
        { label: product.name, href: `/inventory/${product.id}` },
        { label: "Edit" },
      ]} />
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId,
          tier: product.tier,
          unitOfMeasure: product.unitOfMeasure,
          shopUnit: product.shopUnit || null,
          reorderPoint: Number(product.reorderPoint),
          location: product.location,
          notes: product.notes,
          leadTimeDays: product.leadTimeDays,
          dimLength: product.dimLength ? Number(product.dimLength) : null,
          dimLengthUnit: product.dimLengthUnit,
          dimWidth: product.dimWidth ? Number(product.dimWidth) : null,
          dimWidthUnit: product.dimWidthUnit,
          dimThickness: product.dimThickness ? Number(product.dimThickness) : null,
          dimThicknessUnit: product.dimThicknessUnit,
        }}
      />
    </div>
  )
}
