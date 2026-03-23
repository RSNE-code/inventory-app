import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"

const batchShipSchema = z.object({
  assemblyIds: z.array(z.string().uuid()).min(1, "At least one assembly ID required"),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "SHOP_FOREMAN"])

    const body = await request.json()
    const data = batchShipSchema.parse(body)

    // Verify all assemblies exist and are COMPLETED
    const assemblies = await prisma.assembly.findMany({
      where: { id: { in: data.assemblyIds } },
      select: { id: true, status: true, jobName: true },
    })

    if (assemblies.length !== data.assemblyIds.length) {
      const foundIds = new Set(assemblies.map((a) => a.id))
      const missing = data.assemblyIds.filter((id) => !foundIds.has(id))
      return NextResponse.json(
        { error: `Assemblies not found: ${missing.join(", ")}` },
        { status: 404 }
      )
    }

    const notCompleted = assemblies.filter((a) => a.status !== "COMPLETED")
    if (notCompleted.length > 0) {
      return NextResponse.json(
        { error: `${notCompleted.length} assembly(ies) are not in COMPLETED status` },
        { status: 409 }
      )
    }

    // Ship all in a transaction
    const now = new Date()
    await prisma.$transaction(
      data.assemblyIds.map((id) =>
        prisma.assembly.update({
          where: { id },
          data: { status: "SHIPPED", shippedAt: now },
        })
      )
    )

    return NextResponse.json({
      data: { shipped: data.assemblyIds.length },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((e: { message: string }) => e.message).join(", ") },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("permission")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
