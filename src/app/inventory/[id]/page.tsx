"use client"

import { use } from "react"
import Link from "next/link"
import { useProduct } from "@/hooks/use-products"
import { Header } from "@/components/layout/header"
import { StockBadge } from "@/components/inventory/stock-badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatQuantity } from "@/lib/utils"
import { Pencil, ArrowUpDown, MapPin, Clock } from "lucide-react"

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useProduct(id)
  const product = data?.data

  if (isLoading) {
    return (
      <div>
        <Header title="Loading..." showBack />
        <div className="p-4 text-center text-text-muted py-12">Loading product...</div>
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

  const qty = Number(product.currentQty)
  const reorder = Number(product.reorderPoint)

  return (
    <div>
      <Header
        title={product.name}
        showBack
        action={
          <Link href={`/inventory/${id}/edit`}>
            <Button variant="ghost" size="icon" className="text-white hover:bg-navy-light">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="p-4 space-y-4">
        {/* Stock level card */}
        <Card className="p-6 rounded-xl border-border-custom text-center">
          <StockBadge currentQty={qty} reorderPoint={reorder} />
          <div className="mt-3">
            <span className="text-5xl font-bold text-navy tabular-nums">
              {formatQuantity(qty)}
            </span>
            <span className="text-text-secondary text-lg ml-2">{product.unitOfMeasure}</span>
          </div>
          <p className="text-text-muted text-sm mt-2">
            Reorder at {formatQuantity(reorder)} {product.unitOfMeasure}
          </p>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/inventory/${id}/adjust`} className="block">
            <Button className="w-full h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Adjust Stock
            </Button>
          </Link>
          <Link href={`/inventory/${id}/edit`} className="block">
            <Button variant="outline" className="w-full h-12 font-semibold">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
          </Link>
        </div>

        {/* Details */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <h3 className="font-semibold text-navy">Details</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <p className="text-text-muted">Category</p>
              <p className="font-medium text-navy">{product.category?.name}</p>
            </div>
            <div>
              <p className="text-text-muted">Tier</p>
              <Badge variant="outline" className="text-xs">
                {product.tier === "TIER_1" ? "Tier 1 (Tracked)" : "Tier 2 (Costing)"}
              </Badge>
            </div>
            <div>
              <p className="text-text-muted">SKU</p>
              <p className="font-medium text-navy">{product.sku || "—"}</p>
            </div>
            <div>
              <p className="text-text-muted">Avg Cost</p>
              <p className="font-medium text-navy">{formatCurrency(product.avgCost)}</p>
            </div>
            <div>
              <p className="text-text-muted">Last Cost</p>
              <p className="font-medium text-navy">{formatCurrency(product.lastCost)}</p>
            </div>
            {product.location && (
              <div>
                <p className="text-text-muted">Location</p>
                <p className="font-medium text-navy flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {product.location}
                </p>
              </div>
            )}
            {product.leadTimeDays && (
              <div>
                <p className="text-text-muted">Lead Time</p>
                <p className="font-medium text-navy flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {product.leadTimeDays} days
                </p>
              </div>
            )}
          </div>
          {product.notes && (
            <div className="pt-2 border-t border-border-custom">
              <p className="text-text-muted text-xs">Notes</p>
              <p className="text-sm text-navy mt-1">{product.notes}</p>
            </div>
          )}
        </Card>

        {/* Recent transactions */}
        {product.transactions && product.transactions.length > 0 && (
          <Card className="p-4 rounded-xl border-border-custom">
            <h3 className="font-semibold text-navy mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {product.transactions.map((t: Record<string, unknown>) => (
                <div key={t.id as string} className="flex items-center justify-between py-2 border-b border-border-custom last:border-0">
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {formatTransactionType(t.type as string)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {(t.user as Record<string, string>)?.name} &middot;{" "}
                      {new Date(t.createdAt as string).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold tabular-nums ${
                      ["RECEIVE", "RETURN_FULL", "RETURN_PARTIAL", "PRODUCE", "ADJUST_UP"].includes(t.type as string)
                        ? "text-status-green"
                        : "text-status-red"
                    }`}>
                      {["RECEIVE", "RETURN_FULL", "RETURN_PARTIAL", "PRODUCE", "ADJUST_UP"].includes(t.type as string) ? "+" : "-"}
                      {formatQuantity(Number(t.quantity))}
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      {formatQuantity(Number(t.previousQty))} → {formatQuantity(Number(t.newQty))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function formatTransactionType(type: string): string {
  const map: Record<string, string> = {
    RECEIVE: "Received",
    CHECKOUT: "Checked Out",
    ADDITIONAL_PICKUP: "Additional Pickup",
    RETURN_FULL: "Returned (Full)",
    RETURN_PARTIAL: "Returned (Partial)",
    RETURN_SCRAP: "Scrapped",
    CONSUME: "Consumed",
    PRODUCE: "Produced",
    SHIP: "Shipped",
    ADJUST_UP: "Adjusted Up",
    ADJUST_DOWN: "Adjusted Down",
  }
  return map[type] || type
}
