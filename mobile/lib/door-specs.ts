/**
 * Door specifications — types, validation, gap detection.
 * Ported from web src/lib/door-specs.ts.
 */

export type DoorCategory = "HINGED_COOLER" | "HINGED_FREEZER" | "SLIDING";
export type TemperatureType = "COOLER" | "FREEZER";
export type OpeningType = "HINGE" | "SLIDE";
export type FrameType = "FULL_FRAME" | "FACE_FRAME" | "BALLY_TYPE";
export type GasketType = "MAGNETIC" | "NEOPRENE";
export type Side = "LEFT" | "RIGHT";
export type InsulationType = "IMP" | "EPS" | "PIR";
export type WindowSize = "14x14" | "14x24";

export interface DoorSpecs {
  doorCategory: DoorCategory;
  temperatureType: TemperatureType;
  openingType: OpeningType;
  widthInClear: string;
  heightInClear: string;
  frameType: FrameType;
  hingeSide: Side;
  swingDirection: "IN" | "OUT";
  gasketType: GasketType;
  hasWindow: boolean;
  windowSize?: WindowSize;
  hasKickPlate: boolean;
  kickPlateHeight?: string;
  insulationType: InsulationType;
  insulationThickness: string;
  hasHeaterCable: boolean;
  heaterCableLength?: string;
  isExterior: boolean;
  hasSweep: boolean;
  hasThreshold: boolean;
  highSill: boolean;
  hingeManufacturer?: string;
  hingeModel?: string;
  latchManufacturer?: string;
  latchModel?: string;
  closerManufacturer?: string;
  closerModel?: string;
  insideReleaseManufacturer?: string;
  insideReleaseModel?: string;
  trackModel?: string;
  doorPull?: string;
  strikeModel?: string;
  tongueModel?: string;
  notes?: string;
  jobName?: string;
  jobNumber?: string;
}

export interface GapQuestion {
  field: string;
  label: string;
  type: "select" | "text" | "boolean" | "number";
  options?: string[];
  required: boolean;
}

const HINGED_REQUIRED = [
  "widthInClear", "heightInClear", "frameType", "hingeSide",
  "swingDirection", "gasketType", "insulationType", "insulationThickness",
];

const SLIDING_REQUIRED = [
  "widthInClear", "heightInClear", "insulationType", "insulationThickness",
];

export function getRequiredFieldsForCategory(category: DoorCategory): string[] {
  if (category === "SLIDING") return SLIDING_REQUIRED;
  return HINGED_REQUIRED;
}

export function findSpecGaps(
  specs: Partial<DoorSpecs>,
  category?: DoorCategory
): GapQuestion[] {
  const cat = category ?? specs.doorCategory;
  if (!cat) {
    return [{ field: "doorCategory", label: "Door Type", type: "select", options: ["HINGED_COOLER", "HINGED_FREEZER", "SLIDING"], required: true }];
  }

  const required = getRequiredFieldsForCategory(cat);
  const gaps: GapQuestion[] = [];

  for (const field of required) {
    const value = specs[field as keyof DoorSpecs];
    if (value === undefined || value === null || value === "") {
      gaps.push({
        field,
        label: field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim(),
        type: getFieldType(field),
        options: getFieldOptions(field),
        required: true,
      });
    }
  }

  return gaps;
}

function getFieldType(field: string): "select" | "text" | "boolean" | "number" {
  const selects = ["frameType", "hingeSide", "swingDirection", "gasketType", "insulationType", "doorCategory"];
  const booleans = ["hasWindow", "hasKickPlate", "hasHeaterCable", "isExterior", "hasSweep", "hasThreshold", "highSill"];
  if (selects.includes(field)) return "select";
  if (booleans.includes(field)) return "boolean";
  return "text";
}

function getFieldOptions(field: string): string[] | undefined {
  const options: Record<string, string[]> = {
    doorCategory: ["HINGED_COOLER", "HINGED_FREEZER", "SLIDING"],
    frameType: ["FULL_FRAME", "FACE_FRAME", "BALLY_TYPE"],
    hingeSide: ["LEFT", "RIGHT"],
    swingDirection: ["IN", "OUT"],
    gasketType: ["MAGNETIC", "NEOPRENE"],
    insulationType: ["IMP", "EPS", "PIR"],
  };
  return options[field];
}

export const FRACTIONS = [
  { label: "0", decimal: 0 },
  { label: "1/16", decimal: 0.0625 },
  { label: "1/8", decimal: 0.125 },
  { label: "3/16", decimal: 0.1875 },
  { label: "1/4", decimal: 0.25 },
  { label: "5/16", decimal: 0.3125 },
  { label: "3/8", decimal: 0.375 },
  { label: "7/16", decimal: 0.4375 },
  { label: "1/2", decimal: 0.5 },
  { label: "9/16", decimal: 0.5625 },
  { label: "5/8", decimal: 0.625 },
  { label: "11/16", decimal: 0.6875 },
  { label: "3/4", decimal: 0.75 },
  { label: "13/16", decimal: 0.8125 },
  { label: "7/8", decimal: 0.875 },
  { label: "15/16", decimal: 0.9375 },
] as const;

export function parseWidthInches(w: string): number {
  const trimmed = w.replace(/['"″]/g, "").trim();
  const feetMatch = trimmed.match(/^(\d+)'?\s*-?\s*(\d+)?$/);
  if (feetMatch) {
    const feet = parseInt(feetMatch[1]);
    const inches = feetMatch[2] ? parseInt(feetMatch[2]) : 0;
    return feet * 12 + inches;
  }
  return parseFloat(trimmed) || 0;
}

export function formatFractionalInches(value: number): string {
  const whole = Math.floor(value);
  const frac = value - whole;
  if (frac === 0) return `${whole}`;
  const closest = FRACTIONS.reduce((prev, curr) =>
    Math.abs(curr.decimal - frac) < Math.abs(prev.decimal - frac) ? curr : prev
  );
  return closest.decimal === 0 ? `${whole}` : `${whole}-${closest.label}`;
}

export function calculateHeaterCable(specs: Partial<DoorSpecs>): string | null {
  if (!specs.hasHeaterCable) return null;
  const h = parseWidthInches(specs.heightInClear ?? "0");
  const w = parseWidthInches(specs.widthInClear ?? "0");
  if (!h || !w) return null;

  const perimeter = specs.highSill
    ? (h * 2 + w * 2)
    : (h * 2 + w) * 2;

  return `${Math.ceil(perimeter / 12)} FT`;
}
