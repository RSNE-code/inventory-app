import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { adjustStock } from "@/lib/stock"
import { z } from "zod"

const adjustSchema = z.object({
  quantity: z.number().positive(),
  direction: z.enum(["up", "down"]),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    requireRole(user.role, [
      "ADMIN",
      "OPERATIONS_MANAGER",
      "OFFICE_MANAGER",
      "SHOP_FOREMAN",
    ])
    const { id } = await params

    const body = await request.json()
    const data = adjustSchema.parse(body)

    const transaction = await adjustStock({
      productId: id,
      quantity: data.quantity,
      type: data.direction === "up" ? "ADJUST_UP" : "ADJUST_DOWN",
      userId: user.id,
      reason: data.reason,
      notes: data.notes,
    })

    return NextResponse.json({ data: transaction }, { status: 201 })
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
