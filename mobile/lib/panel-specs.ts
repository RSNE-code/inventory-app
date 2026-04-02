/**
 * Panel specifications — types and defaults.
 * Ported from web src/lib/panel-specs.ts.
 */

export interface PanelSpecs {
  width: number;
  length: number;
  insulation: string;
  insulationThickness: string;
  side1Material: string;
  side2Material: string;
}

export interface RampSpecs {
  width: number;
  length: number;
  height: number;
  bottomLip: number;
  topLip: number;
  insulation: string;
  diamondPlateThickness: string;
}

export const INSULATION_OPTIONS = ["EPS", "PIR", "IMP", "None"] as const;
export const INSULATION_THICKNESS_OPTIONS = ["2\"", "3\"", "4\"", "5\"", "6\""] as const;
export const PANEL_MATERIAL_OPTIONS = [
  "26ga White Steel",
  "26ga Stucco Steel",
  "24ga White Steel",
  ".040 Stucco Aluminum",
  ".040 Smooth Aluminum",
  "FRP",
] as const;
export const DIAMOND_PLATE_OPTIONS = [".063 Aluminum", ".125 Aluminum", "14ga Steel"] as const;

export function getDefaultPanelSpecs(type: "WALL_PANEL" | "FLOOR_PANEL"): PanelSpecs {
  return {
    width: type === "FLOOR_PANEL" ? 48 : 42,
    length: 0,
    insulation: "EPS",
    insulationThickness: type === "FLOOR_PANEL" ? "4\"" : "4\"",
    side1Material: "26ga White Steel",
    side2Material: type === "FLOOR_PANEL" ? ".063 Aluminum" : "26ga White Steel",
  };
}

export function getDefaultRampSpecs(): RampSpecs {
  return {
    width: 48,
    length: 0,
    height: 4,
    bottomLip: 2,
    topLip: 2,
    insulation: "EPS",
    diamondPlateThickness: ".063 Aluminum",
  };
}

export interface RecipeComponent {
  name: string;
  qty: number;
}

export function matchPanelRecipe(specs: PanelSpecs, type: "WALL_PANEL" | "FLOOR_PANEL"): RecipeComponent[] {
  const sqFt = (specs.width * specs.length) / 144;
  return [
    { name: `${specs.insulationThickness} ${specs.insulation} Insulation`, qty: Math.ceil(sqFt) },
    { name: specs.side1Material, qty: Math.ceil(sqFt) },
    { name: specs.side2Material, qty: Math.ceil(sqFt) },
    { name: "Panel Adhesive", qty: Math.ceil(sqFt / 50) },
    { name: type === "FLOOR_PANEL" ? "Floor Panel Edge Trim" : "Wall Panel Edge Trim", qty: Math.ceil((specs.width + specs.length) * 2 / 12) },
  ];
}

export function matchRampRecipe(specs: RampSpecs): RecipeComponent[] {
  const sqFt = (specs.width * specs.length) / 144;
  return [
    { name: `${specs.diamondPlateThickness} Diamond Plate`, qty: Math.ceil(sqFt) },
    { name: "Ramp Frame Steel", qty: 1 },
    { name: `${specs.insulation} Insulation`, qty: Math.ceil(sqFt) },
  ];
}
