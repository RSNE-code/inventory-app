"use client"

import { useState } from "react"
import { PackageCheck, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

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

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
      >
        <PackageCheck className="h-5 w-5 mr-2" />
        Check Out All ({remainingItems.length} items)
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="h-12 w-12 rounded-full bg-brand-orange/10 flex items-center justify-center">
                <PackageCheck className="h-6 w-6 text-brand-orange" />
              </div>
            </div>
            <DialogTitle className="text-center">Confirm Full Checkout</DialogTitle>
            <DialogDescription className="text-center">
              {remainingItems.length} item{remainingItems.length !== 1 ? "s" : ""} will be pulled from inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {remainingItems.map((item) => {
              const remaining = item.qtyNeeded - item.qtyCheckedOut
              return (
                <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700 truncate flex-1 mr-2">{item.name}</span>
                  <span className="text-navy font-semibold shrink-0">
                    {remaining} {item.unitOfMeasure}
                  </span>
                </div>
              )
            })}
          </div>
          <DialogFooter className="sm:flex-col gap-2">
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className="w-full h-11 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold"
            >
              <Check className="h-4 w-4 mr-1" />
              {isPending ? "Processing..." : "Confirm Checkout"}
            </Button>
            <Button onClick={() => setShowConfirm(false)} variant="outline" className="w-full h-11 text-sm">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
