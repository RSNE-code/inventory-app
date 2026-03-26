import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── Assembly template definitions from RSNE Assemblies.docx ───

interface TemplateDef {
  name: string
  type: "DOOR" | "FLOOR_PANEL" | "WALL_PANEL"
  description: string
  specs: Record<string, string>
  components: Array<{ name: string; qty: number }>
}

const templates: TemplateDef[] = [
  {
    name: "Cooler Door 3' x 7'",
    type: "DOOR",
    description: 'One (1) 34" x 78" manual swing cooler door and frame; includes self-closing hardware, magnetic gaskets, interior/exterior kickplates, and white embossed galvanized steel finish.',
    specs: { width: "3ft", height: "7ft", doorType: "Swing", hardware: "Self-closing, magnetic gaskets", insulation: "EPS 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92.0 },
      { name: "Magnetic Gasket 8'", qty: 2.5 },
      { name: "HINGE D690", qty: 2.0 },
      { name: "D90 Handle", qty: 1.0 },
      { name: 'D276 Door Closer 1-3/8" OS, Satin Chrome', qty: 1.0 },
      { name: "EPS Sheet 3.5\" x 4' x 8'", qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Glow Push Panel", qty: 1.0 },
      { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
      { name: 'Wiper Gasket 8.5"', qty: 0.03 },
    ],
  },
  {
    name: "Cooler Door 3' x 7' (99 Restaurants)",
    type: "DOOR",
    description: 'One (1) 34" x 78" manual swing cooler door and frame; includes premium hardware, neoprene gaskets, interior/exterior kickplates, and white embossed galvanized steel finish.',
    specs: { width: "3ft", height: "7ft", doorType: "Swing", hardware: "Premium Kason, neoprene gaskets", insulation: "EPS 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 95.0 },
      { name: 'Wiper Gasket 8.5"', qty: 0.03 },
      { name: "GASKET, 100' ROLL JAMISON", qty: 0.2 },
      { name: "K1245 1-1/4 OS Hinge", qty: 3.0 },
      { name: "K56 Latch (Body Chrome)", qty: 1.0 },
      { name: "K56 Strike", qty: 1.0 },
      { name: "EPS Sheet 3.5\" x 4' x 8'", qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Glow Push Panel", qty: 1.0 },
      { name: "Diamond Plate .063 4' x 8'", qty: 1.0 },
      { name: "SSSH 0408 16", qty: 0.25 },
      { name: "K1094 Closer", qty: 1.0 },
      { name: "Hook for K1094 Closer", qty: 1.0 },
    ],
  },
  {
    name: "Cooler Door 4' x 7'",
    type: "DOOR",
    description: 'One (1) 48" x 84" manual swing cooler door and frame; includes non self-closing heavy-duty hardware, neoprene gaskets, interior/exterior kickplates, and white embossed galvanized steel finish.',
    specs: { width: "4ft", height: "7ft", doorType: "Swing", hardware: "Heavy-duty, non self-closing, neoprene gaskets", insulation: "EPS 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 3.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 110.0 },
      { name: 'Wiper Gasket 8.5"', qty: 0.04 },
      { name: "GASKET, 100' ROLL JAMISON", qty: 0.18 },
      { name: "K1277 Cam-lift Strap Hinge", qty: 2.0 },
      { name: "K56 Latch (Body Chrome)", qty: 1.0 },
      { name: "K56 Strike", qty: 1.0 },
      { name: "EPS Sheet 3.5\" x 4' x 8'", qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Diamond Plate .063 4' x 8'", qty: 1.0 },
    ],
  },
  {
    name: "Cooler Door 5' x 7'",
    type: "DOOR",
    description: 'One (1) 60" x 84" manual swing cooler door and frame; includes non self-closing heavy-duty hardware, neoprene gaskets, interior/exterior kickplates, and white embossed galvanized steel finish.',
    specs: { width: "5ft", height: "7ft", doorType: "Swing", hardware: "Heavy-duty, non self-closing", insulation: "EPS 2\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 3.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 120.0 },
      { name: 'Wiper Gasket 8.5"', qty: 0.05 },
      { name: "GASKET, 100' ROLL JAMISON", qty: 0.2 },
      { name: "K1277 Cam-lift Strap Hinge", qty: 3.0 },
      { name: "K55 Complete", qty: 1.0 },
      { name: "EPS Sheet 2\" x 4' x 8'", qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Diamond Plate .063 4' x 8'", qty: 1.0 },
    ],
  },
  {
    name: "Cooler Door High Sill 3' x 7'",
    type: "DOOR",
    description: 'One (1) 34" x 78" manual swing cooler door and frame with high sill; includes self-closing hardware, magnetic gaskets, interior/exterior kickplates, and white embossed galvanized steel finish.',
    specs: { width: "3ft", height: "7ft", doorType: "Swing (High Sill)", hardware: "Self-closing, magnetic gaskets", insulation: "EPS 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92.0 },
      { name: "Magnetic Gasket 8'", qty: 2.5 },
      { name: "HINGE D690", qty: 2.0 },
      { name: "D90 Handle", qty: 1.0 },
      { name: 'D276 Door Closer 1-3/8" OS, Satin Chrome', qty: 1.0 },
      { name: "EPS Sheet 3.5\" x 4' x 8'", qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Glow Push Panel", qty: 1.0 },
      { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
    ],
  },
  {
    name: "Cooler Slider 4' x 7'",
    type: "DOOR",
    description: 'One (1) 48" x 84" manual single horizontal sliding cooler door with track system, hardware, neoprene gaskets, and white embossed galvanized steel finish.',
    specs: { width: "4ft", height: "7ft", doorType: "Slider", hardware: "Track system, floor roller", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 48", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-8'-44-4", qty: 32.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 60.0 },
      { name: 'Wiper Gasket 3"', qty: 0.1 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 4.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 60.0 },
    ],
  },
  {
    name: "Cooler Slider 5' x 7'",
    type: "DOOR",
    description: 'One (1) 60" x 84" manual single horizontal sliding cooler door with track system.',
    specs: { width: "5ft", height: "7ft", doorType: "Slider", hardware: "Track system, floor roller", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 60", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-8'-44-4", qty: 64.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 70.0 },
      { name: 'Wiper Gasket 3"', qty: 0.12 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 5.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 60.0 },
    ],
  },
  {
    name: "Cooler Slider 6' x 7'",
    type: "DOOR",
    description: 'One (1) 72" x 84" manual single horizontal sliding cooler door.',
    specs: { width: "6ft", height: "7ft", doorType: "Slider", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 72", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-8'-44-4", qty: 64.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 70.0 },
      { name: 'Wiper Gasket 3"', qty: 0.14 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 5.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 70.0 },
    ],
  },
  {
    name: "Cooler Slider 6' x 8'",
    type: "DOOR",
    description: 'One (1) 72" x 96" manual single horizontal sliding cooler door.',
    specs: { width: "6ft", height: "8ft", doorType: "Slider", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 72", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-8'-44-4", qty: 80.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 70.0 },
      { name: 'Wiper Gasket 3"', qty: 0.14 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 6.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 70.0 },
    ],
  },
  {
    name: "Cooler Slider 8' x 8'",
    type: "DOOR",
    description: 'One (1) 96" x 96" manual single horizontal sliding cooler door.',
    specs: { width: "8ft", height: "8ft", doorType: "Slider", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 96", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-8'-44-4", qty: 80.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 115.0 },
      { name: 'Wiper Gasket 3"', qty: 0.18 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 8.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 80.0 },
    ],
  },
  {
    name: "Exterior Cooler Door 3' x 7'",
    type: "DOOR",
    description: 'One (1) 36" x 84" manual swing cooler door and frame; includes non self-closing heavy-duty lockable hardware, neoprene gaskets, security screws, hood, and white embossed galvanized steel finish.',
    specs: { width: "3ft", height: "7ft", doorType: "Swing (Exterior)", hardware: "Heavy-duty lockable, hood", insulation: "EPS 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92.0 },
      { name: "GASKET, 100' ROLL JAMISON", qty: 0.18 },
      { name: "K1245 1-1/4 OS Hinge", qty: 2.0 },
      { name: "K56 Latch (Body Chrome)", qty: 1.0 },
      { name: "K56 Strike", qty: 1.0 },
      { name: "EPS Sheet 3.5\" x 4' x 8'", qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
      { name: "K481 Safety Glow Inside Release, 6\" Door", qty: 1.0 },
      { name: 'Wiper Gasket 8.5"', qty: 0.03 },
    ],
  },
  {
    name: "Exterior Freezer Door 3' x 7'",
    type: "DOOR",
    description: 'One (1) 36" x 84" manual swing freezer door and frame; includes non self-closing heavy-duty lockable hardware, neoprene gaskets, frost-stop heater, and white embossed galvanized steel finish.',
    specs: { width: "3ft", height: "7ft", doorType: "Swing (Exterior Freezer)", hardware: "Heavy-duty lockable, heater", insulation: "Trymer 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92.0 },
      { name: "GASKET, 100' ROLL JAMISON", qty: 0.18 },
      { name: "K1245 1-1/4 OS Hinge", qty: 2.0 },
      { name: "K56 Latch (Body Chrome)", qty: 1.0 },
      { name: "K56 Strike", qty: 1.0 },
      { name: 'TRYMER 200L 3-1/2" - 48" X 96"', qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
      { name: "K481 Safety Glow Inside Release, 6\" Door", qty: 1.0 },
      { name: 'Wiper Gasket 8.5"', qty: 0.03 },
      { name: "12' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "32' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
    ],
  },
  {
    name: "Exterior Freezer Door High Sill 3' x 7'",
    type: "DOOR",
    description: 'One (1) 36" x 84" manual swing freezer door and frame with high sill; includes non self-closing heavy-duty lockable hardware, neoprene gaskets, frost-stop heater, and white embossed galvanized steel finish.',
    specs: { width: "3ft", height: "7ft", doorType: "Swing (Exterior Freezer High Sill)", hardware: "Heavy-duty lockable, heater", insulation: "Trymer 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92.0 },
      { name: "GASKET, 100' ROLL JAMISON", qty: 0.2 },
      { name: "K1245 1-1/4 OS Hinge", qty: 2.0 },
      { name: "K56 Latch (Body Chrome)", qty: 1.0 },
      { name: "K56 Strike", qty: 1.0 },
      { name: 'TRYMER 200L 3-1/2" - 48" X 96"', qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
      { name: "K481 Safety Glow Inside Release, 6\" Door", qty: 1.0 },
      { name: "40' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
    ],
  },
  {
    name: "Freezer Door 3' x 7'",
    type: "DOOR",
    description: 'One (1) 34" x 78" manual swing freezer door and frame; includes self-closing hardware, magnetic gaskets, frost-stop heater, interior/exterior kickplates and white embossed galvanized steel finish.',
    specs: { width: "3ft", height: "7ft", doorType: "Swing (Freezer)", hardware: "Self-closing, magnetic gaskets, heater", insulation: "Trymer 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 95.0 },
      { name: "Magnetic Gasket 8'", qty: 2.5 },
      { name: "HINGE D690", qty: 2.0 },
      { name: "D90 Handle", qty: 1.0 },
      { name: 'D276 Door Closer 1-3/8" OS, Satin Chrome', qty: 1.0 },
      { name: 'TRYMER 200L 3-1/2" - 48" X 96"', qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Glow Push Panel", qty: 1.0 },
      { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
      { name: 'Wiper Gasket 8.5"', qty: 0.03 },
      { name: "12' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "34' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
    ],
  },
  {
    name: "Freezer Door 3' x 7' (99 Restaurants)",
    type: "DOOR",
    description: 'One (1) 34" x 78" manual swing freezer door and frame; includes premium Kason hardware, neoprene gaskets, frost-stop heater.',
    specs: { width: "3ft", height: "7ft", doorType: "Swing (Freezer)", hardware: "Premium Kason, neoprene gaskets, heater", insulation: "Trymer 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 92.0 },
      { name: "K1248 1-1/4 OS Hinge", qty: 3.0 },
      { name: "K56 Latch (Body Chrome)", qty: 1.0 },
      { name: "K56 Strike", qty: 1.0 },
      { name: 'TRYMER 200L 3-1/2" - 48" X 96"', qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "K481 Safety Glow Inside Release, 6\" Door", qty: 1.0 },
      { name: "Diamond Plate .063 4' x 8'", qty: 1.0 },
      { name: 'Wiper Gasket 8.5"', qty: 0.03 },
      { name: "12' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "34' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "Kason Slider Exterior Pull Handle", qty: 1.0 },
      { name: "SSSH 0408 16", qty: 0.25 },
      { name: "GASKET, 100' ROLL JAMISON", qty: 0.2 },
    ],
  },
  {
    name: "Freezer Door 4' x 7'",
    type: "DOOR",
    description: 'One (1) 48" x 84" manual swing freezer door and frame; includes non self-closing heavy-duty hardware, neoprene gaskets, frost-stop heater.',
    specs: { width: "4ft", height: "7ft", doorType: "Swing (Freezer)", hardware: "Heavy-duty, heater", insulation: "Trymer 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 3.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 110.0 },
      { name: 'Wiper Gasket 8.5"', qty: 0.18 },
      { name: "GASKET, 100' ROLL JAMISON", qty: 0.18 },
      { name: "K1277 Cam-lift Strap Hinge", qty: 2.0 },
      { name: "K56 Latch (Body Chrome)", qty: 1.0 },
      { name: "K56 Strike", qty: 1.0 },
      { name: 'TRYMER 200L 3-1/2" - 48" X 96"', qty: 1.0 },
      { name: "36' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "15' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Diamond Plate .063 4' x 8'", qty: 1.0 },
      { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
    ],
  },
  {
    name: "Freezer Door 5' x 7'",
    type: "DOOR",
    description: 'One (1) 60" x 84" manual swing freezer door and frame; includes non self-closing heavy-duty hardware, neoprene gaskets, frost-stop heater.',
    specs: { width: "5ft", height: "7ft", doorType: "Swing (Freezer)", hardware: "Heavy-duty, heater", insulation: "Trymer 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 3.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 120.0 },
      { name: 'Wiper Gasket 8.5"', qty: 0.05 },
      { name: "GASKET, 100' ROLL JAMISON", qty: 0.2 },
      { name: "K1277 Cam-lift Strap Hinge", qty: 3.0 },
      { name: "K55 Complete", qty: 1.0 },
      { name: 'TRYMER 200L 3-1/2" - 48" X 96"', qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Diamond Plate .063 4' x 10'", qty: 1.0 },
      { name: "38' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "15' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
    ],
  },
  {
    name: "Freezer Door High Sill 3' x 7'",
    type: "DOOR",
    description: 'One (1) 34" x 78" manual swing freezer door with high sill; includes self-closing hardware, magnetic gaskets, frost-stop heater.',
    specs: { width: "3ft", height: "7ft", doorType: "Swing (Freezer High Sill)", hardware: "Self-closing, heater", insulation: "Trymer 4\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 95.0 },
      { name: "Magnetic Gasket 8'", qty: 2.5 },
      { name: "HINGE D690", qty: 2.0 },
      { name: "D90 Handle", qty: 1.0 },
      { name: 'D276 Door Closer 1-3/8" OS, Satin Chrome', qty: 1.0 },
      { name: 'TRYMER 200L 4" - 48" X 96"', qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Glow Push Panel", qty: 1.0 },
      { name: "Diamond Plate .063 4' x 8'", qty: 0.5 },
      { name: "40' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
      { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.2 },
    ],
  },
  {
    name: "Freezer Door Plug 3' x 7'",
    type: "DOOR",
    description: 'One (1) 34" x 78" manual swing freezer door, no frame; includes self-closing hardware, magnetic gaskets, frost-stop heater.',
    specs: { width: "3ft", height: "7ft", doorType: "Plug (Freezer)", hardware: "Self-closing, magnetic gaskets, heater", insulation: "Trymer 3.5\"", finish: "White Embossed Galv" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 60.0 },
      { name: "Magnetic Gasket 8'", qty: 2.0 },
      { name: 'TRYMER 200L 3-1/2" - 48" X 96"', qty: 1.0 },
      { name: "Silicone Sealant (White)", qty: 0.1 },
      { name: "ADFOAM 1875", qty: 0.2 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Glow Push Panel", qty: 1.0 },
      { name: 'Wiper Gasket 8.5"', qty: 0.03 },
      { name: "12' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
    ],
  },
  // Freezer sliders
  {
    name: "Freezer Slider 4' x 7'",
    type: "DOOR",
    description: 'One (1) 48" x 84" manual single horizontal sliding freezer door with track system, frost stop heaters.',
    specs: { width: "4ft", height: "7ft", doorType: "Slider (Freezer)", hardware: "Track system, heater", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 48", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-8'-44-4", qty: 32.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 60.0 },
      { name: 'Wiper Gasket 3"', qty: 0.1 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 4.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 60.0 },
      { name: "35.67' - HEATER, WIRE FIBERGLASS BRAID, 115V, -10DEG, SINGLE WRAP", qty: 1.0 },
    ],
  },
  {
    name: "Freezer Slider 5' x 7'",
    type: "DOOR",
    description: 'One (1) 60" x 84" manual single horizontal sliding freezer door.',
    specs: { width: "5ft", height: "7ft", doorType: "Slider (Freezer)", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 60", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-8'-44-4", qty: 64.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 70.0 },
      { name: 'Wiper Gasket 3"', qty: 0.12 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 5.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 60.0 },
      { name: "35.67' - HEATER, WIRE FIBERGLASS BRAID, 115V, -10DEG, SINGLE WRAP", qty: 1.0 },
      { name: "Galvanized Sheet 4' x 8' (20ga)", qty: 0.25 },
      { name: "SSSH 0410 26", qty: 0.1 },
    ],
  },
  {
    name: "Freezer Slider 6' x 7'",
    type: "DOOR",
    description: 'One (1) 72" x 84" manual single horizontal sliding freezer door.',
    specs: { width: "6ft", height: "7ft", doorType: "Slider (Freezer)", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 72", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-8'-44-4", qty: 64.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 80.0 },
      { name: 'Wiper Gasket 3"', qty: 0.14 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 6.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 60.0 },
      { name: "35.67' - HEATER, WIRE FIBERGLASS BRAID, 115V, -10DEG, SINGLE WRAP", qty: 1.0 },
    ],
  },
  {
    name: "Freezer Slider 6' x 8'",
    type: "DOOR",
    description: 'One (1) 72" x 96" manual single horizontal sliding freezer door.',
    specs: { width: "6ft", height: "8ft", doorType: "Slider (Freezer)", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 96", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-10'-44-4", qty: 80.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 90.0 },
      { name: 'Wiper Gasket 3"', qty: 0.14 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 6.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 60.0 },
      { name: "35.67' - HEATER, WIRE FIBERGLASS BRAID, 115V, -10DEG, SINGLE WRAP", qty: 1.0 },
    ],
  },
  {
    name: "Freezer Slider 8' x 8'",
    type: "DOOR",
    description: 'One (1) 96" x 96" manual single horizontal sliding freezer door.',
    specs: { width: "8ft", height: "8ft", doorType: "Slider (Freezer)", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 96", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-10'-44-4", qty: 80.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 120.0 },
      { name: 'Wiper Gasket 3"', qty: 0.18 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 8.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 80.0 },
      { name: "37.5' - HEATER, WIRE FIBERGLASS BRAID, 115V, -10DEG, SINGLE WRAP", qty: 1.0 },
    ],
  },
  {
    name: "Freezer Slider 10' x 10'",
    type: "DOOR",
    description: 'One (1) 120" x 120" manual single horizontal sliding freezer door.',
    specs: { width: "10ft", height: "10ft", doorType: "Slider (Freezer)", finish: "White Embossed Galv" },
    components: [
      { name: "SLD 120", qty: 1.0 },
      { name: "Insulated Metal Panel (AWIP)-8'-44-4", qty: 144.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 150.0 },
      { name: 'Wiper Gasket 3"', qty: 0.24 },
      { name: "Kason Heavy Duty Floor Roller w/ Strike", qty: 1.0 },
      { name: "STRIKER", qty: 1.0 },
      { name: "Slider Tongue - Non-padlock", qty: 1.0 },
      { name: "Aluminum Flat Bar .250 x 3\" x 12'", qty: 10.0 },
      { name: "SUB_ASSEMBLY:Upright Gasket Assembly", qty: 3.0 },
      { name: "Fasteners (Generic)", qty: 90.0 },
      { name: "42' - HEATER, WIRE FIBERGLASS BRAID, 115V, -10DEG, SINGLE WRAP", qty: 1.0 },
    ],
  },
  // Sub-assemblies and misc
  {
    name: "Bottom Sweep Assembly (Cooler)",
    type: "DOOR",
    description: "Replacement bottom sweep assembly for cooler doors",
    specs: { doorType: "Sub-assembly (Cooler)" },
    components: [
      { name: 'Wiper Gasket 8.5"', qty: 0.03 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 1.2 },
    ],
  },
  {
    name: "Bottom Sweep Assembly (Freezer)",
    type: "DOOR",
    description: "Replacement bottom sweep assembly for freezer doors",
    specs: { doorType: "Sub-assembly (Freezer)" },
    components: [
      { name: 'Wiper Gasket 8.5"', qty: 0.03 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 1.2 },
      { name: "12' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
    ],
  },
  {
    name: "Cooler Ramp",
    type: "DOOR",
    description: 'Custom built cooler ramp (40" x 32").',
    specs: { doorType: "Ramp (Cooler)" },
    components: [
      { name: "Diamond Plate .063 4' x 8'", qty: 0.2 },
      { name: "2\" x 6\" x 8' – Doug Fir", qty: 1.0 },
      { name: 'TRYMER 200L 4" - 48" X 96"', qty: 0.2 },
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 0.2 },
      { name: "Fasteners (Generic)", qty: 30.0 },
    ],
  },
  {
    name: "Freezer Ramp",
    type: "DOOR",
    description: 'Custom built heated freezer ramp (40" x 32").',
    specs: { doorType: "Ramp (Freezer)" },
    components: [
      { name: "Diamond Plate .063 4' x 8'", qty: 0.2 },
      { name: "2\" x 6\" x 8' – Doug Fir", qty: 1.0 },
      { name: 'TRYMER 200L 4" - 48" X 96"', qty: 0.2 },
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 0.2 },
      { name: "Fasteners (Generic)", qty: 30.0 },
      { name: "15' - HEATER, WIRE ALUM BRAID, 115V, -10 DEG, 2 WRAP", qty: 1.0 },
    ],
  },
  {
    name: "Upright Gasket Assembly",
    type: "DOOR",
    description: "RSNE fabricated upright gasket for sliders",
    specs: { doorType: "Sub-assembly" },
    components: [
      { name: "POLY FOAM", qty: 8.0 },
      { name: "Slider Gasket - 6.5' (Cloth Inserted)", qty: 8.0 },
      { name: "PVC Corner 8' Black", qty: 1.0 },
    ],
  },
  // Panels
  {
    name: "EPS Wall/Ceiling Panel (3\") - 4 x 10",
    type: "WALL_PANEL",
    description: "FRP/EPS RSNE Fabricated Wall/Ceiling Panel - 10'",
    specs: { insulation: "EPS 2\"", size: "4' x 10'" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.5 },
      { name: "EPS Sheet 2\" x 4' x 10'", qty: 1.0 },
      { name: "FRP 4 x 10", qty: 2.0 },
      { name: "GLUE 5635", qty: 0.05 },
    ],
  },
  {
    name: "EPS Wall/Ceiling Panel (3\") - 4 x 8",
    type: "WALL_PANEL",
    description: "FRP/EPS RSNE Fabricated Wall/Ceiling Panel - 8'",
    specs: { insulation: "EPS 2\"", size: "4' x 8'" },
    components: [
      { name: '11/32X48X96 ARAUCO AC RADIATA PINE Sanded (3/8")', qty: 2.0 },
      { name: "EPS Sheet 2\" x 4' x 8'", qty: 1.0 },
      { name: "FRP .090 4' x 8' White", qty: 2.0 },
      { name: "GLUE 5635", qty: 0.02 },
    ],
  },
  {
    name: "EPS Wall/Ceiling Panel (4\") - 4 x 10",
    type: "WALL_PANEL",
    description: "FRP/EPS RSNE Fabricated Wall/Ceiling Panel - 10'",
    specs: { insulation: "EPS 3\"", size: "4' x 10'" },
    components: [
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 2.0 },
      { name: "EPS Sheet 3\" x 4' x 10'", qty: 1.0 },
      { name: "FRP 4 x 10", qty: 2.0 },
      { name: "GLUE 5635", qty: 0.05 },
    ],
  },
  {
    name: "EPS Wall/Ceiling Panel (4\") - 4 x 8",
    type: "WALL_PANEL",
    description: "FRP/EPS RSNE Fabricated Wall/Ceiling Panel - 8'",
    specs: { insulation: "EPS 3\"", size: "4' x 8'" },
    components: [
      { name: '11/32X48X96 ARAUCO AC RADIATA PINE Sanded (3/8")', qty: 2.0 },
      { name: "EPS Sheet 3\" x 4' x 8'", qty: 1.0 },
      { name: "FRP .090 4' x 8' White", qty: 2.0 },
      { name: "GLUE 5635", qty: 0.02 },
    ],
  },
  {
    name: "FRP Liner 4 x 10",
    type: "WALL_PANEL",
    description: "FRP/EPS/FRP Liner 4' x 10'",
    specs: { size: "4' x 10'" },
    components: [
      { name: "FRP 4 x 10", qty: 2.0 },
      { name: "EPS Sheet 2\" x 4' x 10'", qty: 1.0 },
      { name: "GLUE 5635", qty: 0.05 },
    ],
  },
  {
    name: "FRP Liner 4 x 8",
    type: "WALL_PANEL",
    description: "FRP/EPS/FRP Liner 4' x 8'",
    specs: { size: "4' x 8'" },
    components: [
      { name: "FRP .090 4' x 8' White", qty: 2.0 },
      { name: "EPS Sheet 2\" x 4' x 8'", qty: 1.0 },
      { name: "GLUE 5635", qty: 0.05 },
    ],
  },
  {
    name: "GALV/FRP Liner 4 x 10",
    type: "WALL_PANEL",
    description: "White Embossed GALV/EPS/FRP Liner 4' x 10'",
    specs: { size: "4' x 10'" },
    components: [
      { name: "FRP 4 x 10", qty: 1.0 },
      { name: "EPS Sheet 2\" x 4' x 10'", qty: 1.0 },
      { name: "GLUE 5635", qty: 0.03 },
      { name: "Galvanized Steel Coil - Textured Gray (26ga)", qty: 40.0 },
    ],
  },
  // Floor panels
  {
    name: "Floor Panel - 8'",
    type: "FLOOR_PANEL",
    description: "8' Floor Panel with 3.5\" urethane foam and .063 diamond plate finish",
    specs: { insulation: "Trymer 3.5\"", size: "4' x 8'", finish: ".063 Diamond Plate" },
    components: [
      { name: 'TRYMER 200L 3-1/2" - 48" X 96"', qty: 1.0 },
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 1.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 32.0 },
      { name: "GLUE 5635", qty: 0.02 },
      { name: "Diamond Plate .063 4' x 8'", qty: 1.0 },
    ],
  },
  {
    name: "Floor Panel - 10'",
    type: "FLOOR_PANEL",
    description: "10' Floor Panel with 3.5\" urethane foam and .063 diamond plate finish",
    specs: { insulation: "Trymer 3.5\"", size: "4' x 10'", finish: ".063 Diamond Plate" },
    components: [
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 40.0 },
      { name: 'TRYMER 200L 3-1/2" - 48" X 96"', qty: 1.25 },
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 1.25 },
      { name: "GLUE 5635", qty: 0.03 },
      { name: "Diamond Plate .063 4' x 10'", qty: 1.0 },
    ],
  },
  {
    name: "Floor Panel - 12'",
    type: "FLOOR_PANEL",
    description: "12' Floor Panel with 3.5\" urethane foam and .063 diamond plate finish",
    specs: { insulation: "Trymer 3.5\"", size: "4' x 12'", finish: ".063 Diamond Plate" },
    components: [
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 48.0 },
      { name: 'TRYMER 200L 3-1/2" - 48" X 96"', qty: 1.5 },
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 1.5 },
      { name: "GLUE 5635", qty: 0.05 },
      { name: "Diamond Plate .063 4' x 12'", qty: 1.0 },
    ],
  },
  {
    name: "Floor Panel (5\" urethane) - 8'",
    type: "FLOOR_PANEL",
    description: "8' Floor Panel with 5\" urethane foam and .063 diamond plate finish",
    specs: { insulation: "Trymer 5\"", size: "4' x 8'", finish: ".063 Diamond Plate" },
    components: [
      { name: 'TRYMER 200L 5" - 48" X 96"', qty: 1.0 },
      { name: '19/32X48X96 ARAUCO AC RADIATA PINE Sanded (5/8")', qty: 1.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 26.0 },
      { name: "GLUE 5635", qty: 0.02 },
      { name: "Diamond Plate .063 4' x 8'", qty: 1.0 },
    ],
  },
  {
    name: "Heavy Duty Floor Panel - 8'",
    type: "FLOOR_PANEL",
    description: "8' Floor Panel with 5\" urethane foam and .125 diamond plate finish",
    specs: { insulation: "Trymer 5\"", size: "4' x 8'", finish: ".125 Diamond Plate" },
    components: [
      { name: 'TRYMER 200L 5" - 48" X 96"', qty: 1.0 },
      { name: '23/32X48X96 ARAUCO AC RADIATA PINE Sanded (3/4")', qty: 1.0 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 32.0 },
      { name: "GLUE 5635", qty: 0.02 },
      { name: "Diamond Plate .125 4' x 8'", qty: 1.0 },
    ],
  },
  {
    name: "Heavy Duty Floor Panel - 10'",
    type: "FLOOR_PANEL",
    description: "10' Floor Panel with 5\" urethane foam and .125 diamond plate finish",
    specs: { insulation: "Trymer 5\"", size: "4' x 10'", finish: ".125 Diamond Plate" },
    components: [
      { name: 'TRYMER 200L 5" - 48" X 96"', qty: 1.25 },
      { name: '23/32X48X96 ARAUCO AC RADIATA PINE Sanded (3/4")', qty: 1.25 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 40.0 },
      { name: "GLUE 5635", qty: 0.03 },
      { name: "Diamond Plate .125 4' x 10'", qty: 1.0 },
    ],
  },
  {
    name: "Heavy Duty Floor Panel - 12'",
    type: "FLOOR_PANEL",
    description: "12' Heavy Duty Floor Panel with 5\" urethane foam and .125 diamond plate finish",
    specs: { insulation: "Trymer 5\"", size: "4' x 12'", finish: ".125 Diamond Plate" },
    components: [
      { name: 'TRYMER 200L 5" - 48" X 96"', qty: 1.5 },
      { name: '23/32X48X96 ARAUCO AC RADIATA PINE Sanded (3/4")', qty: 1.5 },
      { name: "Galvanized Steel Coil - Textured White (26ga)", qty: 36.0 },
      { name: "GLUE 5635", qty: 0.02 },
      { name: "Diamond Plate .125 4' x 8'", qty: 1.5 },
    ],
  },
]

// ─── Fuzzy product matching ───

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim()
}

function matchScore(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1.0

  const tokensA = na.split(" ")
  const tokensB = nb.split(" ")
  let matches = 0
  for (const t of tokensA) {
    if (tokensB.some((tb) => tb.includes(t) || t.includes(tb))) matches++
  }
  return matches / Math.max(tokensA.length, tokensB.length)
}

async function main() {
  console.log("Seeding assembly templates...")

  // Ensure "Assemblies" category exists for assembly Product records
  let assemblyCategory = await prisma.category.findUnique({ where: { name: "Assemblies" } })
  if (!assemblyCategory) {
    assemblyCategory = await prisma.category.create({
      data: { name: "Assemblies", color: "#3B82F6", sortOrder: 99 },
    })
  }
  const assemblyCategoryId = assemblyCategory.id

  // Load all products
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  })

  console.log(`Found ${products.length} products in catalog`)

  // Build lookup: try exact match first, then fuzzy
  function findProduct(componentName: string): { id: string; name: string } | null {
    // Exact match (case-insensitive)
    const exact = products.find(
      (p) => p.name.toLowerCase() === componentName.toLowerCase()
    )
    if (exact) return exact

    // Fuzzy match — find best
    let bestScore = 0
    let bestProduct: { id: string; name: string } | null = null
    for (const p of products) {
      const score = matchScore(componentName, p.name)
      if (score > bestScore) {
        bestScore = score
        bestProduct = p
      }
    }

    if (bestScore >= 0.6 && bestProduct) return bestProduct
    return null
  }

  let templatesCreated = 0
  let componentsCreated = 0
  let unmatchedComponents: string[] = []

  for (const tmpl of templates) {
    // Check if template already exists
    const existing = await prisma.assemblyTemplate.findFirst({
      where: { name: tmpl.name },
    })
    if (existing) {
      console.log(`  Skipping "${tmpl.name}" — already exists`)
      continue
    }

    // Match components to products
    const matchedComponents: Array<{
      productId: string
      qtyPerUnit: number
      notes: string | null
    }> = []

    const subAssemblies: string[] = []
    for (const comp of tmpl.components) {
      // Skip sub-assembly references (e.g., "SUB_ASSEMBLY:Upright Gasket Assembly")
      if (comp.name.startsWith("SUB_ASSEMBLY:")) {
        subAssemblies.push(comp.name.replace("SUB_ASSEMBLY:", ""))
        continue
      }
      const product = findProduct(comp.name)
      if (product) {
        matchedComponents.push({
          productId: product.id,
          qtyPerUnit: comp.qty,
          notes: null,
        })
      } else {
        unmatchedComponents.push(`${tmpl.name}: "${comp.name}"`)
      }
    }

    if (matchedComponents.length === 0) {
      console.log(`  Skipping "${tmpl.name}" — no components matched`)
      continue
    }

    const template = await prisma.assemblyTemplate.create({
      data: {
        name: tmpl.name,
        type: tmpl.type,
        description: tmpl.description,
        specs: {
          ...tmpl.specs,
          ...(subAssemblies.length > 0 ? { subAssemblies } : {}),
        } as Prisma.InputJsonValue,
        components: {
          create: matchedComponents.map((c) => ({
            productId: c.productId,
            qtyPerUnit: new Prisma.Decimal(c.qtyPerUnit),
            notes: c.notes,
          })),
        },
      },
    })

    // Create corresponding Product record (first-class catalog item)
    await prisma.product.create({
      data: {
        name: tmpl.name,
        categoryId: assemblyCategoryId,
        tier: "TIER_1",
        unitOfMeasure: "each",
        currentQty: new Prisma.Decimal(0),
        reorderPoint: new Prisma.Decimal(0),
        avgCost: new Prisma.Decimal(0),
        lastCost: new Prisma.Decimal(0),
        isAssembly: true,
        assemblyTemplateId: template.id,
        notes: tmpl.description,
      },
    })

    templatesCreated++
    componentsCreated += matchedComponents.length
    const totalMaterials = tmpl.components.filter((c) => !c.name.startsWith("SUB_ASSEMBLY:")).length
    const subAsmNote = subAssemblies.length > 0 ? ` + ${subAssemblies.length} sub-assembly ref(s)` : ""
    console.log(`  Created "${tmpl.name}" (${matchedComponents.length}/${totalMaterials} components matched${subAsmNote})`)
  }

  console.log(`\nDone! Created ${templatesCreated} templates with ${componentsCreated} component links.`)

  if (unmatchedComponents.length > 0) {
    console.log(`\n${unmatchedComponents.length} components could not be matched to catalog:`)
    // Deduplicate
    const unique = [...new Set(unmatchedComponents)]
    for (const u of unique) {
      console.log(`  - ${u}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
