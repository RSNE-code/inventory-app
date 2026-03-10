import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const componentSchema = z.object({
  productId: z.string().uuid(),
  qtyUsed: z.number().positive(),
})

const createAssemblySchema = z.object({
  templateId: z.string().uuid().optional().nullable(),
  type: z.enum(["DOOR", "FLOOR_PANEL", "WALL_PANEL"]),
  specs: z.record(z.string(), z.unknown()).optional().nullable(),
  batchSize: z.number().int().positive().default(1),
  jobName: z.string().optional().nullable(),
  jobNumber: z.string().optional().nullable(),
  priority: z.number().int().default(0),
  notes: z.string().optional().nullable(),
  requiresApproval: z.boolean().default(false),
  components: z.array(componentSchema).min(1),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const queueType = searchParams.get("queueType") || ""
    const status = searchParams.get("status") || ""

    const where: Prisma.AssemblyWhereInput = {}

    if (queueType === "DOOR_SHOP" || queueType === "FABRICATION") {
      where.queueType = queueType
    }

    if (status) {
      where.status = status as Prisma.AssemblyWhereInput["status"]
    }

    const assemblies = await prisma.assembly.findMany({
      where,
      include: {
        template: { select: { id: true, name: true, type: true } },
        producedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
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
              },
            },
          },
        },
        _count: { select: { changeLog: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    })

    return NextResponse.json({ data: assemblies })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SHOP_FOREMAN"])

    const body = await request.json()
    const data = createAssemblySchema.parse(body)

    // Door → DOOR_SHOP queue, panels/floors → FABRICATION queue
    const queueType = data.type === "DOOR" ? "DOOR_SHOP" : "FABRICATION"

    // Doors require approval; panels/floors don't by default
    const approvalStatus = data.requiresApproval || data.type === "DOOR"
      ? "PENDING"
      : "NOT_REQUIRED"

    // Get product costs for components
    const productIds = data.components.map((c) => c.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, avgCost: true },
    })
    const costMap = new Map(products.map((p) => [p.id, Number(p.avgCost)]))

    const assembly = await prisma.assembly.create({
      data: {
        templateId: data.templateId || null,
        type: data.type,
        status: approvalStatus === "PENDING" ? "AWAITING_APPROVAL" : "PLANNED",
        specs: (data.specs as Prisma.InputJsonValue) || Prisma.JsonNull,
        batchSize: data.batchSize,
        jobName: data.jobName || null,
        jobNumber: data.jobNumber || null,
        priority: data.priority,
        queueType,
        producedById: user.id,
        approvalStatus,
        notes: data.notes || null,
        components: {
          create: data.components.map((comp) => {
            const unitCost = costMap.get(comp.productId) ?? 0
            const totalQty = comp.qtyUsed * data.batchSize
            return {
              productId: comp.productId,
              qtyUsed: new Prisma.Decimal(totalQty),
              unitCost: new Prisma.Decimal(unitCost),
              totalCost: new Prisma.Decimal(totalQty * unitCost),
            }
          }),
        },
      },
      include: {
        template: { select: { id: true, name: true, type: true } },
        producedBy: { select: { id: true, name: true } },
        components: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true, currentQty: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ data: assembly }, { status: 201 })
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
