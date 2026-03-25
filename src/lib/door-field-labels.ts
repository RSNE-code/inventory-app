// ---------------------------------------------------------------------------
// door-field-labels.ts — Single source of truth for human-readable field labels
// Used by confirmation page, change log, assembly cards, and spec sheets.
// ---------------------------------------------------------------------------

/** Map of every DoorSpecs field name to a human-readable label */
export const DOOR_FIELD_LABELS: Record<string, string> = {
  // Identity
  doorCategory: "Door Category",
  serialNumber: "Serial Number",
  label: "Label",

  // Job
  jobNumber: "Job Number",
  jobName: "Job Name",
  jobSiteName: "Job Site",

  // Dimensions
  widthInClear: "Width (in clear)",
  heightInClear: "Height (in clear)",
  wallThickness: "Wall Thickness",
  jambDepth: "Jamb Depth",

  // Door Type
  temperatureType: "Temperature",
  openingType: "Opening Type",
  hingeSide: "Hinge Side",
  slideSide: "Slide Side",

  // Frame
  frameType: "Frame Type",
  frameCustom: "Custom Frame",
  frameLHS: "Frame Left",
  frameRHS: "Frame Right",
  frameTop: "Frame Top",
  highSill: "High Sill",
  sillHeight: "Sill Height",
  wiper: "Wiper",

  // Insulation
  panelThickness: "Panel Thickness",
  panelInsulated: "Panel Insulated",
  insulation: "Insulation",
  insulationType: "Insulation Type",

  // Finish
  finish: "Finish",
  skinMaterial: "Skin Material",

  // Window
  windowSize: "Window",
  windowHeated: "Heated Window",

  // Hardware — Hinges
  hingeMfrName: "Hinge Manufacturer",
  hingeModel: "Hinge Model",
  hingeOffset: "Hinge Offset",

  // Hardware — Latch
  latchMfrName: "Latch Manufacturer",
  latchModel: "Latch Model",
  latchOffset: "Latch Offset",
  insideRelease: "Inside Release",

  // Hardware — Closer
  closerModel: "Closer",

  // Heater
  heaterSize: "Heater Size",
  heaterCableLocation: "Heater Location",

  // Gasket
  gasketType: "Gasket Type",

  // Cutouts
  cutouts: "Cutouts",

  // Exterior
  isExterior: "Exterior Door",

  // Options
  weatherShield: "Weather Shield",
  thresholdPlate: "Threshold Plate",
  additionalItems: "Additional Items",

  // Sliding door
  doorPull: "Door Pull",
  trackType: "Track Type",

  // Notes
  specialNotes: "Special Notes",
  infoLine: "Info",

  // Quantities
  quantity: "Quantity",

  // Legacy fields (old door sheet format)
  width: "Width",
  height: "Height",
  doorType: "Type",
  hardware: "Hardware",
}

/** Enum value → friendly display label */
const ENUM_LABELS: Record<string, string> = {
  // DoorCategory
  HINGED_COOLER: "Hinged Cooler",
  HINGED_FREEZER: "Hinged Freezer",
  SLIDING: "Sliding",

  // TemperatureType
  COOLER: "Cooler",
  FREEZER: "Freezer",

  // OpeningType
  HINGE: "Hinged",
  SLIDE: "Sliding",

  // FrameType
  FULL_FRAME: "Full Frame",
  FACE_FRAME: "Face Frame",
  BALLY_TYPE: "Bally Type",

  // GasketType
  MAGNETIC: "Magnetic",
  NEOPRENE: "Neoprene",

  // Side
  LEFT: "Left",
  RIGHT: "Right",

  // InsulationType
  IMP: "IMP",
  EPS: "EPS",
  PIR: "PIR",

  // FinishType
  WPG: "WPG",
  SS: "Stainless Steel",
  Gray: "Gray",
}

/**
 * Get a human-readable label for a DoorSpecs field name.
 * Falls back to proper Title Case conversion if field not in registry.
 */
export function getDoorFieldLabel(field: string): string {
  if (DOOR_FIELD_LABELS[field]) return DOOR_FIELD_LABELS[field]

  // Fallback: proper camelCase → Title Case (handles "hingeMfrName" → "Hinge Mfr Name")
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

/**
 * Format a door spec field value for display.
 * Converts booleans, enum values, and arrays to readable strings.
 */
export function formatDoorFieldValue(field: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.join(", ")

  const str = String(value)

  // Check if value is a known enum
  if (ENUM_LABELS[str]) return ENUM_LABELS[str]

  // Check for SCREAMING_SNAKE_CASE patterns (unknown enums)
  if (/^[A-Z][A-Z0-9_]+$/.test(str)) {
    return str
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ")
  }

  return str
}

// ---------------------------------------------------------------------------
// Hardware value splitting — "DENT D276" → { manufacturer: "DENT", model: "D276" }
// ---------------------------------------------------------------------------

/** Known manufacturer prefixes for hardware items that don't store mfr separately */
const KNOWN_HARDWARE_MFRS: Record<string, string> = {
  K481: "Kason",
  K1094: "Kason",
  K55: "Kason",
  K56: "Kason",
  K1245: "Kason",
  K1248: "Kason",
  K1277: "Kason",
  DENT: "DENT",
  D276: "DENT",
  D690: "DENT",
  D90: "DENT",
}

/**
 * Split a combined hardware value like "DENT D276" into manufacturer + model.
 * Handles: "DENT D276" → { manufacturer: "DENT", model: "D276" }
 *          "Kason K1094" → { manufacturer: "Kason", model: "K1094" }
 *          "K481 Safety Glow" → { manufacturer: "Kason", model: "K481 Safety Glow" }
 *          "Glow Push Panel" → { model: "Glow Push Panel" }
 */
export function splitHardwareValue(value?: string): { manufacturer?: string; model?: string } {
  if (!value) return {}

  const parts = value.trim().split(" ")
  const firstWord = parts[0]

  // Check if the first word is a known manufacturer name
  if (firstWord === "DENT" || firstWord === "Kason") {
    return {
      manufacturer: firstWord,
      model: parts.slice(1).join(" ") || firstWord,
    }
  }

  // Check if the first word is a known model prefix → look up manufacturer
  if (KNOWN_HARDWARE_MFRS[firstWord]) {
    return {
      manufacturer: KNOWN_HARDWARE_MFRS[firstWord],
      model: value,
    }
  }

  // No manufacturer detected
  return { model: value }
}
