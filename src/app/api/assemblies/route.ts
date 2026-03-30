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
  type: z.enum(["DOOR", "FLOOR_PANEL", "WALL_PANEL", "RAMP"]),
  specs: z.record(z.string(), z.unknown()).optional().nullable(),
  batchSize: z.number().int().positive().default(1),
  jobName: z.string().optional().nullable(),
  jobNumber: z.string().optional().nullable(),
  priority: z.number().int().default(0),
  notes: z.string().optional().nullable(),
  requiresApproval: z.boolean().default(false),
  isDraft: z.boolean().default(false),
  components: z.array(componentSchema).default([]),
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
      // sortOrder=0 means "unpositioned" — sorted after positioned items
      // Prisma can't express "0 last" so we use priority+createdAt as base,
      // then re-sort in JS below
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    })

    // Re-sort: positioned items (sortOrder > 0) first by sortOrder,
    // then unpositioned items (sortOrder = 0) in their original priority/createdAt order
    assemblies.sort((a, b) => {
      const aPos = a.sortOrder || 0
      const bPos = b.sortOrder || 0
      if (aPos > 0 && bPos > 0) return aPos - bPos
      if (aPos > 0 && bPos === 0) return -1
      if (aPos === 0 && bPos > 0) return 1
      return 0 // both unpositioned — keep priority/createdAt order from DB
    })

    // Match door assemblies to BOMs by jobName
    const doorJobNames = assemblies
      .filter((a) => a.type === "DOOR" && a.jobName)
      .map((a) => a.jobName!.trim().toLowerCase())
    const uniqueJobNames = [...new Set(doorJobNames)]

    let bomsByJobName = new Map<string, Array<{ id: string; jobName: string; status: string; lineItemCount: number }>>()

    if (uniqueJobNames.length > 0) {
      const matchedBoms = await prisma.bom.findMany({
        where: {
          jobName: { in: uniqueJobNames, mode: "insensitive" },
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          jobName: true,
          status: true,
          _count: { select: { lineItems: true } },
        },
        orderBy: { createdAt: "desc" },
      })

      for (const bom of matchedBoms) {
        const key = bom.jobName.trim().toLowerCase()
        const entry = {
          id: bom.id,
          jobName: bom.jobName,
          status: bom.status,
          lineItemCount: bom._count.lineItems,
        }
        const existing = bomsByJobName.get(key)
        if (existing) {
          existing.push(entry)
        } else {
          bomsByJobName.set(key, [entry])
        }
      }
    }

    // Attach matchedBoms to each door assembly
    const assembliesWithBoms = assemblies.map((a) => {
      if (a.type !== "DOOR" || !a.jobName) {
        return { ...a, matchedBoms: [] }
      }

      // Check for manual links in specs.linkedBomIds first
      const specs = a.specs as Record<string, unknown> | null
      const linkedBomIds = (specs?.linkedBomIds as string[]) || []

      const autoMatched = bomsByJobName.get(a.jobName.trim().toLowerCase()) || []

      // If manual links exist, prioritize them but also include auto-matches
      if (linkedBomIds.length > 0) {
        // Manual links are already in the BOM query if they share jobName;
        // for cross-job manual links, we'd need a separate query — but that's an edge case.
        // For now, mark manual matches.
        return {
          ...a,
          matchedBoms: autoMatched.map((b) => ({
            ...b,
            isManualLink: linkedBomIds.includes(b.id),
          })),
        }
      }

      return { ...a, matchedBoms: autoMatched }
    })

    return NextResponse.json({ data: assembliesWithBoms })
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

    // Draft assemblies skip approval queue entirely
    const approvalStatus = data.isDraft
      ? "NOT_REQUIRED"
      : (data.requiresApproval || data.type === "DOOR")
        ? "PENDING"
        : "NOT_REQUIRED"

    // Get product costs for components (if any)
    let costMap = new Map<string, number>()
    if (data.components.length > 0) {
      const productIds = data.components.map((c) => c.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, avgCost: true },
      })
      costMap = new Map(products.map((p) => [p.id, Number(p.avgCost)]))
    }

    const assembly = await prisma.assembly.create({
      data: {
        templateId: data.templateId || null,
        type: data.type,
        status: data.isDraft ? "DRAFT" : approvalStatus === "PENDING" ? "AWAITING_APPROVAL" : "PLANNED",
        specs: (data.specs as Prisma.InputJsonValue) || Prisma.JsonNull,
        batchSize: data.batchSize,
        jobName: data.jobName || null,
        jobNumber: data.jobNumber || null,
        priority: data.priority,
        queueType,
        producedById: user.id,
        approvalStatus,
        notes: data.notes || null,
        ...(data.components.length > 0 ? {
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
        } : {}),
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
      const msg = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
