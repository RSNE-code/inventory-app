import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

/**
 * GET /api/products/bulk-lookup?names=HINGE D690,D90 Handle,...
 * Looks up products by name fragments. Returns matching products for recipe auto-populate.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const namesParam = request.nextUrl.searchParams.get("names")
    if (!namesParam) {
      return NextResponse.json({ error: "names parameter required" }, { status: 400 })
    }

    const nameFragments = namesParam.split(",").map((n) => n.trim()).filter(Boolean)
    if (nameFragments.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Look up each name fragment — find exact or closest match
    const results: Array<{
      requestedName: string
      product: {
        id: string
        name: string
        unitOfMeasure: string
        currentQty: number
      } | null
    }> = []

    for (const fragment of nameFragments) {
      // Try exact match first, then contains
      let product = await prisma.product.findFirst({
        where: {
          name: { equals: fragment, mode: "insensitive" },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          unitOfMeasure: true,
          currentQty: true,
        },
      })

      if (!product) {
        product = await prisma.product.findFirst({
          where: {
            name: { contains: fragment, mode: "insensitive" },
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            unitOfMeasure: true,
            currentQty: true,
          },
        })
      }

      results.push({
        requestedName: fragment,
        product: product ? {
          id: product.id,
          name: product.name,
          unitOfMeasure: product.unitOfMeasure,
          currentQty: Number(product.currentQty),
        } : null,
      })
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
