// Panel & Ramp spec types, material options, and recipe system

export interface PanelSpecs {
  width: string       // e.g. "48" (inches) or "4" (feet) — stored as inches
  length: string      // e.g. "120" (inches) — stored as inches
  insulation: string  // EPS | PIR | Dow High-Load
  insulationThickness: string // e.g. "2", "3", "3.5", "4", "5"
  side1Material: string // FRP | TWS | SS | SWS | None | Other (custom)
  side2Material: string // FRP | TWS | SS | SWS | None | Other (custom)
}

export interface RampSpecs {
  width: string         // inches
  length: string        // inches
  height: string        // inches — highest point on ramp
  bottomLip: string     // inches
  topLip: string        // inches
  insulation: string    // EPS | PIR | Dow High-Load
  diamondPlateThickness: string // .063 | .125 | .25
}

// ── Option constants ──

export const INSULATION_OPTIONS = ["EPS", "PIR", "Dow High-Load"] as const

export const INSULATION_THICKNESS_OPTIONS = ["2", "3", "3.5", "4", "5"] as const

export const PANEL_MATERIAL_OPTIONS = ["FRP", "TWS", "SS", "SWS", "None"] as const

export const DIAMOND_PLATE_OPTIONS = [".063", ".125", ".25"] as const

// Dimension constraints
export const PANEL_MAX_WIDTH_INCHES = 48   // 4 feet
export const PANEL_MAX_LENGTH_INCHES = 240 // 20 feet

// ── Defaults ──

export function getDefaultPanelSpecs(type: "WALL_PANEL" | "FLOOR_PANEL"): PanelSpecs {
  const isFloor = type === "FLOOR_PANEL"
  return {
    width: "",
    length: "",
    insulation: "EPS",
    insulationThickness: "",
    side1Material: isFloor ? "None" : "FRP",
    side2Material: isFloor ? "None" : "FRP",
  }
}

export function getDefaultRampSpecs(): RampSpecs {
  return {
    width: "",
    length: "",
    height: "",
    bottomLip: "",
    topLip: "",
    insulation: "EPS",
    diamondPlateThickness: ".063",
  }
}

// ── Recipe matching ──
// Maps panel specs to component name/qty list based on template patterns

export interface RecipeComponent {
  name: string
  qty: number
}

/**
 * Calculate how many sheets are needed to cover a panel length.
 * EPS/PIR foam come in 8' and 10' pieces. FRP comes in 4x8 and 4x10.
 *
 * Rules (from Gabe):
 * - If panel fits in one sheet (≤8' or ≤10'), use one sheet of that size.
 * - If panel is longer than the largest piece (>10'), use multiples of the
 *   SMALLER size (8') — e.g. a 14' panel = ceil(14/8) = 2 sheets of 8'.
 */
function sheetCoverage(lengthFt: number, sizes: number[] = [8, 10]): { size: number; qty: number } {
  const sorted = [...sizes].sort((a, b) => a - b)
  const smallest = sorted[0]
  const largest = sorted[sorted.length - 1]

  if (lengthFt <= smallest) return { size: smallest, qty: 1 }
  if (lengthFt <= largest) return { size: largest, qty: 1 }
  // Longer than largest → use multiples of smallest
  return { size: smallest, qty: Math.ceil(lengthFt / smallest) }
}

/**
 * Calculate components for any panel size based on specs.
 * Works for both standard and custom sizes.
 */
export function matchPanelRecipe(
  specs: PanelSpecs,
  type: "WALL_PANEL" | "FLOOR_PANEL"
): RecipeComponent[] {
  const widthIn = parseFloat(specs.width) || 0
  const lengthIn = parseFloat(specs.length) || 0
  const thicknessIn = parseFloat(specs.insulationThickness) || 0

  if (!widthIn || !lengthIn) return []

  const lengthFt = lengthIn / 12

  if (type === "FLOOR_PANEL") {
    return matchFloorRecipe(lengthFt, thicknessIn, specs)
  }
  return matchWallRecipe(lengthFt, thicknessIn, specs)
}

function matchWallRecipe(
  lengthFt: number,
  thicknessIn: number,
  specs: PanelSpecs
): RecipeComponent[] {
  const components: RecipeComponent[] = []

  // Plywood substrate — 4x8 sheets (48"x96")
  const plyThickness = thicknessIn >= 3 ? '19/32' : '11/32'
  const plyLabel = thicknessIn >= 3 ? '(5/8")' : '(3/8")'
  const plyCoverage = sheetCoverage(lengthFt, [8])
  components.push({
    name: `${plyThickness}X48X96 ARAUCO AC RADIATA PINE Sanded ${plyLabel}`,
    qty: plyCoverage.qty * (lengthFt <= 8 ? 2.0 : 2.5),
  })

  // Foam insulation — EPS/PIR come in 8' and 10' pieces
  if (specs.insulation === "EPS" || specs.insulation === "PIR") {
    const foamThickness = thicknessIn >= 3 ? `${thicknessIn}"` : '2"'
    const foam = sheetCoverage(lengthFt, [8, 10])
    components.push({
      name: `EPS Sheet ${foamThickness} x 4' x ${foam.size}'`,
      qty: foam.qty,
    })
  } else if (specs.insulation === "Dow High-Load") {
    const foam = sheetCoverage(lengthFt, [8])
    components.push({
      name: `Dow High-Load Insulation ${thicknessIn || 2}" x 4' x 8'`,
      qty: foam.qty,
    })
  }

  // Skin materials — each side independently
  function addSkin(material: string) {
    if (!material || material === "None") return
    if (material === "FRP") {
      const frp = sheetCoverage(lengthFt, [8, 10])
      const frpName = frp.size === 10 ? "FRP 4 x 10" : "FRP .090 4' x 8' White"
      components.push({ name: frpName, qty: frp.qty })
    } else {
      // TWS, SS, SWS, or custom — sq ft based (4' wide panels)
      const sqFt = 4 * lengthFt
      components.push({ name: `${material} Sheet`, qty: Math.ceil(sqFt / 32) })
    }
  }
  addSkin(specs.side1Material)
  addSkin(specs.side2Material)

  // Adhesive
  components.push({ name: "Contact Cement 5 gallon", qty: lengthFt <= 10 ? 0.5 : 1.0 })

  return components
}

function matchFloorRecipe(
  lengthFt: number,
  thicknessIn: number,
  specs: PanelSpecs
): RecipeComponent[] {
  const components: RecipeComponent[] = []

  // Trymer insulation for floors (comes in 48"x96" = 4x8 sheets)
  const trymerThickness = thicknessIn >= 5 ? '5"' : '3-1/2"'
  const trymerCoverage = sheetCoverage(lengthFt, [8])
  components.push({
    name: `TRYMER 200L ${trymerThickness} - 48" X 96"`,
    qty: trymerCoverage.qty,
  })

  // Plywood substrate
  const plyName = thicknessIn >= 5
    ? '23/32X48X96 ARAUCO AC RADIATA PINE Sanded (3/4")'
    : '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")'
  const plyCoverage = sheetCoverage(lengthFt, [8])
  components.push({ name: plyName, qty: plyCoverage.qty })

  // Diamond plate (4x8 sheets)
  const dpCoverage = sheetCoverage(lengthFt, [8])
  components.push({ name: "Diamond Plate .063 Aluminum 4 x 8", qty: dpCoverage.qty })

  // Galvanized steel for longer panels
  if (lengthFt >= 10) {
    components.push({ name: "Galvanized Steel Coil - Textured White (26ga)", qty: Math.ceil(lengthFt * 4) })
  }

  // Adhesive
  components.push({ name: "Contact Cement 5 gallon", qty: lengthFt <= 10 ? 0.5 : 1.0 })

  return components
}

/**
 * Calculate ramp components based on dimensions.
 */
export function matchRampRecipe(specs: RampSpecs): RecipeComponent[] {
  const components: RecipeComponent[] = []
  const widthIn = parseFloat(specs.width) || 0
  const lengthIn = parseFloat(specs.length) || 0

  if (!widthIn || !lengthIn) return []

  const sqFt = (widthIn * lengthIn) / 144

  // Diamond plate — 4x8 sheets (32 sq ft each)
  const dpSheets = Math.ceil(sqFt / 32)
  components.push({
    name: `Diamond Plate ${specs.diamondPlateThickness || ".063"} Aluminum 4 x 8`,
    qty: dpSheets,
  })

  // Insulation — same sheet coverage logic
  const lengthFt = lengthIn / 12
  if (specs.insulation === "EPS" || specs.insulation === "PIR") {
    const foam = sheetCoverage(lengthFt, [8, 10])
    components.push({
      name: `EPS Sheet 2" x 4' x ${foam.size}'`,
      qty: foam.qty,
    })
  } else if (specs.insulation === "Dow High-Load") {
    const foam = sheetCoverage(lengthFt, [8])
    components.push({
      name: `Dow High-Load Insulation 2" x 4' x 8'`,
      qty: foam.qty,
    })
  }

  // Steel framing — perimeter + internal
  const perimeterFt = (widthIn + lengthIn) * 2 / 12
  components.push({ name: "Steel Angle 2x2x1/8", qty: Math.ceil(perimeterFt / 8) })

  return components
}

// ── Type labels (shared across UI) ──

export const FAB_TYPE_LABELS: Record<string, string> = {
  DOOR: "Door",
  FLOOR_PANEL: "Floor Panel",
  WALL_PANEL: "Wall Panel",
  RAMP: "Ramp",
}
