import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const templateLineItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  tier: z.enum(["TIER_1", "TIER_2"]).default("TIER_1"),
  defaultQty: z.number().positive(),
  unitOfMeasure: z.string().min(1).max(50),
  isNonCatalog: z.boolean().default(false),
  nonCatalogName: z.string().max(255).optional().nullable(),
  nonCatalogCategory: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (item) => !item.isNonCatalog || (item.nonCatalogName && item.nonCatalogName.trim().length > 0),
  { message: "Name is required for non-catalog items", path: ["nonCatalogName"] }
)

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  lineItems: z.array(templateLineItemSchema).min(1),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const search = searchParams.get("search") || ""

    const where: Prisma.BomTemplateWhereInput = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const templates = await prisma.bomTemplate.findMany({
      where,
      include: {
        _count: { select: { lineItems: true } },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ data: templates })
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
    const data = createTemplateSchema.parse(body)

    const template = await prisma.bomTemplate.create({
      data: {
        name: data.name,
        description: data.description || null,
        lineItems: {
          create: data.lineItems.map((item) => ({
            productId: item.isNonCatalog ? null : item.productId,
            tier: item.tier,
            defaultQty: new Prisma.Decimal(item.defaultQty),
            unitOfMeasure: item.unitOfMeasure,
            isNonCatalog: item.isNonCatalog,
            nonCatalogName: item.nonCatalogName || null,
            nonCatalogCategory: item.nonCatalogCategory || null,
            notes: item.notes || null,
          })),
        },
      },
      include: {
        lineItems: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true, currentQty: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    if (message.includes("Unique constraint")) return NextResponse.json({ error: "A template with that name already exists" }, { status: 409 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
