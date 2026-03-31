import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

/**
 * Pre-creation fab check: accepts an array of line items (not yet saved)
 * and checks if any door items lack a matching door in the queue.
 * Used by BOM creation flows to warn before saving.
 */

const lineItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  isNonCatalog: z.boolean().optional().default(false),
  nonCatalogName: z.string().optional().nullable(),
  nonCatalogCategory: z.string().optional().nullable(),
})

const requestSchema = z.object({
  jobName: z.string().min(1),
  items: z.array(lineItemSchema).min(1),
})

export interface PreFabCheckItem {
  productName: string
  status: "matched" | "unresolved"
  assemblyId?: string
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { jobName, items } = requestSchema.parse(body)

    // Load product details for catalog items
    const catalogIds = items
      .filter((i) => i.productId && !i.isNonCatalog)
      .map((i) => i.productId!)

    const products = catalogIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: catalogIds } },
          select: {
            id: true,
            name: true,
            isAssembly: true,
            assemblyTemplate: { select: { id: true, type: true } },
          },
        })
      : []

    const productMap = new Map(products.map((p) => [p.id, p]))

    // Identify door items from the submitted line items
    const doorItems: Array<{ name: string; templateId: string | null }> = []

    for (const item of items) {
      if (item.productId && !item.isNonCatalog) {
        const product = productMap.get(item.productId)
        if (product?.isAssembly && product.assemblyTemplate?.type === "DOOR") {
          doorItems.push({ name: product.name, templateId: product.assemblyTemplate.id })
        }
      } else if (item.isNonCatalog && item.nonCatalogCategory?.toLowerCase().includes("door")) {
        doorItems.push({ name: item.nonCatalogName || "Door", templateId: null })
      }
    }

    if (doorItems.length === 0) {
      return NextResponse.json({ data: { doorItems: [], allResolved: true } })
    }

    // Search Door Shop Queue for matching doors by jobName
    const queueDoors = await prisma.assembly.findMany({
      where: {
        type: "DOOR",
        jobName: { equals: jobName, mode: "insensitive" },
      },
      select: {
        id: true,
        status: true,
        templateId: true,
        specs: true,
      },
      orderBy: { createdAt: "desc" },
    })

    const results: PreFabCheckItem[] = doorItems.map((door) => {
      // Try to match by template ID
      if (door.templateId) {
        const match = queueDoors.find((qd) => qd.templateId === door.templateId)
        if (match) {
          return { productName: door.name, status: "matched" as const, assemblyId: match.id }
        }
      }

      // Try to match by name/type similarity
      const doorType = extractDoorType(door.name)
      const match = queueDoors.find((qd) => {
        const qdSpecs = qd.specs as Record<string, unknown> | null
        if (!qdSpecs) return false
        const qdType = extractDoorTypeFromSpecs(qdSpecs)
        return doorType && qdType && doorType === qdType
      })

      if (match) {
        return { productName: door.name, status: "matched" as const, assemblyId: match.id }
      }

      return { productName: door.name, status: "unresolved" as const }
    })

    return NextResponse.json({
      data: {
        doorItems: results,
        allResolved: results.every((r) => r.status !== "unresolved"),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function extractDoorType(name: string): string | null {
  const n = name.toLowerCase()
  const isSlider = /slider|sliding/i.test(n)
  const isFreezer = /freezer/i.test(n)
  const isCooler = /cooler/i.test(n)
  const isDoor = /door|swing/i.test(n)

  if (isSlider && isFreezer) return "freezer_slider"
  if (isSlider && isCooler) return "cooler_slider"
  if (isSlider) return "cooler_slider"
  if (isDoor && isFreezer) return "freezer_swing"
  if (isDoor && isCooler) return "cooler_swing"
  if (isFreezer) return "freezer_swing"
  if (isCooler) return "cooler_swing"
  return null
}

function extractDoorTypeFromSpecs(specs: Record<string, unknown>): string | null {
  const category = specs.doorCategory as string | undefined
  if (!category) return null
  const map: Record<string, string> = {
    HINGED_COOLER: "cooler_swing",
    HINGED_FREEZER: "freezer_swing",
    SLIDING: "cooler_slider",
  }
  return map[category] || null
}
