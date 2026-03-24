"use client"

import { Header } from "@/components/layout/header"
import { ReorderList } from "@/components/inventory/reorder-list"

export default function ReorderPage() {
  return (
    <div>
      <Header title="Reorder List" showBack />
      <div className="p-4 pb-24 animate-page-enter">
        <ReorderList />
      </div>
    </div>
  )
}
