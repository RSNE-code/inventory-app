/**
 * One-time migration: Create Product records for each AssemblyTemplate
 * and migrate existing BomLineItems from non-catalog hacks to real product references.
 *
 * Run: DATABASE_URL="..." npx tsx prisma/migrate-assembly-products.ts
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("=== Assembly Products Migration ===\n")

  // 1. Find or create "Assemblies" category
  let category = await prisma.category.findUnique({ where: { name: "Assemblies" } })
  if (!category) {
    category = await prisma.category.create({
      data: { name: "Assemblies", color: "#3B82F6", sortOrder: 99 },
    })
    console.log("Created 'Assemblies' category")
  } else {
    console.log("Found existing 'Assemblies' category")
  }

  // 2. Get all active assembly templates
  const templates = await prisma.assemblyTemplate.findMany({
    where: { isActive: true },
    select: { id: true, name: true, type: true, description: true },
  })
  console.log(`Found ${templates.length} active assembly templates\n`)

  // 3. Create Product for each template (skip if already exists)
  let productsCreated = 0
  const templateToProductMap = new Map<string, string>()

  for (const template of templates) {
    // Check if a Product already exists linked to this template
    const existing = await prisma.product.findFirst({
      where: { assemblyTemplateId: template.id },
      select: { id: true },
    })

    if (existing) {
      templateToProductMap.set(template.id, existing.id)
      console.log(`  Already exists: "${template.name}" → Product ${existing.id}`)
      continue
    }

    const product = await prisma.product.create({
      data: {
        name: template.name,
        categoryId: category.id,
        tier: "TIER_1",
        unitOfMeasure: "each",
        currentQty: new Prisma.Decimal(0),
        reorderPoint: new Prisma.Decimal(0),
        avgCost: new Prisma.Decimal(0),
        lastCost: new Prisma.Decimal(0),
        isAssembly: true,
        assemblyTemplateId: template.id,
        notes: template.description,
      },
    })

    templateToProductMap.set(template.id, product.id)
    productsCreated++
    console.log(`  Created Product: "${template.name}" → ${product.id}`)
  }
  console.log(`\nProducts created: ${productsCreated}`)

  // 4. Migrate existing BomLineItems that reference assembly templates via nonCatalogSpecs
  // These are items where isNonCatalog=true and nonCatalogSpecs contains assemblyTemplateId
  const assemblyBomItems = await prisma.bomLineItem.findMany({
    where: {
      isNonCatalog: true,
      fabricationSource: "RSNE_MADE",
      nonCatalogCategory: { in: ["Door", "Floor Panel", "Wall Panel", "Ramp"] },
    },
    select: {
      id: true,
      nonCatalogName: true,
      nonCatalogSpecs: true,
      nonCatalogCategory: true,
    },
  })

  console.log(`\nFound ${assemblyBomItems.length} non-catalog assembly BomLineItems to migrate`)

  let migratedItems = 0
  let unmigrated = 0

  for (const item of assemblyBomItems) {
    // Extract assemblyTemplateId from nonCatalogSpecs JSON
    const specs = item.nonCatalogSpecs as Record<string, unknown> | null
    const templateId = specs?.assemblyTemplateId as string | undefined

    let productId: string | undefined

    if (templateId && templateToProductMap.has(templateId)) {
      productId = templateToProductMap.get(templateId)
    } else {
      // Try to match by name — find the closest assembly product
      const matchingProduct = await prisma.product.findFirst({
        where: {
          isAssembly: true,
          name: { equals: item.nonCatalogName || "", mode: "insensitive" },
        },
        select: { id: true },
      })
      productId = matchingProduct?.id
    }

    if (productId) {
      await prisma.bomLineItem.update({
        where: { id: item.id },
        data: {
          productId: productId,
          isNonCatalog: false,
          nonCatalogName: null,
          nonCatalogCategory: null,
          nonCatalogUom: null,
          nonCatalogSpecs: Prisma.DbNull,
          nonCatalogEstCost: null,
          // Keep fabricationSource: "RSNE_MADE"
        },
      })
      migratedItems++
      console.log(`  Migrated: "${item.nonCatalogName}" → Product ${productId}`)
    } else {
      unmigrated++
      console.log(`  Could not match: "${item.nonCatalogName}" (no template ID in specs)`)
    }
  }

  console.log(`\nBomLineItems migrated: ${migratedItems}`)
  if (unmigrated > 0) {
    console.log(`BomLineItems not migrated: ${unmigrated} (manual review needed)`)
  }

  console.log("\n=== Migration Complete ===")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
