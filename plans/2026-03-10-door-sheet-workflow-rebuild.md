# Plan: Door Sheet Workflow Rebuild — Two-Document System

**Created:** 2026-03-10
**Status:** Implemented
**Request:** Rebuild the door workflow with two documents: AI-populated Door Spec Sheet (for SM approval) and auto-generated Door Manufacturing Sheet (for door shop floor), connected by an approval flow.

---

## Overview

### What This Plan Accomplishes

Replaces the current generic door assembly form with a two-document system that mirrors RSNE's real paper workflow. The Sales Manager or Office Manager describes a door via voice/text → AI populates a detailed **Door Spec Sheet** (matching the engineering drawings) → AI asks clarifying questions for any data gaps → SM approves → system auto-generates a **Door Manufacturing Sheet** (matching the clipboard form the shop actually uses) → door appears in the Door Shop queue with the manufacturing sheet as the default view.

### Why This Matters

The current door creation flow has only 7 generic fields (width, height, type, hardware, insulation, finish, special notes). The real RSNE door sheets captured in the reference folder have 25+ specific fields covering frame type, jamb depth, heater size, gasket type, hinge manufacturer/part numbers, latch models, and more. This gap means the digital tool can't actually replace the paper process. This rebuild makes the app the actual system of record for doors — no more paper clipboard sheets.

---

## Current State

### Relevant Existing Structure

| File | What It Does |
|------|-------------|
| `rsne-inventory/src/app/assemblies/new/page.tsx` | Current door creation — 3-step wizard with 7 basic spec fields |
| `rsne-inventory/src/app/assemblies/[id]/page.tsx` | Current door detail — shows basic specs, approval actions, build controls |
| `rsne-inventory/src/app/assemblies/page.tsx` | Queue page — Door Shop / Fabrication tabs, swimlane layout |
| `rsne-inventory/src/app/api/assemblies/route.ts` | POST creates assembly, GET lists queue |
| `rsne-inventory/src/app/api/assemblies/[id]/route.ts` | PATCH handles approval, status transitions, spec changes |
| `rsne-inventory/src/hooks/use-assemblies.ts` | React Query hooks for CRUD |
| `rsne-inventory/src/lib/ai/parse.ts` | AI text/image parsing (materials only, no door spec awareness) |
| `rsne-inventory/src/components/ai/ai-input.tsx` | Reusable AI input bar (text + voice + camera) |
| `rsne-inventory/prisma/schema.prisma` | Assembly model with `specs Json?` field |
| `reference/Door Sheets copy/` | Real RSNE door sheets (5 PDFs + 1 manufacturing sheet sample) |

### Gaps or Problems Being Addressed

1. **Only 7 generic fields** vs 25+ real fields on RSNE's actual door sheets
2. **No AI-first door spec entry** — current flow is manual form fields, not voice/text → AI
3. **No gap detection** — AI doesn't ask follow-up questions for missing door specs
4. **No manufacturing sheet view** — shop floor sees the same detail page as office managers
5. **No distinction between spec sheet and shop sheet** — one document tries to serve both roles
6. **Current flow skips straight to components** — doesn't capture the door-specific specifications first

---

## Proposed Changes

### Summary of Changes

- Create a new AI door spec parser (`src/lib/ai/parse-door-specs.ts`) that converts voice/text into structured door specifications and identifies data gaps
- Create a new API route (`POST /api/ai/parse-door-specs`) for the door spec parser
- Rebuild the door creation page as a conversational AI flow: speak/type → see populated spec sheet → answer AI questions about gaps → review complete spec → submit for approval
- Create a new Door Spec Sheet component that displays all fields matching the real engineering drawings
- Create a new Door Manufacturing Sheet component that displays the simplified clipboard-style view
- Modify the assembly detail page to show manufacturing sheet by default for DOOR_SHOP roles, with a toggle to view the full spec sheet
- Expand the `specs` JSON structure to capture all real door sheet fields
- No schema migration needed — `specs` is already `Json?` and can hold any structure

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `rsne-inventory/src/lib/ai/parse-door-specs.ts` | AI parser: voice/text → structured door specs + gap questions |
| `rsne-inventory/src/app/api/ai/parse-door-specs/route.ts` | API route for door spec parsing |
| `rsne-inventory/src/components/doors/door-spec-sheet.tsx` | Full door spec sheet display (engineering drawing style) |
| `rsne-inventory/src/components/doors/door-manufacturing-sheet.tsx` | Simplified manufacturing sheet (clipboard style) |
| `rsne-inventory/src/components/doors/door-creation-flow.tsx` | AI conversational door creation (replaces current form) |
| `rsne-inventory/src/lib/door-specs.ts` | Door spec field definitions, defaults, validation, gap detection logic |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `rsne-inventory/src/app/assemblies/new/page.tsx` | Replace door form section with `DoorCreationFlow` component |
| `rsne-inventory/src/app/assemblies/[id]/page.tsx` | Replace basic spec card with manufacturing sheet (default) + spec sheet (toggle), role-aware views |
| `rsne-inventory/src/app/assemblies/page.tsx` | Show key door specs (size, type) on queue cards |

### Files to Delete

None — modifying in place.

---

## Design Decisions

### Key Decisions Made

1. **Keep `specs Json?` field, no schema migration**: The Assembly model already stores specs as flexible JSON. Expanding the JSON structure to hold 25+ fields is cleaner than adding 25 columns. No `prisma db push` needed.

2. **Separate AI parser for door specs** (not reusing `parse.ts`): The materials parser converts text to line items. Door spec parsing is fundamentally different — it needs to extract structured fields (frame type, gasket type, hinge part numbers) from natural language and know which fields are missing. A dedicated parser with a door-specific schema and system prompt is the right call.

3. **Conversational gap-filling in the AI flow**: Rather than showing a big form with empty fields, the AI parses what the user said, shows what it understood, and asks specific questions about anything missing. This matches the "so easy a 3-year-old can do it" principle — the user talks, the AI handles the structure.

4. **Manufacturing sheet as default view for door shop**: The door shop person doesn't need the engineering detail — they need the clipboard-style sheet. The full spec sheet is one tap away if they need it, but the default is the simplified manufacturing view.

5. **Door type categories**: Based on the real sheets, doors fall into 3 categories:
   - **Hinged Cooler Door** (DR COOLER RSNE-B.pdf)
   - **Hinged Freezer Door** (DR FREEZER RSNE-B.pdf)
   - **Manual Horizontal Sliding Door** (MHS-*.pdf)

   The AI will determine the category from the user's input and populate the appropriate fields.

6. **No PDF generation**: The spec sheet and manufacturing sheet are rendered as styled UI components, not generated PDFs. Printable via browser print if needed. Keeps things simple and avoids a PDF library dependency.

### Alternatives Considered

- **PDF upload workflow** (SM uploads actual engineering PDF, shop views it): Rejected — doesn't digitize the data, can't auto-generate the manufacturing sheet, can't do gap detection.
- **One combined view**: Rejected — the whole point is two audiences need two different views of the same data.
- **Prisma schema migration with typed columns**: Rejected — 25+ new columns is messy, and specs vary by door type. JSON is the right fit here.

### Open Questions

None — the reference PDFs give clear field definitions for both documents.

---

## Step-by-Step Tasks

### Step 1: Define Door Spec Field Structure

Create the door spec type definitions, field metadata (labels, options, required/optional), and gap detection logic.

**Actions:**

- Create `src/lib/door-specs.ts` with:
  - `DoorSpecs` TypeScript interface covering ALL fields from the real door sheets
  - `DoorCategory` type: `"HINGED_COOLER" | "HINGED_FREEZER" | "SLIDING"`
  - Field metadata object: for each field, store `{ label, type (text/select/checkbox/number), options (for selects), required, appliesToCategories }`
  - `getRequiredFieldsForCategory(category)` — returns which fields are required for the given door type
  - `findSpecGaps(specs, category)` — returns list of missing required fields with human-readable descriptions
  - `generateManufacturingSheet(specs)` — maps the full spec sheet fields to the manufacturing sheet fields

**Door Specs Interface** (derived from real PDFs):

```typescript
interface DoorSpecs {
  // Identity
  doorCategory: "HINGED_COOLER" | "HINGED_FREEZER" | "SLIDING"
  serialNumber?: string
  label: boolean  // Label / No Label

  // Job
  jobNumber?: string
  jobName?: string
  jobSiteName?: string

  // Dimensions
  widthInClear: string       // e.g., "36\""
  heightInClear: string      // e.g., "77-1/4\""
  wallThickness?: string     // from engineering sheet
  jambDepth?: string         // e.g., "2\""

  // Door Type
  temperatureType: "COOLER" | "FREEZER"
  openingType: "HINGE" | "SLIDE"
  hingeSide?: "LEFT" | "RIGHT"
  slideSide?: "LEFT" | "RIGHT"

  // Frame
  frameType: "FULL_FRAME" | "FACE_FRAME" | "BALLY_TYPE"
  highSill: boolean
  wiper: boolean

  // Panel / Insulation
  panelThickness?: string    // e.g., "4\""
  panelInsulated: boolean    // "DOOR PANEL RSNE INSULATED"
  insulation?: string        // e.g., "4\" standard" or "6\" optional"

  // Skin / Finish
  finish: string             // e.g., "WPG", "White/White", "Stainless"
  skinMaterial?: string      // e.g., "galvanized steel with embossed stucco pattern"

  // Hardware - Hinges
  hingeMfrName?: string      // e.g., "DENT"
  hingeModel?: string        // e.g., "D690CS"
  hingeOffset?: string

  // Hardware - Latch
  latchMfrName?: string      // e.g., "DENT"
  latchModel?: string        // e.g., "D90"
  latchOffset?: string
  insideRelease?: string

  // Hardware - Closer
  closerModel?: string       // e.g., "DENT CLOSER D276"

  // Heater (freezer doors)
  heaterSize?: string        // e.g., "32 FT"
  heaterCableLocation?: string

  // Gasket
  gasketType: "MAGNETIC" | "NEOPRENE"

  // Options (from engineering sheet)
  weatherShield: boolean
  thresholdPlate: boolean

  // Sliding door specific
  doorPull?: string          // full/half handle
  trackType?: string

  // Notes
  specialNotes?: string
  infoLine?: string          // e.g., "Joe Tavares  3 PCS of 3\" Flat Batten"

  // Quantities (from door schedule table)
  quantity: number
}
```

**Files affected:**
- `rsne-inventory/src/lib/door-specs.ts` (new)

---

### Step 2: Build Door Spec AI Parser

Create the AI parser that converts natural language into structured door specs and identifies data gaps.

**Actions:**

- Create `src/lib/ai/parse-door-specs.ts` with:
  - `parseDoorSpecs(text: string)` — uses Claude `generateObject` with a door-specific schema and system prompt
  - System prompt includes RSNE door vocabulary, abbreviations, common defaults
  - Returns `{ specs: Partial<DoorSpecs>, gaps: GapQuestion[], confidence: number }`
  - `GapQuestion` type: `{ field: string, question: string, options?: string[] }` — human-readable questions for missing data

- System prompt knowledge:
  - RSNE builds walk-in cooler/freezer doors
  - Common abbreviations: WPG = White Painted Galvanized, SS = Stainless Steel, MHS = Manual Horizontal Sliding
  - Freezer doors always need heater cable
  - Magnetic gaskets are standard for cooler doors, neoprene for specialty
  - Default frame type: Face Frame unless specified
  - Hinge/latch manufacturers: Dent, Kason (KDE),DERA (DFE)
  - If user says "right" or "left" — that's the hinge/slide side
  - If user gives a job name, parse it as jobName + jobSiteName if two parts

- Create `src/app/api/ai/parse-door-specs/route.ts`:
  - POST handler: takes `{ text: string }`, calls `parseDoorSpecs`, returns `{ specs, gaps, confidence }`
  - Auth required (ADMIN, OPERATIONS_MANAGER, OFFICE_MANAGER, SALES_MANAGER)

**Files affected:**
- `rsne-inventory/src/lib/ai/parse-door-specs.ts` (new)
- `rsne-inventory/src/app/api/ai/parse-door-specs/route.ts` (new)

---

### Step 3: Build Door Spec Sheet Component

Display component matching the engineering drawing format — shows all specifications in organized sections.

**Actions:**

- Create `src/components/doors/door-spec-sheet.tsx`:
  - Props: `{ specs: DoorSpecs, showApproval?: boolean, approvedBy?: string, approvedAt?: string }`
  - Organized sections matching the real PDF layout:
    - **Header**: RSNE logo area, door category title (e.g., "RSNE HINGED FREEZER DOOR"), job info
    - **Dimensions**: Width/Height in clear, wall thickness, jamb depth
    - **Door Configuration**: Temperature type, opening type, hinge/slide side, frame type, high sill, wiper
    - **Panel & Insulation**: Panel specs, insulation thickness
    - **Finish & Skin**: Finish code, skin material description
    - **Hardware**: Hinge (mfr, model, offset), Latch (mfr, model, offset), Closer model, Inside release
    - **Heater**: Size, cable location (freezer doors only)
    - **Gasket**: Magnetic/Neoprene
    - **Options**: Weather shield, threshold plate
    - **Door Schedule**: Quantity table with stock#, quantity, size, temperature, hinge side
    - **Special Notes** section
    - **Approval Block**: Approved / Approved as Noted, signed by, date
  - Clean, professional layout with grid sections
  - Print-friendly styling (no scroll, fits on screen or paper)

**Files affected:**
- `rsne-inventory/src/components/doors/door-spec-sheet.tsx` (new)

---

### Step 4: Build Door Manufacturing Sheet Component

Display component matching the clipboard form the door shop uses.

**Actions:**

- Create `src/components/doors/door-manufacturing-sheet.tsx`:
  - Props: `{ specs: DoorSpecs, assemblyId: string, createdAt: string }`
  - Layout matching the real "RSNE DOOR MANUFACTURING SHEET" PDF:
    - **Header**: "Refrigerated Structures of New England — DOOR MANUFACTURING SHEET"
    - **Date** (auto from createdAt)
    - **JWO or JOB #**
    - **Serial #**
    - **Label / No Label** (checkbox display)
    - **Job Name** (customer + site)
    - **Cooler Door / Freezer Door** (checkbox display)
    - **Door Size** (W x H formatted)
    - **Full Frame / Face Frame / Bally Type** (checkbox display)
    - **High Sill / Wiper** (checkbox display)
    - **Jamb Depth**
    - **Heater Size** (if freezer)
    - **Finish**
    - **Slide or Hinge** + **Right / Left**
    - **Hinge Mfr's Name** + **Part #'s**: Closer, Hinge, Latch, Offset, Inside Release
    - **Gasket Type**: Magnetic / Neoprene
    - **Info** line (notes)
  - Styled to look like the paper form — clean, large text, checkbox indicators
  - Bold/prominent for the most critical fields (door size, type, frame, hardware)
  - "View Full Spec Sheet" link at bottom

**Files affected:**
- `rsne-inventory/src/components/doors/door-manufacturing-sheet.tsx` (new)

---

### Step 5: Build AI Door Creation Flow

Replace the current door creation form with a conversational AI-first flow.

**Actions:**

- Create `src/components/doors/door-creation-flow.tsx`:
  - Multi-phase flow:
    1. **INPUT phase**: AIInput component with door-specific placeholder ("Describe the door — e.g., 36x77 freezer door, face frame, Dent hinges, magnetic gasket, WPG finish, right hinge..."). Voice, text, or photo of an existing paper spec sheet.
    2. **REVIEW phase**: Shows populated Door Spec Sheet with the parsed data. Highlights any fields the AI filled in with confidence. Below the spec sheet, shows gap questions as tappable cards (e.g., "What frame type? Full Frame / Face Frame / Bally Type"). User taps answers or types/speaks additional info. Each answer updates the spec sheet in real-time. "Re-scan" button to re-speak/re-type if the AI got something wrong.
    3. **CONFIRM phase**: Complete spec sheet displayed, all required fields filled. Job name input. "Submit for Approval" button.
  - State management: `specs` object built up incrementally as AI parses and user answers gaps
  - On submit: calls existing `POST /api/assemblies` with the expanded specs JSON
  - Components section remains — user can still add materials via AI (or they come from templates)

- Modify `src/app/assemblies/new/page.tsx`:
  - When `assemblyType === "DOOR"`, render `<DoorCreationFlow>` instead of the current manual form fields
  - Pass template selection through (templates can pre-fill specs)
  - Keep panel/floor flow unchanged

**Files affected:**
- `rsne-inventory/src/components/doors/door-creation-flow.tsx` (new)
- `rsne-inventory/src/app/assemblies/new/page.tsx` (modify)

---

### Step 6: Update Assembly Detail Page — Role-Aware Views

Modify the detail page so door shop sees manufacturing sheet by default, managers see spec sheet.

**Actions:**

- Modify `src/app/assemblies/[id]/page.tsx`:
  - For DOOR type assemblies, replace the basic "Door Sheet Specifications" card with:
    - **Door Shop roles** (DOOR_SHOP, SHOP_FOREMAN): Default to `DoorManufacturingSheet` view. Toggle button at top: "View Full Spec Sheet" switches to `DoorSpecSheet`.
    - **Manager roles** (ADMIN, SALES_MANAGER, OFFICE_MANAGER, OPERATIONS_MANAGER): Default to `DoorSpecSheet` view. Toggle button: "View Manufacturing Sheet" switches to `DoorManufacturingSheet`.
  - Approval card stays the same — only shown when `canApprove` is true
  - When SM approves, the approval block on the spec sheet auto-populates (approved by, date)
  - Production action buttons (Start Build, Complete, Ship) remain below whichever sheet is shown
  - Components list stays below the sheet view
  - Change log stays at bottom

**Files affected:**
- `rsne-inventory/src/app/assemblies/[id]/page.tsx` (modify)

---

### Step 7: Enhance Queue Cards with Door Info

Show key door specs on the queue page cards so door shop can identify doors at a glance.

**Actions:**

- Modify `src/app/assemblies/page.tsx` `AssemblyCard` component:
  - For DOOR type assemblies, show key specs inline:
    - Door size (e.g., "36\" x 77-1/4\"")
    - Temperature type badge (Cooler / Freezer)
    - Frame type
  - Keep existing layout structure, just add a specs row

**Files affected:**
- `rsne-inventory/src/app/assemblies/page.tsx` (modify)

---

### Step 8: Test & Validate

**Actions:**

- Test door creation flow end-to-end:
  - Voice input: "36 by 77 and a quarter freezer door, face frame, Dent hinges D690CS, Dent closer D276, Dent latch D90, right hinge, WPG finish, magnetic gasket, 32 foot heater, 2 inch jamb depth, for GKT Refrigeration South Kingstown High School, job 25415"
  - Verify AI populates all fields correctly
  - Verify gap detection for missing fields (e.g., omit gasket type, see if AI asks)
  - Verify spec sheet renders all fields
  - Verify manufacturing sheet matches the clipboard form layout
- Test approval flow:
  - SM sees spec sheet, approves
  - Door appears in queue
  - Door shop person opens it, sees manufacturing sheet
  - Door shop person taps "View Full Spec Sheet" to see engineering detail
- Test with different door types:
  - Hinged cooler door
  - Hinged freezer door
  - Sliding door (different field set)
- Run `npm run build` to verify no type errors

**Files affected:**
- All modified/created files

---

## Connections & Dependencies

### Files That Reference This Area

- `src/hooks/use-assemblies.ts` — No changes needed, specs JSON is already flexible
- `src/app/api/assemblies/route.ts` — No changes needed, already accepts `specs: Json?`
- `src/app/api/assemblies/[id]/route.ts` — No changes needed
- `prisma/schema.prisma` — No changes needed, `specs Json?` handles expanded data

### Updates Needed for Consistency

- `CLAUDE.md` — Update AI Module section to document `parse-door-specs.ts` and the door components
- `MEMORY.md` — Update AI Module section with new door spec parser info

### Impact on Existing Workflows

- **Door creation**: Completely rebuilt (manual form → AI conversational flow). Panel/floor creation unchanged.
- **Door approval**: Same flow, but now the SM sees a real spec sheet instead of 7 basic fields.
- **Door shop queue**: Same queue, but tapping a door now shows manufacturing sheet instead of generic detail.
- **Existing assemblies**: Existing door assemblies with the old 7-field specs will still render (the components handle missing fields gracefully with fallbacks).

---

## Validation Checklist

- [ ] Voice input "36x77 freezer door, face frame, Dent hinges, right hinge, WPG, magnetic gasket" populates spec sheet correctly
- [ ] AI identifies and asks about missing required fields (e.g., jamb depth, heater size for freezer)
- [ ] Door Spec Sheet shows all fields organized like the real engineering PDFs
- [ ] Door Manufacturing Sheet matches the real clipboard form layout
- [ ] SM can approve from the spec sheet view
- [ ] Door shop person sees manufacturing sheet by default when opening from queue
- [ ] "View Full Spec Sheet" toggle works from manufacturing sheet view
- [ ] Queue cards show door size and temperature type
- [ ] Sliding doors populate different fields than hinged doors
- [ ] `npm run build` passes with no errors
- [ ] Existing door assemblies (old format) still render without crashing
- [ ] CLAUDE.md updated

---

## Success Criteria

The implementation is complete when:

1. A Sales Manager can describe a door in plain English (voice or text) and see a complete, accurate door spec sheet populated by AI — matching the detail level of the real RSNE engineering PDFs
2. The AI asks specific follow-up questions for any missing required specifications, and the user can answer by tapping options or speaking
3. After SM approval, the door shop person sees a manufacturing sheet matching the real clipboard form when they open the door from their queue, with one-tap access to the full spec sheet
4. All three door types (hinged cooler, hinged freezer, sliding) work with their appropriate field sets

---

## Notes

- The `specs Json?` approach means no database migration — this is purely a UI/AI change with new components
- The manufacturing sheet fields are a strict subset of the spec sheet fields — the `generateManufacturingSheet()` function just selects and reformats
- Photo input could eventually parse an existing paper door spec sheet via the image parser, but text/voice is the primary flow for this iteration
- The door schedule table on the engineering PDFs supports multiple doors per sheet — our flow handles one door per assembly, which matches how the manufacturing sheets work (one per clipboard)
- Future enhancement: auto-populate components from the spec (e.g., if spec says "Dent D690CS hinge", auto-match to the Dent D690CS product in inventory)

---

## Implementation Notes

**Implemented:** 2026-03-10

### Summary

Built the complete two-document door sheet system: AI door spec parser, Door Spec Sheet component, Door Manufacturing Sheet component, conversational AI creation flow, role-aware detail page with toggle, and enhanced queue cards. All 8 steps executed. Build passes clean.

### Deviations from Plan

- DoorCreationFlow handles its own submission directly rather than delegating back to the parent page — cleaner separation since the door flow is self-contained
- Queue card door specs use an IIFE pattern to handle TypeScript strict mode with `Record<string, unknown>` JSON specs
- Components are optional for door submission (user can add them later or skip) — real-world door sheets don't always list materials at creation time

### Issues Encountered

- TypeScript strict mode rejects `unknown` type in JSX expressions — fixed by extracting values to typed locals before rendering
- Same issue in DoorCreationFlow template description conditional — fixed by using ternary instead of `&&` pattern
