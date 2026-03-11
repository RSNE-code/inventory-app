"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { StockBadge } from "./stock-badge"
import { formatQuantity } from "@/lib/utils"
import { getDisplayQty } from "@/lib/units"
import { MapPin, ChevronRight } from "lucide-react"

interface ProductCardProps {
  id: string
  name: string
  categoryName: string
  currentQty: number
  reorderPoint: number
  unitOfMeasure: string
  shopUnit?: string | null
  dimLength?: number | null
  dimLengthUnit?: string | null
  dimWidth?: number | null
  dimWidthUnit?: string | null
  location?: string | null
}

export function ProductCard({
  id, name, categoryName, currentQty, reorderPoint, unitOfMeasure, shopUnit,
  dimLength, dimLengthUnit, dimWidth, dimWidthUnit, location,
}: ProductCardProps) {
  const display = getDisplayQty({ currentQty, unitOfMeasure, shopUnit, dimLength, dimLengthUnit, dimWidth, dimWidthUnit })

  return (
    <Link href={`/inventory/${id}`}>
      <Card className="p-4 rounded-xl shadow-brand border-border-custom hover:shadow-brand-md transition-all duration-300 active:scale-[0.98] group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-navy text-sm leading-tight truncate">
              {name}
            </h3>
            <p className="text-text-muted text-xs mt-0.5">{categoryName}</p>
          </div>
          <StockBadge currentQty={currentQty} reorderPoint={reorderPoint} />
        </div>
        <div className="flex items-end justify-between mt-3">
          <div>
            <span className="text-2xl font-bold text-navy tabular-nums tracking-tight">
              {formatQuantity(display.qty)}
            </span>
            <span className="text-text-muted text-sm ml-1.5 font-medium">{display.unit}</span>
          </div>
          <div className="flex items-center gap-2">
            {location && (
              <div className="flex items-center gap-1 text-text-muted text-xs">
                <MapPin className="h-3 w-3" />
                <span>{location}</span>
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-text-muted/30 group-hover:text-text-muted/60 transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
