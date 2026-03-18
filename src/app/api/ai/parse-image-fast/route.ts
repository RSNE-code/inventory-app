import { NextRequest } from "next/server"
import { parseBomImageStream, toBomCatalogMatch, loadProductMap, resolveProductId } from "@/lib/ai/parse"
import type { BomStreamItem } from "@/lib/ai/parse"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const maxDuration = 60

/**
 * POST /api/ai/parse-image-fast
 * Streaming BOM image parser — sends items as newline-delimited JSON (NDJSON)
 * as Claude extracts them from the image. Much lighter than the receiving
 * parser (no supplier/PO context).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const formData = await request.formData()

    const files: File[] = []
    const singleFile = formData.get("image") as File | null
    if (singleFile) files.push(singleFile)
    const multiFiles = formData.getAll("images") as File[]
    files.push(...multiFiles)

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "At least one image file is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Images must be JPEG, PNG, WebP, or GIF" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }
      if (file.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "Each image must be under 10MB" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
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

    // Load product map + match history in parallel with starting the stream
    const [productMap, matchHistory] = await Promise.all([
      loadProductMap(),
      prisma.matchHistory.findMany({
        where: { userId: user.id, confirmed: true },
        orderBy: { usageCount: "desc" },
        take: 200,
        select: { normalizedText: true, productId: true, usageCount: true },
      }),
    ])

    const historyMap = new Map(
      matchHistory.map((m) => [m.normalizedText, { productId: m.productId, usageCount: m.usageCount }])
    )

    // Start streaming parse
    const { stream: streamResult, indexToId } = await parseBomImageStream(
      base64Images.length === 1 ? base64Images[0] : base64Images,
      mimeTypes.length === 1 ? mimeTypes[0] : mimeTypes
    )

    // Create a ReadableStream that emits NDJSON — one CatalogMatch per line
    const encoder = new TextEncoder()
    let itemIndex = 0

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const rawItem of streamResult.elementStream) {
            const item = rawItem as BomStreamItem
            // Resolve short numeric IDs → real UUIDs before product lookup
            // Diagnostic: log what the AI returned vs what we resolve
            const resolvedId = resolveProductId(item.matchedProductId, indexToId)
            console.log(`[parse-image-fast] Item: "${item.rawText}" | AI returned ID: ${item.matchedProductId} | Resolved: ${resolvedId} | Confidence: ${item.matchConfidence}`)

            const resolvedItem: BomStreamItem = {
              ...item,
              matchedProductId: resolvedId,
              alternativeProductIds: item.alternativeProductIds
                .map((id) => resolveProductId(id, indexToId))
                .filter((id): id is string => id !== null),
            }
            const catalogMatch = toBomCatalogMatch(resolvedItem, productMap)
            console.log(`[parse-image-fast] → Match result: ${catalogMatch.matchedProduct?.name ?? "NO MATCH"} | isNonCatalog: ${catalogMatch.isNonCatalog} | finalConfidence: ${catalogMatch.matchConfidence}`)

            // Apply match history boosting
            const normalized = item.rawText.toLowerCase().trim().replace(/\s+/g, " ")
            const histMatch = historyMap.get(normalized)

            let boostedMatch = catalogMatch
            if (histMatch && catalogMatch.matchedProduct?.id === histMatch.productId) {
              boostedMatch = {
                ...catalogMatch,
                matchConfidence: Math.max(
                  catalogMatch.matchConfidence,
                  0.95 + Math.min(histMatch.usageCount * 0.005, 0.049)
                ),
              }
            }

            // Emit as NDJSON line
            const line = JSON.stringify({ index: itemIndex++, item: boostedMatch }) + "\n"
            controller.enqueue(encoder.encode(line))
          }
          controller.close()
        } catch (err) {
          console.error("[parse-image-fast] Stream error:", err)
          // Surface the actual error — common causes: image too blurry, API rate limit, unsupported format
          let message = "Failed to read image"
          if (err instanceof Error) {
            if (err.message.includes("Could not process")) {
              message = "Image couldn't be processed — try a clearer photo"
            } else if (err.message.includes("rate") || err.message.includes("429")) {
              message = "Too many requests — wait a moment and try again"
            } else if (err.message.includes("too large") || err.message.includes("size")) {
              message = "Image too large — try a smaller photo"
            } else {
              message = err.message
            }
          }
          const errorLine = JSON.stringify({ error: message }) + "\n"
          controller.enqueue(encoder.encode(errorLine))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("[parse-image-fast] Error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") {
      return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
