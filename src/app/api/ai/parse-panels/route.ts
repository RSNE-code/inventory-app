import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/auth"
import { parsePanelVoiceInput } from "@/lib/ai/parse"
import { BUNDLE_SIZES } from "@/lib/panels"

const requestSchema = z.object({
  text: z.string().min(1),
  brand: z.string().min(1),
  thickness: z.number(),
})

/**
 * POST /api/ai/parse-panels
 * Lightweight panel-specific parser for voice/text input.
 * Returns structured height+quantity pairs from natural speech.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { text, brand, thickness } = requestSchema.parse(body)

    const bundleSize = BUNDLE_SIZES[thickness] ?? 0
    const result = await parsePanelVoiceInput(text, { brand, thickness, bundleSize })

    return NextResponse.json({ data: result })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", issues: err.issues },
        { status: 400 }
      )
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Panel parse error:", err)
    return NextResponse.json(
      { error: "Failed to parse panel input" },
      { status: 500 }
    )
  }
}
