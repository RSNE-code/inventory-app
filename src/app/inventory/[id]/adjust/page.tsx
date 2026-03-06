"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { useProduct, useAdjustStock } from "@/hooks/use-products"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatQuantity } from "@/lib/utils"
import { getDisplayQty } from "@/lib/units"
import { StockBadge } from "@/components/inventory/stock-badge"
import { toast } from "sonner"

const REASONS = [
  "Physical count correction",
  "Received shipment (no PO)",
  "Damage / waste",
  "Found misplaced stock",
  "Initial inventory load",
  "Other",
]

export default function AdjustStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading } = useProduct(id)
  const adjustMutation = useAdjustStock()

  const [direction, setDirection] = useState<"up" | "down">("up")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [notes, setNotes] = useState("")

  const product = data?.data
  const currentQty = product ? Number(product.currentQty) : 0
  const display = product ? getDisplayQty(product) : { qty: 0, unit: "" }
  const hasShopUnit = product?.shopUnit && product.shopUnit !== product.unitOfMeasure
  const qty = parseFloat(quantity) || 0
  // If shop unit is set, convert the user's input back to purchase units for the API
  const purchaseQty = hasShopUnit && display.qty > 0 ? qty * (currentQty / display.qty) : qty
  const newDisplayQty = direction === "up" ? display.qty + qty : display.qty - qty
  const finalReason = reason === "Other" ? customReason : reason

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!qty || !finalReason) return

    try {
      await adjustMutation.mutateAsync({
        productId: id,
        quantity: purchaseQty,
        direction,
        reason: finalReason,
        notes: notes || undefined,
      })
      toast.success("Stock adjusted successfully")
      router.push(`/inventory/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust stock")
    }
  }

  if (isLoading || !product) {
    return (
      <div>
        <Header title="Adjust Stock" showBack />
        <div className="p-4 text-center text-text-muted py-12">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Adjust Stock" showBack />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Current stock */}
        <Card className="p-4 rounded-xl border-border-custom text-center">
          <p className="text-text-muted text-sm">{product.name}</p>
          <div className="mt-1">
            <span className="text-3xl font-bold text-navy tabular-nums">
              {formatQuantity(display.qty)}
            </span>
            <span className="text-text-secondary ml-2">{display.unit}</span>
          </div>
          <div className="mt-2">
            <StockBadge currentQty={currentQty} reorderPoint={Number(product.reorderPoint)} />
          </div>
        </Card>

        {/* Direction toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={() => setDirection("up")}
            variant={direction === "up" ? "default" : "outline"}
            className={`h-12 font-semibold ${direction === "up" ? "bg-status-green hover:bg-status-green/90 text-white" : ""}`}
          >
            + Add
          </Button>
          <Button
            type="button"
            onClick={() => setDirection("down")}
            variant={direction === "down" ? "default" : "outline"}
            className={`h-12 font-semibold ${direction === "down" ? "bg-status-red hover:bg-status-red/90 text-white" : ""}`}
          >
            - Remove
          </Button>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="h-14 text-2xl text-center font-semibold tabular-nums"
            required
          />
        </div>

        {/* Preview */}
        {qty > 0 && (
          <Card className="p-3 rounded-xl bg-surface-secondary border-0 text-center">
            <p className="text-sm text-text-secondary">
              {formatQuantity(display.qty)} → <span className="font-bold text-navy">{formatQuantity(newDisplayQty)}</span>{" "}
              {display.unit}{" "}
              <span className={direction === "up" ? "text-status-green" : "text-status-red"}>
                ({direction === "up" ? "+" : "-"}{formatQuantity(qty)})
              </span>
            </p>
          </Card>
        )}

        {/* Reason */}
        <div className="space-y-2">
          <Label>Reason *</Label>
          <Select value={reason} onValueChange={setReason} required>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {reason === "Other" && (
          <div className="space-y-2">
            <Label htmlFor="customReason">Describe reason *</Label>
            <Input
              id="customReason"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Enter reason..."
              className="h-12"
              required
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="h-12"
          />
        </div>

        <Button
          type="submit"
          disabled={!qty || !finalReason || adjustMutation.isPending}
          className="w-full h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base mt-4"
        >
          {adjustMutation.isPending ? "Adjusting..." : "Confirm Adjustment"}
        </Button>
      </form>
    </div>
  )
}
