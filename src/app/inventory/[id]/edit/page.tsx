"use client"

import { use } from "react"
import { useProduct } from "@/hooks/use-products"
import { Header } from "@/components/layout/header"
import { ProductForm } from "@/components/inventory/product-form"

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useProduct(id)
  const product = data?.data

  if (isLoading) {
    return (
      <div>
        <Header title="Loading..." showBack />
        <div className="p-4 text-center text-text-muted py-12">Loading...</div>
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
          pieceUnit: product.pieceUnit,
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
