import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { matchPO } from "@/lib/ai/po-match"
import { z } from "zod"

const matchSchema = z.object({
  poNumber: z.string().optional(),
  vendorName: z.string().optional(),
  amount: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const params = matchSchema.parse(body)

    const match = await matchPO(params)

    return NextResponse.json({ data: match })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
