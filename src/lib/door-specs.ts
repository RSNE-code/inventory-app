// Door spec field definitions, validation, and gap detection
// Based on real RSNE door sheets: DR COOLER, DR FREEZER, MHS sliding door PDFs

export type DoorCategory = "HINGED_COOLER" | "HINGED_FREEZER" | "SLIDING"
export type TemperatureType = "COOLER" | "FREEZER"
export type OpeningType = "HINGE" | "SLIDE"
export type FrameType = "FULL_FRAME" | "FACE_FRAME" | "BALLY_TYPE"
export type GasketType = "MAGNETIC" | "NEOPRENE"
export type Side = "LEFT" | "RIGHT"

export interface DoorSpecs {
  // Identity
  doorCategory: DoorCategory
  serialNumber?: string
  label: boolean

  // Job
  jobNumber?: string
  jobName?: string
  jobSiteName?: string

  // Dimensions
  widthInClear: string
  heightInClear: string
  wallThickness?: string
  jambDepth?: string

  // Door Type
  temperatureType: TemperatureType
  openingType: OpeningType
  hingeSide?: Side
  slideSide?: Side

  // Frame
  frameType: FrameType
  highSill: boolean
  wiper: boolean

  // Panel / Insulation
  panelThickness?: string
  panelInsulated: boolean
  insulation?: string

  // Skin / Finish
  finish: string
  skinMaterial?: string

  // Hardware - Hinges
  hingeMfrName?: string
  hingeModel?: string
  hingeOffset?: string

  // Hardware - Latch
  latchMfrName?: string
  latchModel?: string
  latchOffset?: string
  insideRelease?: string

  // Hardware - Closer
  closerModel?: string

  // Heater (freezer doors)
  heaterSize?: string
  heaterCableLocation?: string

  // Gasket
  gasketType: GasketType

  // Options (from engineering sheet)
  weatherShield: boolean
  thresholdPlate: boolean

  // Sliding door specific
  doorPull?: string
  trackType?: string

  // Notes
  specialNotes?: string
  infoLine?: string

  // Quantities
  quantity: number
}

export interface GapQuestion {
  field: string
  question: string
  options?: string[]
}

type FieldMeta = {
  label: string
  type: "text" | "select" | "checkbox" | "number"
  options?: string[]
  required: boolean
  categories: DoorCategory[] | "all"
}

export const FIELD_METADATA: Record<string, FieldMeta> = {
  doorCategory: {
    label: "Door Category",
    type: "select",
    options: ["HINGED_COOLER", "HINGED_FREEZER", "SLIDING"],
    required: true,
    categories: "all",
  },
  widthInClear: { label: "Width (in clear)", type: "text", required: true, categories: "all" },
  heightInClear: { label: "Height (in clear)", type: "text", required: true, categories: "all" },
  temperatureType: {
    label: "Temperature Type",
    type: "select",
    options: ["COOLER", "FREEZER"],
    required: true,
    categories: "all",
  },
  openingType: {
    label: "Opening Type",
    type: "select",
    options: ["HINGE", "SLIDE"],
    required: true,
    categories: "all",
  },
  frameType: {
    label: "Frame Type",
    type: "select",
    options: ["FULL_FRAME", "FACE_FRAME", "BALLY_TYPE"],
    required: true,
    categories: ["HINGED_COOLER", "HINGED_FREEZER"],
  },
  finish: { label: "Finish", type: "text", required: true, categories: "all" },
  gasketType: {
    label: "Gasket Type",
    type: "select",
    options: ["MAGNETIC", "NEOPRENE"],
    required: true,
    categories: "all",
  },
  hingeSide: {
    label: "Hinge Side",
    type: "select",
    options: ["LEFT", "RIGHT"],
    required: true,
    categories: ["HINGED_COOLER", "HINGED_FREEZER"],
  },
  slideSide: {
    label: "Slide Side",
    type: "select",
    options: ["LEFT", "RIGHT"],
    required: true,
    categories: ["SLIDING"],
  },
  jambDepth: {
    label: "Jamb Depth",
    type: "text",
    required: true,
    categories: ["HINGED_COOLER", "HINGED_FREEZER"],
  },
  heaterSize: {
    label: "Heater Size",
    type: "text",
    required: true,
    categories: ["HINGED_FREEZER"],
  },
  quantity: { label: "Quantity", type: "number", required: true, categories: "all" },
}

const GAP_QUESTIONS: Record<string, GapQuestion> = {
  doorCategory: {
    field: "doorCategory",
    question: "What type of door is this?",
    options: ["Hinged Cooler", "Hinged Freezer", "Sliding"],
  },
  widthInClear: {
    field: "widthInClear",
    question: "What is the door width (in clear)?",
  },
  heightInClear: {
    field: "heightInClear",
    question: "What is the door height (in clear)?",
  },
  temperatureType: {
    field: "temperatureType",
    question: "Cooler or Freezer?",
    options: ["Cooler", "Freezer"],
  },
  openingType: {
    field: "openingType",
    question: "Hinge or Sliding door?",
    options: ["Hinge", "Slide"],
  },
  frameType: {
    field: "frameType",
    question: "What frame type?",
    options: ["Full Frame", "Face Frame", "Bally Type"],
  },
  finish: {
    field: "finish",
    question: "What finish? (e.g., WPG, White/White, Stainless)",
  },
  gasketType: {
    field: "gasketType",
    question: "Gasket type?",
    options: ["Magnetic", "Neoprene"],
  },
  hingeSide: {
    field: "hingeSide",
    question: "Which side are the hinges on?",
    options: ["Right", "Left"],
  },
  slideSide: {
    field: "slideSide",
    question: "Which side does the door slide to?",
    options: ["Right", "Left"],
  },
  jambDepth: {
    field: "jambDepth",
    question: "What is the jamb depth? (e.g., 2\", 4\")",
  },
  heaterSize: {
    field: "heaterSize",
    question: "What heater size? (in feet, e.g., 32 FT)",
  },
  quantity: {
    field: "quantity",
    question: "How many doors?",
  },
}

export function getRequiredFieldsForCategory(category: DoorCategory): string[] {
  return Object.entries(FIELD_METADATA)
    .filter(([, meta]) => {
      if (!meta.required) return false
      if (meta.categories === "all") return true
      return meta.categories.includes(category)
    })
    .map(([key]) => key)
}

export function findSpecGaps(
  specs: Partial<DoorSpecs>,
  category?: DoorCategory
): GapQuestion[] {
  const cat = category || specs.doorCategory
  if (!cat) {
    return [GAP_QUESTIONS.doorCategory]
  }

  const required = getRequiredFieldsForCategory(cat)
  const gaps: GapQuestion[] = []

  for (const field of required) {
    const value = specs[field as keyof DoorSpecs]
    if (value === undefined || value === null || value === "") {
      const gapQ = GAP_QUESTIONS[field]
      if (gapQ) gaps.push(gapQ)
    }
  }

  return gaps
}

export function getDoorCategoryLabel(cat: DoorCategory): string {
  switch (cat) {
    case "HINGED_COOLER": return "RSNE Hinged Cooler Door"
    case "HINGED_FREEZER": return "RSNE Hinged Freezer Door"
    case "SLIDING": return "RSNE Manual Horizontal Sliding Door"
  }
}

export function getFrameTypeLabel(ft: FrameType): string {
  switch (ft) {
    case "FULL_FRAME": return "Full Frame"
    case "FACE_FRAME": return "Face Frame"
    case "BALLY_TYPE": return "Bally Type"
  }
}

export function formatDoorSize(specs: Partial<DoorSpecs>): string {
  if (!specs.widthInClear || !specs.heightInClear) return ""
  return `${specs.widthInClear} x ${specs.heightInClear}`
}

/** Standard RSNE hardware lookup — varies by door type and size.
 *  Derived from actual assembly templates in prisma/seed-assemblies.ts */

export interface HardwareDefaults {
  hingeMfrName?: string
  hingeModel?: string
  hingeQty?: number
  latchMfrName?: string
  latchModel?: string
  closerModel?: string
  gasketType?: GasketType
}

/**
 * Parse a width string (e.g. "36\"", "48", "3'", "4ft") into inches.
 * Returns 0 if unparseable.
 */
function parseWidthInches(w: string): number {
  const s = w.replace(/["\s]/g, "").toLowerCase()
  // Check for feet notation: 3', 3ft, 4ft
  const ftMatch = s.match(/^(\d+)(?:ft|')$/)
  if (ftMatch) return parseInt(ftMatch[1], 10) * 12
  // Plain number — if <= 10 treat as feet, else inches
  const n = parseFloat(s)
  if (isNaN(n)) return 0
  return n <= 10 ? n * 12 : n
}

/**
 * Get standard hardware for a given door type and size.
 * Based on RSNE assembly templates — hardware varies by door category and width.
 */
export function getStandardHardware(
  category?: DoorCategory,
  widthInClear?: string,
  isExterior?: boolean,
): HardwareDefaults {
  if (!category || category === "SLIDING") {
    // Sliders have no hinges/latches/closers — they use floor rollers, strikers, tongues
    return {}
  }

  const widthIn = widthInClear ? parseWidthInches(widthInClear) : 0

  // Exterior doors (cooler or freezer) — K1245 hinges, K56 latch, no closer
  if (isExterior) {
    return {
      hingeMfrName: "Kason",
      hingeModel: "K1245",
      hingeQty: 2,
      latchMfrName: "Kason",
      latchModel: "K56",
      closerModel: undefined,
      gasketType: "NEOPRENE",
    }
  }

  // 5' wide (60") and up — K1277 cam-lift (3), K55 Complete latch, no closer
  if (widthIn >= 60) {
    return {
      hingeMfrName: "Kason",
      hingeModel: "K1277 Cam-lift",
      hingeQty: 3,
      latchMfrName: "Kason",
      latchModel: "K55 Complete",
      closerModel: undefined,
      gasketType: "NEOPRENE",
    }
  }

  // 4' wide (48") — K1277 cam-lift (2), K56 latch, no closer
  if (widthIn >= 48) {
    return {
      hingeMfrName: "Kason",
      hingeModel: "K1277 Cam-lift",
      hingeQty: 2,
      latchMfrName: "Kason",
      latchModel: "K56",
      closerModel: undefined,
      gasketType: "NEOPRENE",
    }
  }

  // 3' wide (36") standard — DENT D690, D90, D276 closer
  return {
    hingeMfrName: "DENT",
    hingeModel: "D690",
    hingeQty: 2,
    latchMfrName: "DENT",
    latchModel: "D90",
    closerModel: "DENT D276",
    gasketType: "MAGNETIC",
  }
}

/** Default values for a new door spec — booleans default to false, quantity to 1.
 *  Hardware is NOT included here — call getStandardHardware() after type/size are known. */
export function getDefaultSpecs(): Partial<DoorSpecs> {
  return {
    label: true,
    highSill: false,
    wiper: false,
    panelInsulated: true,
    weatherShield: false,
    thresholdPlate: false,
    quantity: 1,
  }
}

/** Resolve gap answer string to the correct typed value */
export function resolveGapAnswer(
  field: string,
  answer: string
): Partial<DoorSpecs> {
  const upper = answer.toUpperCase().trim()
  switch (field) {
    case "doorCategory":
      if (upper.includes("COOLER") && !upper.includes("FREEZ"))
        return { doorCategory: "HINGED_COOLER", temperatureType: "COOLER", openingType: "HINGE" }
      if (upper.includes("FREEZ"))
        return { doorCategory: "HINGED_FREEZER", temperatureType: "FREEZER", openingType: "HINGE" }
      if (upper.includes("SLID"))
        return { doorCategory: "SLIDING", openingType: "SLIDE" }
      return {}
    case "temperatureType":
      return { temperatureType: upper.includes("FREEZ") ? "FREEZER" : "COOLER" }
    case "openingType":
      return { openingType: upper.includes("SLID") ? "SLIDE" : "HINGE" }
    case "frameType":
      if (upper.includes("FULL")) return { frameType: "FULL_FRAME" }
      if (upper.includes("BALLY")) return { frameType: "BALLY_TYPE" }
      return { frameType: "FACE_FRAME" }
    case "gasketType":
      return { gasketType: upper.includes("NEO") ? "NEOPRENE" : "MAGNETIC" }
    case "hingeSide":
      return { hingeSide: upper.includes("LEFT") ? "LEFT" : "RIGHT" }
    case "slideSide":
      return { slideSide: upper.includes("LEFT") ? "LEFT" : "RIGHT" }
    case "quantity":
      return { quantity: parseInt(answer, 10) || 1 }
    default:
      return { [field]: answer.trim() } as Partial<DoorSpecs>
  }
}
