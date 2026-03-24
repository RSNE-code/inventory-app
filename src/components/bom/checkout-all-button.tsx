"use client"

import { PackageCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  // Filter to items that haven't been fully checked out (accounting for returns)
  const remainingItems = items.filter((item) => {
    const netCheckedOut = item.qtyCheckedOut - item.qtyReturned
    const remaining = item.qtyNeeded - netCheckedOut
    return remaining > 0
  })

  if (remainingItems.length === 0) return null

  function handleCheckout() {
    const checkoutItems = remainingItems.map((item) => ({
      bomLineItemId: item.id,
      type: "CHECKOUT" as const,
      quantity: item.qtyNeeded - (item.qtyCheckedOut - item.qtyReturned),
    }))
    onCheckoutAll(checkoutItems)
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={isPending}
      className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-base rounded-xl"
    >
      <PackageCheck className="h-5 w-5 mr-2" />
      {isPending ? "Processing..." : `Check Out All (${remainingItems.length} items)`}
    </Button>
  )
}
