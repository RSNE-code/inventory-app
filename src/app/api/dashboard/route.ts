import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    await requireAuth()

    const [
      totalProducts,
      outOfStock,
      products,
      recentTransactions,
      activeBomCount,
      pendingApprovals,
      inProductionCount,
      completedAssemblies,
      needsCountingCount,
      bomStatusGroups,
      doorQueueCount,
      unfabricatedAssemblyItems,
    ] = await Promise.all([
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
      prisma.assembly.count({ where: { approvalStatus: "PENDING" } }),
      prisma.assembly.count({ where: { status: "IN_PRODUCTION" } }),
      prisma.assembly.count({ where: { status: "COMPLETED" } }),
      prisma.product.count({
        where: {
          isActive: true,
          tier: "TIER_1",
          OR: [
            { lastCountedAt: null },
            { lastCountedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          ],
        },
      }),
      prisma.bom.groupBy({
        by: ["status"],
        where: { status: { in: ["DRAFT", "PENDING_REVIEW", "APPROVED", "IN_PROGRESS"] } },
        _count: true,
      }),
      prisma.assembly.count({
        where: { type: "DOOR", status: { in: ["PLANNED", "AWAITING_APPROVAL", "APPROVED"] } },
      }),
      // Count RSNE-fab assembly items on approved/in-progress BOMs
      // that don't have a linked assembly (fab order not created yet).
      // Only items from assembly templates get fabricationSource=RSNE_MADE,
      // so supplier doors (e.g. Jamison) are not flagged.
      prisma.bomLineItem.count({
        where: {
          isActive: true,
          isNonCatalog: true,
          assemblyId: null,
          fabricationSource: "RSNE_MADE",
          nonCatalogCategory: { in: ["Door", "Floor Panel", "Wall Panel", "Ramp"] },
          bom: { status: { in: ["APPROVED", "IN_PROGRESS"] } },
        },
      }),
    ])

    // Transform groupBy result into a Record
    const bomStatusCounts: Record<string, number> = {
      DRAFT: 0, PENDING_REVIEW: 0, APPROVED: 0, IN_PROGRESS: 0,
    }
    for (const group of bomStatusGroups) {
      bomStatusCounts[group.status] = group._count
    }

    let totalValue = 0
    let lowStockCount = 0
    const lowStockItems: Array<{
      id: string
      name: string
      currentQty: number
      reorderPoint: number
      unitOfMeasure: string
      shopUnit: string | null
      dimLength: number | null
      dimLengthUnit: string | null
      dimWidth: number | null
      dimWidthUnit: string | null
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
          shopUnit: p.shopUnit,
          dimLength: p.dimLength ? Number(p.dimLength) : null,
          dimLengthUnit: p.dimLengthUnit,
          dimWidth: p.dimWidth ? Number(p.dimWidth) : null,
          dimWidthUnit: p.dimWidthUnit,
          categoryName: p.category.name,
        })
      }
    }

    // Sort low stock by urgency
    lowStockItems.sort((a, b) => {
      const ratioA = a.reorderPoint > 0 ? a.currentQty / a.reorderPoint : 1
      const ratioB = b.reorderPoint > 0 ? b.currentQty / b.reorderPoint : 1
      return ratioA - ratioB
    })

    // Build alerts
    const alerts: Array<{ type: string; title: string; message: string; link?: string }> = []

    if (outOfStock > 0) {
      alerts.push({
        type: "critical",
        title: `${outOfStock} item${outOfStock !== 1 ? "s" : ""} out of stock`,
        message: "Items need immediate reordering",
        link: "/inventory",
      })
    }

    if (lowStockCount > 0) {
      alerts.push({
        type: "warning",
        title: `${lowStockCount} item${lowStockCount !== 1 ? "s" : ""} below reorder point`,
        message: "Consider reordering soon",
        link: "/inventory",
      })
    }

    if (pendingApprovals > 0) {
      alerts.push({
        type: "info",
        title: `${pendingApprovals} assembly${pendingApprovals !== 1 ? " assemblies" : ""} awaiting approval`,
        message: "Door sheets need SM review",
        link: "/assemblies",
      })
    }

    if (needsCountingCount > 5) {
      alerts.push({
        type: "info",
        title: `${needsCountingCount} items need cycle counting`,
        message: "Items haven't been counted in 30+ days",
        link: "/cycle-counts",
      })
    }

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
        bomStatusCounts,
        doorQueueCount,
        alerts,
        unfabricatedAssemblyCount: unfabricatedAssemblyItems,
        fabrication: {
          pendingApprovals,
          inProduction: inProductionCount,
          completed: completedAssemblies,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
