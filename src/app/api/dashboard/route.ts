import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { Prisma } from "@prisma/client"

export async function GET() {
  try {
    await requireAuth()

    const [totalProducts, outOfStock, products, recentTransactions, activeBomCount] = await Promise.all([
      prisma.product.count({ where: { isActive: true, tier: "TIER_1" } }),
      prisma.product.count({ where: { isActive: true, tier: "TIER_1", currentQty: { lte: 0 } } }),
      prisma.product.findMany({
        where: { isActive: true, tier: "TIER_1" },
        include: { category: true },
        orderBy: { name: "asc" },
      }),
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          product: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.bom.count({ where: { status: { in: ["DRAFT", "APPROVED", "IN_PROGRESS"] } } }),
    ])

    let totalValue = 0
    let lowStockCount = 0
    const lowStockItems: Array<{
      id: string
      name: string
      currentQty: number
      reorderPoint: number
      unitOfMeasure: string
      categoryName: string
    }> = []

    for (const p of products) {
      const qty = Number(p.currentQty)
      const cost = Number(p.avgCost)
      const reorder = Number(p.reorderPoint)

      totalValue += qty * cost

      if (qty > 0 && qty <= reorder) {
        lowStockCount++
        lowStockItems.push({
          id: p.id,
          name: p.name,
          currentQty: qty,
          reorderPoint: reorder,
          unitOfMeasure: p.unitOfMeasure,
          categoryName: p.category.name,
        })
      }
    }

    // Sort low stock by urgency (lowest ratio of current/reorder first)
    lowStockItems.sort((a, b) => {
      const ratioA = a.reorderPoint > 0 ? a.currentQty / a.reorderPoint : 1
      const ratioB = b.reorderPoint > 0 ? b.currentQty / b.reorderPoint : 1
      return ratioA - ratioB
    })

    return NextResponse.json({
      data: {
        summary: {
          totalProducts,
          totalValue,
          lowStockCount,
          outOfStockCount: outOfStock,
        },
        lowStockItems: lowStockItems.slice(0, 10),
        recentTransactions: recentTransactions.map((t) => ({
          id: t.id,
          type: t.type,
          productName: t.product.name,
          quantity: Number(t.quantity),
          userName: t.user.name,
          createdAt: t.createdAt.toISOString(),
        })),
        activeBomCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
