import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { z } from "zod"

const reviewSchema = z.object({
  action: z.enum(["confirm", "fix", "approve"]),
  lineItemId: z.string().uuid().optional(),
  newProductId: z.string().uuid().optional(), // For "fix" action
})

/**
 * PUT /api/boms/[id]/review
 * Review actions: confirm a line item match, fix a wrong match, or approve the whole BOM.
 * Each confirm/fix action feeds the learning loop (MatchHistory).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER"])
    const { id } = await params

    const body = await request.json()
    const data = reviewSchema.parse(body)

    const bom = await prisma.bom.findUnique({
      where: { id },
      include: {
        lineItems: {
          where: { isActive: true },
          include: { product: { select: { id: true, name: true } } },
        },
      },
    })

    if (!bom) {
      return NextResponse.json({ error: "BOM not found" }, { status: 404 })
    }

    if (bom.status !== "PENDING_REVIEW") {
      return NextResponse.json({ error: "BOM is not pending review" }, { status: 400 })
    }

    if (data.action === "confirm" && data.lineItemId) {
      // Confirm a line item match — mark confidence as 1.0 and feed learning loop
      const lineItem = bom.lineItems.find((li) => li.id === data.lineItemId)
      if (!lineItem) {
        return NextResponse.json({ error: "Line item not found" }, { status: 404 })
      }

      await prisma.bomLineItem.update({
        where: { id: lineItem.id },
        data: { matchConfidence: 1.0 },
      })

      // Feed learning loop
      if (lineItem.rawText && lineItem.productId) {
        const normalized = lineItem.rawText.toLowerCase().trim().replace(/\s+/g, " ").replace(/['"]/g, "")
        await prisma.matchHistory.upsert({
          where: {
            normalizedText_userId: { normalizedText: normalized, userId: user.id },
          },
          update: {
            productId: lineItem.productId,
            confirmed: true,
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
          create: {
            rawText: lineItem.rawText,
            normalizedText: normalized,
            productId: lineItem.productId,
            userId: user.id,
            confirmed: true,
          },
        })
      }

      return NextResponse.json({ data: { confirmed: lineItem.id } })
    }

    if (data.action === "fix" && data.lineItemId && data.newProductId) {
      // Fix a wrong match — swap product and feed learning loop
      const lineItem = bom.lineItems.find((li) => li.id === data.lineItemId)
      if (!lineItem) {
        return NextResponse.json({ error: "Line item not found" }, { status: 404 })
      }

      const newProduct = await prisma.product.findUnique({
        where: { id: data.newProductId },
        select: { id: true, name: true, unitOfMeasure: true, tier: true },
      })

      if (!newProduct) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }

      await prisma.bomLineItem.update({
        where: { id: lineItem.id },
        data: {
          productId: newProduct.id,
          tier: newProduct.tier,
          isNonCatalog: false,
          nonCatalogName: null,
          matchConfidence: 1.0,
        },
      })

      // Feed learning loop with correct match
      if (lineItem.rawText) {
        const normalized = lineItem.rawText.toLowerCase().trim().replace(/\s+/g, " ").replace(/['"]/g, "")
        await prisma.matchHistory.upsert({
          where: {
            normalizedText_userId: { normalizedText: normalized, userId: user.id },
          },
          update: {
            productId: newProduct.id,
            confirmed: true,
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
          create: {
            rawText: lineItem.rawText,
            normalizedText: normalized,
            productId: newProduct.id,
            userId: user.id,
            confirmed: true,
          },
        })
      }

      return NextResponse.json({ data: { fixed: lineItem.id, newProduct: newProduct.name } })
    }

    if (data.action === "approve") {
      // Approve the BOM — confirm all unreviewed items and transition status
      // Feed learning loop for all items with rawText + productId
      const itemsToConfirm = bom.lineItems.filter(
        (li) => li.rawText && li.productId && (li.matchConfidence === null || li.matchConfidence < 1.0)
      )

      for (const li of itemsToConfirm) {
        await prisma.bomLineItem.update({
          where: { id: li.id },
          data: { matchConfidence: 1.0 },
        })

        const normalized = li.rawText!.toLowerCase().trim().replace(/\s+/g, " ").replace(/['"]/g, "")
        await prisma.matchHistory.upsert({
          where: {
            normalizedText_userId: { normalizedText: normalized, userId: user.id },
          },
          update: {
            productId: li.productId!,
            confirmed: true,
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
          create: {
            rawText: li.rawText!,
            normalizedText: normalized,
            productId: li.productId!,
            userId: user.id,
            confirmed: true,
          },
        })
      }

      await prisma.bom.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: user.id,
          approvedAt: new Date(),
        },
      })

      return NextResponse.json({ data: { approved: true, itemsConfirmed: itemsToConfirm.length } })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((i) => i.message).join("; ") }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 })
    if (message.includes("Forbidden")) return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
