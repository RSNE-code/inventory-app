import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export const maxDuration = 30

const MODEL_REFINE = anthropic("claude-sonnet-4-6")

interface RefineItem {
  rawText: string
  matchedProductId: string | null
  confidence: number
  quantity: number
}

/**
 * POST /api/ai/refine-matches
 * Pass 2: Background refinement using Sonnet with full catalog + match history context.
 * Only re-evaluates items with confidence < 0.95.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const items: RefineItem[] = body.items || []

    if (items.length === 0) {
      return NextResponse.json({ data: { items: [] } })
    }

    // Only refine items below 0.95 confidence
    const needsRefinement = items.filter((i) => i.confidence < 0.95)
    const alreadyGood = items.filter((i) => i.confidence >= 0.95)

    if (needsRefinement.length === 0) {
      return NextResponse.json({
        data: { items: items.map((i) => ({ ...i, refined: false })) },
      })
    }

    // Load full catalog
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true, unitOfMeasure: true, tier: true },
      orderBy: { name: "asc" },
    })

    const catalogContext = products
      .map((p) => `${p.id}|${p.name}|${p.unitOfMeasure}${p.sku ? `|${p.sku}` : ""}`)
      .join("\n")

    // Load user's top confirmed match history as few-shot examples (catalog + custom)
    const matchHistory = await prisma.matchHistory.findMany({
      where: { userId: user.id, confirmed: true },
      orderBy: { usageCount: "desc" },
      take: 50,
      include: { product: { select: { name: true } } },
    })

    const catalogHistory = matchHistory.filter((m) => m.productId && m.product)
    const customHistory = matchHistory.filter((m) => !m.productId && m.customName)

    let historyContext = "No match history yet."
    if (catalogHistory.length > 0 || customHistory.length > 0) {
      const lines: string[] = []
      for (const m of catalogHistory) {
        lines.push(`"${m.rawText}" → ${m.product!.name} (confirmed ${m.usageCount}x)`)
      }
      for (const m of customHistory) {
        lines.push(`"${m.rawText}" → [CUSTOM: ${m.customName}] (confirmed ${m.usageCount}x)`)
      }
      historyContext = lines.join("\n")
    }

    // Build refinement prompt
    const itemsToRefine = needsRefinement.map((i) => ({
      rawText: i.rawText,
      currentMatchId: i.matchedProductId,
      currentConfidence: i.confidence,
      quantity: i.quantity,
    }))

    const prompt = `You are refining AI-matched construction material catalog items.
The user wrote these items on a material list (handwritten or typed). The initial pass matched them but with low confidence.

PRODUCT CATALOG (id|name|unit|sku):
${catalogContext}

USER'S MATCH HISTORY (what they've confirmed before):
${historyContext}

ITEMS TO REFINE:
${JSON.stringify(itemsToRefine, null, 2)}

RULES:
- Pay close attention to DIMENSIONS. "OC 2x3" means 2"x3", NOT 2"x2". "IC 3x3" means 3"x3".
- IMP = Insulated Metal Panel. TWS = trim items. OC = Outside Corner. IC = Inside Corner.
- If the user's match history shows a confirmed match for similar text, use that.
- For panel items (IMP): match to generic panel specs (thickness + length). Do NOT assign a brand.
- Provide your top match and up to 2 alternatives.
- Be honest about confidence. Only give 0.95+ if you're very sure.

Return a JSON array:
[{
  "rawText": "original text",
  "matchedProductId": "best product ID or null",
  "confidence": 0.0-1.0,
  "alternatives": [{"productId": "id", "confidence": 0.0-1.0}],
  "isPanel": true/false
}]

Return ONLY the JSON array, no markdown.`

    const response = await generateText({
      model: MODEL_REFINE,
      prompt,
    })

    let refinedItems: Array<{
      rawText: string
      matchedProductId: string | null
      confidence: number
      alternatives?: Array<{ productId: string; confidence: number }>
      isPanel?: boolean
    }> = []

    try {
      const text = response.text.trim()
      const jsonStart = text.indexOf("[")
      const jsonEnd = text.lastIndexOf("]")
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        refinedItems = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
      }
    } catch {
      console.error("[refine-matches] Failed to parse response:", response.text)
    }

    // Merge refined results with already-good items
    const result = items.map((original) => {
      if (original.confidence >= 0.95) {
        return { ...original, refined: false }
      }

      const refined = refinedItems.find(
        (r) => r.rawText.toLowerCase().trim() === original.rawText.toLowerCase().trim()
      )

      if (refined && refined.confidence > original.confidence) {
        return {
          ...original,
          matchedProductId: refined.matchedProductId,
          confidence: refined.confidence,
          alternatives: refined.alternatives || [],
          isPanel: refined.isPanel || false,
          refined: true,
        }
      }

      return { ...original, refined: false }
    })

    return NextResponse.json({ data: { items: result } })
  } catch (error) {
    console.error("[refine-matches] Error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
