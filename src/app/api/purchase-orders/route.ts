import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"

const createPOSchema = z.object({
  poNumber: z.string().min(1, "PO number is required"),
  supplierId: z.string().uuid(),
  expectedDelivery: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  lineItems: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qtyOrdered: z.number().positive(),
        unitCost: z.number().min(0),
      })
    )
    .min(1, "At least one line item is required"),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER"])

    const body = await request.json()
    const data = createPOSchema.parse(body)

    const existing = await prisma.purchaseOrder.findUnique({
      where: { poNumber: data.poNumber },
    })
    if (existing) {
      return NextResponse.json({ error: "PO number already exists" }, { status: 409 })
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: data.poNumber,
        supplierId: data.supplierId,
        expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
        notes: data.notes || null,
        lineItems: {
          create: data.lineItems.map((item) => ({
            productId: item.productId,
            qtyOrdered: item.qtyOrdered,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        supplier: { select: { name: true } },
        lineItems: {
          include: { product: { select: { name: true, unitOfMeasure: true } } },
        },
      },
    })

    return NextResponse.json({ data: po }, { status: 201 })
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

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const supplierId = searchParams.get("supplierId")
    const status = searchParams.get("status")
    const openOnly = searchParams.get("openOnly") === "true"

    const where: Record<string, unknown> = {}
    if (supplierId) where.supplierId = supplierId
    if (status) where.status = status
    if (openOnly) where.status = { in: ["OPEN", "PARTIALLY_RECEIVED"] }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { name: true } },
        lineItems: {
          include: { product: { select: { id: true, name: true, unitOfMeasure: true } } },
        },
      },
    })

    return NextResponse.json({ data: purchaseOrders })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
