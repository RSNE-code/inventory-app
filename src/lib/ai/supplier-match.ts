import { prisma } from "@/lib/db"

interface SupplierMatch {
  id: string
  name: string
  confidence: number
}

export async function matchSupplier(
  extractedName: string
): Promise<SupplierMatch | null> {
  if (!extractedName?.trim()) return null

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  })

  const normalizedInput = normalize(extractedName)
  const inputTokens = tokenize(normalizedInput)

  let bestMatch: SupplierMatch | null = null

  for (const supplier of suppliers) {
    const normalizedName = normalize(supplier.name)

    // Exact match after normalization
    if (normalizedInput === normalizedName) {
      return { id: supplier.id, name: supplier.name, confidence: 1.0 }
    }

    // One contains the other
    if (normalizedInput.includes(normalizedName) || normalizedName.includes(normalizedInput)) {
      const score = 0.9
      if (!bestMatch || score > bestMatch.confidence) {
        bestMatch = { id: supplier.id, name: supplier.name, confidence: score }
      }
      continue
    }

    // Token-based similarity
    const supplierTokens = tokenize(normalizedName)
    if (inputTokens.length === 0 || supplierTokens.length === 0) continue

    let matched = 0
    for (const token of inputTokens) {
      if (supplierTokens.some((st) => st.includes(token) || token.includes(st))) {
        matched++
      }
    }

    const score = matched / Math.max(inputTokens.length, supplierTokens.length)

    if (score > (bestMatch?.confidence ?? 0)) {
      bestMatch = { id: supplier.id, name: supplier.name, confidence: score }
    }
  }

  return bestMatch && bestMatch.confidence >= 0.6 ? bestMatch : null
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
