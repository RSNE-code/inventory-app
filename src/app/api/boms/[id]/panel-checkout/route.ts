import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { buildPanelProductName, panelSqFt, cutsPerStockPanel } from "@/lib/panels"
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
      const bomCutLengthFt = specs.cutLengthFt as number
      if (!thickness || !width) {
        throw new Error("Panel thickness and width are required")
      }

      // Yield-aware validation: each stock panel can produce multiple BOM cuts
      // e.g. 16' stock ÷ 8' cut = 2 cuts per stock panel
      const totalBreakoutPanels = data.breakout.reduce((sum, r) => sum + r.quantity, 0)
      const totalFulfilledPanels = data.breakout.reduce((sum, r) => {
        return sum + r.quantity * cutsPerStockPanel(r.height, bomCutLengthFt)
      }, 0)
      const alreadyCheckedOut = Number(lineItem.qtyCheckedOut)
      const needed = Number(lineItem.qtyNeeded)
      const remaining = needed - alreadyCheckedOut

      if (totalFulfilledPanels > remaining + 0.0001) {
        throw new Error(
          `Cuts produced (${totalFulfilledPanels}) exceeds remaining panels (${remaining})`
        )
      }

      // Validate all stock heights are >= BOM cut length
      for (const row of data.breakout) {
        if (row.height < bomCutLengthFt) {
          throw new Error(
            `Cannot cut ${bomCutLengthFt}' panels from ${row.height}' stock. Stock panels must be ≥ ${bomCutLengthFt}'.`
          )
        }
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
      let totalWasteSqFt = 0

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

        // Each stock panel is consumed whole (full sq ft deducted from inventory)
        const sqFtPerStockPanel = panelSqFt(row.height, width)
        const totalStockSqFt = sqFtPerStockPanel * row.quantity

        // Yield-aware waste: only the leftover after extracting all possible cuts
        const cuts = cutsPerStockPanel(row.height, bomCutLengthFt)
        const usedFt = cuts * bomCutLengthFt
        const wasteFtPerPanel = row.height - usedFt
        const wasteSqFtPerPanel = wasteFtPerPanel * (width / 12)
        const wasteForRow = wasteSqFtPerPanel * row.quantity
        totalWasteSqFt += wasteForRow

        // Check stock — need full stock panel sq ft, not just BOM cut length sq ft
        if (Number(product.currentQty) < totalStockSqFt) {
          insufficientStock.push(
            `${productName} (need ${row.quantity} panels = ${totalStockSqFt.toFixed(1)} sq ft, have ${Number(product.currentQty).toFixed(1)})`
          )
        }

        // Deduct full stock panel sq ft (not just the BOM cut length portion)
        const unitCost = Number(product.avgCost) || Number(product.lastCost) || undefined
        const transaction = await adjustStock({
          productId: product.id,
          quantity: totalStockSqFt,
          type: "CHECKOUT",
          unitCost,
          userId: user.id,
          jobName: bom.jobName,
          bomId: bom.id,
          bomLineItemId: lineItem.id,
          notes: `${row.quantity}× ${row.height}' stock → ${row.quantity * cuts}× ${bomCutLengthFt}' cuts${wasteFtPerPanel > 0 ? ` (${wasteFtPerPanel}' drop per panel)` : " (no waste)"}`,
          tx,
        })

        transactions.push(transaction)

        // Log waste as a separate ADJUST_DOWN transaction for reporting
        if (wasteForRow > 0) {
          await adjustStock({
            productId: product.id,
            quantity: wasteForRow,
            type: "ADJUST_DOWN",
            unitCost,
            userId: user.id,
            jobName: bom.jobName,
            bomId: bom.id,
            bomLineItemId: lineItem.id,
            notes: `Panel drop: ${row.quantity}× ${row.height}' stock, ${cuts} cuts of ${bomCutLengthFt}' each, ${wasteFtPerPanel}' waste per panel = ${wasteForRow.toFixed(1)} sq ft`,
            tx,
          })
        }
      }

      // Update bomLineItem.qtyCheckedOut (yield-aware: counts fulfilled BOM cuts, not stock panels)
      await tx.bomLineItem.update({
        where: { id: lineItem.id },
        data: {
          qtyCheckedOut: new Prisma.Decimal(alreadyCheckedOut + totalFulfilledPanels),
        },
      })

      // Auto-transition APPROVED → IN_PROGRESS
      if (bom.status === "APPROVED") {
        await tx.bom.update({
          where: { id: bomId },
          data: { status: "IN_PROGRESS" },
        })
      }

      return { transactions, insufficientStock, totalWasteSqFt }
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
        totalWasteSqFt: result.totalWasteSqFt,
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
