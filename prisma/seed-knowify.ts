import "dotenv/config"
import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import fs from "fs"
import path from "path"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── CATEGORY CLASSIFICATION ───
// Maps product names to categories using keyword patterns
type CategoryRule = { keywords: string[]; category: string }

const categoryRules: CategoryRule[] = [
  // Insulated Metal Panels (most specific first)
  { keywords: ["AWIP"], category: "Insulated Metal Panel" },
  { keywords: ["FALK"], category: "Insulated Metal Panel" },
  { keywords: ["KINGSPAN"], category: "Insulated Metal Panel" },
  { keywords: ["METLSPAN"], category: "Insulated Metal Panel" },
  { keywords: ["NORFAB"], category: "Insulated Metal Panel" },

  // Door Hardware
  { keywords: ["KASON"], category: "Door Hardware/Parts" },
  { keywords: ["K56 "], category: "Door Hardware/Parts" },
  { keywords: ["K55 "], category: "Door Hardware/Parts" },
  { keywords: ["K481"], category: "Door Hardware/Parts" },
  { keywords: ["K486"], category: "Door Hardware/Parts" },
  { keywords: ["K487"], category: "Door Hardware/Parts" },
  { keywords: ["K489"], category: "Door Hardware/Parts" },
  { keywords: ["K488"], category: "Door Hardware/Parts" },
  { keywords: ["K1236"], category: "Door Hardware/Parts" },
  { keywords: ["K58"], category: "Door Hardware/Parts" },
  { keywords: ["LATCH"], category: "Door Hardware/Parts" },
  { keywords: ["HINGE"], category: "Door Hardware/Parts" },
  { keywords: ["CLOSER"], category: "Door Hardware/Parts" },
  { keywords: ["HANDLE"], category: "Door Hardware/Parts" },
  { keywords: ["TROLLEY"], category: "Door Hardware/Parts" },
  { keywords: ["SLIDER TRACK"], category: "Door Hardware/Parts" },
  { keywords: ["THRESHOLD"], category: "Door Hardware/Parts" },
  { keywords: ["INSIDE RELEASE"], category: "Door Hardware/Parts" },
  { keywords: ["PUSH BAR"], category: "Door Hardware/Parts" },
  { keywords: ["CRASH BAR"], category: "Door Hardware/Parts" },
  { keywords: ["PAD HASP"], category: "Door Hardware/Parts" },
  { keywords: ["GLOW PUSH"], category: "Door Hardware/Parts" },
  { keywords: ["DENT STRIKE"], category: "Door Hardware/Parts" },
  { keywords: ["STRIKER"], category: "Door Hardware/Parts" },
  { keywords: ["SECURITY TIP"], category: "Door Hardware/Parts" },
  { keywords: ["DOOR TAG"], category: "Door Hardware/Parts" },
  { keywords: ["KEY SQUARE"], category: "Door Hardware/Parts" },

  // Doors (complete doors, not parts)
  { keywords: ["COOLER DOOR"], category: "Doors (by others)" },
  { keywords: ["FREEZER DOOR"], category: "Doors (by others)" },
  { keywords: ["TRAFFIC DOOR"], category: "Doors (by others)" },
  { keywords: ["STRIP DOOR"], category: "Doors (by others)" },
  { keywords: ["STRIP CURTAIN"], category: "Doors (by others)" },
  { keywords: ["DURULITE"], category: "Doors (by others)" },
  { keywords: ["GLASS REACH"], category: "Doors (by others)" },
  { keywords: ["CHASE AIRGARD"], category: "Doors (by others)" },
  { keywords: ["CHASE AIRGUARD"], category: "Doors (by others)" },
  { keywords: ["SLIDING DOOR HDWE"], category: "Doors (by others)" },

  // Metal Raw Materials
  { keywords: ["GALV"], category: "Metal Raw Materials" },
  { keywords: ["STAINLESS"], category: "Metal Raw Materials" },
  { keywords: ["ALUMINUM"], category: "Metal Raw Materials" },
  { keywords: ["DIAMOND PLATE"], category: "Metal Raw Materials" },
  { keywords: ["STEEL"], category: "Metal Raw Materials" },
  { keywords: ["SSSH"], category: "Metal Raw Materials" },

  // Fasteners
  { keywords: ["TEK "], category: "Fasteners" },
  { keywords: ["TEK-"], category: "Fasteners" },
  { keywords: [" TEK"], category: "Fasteners" },
  { keywords: ["SCREW"], category: "Fasteners" },
  { keywords: ["BOLT"], category: "Fasteners" },
  { keywords: ["RIVET"], category: "Fasteners" },
  { keywords: ["FABLOCK"], category: "Fasteners" },
  { keywords: ["FABLOC"], category: "Fasteners" },
  { keywords: ["FASTENER"], category: "Fasteners" },
  { keywords: ["#10X"], category: "Fasteners" },
  { keywords: ["#12X"], category: "Fasteners" },
  { keywords: ["#14X"], category: "Fasteners" },
  { keywords: ["#8X"], category: "Fasteners" },
  { keywords: ["K-LATH"], category: "Fasteners" },
  { keywords: ["WASHER"], category: "Fasteners" },
  { keywords: ["DRILL BIT"], category: "Fasteners" },
  { keywords: ["PHIL FLAT MS"], category: "Fasteners" },
  { keywords: ["PHIL PAN SMS"], category: "Fasteners" },
  { keywords: ["NUT"], category: "Fasteners" },
  { keywords: ["THREADED ROD"], category: "Fasteners" },
  { keywords: ["METAL ANCHOR"], category: "Fasteners" },
  { keywords: ["BEAM CLAMP"], category: "Fasteners" },
  { keywords: ["SHOTS & PINS"], category: "Fasteners" },
  { keywords: ["BCSCF"], category: "Fasteners" },
  { keywords: ["CF CLIPS"], category: "Fasteners" },

  // Insulation / Foam
  { keywords: ["EPS"], category: "Foam Insulation" },
  { keywords: ["TRYMER"], category: "Foam Insulation" },
  { keywords: ["URETHANE"], category: "Foam Insulation" },
  { keywords: ["DOW "], category: "Foam Insulation" },
  { keywords: ["XPS"], category: "Foam Insulation" },
  { keywords: ["ARMAFLEX"], category: "Foam Insulation" },
  { keywords: ["AEROFLEX"], category: "Foam Insulation" },
  { keywords: ["ADFOAM"], category: "Foam Insulation" },
  { keywords: ["FROTH-PAK"], category: "Foam Insulation" },
  { keywords: ["FROST STOP"], category: "Foam Insulation" },

  // FRP
  { keywords: ["FRP"], category: "FRP" },

  // Plywood & Substrates
  { keywords: ["PLYWOOD"], category: "Plywood & Substrates" },
  { keywords: ["ARAUCO"], category: "Plywood & Substrates" },
  { keywords: ["PINE"], category: "Plywood & Substrates" },
  { keywords: ["LAUAN"], category: "Plywood & Substrates" },
  { keywords: ["LUAN"], category: "Plywood & Substrates" },
  { keywords: ["CDX"], category: "Plywood & Substrates" },
  { keywords: ["P11PLUS"], category: "Plywood & Substrates" },
  { keywords: ["ABS MED"], category: "Plywood & Substrates" },
  { keywords: ["DOUG FIR"], category: "Plywood & Substrates" },

  // Trim & Accessories
  { keywords: ["TWS"], category: "Trim & Accessories" },
  { keywords: ["TRIM"], category: "Trim & Accessories" },
  { keywords: ["SCREED"], category: "Trim & Accessories" },
  { keywords: ["BATTEN"], category: "Trim & Accessories" },
  { keywords: ["CAP "], category: "Trim & Accessories" },
  { keywords: ["CORNER"], category: "Trim & Accessories" },
  { keywords: ["FLASHING"], category: "Trim & Accessories" },
  { keywords: ["ANGLE"], category: "Trim & Accessories" },
  { keywords: ["T-BAR"], category: "Trim & Accessories" },
  { keywords: ["UNISTRUT"], category: "Trim & Accessories" },

  // Heater Cables
  { keywords: ["HEATER"], category: "Heater Cables" },

  // Gaskets & Sweeps
  { keywords: ["GASKET"], category: "Gaskets & Sweeps" },
  { keywords: ["SWEEP"], category: "Gaskets & Sweeps" },
  { keywords: ["EPDM"], category: "Gaskets & Sweeps" },

  // Caulking & Sealants
  { keywords: ["CAULK"], category: "Caulking & Sealants" },
  { keywords: ["SILICONE"], category: "Caulking & Sealants" },
  { keywords: ["ADTHANE"], category: "Caulking & Sealants" },
  { keywords: ["PVC GLUE"], category: "Caulking & Sealants" },
  { keywords: ["ADHESIVE"], category: "Caulking & Sealants" },
  { keywords: ["CONTACT CEMENT"], category: "Caulking & Sealants" },
  { keywords: ["DBSC"], category: "Caulking & Sealants" },
  { keywords: ["DURASIL"], category: "Caulking & Sealants" },
  { keywords: ["BUTYL"], category: "Caulking & Sealants" },
  { keywords: ["STEGO WRAP"], category: "Caulking & Sealants" },
  { keywords: ["VAPOR GUARD"], category: "Caulking & Sealants" },
  { keywords: ["DOUBLE SIDED TAPE"], category: "Caulking & Sealants" },
  { keywords: ["POLY FILM"], category: "Caulking & Sealants" },
  { keywords: ["CLEAR PLASTIC FILM"], category: "Caulking & Sealants" },

  // Jamison / High-speed door parts
  { keywords: ["JAMISON"], category: "Jamison Parts" },
  { keywords: ["119-"], category: "Jamison Parts" },
  { keywords: ["ENCODER"], category: "Jamison Parts" },
  { keywords: ["SENSOR"], category: "Jamison Parts" },
  { keywords: ["MOTOR"], category: "Jamison Parts" },
  { keywords: ["AIR CYLINDER"], category: "Jamison Parts" },
  { keywords: ["AIR SWITCH"], category: "Jamison Parts" },
  { keywords: ["ASSEMBLY TRACK"], category: "Jamison Parts" },
  { keywords: ["DRIVE CHAIN"], category: "Jamison Parts" },
  { keywords: ["DRIVE LINK"], category: "Jamison Parts" },
  { keywords: ["DRIVE SPROCKET"], category: "Jamison Parts" },
  { keywords: ["GEAR REDUCER"], category: "Jamison Parts" },
  { keywords: ["LIGHT CURTAIN"], category: "Jamison Parts" },
  { keywords: ["LIMIT SWITCH"], category: "Jamison Parts" },
  { keywords: ["MICRO SAFETY"], category: "Jamison Parts" },
  { keywords: ["PHOTO"], category: "Jamison Parts" },
  { keywords: ["REVERSING EDGE"], category: "Jamison Parts" },
  { keywords: ["CONNECTING LINK"], category: "Jamison Parts" },
  { keywords: ["CONTROL VALVE"], category: "Jamison Parts" },
  { keywords: ["BEARING"], category: "Jamison Parts" },
  { keywords: ["SMART PANEL"], category: "Jamison Parts" },
  { keywords: ["SPIDER"], category: "Jamison Parts" },
  { keywords: ["REPLACEMENT"], category: "Jamison Parts" },
  { keywords: ["ROLLER ASSEMBLY"], category: "Jamison Parts" },
  { keywords: ["KEYPAD"], category: "Jamison Parts" },
  { keywords: ["TRANSFORMER"], category: "Jamison Parts" },
  { keywords: ["FUSE"], category: "Jamison Parts" },
  { keywords: ["BATTERY"], category: "Jamison Parts" },
  { keywords: ["FILTER REGULATOR"], category: "Jamison Parts" },
  { keywords: ["JAM "], category: "Jamison Parts" },
  { keywords: ["REDUCER"], category: "Jamison Parts" },
  { keywords: ["PIZZATO"], category: "Jamison Parts" },
  { keywords: ["BREAK AWAY"], category: "Jamison Parts" },
  { keywords: ["RETAINER"], category: "Jamison Parts" },
  { keywords: ["SPRING SST"], category: "Jamison Parts" },
  { keywords: ["PE TELCO"], category: "Jamison Parts" },
  { keywords: ["PMC24"], category: "Jamison Parts" },
  { keywords: ["D800"], category: "Jamison Parts" },
  { keywords: ["SLD "], category: "Jamison Parts" },
  { keywords: ["FISH PLATE"], category: "Jamison Parts" },
  { keywords: ["VALVE PLUG"], category: "Jamison Parts" },
  { keywords: ["WIRE, MOTOR"], category: "Jamison Parts" },
  { keywords: ["ZIPPER REPAIR"], category: "Jamison Parts" },
  { keywords: ["RITE HITE"], category: "Jamison Parts" },

  // Fabrication Supplies
  { keywords: ["VENT PORT"], category: "Fabrication Supplies" },
  { keywords: ["PULL CORD"], category: "Fabrication Supplies" },

  // Electrical
  { keywords: ["EMT"], category: "Miscellaneous Materials" },
  { keywords: ["PIPE HANGER"], category: "Miscellaneous Materials" },
  { keywords: ["GANG BOX"], category: "Miscellaneous Materials" },
  { keywords: ["OUTLET BOX"], category: "Miscellaneous Materials" },
  { keywords: ["SJ CORD"], category: "Miscellaneous Materials" },
  { keywords: ["STRAIN RELIEF"], category: "Miscellaneous Materials" },
  { keywords: ["RECEPTACLE"], category: "Miscellaneous Materials" },
  { keywords: ["BALLAST"], category: "Miscellaneous Materials" },
  { keywords: ["THERMOMETER"], category: "Miscellaneous Materials" },
  { keywords: ["SCISSOR LIFT"], category: "Miscellaneous Materials" },
  { keywords: ["PALLETTE"], category: "Miscellaneous Materials" },
]

function classifyProduct(name: string): string {
  const upper = name.toUpperCase()
  for (const rule of categoryRules) {
    if (rule.keywords.some((k) => upper.includes(k.toUpperCase()))) {
      return rule.category
    }
  }
  return "Miscellaneous Materials"
}

// ─── UNIT OF MEASURE CLASSIFICATION ───
function classifyUnitOfMeasure(name: string): string {
  const upper = name.toUpperCase()
  // Sheets/panels
  if (upper.includes("X48X") || upper.includes("4X8") || upper.includes("4X10") || upper.includes("4 X 8") || upper.includes("4 X 10")) return "sheet"
  if (upper.includes("PANEL")) return "sheet"
  // Rolls
  if (upper.includes("ROLL") || upper.includes("100'") || upper.includes("1000'")) return "roll"
  // Linear
  if (upper.match(/\d+['']/) && (upper.includes("HEATER") || upper.includes("CABLE"))) return "ea"
  if (upper.includes("X 16'") || upper.includes("X 10'")) return "ea"
  // Tube/cartridge
  if (upper.includes("TUBE") || upper.includes("CART") || upper.includes("10.1 OZ") || upper.includes("10.3 OZ") || upper.includes("870ML")) return "tube"
  // Drum/pail
  if (upper.includes("DRUM") || upper.includes("5GAL") || upper.includes("55GAL")) return "ea"
  // Fasteners - each
  if (upper.includes("TEK") || upper.includes("SCREW") || upper.includes("RIVET") || upper.includes("BOLT") || upper.includes("NUT") || upper.includes("FABLOCK") || upper.includes("FABLOC")) return "ea"
  // Default
  return "ea"
}

// ─── TIER CLASSIFICATION ───
function classifyTier(name: string, category: string): "TIER_1" | "TIER_2" {
  // Tier 2 = consumables, small fasteners, caulking — tracked for costing only
  const upper = name.toUpperCase()
  if (category === "Fasteners") return "TIER_2"
  if (category === "Caulking & Sealants") return "TIER_2"
  if (upper.includes("TAPE")) return "TIER_2"
  if (upper.includes("SHOTS & PINS")) return "TIER_2"
  // Everything else is Tier 1 (tracked with real stock counts)
  return "TIER_1"
}

// ─── MAIN ───
async function main() {
  console.log("Loading Knowify catalog...")

  const catalogPath = path.join(__dirname, "knowify-catalog.json")
  const rawData = JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as Array<{
    Name: string
    Description: string | null
    "Item Number": string | null
    Type: string
    Price: number | null
    Cost: number | null
    Status: string
  }>

  // Filter to products only (skip services)
  const knowifyProducts = rawData.filter((p) => p.Type === "Product")
  console.log(`Found ${knowifyProducts.length} products (skipping ${rawData.length - knowifyProducts.length} services)`)

  // ─── ENSURE CATEGORIES EXIST ───
  const allCategoryNames = new Set<string>()
  for (const p of knowifyProducts) {
    allCategoryNames.add(classifyProduct(p.Name))
  }

  const categoryColors: Record<string, string> = {
    "Door Hardware/Parts": "#2563EB",
    "Metal Raw Materials": "#64748B",
    "Insulated Metal Panel": "#0891B2",
    "Trim & Accessories": "#7C3AED",
    "Foam Insulation": "#D97706",
    "Miscellaneous Materials": "#6B7280",
    "Doors (by others)": "#059669",
    "Fabrication Supplies": "#DC2626",
    "Caulking & Sealants": "#EA580C",
    "Plywood & Substrates": "#854D0E",
    "FRP": "#16A34A",
    "Fasteners": "#78716C",
    "Heater Cables": "#E11D48",
    "Gaskets & Sweeps": "#0D9488",
    "Jamison Parts": "#7C3AED",
  }

  const catMap = new Map<string, string>()
  let sortOrder = 1
  for (const catName of allCategoryNames) {
    const cat = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: {
        name: catName,
        color: categoryColors[catName] || "#6B7280",
        sortOrder: sortOrder++,
      },
    })
    catMap.set(catName, cat.id)
  }
  console.log(`Ensured ${catMap.size} categories`)

  // ─── CLEAR EXISTING ASSEMBLY TEMPLATE COMPONENTS ───
  // (They'll be re-created by seed-assemblies.ts after this)
  const deletedComponents = await prisma.assemblyTemplateComponent.deleteMany({})
  const deletedTemplates = await prisma.assemblyTemplate.deleteMany({})
  console.log(`Cleared ${deletedTemplates.count} assembly templates and ${deletedComponents.count} template components`)

  // ─── GET EXISTING PRODUCTS ───
  const existingProducts = await prisma.product.findMany({
    select: { id: true, name: true },
  })
  const existingByName = new Map(existingProducts.map((p) => [p.name.toLowerCase().trim(), p.id]))
  console.log(`Found ${existingProducts.length} existing products in database`)

  // ─── UPSERT KNOWIFY PRODUCTS ───
  const knowifyNames = new Set<string>()
  let created = 0
  let updated = 0
  const usedSkus = new Set<string>()

  // Pre-populate usedSkus with existing SKUs in the database
  const existingSkus = await prisma.product.findMany({
    where: { sku: { not: null } },
    select: { sku: true },
  })
  for (const p of existingSkus) {
    if (p.sku) usedSkus.add(p.sku)
  }

  for (const kp of knowifyProducts) {
    const name = kp.Name.trim()
    knowifyNames.add(name.toLowerCase())

    const category = classifyProduct(name)
    const categoryId = catMap.get(category)!
    const unitOfMeasure = classifyUnitOfMeasure(name)
    const tier = classifyTier(name, category)
    const cost = kp.Cost ? new Prisma.Decimal(kp.Cost) : new Prisma.Decimal(0)
    const rawSku = kp["Item Number"]?.trim() || null
    // Only assign SKU if it hasn't been used yet (some Knowify items share part numbers)
    const sku = rawSku && !usedSkus.has(rawSku) ? rawSku : null
    if (rawSku && sku) usedSkus.add(rawSku)

    const existingId = existingByName.get(name.toLowerCase())

    if (existingId) {
      // Update existing product with Knowify data
      await prisma.product.update({
        where: { id: existingId },
        data: {
          categoryId,
          ...(sku ? { sku } : {}),
          tier,
          unitOfMeasure,
          lastCost: cost,
          avgCost: cost,
          notes: kp.Description && kp.Description !== name ? kp.Description : undefined,
          isActive: true,
        },
      })
      updated++
    } else {
      // Create new product
      await prisma.product.create({
        data: {
          name,
          sku,
          categoryId,
          tier,
          unitOfMeasure,
          currentQty: new Prisma.Decimal(0),
          reorderPoint: new Prisma.Decimal(0),
          lastCost: cost,
          avgCost: cost,
          notes: kp.Description && kp.Description !== name ? kp.Description : null,
          isActive: true,
        },
      })
      created++
    }
  }

  console.log(`Created ${created} new products, updated ${updated} existing products`)

  // ─── DEACTIVATE PRODUCTS NOT IN KNOWIFY ───
  let deactivated = 0
  for (const [nameLC, id] of existingByName) {
    if (!knowifyNames.has(nameLC)) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      })
      deactivated++
    }
  }
  console.log(`Deactivated ${deactivated} products not in Knowify catalog`)

  // ─── SUMMARY ───
  const totalActive = await prisma.product.count({ where: { isActive: true } })
  console.log(`\nTotal active products: ${totalActive}`)
  console.log("\nDone! Now run seed-assemblies.ts to re-link assembly templates.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
