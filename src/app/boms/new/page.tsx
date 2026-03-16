"use client"

import { Header } from "@/components/layout/header"
import { BomQuickPick } from "@/components/bom/bom-quick-pick"

export default function NewBomPage() {
  return (
    <div>
      <Header title="New BOM" showMenu />
      <div className="p-4">
        <BomQuickPick />
      </div>
    </div>
  )
}
