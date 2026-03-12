import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import type { DoorSpecs, GapQuestion } from "@/lib/door-specs"
import { findSpecGaps, getDefaultSpecs, getStandardHardware } from "@/lib/door-specs"

const MODEL = anthropic("claude-sonnet-4-6")

const DOOR_SPEC_SCHEMA = `{
  "doorCategory": "HINGED_COOLER | HINGED_FREEZER | SLIDING | null",
  "serialNumber": "string|null",
  "label": "boolean|null",
  "jobNumber": "string|null",
  "jobName": "string|null",
  "jobSiteName": "string|null",
  "widthInClear": "string|null — e.g. 36\\"",
  "heightInClear": "string|null — e.g. 77-1/4\\"",
  "wallThickness": "string|null",
  "jambDepth": "string|null",
  "temperatureType": "COOLER | FREEZER | null",
  "openingType": "HINGE | SLIDE | null",
  "hingeSide": "LEFT | RIGHT | null",
  "slideSide": "LEFT | RIGHT | null",
  "frameType": "FULL_FRAME | FACE_FRAME | BALLY_TYPE | null",
  "highSill": "boolean|null",
  "sillHeight": "string|null — floor to bottom of clear opening for high sill doors",
  "wiper": "boolean|null",
  "frameCustom": "boolean|null — true if custom frame dimensions provided",
  "frameLHS": "string|null — custom left jamb dimension",
  "frameRHS": "string|null — custom right jamb dimension",
  "frameTop": "string|null — custom header dimension",
  "panelThickness": "string|null",
  "panelInsulated": "boolean|null",
  "insulation": "string|null",
  "finish": "string|null — e.g. WPG, White/White, SS",
  "skinMaterial": "string|null",
  "hingeMfrName": "string|null — e.g. DENT, Kason",
  "hingeModel": "string|null — e.g. D690CS",
  "hingeOffset": "string|null",
  "latchMfrName": "string|null",
  "latchModel": "string|null — e.g. D90",
  "latchOffset": "string|null",
  "insideRelease": "string|null",
  "closerModel": "string|null — e.g. DENT CLOSER D276",
  "heaterSize": "string|null — e.g. 32 FT",
  "heaterCableLocation": "string|null",
  "gasketType": "MAGNETIC | NEOPRENE | null",
  "isExterior": "boolean|null — exterior door flag",
  "cutouts": "array|null — [{floorToBottom, floorToTop, frameWidth}]",
  "additionalItems": "array|null — e.g. ['exterior splash guard', 'window']",
  "weatherShield": "boolean|null",
  "thresholdPlate": "boolean|null",
  "doorPull": "string|null — full or half handle (sliding doors)",
  "trackType": "string|null",
  "specialNotes": "string|null",
  "infoLine": "string|null",
  "quantity": "number|null — default 1"
}`

const SYSTEM_PROMPT = `You are a door specification parser for RSNE (Refrigerated Structures of New England), a company that builds walk-in cooler and freezer doors.

Your job is to take natural language input — spoken or typed — and extract structured door specifications.

RSNE Door Types:
1. HINGED_COOLER — Standard hinged walk-in cooler door
2. HINGED_FREEZER — Hinged walk-in freezer door (always requires heater cable)
3. SLIDING — Manual horizontal sliding door (MHS)

Common Abbreviations & Vocabulary:
- WPG = White Painted Galvanized
- W/W = White/White finish
- SS = Stainless Steel
- Galv = Galvanized
- FRP = Fiberglass Reinforced Panel
- IMP = Insulated Metal Panel
- MHS = Manual Horizontal Sliding
- Face frame / Full frame / Bally type = frame styles
- "right hinge" or "left hinge" = which side the hinges are on
- "right slide" or "left slide" = which side the sliding door goes to

Hardware Manufacturers:
- DENT (Dent International) — common hinges (D690CS), latches (D90), closers (D276)
- Kason — KDE series
- DERA — DFE series

RSNE Standard Hardware (varies by door type and size — DO NOT default to a single set):
- 3' wide hinged doors (cooler or freezer): DENT D690 hinges (2), DENT D90 latch, DENT D276 closer, MAGNETIC gasket
- 4' wide hinged doors: Kason K1277 Cam-lift hinges (2), Kason K56 latch, no closer, NEOPRENE gasket
- 5' wide hinged doors: Kason K1277 Cam-lift hinges (3), Kason K55 Complete latch, no closer, NEOPRENE gasket
- Exterior hinged doors (any size): Kason K1245 hinges (2), Kason K56 latch, no closer, NEOPRENE gasket
- Sliding doors: No hinges/latches/closers (they use floor rollers, strikers, tongues)
If someone says "standard hardware" or doesn't mention specific hardware, leave hardware fields as null — the system will auto-fill based on door size

Parsing Rules:
- If someone says "freezer door" → temperatureType = FREEZER, doorCategory = HINGED_FREEZER (unless they specify sliding)
- If someone says "cooler door" → temperatureType = COOLER, doorCategory = HINGED_COOLER (unless they specify sliding)
- If someone says "sliding" → openingType = SLIDE, doorCategory = SLIDING
- Dimensions like "36x77" mean width 36" x height 77"
- "36 by 77 and a quarter" = 36" x 77-1/4"
- If a job has two parts like "GKT Refrigeration South Kingstown High School", first part is jobName, second is jobSiteName
- "job 25415" or "JWO 25415" → jobNumber
- If not specified, assume label = true, panelInsulated = true
- Freezer doors always need heater cable — if not mentioned, leave heaterSize as null (will be asked as a gap)
- Default quantity is 1 unless specified
- If "right" or "left" is mentioned with hinge/slide context, set the appropriate side field

Extract as much information as possible from the input. Use null for fields not mentioned.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no explanation.`

function extractJSON(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      return JSON.parse(match[1].trim())
    }
    const start = text.search(/[{[]/)
    if (start >= 0) {
      return JSON.parse(text.slice(start))
    }
    throw new Error("Could not extract JSON from response")
  }
}

export interface DoorSpecParseResult {
  specs: Partial<DoorSpecs>
  gaps: GapQuestion[]
  confidence: number
}

export async function parseDoorSpecs(text: string): Promise<DoorSpecParseResult> {
  const { text: response } = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt: `Parse the following door specification description into structured fields. Return JSON matching this schema:\n${DOOR_SPEC_SCHEMA}\n\nInput: "${text}"`,
  })

  const object = extractJSON(response)

  // Merge with defaults
  const defaults = getDefaultSpecs()
  const specs: Partial<DoorSpecs> = { ...defaults }

  // Copy all non-undefined/null values from parsed result
  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined && value !== null) {
      (specs as Record<string, unknown>)[key] = value
    }
  }

  // Auto-derive doorCategory from temperatureType + openingType if not set
  if (!specs.doorCategory && specs.temperatureType && specs.openingType) {
    if (specs.openingType === "SLIDE") {
      specs.doorCategory = "SLIDING"
    } else if (specs.temperatureType === "FREEZER") {
      specs.doorCategory = "HINGED_FREEZER"
    } else {
      specs.doorCategory = "HINGED_COOLER"
    }
  }

  // Apply standard hardware defaults based on door type + size (only for fields not already set)
  if (specs.doorCategory) {
    const hw = getStandardHardware(
      specs.doorCategory,
      specs.widthInClear,
      specs.isExterior || specs.specialNotes?.toLowerCase().includes("exterior"),
    )
    if (hw.hingeMfrName && !specs.hingeMfrName) specs.hingeMfrName = hw.hingeMfrName
    if (hw.hingeModel && !specs.hingeModel) specs.hingeModel = hw.hingeModel
    if (hw.latchMfrName && !specs.latchMfrName) specs.latchMfrName = hw.latchMfrName
    if (hw.latchModel && !specs.latchModel) specs.latchModel = hw.latchModel
    if (hw.closerModel && !specs.closerModel) specs.closerModel = hw.closerModel
    if (hw.gasketType && !specs.gasketType) specs.gasketType = hw.gasketType
  }

  // Find gaps for this door category
  const gaps = findSpecGaps(specs, specs.doorCategory)

  // Calculate confidence based on how many required fields were filled
  const filledCount = Object.values(object).filter((v) => v !== undefined && v !== null).length
  const totalRequired = specs.doorCategory
    ? gaps.length + filledCount
    : 1
  const confidence = totalRequired > 0 ? Math.round((filledCount / totalRequired) * 100) / 100 : 0

  return { specs, gaps, confidence }
}
