import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { z } from "zod"

const createReceiptSchema = z.object({
  supplierId: z.string().uuid(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive(),
        unitCost: z.number().min(0),
      })
    )
    .min(0),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SHOP_FOREMAN"])

    const body = await request.json()
    const data = createReceiptSchema.parse(body)

    const fullReceipt = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          supplierId: data.supplierId,
          notes: data.notes || null,
        },
      })

      for (const item of data.items) {
        await adjustStock({
          productId: item.productId,
          quantity: item.quantity,
          type: "RECEIVE",
          userId: user.id,
          unitCost: item.unitCost,
          receiptId: receipt.id,
          tx,
        })
      }

      return tx.receipt.findUnique({
        where: { id: receipt.id },
        include: {
          supplier: { select: { name: true } },
          transactions: {
            include: { product: { select: { name: true } } },
          },
        },
      })
    })

    return NextResponse.json({ data: fullReceipt }, { status: 201 })
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
    const limit = parseInt(searchParams.get("limit") || "10")

    const receipts = await prisma.receipt.findMany({
      orderBy: { receivedAt: "desc" },
      take: limit,
      include: {
        supplier: { select: { name: true } },
        transactions: {
          include: { product: { select: { name: true } } },
        },
      },
    })

    return NextResponse.json({ data: receipts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
