import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { Prisma } from "@prisma/client"

/**
 * GET /api/boms/clonable?search=...
 * Returns BOMs created by the current user that can be cloned.
 * Supports search by job name/number. Returns up to 20 results.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)

    const where: Prisma.BomWhereInput = {
      createdById: user.id,
      status: { not: "CANCELLED" },
    }

    if (search.length >= 1) {
      where.OR = [
        { jobName: { contains: search, mode: "insensitive" } },
        { jobNumber: { contains: search, mode: "insensitive" } },
      ]
    }

    const boms = await prisma.bom.findMany({
      where,
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
