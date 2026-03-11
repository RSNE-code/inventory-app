import { prisma } from "@/lib/db"
import type { MatchedPO } from "./types"

interface MatchParams {
  poNumber?: string
  vendorName?: string
  amount?: number
}

export async function matchPO(params: MatchParams): Promise<MatchedPO | null> {
  const { poNumber, vendorName, amount } = params

  if (!poNumber && !vendorName) return null

  // Load open POs with supplier and line items
  const openPOs = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ["OPEN", "PARTIALLY_RECEIVED"] },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      lineItems: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  if (openPOs.length === 0) return null

  // ─── Strategy 1: Exact PO number match ───
  if (poNumber) {
    const normalized = normalizePONumber(poNumber)

    // Exact match
    const exact = openPOs.find((po) => normalizePONumber(po.poNumber) === normalized)
    if (exact) {
      return toMatchedPO(exact, 1.0)
    }

    // Fuzzy number match (handle OCR artifacts: O→0, I→1, etc.)
    const ocrNormalized = normalized
      .replace(/O/gi, "0")
      .replace(/I/gi, "1")
      .replace(/l/g, "1")
      .replace(/S/gi, "5")
      .replace(/B/gi, "8")

    const ocrMatch = openPOs.find((po) => {
      const poNorm = normalizePONumber(po.poNumber)
        .replace(/O/gi, "0")
        .replace(/I/gi, "1")
        .replace(/l/g, "1")
        .replace(/S/gi, "5")
        .replace(/B/gi, "8")
      return poNorm === ocrNormalized
    })

    if (ocrMatch) {
      return toMatchedPO(ocrMatch, 0.85)
    }

    // Partial number match (PO number is contained in or contains the candidate)
    const partials = openPOs.filter((po) => {
      const poNorm = normalizePONumber(po.poNumber)
      return poNorm.includes(normalized) || normalized.includes(poNorm)
    })
    if (partials.length === 1) {
      return toMatchedPO(partials[0], 0.75)
    }
  }

  // ─── Strategy 2: Vendor + Amount match ───
  if (vendorName && amount && amount > 0) {
    const normalizedVendor = normalize(vendorName)
    const vendorTokens = tokenize(normalizedVendor)

    const vendorMatches = openPOs.filter((po) => {
      const supplierNorm = normalize(po.supplier.name)
      const supplierTokens = tokenize(supplierNorm)

      // Check token overlap
      let matched = 0
      for (const token of vendorTokens) {
        if (supplierTokens.some((st) => st.includes(token) || token.includes(st))) {
          matched++
        }
      }
      const overlap = matched / Math.max(vendorTokens.length, supplierTokens.length)
      return overlap >= 0.5
    })

    if (vendorMatches.length > 0) {
      // Find closest amount match (within 10%)
      const amountMatches = vendorMatches.filter((po) => {
        if (!po.amount) return false
        const poAmount = Number(po.amount)
        const diff = Math.abs(poAmount - amount) / Math.max(poAmount, amount)
        return diff <= 0.1
      })

      if (amountMatches.length === 1) {
        return toMatchedPO(amountMatches[0], 0.7)
      }

      // If multiple amount matches, return most recent
      if (amountMatches.length > 1) {
        return toMatchedPO(amountMatches[0], 0.6) // already sorted by createdAt desc
      }

      // No amount match but vendor matched — return most recent for that vendor
      if (vendorMatches.length === 1) {
        return toMatchedPO(vendorMatches[0], 0.5)
      }
    }
  }

  // ─── Strategy 3: Vendor name only ───
  if (vendorName) {
    const normalizedVendor = normalize(vendorName)
    const vendorTokens = tokenize(normalizedVendor)

    const vendorMatches = openPOs.filter((po) => {
      const supplierNorm = normalize(po.supplier.name)
      const supplierTokens = tokenize(supplierNorm)

      let matched = 0
      for (const token of vendorTokens) {
        if (supplierTokens.some((st) => st.includes(token) || token.includes(st))) {
          matched++
        }
      }
      return matched / Math.max(vendorTokens.length, supplierTokens.length) >= 0.6
    })

    // Only auto-match if exactly one vendor match
    if (vendorMatches.length === 1) {
      return toMatchedPO(vendorMatches[0], 0.45)
    }
  }

  return null
}

export async function searchPOs(params: {
  supplierId?: string
  search?: string
  limit?: number
}): Promise<MatchedPO[]> {
  const { supplierId, search, limit = 20 } = params

  const where: Record<string, unknown> = {
    status: { in: ["OPEN", "PARTIALLY_RECEIVED"] },
  }

  if (supplierId) {
    where.supplierId = supplierId
  }

  if (search) {
    where.OR = [
      { poNumber: { contains: search, mode: "insensitive" } },
      { jobName: { contains: search, mode: "insensitive" } },
      { clientName: { contains: search, mode: "insensitive" } },
    ]
  }

  const pos = await prisma.purchaseOrder.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true } },
      lineItems: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return pos.map((po) => toMatchedPO(po, 1.0))
}

// ─── Helpers ───

function normalizePONumber(num: string): string {
  return num.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|co|corp|company|corporation|incorporated)\b\.?/g, "")
    .replace(/[.,'"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(text: string): string[] {
  return text.split(/[\s\-_&]+/).filter((t) => t.length > 1)
}

function toMatchedPO(
  po: {
    id: string
    poNumber: string
    supplierId: string
    amount: { toString(): string } | null
    jobName: string | null
    clientName: string | null
    createdAt: Date
    supplier: { id: string; name: string }
    lineItems?: Array<{
      id: string
      description: string
      sku: string | null
      productId: string | null
      product: { name: string } | null
      qtyOrdered: { toString(): string }
      qtyReceived: { toString(): string }
      unitCost: { toString(): string }
    }>
  },
  confidence: number
): MatchedPO {
  return {
    id: po.id,
    poNumber: po.poNumber,
    supplierName: po.supplier.name,
    supplierId: po.supplier.id,
    amount: po.amount ? Number(po.amount) : null,
    jobName: po.jobName,
    clientName: po.clientName,
    createdAt: po.createdAt.toISOString(),
    confidence,
    lineItems: (po.lineItems ?? []).map((li) => ({
      id: li.id,
      description: li.description,
      sku: li.sku,
      productId: li.productId,
      productName: li.product?.name ?? null,
      qtyOrdered: Number(li.qtyOrdered),
      qtyReceived: Number(li.qtyReceived),
      unitCost: Number(li.unitCost),
    })),
  }
}
