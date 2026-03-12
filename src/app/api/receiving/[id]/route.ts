import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { Prisma } from "@prisma/client"

// DELETE /api/receiving/[id] — Undo (void) a receipt
// Reverses all stock changes, PO line item updates, and marks receipt as voided
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER"])

    const { id } = await params

    // Load receipt with all transactions
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        transactions: {
          include: { product: { select: { id: true, name: true } } },
        },
        purchaseOrder: {
          include: { lineItems: true },
        },
      },
    })

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
    }

    // Check if already voided (notes contain [VOIDED])
    if (receipt.notes?.includes("[VOIDED]")) {
      return NextResponse.json({ error: "Receipt has already been voided" }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Reverse each stock transaction by creating an ADJUST_DOWN
      for (const txn of receipt.transactions) {
        if (txn.type === "RECEIVE") {
          await adjustStock({
            productId: txn.productId,
            quantity: Number(txn.quantity),
            type: "ADJUST_DOWN",
            userId: user.id,
            notes: `Undo receipt ${id}`,
            reason: "RECEIPT_VOIDED",
            receiptId: receipt.id,
            tx,
          })
        }
      }

      // Reverse PO line item qtyReceived
      if (receipt.purchaseOrderId && receipt.purchaseOrder) {
        // Find which line items were affected by looking at transactions
        // Each transaction has a quantity that was received
        for (const txn of receipt.transactions) {
          if (txn.type === "RECEIVE") {
            // Find matching PO line item by productId
            const matchingLineItem = receipt.purchaseOrder.lineItems.find(
              (li) => li.productId === txn.productId
            )
            if (matchingLineItem) {
              const newQtyReceived = Math.max(
                0,
                Number(matchingLineItem.qtyReceived) - Number(txn.quantity)
              )
              await tx.pOLineItem.update({
                where: { id: matchingLineItem.id },
                data: {
                  qtyReceived: new Prisma.Decimal(newQtyReceived),
                },
              })
            }
          }
        }

        // Recalculate PO status
        const updatedPO = await tx.purchaseOrder.findUnique({
          where: { id: receipt.purchaseOrderId },
          include: { lineItems: true },
        })

        if (updatedPO) {
          const anyReceived = updatedPO.lineItems.some(
            (li) => Number(li.qtyReceived) > 0
          )
          const allReceived = updatedPO.lineItems.every(
            (li) => Number(li.qtyReceived) >= Number(li.qtyOrdered)
          )

          await tx.purchaseOrder.update({
            where: { id: receipt.purchaseOrderId },
            data: {
              status: allReceived
                ? "CLOSED"
                : anyReceived
                  ? "PARTIALLY_RECEIVED"
                  : "OPEN",
            },
          })
        }
      }

      // Mark receipt as voided (preserve for audit trail)
      const voidNote = receipt.notes
        ? `[VOIDED] ${receipt.notes}`
        : "[VOIDED]"
      await tx.receipt.update({
        where: { id },
        data: { notes: voidNote },
      })
    })

    return NextResponse.json({ data: { id, voided: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
