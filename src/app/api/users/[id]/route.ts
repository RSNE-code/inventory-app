import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum([
    "ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER",
    "SALES_MANAGER", "SHOP_FOREMAN", "DOOR_SHOP", "CREW",
  ]).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth()
    requireRole(currentUser.role, ["ADMIN"])
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    return NextResponse.json({ data: user })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth()
    requireRole(currentUser.role, ["ADMIN"])
    const { id } = await params

    const body = await request.json()
    const data = updateUserSchema.parse(body)

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    return NextResponse.json({ data: user })
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
