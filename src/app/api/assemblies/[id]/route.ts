import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const updateAssemblySchema = z.object({
  status: z.enum(["PLANNED", "AWAITING_APPROVAL", "APPROVED", "IN_PRODUCTION", "COMPLETED", "ALLOCATED", "SHIPPED"]).optional(),
  specs: z.record(z.string(), z.unknown()).optional(),
  priority: z.number().int().optional(),
  notes: z.string().optional().nullable(),
  approvalStatus: z.enum(["APPROVED", "REJECTED"]).optional(),
  approvalNotes: z.string().optional().nullable(),
  // For mid-build spec changes
  specChanges: z.array(z.object({
    fieldName: z.string(),
    oldValue: z.string().optional().nullable(),
    newValue: z.string(),
    reason: z.string().optional().nullable(),
  })).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const assembly = await prisma.assembly.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, name: true, type: true, specs: true } },
        producedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        startedBy: { select: { id: true, name: true } },
        components: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unitOfMeasure: true,
                currentQty: true,
                avgCost: true,
                category: { select: { name: true } },
              },
            },
          },
        },
        changeLog: {
          include: {
            changedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!assembly) {
      return NextResponse.json({ error: "Assembly not found" }, { status: 404 })
    }

    return NextResponse.json({ data: assembly })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const body = await request.json()
    const data = updateAssemblySchema.parse(body)

    const assembly = await prisma.assembly.findUniqueOrThrow({
      where: { id },
      include: {
        components: {
          include: {
            product: { select: { id: true, avgCost: true } },
          },
        },
      },
    })

    const updateData: Prisma.AssemblyUpdateInput = {}

    // Handle approval
    if (data.approvalStatus === "APPROVED") {
      requireRole(user.role, ["ADMIN", "SALES_MANAGER"])
      updateData.approvalStatus = "APPROVED"
      updateData.approvedBy = { connect: { id: user.id } }
      updateData.approvedAt = new Date()
      updateData.approvalNotes = data.approvalNotes || null
      updateData.status = "APPROVED"
    } else if (data.approvalStatus === "REJECTED") {
      requireRole(user.role, ["ADMIN", "SALES_MANAGER"])
      updateData.approvalStatus = "REJECTED"
      updateData.approvedBy = { connect: { id: user.id } }
      updateData.approvedAt = new Date()
      updateData.approvalNotes = data.approvalNotes || null
    }

    // Handle status transitions
    if (data.status) {
      // Role checks for production status transitions
      if (data.status === "IN_PRODUCTION" || data.status === "COMPLETED") {
        requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "SHOP_FOREMAN", "DOOR_SHOP"])
      } else if (data.status === "SHIPPED") {
        requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "SHOP_FOREMAN"])
      }

      updateData.status = data.status

      if (data.status === "IN_PRODUCTION") {
        updateData.startedAt = new Date()
        updateData.startedBy = { connect: { id: user.id } }

        // Deduct raw materials from stock
        for (const comp of assembly.components) {
          await adjustStock({
            productId: comp.productId,
            quantity: Number(comp.qtyUsed),
            type: "CONSUME",
            userId: user.id,
            unitCost: Number(comp.unitCost),
            notes: `Consumed for ${assembly.type} assembly`,
            jobName: assembly.jobName || undefined,
            assemblyId: assembly.id,
          })
        }
      }

      if (data.status === "COMPLETED") {
        updateData.completedAt = new Date()

        // Calculate total cost
        const totalCost = assembly.components.reduce(
          (sum, comp) => sum + Number(comp.totalCost),
          0
        )
        updateData.cost = new Prisma.Decimal(totalCost)
      }

      if (data.status === "SHIPPED") {
        updateData.shippedAt = new Date()
      }
    }

    if (data.specs) updateData.specs = data.specs as Prisma.InputJsonValue
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.notes !== undefined) updateData.notes = data.notes

    // Log spec changes
    if (data.specChanges && data.specChanges.length > 0) {
      for (const change of data.specChanges) {
        await prisma.assemblyChangeLog.create({
          data: {
            assemblyId: id,
            fieldName: change.fieldName,
            oldValue: change.oldValue || null,
            newValue: change.newValue,
            changedById: user.id,
            reason: change.reason || null,
          },
        })
      }

      // Also update specs object if spec changes imply updates
      if (data.specs) {
        updateData.specs = data.specs as Prisma.InputJsonValue
      }
    }

    const updated = await prisma.assembly.update({
      where: { id },
      data: updateData,
      include: {
        template: { select: { id: true, name: true, type: true } },
        producedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        startedBy: { select: { id: true, name: true } },
        components: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true, currentQty: true },
            },
          },
        },
        changeLog: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    })

    return NextResponse.json({ data: updated })
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
