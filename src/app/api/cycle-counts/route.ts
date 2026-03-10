import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const createCycleCountSchema = z.object({
  productId: z.string().uuid(),
  actualQty: z.number().min(0),
  reason: z.string().optional().nullable(),
})

// GET: Suggest items to count + recent counts
export async function GET() {
  try {
    await requireAuth()

    // Get products that need counting — prioritize:
    // 1. Never counted
    // 2. Not counted in 30+ days
    // 3. High transaction volume since last count
    const products = await prisma.product.findMany({
      where: { isActive: true, tier: "TIER_1" },
      select: {
        id: true,
        name: true,
        sku: true,
        currentQty: true,
        unitOfMeasure: true,
        shopUnit: true,
        dimLength: true,
        dimLengthUnit: true,
        dimWidth: true,
        dimWidthUnit: true,
        lastCountedAt: true,
        location: true,
        category: { select: { name: true } },
        _count: {
          select: {
            transactions: {
              where: {
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    // Score each product for count priority
    const suggestions = products
      .map((p) => {
        let score = 0
        if (!p.lastCountedAt) {
          score += 100 // Never counted
        } else {
          const daysSinceCount = Math.floor(
            (Date.now() - p.lastCountedAt.getTime()) / (1000 * 60 * 60 * 24)
          )
          score += Math.min(daysSinceCount, 90) // Up to 90 points for age
        }
        score += Math.min(p._count.transactions * 5, 50) // Up to 50 points for activity
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentQty: Number(p.currentQty),
          unitOfMeasure: p.unitOfMeasure,
          shopUnit: p.shopUnit,
          dimLength: p.dimLength ? Number(p.dimLength) : null,
          dimLengthUnit: p.dimLengthUnit,
          dimWidth: p.dimWidth ? Number(p.dimWidth) : null,
          dimWidthUnit: p.dimWidthUnit,
          lastCountedAt: p.lastCountedAt?.toISOString() || null,
          location: p.location,
          categoryName: p.category.name,
          recentTransactions: p._count.transactions,
          priorityScore: score,
        }
      })
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 20)

    // Recent cycle counts
    const recentCounts = await prisma.cycleCount.findMany({
      orderBy: { countedAt: "desc" },
      take: 10,
      include: {
        product: { select: { name: true, unitOfMeasure: true } },
        countedBy: { select: { name: true } },
      },
    })

    return NextResponse.json({
      data: {
        suggestions,
        recentCounts: recentCounts.map((c) => ({
          id: c.id,
          productName: c.product.name,
          unitOfMeasure: c.product.unitOfMeasure,
          systemQty: Number(c.systemQty),
          actualQty: Number(c.actualQty),
          variance: Number(c.variance),
          reason: c.reason,
          countedBy: c.countedBy.name,
          countedAt: c.countedAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST: Record a cycle count
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "SHOP_FOREMAN"])

    const body = await request.json()
    const data = createCycleCountSchema.parse(body)

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: data.productId },
    })

    const systemQty = Number(product.currentQty)
    const variance = data.actualQty - systemQty

    // Create cycle count record
    const cycleCount = await prisma.cycleCount.create({
      data: {
        productId: data.productId,
        systemQty: product.currentQty,
        actualQty: new Prisma.Decimal(data.actualQty),
        variance: new Prisma.Decimal(variance),
        reason: data.reason || null,
        countedById: user.id,
      },
      include: {
        product: { select: { name: true, unitOfMeasure: true } },
        countedBy: { select: { name: true } },
      },
    })

    // Update lastCountedAt
    await prisma.product.update({
      where: { id: data.productId },
      data: { lastCountedAt: new Date() },
    })

    // If variance, adjust stock
    if (variance !== 0) {
      await adjustStock({
        productId: data.productId,
        quantity: Math.abs(variance),
        type: variance > 0 ? "ADJUST_UP" : "ADJUST_DOWN",
        userId: user.id,
        notes: `Cycle count adjustment${data.reason ? `: ${data.reason}` : ""}`,
        reason: data.reason || "Cycle count variance",
      })
    }

    return NextResponse.json({
      data: {
        id: cycleCount.id,
        productName: cycleCount.product.name,
        unitOfMeasure: cycleCount.product.unitOfMeasure,
        systemQty,
        actualQty: data.actualQty,
        variance,
        reason: data.reason,
        countedBy: cycleCount.countedBy.name,
        countedAt: cycleCount.countedAt.toISOString(),
      },
    }, { status: 201 })
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
