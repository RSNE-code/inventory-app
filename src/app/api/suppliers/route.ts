import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const search = searchParams.get("search") || ""

    const suppliers = await prisma.supplier.findMany({
      where: {
        isActive: true,
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, contactInfo: true },
    })

    return NextResponse.json({ data: suppliers })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
