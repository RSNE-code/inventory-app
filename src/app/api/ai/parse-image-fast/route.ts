import { NextRequest, NextResponse } from "next/server"
import { parseImageInput } from "@/lib/ai/parse"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const maxDuration = 30

/**
 * POST /api/ai/parse-image-fast
 * Pass 1: Fast image parse with match history lookup.
 * Uses existing Sonnet vision parser, then checks match history for instant matches.
 * Returns items with confidence scores + alternatives for low-confidence items.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()

    const files: File[] = []
    const singleFile = formData.get("image") as File | null
    if (singleFile) files.push(singleFile)
    const multiFiles = formData.getAll("images") as File[]
    files.push(...multiFiles)

    if (files.length === 0) {
      return NextResponse.json({ error: "At least one image file is required" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "Images must be JPEG, PNG, WebP, or GIF" }, { status: 400 })
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Each image must be under 10MB" }, { status: 400 })
      }
    }

    // Convert to base64
    const base64Images: string[] = []
    const mimeTypes: string[] = []
    for (const file of files) {
      const bytes = await file.arrayBuffer()
      base64Images.push(Buffer.from(bytes).toString("base64"))
      mimeTypes.push(file.type)
    }

    // Run existing image parser (Sonnet vision)
    const result = await parseImageInput(
      base64Images.length === 1 ? base64Images[0] : base64Images,
      mimeTypes.length === 1 ? mimeTypes[0] : mimeTypes
    )

    // Load user's match history for boosting confidence
    const matchHistory = await prisma.matchHistory.findMany({
      where: { userId: user.id, confirmed: true },
      orderBy: { usageCount: "desc" },
      take: 200,
      select: { normalizedText: true, productId: true, usageCount: true },
    })

    const historyMap = new Map(
      matchHistory.map((m) => [m.normalizedText, { productId: m.productId, usageCount: m.usageCount }])
    )

    // Enhance results with match history
    const enhancedItems = result.items.map((item) => {
      const normalized = item.parsedItem.rawText.toLowerCase().trim().replace(/\s+/g, " ")
      const historyMatch = historyMap.get(normalized)

      if (historyMatch && item.matchedProduct?.id === historyMatch.productId) {
        // Match history confirms this match — boost confidence
        return {
          ...item,
          matchConfidence: Math.max(item.matchConfidence, 0.95 + Math.min(historyMatch.usageCount * 0.005, 0.049)),
          historyConfirmed: true,
        }
      }

      if (historyMatch && !item.matchedProduct) {
        // We have a history match but the parser didn't find one — use history
        // This happens when the fuzzy matcher fails but we've seen this text before
        return {
          ...item,
          matchConfidence: 0.90 + Math.min(historyMatch.usageCount * 0.01, 0.09),
          historyProductId: historyMatch.productId,
          historyConfirmed: true,
        }
      }

      return { ...item, historyConfirmed: false }
    })

    return NextResponse.json({
      data: {
        items: enhancedItems,
        rawInput: `[${files.length} image${files.length !== 1 ? "s" : ""}]`,
        inputType: "image" as const,
      },
    })
  } catch (error) {
    console.error("[parse-image-fast] Error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
