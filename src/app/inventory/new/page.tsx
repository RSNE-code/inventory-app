import { Header } from "@/components/layout/header"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { ProductForm } from "@/components/inventory/product-form"

export default function NewProductPage() {
  return (
    <div>
      <Header title="Add Product" showBack />
      <Breadcrumb items={[
        { label: "Inventory", href: "/inventory" },
        { label: "New Product" },
      ]} />
      <ProductForm />
    </div>
  )
}
