import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional().nullable(),
  categoryId: z.string().uuid(),
  tier: z.enum(["TIER_1", "TIER_2"]).default("TIER_1"),
  unitOfMeasure: z.string().min(1),
  trackingUnit: z.string().optional().nullable(),
  reorderPoint: z.number().min(0).default(0),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  leadTimeDays: z.number().int().positive().optional().nullable(),
  pieceUnit: z.string().optional().nullable(),
  dimLength: z.number().positive().optional().nullable(),
  dimLengthUnit: z.string().optional().nullable(),
  dimWidth: z.number().positive().optional().nullable(),
  dimWidthUnit: z.string().optional().nullable(),
  dimThickness: z.number().positive().optional().nullable(),
  dimThicknessUnit: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const search = searchParams.get("search") || ""
    const category = searchParams.get("category") || ""
    const tier = searchParams.get("tier") || ""
    const status = searchParams.get("status") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const sort = searchParams.get("sort") || "name"
    const order = searchParams.get("order") || "asc"

    const where: Prisma.ProductWhereInput = { isActive: true }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ]
    }

    if (category) {
      where.categoryId = category
    }

    if (tier === "TIER_1" || tier === "TIER_2") {
      where.tier = tier
    }

    if (status === "out") {
      where.currentQty = { lte: 0 }
    } else if (status === "low") {
      where.AND = [
        { currentQty: { gt: 0 } },
        {
          currentQty: {
            lte: prisma.product.fields.reorderPoint,
          },
        },
      ]
    } else if (status === "in-stock") {
      where.currentQty = { gt: 0 }
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {}
    if (sort === "name") orderBy.name = order as Prisma.SortOrder
    else if (sort === "currentQty") orderBy.currentQty = order as Prisma.SortOrder
    else if (sort === "updatedAt") orderBy.updatedAt = order as Prisma.SortOrder
    else orderBy.name = "asc"

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER"])

    const body = await request.json()
    const data = createProductSchema.parse(body)

    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku || null,
        categoryId: data.categoryId,
        tier: data.tier,
        unitOfMeasure: data.unitOfMeasure,
        trackingUnit: data.trackingUnit || null,
        reorderPoint: data.reorderPoint,
        location: data.location || null,
        notes: data.notes || null,
        leadTimeDays: data.leadTimeDays || null,
        pieceUnit: data.pieceUnit || null,
        dimLength: data.dimLength || null,
        dimLengthUnit: data.dimLengthUnit || null,
        dimWidth: data.dimWidth || null,
        dimWidthUnit: data.dimWidthUnit || null,
        dimThickness: data.dimThickness || null,
        dimThicknessUnit: data.dimThicknessUnit || null,
      },
      include: { category: true },
    })

    return NextResponse.json({ data: product }, { status: 201 })
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
