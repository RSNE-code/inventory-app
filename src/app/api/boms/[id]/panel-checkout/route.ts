import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { buildPanelProductName, panelSqFt } from "@/lib/panels"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const panelCheckoutSchema = z.object({
  bomLineItemId: z.string().uuid(),
  brand: z.string().min(1),
  width: z.number().positive().optional(),
  thickness: z.number().positive().optional(),
  breakout: z.array(
    z.object({
      height: z.number().positive(),
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
    const { id: bomId } = await params

    const body = await request.json()
    const data = panelCheckoutSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      // Fetch BOM and validate status
      const bom = await tx.bom.findUnique({
        where: { id: bomId },
        include: {
          lineItems: {
            where: { id: data.bomLineItemId, isActive: true },
          },
        },
      })

      if (!bom) throw new Error("BOM not found")
      if (!["APPROVED", "IN_PROGRESS"].includes(bom.status)) {
        throw new Error(`Cannot checkout from a ${bom.status} BOM`)
      }

      const lineItem = bom.lineItems[0]
      if (!lineItem) throw new Error("Line item not found on this BOM")

      // Extract panel specs from nonCatalogSpecs
      const specs = lineItem.nonCatalogSpecs as Record<string, unknown> | null
      if (!specs || specs.type !== "panel") {
        throw new Error("This line item is not a panel item")
      }

      const thickness = data.thickness ?? (specs.thickness as number)
      const width = data.width ?? (specs.widthIn as number)
      if (!thickness || !width) {
        throw new Error("Panel thickness and width are required")
      }

      // Total panels in breakout must not exceed remaining qty
      const totalBreakoutPanels = data.breakout.reduce((sum, r) => sum + r.quantity, 0)
      const alreadyCheckedOut = Number(lineItem.qtyCheckedOut)
      const needed = Number(lineItem.qtyNeeded)
      const remaining = needed - alreadyCheckedOut

      if (totalBreakoutPanels > remaining + 0.0001) {
        throw new Error(
          `Breakout total (${totalBreakoutPanels}) exceeds remaining panels (${remaining})`
        )
      }

      // Find or create the panel category for auto-creating products
      let panelCategory = await tx.category.findFirst({
        where: { name: { contains: "Insulated Metal Panel", mode: "insensitive" } },
      })
      if (!panelCategory) {
        panelCategory = await tx.category.create({
          data: { name: "Insulated Metal Panel" },
        })
      }

      const transactions = []
      const insufficientStock: string[] = []

      for (const row of data.breakout) {
        const productName = buildPanelProductName(data.brand, row.height, width, thickness)

        // Find or create the panel product
        let product = await tx.product.findFirst({
          where: { name: productName },
        })

        if (!product) {
          product = await tx.product.create({
            data: {
              name: productName,
              category: { connect: { id: panelCategory.id } },
              unitOfMeasure: "sq ft",
              shopUnit: "panel",
              tier: "TIER_1",
              dimLength: new Prisma.Decimal(row.height),
              dimLengthUnit: "ft",
              dimWidth: new Prisma.Decimal(width),
              dimWidthUnit: "in",
              dimThickness: new Prisma.Decimal(thickness),
              dimThicknessUnit: "in",
            },
          })
        }

        // Calculate sq ft for this checkout row
        const sqFtPerPanel = panelSqFt(row.height, width)
        const totalSqFt = sqFtPerPanel * row.quantity

        // Check stock
        if (Number(product.currentQty) < totalSqFt) {
          insufficientStock.push(`${productName} (need ${totalSqFt.toFixed(1)} sq ft, have ${Number(product.currentQty).toFixed(1)})`)
        }

        // Create CHECKOUT transaction (in sq ft, matching product's UOM)
        const unitCost = Number(product.avgCost) || Number(product.lastCost) || undefined
        const transaction = await adjustStock({
          productId: product.id,
          quantity: totalSqFt,
          type: "CHECKOUT",
          unitCost,
          userId: user.id,
          jobName: bom.jobName,
          bomId: bom.id,
          bomLineItemId: lineItem.id,
          tx,
        })

        transactions.push(transaction)
      }

      // Update bomLineItem.qtyCheckedOut (in panels)
      await tx.bomLineItem.update({
        where: { id: lineItem.id },
        data: {
          qtyCheckedOut: new Prisma.Decimal(alreadyCheckedOut + totalBreakoutPanels),
        },
      })

      // Auto-transition APPROVED → IN_PROGRESS
      if (bom.status === "APPROVED") {
        await tx.bom.update({
          where: { id: bomId },
          data: { status: "IN_PROGRESS" },
        })
      }

      return { transactions, insufficientStock }
    })

    // Return updated BOM
    const updatedBom = await prisma.bom.findUnique({
      where: { id: bomId },
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
      return NextResponse.json(
        { error: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
