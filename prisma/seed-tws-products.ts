import "dotenv/config"
import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── TWS Products to add to catalog ─────────────────
// From outputs/tws-fabrication-recipes.csv
// All are 8' length, "each" UOM, "Trim & Accessories" category
// TWS Cap and Galvanized Screed already exist — skip those

const TWS_PRODUCTS = [
  { name: 'TWS Inside Corner 2" x 2"', cost: 1.66 },
  { name: 'TWS Inside Corner 3" x 3"', cost: 2.50 },
  { name: 'TWS Inside Corner 3.5" x 3.5" w/ 1.5" Standoff', cost: 3.50 },
  { name: 'TWS Outside Corner 2" x 3"', cost: 2.00 },
  { name: 'TWS Outside Corner 2" x 6"', cost: 3.30 },
  { name: 'TWS Outside Corner 2" x 7"', cost: 3.70 },
  { name: 'TWS Outside Corner 3" x 6"', cost: 3.70 },
  { name: 'TWS Outside Corner 3" x 7"', cost: 4.10 },
  { name: "TWS Cooler Screed", cost: 3.20 },
  { name: "TWS Freezer Screed", cost: 1.50 },
  { name: 'TWS Base Cover Trim 1.5" x 2" x 2"', cost: 2.50 },
  { name: 'TWS Flat Batten 6" w/ Hem', cost: 2.50 },
]

async function main() {
  console.log("🔧 Seeding TWS products...")

  // Find the Trim & Accessories category
  const category = await prisma.category.findFirst({
    where: { name: { contains: "Trim", mode: "insensitive" } },
  })

  if (!category) {
    console.error("❌ Category 'Trim & Accessories' not found")
    return
  }

  let created = 0
  let skipped = 0

  for (const tws of TWS_PRODUCTS) {
    // Check if product already exists
    const existing = await prisma.product.findFirst({
      where: { name: { equals: tws.name, mode: "insensitive" } },
    })

    if (existing) {
      console.log(`  ⏭ Already exists: ${tws.name}`)
      skipped++
      continue
    }

    await prisma.product.create({
      data: {
        name: tws.name,
        categoryId: category.id,
        tier: "TIER_1",
        unitOfMeasure: "each",
        currentQty: new Prisma.Decimal(0),
        reorderPoint: new Prisma.Decimal(0),
        avgCost: new Prisma.Decimal(tws.cost),
        lastCost: new Prisma.Decimal(tws.cost),
        dimLength: new Prisma.Decimal(8),
        dimLengthUnit: "ft",
      },
    })

    console.log(`  ✓ Created: ${tws.name}`)
    created++
  }

  console.log(`\n📊 Results: ${created} created, ${skipped} already existed`)
  console.log("✅ TWS product seeding complete")
  console.log("\nNow run: npx tsx prisma/seed-fabrication-recipes.ts")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
