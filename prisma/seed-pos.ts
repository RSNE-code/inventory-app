import "dotenv/config"
import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import path from "path"

const XLSX_PATH = path.resolve(__dirname, "../../reference/Knowify RSNE POs and Items Export.xlsx")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── Supplier name normalization ───

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

    if (normalizedInput === normalizedName) return supplier

    if (normalizedInput.includes(normalizedName) || normalizedName.includes(normalizedInput)) {
      const score = 0.9
      if (!bestMatch || score > bestMatch.confidence) {
        bestMatch = { ...supplier, confidence: score }
      }
      continue
    }

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

// ─── Parse date strings like "04/09/2025" ───

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split("/")
  if (parts.length !== 3) return null
  const [month, day, year] = parts.map(Number)
  if (!month || !day || !year) return null
  return new Date(year, month - 1, day)
}

// ─── Types for spreadsheet rows ───

interface SpreadsheetRow {
  Vendor?: string | number
  "Purchase date"?: string | number
  "PO #"?: string | number
  "Item description"?: string | number
  "Catalog item"?: string | number
  "Item Number / SKU"?: string | number
  Quantity?: string | number
  "Unit cost"?: string | number
  "Item total"?: string | number
  "Purchase total"?: string | number
  "Quantity received"?: string | number
  "Delivery/Pickup on"?: string | number
  "Job name"?: string | number
  Phase?: string | number
  "Vendor type"?: string | number
  "Purchase Type"?: string | number
}

interface POData {
  vendorName: string
  purchaseDate: string
  poNumber: string
  purchaseTotal: number
  jobName: string
  items: Array<{
    description: string
    catalogItem: string
    sku: string
    quantity: number
    unitCost: number
    qtyReceived: number
  }>
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require(path.resolve(__dirname, "../../node_modules/xlsx/xlsx.js"))

  console.log("Reading PO + Items spreadsheet...")
  const workbook = XLSX.readFile(XLSX_PATH)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: SpreadsheetRow[] = XLSX.utils.sheet_to_json(sheet)

  // Group rows by PO number
  const poMap = new Map<string, POData>()

  for (const row of rows) {
    const poNumber = String(row["PO #"] || "").trim()
    if (!poNumber) continue

    if (!poMap.has(poNumber)) {
      poMap.set(poNumber, {
        vendorName: String(row["Vendor"] || "").trim(),
        purchaseDate: String(row["Purchase date"] || "").trim(),
        poNumber,
        purchaseTotal: parseFloat(String(row["Purchase total"] || "0").replace(/[$,]/g, "")),
        jobName: String(row["Job name"] || "").trim(),
        items: [],
      })
    }

    const description = String(row["Item description"] || "").trim()
    if (!description) continue

    poMap.get(poNumber)!.items.push({
      description,
      catalogItem: String(row["Catalog item"] || "").trim(),
      sku: String(row["Item Number / SKU"] || "").trim(),
      quantity: parseFloat(String(row["Quantity"] || "0")),
      unitCost: parseFloat(String(row["Unit cost"] || "0").replace(/[$,]/g, "")),
      qtyReceived: parseFloat(String(row["Quantity received"] || "0")),
    })
  }

  console.log(`Found ${poMap.size} unique POs with ${rows.length} total line items`)

  // Load suppliers and products for matching
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  })
  console.log(`Loaded ${suppliers.length} suppliers`)

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, sku: true },
  })
  console.log(`Loaded ${products.length} products for item matching`)

  // Build product lookup by SKU and normalized name
  const productBySku = new Map<string, string>()
  const productByName = new Map<string, string>()
  for (const p of products) {
    if (p.sku) productBySku.set(p.sku.toLowerCase().trim(), p.id)
    productByName.set(normalize(p.name), p.id)
  }

  // Delete existing POs and line items for a clean reseed
  const deleted = await prisma.pOLineItem.deleteMany({})
  console.log(`Deleted ${deleted.count} existing line items`)
  const deletedPOs = await prisma.purchaseOrder.deleteMany({})
  console.log(`Deleted ${deletedPOs.count} existing POs`)

  let createdPOs = 0
  let createdItems = 0
  let skippedPOs = 0
  const unmatchedVendors = new Set<string>()

  for (const [, po] of poMap) {
    const supplierMatch = matchSupplierName(po.vendorName, suppliers)
    if (!supplierMatch) {
      unmatchedVendors.add(po.vendorName)
      skippedPOs++
      continue
    }

    const createdDate = parseDate(po.purchaseDate)

    // Determine PO status based on received quantities
    const allReceived = po.items.length > 0 && po.items.every((i) => i.qtyReceived >= i.quantity)
    const someReceived = po.items.some((i) => i.qtyReceived > 0)
    const status = allReceived ? "CLOSED" as const : someReceived ? "PARTIALLY_RECEIVED" as const : "OPEN" as const

    const createdPO = await prisma.purchaseOrder.create({
      data: {
        poNumber: po.poNumber,
        supplierId: supplierMatch.id,
        status,
        amount: isNaN(po.purchaseTotal) ? null : new Prisma.Decimal(po.purchaseTotal),
        jobName: po.jobName || null,
        createdAt: createdDate || new Date(),
      },
    })

    // Create line items
    for (const item of po.items) {
      // Try to match item to catalog product
      let productId: string | null = null

      // Match by SKU first
      if (item.sku) {
        productId = productBySku.get(item.sku.toLowerCase().trim()) || null
      }

      // Match by catalog item name
      if (!productId && item.catalogItem) {
        productId = productByName.get(normalize(item.catalogItem)) || null
      }

      await prisma.pOLineItem.create({
        data: {
          purchaseOrderId: createdPO.id,
          productId,
          description: item.description,
          sku: item.sku || null,
          qtyOrdered: new Prisma.Decimal(isNaN(item.quantity) ? 0 : item.quantity),
          qtyReceived: new Prisma.Decimal(isNaN(item.qtyReceived) ? 0 : item.qtyReceived),
          unitCost: new Prisma.Decimal(isNaN(item.unitCost) ? 0 : item.unitCost),
        },
      })
      createdItems++
    }

    createdPOs++
  }

  console.log(`\n✅ Created ${createdPOs} POs with ${createdItems} line items`)
  console.log(`⏭️  Skipped ${skippedPOs} POs (unmatched vendor)`)

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
