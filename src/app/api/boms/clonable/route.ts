import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

/**
 * GET /api/boms/clonable
 * Returns recent BOMs that can be cloned for a new BOM.
 * Returns the 5 most recent non-cancelled BOMs by the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10)

    const boms = await prisma.bom.findMany({
      where: {
        createdById: user.id,
        status: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        jobName: true,
        jobNumber: true,
        status: true,
        createdAt: true,
        _count: { select: { lineItems: { where: { isActive: true } } } },
      },
    })

    const data = boms.map((b) => ({
      id: b.id,
      jobName: b.jobName,
      jobNumber: b.jobNumber,
      status: b.status,
      createdAt: b.createdAt,
      itemCount: b._count.lineItems,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
