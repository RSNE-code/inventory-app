import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { searchPOs } from "@/lib/ai/po-match"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const supplierId = searchParams.get("supplierId") || undefined
    const search = searchParams.get("search") || undefined
    const limit = parseInt(searchParams.get("limit") || "20")

    const pos = await searchPOs({ supplierId, search, limit })

    return NextResponse.json({ data: pos })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
