import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export interface FabCheckDoorItem {
  lineItemId: string
  productName: string
  status: "linked" | "matched" | "unresolved"
  assembly?: {
    id: string
    status: string
    approvalStatus: string
    specs: Record<string, unknown> | null
  }
}

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

  // Identify door line items
  const doorLineItems = bom.lineItems.filter((li) => {
    // Catalog door: product is an assembly with DOOR template
    if (li.product?.isAssembly && li.product.assemblyTemplate?.type === "DOOR") {
      return true
    }
    // Non-catalog door: category contains "Door"
    if (li.isNonCatalog && li.nonCatalogCategory?.toLowerCase().includes("door")) {
      return true
    }
    return false
  })

  if (doorLineItems.length === 0) {
    return { doorItems: [], allResolved: true }
  }

  // For unlinked items, search the Door Shop Queue by jobName
  const unlinkedItems = doorLineItems.filter((li) => !li.assemblyId)

  let queueDoors: Array<{
    id: string
    status: string
    approvalStatus: string
    specs: unknown
    templateId: string | null
  }> = []

  if (unlinkedItems.length > 0 && bom.jobName) {
    queueDoors = await prisma.assembly.findMany({
      where: {
        type: "DOOR",
        jobName: { equals: bom.jobName, mode: "insensitive" },
        status: { not: "COMPLETED" },
      },
      select: {
        id: true,
        status: true,
        approvalStatus: true,
        specs: true,
        templateId: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  const doorItems: FabCheckDoorItem[] = doorLineItems.map((li) => {
    const productName = li.product?.name || li.nonCatalogName || "Unknown Door"

    // Already linked
    if (li.assemblyId && li.assembly) {
      return {
        lineItemId: li.id,
        productName,
        status: "linked" as const,
        assembly: {
          id: li.assembly.id,
          status: li.assembly.status,
          approvalStatus: li.assembly.approvalStatus,
          specs: li.assembly.specs as Record<string, unknown> | null,
        },
      }
    }

    // Try to match from queue by template, door type, or name similarity
    const matched = queueDoors.find((qd) => {
      // Match by template if both have one
      if (li.product?.assemblyTemplate?.id && qd.templateId) {
        return li.product.assemblyTemplate.id === qd.templateId
      }

      const qdSpecs = qd.specs as Record<string, unknown> | null

      // Match by door type (cooler/freezer + swing/slide) — most reliable
      // Product name like "Cooler Slider 5' x 7'" → type = slider, temp = cooler
      const bomType = extractDoorType(productName)
      const queueType = qdSpecs ? extractDoorTypeFromSpecs(qdSpecs) : null
      if (bomType && queueType && bomType === queueType) {
        return true
      }

      // Fallback: name similarity
      if (qdSpecs) {
        const qdName = getDoorLabel(qdSpecs)
        if (qdName) {
          // Compare type portion only (strip dimensions for fuzzy match)
          const qdType = extractDoorType(qdName)
          if (bomType && qdType && bomType === qdType) return true
          // Full string contains check
          if (productName.toLowerCase().includes(qdName.toLowerCase())) return true
          if (qdName.toLowerCase().includes(productName.toLowerCase())) return true
        }
      }
      return false
    })

    if (matched) {
      return {
        lineItemId: li.id,
        productName,
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
      status: "unresolved" as const,
    }
  })

  return {
    doorItems,
    allResolved: doorItems.every((d) => d.status !== "unresolved"),
  }
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
