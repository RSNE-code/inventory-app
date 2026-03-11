import { prisma } from "./db"
import { calculateWAC } from "./cost"
import { TransactionType, InventoryTier, Prisma } from "@prisma/client"

type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

interface StockOperationInput {
  productId: string
  quantity: number
  type: TransactionType
  userId: string
  unitCost?: number
  notes?: string
  reason?: string
  jobName?: string
  bomId?: string
  bomLineItemId?: string
  receiptId?: string
  assemblyId?: string
  tx?: PrismaTransactionClient
}

const STOCK_INCREASING_TYPES: TransactionType[] = [
  "RECEIVE",
  "RETURN_FULL",
  "RETURN_PARTIAL",
  "PRODUCE",
  "ADJUST_UP",
]

const STOCK_DECREASING_TYPES: TransactionType[] = [
  "CHECKOUT",
  "ADDITIONAL_PICKUP",
  "CONSUME",
  "SHIP",
  "ADJUST_DOWN",
]

const NO_STOCK_IMPACT_TYPES: TransactionType[] = [
  "RETURN_SCRAP",
]

async function adjustStockInner(input: StockOperationInput, tx: PrismaTransactionClient) {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: input.productId },
    })

    const currentQty = Number(product.currentQty)
    const qty = Math.abs(input.quantity)
    let newQty = currentQty

    // Tier 2 items: log transaction for costing but don't change stock
    const isTier2 = product.tier === InventoryTier.TIER_2
    const skipStockUpdate = isTier2 && input.type !== "RECEIVE"

    if (!skipStockUpdate) {
      if (STOCK_INCREASING_TYPES.includes(input.type)) {
        newQty = currentQty + qty
      } else if (STOCK_DECREASING_TYPES.includes(input.type)) {
        newQty = currentQty - qty
      }
      // RETURN_SCRAP: no stock change, cost stays on job
    }

    // WAC recalculation on RECEIVE
    let newAvgCost = Number(product.avgCost)
    if (input.type === "RECEIVE" && input.unitCost !== undefined) {
      newAvgCost = calculateWAC(
        product.currentQty,
        product.avgCost,
        qty,
        input.unitCost
      )
    }

    const transaction = await tx.transaction.create({
      data: {
        type: input.type,
        productId: input.productId,
        quantity: new Prisma.Decimal(qty),
        unitCost: input.unitCost !== undefined ? new Prisma.Decimal(input.unitCost) : null,
        totalCost: input.unitCost !== undefined ? new Prisma.Decimal(qty * input.unitCost) : null,
        previousQty: product.currentQty,
        newQty: new Prisma.Decimal(newQty),
        previousAvgCost: product.avgCost,
        newAvgCost: new Prisma.Decimal(newAvgCost),
        userId: input.userId,
        notes: input.notes,
        reason: input.reason,
        jobName: input.jobName,
        bomId: input.bomId,
        bomLineItemId: input.bomLineItemId,
        receiptId: input.receiptId,
        assemblyId: input.assemblyId,
      },
    })

    // Update product stock and cost
    if (!skipStockUpdate || input.type === "RECEIVE") {
      const updateData: Record<string, unknown> = {}

      if (!skipStockUpdate) {
        updateData.currentQty = new Prisma.Decimal(newQty)
      }

      if (input.type === "RECEIVE" && input.unitCost !== undefined) {
        updateData.avgCost = new Prisma.Decimal(newAvgCost)
        updateData.lastCost = new Prisma.Decimal(input.unitCost)
      }

      if (Object.keys(updateData).length > 0) {
        await tx.product.update({
          where: { id: input.productId },
          data: updateData,
        })
      }
    }

    return transaction
}

export async function adjustStock(input: StockOperationInput) {
  if (input.tx) {
    return adjustStockInner(input, input.tx)
  }
  return prisma.$transaction(async (tx) => {
    return adjustStockInner(input, tx)
  })
}
