import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const createReceiptSchema = z.object({
  supplierId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive(),
        unitCost: z.number().min(0),
      })
    )
    .min(0),
  poLineItemUpdates: z
    .array(
      z.object({
        poLineItemId: z.string().uuid(),
        qtyReceived: z.number().min(0),
      })
    )
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SHOP_FOREMAN"])

    const body = await request.json()
    const data = createReceiptSchema.parse(body)

    const fullReceipt = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          supplierId: data.supplierId,
          purchaseOrderId: data.purchaseOrderId || null,
          notes: data.notes || null,
        },
      })

      // Update PO line item quantities received
      if (data.poLineItemUpdates && data.poLineItemUpdates.length > 0) {
        for (const update of data.poLineItemUpdates) {
          await tx.pOLineItem.update({
            where: { id: update.poLineItemId },
            data: {
              qtyReceived: {
                increment: new Prisma.Decimal(update.qtyReceived),
              },
            },
          })
        }
      }

      // Update PO status if linked
      if (data.purchaseOrderId) {
        // Check if all line items are fully received
        const poWithItems = await tx.purchaseOrder.findUnique({
          where: { id: data.purchaseOrderId },
          include: { lineItems: true },
        })

        if (poWithItems && poWithItems.lineItems.length > 0) {
          const allReceived = poWithItems.lineItems.every(
            (li) => Number(li.qtyReceived) >= Number(li.qtyOrdered)
          )
          await tx.purchaseOrder.update({
            where: { id: data.purchaseOrderId },
            data: { status: allReceived ? "CLOSED" : "PARTIALLY_RECEIVED" },
          })
        } else {
          await tx.purchaseOrder.update({
            where: { id: data.purchaseOrderId },
            data: { status: "PARTIALLY_RECEIVED" },
          })
        }
      }

      for (const item of data.items) {
        await adjustStock({
          productId: item.productId,
          quantity: item.quantity,
          type: "RECEIVE",
          userId: user.id,
          unitCost: item.unitCost,
          receiptId: receipt.id,
          tx,
        })
      }

      return tx.receipt.findUnique({
        where: { id: receipt.id },
        include: {
          supplier: { select: { name: true } },
          transactions: {
            include: { product: { select: { name: true } } },
          },
        },
      })
    })

    return NextResponse.json({ data: fullReceipt }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const limit = parseInt(searchParams.get("limit") || "10")

    const receipts = await prisma.receipt.findMany({
      orderBy: { receivedAt: "desc" },
      take: limit,
      include: {
        supplier: { select: { name: true } },
        transactions: {
          include: { product: { select: { name: true } } },
        },
      },
    })

    return NextResponse.json({ data: receipts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
