"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { BomPhotoCapture } from "@/components/bom/bom-photo-capture"
import { BomQuickPick } from "@/components/bom/bom-quick-pick"

function NewBomContent() {
  const searchParams = useSearchParams()
  const mode = searchParams.get("mode")

  return (
    <div>
      <Header title="New BOM" showMenu />
      <div className="p-4">
        {mode === "manual" ? <BomQuickPick /> : <BomPhotoCapture />}
      </div>
    </div>
  )
}

export default function NewBomPage() {
  return (
    <Suspense>
      <NewBomContent />
    </Suspense>
  )
}
