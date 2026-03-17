import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"

/**
 * GET /api/boms/review
 * Returns BOMs with PENDING_REVIEW status for Gabe's review queue.
 */
export async function GET() {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER"])

    const boms = await prisma.bom.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        lineItems: {
          where: { isActive: true },
          include: {
            product: {
              select: { id: true, name: true, unitOfMeasure: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    return NextResponse.json({ data: boms })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
