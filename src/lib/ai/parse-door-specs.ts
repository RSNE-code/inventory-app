import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import type { DoorSpecs, GapQuestion } from "@/lib/door-specs"
import { findSpecGaps, getDefaultSpecs } from "@/lib/door-specs"

const MODEL = "claude-sonnet-4-6"

const doorSpecSchema = z.object({
  doorCategory: z
    .enum(["HINGED_COOLER", "HINGED_FREEZER", "SLIDING"])
    .optional()
    .describe("Door category based on description"),
  serialNumber: z.string().optional().describe("Serial number if mentioned"),
  label: z.boolean().optional().describe("Whether to include a label (default true)"),

  jobNumber: z.string().optional().describe("Job/JWO number"),
  jobName: z.string().optional().describe("Customer or job name"),
  jobSiteName: z.string().optional().describe("Site/location name if separate from job name"),

  widthInClear: z.string().optional().describe("Door width in clear, e.g. 36\""),
  heightInClear: z.string().optional().describe("Door height in clear, e.g. 77-1/4\""),
  wallThickness: z.string().optional().describe("Wall thickness"),
  jambDepth: z.string().optional().describe("Jamb depth, e.g. 2\""),

  temperatureType: z.enum(["COOLER", "FREEZER"]).optional(),
  openingType: z.enum(["HINGE", "SLIDE"]).optional(),
  hingeSide: z.enum(["LEFT", "RIGHT"]).optional(),
  slideSide: z.enum(["LEFT", "RIGHT"]).optional(),

  frameType: z.enum(["FULL_FRAME", "FACE_FRAME", "BALLY_TYPE"]).optional(),
  highSill: z.boolean().optional(),
  wiper: z.boolean().optional(),

  panelThickness: z.string().optional(),
  panelInsulated: z.boolean().optional(),
  insulation: z.string().optional(),

  finish: z.string().optional().describe("Finish code/description, e.g. WPG, White/White, SS"),
  skinMaterial: z.string().optional(),

  hingeMfrName: z.string().optional().describe("Hinge manufacturer, e.g. DENT, Kason"),
  hingeModel: z.string().optional().describe("Hinge model number, e.g. D690CS"),
  hingeOffset: z.string().optional(),

  latchMfrName: z.string().optional(),
  latchModel: z.string().optional().describe("Latch model, e.g. D90"),
  latchOffset: z.string().optional(),
  insideRelease: z.string().optional(),

  closerModel: z.string().optional().describe("Door closer model, e.g. DENT CLOSER D276"),

  heaterSize: z.string().optional().describe("Heater cable size in feet, e.g. 32 FT"),
  heaterCableLocation: z.string().optional(),

  gasketType: z.enum(["MAGNETIC", "NEOPRENE"]).optional(),

  weatherShield: z.boolean().optional(),
  thresholdPlate: z.boolean().optional(),

  doorPull: z.string().optional().describe("Full or half handle (sliding doors)"),
  trackType: z.string().optional(),

  specialNotes: z.string().optional(),
  infoLine: z.string().optional().describe("Additional info / notes for the shop"),

  quantity: z.number().optional().describe("Number of doors, default 1"),
})

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

Parsing Rules:
- If someone says "freezer door" → temperatureType = FREEZER, doorCategory = HINGED_FREEZER (unless they specify sliding)
- If someone says "cooler door" → temperatureType = COOLER, doorCategory = HINGED_COOLER (unless they specify sliding)
- If someone says "sliding" → openingType = SLIDE, doorCategory = SLIDING
- Dimensions like "36x77" mean width 36" x height 77"
- "36 by 77 and a quarter" = 36" x 77-1/4"
- If a job has two parts like "GKT Refrigeration South Kingstown High School", first part is jobName, second is jobSiteName
- "job 25415" or "JWO 25415" → jobNumber
- If not specified, assume label = true, panelInsulated = true
- Freezer doors always need heater cable — if not mentioned, leave heaterSize blank (will be asked as a gap)
- Default quantity is 1 unless specified
- If "right" or "left" is mentioned with hinge/slide context, set the appropriate side field

Extract as much information as possible from the input. Leave fields undefined if not mentioned — the system will ask follow-up questions for required missing fields.`

export interface DoorSpecParseResult {
  specs: Partial<DoorSpecs>
  gaps: GapQuestion[]
  confidence: number
}

export async function parseDoorSpecs(text: string): Promise<DoorSpecParseResult> {
  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: doorSpecSchema,
    system: SYSTEM_PROMPT,
    prompt: `Parse the following door specification description into structured fields:\n\n"${text}"`,
  })

  // Merge with defaults
  const defaults = getDefaultSpecs()
  const specs: Partial<DoorSpecs> = { ...defaults }

  // Copy all non-undefined values from parsed result
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

  // Find gaps for this door category
  const gaps = findSpecGaps(specs, specs.doorCategory)

  // Calculate confidence based on how many required fields were filled
  const totalRequired = specs.doorCategory
    ? gaps.length + Object.keys(object).filter((k) => object[k as keyof typeof object] !== undefined).length
    : 1
  const filled = totalRequired - gaps.length
  const confidence = totalRequired > 0 ? Math.round((filled / totalRequired) * 100) / 100 : 0

  return { specs, gaps, confidence }
}
