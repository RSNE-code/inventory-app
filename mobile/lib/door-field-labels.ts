/**
 * Door field labels and formatting — ported from web src/lib/door-field-labels.ts.
 */

export const DOOR_FIELD_LABELS: Record<string, string> = {
  doorCategory: "Door Type",
  temperatureType: "Temperature",
  openingType: "Opening Type",
  widthInClear: "Width in Clear",
  heightInClear: "Height in Clear",
  frameType: "Frame Type",
  hingeSide: "Hinge Side",
  swingDirection: "Swing Direction",
  gasketType: "Gasket Type",
  hasWindow: "Window",
  windowSize: "Window Size",
  hasKickPlate: "Kick Plate",
  kickPlateHeight: "Kick Plate Height",
  insulationType: "Insulation Type",
  insulationThickness: "Insulation Thickness",
  hasHeaterCable: "Heater Cable",
  heaterCableLength: "Heater Cable Length",
  isExterior: "Exterior Door",
  hasSweep: "Sweep",
  hasThreshold: "Threshold",
  highSill: "High Sill",
  hingeManufacturer: "Hinge Manufacturer",
  hingeModel: "Hinge Model",
  latchManufacturer: "Latch Manufacturer",
  latchModel: "Latch Model",
  closerManufacturer: "Closer Manufacturer",
  closerModel: "Closer Model",
  insideReleaseManufacturer: "Inside Release Mfr",
  insideReleaseModel: "Inside Release Model",
  trackModel: "Track Model",
  doorPull: "Door Pull",
  strikeModel: "Strike Model",
  tongueModel: "Tongue Model",
  notes: "Notes",
  jobName: "Job Name",
  jobNumber: "Job Number",
};

const ENUM_LABELS: Record<string, string> = {
  HINGED_COOLER: "Hinged Cooler",
  HINGED_FREEZER: "Hinged Freezer",
  SLIDING: "Manual Horizontal Sliding",
  COOLER: "Cooler (35°F)",
  FREEZER: "Freezer (0°F / -20°F)",
  HINGE: "Hinged",
  SLIDE: "Sliding",
  FULL_FRAME: "Full Frame",
  FACE_FRAME: "Face Frame",
  BALLY_TYPE: "Bally Type",
  MAGNETIC: "Magnetic",
  NEOPRENE: "Neoprene",
  LEFT: "Left",
  RIGHT: "Right",
  IN: "Swing In",
  OUT: "Swing Out",
  IMP: "IMP (Insulated Metal Panel)",
  EPS: "EPS (Expanded Polystyrene)",
  PIR: "PIR (Polyisocyanurate)",
};

export function getDoorFieldLabel(field: string): string {
  return DOOR_FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

export function formatDoorFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "Not specified";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && ENUM_LABELS[value]) return ENUM_LABELS[value];
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
