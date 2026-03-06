import { Header } from "@/components/layout/header"
import { ProductForm } from "@/components/inventory/product-form"

export default function NewProductPage() {
  return (
    <div>
      <Header title="Add Product" showBack />
      <ProductForm />
    </div>
  )
}
