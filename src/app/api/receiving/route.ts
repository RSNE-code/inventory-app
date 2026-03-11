import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { Prisma } from "@prisma/client"
import { z } from "zod"

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
        poLineItemId: z.string().uuid().optional().nullable(),
      })
    )
    .min(1),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SHOP_FOREMAN"])

    const body = await request.json()
    const data = createReceiptSchema.parse(body)

    const receipt = await prisma.receipt.create({
      data: {
        supplierId: data.supplierId,
        purchaseOrderId: data.purchaseOrderId || null,
        notes: data.notes || null,
      },
    })

    for (const item of data.items) {
      await adjustStock({
        productId: item.productId,
        quantity: item.quantity,
        type: "RECEIVE",
        userId: user.id,
        unitCost: item.unitCost,
        receiptId: receipt.id,
      })

      // Update PO line item qtyReceived
      if (item.poLineItemId) {
        await prisma.pOLineItem.update({
          where: { id: item.poLineItemId },
          data: {
            qtyReceived: {
              increment: new Prisma.Decimal(item.quantity),
            },
          },
        })
      }
    }

    // Update PO status based on received quantities
    if (data.purchaseOrderId) {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId },
        include: { lineItems: true },
      })

      if (po) {
        const allReceived = po.lineItems.every(
          (li) => Number(li.qtyReceived) >= Number(li.qtyOrdered)
        )
        const anyReceived = po.lineItems.some((li) => Number(li.qtyReceived) > 0)

        await prisma.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: {
            status: allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : "OPEN",
          },
        })
      }
    }

    const fullReceipt = await prisma.receipt.findUnique({
      where: { id: receipt.id },
      include: {
        supplier: { select: { name: true } },
        purchaseOrder: { select: { poNumber: true, status: true } },
        transactions: {
          include: { product: { select: { name: true } } },
        },
      },
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
