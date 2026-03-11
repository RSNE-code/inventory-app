import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional(),
  tier: z.enum(["TIER_1", "TIER_2"]).optional(),
  unitOfMeasure: z.string().min(1).optional(),
  shopUnit: z.string().optional().nullable(),
  trackingUnit: z.string().optional().nullable(),
  reorderPoint: z.number().min(0).optional(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  leadTimeDays: z.number().int().positive().optional().nullable(),
  pieceUnit: z.string().optional().nullable(),
  dimLength: z.number().positive().optional().nullable(),
  dimLengthUnit: z.string().optional().nullable(),
  dimWidth: z.number().positive().optional().nullable(),
  dimWidthUnit: z.string().optional().nullable(),
  dimThickness: z.number().positive().optional().nullable(),
  dimThicknessUnit: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { name: true } } },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ data: product })
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
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER"])
    const { id } = await params

    const body = await request.json()
    const data = updateProductSchema.parse(body)

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    })

    return NextResponse.json({ data: product })
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
