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
  nonCatalogName: z.string().max(255).optional().nullable(),
  nonCatalogCategory: z.string().max(255).optional().nullable(),
  nonCatalogUom: z.string().max(50).optional().nullable(),
  nonCatalogEstCost: z.number().optional().nullable(),
  nonCatalogSpecs: z.union([
    z.object({
      type: z.literal("panel"),
      thickness: z.number().positive(),
      cutLengthFt: z.number().positive(),
      cutLengthDisplay: z.string(),
      widthIn: z.number().positive(),
      profile: z.string(),
      color: z.string(),
    }),
    z.record(z.string(), z.unknown()),
  ]).optional().nullable(),
  matchConfidence: z.number().min(0).max(1).optional().nullable(),
  rawText: z.string().optional().nullable(),
}).refine(
  (item) => !item.isNonCatalog || (item.nonCatalogName && item.nonCatalogName.trim().length > 0),
  { message: "Name is required for non-catalog items", path: ["nonCatalogName"] }
)

const createBomSchema = z.object({
  jobName: z.string().min(1),
  jobNumber: z.string().optional().nullable(),
  jobStartDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.enum(["photo", "manual"]).optional().default("manual"),
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

    // Collect product IDs to check for fabrication recipes
    const catalogProductIds = data.lineItems
      .filter((item) => !item.isNonCatalog && item.productId)
      .map((item) => item.productId!)

    // Look up which products have fabrication recipes
    const recipeLookup = new Map<string, boolean>()
    if (catalogProductIds.length > 0) {
      const recipes = await prisma.fabricationRecipe.findMany({
        where: {
          finishedProductId: { in: catalogProductIds },
          isActive: true,
        },
        select: { finishedProductId: true },
      })
      for (const r of recipes) {
        recipeLookup.set(r.finishedProductId, true)
      }
    }

    // Photo-created BOMs go to PENDING_REVIEW, manual to DRAFT
    const initialStatus = data.source === "photo" ? "PENDING_REVIEW" : "DRAFT"

    const bom = await prisma.bom.create({
      data: {
        jobName: data.jobName,
        jobNumber: data.jobNumber || null,
        jobStartDate: data.jobStartDate ? new Date(data.jobStartDate) : null,
        notes: data.notes || null,
        status: initialStatus,
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
            nonCatalogSpecs: item.nonCatalogSpecs ? (item.nonCatalogSpecs as Prisma.InputJsonValue) : undefined,
            matchConfidence: item.matchConfidence ?? null,
            rawText: item.rawText || null,
            // Auto-set fabrication source for products with recipes
            fabricationSource: !item.isNonCatalog && item.productId && recipeLookup.has(item.productId)
              ? "RSNE_MADE"
              : null,
          })),
        },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        lineItems: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true, currentQty: true, pieceUnit: true, dimLength: true, dimLengthUnit: true, dimWidth: true, dimWidthUnit: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ data: bom }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
