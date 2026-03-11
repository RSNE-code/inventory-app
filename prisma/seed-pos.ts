import "dotenv/config"
import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import path from "path"

const XLSX_PATH = path.resolve(__dirname, "../../reference/Knowify RSNE POs.xlsx")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── Supplier name normalization (same logic as supplier-match.ts) ───

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

function matchSupplierName(
  vendorName: string,
  suppliers: Array<{ id: string; name: string }>
): { id: string; name: string } | null {
  const normalizedInput = normalize(vendorName)
  const inputTokens = tokenize(normalizedInput)

  let bestMatch: { id: string; name: string; confidence: number } | null = null

  for (const supplier of suppliers) {
    const normalizedName = normalize(supplier.name)

    // Exact match
    if (normalizedInput === normalizedName) {
      return supplier
    }

    // Containment
    if (normalizedInput.includes(normalizedName) || normalizedName.includes(normalizedInput)) {
      const score = 0.9
      if (!bestMatch || score > bestMatch.confidence) {
        bestMatch = { ...supplier, confidence: score }
      }
      continue
    }

    // Token overlap
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
      bestMatch = { ...supplier, confidence: score }
    }
  }

  return bestMatch && bestMatch.confidence >= 0.5 ? { id: bestMatch.id, name: bestMatch.name } : null
}

// ─── Parse date strings like "3/10/2026" ───

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split("/")
  if (parts.length !== 3) return null
  const [month, day, year] = parts.map(Number)
  if (!month || !day || !year) return null
  return new Date(year, month - 1, day)
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require(path.resolve(__dirname, "../../node_modules/xlsx/xlsx.js"))

  console.log("Reading PO spreadsheet...")
  const workbook = XLSX.readFile(XLSX_PATH)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet)

  console.log(`Found ${rows.length} PO rows`)

  // Load existing suppliers for matching
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  })
  console.log(`Loaded ${suppliers.length} suppliers for matching`)

  // Check existing POs to avoid duplicates
  const existingPOs = await prisma.purchaseOrder.findMany({
    select: { poNumber: true },
  })
  const existingSet = new Set(existingPOs.map((p) => p.poNumber))

  let created = 0
  let skipped = 0
  let unmatchedVendors = new Set<string>()

  for (const row of rows) {
    const poNumber = String(row["PO #"] || "").trim()
    if (!poNumber) {
      skipped++
      continue
    }

    if (existingSet.has(poNumber)) {
      skipped++
      continue
    }

    const vendorName = String(row["Vendor Name"] || "").trim()
    const amount = parseFloat(String(row["Amount"] || "0").replace(/[$,]/g, ""))
    const createdDate = parseDate(String(row["Created Date"] || ""))
    const clientName = String(row["Client/Department Name"] || "").trim()
    const projectName = String(row["Project Name"] || "").trim()

    // Match vendor to supplier
    const supplierMatch = matchSupplierName(vendorName, suppliers)

    if (!supplierMatch) {
      unmatchedVendors.add(vendorName)
      skipped++
      continue
    }

    await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: supplierMatch.id,
        status: "OPEN",
        amount: isNaN(amount) ? null : new Prisma.Decimal(amount),
        jobName: projectName || null,
        clientName: clientName || null,
        createdAt: createdDate || new Date(),
      },
    })

    created++
  }

  console.log(`\n✅ Created ${created} POs`)
  console.log(`⏭️  Skipped ${skipped} rows (duplicates, missing PO#, or unmatched vendor)`)

  if (unmatchedVendors.size > 0) {
    console.log(`\n⚠️  ${unmatchedVendors.size} vendors could not be matched:`)
    for (const v of unmatchedVendors) {
      console.log(`   - ${v}`)
    }
  }
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
