import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum([
    "ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER",
    "SALES_MANAGER", "SHOP_FOREMAN", "DOOR_SHOP", "CREW",
  ]).default("CREW"),
})

export async function GET() {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN"])

    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    return NextResponse.json({ data: users })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth()
    requireRole(currentUser.role, ["ADMIN"])

    const body = await request.json()
    const data = createUserSchema.parse(body)

    const user = await prisma.user.create({ data })
    return NextResponse.json({ data: user }, { status: 201 })
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
