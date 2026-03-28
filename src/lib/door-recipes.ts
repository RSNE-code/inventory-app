// ---------------------------------------------------------------------------
// door-recipes.ts — Maps door specifications to standard RSNE component recipes
// Data sourced from real RSNE assembly templates.
// ---------------------------------------------------------------------------

export interface RecipeComponent {
  name: string;   // Product name as it appears in the catalog
  qty: number;    // Standard quantity needed
}

export interface DoorRecipe {
  name: string;
  components: RecipeComponent[];
}

// ---------------------------------------------------------------------------
// Width parser — handles "36", '36"', "3'", "3ft", "48", etc.
// ---------------------------------------------------------------------------

export function parseWidthToInches(w: string): number {
  if (!w) return 0;
  const trimmed = w.trim();

  // Feet-and-inches: 3'6" or 3' 6"
  const feetInchMatch = trimmed.match(/^(\d+)['']\s*(\d+)["""]?$/);
  if (feetInchMatch) {
    return parseInt(feetInchMatch[1], 10) * 12 + parseInt(feetInchMatch[2], 10);
  }

  // Pure feet: 3' or 3ft
  const feetMatch = trimmed.match(/^(\d+)\s*(?:[''']|ft)$/);
  if (feetMatch) {
    return parseInt(feetMatch[1], 10) * 12;
  }

  // Inches with unit: 36" or 36in
  const inchMatch = trimmed.match(/^(\d+)\s*(?:["""]|in)$/);
  if (inchMatch) {
    return parseInt(inchMatch[1], 10);
  }

  // Plain number — assume inches
  const plainNum = parseFloat(trimmed);
  if (!isNaN(plainNum)) {
    return plainNum;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Size-bucket helper
// ---------------------------------------------------------------------------

function widthBucket(inches: number): "3ft" | "4ft" | "5ft" | "6ft" | "8ft" | null {
  if (inches <= 0) return null;
  if (inches <= 36) return "3ft";
  if (inches <= 48) return "4ft";
  if (inches <= 60) return "5ft";
  if (inches <= 72) return "6ft";
  if (inches <= 96) return "8ft";
  return null;
}

function heightBucket(inches: number): "7ft" | "8ft" {
  if (inches > 84) return "8ft";
  return "7ft";
}

// ---------------------------------------------------------------------------
// Shared component sets (base materials that appear across many recipes)
// ---------------------------------------------------------------------------

const COMMON_CONSUMABLES: RecipeComponent[] = [
  { name: "Silicone Sealant (White)", qty: 0.1 },
  { name: "ADFOAM 1875", qty: 0.2 },
  { name: "GLUE 5635", qty: 0.05 },
];

// ---------------------------------------------------------------------------
// Recipe definitions — SWING DOORS — COOLER
// ---------------------------------------------------------------------------

const COOLER_SWING_3x7: DoorRecipe = {
  name: "Cooler Swing 3x7 (Standard, Magnetic Gasket)",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92 },
    { name: "Magnetic Gasket 8'", qty: 2.5 },
    { name: "HINGE D690", qty: 2 },
    { name: "D90 Handle", qty: 1 },
    { name: 'D276 Door Closer 1-3/8" OS, Satin Chrome', qty: 1 },
    { name: "EPS Sheet 3.5\" x 4' x 8'", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Glow Push Panel", qty: 1 },
    { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
    { name: 'Wiper Gasket 8.5"', qty: 0.03 },
  ],
};

const COOLER_SWING_3x7_HIGH_SILL: DoorRecipe = {
  name: "Cooler Swing 3x7 (High Sill)",
  components: COOLER_SWING_3x7.components.filter(
    (c) => c.name !== 'Wiper Gasket 8.5"'
  ),
};

const COOLER_SWING_3x7_NEOPRENE: DoorRecipe = {
  name: "Cooler Swing 3x7 (Neoprene Gasket)",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92 },
    { name: 'Wiper Gasket 8.5"', qty: 0.03 },
    { name: "GASKET, 100' ROLL JAMISON", qty: 0.18 },
    { name: "HINGE D690", qty: 2 },
    { name: "D90 Handle", qty: 1 },
    { name: 'D276 Door Closer 1-3/8" OS, Satin Chrome', qty: 1 },
    { name: "EPS Sheet 3.5\" x 4' x 8'", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Glow Push Panel", qty: 1 },
    { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
  ],
};

const COOLER_SWING_4x7: DoorRecipe = {
  name: "Cooler Swing 4x7 (Neoprene Gasket)",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 3 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 110 },
    { name: 'Wiper Gasket 8.5"', qty: 0.04 },
    { name: "GASKET, 100' ROLL JAMISON", qty: 0.18 },
    { name: "K1277 Cam-lift Strap Hinge", qty: 2 },
    { name: "K56 Latch (Body Chrome)", qty: 1 },
    { name: "K56 Strike", qty: 1 },
    { name: "EPS Sheet 3.5\" x 4' x 8'", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Diamond Plate .063 4' x 8'", qty: 1 },
  ],
};

const COOLER_SWING_5x7: DoorRecipe = {
  name: "Cooler Swing 5x7",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 3 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 120 },
    { name: 'Wiper Gasket 8.5"', qty: 0.05 },
    { name: "GASKET, 100' ROLL JAMISON", qty: 0.2 },
    { name: "K1277 Cam-lift Strap Hinge", qty: 3 },
    { name: "K55 Complete", qty: 1 },
    { name: "EPS Sheet 2\" x 4' x 8'", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Diamond Plate .063 4' x 8'", qty: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Recipe definitions — SWING DOORS — FREEZER
// ---------------------------------------------------------------------------

const FREEZER_SWING_3x7: DoorRecipe = {
  name: "Freezer Swing 3x7 (Standard)",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 95 },
    { name: "Magnetic Gasket 8'", qty: 2.5 },
    { name: "HINGE D690", qty: 2 },
    { name: "D90 Handle", qty: 1 },
    { name: 'D276 Door Closer 1-3/8" OS, Satin Chrome', qty: 1 },
    { name: "TRYMER 200L 3-1/2\" - 48\" X 96\"", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Glow Push Panel", qty: 1 },
    { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
    { name: 'Wiper Gasket 8.5"', qty: 0.03 },
    { name: '12\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
    { name: '34\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
    { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
  ],
};

const FREEZER_SWING_4x7: DoorRecipe = {
  name: "Freezer Swing 4x7",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 3 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 110 },
    { name: 'Wiper Gasket 8.5"', qty: 0.18 },
    { name: "GASKET, 100' ROLL JAMISON", qty: 0.18 },
    { name: "K1277 Cam-lift Strap Hinge", qty: 2 },
    { name: "K56 Latch (Body Chrome)", qty: 1 },
    { name: "K56 Strike", qty: 1 },
    { name: "TRYMER 200L 3-1/2\" - 48\" X 96\"", qty: 1 },
    { name: '36\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
    { name: '15\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Diamond Plate .063 4' x 8'", qty: 1 },
  ],
};

const FREEZER_SWING_5x7: DoorRecipe = {
  name: "Freezer Swing 5x7",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 3 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 120 },
    { name: 'Wiper Gasket 8.5"', qty: 0.05 },
    { name: "GASKET, 100' ROLL JAMISON", qty: 0.2 },
    { name: "K1277 Cam-lift Strap Hinge", qty: 3 },
    { name: "K55 Complete", qty: 1 },
    { name: "TRYMER 200L 3-1/2\" - 48\" X 96\"", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Diamond Plate .063 4' x 10'", qty: 1 },
    { name: '38\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
    { name: '15\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
    { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
  ],
};

const FREEZER_SWING_3x7_HIGH_SILL: DoorRecipe = {
  name: "Freezer Swing 3x7 (High Sill)",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 95 },
    { name: "Magnetic Gasket 8'", qty: 2.5 },
    { name: "HINGE D690", qty: 2 },
    { name: "D90 Handle", qty: 1 },
    { name: 'D276 Door Closer 1-3/8" OS, Satin Chrome', qty: 1 },
    { name: "TRYMER 200L 4\" - 48\" X 96\"", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Glow Push Panel", qty: 1 },
    { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
    { name: '40\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
    { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
  ],
};

const FREEZER_SWING_3x7_PLUG: DoorRecipe = {
  name: "Freezer Swing 3x7 (Plug, No Frame)",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 60 },
    { name: "Magnetic Gasket 8'", qty: 2 },
    { name: "TRYMER 200L 3-1/2\" - 48\" X 96\"", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Glow Push Panel", qty: 1 },
    { name: 'Wiper Gasket 8.5"', qty: 0.03 },
    { name: '12\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Recipe definitions — EXTERIOR DOORS
// ---------------------------------------------------------------------------

const EXTERIOR_COOLER_3x7: DoorRecipe = {
  name: "Exterior Cooler Swing 3x7",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92 },
    { name: "GASKET, 100' ROLL JAMISON", qty: 0.18 },
    { name: 'K1245 1-1/4 OS Hinge', qty: 2 },
    { name: "K56 Latch (Body Chrome)", qty: 1 },
    { name: "K56 Strike", qty: 1 },
    { name: "EPS Sheet 3.5\" x 4' x 8'", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
    { name: 'K481 Safety Glow Inside Release, 6" Door', qty: 1 },
    { name: 'Wiper Gasket 8.5"', qty: 0.03 },
  ],
};

const EXTERIOR_FREEZER_3x7: DoorRecipe = {
  name: "Exterior Freezer Swing 3x7",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92 },
    { name: "GASKET, 100' ROLL JAMISON", qty: 0.18 },
    { name: 'K1245 1-1/4 OS Hinge', qty: 2 },
    { name: "K56 Latch (Body Chrome)", qty: 1 },
    { name: "K56 Strike", qty: 1 },
    { name: "TRYMER 200L 3-1/2\" - 48\" X 96\"", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
    { name: 'K481 Safety Glow Inside Release, 6" Door', qty: 1 },
    { name: 'Wiper Gasket 8.5"', qty: 0.03 },
    { name: '12\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
    { name: '32\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
    { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
  ],
};

const EXTERIOR_FREEZER_3x7_HIGH_SILL: DoorRecipe = {
  name: "Exterior Freezer Swing 3x7 (High Sill)",
  components: [
    { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92 },
    { name: "GASKET, 100' ROLL JAMISON", qty: 0.2 },
    { name: 'K1245 1-1/4 OS Hinge', qty: 2 },
    { name: "K56 Latch (Body Chrome)", qty: 1 },
    { name: "K56 Strike", qty: 1 },
    { name: "TRYMER 200L 3-1/2\" - 48\" X 96\"", qty: 1 },
    ...COMMON_CONSUMABLES,
    { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
    { name: 'K481 Safety Glow Inside Release, 6" Door', qty: 1 },
    { name: '40\' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP', qty: 1 },
    { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
  ],
};

// ---------------------------------------------------------------------------
// Recipe definitions — SLIDING DOORS
// ---------------------------------------------------------------------------

const COOLER_SLIDER_4x7: DoorRecipe = {
  name: "Cooler Slider 4x7",
  components: [
    { name: "SLD 48", qty: 1 },
    { name: "4in IMP", qty: 32 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 60 },
    { name: 'Wiper Gasket 3"', qty: 0.1 },
    { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1 },
    { name: "STRIKER", qty: 1 },
    { name: "Slider Tongue - Non-padlock", qty: 1 },
    { name: "Kason Slider Exterior Pull Handle", qty: 1 },
    { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 4 },
    { name: "Fasteners (Generic)", qty: 60 },
  ],
};

const COOLER_SLIDER_5x7: DoorRecipe = {
  name: "Cooler Slider 5x7",
  components: [
    { name: "SLD 60", qty: 1 },
    { name: "4in IMP", qty: 64 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 70 },
    { name: 'Wiper Gasket 3"', qty: 0.12 },
    { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1 },
    { name: "STRIKER", qty: 1 },
    { name: "Slider Tongue - Non-padlock", qty: 1 },
    { name: "Kason Slider Exterior Pull Handle", qty: 1 },
    { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 5 },
    { name: "Fasteners (Generic)", qty: 60 },
  ],
};

const COOLER_SLIDER_6x7: DoorRecipe = {
  name: "Cooler Slider 6x7",
  components: [
    { name: "SLD 72", qty: 1 },
    { name: "4in IMP", qty: 64 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 70 },
    { name: 'Wiper Gasket 3"', qty: 0.14 },
    { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1 },
    { name: "STRIKER", qty: 1 },
    { name: "Slider Tongue - Non-padlock", qty: 1 },
    { name: "Kason Slider Exterior Pull Handle", qty: 1 },
    { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 5 },
    { name: "Fasteners (Generic)", qty: 70 },
  ],
};

const COOLER_SLIDER_6x8: DoorRecipe = {
  name: "Cooler Slider 6x8",
  components: [
    { name: "SLD 72", qty: 1 },
    { name: "4in IMP", qty: 80 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 70 },
    { name: 'Wiper Gasket 3"', qty: 0.14 },
    { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1 },
    { name: "STRIKER", qty: 1 },
    { name: "Slider Tongue - Non-padlock", qty: 1 },
    { name: "Kason Slider Exterior Pull Handle", qty: 1 },
    { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 6 },
    { name: "Fasteners (Generic)", qty: 70 },
  ],
};

const COOLER_SLIDER_8x8: DoorRecipe = {
  name: "Cooler Slider 8x8",
  components: [
    { name: "SLD 96", qty: 1 },
    { name: "4in IMP", qty: 80 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 115 },
    { name: 'Wiper Gasket 3"', qty: 0.18 },
    { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1 },
    { name: "STRIKER", qty: 1 },
    { name: "Slider Tongue - Non-padlock", qty: 1 },
    { name: "Kason Slider Exterior Pull Handle", qty: 1 },
    { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 8 },
    { name: "Fasteners (Generic)", qty: 80 },
  ],
};

// ---------------------------------------------------------------------------
// Freezer Slider Recipes (same as cooler + heater wire at width × 4)
// ---------------------------------------------------------------------------

const FREEZER_SLIDER_4x7: DoorRecipe = {
  name: "Freezer Slider 4x7",
  components: [
    { name: "SLD 48", qty: 1 },
    { name: "4in IMP", qty: 32 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 60 },
    { name: 'Wiper Gasket 3"', qty: 0.1 },
    { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1 },
    { name: "STRIKER", qty: 1 },
    { name: "Slider Tongue - Non-padlock", qty: 1 },
    { name: "Kason Slider Exterior Pull Handle", qty: 1 },
    { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 4 },
    { name: "Fasteners (Generic)", qty: 60 },
    { name: "16' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1 },
  ],
};

const FREEZER_SLIDER_5x7: DoorRecipe = {
  name: "Freezer Slider 5x7",
  components: [
    { name: "SLD 60", qty: 1 },
    { name: "4in IMP", qty: 64 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 70 },
    { name: 'Wiper Gasket 3"', qty: 0.12 },
    { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1 },
    { name: "STRIKER", qty: 1 },
    { name: "Slider Tongue - Non-padlock", qty: 1 },
    { name: "Kason Slider Exterior Pull Handle", qty: 1 },
    { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 5 },
    { name: "Fasteners (Generic)", qty: 60 },
    { name: "20' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1 },
  ],
};

const FREEZER_SLIDER_6x7: DoorRecipe = {
  name: "Freezer Slider 6x7",
  components: [
    { name: "SLD 72", qty: 1 },
    { name: "4in IMP", qty: 64 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 70 },
    { name: 'Wiper Gasket 3"', qty: 0.14 },
    { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1 },
    { name: "STRIKER", qty: 1 },
    { name: "Slider Tongue - Non-padlock", qty: 1 },
    { name: "Kason Slider Exterior Pull Handle", qty: 1 },
    { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 5 },
    { name: "Fasteners (Generic)", qty: 70 },
    { name: "24' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1 },
  ],
};

const FREEZER_SLIDER_6x8: DoorRecipe = {
  name: "Freezer Slider 6x8",
  components: [
    { name: "SLD 72", qty: 1 },
    { name: "4in IMP", qty: 80 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 70 },
    { name: 'Wiper Gasket 3"', qty: 0.14 },
    { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1 },
    { name: "STRIKER", qty: 1 },
    { name: "Slider Tongue - Non-padlock", qty: 1 },
    { name: "Kason Slider Exterior Pull Handle", qty: 1 },
    { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 6 },
    { name: "Fasteners (Generic)", qty: 70 },
    { name: "24' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1 },
  ],
};

const FREEZER_SLIDER_8x8: DoorRecipe = {
  name: "Freezer Slider 8x8",
  components: [
    { name: "SLD 96", qty: 1 },
    { name: "4in IMP", qty: 80 },
    { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 115 },
    { name: 'Wiper Gasket 3"', qty: 0.18 },
    { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1 },
    { name: "STRIKER", qty: 1 },
    { name: "Slider Tongue - Non-padlock", qty: 1 },
    { name: "Kason Slider Exterior Pull Handle", qty: 1 },
    { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 8 },
    { name: "Fasteners (Generic)", qty: 80 },
    { name: "32' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Main matching function
// ---------------------------------------------------------------------------

export function matchDoorRecipe(specs: {
  openingType?: string;    // "HINGE" | "SLIDE"
  temperatureType?: string; // "COOLER" | "FREEZER"
  widthInClear?: string;   // e.g. "36", "48", "60"
  heightInClear?: string;  // e.g. "78", "84", "96"
  highSill?: boolean;
  isExterior?: boolean;
  gasketType?: string;     // "MAGNETIC" | "NEOPRENE"
  frameType?: string;      // detect plug doors (no frame)
}): DoorRecipe | null {
  const width = parseWidthToInches(specs.widthInClear ?? "");
  const height = parseWidthToInches(specs.heightInClear ?? "");
  const wBucket = widthBucket(width);
  const hBucket = heightBucket(height);

  if (!wBucket) return null;

  const isSlider =
    specs.openingType?.toUpperCase() === "SLIDE" ||
    specs.openingType?.toUpperCase() === "SLIDER" ||
    specs.openingType?.toUpperCase() === "SLIDING";
  const isFreezer = specs.temperatureType?.toUpperCase() === "FREEZER";
  const isExterior = specs.isExterior === true;
  const isHighSill = specs.highSill === true;
  // Plug door = no frame (freezer only)
  const isPlug = !specs.frameType || specs.frameType === "";

  // -----------------------------------------------------------------------
  // Sliding doors — cooler vs freezer (freezer adds heater wire)
  // -----------------------------------------------------------------------
  if (isSlider) {
    if (isFreezer) {
      if (wBucket === "8ft" && hBucket === "8ft") return FREEZER_SLIDER_8x8;
      if (wBucket === "6ft" && hBucket === "8ft") return FREEZER_SLIDER_6x8;
      if (wBucket === "6ft") return FREEZER_SLIDER_6x7;
      if (wBucket === "5ft") return FREEZER_SLIDER_5x7;
      if (wBucket === "4ft") return FREEZER_SLIDER_4x7;
      return null;
    }
    if (wBucket === "8ft" && hBucket === "8ft") return COOLER_SLIDER_8x8;
    if (wBucket === "6ft" && hBucket === "8ft") return COOLER_SLIDER_6x8;
    if (wBucket === "6ft") return COOLER_SLIDER_6x7;
    if (wBucket === "5ft") return COOLER_SLIDER_5x7;
    if (wBucket === "4ft") return COOLER_SLIDER_4x7;
    return null;
  }

  // -----------------------------------------------------------------------
  // Exterior swing doors
  // -----------------------------------------------------------------------
  if (isExterior) {
    if (isFreezer) {
      if (wBucket === "3ft") {
        return isHighSill ? EXTERIOR_FREEZER_3x7_HIGH_SILL : EXTERIOR_FREEZER_3x7;
      }
      return null;
    }
    // Exterior cooler — only 3ft defined
    if (wBucket === "3ft") return EXTERIOR_COOLER_3x7;
    return null;
  }

  // -----------------------------------------------------------------------
  // Interior swing doors — Freezer
  // -----------------------------------------------------------------------
  if (isFreezer) {
    if (wBucket === "3ft") {
      if (isHighSill) return FREEZER_SWING_3x7_HIGH_SILL;
      // Plug doors explicitly built from the plug template config
      // (frameType won't be set for plug configs — detected via isPlug on specs)
      return FREEZER_SWING_3x7;
    }
    if (wBucket === "4ft") return FREEZER_SWING_4x7;
    if (wBucket === "5ft") return FREEZER_SWING_5x7;
    return null;
  }

  // -----------------------------------------------------------------------
  // Interior swing doors — Cooler
  // -----------------------------------------------------------------------
  if (wBucket === "5ft") return COOLER_SWING_5x7;
  if (wBucket === "4ft") return COOLER_SWING_4x7;

  // 3ft cooler — check high sill and gasket type
  if (wBucket === "3ft") {
    if (isHighSill) return COOLER_SWING_3x7_HIGH_SILL;
    if (specs.gasketType?.toUpperCase() === "NEOPRENE") return COOLER_SWING_3x7_NEOPRENE;
    return COOLER_SWING_3x7;
  }

  return null;
}

/**
 * Match a plug door recipe specifically.
 * Plug doors are frameless freezer doors — separate matcher since they
 * don't go through the normal frame-type flow.
 */
export function matchPlugDoorRecipe(specs: {
  widthInClear?: string;
}): DoorRecipe | null {
  const width = parseWidthToInches(specs.widthInClear ?? "");
  const wBucket = widthBucket(width);
  if (wBucket === "3ft") return FREEZER_SWING_3x7_PLUG;
  return null;
}
