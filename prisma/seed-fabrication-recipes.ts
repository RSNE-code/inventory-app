import "dotenv/config"
import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── TWS Fabrication Recipes ───────────────────────────
// All TWS items are fabricated from Galvanized Steel Coil - Textured White (26ga)
// All lengths are 8' (RSNE machinery limit)
// sourceQtyPerUnit = totalWidthInches × 8ft / 12 = sq ft of coil per piece

interface TWSRecipe {
  productNamePattern: string // Partial match against product name
  sourceQtyPerUnit: number   // sq ft of coil per piece
  notes?: string
}

const TWS_RECIPES: TWSRecipe[] = [
  { productNamePattern: "TWS Inside Corner 2\" x 2\"", sourceQtyPerUnit: 2.67 },
  { productNamePattern: "TWS Inside Corner 3\" x 3\"", sourceQtyPerUnit: 4.00 },
  { productNamePattern: "TWS Inside Corner 3.5\" x 3.5\"", sourceQtyPerUnit: 5.67 },
  { productNamePattern: "TWS Outside Corner 2\" x 3\"", sourceQtyPerUnit: 3.33 },
  { productNamePattern: "TWS Outside Corner 2\" x 6\"", sourceQtyPerUnit: 5.33 },
  { productNamePattern: "TWS Outside Corner 2\" x 7\"", sourceQtyPerUnit: 6.00 },
  { productNamePattern: "TWS Outside Corner 3\" x 6\"", sourceQtyPerUnit: 6.00 },
  { productNamePattern: "TWS Outside Corner 3\" x 7\"", sourceQtyPerUnit: 6.67 },
  { productNamePattern: "TWS Cap 2\" x 4.25\" x 2\"", sourceQtyPerUnit: 5.50 },
  { productNamePattern: "TWS Cooler Screed", sourceQtyPerUnit: 5.17 },
  { productNamePattern: "TWS Freezer Screed", sourceQtyPerUnit: 2.33, notes: "Comes in pairs — 8' requires 2 pieces. Consumption is per single piece." },
  { productNamePattern: "TWS Base Cover Trim", sourceQtyPerUnit: 4.08 },
  { productNamePattern: "TWS Flat Batten 6\"", sourceQtyPerUnit: 4.00 },
]

const SOURCE_MATERIAL_NAME = "Galvanized Steel Coil - Textured White (26ga)"

async function main() {
  console.log("🔧 Seeding fabrication recipes...")

  // Find the source material (coil)
  const sourceProduct = await prisma.product.findFirst({
    where: { name: { contains: "Galvanized Steel Coil", mode: "insensitive" } },
  })

  if (!sourceProduct) {
    console.error("❌ Source product not found: Galvanized Steel Coil")
    console.log("   Make sure the product catalog has been seeded first.")
    return
  }

  console.log(`✓ Source material: ${sourceProduct.name} (id: ${sourceProduct.id})`)

  let created = 0
  let skipped = 0
  let notFound = 0

  for (const recipe of TWS_RECIPES) {
    // Find the finished product by name pattern
    const finishedProduct = await prisma.product.findFirst({
      where: { name: { contains: recipe.productNamePattern, mode: "insensitive" } },
    })

    if (!finishedProduct) {
      console.log(`  ⚠ Product not found: "${recipe.productNamePattern}"`)
      notFound++
      continue
    }

    // Check if recipe already exists
    const existing = await prisma.fabricationRecipe.findUnique({
      where: {
        finishedProductId_sourceProductId: {
          finishedProductId: finishedProduct.id,
          sourceProductId: sourceProduct.id,
        },
      },
    })

    if (existing) {
      console.log(`  ⏭ Already exists: ${finishedProduct.name}`)
      skipped++
      continue
    }

    // Create the recipe
    await prisma.fabricationRecipe.create({
      data: {
        finishedProductId: finishedProduct.id,
        sourceProductId: sourceProduct.id,
        sourceQtyPerUnit: new Prisma.Decimal(recipe.sourceQtyPerUnit),
        sourceUom: "sq ft",
        fabricationType: "STANDARD_TWS",
        isCustomSizable: false,
        notes: recipe.notes || null,
      },
    })

    console.log(`  ✓ Created: ${finishedProduct.name} → ${recipe.sourceQtyPerUnit} sq ft/piece`)
    created++
  }

  console.log(`\n📊 Results: ${created} created, ${skipped} skipped, ${notFound} not found`)
  console.log("✅ Fabrication recipe seeding complete")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
