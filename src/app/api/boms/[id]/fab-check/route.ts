import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export interface FabCheckDoorItem {
  lineItemId: string
  productName: string
  assemblyType: string // DOOR, FLOOR_PANEL, WALL_PANEL, RAMP
  status: "linked" | "matched" | "unresolved"
  assembly?: {
    id: string
    status: string
    approvalStatus: string
    specs: Record<string, unknown> | null
  }
}

const FAB_TYPES = ["DOOR", "FLOOR_PANEL", "WALL_PANEL", "RAMP"] as const
const FAB_CATEGORY_KEYWORDS = ["door", "floor", "wall", "panel", "ramp"] as const

export interface FabCheckResponse {
  doorItems: FabCheckDoorItem[]
  allResolved: boolean
}

/**
 * Shared logic: find door line items on a BOM and check resolution status.
 * Used by both the /fab-check GET endpoint and the approval validation.
 */
export async function checkBomDoors(bomId: string): Promise<FabCheckResponse> {
  const bom = await prisma.bom.findUnique({
    where: { id: bomId },
    select: {
      jobName: true,
      lineItems: {
        where: { isActive: true },
        select: {
          id: true,
          productId: true,
          assemblyId: true,
          isNonCatalog: true,
          nonCatalogName: true,
          nonCatalogCategory: true,
          product: {
            select: {
              id: true,
              name: true,
              isAssembly: true,
              assemblyTemplate: {
                select: { id: true, type: true },
              },
            },
          },
          assembly: {
            select: {
              id: true,
              status: true,
              approvalStatus: true,
              specs: true,
            },
          },
        },
      },
    },
  })

  if (!bom) throw new Error("BOM not found")

  // Identify fab line items (doors, floor panels, wall panels, ramps)
  const fabLineItems = bom.lineItems.filter((li) => {
    // Catalog: product is an assembly with a fab-type template
    if (li.product?.isAssembly && li.product.assemblyTemplate?.type &&
        FAB_TYPES.includes(li.product.assemblyTemplate.type as typeof FAB_TYPES[number])) {
      return true
    }
    // Non-catalog: category contains a fab keyword
    if (li.isNonCatalog && li.nonCatalogCategory) {
      const cat = li.nonCatalogCategory.toLowerCase()
      return FAB_CATEGORY_KEYWORDS.some((kw) => cat.includes(kw))
    }
    return false
  })

  if (fabLineItems.length === 0) {
    return { doorItems: [], allResolved: true }
  }

  // For unlinked items, search the fab queues by jobName
  const unlinkedItems = fabLineItems.filter((li) => !li.assemblyId)

  let queueItems: Array<{
    id: string
    type: string
    status: string
    approvalStatus: string
    specs: unknown
    templateId: string | null
  }> = []

  if (unlinkedItems.length > 0 && bom.jobName) {
    queueItems = await prisma.assembly.findMany({
      where: {
        type: { in: [...FAB_TYPES] },
        jobName: { equals: bom.jobName, mode: "insensitive" },
      },
      select: {
        id: true,
        type: true,
        status: true,
        approvalStatus: true,
        specs: true,
        templateId: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  const doorItems: FabCheckDoorItem[] = fabLineItems.map((li) => {
    const productName = li.product?.name || li.nonCatalogName || "Unknown Item"
    // Determine assembly type from template or category
    const assemblyType = li.product?.assemblyTemplate?.type
      || inferTypeFromCategory(li.nonCatalogCategory)
      || "DOOR"

    // Already linked
    if (li.assemblyId && li.assembly) {
      return {
        lineItemId: li.id,
        productName,
        assemblyType,
        status: "linked" as const,
        assembly: {
          id: li.assembly.id,
          status: li.assembly.status,
          approvalStatus: li.assembly.approvalStatus,
          specs: li.assembly.specs as Record<string, unknown> | null,
        },
      }
    }

    // Try to match from queue — different strategies per type
    const matched = queueItems.find((qi) => {
      // Must be same assembly type
      if (qi.type !== assemblyType) return false

      // Match by template if both have one
      if (li.product?.assemblyTemplate?.id && qi.templateId) {
        return li.product.assemblyTemplate.id === qi.templateId
      }

      // For doors: use detailed type matching (cooler/freezer + swing/slide)
      if (assemblyType === "DOOR") {
        const qdSpecs = qi.specs as Record<string, unknown> | null
        const bomType = extractDoorType(productName)
        const queueType = qdSpecs ? extractDoorTypeFromSpecs(qdSpecs) : null
        if (bomType && queueType && bomType === queueType) return true
        if (qdSpecs) {
          const qdName = getDoorLabel(qdSpecs)
          if (qdName) {
            const qdType = extractDoorType(qdName)
            if (bomType && qdType && bomType === qdType) return true
            if (productName.toLowerCase().includes(qdName.toLowerCase())) return true
            if (qdName.toLowerCase().includes(productName.toLowerCase())) return true
          }
        }
        return false
      }

      // For panels/ramps: match by same type + same job is sufficient
      // (there's typically one floor panel, one wall panel per job)
      return true
    })

    if (matched) {
      return {
        lineItemId: li.id,
        productName,
        assemblyType,
        status: "matched" as const,
        assembly: {
          id: matched.id,
          status: matched.status,
          approvalStatus: matched.approvalStatus,
          specs: matched.specs as Record<string, unknown> | null,
        },
      }
    }

    return {
      lineItemId: li.id,
      productName,
      assemblyType,
      status: "unresolved" as const,
    }
  })

  return {
    doorItems,
    allResolved: doorItems.every((d) => d.status !== "unresolved"),
  }
}

/** Infer assembly type from a non-catalog category string */
function inferTypeFromCategory(category: string | null | undefined): string | null {
  if (!category) return null
  const c = category.toLowerCase()
  if (c.includes("floor")) return "FLOOR_PANEL"
  if (c.includes("wall")) return "WALL_PANEL"
  if (c.includes("ramp")) return "RAMP"
  if (c.includes("door")) return "DOOR"
  if (c.includes("panel")) return "FLOOR_PANEL" // generic "panel" defaults to floor
  return null
}

/** Extract normalized door type from a product name (e.g., "Cooler Slider 5' x 7'" → "cooler_slider") */
function extractDoorType(name: string): string | null {
  const n = name.toLowerCase()
  const isSlider = /slider|sliding/i.test(n)
  const isFreezer = /freezer/i.test(n)
  const isCooler = /cooler/i.test(n)
  const isDoor = /door|swing/i.test(n)

  if (isSlider && isFreezer) return "freezer_slider"
  if (isSlider && isCooler) return "cooler_slider"
  if (isSlider) return "cooler_slider" // default slider = cooler
  if (isDoor && isFreezer) return "freezer_swing"
  if (isDoor && isCooler) return "cooler_swing"
  if (isFreezer) return "freezer_swing"
  if (isCooler) return "cooler_swing"
  return null
}

/** Extract normalized door type from assembly specs */
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

/** Extract a human-readable label from door assembly specs */
function getDoorLabel(specs: Record<string, unknown>): string | null {
  const category = specs.doorCategory as string | undefined
  const width = specs.widthInClear as string | undefined
  const height = specs.heightInClear as string | undefined

  if (!category) return null

  const typeMap: Record<string, string> = {
    HINGED_COOLER: "Cooler Door",
    HINGED_FREEZER: "Freezer Door",
    SLIDING: "Cooler Slider",
  }
  const typeName = typeMap[category] || category
  if (width && height) {
    return `${typeName} ${width} x ${height}`
  }
  return typeName
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const result = await checkBomDoors(id)
    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message === "BOM not found") return NextResponse.json({ error: message }, { status: 404 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
