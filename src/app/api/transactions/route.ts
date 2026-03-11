import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const productId = searchParams.get("productId")
    const jobName = searchParams.get("jobName")
    const type = searchParams.get("type")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: Prisma.TransactionWhereInput = {}

    const VALID_TRANSACTION_TYPES = [
      "RECEIVE", "CHECKOUT", "ADDITIONAL_PICKUP", "RETURN_FULL",
      "RETURN_PARTIAL", "RETURN_SCRAP", "CONSUME", "PRODUCE",
      "SHIP", "ADJUST_UP", "ADJUST_DOWN",
    ]

    if (productId) where.productId = productId
    if (jobName) where.jobName = { contains: jobName, mode: "insensitive" }
    if (type && VALID_TRANSACTION_TYPES.includes(type)) {
      where.type = type as Prisma.EnumTransactionTypeFilter
    }
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          product: { select: { name: true, unitOfMeasure: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
