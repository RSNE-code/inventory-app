import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { writeFileSync } from "fs"
import { join } from "path"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

interface TestCase {
  rawText: string
  expectedProduct: string
  notes: string
  category: string
}

function generateVariations(name: string): string[] {
  const variations: string[] = []

  // Exact name
  variations.push(name)

  // Lowercase
  variations.push(name.toLowerCase())

  // First 2-3 significant words
  const words = name.split(/\s+/).filter(w => w.length > 1)
  if (words.length >= 2) {
    variations.push(words.slice(0, 2).join(" "))
  }
  if (words.length >= 3) {
    variations.push(words.slice(0, 3).join(" "))
  }

  return [...new Set(variations)]
}

function generateTWSVariations(name: string): string[] {
  const variations: string[] = []

  // "TWS Inside Corner 2\" x 2\"" → "IC 2x2", "TWS IC 2x2", "inside corner 2x2"
  const icMatch = name.match(/Inside Corner (\d+(?:\.\d+)?)" x (\d+(?:\.\d+)?)"/)
  if (icMatch) {
    variations.push(`IC ${icMatch[1]}x${icMatch[2]}`)
    variations.push(`TWS IC ${icMatch[1]}x${icMatch[2]}`)
    variations.push(`inside corner ${icMatch[1]}x${icMatch[2]}`)
    variations.push(`IC ${icMatch[1]}" x ${icMatch[2]}"`)
  }

  const ocMatch = name.match(/Outside Corner (\d+(?:\.\d+)?)" x (\d+(?:\.\d+)?)"/)
  if (ocMatch) {
    variations.push(`OC ${ocMatch[1]}x${ocMatch[2]}`)
    variations.push(`TWS OC ${ocMatch[1]}x${ocMatch[2]}`)
    variations.push(`outside corner ${ocMatch[1]}x${ocMatch[2]}`)
    variations.push(`OC ${ocMatch[1]}" x ${ocMatch[2]}"`)
  }

  if (name.includes("Cap")) {
    variations.push("TWS Cap")
    variations.push("cap trim")
  }
  if (name.includes("Cooler Screed")) {
    variations.push("cooler screed")
    variations.push("screed cooler")
  }
  if (name.includes("Freezer Screed")) {
    variations.push("freezer screed")
    variations.push("screed freezer")
  }
  if (name.includes("Base Cover")) {
    variations.push("base cover trim")
    variations.push("TWS base cover")
  }
  if (name.includes("Flat Batten")) {
    variations.push("flat batten 6")
    variations.push("TWS flat batten")
  }

  return variations
}

function generatePanelVariations(): TestCase[] {
  // Panel items are non-catalog (generic) so they should match as panels, not specific products
  return [
    { rawText: '4" IMP 8\'', expectedProduct: "PANEL_MATCH", notes: "Panel - should detect as panel", category: "Panels" },
    { rawText: '4" IMP W/W 7\'-6"', expectedProduct: "PANEL_MATCH", notes: "Panel with feet+inches", category: "Panels" },
    { rawText: '4 inch ceiling panel 10\'', expectedProduct: "PANEL_MATCH", notes: "Panel written out", category: "Panels" },
    { rawText: '20 pcs 4" walls 8\'', expectedProduct: "PANEL_MATCH", notes: "Panel described as walls", category: "Panels" },
    { rawText: '4" IMP 3x20', expectedProduct: "PANEL_MATCH", notes: "Panel with width x length", category: "Panels" },
    { rawText: '5" freezer panel 10\'', expectedProduct: "PANEL_MATCH", notes: "Freezer panel", category: "Panels" },
  ]
}

function generateNoMatchCases(): TestCase[] {
  return [
    { rawText: "custom welded bracket", expectedProduct: "NO_MATCH", notes: "Truly unique", category: "NO_MATCH" },
    { rawText: "special order item XYZ", expectedProduct: "NO_MATCH", notes: "Not in catalog", category: "NO_MATCH" },
    { rawText: "TWS Cover Plate 10x10 hem 3 sides", expectedProduct: "NO_MATCH", notes: "Custom TWS not in catalog", category: "NO_MATCH" },
    { rawText: "TWS 8x12 custom", expectedProduct: "NO_MATCH", notes: "Custom TWS dimensions", category: "NO_MATCH" },
    { rawText: "TWS 15x15 coverplate", expectedProduct: "NO_MATCH", notes: "Dimensions not in catalog", category: "NO_MATCH" },
    { rawText: "custom metal flashing 24 inch", expectedProduct: "NO_MATCH", notes: "Custom fabrication", category: "NO_MATCH" },
    { rawText: "wood blocking 2x4", expectedProduct: "NO_MATCH", notes: "Not stocked", category: "NO_MATCH" },
    { rawText: "concrete anchors 3/8", expectedProduct: "NO_MATCH", notes: "Not in catalog", category: "NO_MATCH" },
    { rawText: "rubber mat 4x6", expectedProduct: "NO_MATCH", notes: "Not in catalog", category: "NO_MATCH" },
    { rawText: "electrical conduit 3/4 EMT", expectedProduct: "NO_MATCH", notes: "Not RSNE inventory", category: "NO_MATCH" },
    { rawText: "copper pipe 1/2 inch", expectedProduct: "NO_MATCH", notes: "Not RSNE inventory", category: "NO_MATCH" },
    { rawText: "TWS OC 5x5", expectedProduct: "NO_MATCH", notes: "5x5 OC not in catalog", category: "NO_MATCH" },
    { rawText: "TWS IC 4x4", expectedProduct: "NO_MATCH", notes: "4x4 IC not in catalog", category: "NO_MATCH" },
    { rawText: "TWS IC 6x6", expectedProduct: "NO_MATCH", notes: "6x6 IC not in catalog", category: "NO_MATCH" },
    { rawText: "custom trim 2x8x1", expectedProduct: "NO_MATCH", notes: "Non-standard trim", category: "NO_MATCH" },
  ]
}

function generateDimensionMismatchCases(): TestCase[] {
  // These should NOT match to the wrong-dimension product
  return [
    { rawText: "OC 10x10", expectedProduct: "NO_MATCH", notes: "10x10 OC doesn't exist", category: "DIM_MISMATCH" },
    { rawText: "IC 8x8", expectedProduct: "NO_MATCH", notes: "8x8 IC doesn't exist", category: "DIM_MISMATCH" },
    { rawText: "TWS flat batten 12\"", expectedProduct: "NO_MATCH", notes: "12\" batten doesn't exist (only 6\")", category: "DIM_MISMATCH" },
    { rawText: "PVC corner 12' white", expectedProduct: "NO_MATCH", notes: "12' PVC doesn't exist", category: "DIM_MISMATCH" },
    { rawText: "FRP 4x12 white", expectedProduct: "NO_MATCH", notes: "4x12 FRP doesn't exist", category: "DIM_MISMATCH" },
  ]
}

async function main() {
  console.log("🔧 Generating comprehensive test cases from catalog...")

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { name: true, category: { select: { name: true } }, unitOfMeasure: true },
    orderBy: { name: "asc" },
  })

  console.log(`Found ${products.length} active products`)

  const cases: TestCase[] = []

  // 1. Generate variations for every catalog product
  for (const p of products) {
    const cat = p.category.name

    // TWS items get special variations
    if (p.name.startsWith("TWS")) {
      const twsVars = generateTWSVariations(p.name)
      for (const v of twsVars) {
        cases.push({ rawText: v, expectedProduct: p.name, notes: "TWS variation", category: cat })
      }
      // Also add exact and lowercase
      cases.push({ rawText: p.name, expectedProduct: p.name, notes: "Exact name", category: cat })
      cases.push({ rawText: p.name.toLowerCase(), expectedProduct: p.name, notes: "Lowercase", category: cat })
      continue
    }

    // Skip panel products (they match as panels, not catalog)
    if (p.name.includes("Insulated Metal Panel")) continue

    // Generate standard variations
    const vars = generateVariations(p.name)
    // Take first 2 variations to keep manageable (exact + one shorthand)
    for (const v of vars.slice(0, 2)) {
      cases.push({ rawText: v, expectedProduct: p.name, notes: `Variation of catalog product`, category: cat })
    }
  }

  // 2. Add manual shorthand/abbreviation cases
  const shorthands: TestCase[] = [
    { rawText: "Froth Pak", expectedProduct: "FROTH-PAK 200", notes: "Common misspelling", category: "Sealants" },
    { rawText: "froth pak", expectedProduct: "FROTH-PAK 200", notes: "Lowercase misspelling", category: "Sealants" },
    { rawText: "frothpak", expectedProduct: "FROTH-PAK 200", notes: "No space", category: "Sealants" },
    { rawText: "butyl", expectedProduct: "Butyl Caulk", notes: "Single word", category: "Sealants" },
    { rawText: "silicone white", expectedProduct: "Silicone sealant (White)", notes: "Shorthand", category: "Sealants" },
    { rawText: "silicone clear", expectedProduct: "Silicone Sealant (Clear)", notes: "Shorthand", category: "Sealants" },
    { rawText: "silicone alum", expectedProduct: "Silicone Sealant (Aluminum)", notes: "Shorthand", category: "Sealants" },
    { rawText: "mag gasket 8", expectedProduct: "MAGNETIC GASKET 8'", notes: "Abbreviation", category: "Door Hardware" },
    { rawText: "mag gasket", expectedProduct: "MAGNETIC GASKET 8'", notes: "No size", category: "Door Hardware" },
    { rawText: "T bar", expectedProduct: "T BAR 4\" - 16'", notes: "Ambiguous size", category: "Trim" },
    { rawText: "t-bar 5", expectedProduct: "T BAR 5\" - 16", notes: "With size hint", category: "Trim" },
    { rawText: "tek screws", expectedProduct: "#12 TEK 5", notes: "Common shorthand", category: "Fasteners" },
    { rawText: "tek 5", expectedProduct: "#12 TEK 5", notes: "Even shorter", category: "Fasteners" },
    { rawText: "#12 tek", expectedProduct: "#12 TEK 5", notes: "With gauge", category: "Fasteners" },
    { rawText: "shots & pins", expectedProduct: "Shots & Pins", notes: "Exact name", category: "Fasteners" },
    { rawText: "shots and pins", expectedProduct: "Shots & Pins", notes: "And instead of &", category: "Fasteners" },
    { rawText: "D90 handle", expectedProduct: "D90 Handle", notes: "Door hardware", category: "Door Hardware" },
    { rawText: "D690 hinge", expectedProduct: "HINGE D690", notes: "Reversed order", category: "Door Hardware" },
    { rawText: "K56 latch", expectedProduct: "K56 Latch (Body Chrome)", notes: "Partial name", category: "Door Hardware" },
    { rawText: "K56 strike", expectedProduct: "K56 Strike", notes: "Door hardware", category: "Door Hardware" },
    { rawText: "door closer", expectedProduct: "D276 Door Closer", notes: "Generic name", category: "Door Hardware" },
    { rawText: "glow push panel", expectedProduct: "Glow Push Panel", notes: "Safety item", category: "Door Hardware" },
    { rawText: "FRP 4x8 white", expectedProduct: "FRP 4' X 8' WHITE", notes: "Common shorthand", category: "Trim" },
    { rawText: "FRP 4x10", expectedProduct: "FRP 4' X 10' WHITE", notes: "No color specified", category: "Trim" },
    { rawText: "FRP 4x8 black", expectedProduct: "FRP 4' X 8' BLACK", notes: "With color", category: "Trim" },
    { rawText: "diamond plate 4x8", expectedProduct: "Diamond Plate .063 4' x 8'", notes: "Common material", category: "Metals" },
    { rawText: "DP 4x8", expectedProduct: "Diamond Plate .063 4' x 8'", notes: "Abbreviation", category: "Metals" },
    { rawText: "diamond plate 4x10", expectedProduct: "Diamond Plate .063 4' x 10'", notes: "Larger size", category: "Metals" },
    { rawText: "EPS 3.5 4x8", expectedProduct: "EPS Sheet 3.5\" x 4' x 8'", notes: "Insulation shorthand", category: "Insulation" },
    { rawText: "EPS 2 4x8", expectedProduct: "EPS Sheet 2\" x 4' x 8'", notes: "2 inch EPS", category: "Insulation" },
    { rawText: "trymer 3.5", expectedProduct: "TRYMER 200L 3-1/2\" - 48\" X 96\"", notes: "Insulation brand", category: "Insulation" },
    { rawText: "trymer 4", expectedProduct: "TRYMER 200L 4\" - 48\" X 96\"", notes: "Insulation brand", category: "Insulation" },
    { rawText: "ADFOAM", expectedProduct: "ADFOAM 1875", notes: "Brand name only", category: "Sealants" },
    { rawText: "PVC corner white 8", expectedProduct: "PVC Corner 8' White", notes: "Reordered words", category: "Trim" },
    { rawText: "PVC corner 10 white", expectedProduct: "PVC Corner 10' White", notes: "Without foot mark", category: "Trim" },
    { rawText: "PVC batten white", expectedProduct: "PVC Batten - White 8'", notes: "Trim item", category: "Trim" },
    { rawText: "battens", expectedProduct: "Battens", notes: "Exact catalog name", category: "Trim" },
    { rawText: "unistrut", expectedProduct: "Unistrut", notes: "Common material", category: "Trim" },
    { rawText: "unistrut 10'", expectedProduct: "Unistrut - 1-5/8\" x 1-5/8\" x 10'", notes: "With length", category: "Trim" },
    { rawText: "threaded rod 3/8 6", expectedProduct: "Threaded Rod 3/8\" x 6'", notes: "Fastener with size", category: "Trim" },
    { rawText: "threaded rod 1/2 10", expectedProduct: "Threaded Rod 1/2-13x10'", notes: "Fastener with size", category: "Trim" },
    { rawText: "TREMCO JS-773", expectedProduct: "TREMCO JS-773 BUTYL SEALANT", notes: "Brand + model", category: "Sealants" },
    { rawText: "tremco butyl", expectedProduct: "TREMCO JS-773 BUTYL SEALANT", notes: "Brand + type", category: "Sealants" },
    { rawText: "strip curtains 3x7", expectedProduct: "Strip Curtains 3x7", notes: "Door accessory", category: "Doors" },
    { rawText: "strip curtains 5x7", expectedProduct: "Strip Curtains 5x7", notes: "Door accessory", category: "Doors" },
    { rawText: "heater wire 12'", expectedProduct: "12' - HEATER, WIRE ALUM BRAID", notes: "Heater wire", category: "Door Hardware" },
    { rawText: "heater wire 32", expectedProduct: "32' - HEATER, WIRE ALUM BRAID", notes: "Heater wire longer", category: "Door Hardware" },
    { rawText: "wiper gasket 8.5", expectedProduct: "Wiper Gasket 8.5\"", notes: "Door gasket", category: "Door Hardware" },
    { rawText: "wiper gasket 3", expectedProduct: "Wiper Gasket 3\"", notes: "Slider gasket", category: "Door Hardware" },
    { rawText: "galv sheet 4x8 20ga", expectedProduct: "Galvanized Sheet 4' x 8' (20ga)", notes: "Metal sheet", category: "Metals" },
    { rawText: "alum flat", expectedProduct: "ALUM FLAT", notes: "Aluminum flat bar", category: "Trim" },
    { rawText: "pine 5/8 4x8", expectedProduct: "19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8\")", notes: "Plywood shorthand", category: "Wood" },
    { rawText: "plywood 3/4 4x8", expectedProduct: "23/32X48X96 ARAUCO AC RADIATA PINE Sanded (3/4\")", notes: "Plywood common name", category: "Wood" },
    { rawText: "GLUE 5635", expectedProduct: "GLUE 5635", notes: "Exact name", category: "Sealants" },
    { rawText: "poly foam", expectedProduct: "POLY FOAM", notes: "Exact name", category: "Misc" },
    { rawText: "VGT tape 4", expectedProduct: "VGT Tape 4\"", notes: "Vapor guard tape", category: "Trim" },
    { rawText: "VGT tape 6", expectedProduct: "VGT Tape 6\"", notes: "Vapor guard tape", category: "Trim" },
    { rawText: "vent port heated", expectedProduct: "VENT PORT - HEATED", notes: "Vent port", category: "Trim" },
    { rawText: "splice plate 5", expectedProduct: "Splice Plate Kit 5\"", notes: "Ceiling hardware", category: "Trim" },
    { rawText: "beam clamp", expectedProduct: "Junior Beam Clamp", notes: "Ceiling hardware", category: "Trim" },
  ]
  cases.push(...shorthands)

  // 3. Add NO_MATCH cases
  cases.push(...generateNoMatchCases())

  // 4. Add dimension mismatch cases
  cases.push(...generateDimensionMismatchCases())

  // 5. Add panel cases
  cases.push(...generatePanelVariations())

  // Deduplicate by rawText
  const seen = new Set<string>()
  const unique = cases.filter(c => {
    const key = c.rawText.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Write to file
  const outPath = join(__dirname, "test-cases.json")
  writeFileSync(outPath, JSON.stringify(unique, null, 2))

  console.log(`\n✅ Generated ${unique.length} test cases`)
  console.log(`   Categories: ${[...new Set(unique.map(c => c.category))].join(", ")}`)
  console.log(`   NO_MATCH cases: ${unique.filter(c => c.expectedProduct === "NO_MATCH").length}`)
  console.log(`   DIM_MISMATCH cases: ${unique.filter(c => c.category === "DIM_MISMATCH").length}`)
  console.log(`   Panel cases: ${unique.filter(c => c.expectedProduct === "PANEL_MATCH").length}`)
  console.log(`   Written to: ${outPath}`)

  await prisma.$disconnect()
}

main().catch(console.error)
