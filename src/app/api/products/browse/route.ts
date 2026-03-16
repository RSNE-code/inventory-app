import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { Prisma } from "@prisma/client"

/**
 * GET /api/products/browse?search=X&category=Y&limit=50
 *
 * Unified product browsing endpoint for POS-style BOM creation.
 * - No search + no category: returns user's favorites (most-used products)
 * - No search + category: returns all products in that category
 * - Search: returns matching products across all categories
 *
 * Returns minimal fields for fast list rendering.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const category = searchParams.get("category") || ""
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

    // If no search and no category — return favorites (most-used products)
    if (!search && !category) {
      const recentBoms = await prisma.bom.findMany({
        where: { createdById: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true },
      })

      if (recentBoms.length > 0) {
        const bomIds = recentBoms.map((b) => b.id)
        const lineItems = await prisma.bomLineItem.findMany({
          where: {
            bomId: { in: bomIds },
            isActive: true,
            productId: { not: null },
            isNonCatalog: false,
          },
          select: { productId: true },
        })

        // Count frequency
        const freq = new Map<string, number>()
        for (const li of lineItems) {
          if (li.productId) freq.set(li.productId, (freq.get(li.productId) || 0) + 1)
        }

        if (freq.size > 0) {
          const sortedIds = Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => id)

          const products = await prisma.product.findMany({
            where: { id: { in: sortedIds }, isActive: true },
            select: {
              id: true,
              name: true,
              unitOfMeasure: true,
              tier: true,
              currentQty: true,
              category: { select: { name: true } },
            },
          })

          // Re-sort by frequency
          const productMap = new Map(products.map((p) => [p.id, p]))
          const sorted = sortedIds
            .map((id) => productMap.get(id))
            .filter(Boolean)

          return NextResponse.json({ data: sorted, source: "favorites" })
        }
      }

      // No favorites — return all products sorted by name
      const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: limit,
        select: {
          id: true,
          name: true,
          unitOfMeasure: true,
          tier: true,
          currentQty: true,
          category: { select: { name: true } },
        },
      })
      return NextResponse.json({ data: products, source: "all" })
    }

    // Build query
    const where: Prisma.ProductWhereInput = { isActive: true }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ]
    }

    if (category) {
      where.category = { name: { equals: category, mode: "insensitive" } }
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      take: limit,
      select: {
        id: true,
        name: true,
        unitOfMeasure: true,
        tier: true,
        currentQty: true,
        category: { select: { name: true } },
      },
    })

    return NextResponse.json({
      data: products,
      source: search ? "search" : "category",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
