import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"

interface ReorderItem {
  id: string
  name: string
  sku: string | null
  currentQty: number
  reorderPoint: number
  suggestedQty: number
  lastCost: number
  estimatedCost: number
  unitOfMeasure: string
  categoryName: string
  isOutOfStock: boolean
}

interface SupplierGroup {
  supplierId: string | null
  supplierName: string
  items: ReorderItem[]
  totalItems: number
  totalEstimatedCost: number
}

export async function GET() {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "OFFICE_MANAGER"])

    // Query 1: Load all active TIER_1 products
    const products = await prisma.product.findMany({
      where: { isActive: true, tier: "TIER_1" },
      select: {
        id: true,
        name: true,
        sku: true,
        currentQty: true,
        reorderPoint: true,
        lastCost: true,
        unitOfMeasure: true,
        category: { select: { name: true } },
      },
    })

    // Filter: currentQty <= reorderPoint (including out of stock)
    const lowStock = products.filter((p) => {
      const qty = Number(p.currentQty)
      const reorder = Number(p.reorderPoint)
      return reorder > 0 && qty <= reorder
    })

    if (lowStock.length === 0) {
      return NextResponse.json({
        data: {
          groups: [],
          summary: { totalItems: 0, totalEstimatedCost: 0, supplierCount: 0 },
        },
      })
    }

    // Query 2: Get most recent supplier per product from RECEIVE transactions
    const productIds = lowStock.map((p) => p.id)
    const recentReceives = await prisma.transaction.findMany({
      where: {
        productId: { in: productIds },
        type: "RECEIVE",
        receiptId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["productId"],
      select: {
        productId: true,
        receipt: {
          select: {
            supplier: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // Build product → supplier map
    const productSupplierMap = new Map<string, { id: string; name: string }>()
    for (const tx of recentReceives) {
      if (tx.receipt?.supplier) {
        productSupplierMap.set(tx.productId, tx.receipt.supplier)
      }
    }

    // Group products by supplier
    const groupMap = new Map<string, SupplierGroup>()
    const UNKNOWN_KEY = "__unknown__"

    for (const product of lowStock) {
      const supplier = productSupplierMap.get(product.id)
      const key = supplier?.id || UNKNOWN_KEY
      const qty = Number(product.currentQty)
      const reorder = Number(product.reorderPoint)
      const lastCost = Number(product.lastCost)
      const suggestedQty = Math.max(0, reorder - qty)
      const estimatedCost = suggestedQty * lastCost

      const item: ReorderItem = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentQty: qty,
        reorderPoint: reorder,
        suggestedQty,
        lastCost,
        estimatedCost,
        unitOfMeasure: product.unitOfMeasure,
        categoryName: product.category.name,
        isOutOfStock: qty <= 0,
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          supplierId: supplier?.id || null,
          supplierName: supplier?.name || "Unknown Supplier",
          items: [],
          totalItems: 0,
          totalEstimatedCost: 0,
        })
      }

      const group = groupMap.get(key)!
      group.items.push(item)
      group.totalItems++
      group.totalEstimatedCost += estimatedCost
    }

    // Sort items within groups: out-of-stock first, then by name
    for (const group of groupMap.values()) {
      group.items.sort((a, b) => {
        if (a.isOutOfStock && !b.isOutOfStock) return -1
        if (!a.isOutOfStock && b.isOutOfStock) return 1
        return a.name.localeCompare(b.name)
      })
    }

    // Sort groups: most items first, Unknown last
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.supplierId === null) return 1
      if (b.supplierId === null) return -1
      return b.totalItems - a.totalItems
    })

    const totalEstimatedCost = groups.reduce((sum, g) => sum + g.totalEstimatedCost, 0)

    return NextResponse.json({
      data: {
        groups,
        summary: {
          totalItems: lowStock.length,
          totalEstimatedCost,
          supplierCount: groups.length,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("permission")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
