// ---------------------------------------------------------------------------
// door-hardware-catalog.ts — Centralized hardware options for door pickers
// Organized by category and door type. Used by OptionPicker on confirmation page.
// ---------------------------------------------------------------------------

export interface HardwarePart {
  manufacturer: string
  part: string
  /** Combined display label */
  label: string
}

export const HARDWARE_MANUFACTURERS = ["DENT", "Kason"] as const
export type HardwareManufacturer = (typeof HARDWARE_MANUFACTURERS)[number]

// ─── Swing Door Hardware ─────────────────────────────────────────────────────

export const SWING_HINGES: HardwarePart[] = [
  { manufacturer: "DENT", part: "D690", label: "DENT D690" },
  { manufacturer: "DENT", part: "D690CS", label: "DENT D690CS" },
  { manufacturer: "Kason", part: "K1277 Cam-lift", label: "Kason K1277 Cam-lift" },
  { manufacturer: "Kason", part: "K1248 Spring", label: "Kason K1248 Spring" },
  { manufacturer: "Kason", part: "K1245", label: "Kason K1245" },
]

export const SWING_LATCHES: HardwarePart[] = [
  { manufacturer: "DENT", part: "D90", label: "DENT D90" },
  { manufacturer: "Kason", part: "K56 Body Chrome", label: "Kason K56 Body Chrome" },
  { manufacturer: "Kason", part: "K55 Complete", label: "Kason K55 Complete" },
]

export const SWING_CLOSERS: HardwarePart[] = [
  { manufacturer: "DENT", part: "D276", label: "DENT D276" },
  { manufacturer: "Kason", part: "K1094", label: "Kason K1094" },
]

export const SWING_INSIDE_RELEASE: HardwarePart[] = [
  { manufacturer: "Kason", part: "K481 Safety Glow", label: "Kason K481 Safety Glow" },
  { manufacturer: "", part: "Glow Push Panel", label: "Glow Push Panel" },
]

// ─── Slider Door Hardware ────────────────────────────────────────────────────

export const SLIDER_HARDWARE: HardwarePart[] = [
  { manufacturer: "Kason", part: "SLD 48", label: "Kason SLD 48" },
  { manufacturer: "Kason", part: "SLD 60", label: "Kason SLD 60" },
  { manufacturer: "Kason", part: "SLD 72", label: "Kason SLD 72" },
  { manufacturer: "Kason", part: "SLD 96", label: "Kason SLD 96" },
  { manufacturer: "Kason", part: "SLD 120", label: "Kason SLD 120" },
]

export const SLIDER_ROLLERS: HardwarePart[] = [
  { manufacturer: "Kason", part: "HD Floor Roller", label: "Kason HD Floor Roller" },
]

export const SLIDER_STRIKE_TONGUE: HardwarePart[] = [
  { manufacturer: "Kason", part: "Slider Tongue Non-Padlock", label: "Kason Slider Tongue Non-Padlock" },
  { manufacturer: "Kason", part: "Slider Strike", label: "Kason Slider Strike" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get parts filtered by manufacturer for a given category */
export function getPartsForManufacturer(
  category: HardwarePart[],
  manufacturer: string
): HardwarePart[] {
  if (!manufacturer) return category
  return category.filter((p) => p.manufacturer === manufacturer)
}

/** Get unique manufacturers for a category */
export function getManufacturersForCategory(category: HardwarePart[]): string[] {
  const mfrs = new Set(category.map((p) => p.manufacturer).filter(Boolean))
  return Array.from(mfrs)
}

/** Build picker options from a hardware category */
export function hardwareToPickerOptions(category: HardwarePart[]): {
  manufacturers: { label: string; value: string }[]
  partsByMfr: Record<string, { label: string; value: string }[]>
} {
  const mfrs = getManufacturersForCategory(category)
  const manufacturers = mfrs.map((m) => ({ label: m, value: m }))

  const partsByMfr: Record<string, { label: string; value: string }[]> = {}
  for (const mfr of mfrs) {
    partsByMfr[mfr] = getPartsForManufacturer(category, mfr).map((p) => ({
      label: p.part,
      value: p.part,
    }))
  }

  return { manufacturers, partsByMfr }
}
