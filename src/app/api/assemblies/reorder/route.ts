import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER", "SHOP_FOREMAN"])

    const body = await request.json()
    const { orderedIds } = reorderSchema.parse(body)

    // Batch-update sortOrder for each assembly based on array position
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.assembly.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    )

    return NextResponse.json({ success: true })
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
