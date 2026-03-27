import { NextRequest } from "next/server"
import { parseBomImageStream, toBomCatalogMatch, loadProductMap, resolveProductId } from "@/lib/ai/parse"
import type { BomStreamItem } from "@/lib/ai/parse"

/**
 * Extract dimension numbers from text (e.g., "10x10" → [10, 10], "2\" x 3\"" → [2, 3])
 * Returns sorted array of unique dimension numbers found.
 */
function extractDimensions(text: string): number[] {
  const dims: number[] = []
  // Match patterns like 10x10, 2"x3", 2 x 3, 3.5"x3.5"
  const patterns = [
    /(\d+(?:\.\d+)?)\s*["″]?\s*[xX×]\s*(\d+(?:\.\d+)?)/g,
    /(\d+(?:\.\d+)?)\s*["″]\s*[xX×]\s*(\d+(?:\.\d+)?)/g,
  ]
  for (const pat of patterns) {
    let m
    while ((m = pat.exec(text)) !== null) {
      dims.push(parseFloat(m[1]), parseFloat(m[2]))
    }
  }
  // Also match standalone dimension like 6" (single dimension in product names)
  const single = text.match(/(\d+(?:\.\d+)?)\s*["″]/g)
  if (single) {
    for (const s of single) {
      const n = parseFloat(s)
      if (n > 0 && n <= 48) dims.push(n) // reasonable dimension range
    }
  }
  return [...new Set(dims)].sort((a, b) => a - b)
}

/**
 * Check if parsed item dimensions conflict with matched product dimensions.
 * Returns true if there's a clear conflict (should reject the match).
 */
function hasDimensionConflict(parsedText: string, productName: string): boolean {
  const parsedDims = extractDimensions(parsedText)
  const productDims = extractDimensions(productName)
  if (parsedDims.length === 0 || productDims.length === 0) return false // Can't verify
  // If parsed text has dimensions that are completely different from product
  // Check if any parsed dimension matches any product dimension
  const hasOverlap = parsedDims.some((pd) =>
    productDims.some((prd) => Math.abs(pd - prd) < 0.5)
  )
  // If parsed text has 2+ dimensions and NONE overlap with product → conflict
  if (parsedDims.length >= 2 && !hasOverlap) return true
  return false
}
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
        select: { normalizedText: true, productId: true, customName: true, usageCount: true },
      }),
    ])

    const historyMap = new Map(
      matchHistory.map((m) => [m.normalizedText, { productId: m.productId, customName: m.customName, usageCount: m.usageCount }])
    )

    // Start streaming parse
    const { stream: streamResult, indexToId } = await parseBomImageStream(
      base64Images.length === 1 ? base64Images[0] : base64Images,
      mimeTypes.length === 1 ? mimeTypes[0] : mimeTypes
    )

    // Create a ReadableStream that emits NDJSON — one CatalogMatch per line
    const encoder = new TextEncoder()
    let itemIndex = 0
    const diagnostics: string[] = []

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const rawItem of streamResult.elementStream) {
            const item = rawItem as BomStreamItem
            // Resolve short numeric IDs → real UUIDs before product lookup
            const resolvedId = resolveProductId(item.matchedProductId, indexToId)
            const resolvedAlts = item.alternativeProductIds
                .map((id) => resolveProductId(id, indexToId))
                .filter((id): id is string => id !== null)

            const resolvedItem: BomStreamItem = {
              ...item,
              matchedProductId: resolvedId,
              alternativeProductIds: resolvedAlts,
            }
            let catalogMatch = toBomCatalogMatch(resolvedItem, productMap)

            // Post-AI dimension verification — reject matches where dimensions conflict
            // Skip for assembly products — their dimensions are in the name, not product fields
            if (catalogMatch.matchedProduct && !catalogMatch.panelSpecs && !catalogMatch.matchedProduct.isAssembly) {
              const parsedText = `${item.rawText} ${item.name}`
              const productName = catalogMatch.matchedProduct.name
              if (hasDimensionConflict(parsedText, productName)) {
                catalogMatch = {
                  ...catalogMatch,
                  matchedProduct: null,
                  matchConfidence: 0,
                  isNonCatalog: true,
                }
              }
            }

            // Collect diagnostic per item
            diagnostics.push(`${item.rawText}|aiId=${item.matchedProductId}|conf=${item.matchConfidence}|matched=${catalogMatch.matchedProduct?.name ?? "NONE"}|panel=${!!catalogMatch.panelSpecs}`)

            // Apply match history boosting (catalog + custom items)
            const normalized = item.rawText.toLowerCase().trim().replace(/\s+/g, " ").replace(/['"]/g, "")
            const histMatch = historyMap.get(normalized)

            let boostedMatch = catalogMatch
            if (histMatch) {
              if (histMatch.productId && catalogMatch.matchedProduct?.id === histMatch.productId) {
                // Catalog match confirmed by history — boost to 0.90 (below auto-confirm)
                // History informs but doesn't override — user still reviews
                boostedMatch = {
                  ...catalogMatch,
                  matchConfidence: Math.max(catalogMatch.matchConfidence, 0.90),
                }
              } else if (histMatch.customName && !histMatch.productId) {
                // Custom item from history — override to non-catalog with remembered name
                boostedMatch = {
                  ...catalogMatch,
                  parsedItem: {
                    ...catalogMatch.parsedItem,
                    name: histMatch.customName,
                  },
                  matchedProduct: null,
                  matchConfidence: 0.90,
                  isNonCatalog: true,
                }
              }
            }

            // Emit as NDJSON line
            const line = JSON.stringify({ index: itemIndex++, item: boostedMatch }) + "\n"
            controller.enqueue(encoder.encode(line))
          }
          // Log ALL items as single batch so Vercel doesn't truncate
          console.log(`[parse-image-fast] RESULTS (${diagnostics.length} items):\n` + diagnostics.join("\n"))
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
