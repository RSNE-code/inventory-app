import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { toPurchaseQty } from "@/lib/units"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      bomLineItemId: z.string().uuid(),
      type: z.enum(["CHECKOUT", "RETURN"]),
      quantity: z.number().positive(),
    })
  ).min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SHOP_FOREMAN"])
    const { id } = await params

    const body = await request.json()
    const data = checkoutSchema.parse(body)

    // Fetch BOM with line items and products
    const bom = await prisma.bom.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!bom) {
      return NextResponse.json({ error: "BOM not found" }, { status: 404 })
    }

    if (!["APPROVED", "IN_PROGRESS"].includes(bom.status)) {
      return NextResponse.json(
        { error: `Cannot checkout from a ${bom.status} BOM` },
        { status: 400 }
      )
    }

    const transactions = []
    let hasCheckout = false

    for (const item of data.items) {
      const lineItem = bom.lineItems.find((li) => li.id === item.bomLineItemId)
      if (!lineItem) {
        return NextResponse.json(
          { error: `Line item ${item.bomLineItemId} not found on this BOM` },
          { status: 400 }
        )
      }

      // Skip non-catalog items without a product (no stock to adjust)
      if (lineItem.isNonCatalog && !lineItem.productId) {
        // Just update the tracking fields
        if (item.type === "CHECKOUT") {
          await prisma.bomLineItem.update({
            where: { id: lineItem.id },
            data: {
              qtyCheckedOut: new Prisma.Decimal(
                Number(lineItem.qtyCheckedOut) + item.quantity
              ),
            },
          })
          hasCheckout = true
        } else {
          const outstanding = Number(lineItem.qtyCheckedOut) - Number(lineItem.qtyReturned)
          if (item.quantity > outstanding) {
            return NextResponse.json(
              { error: `Cannot return more than ${outstanding} for "${lineItem.nonCatalogName}"` },
              { status: 400 }
            )
          }
          await prisma.bomLineItem.update({
            where: { id: lineItem.id },
            data: {
              qtyReturned: new Prisma.Decimal(
                Number(lineItem.qtyReturned) + item.quantity
              ),
            },
          })
        }
        continue
      }

      if (!lineItem.product) continue

      // Convert from shop units to purchase units if needed
      const purchaseQty = toPurchaseQty(item.quantity, lineItem.product)

      if (item.type === "CHECKOUT") {
        const transaction = await adjustStock({
          productId: lineItem.productId!,
          quantity: purchaseQty,
          type: "CHECKOUT",
          userId: user.id,
          jobName: bom.jobName,
          bomId: bom.id,
          bomLineItemId: lineItem.id,
        })

        await prisma.bomLineItem.update({
          where: { id: lineItem.id },
          data: {
            qtyCheckedOut: new Prisma.Decimal(
              Number(lineItem.qtyCheckedOut) + purchaseQty
            ),
          },
        })

        transactions.push(transaction)
        hasCheckout = true
      } else {
        // RETURN
        const outstanding = Number(lineItem.qtyCheckedOut) - Number(lineItem.qtyReturned)
        if (purchaseQty > outstanding + 0.0001) {
          return NextResponse.json(
            { error: `Cannot return more than checked out for "${lineItem.product.name}"` },
            { status: 400 }
          )
        }

        const transaction = await adjustStock({
          productId: lineItem.productId!,
          quantity: purchaseQty,
          type: "RETURN_PARTIAL",
          userId: user.id,
          jobName: bom.jobName,
          bomId: bom.id,
          bomLineItemId: lineItem.id,
        })

        await prisma.bomLineItem.update({
          where: { id: lineItem.id },
          data: {
            qtyReturned: new Prisma.Decimal(
              Number(lineItem.qtyReturned) + purchaseQty
            ),
          },
        })

        transactions.push(transaction)
      }
    }

    // Auto-transition APPROVED → IN_PROGRESS on first checkout
    if (bom.status === "APPROVED" && hasCheckout) {
      await prisma.bom.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      })
    }

    // Return updated BOM
    const updatedBom = await prisma.bom.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        lineItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unitOfMeasure: true,
                shopUnit: true,
                currentQty: true,
                dimLength: true,
                dimLengthUnit: true,
                dimWidth: true,
                dimWidthUnit: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      data: {
        transactions,
        bom: updatedBom,
      },
    })
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
