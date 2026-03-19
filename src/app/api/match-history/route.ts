import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ").replace(/['"]/g, "")
}

const confirmSchema = z.object({
  matches: z.array(z.object({
    rawText: z.string().min(1),
    productId: z.string().uuid().optional(),
    customName: z.string().min(1).optional(),
  }).refine(
    (m) => m.productId || m.customName,
    { message: "Either productId or customName is required" }
  )).min(1),
})

/**
 * GET /api/match-history?text=OC+2x3
 * Lookup match history for a normalized text string.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const text = searchParams.get("text") || ""

    if (!text) {
      return NextResponse.json({ data: null })
    }

    const normalized = normalizeText(text)
    const match = await prisma.matchHistory.findUnique({
      where: {
        normalizedText_userId: {
          normalizedText: normalized,
          userId: user.id,
        },
      },
      include: {
        product: {
          select: { id: true, name: true, unitOfMeasure: true },
        },
      },
    })

    return NextResponse.json({ data: match })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/match-history
 * Bulk confirm matches — upsert into match history.
 * Increments usageCount if match already exists.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = confirmSchema.parse(body)

    const results = []

    for (const match of data.matches) {
      const normalized = normalizeText(match.rawText)

      const result = await prisma.matchHistory.upsert({
        where: {
          normalizedText_userId: {
            normalizedText: normalized,
            userId: user.id,
          },
        },
        update: {
          productId: match.productId || null,
          customName: match.customName || null,
          confirmed: true,
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
        create: {
          rawText: match.rawText,
          normalizedText: normalized,
          productId: match.productId || null,
          customName: match.customName || null,
          userId: user.id,
          confirmed: true,
          usageCount: 1,
        },
      })

      results.push(result)
    }

    return NextResponse.json({ data: { confirmed: results.length } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((i) => i.message).join("; ") }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
