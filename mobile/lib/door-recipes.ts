/**
 * Door recipes — component lists for door types.
 * Ported from web src/lib/door-recipes.ts.
 */
import { parseWidthInches, type DoorSpecs } from "./door-specs";

export interface RecipeComponent {
  name: string;
  qty: number;
}

export interface DoorRecipe {
  name: string;
  components: RecipeComponent[];
}

/** Match door specs to a standard recipe */
export function matchDoorRecipe(specs: Partial<DoorSpecs>): DoorRecipe | null {
  if (!specs.doorCategory || !specs.widthInClear || !specs.heightInClear) return null;

  const w = parseWidthInches(specs.widthInClear);
  const h = parseWidthInches(specs.heightInClear);
  const isSlider = specs.doorCategory === "SLIDING";
  const isFreezer = specs.doorCategory === "HINGED_FREEZER" || specs.temperatureType === "FREEZER";

  const sizeLabel = `${Math.round(w / 12)}'x${Math.round(h / 12)}'`;
  const typeLabel = isSlider ? "Slider" : isFreezer ? "Freezer Swing" : "Cooler Swing";

  return {
    name: `${typeLabel} ${sizeLabel}`,
    components: getBaseComponents(specs, w, h),
  };
}

function getBaseComponents(specs: Partial<DoorSpecs>, w: number, h: number): RecipeComponent[] {
  const components: RecipeComponent[] = [];
  const isSlider = specs.doorCategory === "SLIDING";
  const isFreezer = specs.doorCategory === "HINGED_FREEZER" || specs.temperatureType === "FREEZER";

  // Panel/insulation
  components.push({ name: `${isFreezer ? "4\"" : "2\""} Insulated Panel`, qty: 1 });

  // Gasket
  const gasketFt = Math.ceil((w * 2 + h * 2) / 12);
  components.push({ name: `${specs.gasketType === "NEOPRENE" ? "Neoprene" : "Magnetic"} Gasket`, qty: gasketFt });

  // Hardware
  if (isSlider) {
    components.push({ name: "Slider Track Assembly", qty: 1 });
    components.push({ name: "Slider Roller Set", qty: 1 });
    components.push({ name: "Door Pull", qty: 1 });
  } else {
    components.push({ name: "Hinge Set (3)", qty: 1 });
    components.push({ name: "Latch Assembly", qty: 1 });
    components.push({ name: "Door Closer", qty: 1 });
    components.push({ name: "Inside Safety Release", qty: 1 });
  }

  // Window
  if (specs.hasWindow) {
    components.push({ name: `Window ${specs.windowSize ?? "14x14"}`, qty: 1 });
  }

  // Kick plate
  if (specs.hasKickPlate) {
    components.push({ name: "Kick Plate", qty: 1 });
  }

  // Heater cable (freezer only)
  if (isFreezer && specs.hasHeaterCable) {
    const cableLen = Math.ceil((h * 2 + w) * 2 / 12);
    components.push({ name: `Heater Cable ${cableLen} FT`, qty: 1 });
  }

  // Sweep
  if (specs.hasSweep) {
    components.push({ name: "Door Sweep", qty: 1 });
  }

  return components;
}
