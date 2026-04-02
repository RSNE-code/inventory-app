/**
 * Door hardware catalog — ported from web src/lib/door-hardware-catalog.ts.
 */

export interface HardwarePart {
  manufacturer: string;
  part: string;
  label: string;
}

export const SWING_HINGES: HardwarePart[] = [
  { manufacturer: "Kason", part: "1556", label: "Kason 1556" },
  { manufacturer: "Kason", part: "1248", label: "Kason 1248" },
  { manufacturer: "Kason", part: "1070", label: "Kason 1070" },
  { manufacturer: "Dent", part: "D120", label: "Dent D120" },
  { manufacturer: "Dent", part: "D276", label: "Dent D276" },
];

export const SWING_LATCHES: HardwarePart[] = [
  { manufacturer: "Kason", part: "58", label: "Kason 58" },
  { manufacturer: "Kason", part: "56", label: "Kason 56" },
  { manufacturer: "Dent", part: "CL-100", label: "Dent CL-100" },
];

export const SWING_CLOSERS: HardwarePart[] = [
  { manufacturer: "Kason", part: "1092", label: "Kason 1092" },
  { manufacturer: "Kason", part: "1094", label: "Kason 1094" },
  { manufacturer: "Dent", part: "DCC-100", label: "Dent DCC-100" },
];

export const SWING_INSIDE_RELEASE: HardwarePart[] = [
  { manufacturer: "Kason", part: "487", label: "Kason 487" },
  { manufacturer: "Bally", part: "IR-100", label: "Bally IR-100" },
];

export const SLIDER_TRACKS: HardwarePart[] = [
  { manufacturer: "Jamison", part: "Standard", label: "Jamison Standard Track" },
  { manufacturer: "!"  , part: "Heavy Duty", label: "Heavy Duty Track" },
];

export const SLIDER_DOOR_PULLS: HardwarePart[] = [
  { manufacturer: "Kason", part: "170", label: "Kason 170" },
  { manufacturer: "Generic", part: "Standard", label: "Standard Pull" },
];

export const SLIDER_STRIKES: HardwarePart[] = [
  { manufacturer: "Kason", part: "312", label: "Kason 312" },
];

export const SLIDER_TONGUES: HardwarePart[] = [
  { manufacturer: "Kason", part: "314", label: "Kason 314" },
];

export function getManufacturersForCategory(parts: HardwarePart[]): string[] {
  return [...new Set(parts.map((p) => p.manufacturer))];
}

export function getPartsForManufacturer(parts: HardwarePart[], manufacturer: string): HardwarePart[] {
  return parts.filter((p) => p.manufacturer === manufacturer);
}
