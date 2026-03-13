import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

/**
 * GET /api/products/panels?brand=AWIP&thickness=4
 * Returns all panel products matching the given brand + thickness.
 * Used by the panel breakout component to pre-load available products.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const brand = searchParams.get("brand")
    const thickness = searchParams.get("thickness")

    if (!brand || !thickness) {
      return NextResponse.json(
        { error: "brand and thickness are required" },
        { status: 400 }
      )
    }

    // Find the "Insulated Metal Panel" category
    const category = await prisma.category.findFirst({
      where: { name: "Insulated Metal Panel" },
    })

    if (!category) {
      return NextResponse.json({ data: [] })
    }

    // Query products matching the brand and thickness
    // Pattern: "Insulated Metal Panel ({Brand})-{Height}'-{Width}-{Thickness}"
    const products = await prisma.product.findMany({
      where: {
        categoryId: category.id,
        isActive: true,
        name: {
          contains: `(${brand})`,
        },
        // Filter by thickness at the end of the name pattern
        AND: {
          name: {
            endsWith: `-${thickness}`,
          },
        },
      },
      select: {
        id: true,
        name: true,
        unitOfMeasure: true,
        currentQty: true,
        dimLength: true,
        dimLengthUnit: true,
        dimWidth: true,
        dimWidthUnit: true,
        dimThickness: true,
        dimThicknessUnit: true,
      },
      orderBy: { dimLength: "asc" },
    })

    // Parse height from product name and format response
    const data = products.map((p) => {
      // Extract height from name pattern: "...-{Height}'-..."
      const heightMatch = p.name.match(/-(\d+)'-/)
      const height = heightMatch ? parseInt(heightMatch[1], 10) : (Number(p.dimLength) || 0)

      // Extract width from name pattern: "...-{Height}'-{Width}-..."
      const widthMatch = p.name.match(/-\d+'-(\d+(?:\.\d+)?)-/)
      const width = widthMatch ? parseFloat(widthMatch[1]) : (Number(p.dimWidth) || 0)

      return {
        id: p.id,
        name: p.name,
        height,
        width,
        unitOfMeasure: p.unitOfMeasure,
        currentQty: Number(p.currentQty),
        lastCost: 0, // Will be populated from recent transactions if needed
      }
    })

    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Panel products error:", err)
    return NextResponse.json(
      { error: "Failed to fetch panel products" },
      { status: 500 }
    )
  }
}
