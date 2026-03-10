"use client"

import { useState } from "react"
import { PackageCheck, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface CheckoutItem {
  id: string
  name: string
  qtyNeeded: number
  qtyCheckedOut: number
  qtyReturned: number
  unitOfMeasure: string
  isNonCatalog: boolean
}

interface CheckoutAllButtonProps {
  items: CheckoutItem[]
  onCheckoutAll: (items: Array<{ bomLineItemId: string; type: "CHECKOUT"; quantity: number }>) => void
  isPending: boolean
}

export function CheckoutAllButton({
  items,
  onCheckoutAll,
  isPending,
}: CheckoutAllButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  // Filter to items that haven't been fully checked out
  const remainingItems = items.filter((item) => {
    const remaining = item.qtyNeeded - item.qtyCheckedOut
    return remaining > 0
  })

  if (remainingItems.length === 0) return null

  function handleConfirm() {
    const checkoutItems = remainingItems.map((item) => ({
      bomLineItemId: item.id,
      type: "CHECKOUT" as const,
      quantity: item.qtyNeeded - item.qtyCheckedOut,
    }))
    onCheckoutAll(checkoutItems)
    setShowConfirm(false)
  }

  if (!showConfirm) {
    return (
      <Button
        onClick={() => setShowConfirm(true)}
        className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
      >
        <PackageCheck className="h-5 w-5 mr-2" />
        Check Out All ({remainingItems.length} items)
      </Button>
    )
  }

  return (
    <Card className="p-4 rounded-xl border-[#E8792B] border-2 space-y-3">
      <h3 className="font-semibold text-navy">Confirm Full Checkout</h3>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {remainingItems.map((item) => {
          const remaining = item.qtyNeeded - item.qtyCheckedOut
          return (
            <div key={item.id} className="flex items-center justify-between text-sm py-1">
              <span className="text-gray-700 truncate flex-1 mr-2">{item.name}</span>
              <span className="text-gray-500 shrink-0">
                {remaining} {item.unitOfMeasure}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold"
        >
          <Check className="h-4 w-4 mr-1" />
          {isPending ? "Processing..." : "Confirm"}
        </Button>
        <Button
          onClick={() => setShowConfirm(false)}
          variant="outline"
          className="h-12"
        >
          Cancel
        </Button>
      </div>
    </Card>
  )
}
