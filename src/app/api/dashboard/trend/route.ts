import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const categoryId = request.nextUrl.searchParams.get("categoryId") || ""
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get all active TIER_1 products (optionally filtered by category)
    const productWhere: Record<string, unknown> = {
      isActive: true,
      tier: "TIER_1",
    }
    if (categoryId) {
      productWhere.categoryId = categoryId
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      select: { id: true, currentQty: true, avgCost: true },
    })

    const productIds = products.map((p) => p.id)

    // Current total value
    const currentTotalValue = products.reduce(
      (sum, p) => sum + Number(p.currentQty) * Number(p.avgCost),
      0
    )

    // Get all transactions for these products in the last 30 days
    const transactions = await prisma.transaction.findMany({
      where: {
        productId: { in: productIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        productId: true,
        type: true,
        quantity: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Build per-product current qty map
    const currentQtyMap = new Map<string, number>()
    for (const p of products) {
      currentQtyMap.set(p.id, Number(p.currentQty))
    }

    // Build avg cost map (use current avgCost as approximation for historical value)
    const avgCostMap = new Map<string, number>()
    for (const p of products) {
      avgCostMap.set(p.id, Number(p.avgCost))
    }

    const increaseTypes = ["RECEIVE", "RETURN_FULL", "RETURN_PARTIAL", "PRODUCE", "ADJUST_UP"]

    // Group transactions by day (days ago from today, 0 = today)
    // We'll reconstruct daily totals by walking backward from current quantities
    const dayBuckets = new Map<string, Array<{ productId: string; type: string; quantity: number }>>()

    for (const t of transactions) {
      const dateKey = t.createdAt.toISOString().slice(0, 10)
      if (!dayBuckets.has(dateKey)) {
        dayBuckets.set(dateKey, [])
      }
      dayBuckets.get(dateKey)!.push({
        productId: t.productId,
        type: t.type,
        quantity: Number(t.quantity),
      })
    }

    // Generate date strings for the last 30 days
    const dates: string[] = []
    for (let d = 0; d <= 30; d++) {
      const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
      dates.push(date.toISOString().slice(0, 10))
    }
    dates.reverse() // oldest first

    // Walk backwards from today to reconstruct daily end-of-day values
    // Start with current quantities, then reverse transactions day by day
    const runningQty = new Map<string, number>()
    for (const [id, qty] of currentQtyMap) {
      runningQty.set(id, qty)
    }

    // Build historical data points (most recent day first, then go backward)
    const dailyValues: Array<{ date: string; value: number }> = []

    // Today's value
    const todayDate = dates[dates.length - 1]
    dailyValues.push({ date: todayDate, value: currentTotalValue })

    // Walk backward through each day
    for (let i = dates.length - 1; i >= 0; i--) {
      const dateKey = dates[i]
      const dayTxs = dayBuckets.get(dateKey) || []

      // Reverse each transaction to get the quantity before
      for (const tx of dayTxs) {
        const current = runningQty.get(tx.productId) ?? 0
        if (increaseTypes.includes(tx.type)) {
          runningQty.set(tx.productId, current - tx.quantity)
        } else {
          runningQty.set(tx.productId, current + tx.quantity)
        }
      }

      if (i < dates.length - 1) {
        // Calculate total value for this day
        let dayValue = 0
        for (const [id, qty] of runningQty) {
          const cost = avgCostMap.get(id) ?? 0
          dayValue += Math.max(0, qty) * cost
        }
        dailyValues.push({ date: dateKey, value: dayValue })
      }
    }

    dailyValues.reverse() // oldest first

    // Compute avg daily value change for projection
    const consumptionTypes = ["CHECKOUT", "CONSUME", "ADDITIONAL_PICKUP", "RETURN_SCRAP", "ADJUST_DOWN", "SHIP"]
    const increaseTypesForRate = ["RECEIVE", "RETURN_FULL", "RETURN_PARTIAL", "PRODUCE", "ADJUST_UP"]

    let totalDecrease = 0
    let totalIncrease = 0
    for (const t of transactions) {
      const qty = Number(t.quantity)
      const cost = avgCostMap.get(t.productId) ?? 0
      if (consumptionTypes.includes(t.type)) {
        totalDecrease += qty * cost
      }
      if (increaseTypesForRate.includes(t.type)) {
        totalIncrease += qty * cost
      }
    }

    const daysInWindow = Math.max(1, 30)
    const avgDailyNet = (totalIncrease - totalDecrease) / daysInWindow

    // Project 30 days forward
    const projectedValues: Array<{ date: string; value: number }> = []
    let projValue = currentTotalValue
    for (let d = 1; d <= 30; d++) {
      projValue = Math.max(0, projValue + avgDailyNet)
      const futureDate = new Date(now.getTime() + d * 24 * 60 * 60 * 1000)
      projectedValues.push({ date: futureDate.toISOString().slice(0, 10), value: projValue })
    }

    // Get categories for filter
    const categories = await prisma.category.findMany({
      where: {
        products: { some: { isActive: true, tier: "TIER_1" } },
      },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({
      data: {
        historical: dailyValues,
        projected: projectedValues,
        currentValue: currentTotalValue,
        categories,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
