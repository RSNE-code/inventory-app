import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

/**
 * Pre-creation fab check: accepts line items (not yet saved) and checks:
 * 1. Are there fab items (doors, panels, ramps) without matching queue entries? (unresolved)
 * 2. Are there queue entries for this job not represented in the BOM? (unmatchedQueueItems)
 */

const FAB_TYPES = ["DOOR", "FLOOR_PANEL", "WALL_PANEL", "RAMP"] as const
const FAB_CATEGORY_KEYWORDS = ["door", "floor", "wall", "panel", "ramp"]

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
  assemblyType: string
  status: "matched" | "unresolved"
  assemblyId?: string
}

export interface UnmatchedQueueItem {
  assemblyId: string
  type: string
  typeName: string
  status: string
  jobName: string
}

const TYPE_LABELS: Record<string, string> = {
  DOOR: "Door",
  FLOOR_PANEL: "Floor Panel",
  WALL_PANEL: "Wall Panel",
  RAMP: "Ramp",
}

function inferTypeFromCategory(category: string | null | undefined): string | null {
  if (!category) return null
  const c = category.toLowerCase()
  if (c.includes("floor")) return "FLOOR_PANEL"
  if (c.includes("wall")) return "WALL_PANEL"
  if (c.includes("ramp")) return "RAMP"
  if (c.includes("door")) return "DOOR"
  if (c.includes("panel")) return "FLOOR_PANEL"
  return null
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

    // Identify fab items from the submitted line items
    const fabItems: Array<{ name: string; templateId: string | null; assemblyType: string }> = []

    for (const item of items) {
      if (item.productId && !item.isNonCatalog) {
        const product = productMap.get(item.productId)
        if (product?.isAssembly && product.assemblyTemplate?.type &&
            FAB_TYPES.includes(product.assemblyTemplate.type as typeof FAB_TYPES[number])) {
          fabItems.push({
            name: product.name,
            templateId: product.assemblyTemplate.id,
            assemblyType: product.assemblyTemplate.type,
          })
        }
      } else if (item.isNonCatalog && item.nonCatalogCategory) {
        const cat = item.nonCatalogCategory.toLowerCase()
        if (FAB_CATEGORY_KEYWORDS.some((kw) => cat.includes(kw))) {
          fabItems.push({
            name: item.nonCatalogName || "Fab Item",
            templateId: null,
            assemblyType: inferTypeFromCategory(item.nonCatalogCategory) || "DOOR",
          })
        }
      }
    }

    // Search all fab queues for this job
    const queueEntries = await prisma.assembly.findMany({
      where: {
        type: { in: [...FAB_TYPES] },
        jobName: { equals: jobName, mode: "insensitive" },
      },
      select: {
        id: true,
        type: true,
        status: true,
        templateId: true,
        specs: true,
        jobName: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Track which queue entries get matched
    const matchedQueueIds = new Set<string>()

    // Check each fab item against the queue
    const results: PreFabCheckItem[] = fabItems.map((fab) => {
      const match = queueEntries.find((qe) => {
        if (matchedQueueIds.has(qe.id)) return false // already claimed
        if (qe.type !== fab.assemblyType) return false

        // Match by template ID
        if (fab.templateId && qe.templateId && fab.templateId === qe.templateId) return true

        // For doors: detailed type matching
        if (fab.assemblyType === "DOOR") {
          const qdSpecs = qe.specs as Record<string, unknown> | null
          const bomType = extractDoorType(fab.name)
          const queueType = qdSpecs ? extractDoorTypeFromSpecs(qdSpecs) : null
          return bomType !== null && queueType !== null && bomType === queueType
        }

        // For panels/ramps: same type + same job is sufficient
        return true
      })

      if (match) {
        matchedQueueIds.add(match.id)
        return {
          productName: fab.name,
          assemblyType: fab.assemblyType,
          status: "matched" as const,
          assemblyId: match.id,
        }
      }

      return {
        productName: fab.name,
        assemblyType: fab.assemblyType,
        status: "unresolved" as const,
      }
    })

    // Item 8: Find queue entries NOT matched to any BOM line item
    const unmatchedQueueItems: UnmatchedQueueItem[] = queueEntries
      .filter((qe) => !matchedQueueIds.has(qe.id))
      .map((qe) => ({
        assemblyId: qe.id,
        type: qe.type,
        typeName: TYPE_LABELS[qe.type] || qe.type,
        status: qe.status,
        jobName: qe.jobName || jobName,
      }))

    return NextResponse.json({
      data: {
        doorItems: results,
        allResolved: fabItems.length === 0 || results.every((r) => r.status !== "unresolved"),
        unmatchedQueueItems,
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
