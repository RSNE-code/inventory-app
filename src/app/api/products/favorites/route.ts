import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

/**
 * GET /api/products/favorites
 * Returns the user's most frequently used products across their last 20 BOMs.
 * Auto-calculated, not manually curated.
 */
export async function GET() {
  try {
    const user = await requireAuth()

    // Get last 20 BOMs created by this user
    const recentBoms = await prisma.bom.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true },
    })

    if (recentBoms.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const bomIds = recentBoms.map((b) => b.id)

    // Count product frequency across those BOMs (catalog items only)
    const lineItems = await prisma.bomLineItem.findMany({
      where: {
        bomId: { in: bomIds },
        isActive: true,
        productId: { not: null },
        isNonCatalog: false,
      },
      select: {
        productId: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unitOfMeasure: true,
            shopUnit: true,
            tier: true,
            currentQty: true,
            category: { select: { id: true, name: true } },
            dimLength: true,
            dimLengthUnit: true,
            dimWidth: true,
            dimWidthUnit: true,
          },
        },
      },
    })

    // Count frequency per product
    const freqMap = new Map<string, { count: number; product: typeof lineItems[0]["product"] }>()
    for (const li of lineItems) {
      if (!li.productId || !li.product) continue
      const existing = freqMap.get(li.productId)
      if (existing) {
        existing.count++
      } else {
        freqMap.set(li.productId, { count: 1, product: li.product })
      }
    }

    // Sort by frequency, return top 9
    const favorites = Array.from(freqMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 9)
      .map((f) => ({
        ...f.product,
        frequency: f.count,
      }))

    return NextResponse.json({ data: favorites })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
