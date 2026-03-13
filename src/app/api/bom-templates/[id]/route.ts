import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  addLineItems: z
    .array(
      z.object({
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
    )
    .optional(),
  removeLineItemIds: z.array(z.string().uuid()).optional(),
  updateLineItems: z
    .array(
      z.object({
        id: z.string().uuid(),
        defaultQty: z.number().positive().optional(),
        unitOfMeasure: z.string().min(1).max(50).optional(),
        notes: z.string().optional().nullable(),
      })
    )
    .optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const template = await prisma.bomTemplate.findUnique({
      where: { id },
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

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ data: template })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SALES_MANAGER"])
    const { id } = await params

    const body = await request.json()
    const data = updateTemplateSchema.parse(body)

    const existing = await prisma.bomTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    if (data.removeLineItemIds && data.removeLineItemIds.length > 0) {
      await prisma.bomTemplateLineItem.deleteMany({
        where: { id: { in: data.removeLineItemIds }, templateId: id },
      })
    }

    if (data.updateLineItems && data.updateLineItems.length > 0) {
      await Promise.all(
        data.updateLineItems.map((item) => {
          const updateData: Prisma.BomTemplateLineItemUpdateInput = {}
          if (item.defaultQty !== undefined) updateData.defaultQty = new Prisma.Decimal(item.defaultQty)
          if (item.unitOfMeasure !== undefined) updateData.unitOfMeasure = item.unitOfMeasure
          if (item.notes !== undefined) updateData.notes = item.notes
          return prisma.bomTemplateLineItem.update({
            where: { id: item.id, templateId: id },
            data: updateData,
          })
        })
      )
    }

    if (data.addLineItems && data.addLineItems.length > 0) {
      await prisma.bomTemplateLineItem.createMany({
        data: data.addLineItems.map((item) => ({
          templateId: id,
          productId: item.isNonCatalog ? null : item.productId,
          tier: item.tier,
          defaultQty: new Prisma.Decimal(item.defaultQty),
          unitOfMeasure: item.unitOfMeasure,
          isNonCatalog: item.isNonCatalog,
          nonCatalogName: item.nonCatalogName || null,
          nonCatalogCategory: item.nonCatalogCategory || null,
          notes: item.notes || null,
        })),
      })
    }

    const updateData: Prisma.BomTemplateUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const template = await prisma.bomTemplate.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ data: template })
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SALES_MANAGER"])
    const { id } = await params

    const existing = await prisma.bomTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    await prisma.bomTemplate.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
