import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const bomLineItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  tier: z.enum(["TIER_1", "TIER_2"]).default("TIER_1"),
  qtyNeeded: z.number().positive(),
  isNonCatalog: z.boolean().default(false),
  nonCatalogName: z.string().optional().nullable(),
  nonCatalogCategory: z.string().optional().nullable(),
  nonCatalogUom: z.string().optional().nullable(),
  nonCatalogEstCost: z.number().optional().nullable(),
})

const createBomSchema = z.object({
  jobName: z.string().min(1),
  jobNumber: z.string().optional().nullable(),
  jobStartDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lineItems: z.array(bomLineItemSchema).min(1),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Prisma.BomWhereInput = {}

    if (search) {
      where.OR = [
        { jobName: { contains: search, mode: "insensitive" } },
        { jobNumber: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status && ["DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
      where.status = status as Prisma.BomWhereInput["status"]
    }

    const [boms, total] = await Promise.all([
      prisma.bom.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { lineItems: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bom.count({ where }),
    ])

    return NextResponse.json({
      data: boms,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SALES_MANAGER"])

    const body = await request.json()
    const data = createBomSchema.parse(body)

    const bom = await prisma.bom.create({
      data: {
        jobName: data.jobName,
        jobNumber: data.jobNumber || null,
        jobStartDate: data.jobStartDate ? new Date(data.jobStartDate) : null,
        notes: data.notes || null,
        createdById: user.id,
        lineItems: {
          create: data.lineItems.map((item) => ({
            productId: item.isNonCatalog ? null : item.productId,
            tier: item.tier,
            qtyNeeded: new Prisma.Decimal(item.qtyNeeded),
            isNonCatalog: item.isNonCatalog,
            nonCatalogName: item.nonCatalogName || null,
            nonCatalogCategory: item.nonCatalogCategory || null,
            nonCatalogUom: item.nonCatalogUom || null,
            nonCatalogEstCost: item.nonCatalogEstCost
              ? new Prisma.Decimal(item.nonCatalogEstCost)
              : null,
          })),
        },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        lineItems: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true, currentQty: true, pieceSize: true, pieceUnit: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ data: bom }, { status: 201 })
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
