import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    await requireAuth()

    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ data: categories })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}
