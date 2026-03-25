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
        productId: z.string().uuid().optional().nullable(),
        quantity: z.number().positive(),
        unitCost: z.number().min(0),
        poLineItemId: z.string().uuid().optional().nullable(),
        // Auto-create panel product fields (when productId is null)
        autoCreatePanel: z
          .object({
            brand: z.string(),
            height: z.number().positive(),
            width: z.number().positive(),
            thickness: z.number().positive(),
          })
          .optional(),
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

      // Resolve product IDs — auto-create panel products where needed
      const panelCategory = await tx.category.findFirst({
        where: { name: "Insulated Metal Panel" },
        select: { id: true },
      })

      const resolvedItems: Array<{ productId: string; quantity: number; unitCost: number; poLineItemId?: string }> = []

      for (const item of data.items) {
        if (item.productId) {
          resolvedItems.push({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            poLineItemId: item.poLineItemId || undefined,
          })
        } else if (item.autoCreatePanel && panelCategory) {
          // Auto-create missing panel product (find-or-create pattern)
          const { brand, height, width, thickness } = item.autoCreatePanel
          const productName = `Insulated Metal Panel (${brand})-${height}'-${width}-${thickness}`

          let product = await tx.product.findFirst({
            where: { name: productName },
          })

          if (!product) {
            product = await tx.product.create({
              data: {
                name: productName,
                categoryId: panelCategory.id,
                unitOfMeasure: "sq ft",
                shopUnit: "panel",
                tier: "TIER_1",
                dimLength: new Prisma.Decimal(height),
                dimLengthUnit: "ft",
                dimWidth: new Prisma.Decimal(width),
                dimWidthUnit: "in",
                dimThickness: new Prisma.Decimal(thickness),
                dimThicknessUnit: "in",
              },
            })
          }

          resolvedItems.push({
            productId: product.id,
            quantity: item.quantity,
            unitCost: item.unitCost,
            poLineItemId: item.poLineItemId || undefined,
          })
        }
        // Items with no productId and no autoCreatePanel are skipped (shouldn't happen)
      }

      // Reject 0-item receipts
      if (resolvedItems.length === 0) {
        throw new Error("No items to receive")
      }

      for (const item of resolvedItems) {
        await adjustStock({
          productId: item.productId,
          quantity: item.quantity,
          type: "RECEIVE",
          userId: user.id,
          unitCost: item.unitCost,
          receiptId: receipt.id,
          notes: item.poLineItemId ? `poLineItem:${item.poLineItemId}` : undefined,
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
    const limit = parseInt(searchParams.get("limit") || "30")
    const search = searchParams.get("search") || undefined

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { supplier: { name: { contains: search, mode: "insensitive" } } },
        { purchaseOrder: { poNumber: { contains: search, mode: "insensitive" } } },
        { notes: { contains: search, mode: "insensitive" } },
      ]
    }

    const receipts = await prisma.receipt.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: limit,
      include: {
        supplier: { select: { name: true } },
        purchaseOrder: { select: { poNumber: true, jobName: true } },
        transactions: {
          include: { product: { select: { name: true, unitOfMeasure: true } } },
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
