import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * DEV-ONLY: Reset all receiving state for E2E tests.
 * - Deletes all transactions linked to receipts
 * - Deletes all receipts
 * - Resets PO line item qtyReceived to 0
 * - Resets PO statuses to OPEN
 * - Resets product currentQty to 0
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  try {
    // Delete all receipt-linked transactions
    await prisma.transaction.deleteMany({
      where: { receiptId: { not: null } },
    })

    // Delete all receipts
    await prisma.receipt.deleteMany()

    // Reset all PO line item qtyReceived to 0
    await prisma.pOLineItem.updateMany({
      data: { qtyReceived: 0 },
    })

    // Reset all PO statuses to OPEN
    await prisma.purchaseOrder.updateMany({
      data: { status: "OPEN" },
    })

    // Reset all product currentQty to 0
    await prisma.product.updateMany({
      data: { currentQty: 0 },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Test reset error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reset failed" },
      { status: 500 }
    )
  }
}
