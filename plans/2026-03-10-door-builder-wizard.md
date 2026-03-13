# Plan: Door Builder Interview Wizard

**Created:** 2026-03-10
**Status:** Implemented
**Request:** Redesign the door creation flow with a guided interview-style "Door Builder" wizard and a template shortcut path

---

## Overview

### What This Plan Accomplishes

Replaces the current AI-text-input door creation flow with a two-path system: (1) **Use Template** for quick pre-fill from existing assembly templates, and (2) **Door Builder** — a step-by-step interview wizard that asks one question at a time, branching based on Swing vs. Slider door type. Both paths converge on a fully editable confirmation screen before submission for approval.

### Why This Matters

The current flow drops users into a blank text box and expects them to describe a door in natural language. Shop workers and office staff need a guided process that mirrors how they actually spec doors — starting with type, then dimensions (with a visual reference diagram), then features and hardware. This eliminates guesswork, reduces errors, and ensures every required field is captured before the door sheet goes to approval.

---

## Current State

### Relevant Existing Structure

| File | Purpose |
|------|---------|
| `src/components/doors/door-creation-flow.tsx` | Current 3-phase flow (INPUT→REVIEW→CONFIRM) with AI text input |
| `src/lib/door-specs.ts` | DoorSpecs interface, types, gap detection, hardware lookup |
| `src/lib/ai/parse-door-specs.ts` | AI parser for natural language → DoorSpecs |
| `src/components/doors/door-spec-sheet.tsx` | Read-only spec sheet display |
| `src/components/doors/door-manufacturing-sheet.tsx` | Shop-floor manufacturing sheet |
| `src/components/layout/step-progress.tsx` | Reusable step indicator |
| `src/app/assemblies/new/page.tsx` | Entry point — type selection then door flow |
| `src/app/api/assemblies/route.ts` | Assembly creation API |
| `src/hooks/use-assemblies.ts` | React Query hooks for assemblies |

### Gaps or Problems Being Addressed

1. **No guided input** — users must know what to type/say; no visual cues for dimensions
2. **No door diagram** — dimensions are abstract without a reference image
3. **No branching logic** — Swing and Slider doors follow the same generic path
4. **Missing fields** — no support for cutouts, custom frame dimensions, sill height, or auto-calculated heater cable
5. **Template path incomplete** — selecting a template skips to review but doesn't ensure all fields are filled
6. **High sill / wiper logic not enforced** — these are mutually dependent but treated as independent checkboxes

---

## Proposed Changes

### Summary of Changes

- Rewrite `door-creation-flow.tsx` as a multi-step wizard with branching logic
- Create an SVG door diagram component for visual dimension reference
- Add new fields to `DoorSpecs`: cutouts, sillHeight, custom frame dimensions, isExterior
- Add heater cable auto-calculation logic
- Build an editable confirmation screen that works for both Template and Builder paths
- Keep AI text/voice input as an optional "quick entry" within the builder
- Keep the existing template selection but route it through the same confirmation screen

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/doors/door-builder.tsx` | Main wizard orchestrator with interview steps |
| `src/components/doors/door-diagram-swing.tsx` | SVG front-view diagram of a swing door with labeled dimensions |
| `src/components/doors/door-diagram-slider.tsx` | SVG diagram for slider door (simpler — just opening dimensions) |
| `src/components/doors/door-confirmation.tsx` | Editable confirmation screen (shared by template + builder paths) |
| `src/components/doors/interview-step.tsx` | Reusable interview question card (choice buttons, numeric input, etc.) |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/components/doors/door-creation-flow.tsx` | Rewrite: entry screen (Template vs Builder), route to appropriate sub-flow |
| `src/lib/door-specs.ts` | Add cutout interface, sillHeight, frameLHS/RHS/Top, isExterior fields; add heater cable calc function |
| `src/app/assemblies/new/page.tsx` | Minor: ensure door flow renders correctly with new component structure |

### Files to Delete

None — existing components (door-spec-sheet.tsx, door-manufacturing-sheet.tsx) are still used in the assembly detail page.

---

## Design Decisions

### Key Decisions Made

1. **One question per screen (mobile-first)**: Each interview step shows one question with large tap targets. This is faster on phones and prevents overwhelm. On desktop the cards are centered and clean.

2. **Swing vs. Slider branching at Q1**: These two door types have fundamentally different specs (sliders have no jamb depth, hinges, closers, or frame type). Branching early keeps each path focused.

3. **Dimensions before features**: Gabe specified this order. Dimensions with the diagram first, then features (temp type, hardware, etc.). This matches how the shop thinks — "what size?" then "what kind?"

4. **High sill and wiper are mutually exclusive**: If high sill = yes, wiper = no (and we need sill measurement). If high sill = no, wiper = yes (default). This is enforced in the interview logic, not left as independent checkboxes.

5. **Heater cable auto-calculation**: For freezer doors, the heater cable length is calculated from dimensions:
   - Standard (wiper): `(height × 2 + width) × 2` (sides + top, doubled)
   - High sill: `(height × 2 + width × 2) × 2` (all four sides, doubled)
   - Displayed as "XX FT" rounded up to nearest whole foot

6. **Confirmation screen is the single source of truth**: Both Template and Builder paths end at the same editable confirmation screen. Every field is tap-to-edit. This ensures nothing gets missed regardless of entry path.

7. **Keep AI input as optional accelerator**: The Door Builder is the primary path, but users can still use voice/text within the builder to fill multiple fields at once. The AI parse result just pre-fills the wizard state.

8. **SVG diagrams are simple and schematic**: Not photorealistic — just clean line drawings showing where each dimension applies. Labels update dynamically as values are entered.

### Alternatives Considered

- **Multi-field forms per step**: Rejected — too cluttered on mobile, and users skip fields when there are too many at once.
- **Removing AI input entirely**: Rejected — voice input is valuable for experienced users who can rattle off specs quickly.
- **Separate pages per step (URL-based)**: Rejected — state management is simpler with a single component tracking wizard position.

### Open Questions

None — Gabe's message was very specific about the flow.

---

## Step-by-Step Tasks

### Step 1: Extend DoorSpecs Interface

Add new fields to support cutouts, custom frames, sill height, exterior flag, and heater cable calculation.

**Actions:**

- Add `Cutout` interface: `{ floorToBottom: string; floorToTop: string; frameWidth: string }`
- Add fields to `DoorSpecs`:
  - `cutouts?: Cutout[]`
  - `sillHeight?: string` (floor to bottom of clear opening for high sill doors)
  - `isExterior?: boolean`
  - `frameCustom?: boolean`
  - `frameLHS?: string` (left jamb dimension)
  - `frameRHS?: string` (right jamb dimension)
  - `frameTop?: string` (header dimension)
  - `additionalItems?: string[]` (splash guards, windows, etc.)
- Add `calculateHeaterCable(specs: Partial<DoorSpecs>): string | null` function:
  - Returns null if not freezer
  - Parses width/height from specs (convert fractions to decimals)
  - Standard+wiper: `Math.ceil(((height * 2 + width) * 2) / 12)` → "XX FT"
  - High sill: `Math.ceil(((height * 2 + width * 2) * 2) / 12)` → "XX FT"
- Update `DOOR_SPEC_SCHEMA` in `parse-door-specs.ts` to include new fields

**Files affected:**

- `src/lib/door-specs.ts`
- `src/lib/ai/parse-door-specs.ts`

---

### Step 2: Create Interview Step Component

Build a reusable question card component used by each wizard step.

**Actions:**

- Create `interview-step.tsx` with props:
  ```typescript
  interface InterviewStepProps {
    question: string
    description?: string
    children: React.ReactNode  // Input content (buttons, text field, etc.)
    onBack?: () => void
    diagram?: React.ReactNode  // Optional SVG diagram
    photoUpload?: boolean      // Show camera/upload option
  }
  ```
- Render: Card with question text (large, bold), optional description, children (input area), back button
- Consistent padding, centered layout, animations between steps (simple fade)

**Files affected:**

- `src/components/doors/interview-step.tsx` (new)

---

### Step 3: Create SVG Door Diagrams

Build simple SVG components showing door outlines with dimension labels.

**Actions:**

- **Swing door diagram** (`door-diagram-swing.tsx`):
  - Front view: rectangular door outline within a frame
  - Labels: "Width (in clear)" across top, "Height (in clear)" on side, "Jamb Depth" on frame edge
  - Optional: show cutout rectangles if cutouts exist
  - Optional: show high sill area at bottom
  - Dynamic: fill in actual values when provided (e.g., `36"` replaces "Width" label)
  - Props: `{ width?: string; height?: string; jambDepth?: string; sillHeight?: string; cutouts?: Cutout[]; className?: string }`

- **Slider diagram** (`door-diagram-slider.tsx`):
  - Front view: opening with sliding door panel, track at top
  - Labels: "Width (in clear)", "Height (in clear)"
  - Slide direction arrow (left or right)
  - Props: `{ width?: string; height?: string; slideSide?: "LEFT" | "RIGHT"; className?: string }`

- Both should be ~250px wide, auto-height, clean gray/navy color scheme

**Files affected:**

- `src/components/doors/door-diagram-swing.tsx` (new)
- `src/components/doors/door-diagram-slider.tsx` (new)

---

### Step 4: Build the Door Builder Wizard

Create the main interview wizard with branching logic.

**Actions:**

- Create `door-builder.tsx` with internal state machine:
  ```typescript
  type BuilderStep =
    | "TYPE"           // Q1: Slider or Swing?
    // Swing branch — dimensions
    | "SWING_WIDTH"
    | "SWING_HEIGHT"
    | "SWING_JAMB"
    | "SWING_FRAME"    // Standard or custom? (if custom → sub-inputs for LHS/RHS/Top)
    | "SWING_CUTOUTS"  // Any cutouts? → How many? → Details per cutout
    | "SWING_SILL"     // High sill? If yes → measurement
    // Swing branch — features
    | "SWING_TEMP"     // Freezer or Cooler?
    | "SWING_HINGE"    // Hinge right or left?
    | "SWING_HARDWARE" // Standard hardware? (yes/no, if no → specify)
    | "SWING_EXTRAS"   // Additional items (splash guards, windows, etc.)
    // Slider branch
    | "SLIDER_TEMP"    // Cooler or Freezer?
    | "SLIDER_SIDE"    // Slide left or right?
    | "SLIDER_WIDTH"
    | "SLIDER_HEIGHT"
    // Both paths end at:
    | "DONE"           // Signals parent to show confirmation
  ```

- Props:
  ```typescript
  interface DoorBuilderProps {
    onComplete: (specs: Partial<DoorSpecs>) => void
    onBack: () => void  // Return to entry screen
  }
  ```

- Each step renders an `InterviewStep` with appropriate inputs:
  - **Choice questions** (Swing/Slider, Cooler/Freezer, Left/Right, Yes/No): Large tappable buttons, 2-column grid
  - **Dimension inputs**: Numeric input with inch/foot label, large font, plus the SVG diagram showing which dimension is being captured
  - **Cutout flow**: "Any cutouts?" (Yes/No) → "How many?" (number picker) → For each: 3 dimension inputs
  - **Custom frame**: "Standard frame or custom?" → if custom, 3 inputs (LHS, RHS, Top)
  - **Hardware**: "Standard hardware?" (Yes/No) → if No, 3 inputs (hinge, latch, closer model)
  - **Extras**: Multi-select chips (Exterior Splash Guard, Window, Weather Shield, Threshold Plate) + free text "Other"

- Auto-derive values:
  - When freezer selected + high sill answered → auto-calculate heater cable
  - When high sill = No → auto-set wiper = true
  - When high sill = Yes → auto-set wiper = false, prompt for sill measurement
  - Apply `getStandardHardware()` when standard hardware = Yes + dimensions known

- StepProgress at top showing progress through interview (use step groups: "Type", "Dimensions", "Features", "Confirm")

- Back button on every step to go to previous question

**Files affected:**

- `src/components/doors/door-builder.tsx` (new)

---

### Step 5: Build the Editable Confirmation Screen

Create the confirmation component that shows all specs with inline editing.

**Actions:**

- Create `door-confirmation.tsx` with props:
  ```typescript
  interface DoorConfirmationProps {
    specs: Partial<DoorSpecs>
    onSpecChange: (field: string, value: unknown) => void
    components: ComponentItem[]
    onComponentChange: (index: number, qty: number) => void
    onRemoveComponent: (index: number) => void
    onAddComponents: (result: ParseResult) => void
    jobName: string
    onJobNameChange: (name: string) => void
    notes: string
    onNotesChange: (notes: string) => void
    onSubmit: () => void
    isSubmitting: boolean
  }
  ```

- Layout mirrors DoorSpecSheet but every field is editable:
  - **Text fields**: Tap to show input, save/cancel buttons
  - **Select fields** (frameType, gasketType, hingeSide, etc.): Tap to show dropdown/button group
  - **Boolean fields** (highSill, wiper, weatherShield, etc.): Tappable checkboxes that toggle
  - **Cutouts section**: Show cutout list with edit/delete per cutout, "Add Cutout" button
  - **Hardware section**: Show current hardware, "Change" button to override
  - **Heater section** (freezer only): Show auto-calculated value with "Override" option

- Job assignment section: Job name input (with autocomplete from existing jobs API), notes textarea

- Components section: Same as current CONFIRM phase — AIInput for adding, list with qty adjust and remove

- "Submit for Approval" button at bottom (disabled while submitting)

- Visual grouping matches the door spec sheet sections (Dimensions, Configuration, Panel, Finish, Hardware, Heater, Gasket, Options)

**Files affected:**

- `src/components/doors/door-confirmation.tsx` (new)

---

### Step 6: Rewrite Door Creation Flow

Replace the current 3-phase flow with the new entry screen + branching architecture.

**Actions:**

- Rewrite `door-creation-flow.tsx`:
  ```typescript
  type FlowPhase = "ENTRY" | "TEMPLATE_SELECT" | "BUILDER" | "CONFIRM"
  ```

- **ENTRY phase**: Two large cards:
  1. **"Use Template"** — icon + description, navigates to TEMPLATE_SELECT
  2. **"Door Builder"** — icon + description, navigates to BUILDER
  - Optional: small "Quick Entry (AI)" link at bottom for power users (sends to current AI parse flow, then to CONFIRM)

- **TEMPLATE_SELECT phase**:
  - Grid of door templates (filtered from assembly templates where type=DOOR)
  - Only show template name (no description, per previous user feedback)
  - On select: derive specs from template name (doorCategory, width, height, hardware via `getStandardHardware()`), load template components, go to CONFIRM

- **BUILDER phase**:
  - Renders `<DoorBuilder onComplete={handleBuilderComplete} onBack={goToEntry} />`
  - `handleBuilderComplete(specs)` saves specs and transitions to CONFIRM

- **CONFIRM phase**:
  - Renders `<DoorConfirmation specs={specs} ... onSubmit={handleSubmit} />`
  - `handleSubmit()` creates assembly via `createAssembly.mutateAsync()` (same as current)
  - Back button returns to BUILDER or TEMPLATE_SELECT (depending on path taken)

- StepProgress at top of flow: ["Choose", "Build", "Confirm"] with currentStep based on phase

- Keep all existing submission logic (createAssembly mutation, redirect to assembly detail)

**Files affected:**

- `src/components/doors/door-creation-flow.tsx` (rewrite)

---

### Step 7: Update Assembly New Page

Ensure the new door flow renders correctly.

**Actions:**

- The `assemblies/new/page.tsx` already renders `<DoorCreationFlow />` when type=DOOR
- Verify it still works with the rewritten component (no props changes needed)
- Add breadcrumb: Assemblies > Door Shop > New Door

**Files affected:**

- `src/app/assemblies/new/page.tsx` (minor verification)

---

### Step 8: Type Check and Build Verification

**Actions:**

- Run `npx tsc --noEmit` to verify no type errors
- Run `npm run build` to verify production build succeeds
- Test the flow manually in dev mode

**Files affected:**

- All modified files

---

### Step 9: Push to GitHub

**Actions:**

- Sync to GitHub clone directory
- Commit with descriptive message
- Push to main for Vercel auto-deploy

**Files affected:**

- Git operations only

---

## Connections & Dependencies

### Files That Reference This Area

| File | Relationship |
|------|-------------|
| `src/app/assemblies/new/page.tsx` | Renders DoorCreationFlow |
| `src/app/assemblies/[id]/page.tsx` | Displays DoorSpecSheet and DoorManufacturingSheet (unchanged) |
| `src/hooks/use-assemblies.ts` | useCreateAssembly mutation (unchanged) |
| `src/app/api/assemblies/route.ts` | Assembly creation endpoint (unchanged — specs stored as JSON) |
| `src/app/api/ai/parse-door-specs/route.ts` | AI parsing endpoint (unchanged) |

### Updates Needed for Consistency

- The new `cutouts`, `sillHeight`, `frameLHS/RHS/Top`, `isExterior`, `additionalItems` fields in DoorSpecs are stored as JSON in the Assembly.specs column — no schema migration needed
- DoorSpecSheet and DoorManufacturingSheet should eventually display these new fields but that can be a follow-up (they'll just be ignored for now since they use optional chaining)

### Impact on Existing Workflows

- **Assembly creation**: No API changes. The specs JSON blob just has more fields.
- **Assembly approval**: Approvers see the same DoorSpecSheet/ManufacturingSheet (new fields show up if present)
- **AI parsing**: Still works as a power-user option. The parser can be updated later to extract cutout/frame info.
- **Templates**: Template selection path is preserved and improved (goes through confirmation screen)

---

## Validation Checklist

- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Entry screen shows "Use Template" and "Door Builder" options
- [ ] Template selection loads door templates and navigates to confirmation
- [ ] Door Builder Q1 shows Swing/Slider choice
- [ ] Swing path walks through all dimension questions with SVG diagram
- [ ] Swing path walks through all feature questions
- [ ] Slider path asks correct questions (no jamb depth, no frame type)
- [ ] High sill "Yes" triggers sill measurement question and disables wiper
- [ ] High sill "No" auto-enables wiper
- [ ] Freezer selection triggers heater cable auto-calculation
- [ ] Standard hardware "Yes" auto-fills using getStandardHardware()
- [ ] Custom hardware "No" shows hinge/latch/closer inputs
- [ ] Cutout flow works (add multiple cutouts with dimensions)
- [ ] Confirmation screen shows all fields from interview
- [ ] Every field on confirmation screen is editable (tap to edit)
- [ ] Checkboxes on confirmation screen toggle correctly
- [ ] Components can be added via AI input on confirmation screen
- [ ] Submit creates assembly and redirects to detail page
- [ ] Back navigation works at every step

---

## Success Criteria

1. A non-technical user (Gabe) can create a door spec sheet by answering interview questions without typing free text
2. Both Template and Builder paths produce a complete, editable confirmation screen
3. Heater cable auto-calculates for freezer doors based on dimensions and sill type
4. The SVG door diagram provides visual context during dimension entry
5. All existing submission and approval workflows continue to work unchanged

---

## Notes

- The AI text/voice input can be added back as a "Quick Entry" power-user option in a follow-up. For this first pass, the Builder interview is the primary path.
- Cutout support is new — the manufacturing sheet and spec sheet don't currently display cutouts. A follow-up task should add cutout rendering to those display components.
- The SVG diagrams should be simple and schematic. They don't need to be engineering-quality drawings — just enough to show the user which dimension they're entering.
- Consider adding a "Save Draft" feature in a future iteration so partially-completed door specs aren't lost if the user navigates away.

---

## Implementation Notes

**Implemented:** 2026-03-10

### Summary

Rewrote the door creation flow with a two-path entry screen (Door Builder vs Use Template), a step-by-step interview wizard with branching for Swing vs Slider doors, SVG door diagrams, and a fully editable confirmation screen. Added Cutout support, custom frame dimensions, sill height, exterior flag, additional items, and heater cable auto-calculation to the DoorSpecs interface.

### Deviations from Plan

- Added `SWING_FRAME_CUSTOM` as a cast BuilderStep for the custom frame dimension sub-flow (plan didn't specify it as a separate step type)
- `parse-door-specs.ts` schema updated with new fields but the AI parser doesn't need a full rewrite since it's optional/power-user path

### Issues Encountered

None — TypeScript compiled cleanly and production build succeeded on first attempt.
