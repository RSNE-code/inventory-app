import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const bom = await prisma.bom.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        lineItems: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true, currentQty: true, pieceUnit: true, dimLength: true, dimLengthUnit: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!bom) {
      return NextResponse.json({ error: "BOM not found" }, { status: 404 })
    }

    return NextResponse.json({ data: bom })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const updateBomSchema = z.object({
  status: z.enum(["DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  jobName: z.string().min(1).optional(),
  jobNumber: z.string().optional().nullable(),
  jobStartDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  addLineItems: z
    .array(
      z.object({
        productId: z.string().uuid().optional().nullable(),
        tier: z.enum(["TIER_1", "TIER_2"]).default("TIER_1"),
        qtyNeeded: z.number().positive(),
        isNonCatalog: z.boolean().default(false),
        nonCatalogName: z.string().optional().nullable(),
        nonCatalogCategory: z.string().optional().nullable(),
        nonCatalogUom: z.string().optional().nullable(),
        nonCatalogEstCost: z.number().optional().nullable(),
      })
    )
    .optional(),
  removeLineItemIds: z.array(z.string().uuid()).optional(),
  updateLineItems: z
    .array(
      z.object({
        id: z.string().uuid(),
        qtyNeeded: z.number().positive(),
      })
    )
    .optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const body = await request.json()
    const data = updateBomSchema.parse(body)

    const existing = await prisma.bom.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "BOM not found" }, { status: 404 })
    }

    // Status transition validation
    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["APPROVED", "CANCELLED"],
        APPROVED: ["IN_PROGRESS", "DRAFT", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: [],
      }
      const allowed = validTransitions[existing.status] || []
      if (!allowed.includes(data.status)) {
        return NextResponse.json(
          { error: `Cannot change status from ${existing.status} to ${data.status}` },
          { status: 400 }
        )
      }

      // Approval requires specific role
      if (data.status === "APPROVED") {
        requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER"])
      }
    }

    // Only the creator can edit line items, and not on completed/cancelled BOMs
    const isEditingLineItems = data.addLineItems || data.removeLineItemIds || data.updateLineItems
    if (isEditingLineItems) {
      if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Cannot edit completed or cancelled BOMs" },
          { status: 400 }
        )
      }
      if (existing.createdById !== user.id) {
        return NextResponse.json(
          { error: "Only the BOM creator can edit line items" },
          { status: 403 }
        )
      }
    }

    // Remove line items
    if (data.removeLineItemIds && data.removeLineItemIds.length > 0) {
      await prisma.bomLineItem.deleteMany({
        where: { id: { in: data.removeLineItemIds }, bomId: id },
      })
    }

    // Update line item quantities
    if (data.updateLineItems && data.updateLineItems.length > 0) {
      for (const item of data.updateLineItems) {
        await prisma.bomLineItem.update({
          where: { id: item.id },
          data: { qtyNeeded: new Prisma.Decimal(item.qtyNeeded) },
        })
      }
    }

    // Add line items
    if (data.addLineItems && data.addLineItems.length > 0) {
      await prisma.bomLineItem.createMany({
        data: data.addLineItems.map((item) => ({
          bomId: id,
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
      })
    }

    // Update BOM
    const updateData: Prisma.BomUpdateInput = {}
    if (data.jobName !== undefined) updateData.jobName = data.jobName
    if (data.jobNumber !== undefined) updateData.jobNumber = data.jobNumber
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.jobStartDate !== undefined) {
      updateData.jobStartDate = data.jobStartDate ? new Date(data.jobStartDate) : null
    }
    if (data.status) {
      updateData.status = data.status
      if (data.status === "APPROVED") {
        updateData.approvedBy = { connect: { id: user.id } }
        updateData.approvedAt = new Date()
      }
    }

    const bom = await prisma.bom.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        lineItems: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true, currentQty: true, pieceUnit: true, dimLength: true, dimLengthUnit: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    return NextResponse.json({ data: bom })
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
