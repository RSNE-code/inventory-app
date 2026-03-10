import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { matchSupplier } from "@/lib/ai/supplier-match"

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const { name } = await request.json()
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const match = await matchSupplier(name)
    return NextResponse.json({ data: match })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
