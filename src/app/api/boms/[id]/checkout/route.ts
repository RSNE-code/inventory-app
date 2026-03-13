import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { toPurchaseQty } from "@/lib/units"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const QTY_TOLERANCE = 0.0001

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

    // Quick BOM status check (before entering transaction)
    const bomCheck = await prisma.bom.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!bomCheck) {
      return NextResponse.json({ error: "BOM not found" }, { status: 404 })
    }

    if (!["APPROVED", "IN_PROGRESS"].includes(bomCheck.status)) {
      return NextResponse.json(
        { error: `Cannot checkout from a ${bomCheck.status} BOM` },
        { status: 400 }
      )
    }

    // Execute validation + operations inside a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch BOM and active line items inside transaction for consistency
      const bom = await tx.bom.findUnique({
        where: { id },
        include: {
          lineItems: {
            where: { isActive: true },
            include: { product: true },
          },
        },
      })

      if (!bom) throw new Error("BOM not found")

      // Validate all items with fresh data
      for (const item of data.items) {
        const lineItem = bom.lineItems.find((li) => li.id === item.bomLineItemId)
        if (!lineItem) {
          throw new Error(`Line item ${item.bomLineItemId} not found on this BOM`)
        }

        // Reject panel items — they must use the panel-checkout endpoint
        const specs = lineItem.nonCatalogSpecs as Record<string, unknown> | null
        if (specs?.type === "panel") {
          throw new Error(`"${lineItem.nonCatalogName}" is a panel item — use the panel checkout flow instead`)
        }

        if (item.type === "RETURN") {
          const outstanding = Number(lineItem.qtyCheckedOut) - Number(lineItem.qtyReturned)
          if (lineItem.isNonCatalog && !lineItem.productId) {
            if (item.quantity > outstanding + QTY_TOLERANCE) {
              throw new Error(`Cannot return more than ${outstanding} for "${lineItem.nonCatalogName}"`)
            }
          } else if (lineItem.product) {
            const purchaseQty = toPurchaseQty(item.quantity, lineItem.product)
            if (purchaseQty > outstanding + QTY_TOLERANCE) {
              throw new Error(`Cannot return more than checked out for "${lineItem.product.name}"`)
            }
          }
        }
      }

      // Execute checkout/return operations
      const transactions = []
      let hasCheckout = false
      const insufficientStock: string[] = []

      for (const item of data.items) {
        const lineItem = bom.lineItems.find((li) => li.id === item.bomLineItemId)!

        // Non-catalog items without a product (no stock to adjust)
        if (lineItem.isNonCatalog && !lineItem.productId) {
          if (item.type === "CHECKOUT") {
            await tx.bomLineItem.update({
              where: { id: lineItem.id },
              data: {
                qtyCheckedOut: new Prisma.Decimal(
                  Number(lineItem.qtyCheckedOut) + item.quantity
                ),
              },
            })
            hasCheckout = true
          } else {
            await tx.bomLineItem.update({
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

        const purchaseQty = toPurchaseQty(item.quantity, lineItem.product)

        if (item.type === "CHECKOUT") {
          if (Number(lineItem.product.currentQty) < purchaseQty) {
            insufficientStock.push(lineItem.product.name)
          }

          const unitCost = Number(lineItem.product.avgCost) || Number(lineItem.product.lastCost) || undefined
          const transaction = await adjustStock({
            productId: lineItem.productId!,
            quantity: purchaseQty,
            type: "CHECKOUT",
            unitCost,
            userId: user.id,
            jobName: bom.jobName,
            bomId: bom.id,
            bomLineItemId: lineItem.id,
            tx,
          })

          await tx.bomLineItem.update({
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
          const returnUnitCost = Number(lineItem.product.avgCost) || Number(lineItem.product.lastCost) || undefined
          const transaction = await adjustStock({
            productId: lineItem.productId!,
            quantity: purchaseQty,
            type: "RETURN_PARTIAL",
            unitCost: returnUnitCost,
            userId: user.id,
            jobName: bom.jobName,
            bomId: bom.id,
            bomLineItemId: lineItem.id,
            tx,
          })

          await tx.bomLineItem.update({
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
        await tx.bom.update({
          where: { id },
          data: { status: "IN_PROGRESS" },
        })
      }

      return { transactions, hasCheckout, insufficientStock }
    })

    // Return updated BOM
    const updatedBom = await prisma.bom.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        lineItems: {
          where: { isActive: true },
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
        transactions: result.transactions,
        bom: updatedBom,
        ...(result.insufficientStock.length > 0 && {
          warnings: { insufficientStock: result.insufficientStock },
        }),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
