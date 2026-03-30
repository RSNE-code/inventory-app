import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { checkBomDoors } from "./fab-check/route"
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
          where: { isActive: true },
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true, currentQty: true, pieceUnit: true, dimLength: true, dimLengthUnit: true, dimWidth: true, dimWidthUnit: true, isAssembly: true },
            },
            assembly: {
              select: { id: true, status: true },
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
  status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
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
        nonCatalogName: z.string().max(255).optional().nullable(),
        nonCatalogCategory: z.string().max(255).optional().nullable(),
        nonCatalogUom: z.string().max(50).optional().nullable(),
        nonCatalogEstCost: z.number().optional().nullable(),
        nonCatalogSpecs: z.any().optional().nullable(),
        parsedUom: z.string().max(50).optional().nullable(),
        inputUnit: z.string().max(50).optional().nullable(),
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
        qtyNeeded: z.number().positive().optional(),
        fabricationSource: z.enum(["RSNE_MADE", "SUPPLIER"]).optional().nullable(),
        nonCatalogSpecs: z.any().optional(),
        nonCatalogName: z.string().max(255).optional(),
        inputUnit: z.string().max(50).optional().nullable(),
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
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SALES_MANAGER", "SHOP_FOREMAN"])
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
        DRAFT: ["PENDING_REVIEW", "APPROVED", "CANCELLED"],
        PENDING_REVIEW: ["APPROVED", "CANCELLED"],
        APPROVED: ["IN_PROGRESS", "CANCELLED"],
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

        // Fabrication gate: check all door items are resolved before approval
        const fabCheck = await checkBomDoors(id)
        if (fabCheck.doorItems.length > 0 && !fabCheck.allResolved) {
          const unresolved = fabCheck.doorItems.filter((d) => d.status === "unresolved")
          return NextResponse.json(
            {
              error: "This BOM has door items that need to be created in the Door Shop Queue first",
              unresolvedDoors: unresolved.map((d) => d.productName),
            },
            { status: 400 }
          )
        }

        // Auto-link matched doors to BOM line items
        for (const item of fabCheck.doorItems) {
          if (item.status === "matched" && item.assembly) {
            await prisma.bomLineItem.update({
              where: { id: item.lineItemId },
              data: { assemblyId: item.assembly.id },
            })
          }
        }
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

    // Soft-delete line items (set isActive = false)
    if (data.removeLineItemIds && data.removeLineItemIds.length > 0) {
      await prisma.bomLineItem.updateMany({
        where: { id: { in: data.removeLineItemIds }, bomId: id },
        data: { isActive: false },
      })
    }

    // Update line items (qty and/or fabrication source)
    if (data.updateLineItems && data.updateLineItems.length > 0) {
      await Promise.all(
        data.updateLineItems.map((item) => {
          const updateFields: Record<string, unknown> = {}
          if (item.qtyNeeded !== undefined) {
            updateFields.qtyNeeded = new Prisma.Decimal(item.qtyNeeded)
          }
          if (item.fabricationSource !== undefined) {
            updateFields.fabricationSource = item.fabricationSource
          }
          if (item.nonCatalogSpecs !== undefined) {
            updateFields.nonCatalogSpecs = item.nonCatalogSpecs as Prisma.InputJsonValue
          }
          if (item.nonCatalogName !== undefined) {
            updateFields.nonCatalogName = item.nonCatalogName
          }
          if (item.inputUnit !== undefined) {
            updateFields.inputUnit = item.inputUnit
          }
          if (Object.keys(updateFields).length === 0) return Promise.resolve()
          return prisma.bomLineItem.update({
            where: { id: item.id, bomId: id, isActive: true },
            data: updateFields,
          })
        })
      )
    }

    // Add line items (merge into existing if same productId)
    if (data.addLineItems && data.addLineItems.length > 0) {
      const existingLineItems = await prisma.bomLineItem.findMany({
        where: { bomId: id, isActive: true },
        select: { id: true, productId: true, qtyNeeded: true },
      })

      for (const item of data.addLineItems) {
        const existingMatch = !item.isNonCatalog && item.productId
          ? existingLineItems.find((li) => li.productId === item.productId)
          : null

        if (existingMatch) {
          // Merge: add quantity to existing line item
          await prisma.bomLineItem.update({
            where: { id: existingMatch.id },
            data: {
              qtyNeeded: new Prisma.Decimal(
                Number(existingMatch.qtyNeeded) + item.qtyNeeded
              ),
            },
          })
        } else {
          // Auto-set fabricationSource for assembly products
          let fabricationSource: "RSNE_MADE" | null = null
          if (!item.isNonCatalog && item.productId) {
            const product = await prisma.product.findUnique({
              where: { id: item.productId },
              select: { isAssembly: true },
            })
            if (product?.isAssembly) fabricationSource = "RSNE_MADE"
          }

          await prisma.bomLineItem.create({
            data: {
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
              nonCatalogSpecs: item.nonCatalogSpecs ? (item.nonCatalogSpecs as Prisma.InputJsonValue) : undefined,
              parsedUom: item.parsedUom || null,
              inputUnit: item.inputUnit || null,
              fabricationSource,
            },
          })
        }
      }
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
          where: { isActive: true },
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true, currentQty: true, pieceUnit: true, dimLength: true, dimLengthUnit: true, dimWidth: true, dimWidthUnit: true, isAssembly: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    return NextResponse.json({ data: bom })
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN"])
    const { id } = await params

    const bom = await prisma.bom.findUnique({
      where: { id },
      select: { id: true, status: true, paperBomUrl: true },
    })

    if (!bom) {
      return NextResponse.json({ error: "BOM not found" }, { status: 404 })
    }

    if (bom.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Cannot delete a BOM that is in progress. Complete or cancel it first." },
        { status: 400 }
      )
    }

    // Nullify bomId on related transactions (preserve audit trail)
    await prisma.transaction.updateMany({
      where: { bomId: id },
      data: { bomId: null },
    })

    // Delete paper BOM from Supabase Storage if it exists
    if (bom.paperBomUrl) {
      try {
        const supabase = await createClient()
        // Extract file path from URL: everything after /paper-boms/
        const match = bom.paperBomUrl.match(/\/paper-boms\/(.+)$/)
        if (match) {
          await supabase.storage.from("paper-boms").remove([match[1]])
        }
      } catch {
        // Storage cleanup is best-effort — don't block deletion
      }
    }

    // Delete BOM (line items cascade via onDelete: Cascade)
    await prisma.bom.delete({ where: { id } })

    return NextResponse.json({ message: "BOM deleted" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
