# Plan: Door Shop Module Overhaul

**Created:** 2026-03-24
**Status:** Implemented
**Request:** Comprehensive overhaul of the door shop / assemblies module — 28 items covering UI consistency, interactive diagrams, data/validation fixes, spec sheet alignment, workflow tracking, and celebration animations.

---

## Overview

### What This Plan Accomplishes

A full-scope overhaul of the door shop module to bring it to parity with the rest of the app's polished UI, fix incorrect data modeling (cutouts, hardware, colors, windows), add interactive SVG door diagrams that contextually illustrate each measurement step, redesign the spec/manufacturing sheets with proper hardware sections, and add workflow tracking (who started a build, when) with celebration animations for key actions.

### Why This Matters

The door shop is RSNE's highest-value workflow — every custom door is a $5K+ job. The current module missed the UI polish pass applied to receiving, BOMs, and inventory. The foreman and shop workers using this daily need clear, correct visualizations and clean data entry. Gabe explicitly called the current state "not impressive at all" and "trash" in several areas.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Interactive SVG diagram architecture (contextual measurement arrows, 3D jamb depth perspective, frame overlay, cutout-on-frame visualization), celebration animation patterns, ConfirmationModal design, hardware 4-box grid layout, color application strategy |

### How Skills Shaped the Plan

The frontend-design skill established the "Industrial Blueprint Precision" direction — the door diagrams should feel like living architectural drawings, not generic SVGs. It defined the specific visual treatment for each builder step (width arrows, height arrows, 3D jamb, frame overlay, cutout bites on frame edges). It also specified using the existing `useCelebration` hook for workflow action celebrations and replacing `window.confirm` with a branded modal.

---

## Current State

### Relevant Existing Structure

| File | Current State |
|------|---------------|
| `src/app/assemblies/page.tsx` | Main page — missing progress bar, Not Started group too close to New Door button, cards show "Custom Door" instead of job name |
| `src/app/assemblies/new/page.tsx` | New assembly page — has breadcrumb but door flow doesn't inherit it |
| `src/app/assemblies/[id]/page.tsx` | Detail page — uses `window.confirm()` for start build, no door shop worker tracking, plain toast for success |
| `src/components/doors/door-builder.tsx` | Builder — static orange dots in diagram, no contextual measurement graphics, too many finish options, no gasket step, no window step, hardware is free-text |
| `src/components/doors/door-preview.tsx` | Static SVG — shows width/height dimensions but no contextual highlighting, cutouts drawn inside door panel (wrong), circles for hinges (unclear) |
| `src/components/doors/door-confirmation.tsx` | Confirmation page — tiny fonts (xs/sm), small buttons, "Panel & Finish" should be split into "Insulation" + "Finish" |
| `src/components/doors/door-spec-sheet.tsx` | Spec sheet — inconsistent dimension font sizes, "Panel & Insulation" label, hardware section misaligned, no 4-box layout |
| `src/components/doors/door-manufacturing-sheet.tsx` | Mfg sheet — "HINGE MFR'S NAME" header misleading, hardware grid misaligned, no 4-box layout |
| `src/components/doors/interview-step.tsx` | Step component — adequate but no diagram slot for contextual SVGs per step |
| `src/lib/door-specs.ts` | Data model — no window size/heated fields, no insulation type enum, finish options not constrained |
| `src/components/layout/breadcrumb.tsx` | Breadcrumb — supports `href` but last item never gets one; door builder steps don't use it |

### Gaps or Problems Being Addressed

1. **UI Consistency**: Assemblies module missed the polish pass (no progress bar under header, no back arrow, bouncy scroll, tiny fonts on confirmation/detail pages)
2. **Incorrect Diagrams**: Cutouts shown inside door panel (should be on frame edges); circles don't clearly represent hinges; no contextual measurement arrows
3. **Data Model Gaps**: No window size/type fields, no insulation type enum (EPS/PIR/IMP), finish options not constrained to WPG/SS/Gray, no gasket step in builder
4. **Hardware UX**: Free-text input instead of catalog dropdown, can advance without selecting, spec sheets messy
5. **Workflow Tracking**: No record of who in the door shop started a build or when; no distinction between SM approval date and build start date
6. **Poor Interactions**: `window.confirm()` for destructive actions, plain toasts for celebrations, non-clickable breadcrumbs

---

## Proposed Changes

### Summary of Changes

**Module-Wide UI (Items 1, 2, 4, 5, 16)**
- Add back arrow to assemblies main page header
- Add spacing between New Door button and Not Started section
- Fix overscroll bounce on all scrollable containers
- Make breadcrumbs fully clickable/navigable in door builder flow
- Scale up fonts and buttons on confirmation page

**Door Cards (Item 3)**
- Show job name as card title instead of "Custom Door" when job exists

**Interactive Door Diagrams (Items 6, 7, 8, 9, 10, 11, 12)**
- New `DoorDiagramContextual` component that renders step-specific measurement visualizations
- Width step: horizontal double-arrow between frame edges
- Height step: vertical double-arrow
- Jamb depth step: 3D perspective view highlighting wall thickness
- Frame step: shaded frame overlay with standard dimensions
- Cutout step: "bite" marks on frame edges (not inside panel)
- Hinge/swing step: actual hinge shapes, only visible at this step

**Data/Validation Fixes (Items 13, 14, 15, 17, 18, 24)**
- Replace free-text hardware inputs with catalog-sourced dropdowns
- Add validation preventing advance without required selections
- Constrain finish to 3 options: WPG, SS, Gray (with abbreviations)
- Add window step: size (14x14 or 14x24), heated/non-heated (auto from temp type)
- Split "Panel & Finish" into "Insulation" (IMP, EPS, PIR) + color under finish
- Add gasket selection step to builder flow

**Components (Item 19)**
- Auto-populate components from standard hardware selections and door specs

**Spec Sheet + Manufacturing Sheet (Items 20, 21, 22, 23, 25)**
- Unify dimension font sizes, add " (inches) symbol throughout
- Rename "Panel & Insulation" to "Insulation", show type + thickness
- Hardware section: 4-box grid (Hinges, Latch, Closer, Inside Release) with manufacturer + model, offset only on hinges
- Align all fields in manufacturing sheet

**Workflow + Interactions (Items 26, 27, 28)**
- Replace `window.confirm()` with branded `StartBuildModal` component
- Add `startedById`, `startedAt` tracking to assembly detail
- Show door shop worker name and build start/end dates on detail page
- Use `celebrate()` for Start Build, Complete Build, Ship actions
- Add button pulse/ripple animations for workflow actions

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/doors/door-diagram-contextual.tsx` | New interactive SVG component that renders step-specific measurement visualizations (replaces static orange dots, adds measurement arrows, 3D jamb view, frame overlay, cutout-on-frame) |
| `src/components/shared/start-build-modal.tsx` | Branded confirmation modal replacing `window.confirm()` for Start Build action — shows material consumption summary |
| `src/lib/door-recipes.ts` | Recipe lookup table mapping door specs (size, temp, sill, exterior) to standard component lists from RSNE assembly templates |
| `src/app/api/products/bulk-lookup/route.ts` | Bulk product name lookup API — accepts product name fragments, returns matching products for recipe auto-populate |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/app/assemblies/page.tsx` | Add `showBack` to Header, add `mt-4` spacing before Not Started, show job name on cards instead of "Custom Door" |
| `src/app/assemblies/[id]/page.tsx` | Replace `window.confirm` with `StartBuildModal`, add `startedBy`/`startedAt` display, use `celebrate()` for all actions, make breadcrumb items clickable |
| `src/app/assemblies/new/page.tsx` | Pass breadcrumb hrefs into door flow, ensure overscroll-none |
| `src/components/doors/door-builder.tsx` | Add SWING_GASKET step, SWING_WINDOW step, constrain finish to 3 options (WPG/SS/Gray), constrain hardware to catalog dropdown, add validation on hardware custom page, use `DoorDiagramContextual` per step, split insulation from finish, add insulation type selection (IMP/EPS/PIR) |
| `src/components/doors/door-preview.tsx` | Move cutouts to frame edges (not inside panel), change hinge circles to hinge shapes, only show hardware elements contextually |
| `src/components/doors/door-confirmation.tsx` | Scale fonts to sm/base, scale buttons to h-12/h-14, split "Panel & Finish" into "Insulation" + "Finish" sections, add overscroll-none |
| `src/components/doors/door-spec-sheet.tsx` | Unify dimension font sizes, add " symbol, rename "Panel & Insulation" to "Insulation", hardware 4-box grid (hinges/latch/closer/inside release), align all fields |
| `src/components/doors/door-manufacturing-sheet.tsx` | Rename "HINGE MFR'S NAME" to "HARDWARE", 4-box grid layout, add part numbers to each box, offset only on hinges, align all fields |
| `src/components/doors/interview-step.tsx` | Accept `activeStep` prop for contextual diagram rendering |
| `src/lib/door-specs.ts` | Add `InsulationType` enum (IMP/EPS/PIR), add `windowSize` field (14x14, 14x24), add `windowHeated` boolean, add gasket to required fields, constrain finish type |
| `src/components/layout/breadcrumb.tsx` | Ensure all items with `href` are clickable (already works — verify) |
| `src/app/api/assemblies/[id]/route.ts` | Accept `startedById` on status change to IN_PRODUCTION |
| `prisma/schema.prisma` | Add `startedById` and `startedAt` fields to Assembly model (if not already present) |
| `src/app/globals.css` | Add overscroll-none utility, button pulse animation keyframes |

### Files to Delete

None — all changes are modifications to existing files or new additions.

---

## Design Decisions

### Key Decisions Made

1. **Contextual diagram component separate from DoorPreview**: DoorPreview remains the persistent "configurator" SVG that shows the full door state. The new `DoorDiagramContextual` is a step-specific educational graphic that explains what measurement is being asked for. Both can coexist.

2. **3D perspective for jamb depth via CSS transform, not WebGL**: A CSS `perspective()` + `rotateY()` on the SVG container creates a convincing 3D tilt without any heavy 3D library. The jamb is highlighted as a colored strip along the z-axis. Lightweight and performant.

3. **Cutouts on frame edges, not inside door panel**: Per Gabe's explanation and the reference engineering drawings, cutouts accommodate existing fixtures (thermometers, light switches) and are "bites" out of the frame edge. The width represents depth into the frame. The SVG renders these as frame-edge notches with measurement lines.

4. **Hardware from catalog dropdown rather than free-text**: The product catalog already contains hardware items. We'll query products with a `door-hardware` category tag and present them in a searchable dropdown. If the catalog doesn't have a category tag for this, we add one.

5. **Only 3 finish colors**: WPG (White Painted Galv), SS (Stainless Steel), Gray. Abbreviations shown. Remove White/White, Galvalume, and custom options per Gabe's instruction.

6. **Window auto-rules**: Freezers always get heated windows; coolers always get non-heated. This is enforced in the builder, not optional.

7. **InsulationType enum rather than free text**: IMP (Insulated Metal Panel), EPS, PIR. Shown in both builder and spec sheets.

8. **`StartBuildModal` as shared component**: Other modules may need similar destructive-action confirmation. Built as reusable.

9. **Use existing `useCelebration` hook**: Already has 6 variants and is used in receiving/BOMs. Just import and call `celebrate()` after successful actions.

10. **DB migration for startedById**: Adds nullable `startedById` (relation to User) and `startedAt` to Assembly model. `startedAt` is set when status moves to IN_PRODUCTION. `startedById` is set to current user.

### Alternatives Considered

- **Three.js for 3D jamb depth**: Rejected — too heavy for a single step visualization. CSS 3D transforms are sufficient and zero-dependency.
- **Full hardware catalog picker with search**: Considered but overkill for 4 standard manufacturers. A simple select dropdown per hardware type is enough.
- **Animated Lottie files for celebrations**: Already have CSS-based celebration system. Consistent to use it.

### Open Questions

1. ~~**Hardware catalog tagging**~~ — **RESOLVED**: All door hardware products (HINGE D690, D90 Handle, D276 Closer, K1277, K56, K1245, K1248, K481 Inside Release, K1094 Closer, etc.) are confirmed to be in the catalog. Full recipe data exists in `prisma/seed-assemblies.ts`. Will use product name matching for bulk lookup.
2. **Gasket as separate step vs. bundled with hardware**: Gabe said he was "never able to choose my gasket" — adding it as an explicit step after hardware. Confirmed.
3. **Window step placement**: After temperature type, before finish. Freezer → heated, Cooler → non-heated auto-sets.

---

## Step-by-Step Tasks

### Step 1: Data Model Updates

Update the DoorSpecs interface and Prisma schema for new fields.

**Actions:**
- Add `InsulationType` type to `door-specs.ts`: `"IMP" | "EPS" | "PIR"`
- Add `insulationType` field to DoorSpecs interface
- Add `windowSize` field: `"14x14" | "14x24" | undefined`
- Add `windowHeated` boolean field
- Add `gasketType` to the builder flow's required tracking
- Constrain finish values by updating `FIELD_METADATA`
- Add `startedById` (String, optional) and `startedAt` (DateTime, optional) to Assembly model in Prisma schema
- Add relation: `startedBy User? @relation("assemblyStartedBy", fields: [startedById], references: [id])`
- Run `npx prisma db push` to sync schema

**Files affected:**
- `src/lib/door-specs.ts`
- `prisma/schema.prisma`

---

### Step 2: Module-Wide UI Consistency

Bring the assemblies pages to parity with the rest of the app.

**Actions:**
- `assemblies/page.tsx`: Add `showBack` to Header (navigates to dashboard), add `mt-6` margin between New Door button and Not Started section header
- `assemblies/page.tsx` — AssemblyCard: Show `assembly.jobName || assembly.jobNumber` as card title instead of "Custom Door"; fall back to `Custom ${type}` only if no job
- `assemblies/[id]/page.tsx`: Add `showBack` to Header, ensure breadcrumb items have `href` for intermediate steps
- `assemblies/new/page.tsx`: Ensure door flow path has proper breadcrumb hrefs
- All scrollable containers: Add `overscroll-none` class to prevent iOS rubber-band bounce
- `door-confirmation.tsx`: Scale section titles from `text-sm` to `text-base font-semibold`, field labels from `text-xs` to `text-sm`, values from `text-sm` to `text-base`, submit button from `h-14` to `h-16 text-lg`

**Files affected:**
- `src/app/assemblies/page.tsx`
- `src/app/assemblies/[id]/page.tsx`
- `src/app/assemblies/new/page.tsx`
- `src/components/doors/door-confirmation.tsx`
- `src/app/globals.css`

---

### Step 3: Functional Breadcrumb Navigation in Door Builder

Make breadcrumbs clickable throughout the door creation flow.

**Actions:**
- The door builder already maintains step `history` — expose a callback `onBreadcrumbNavigate(stepIndex)` that pops history back to that point
- In `door-creation-flow.tsx`, pass breadcrumb items with `href` that trigger navigation to previous phases (ENTRY → TEMPLATE_SELECT → BUILDER → CONFIRM)
- In `door-builder.tsx`, map `STEP_GROUPS` to breadcrumb labels and make the StepProgress `onStepClick` navigate backward through history
- The existing `StepProgress` already supports `onStepClick` — wire it up to `goBack()` calls that rewind to the target group

**Files affected:**
- `src/components/doors/door-creation-flow.tsx`
- `src/components/doors/door-builder.tsx`
- `src/app/assemblies/new/page.tsx`

---

### Step 4: Interactive Contextual Door Diagrams

Create the new `DoorDiagramContextual` component and integrate it into each builder step.

**Actions:**
- Create `src/components/doors/door-diagram-contextual.tsx`:
  - Props: `step: BuilderStep`, `specs: Partial<DoorSpecs>`
  - Renders a different SVG visualization per step:
    - **SWING_WIDTH**: Front view of door frame outline. Two orange dots on left and right inner edges. Horizontal double-ended arrow connecting them. Blue dimension label above showing current width or "W".
    - **SWING_HEIGHT**: Same frame. Two dots at top and bottom of opening. Vertical double-ended arrow. Dimension label.
    - **SWING_JAMB**: Frame transitions to a **3D isometric view** using CSS transform `perspective(800px) rotateY(-25deg) rotateX(5deg)`. The jamb/wall thickness is rendered as a colored strip (brand-blue at 20% opacity) along the depth axis. Arrow and dimension label on the jamb strip.
    - **SWING_FRAME**: Returns to 2D. A shaded overlay (navy at 8% opacity) appears around the door opening representing the frame. Dimension marks show standard frame widths (1.5", 5.5" depending on type). Labels for FULL FRAME / FACE FRAME / BALLY TYPE.
    - **SWING_CUTOUTS**: Frame shown with ability to add cutouts as notches on the frame edges. Each cutout renders as: a rectangular bite taken from the frame edge, with three measurement lines — floor to bottom of cutout, floor to top of cutout, width from edge. Animated dashed outline for pending cutout.
    - **SWING_HINGE**: Front view with hinge shapes (small rectangles with pin dot) on the selected side. Latch dot on opposite side. Swing arc indicator.
    - **SWING_TEMP**, **SWING_FINISH**, etc.: Show the full door preview (delegate to DoorPreview).
  - All transitions use `transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)` for smooth morphing
  - Max width 220px, centered, with subtle blueprint grid background

- Update `door-builder.tsx`:
  - For each step, render `<DoorDiagramContextual step={step} specs={specs} />` instead of the generic `<DoorPreview />`
  - The DoorPreview still shows for steps that don't have a special contextual view

**Files affected:**
- `src/components/doors/door-diagram-contextual.tsx` (new)
- `src/components/doors/door-builder.tsx`

---

### Step 5: Fix Door Preview — Cutouts & Hardware

Correct the DoorPreview component's cutout placement and hardware rendering.

**Actions:**
- **Cutouts**: Move cutout rendering from inside the door panel to the frame edges. A cutout is a rectangular notch taken from the frame. For each cutout:
  - Calculate Y position from `floorToBottom` and `floorToTop` (scaled to SVG coordinates)
  - Render as a gap/notch in the frame rect on the hinge side (or specified side)
  - Show measurement arrows: floor→bottom, floor→top, width from edge
  - Use brand-blue dashed stroke for cutout boundary
- **Hinges**: Replace circles with small rounded rectangles (hinge plates) with a pin dot. More recognizable as hinges.
- **Latch**: Replace circle with a small handle shape (rectangle with rounded end).
- **Closer**: Keep as small rectangle at top.
- **Contextual visibility**: Only render hardware elements when `showHardware` prop is true (set during hinge/hardware builder steps and on confirmation/detail pages).

**Files affected:**
- `src/components/doors/door-preview.tsx`

---

### Step 6: Builder Flow — Data & Validation Fixes

Update the door builder for correct data entry and validation.

**Actions:**

**A. Finish — Only 3 Options (Item 15)**
- Replace the 4 choice buttons + custom input with exactly 3:
  - "WPG" (White Painted Galv)
  - "SS" (Stainless Steel)
  - "Gray"
- Remove White/White, Galvalume, and custom finish option
- Both `SWING_FINISH` and `SLIDER_FINISH` steps

**B. Insulation Step (Item 18)**
- Add `SWING_INSULATION` step after `SWING_SILL` / before `SWING_TEMP`
- Three choices: "IMP" (Insulated Metal Panel), "EPS", "PIR"
- When IMP selected for sliders, prompt for panel brand (handled at checkout by door shop)
- Store as `insulationType` in specs

**C. Gasket Step (Item 24)**
- Add `SWING_GASKET` step after `SWING_HARDWARE` / before `SWING_FINISH`
- Two choices: "Magnetic" / "Neoprene"
- Currently gasket is auto-set by `getStandardHardware()` — make it explicit

**D. Window Step (Item 17)**
- Add `SWING_WINDOW` step in extras or after temperature type
- Question: "View Window?"
  - No Window
  - 14" x 14" (Standard)
  - 14" x 24"
- Auto-set heated/non-heated: Freezer = heated, Cooler = non-heated
- Store: `windowSize`, `windowHeated`

**E. Hardware from Catalog (Item 13)**
- Replace free-text inputs in `SWING_HARDWARE_CUSTOM` with select dropdowns
- Options sourced from standard hardware list in `door-specs.ts` (already has the data — Kason K1277, DENT D690, etc.)
- Each field (hinge, latch, closer) gets a dropdown with known options + "Other (specify)" fallback
- Add inside release field

**F. Validation — No Advance Without Selection (Item 14)**
- `SWING_HARDWARE_CUSTOM`: Disable "Next" button until at least hinge and latch are selected
- All ChoiceButton steps already require a click to advance (inherent in the flow)
- `SWING_FINISH`: Already requires selection (no "skip" path)

**G. Cutout Description Fix (Item 11)**
- Update the cutout description text from "Openings cut into the door panel (for pass-throughs, vents, etc.)" to "Cutouts along the door frame to accommodate existing fixtures (thermometers, light switches, etc.)"
- Update field labels to be clearer: "Floor to Bottom of Cutout", "Floor to Top of Cutout", "Width from Frame Edge"

**H. Step Ordering (updated flow)**
Swing branch:
1. TYPE → 2. SWING_WIDTH → 3. SWING_HEIGHT → 4. SWING_JAMB → 5. SWING_FRAME → 6. SWING_CUTOUTS → 7. SWING_SILL → 8. SWING_INSULATION → 9. SWING_TEMP → 10. SWING_WINDOW → 11. SWING_HINGE → 12. SWING_HARDWARE → 13. SWING_GASKET → 14. SWING_FINISH → 15. SWING_EXTRAS → DONE

**Files affected:**
- `src/components/doors/door-builder.tsx`
- `src/lib/door-specs.ts`

---

### Step 7: Spec Sheet Overhaul

Redesign the door spec sheet for proper layout and alignment.

**Actions:**

**A. Dimensions Section (Item 20)**
- Display W, H, and Jamb Depth at the same font size (`text-2xl font-bold`)
- Format with " symbol: `36"`, `84"`, `4"`
- Layout: "Sizing" section with clear W x H display, "Jamb Depth" aligned beside it at same visual weight
- Remove the separate "Size in Clear (W x H)" label — make it self-evident

**B. Insulation Section (Item 21)**
- Rename "Panel & Insulation" to "Insulation"
- Show insulation type (e.g., "EPS 3.5 in") as a single clear line
- Remove panel checkbox clutter if panel is always insulated

**C. Hardware 4-Box Grid (Items 22, 25)**
- Replace current misaligned hardware section with a 2x2 grid:
  - Box 1: **Hinges** — Manufacturer, Model, Offset
  - Box 2: **Latch** — Manufacturer, Model
  - Box 3: **Closer** — Model
  - Box 4: **Inside Release** — Model
- Each box: `bg-surface-secondary rounded-lg p-3`, bold title, clean rows
- Only hinges show offset field

**D. Finish Section**
- Show the abbreviation (WPG, SS, Gray) prominently

**Files affected:**
- `src/components/doors/door-spec-sheet.tsx`

---

### Step 8: Manufacturing Sheet Overhaul

Fix hardware section and alignment on the manufacturing sheet.

**Actions:**

**A. Hardware Section (Items 23, 25)**
- Replace "HINGE MFR'S NAME" header with "HARDWARE"
- Same 4-box layout as spec sheet:
  - Hinges: Part #, Offset
  - Latch: Part #
  - Closer: Part #
  - Inside Release: Part #
- Each box clearly labeled, aligned, with consistent typography

**B. Field Alignment**
- Ensure all MfgField rows have consistent label widths
- Use tabular-nums for all dimension values

**C. Insulation**
- Add insulation type display (IMP/EPS/PIR + thickness)

**Files affected:**
- `src/components/doors/door-manufacturing-sheet.tsx`

---

### Step 9: Start Build Modal + Workflow Tracking

Replace browser confirm with branded modal, add build tracking.

**Actions:**

**A. StartBuildModal Component (Item 26)**
- Create `src/components/shared/start-build-modal.tsx`
- Props: `open`, `onOpenChange`, `onConfirm`, `components`, `assemblyName`
- Design: Navy header, warning icon, "Start Build" title
- Body: "This will deduct the following materials from inventory:" followed by component list
- Footer: Cancel (ghost) + "Start Build" (orange, h-12)
- Subtle backdrop blur, rounded-2xl, animate-in

**B. Workflow Tracking (Item 27)**
- On PATCH to `IN_PRODUCTION`: set `startedById = currentUserId`, `startedAt = new Date()`
- Display on detail page: "Started by [Name] on [Date]" alongside the existing approval info
- Show build start date and completion date clearly

**C. Celebration Animations (Item 28)**
- Import `useCelebration` in `assemblies/[id]/page.tsx`
- Call `celebrate()` after successful Start Build, Complete Build, and Ship actions
- Add CSS button effects:
  - Start Build: Orange pulse ripple from button center
  - Complete Build: Green checkmark scale-up
  - Ship: Blue send animation

**Files affected:**
- `src/components/shared/start-build-modal.tsx` (new)
- `src/app/assemblies/[id]/page.tsx`
- `src/app/api/assemblies/[id]/route.ts`
- `prisma/schema.prisma` (from Step 1)

---

### Step 10: Auto-Populate Components from Recipes

Ensure the BOM components list is populated from the established RSNE door recipes. All products are already in the catalog (confirmed by Gabe).

**Actions:**

**A. Build Recipe Lookup Table**
- Create a recipe matching function in `src/lib/door-recipes.ts` that maps door specs (size, temp type, sill type, exterior, slider) to the correct template's component list
- Data source: `prisma/seed-assemblies.ts` contains all recipes. Key recipes:
  - **Cooler 3x7**: Pine(2), TWS coil(92), Magnetic Gasket(2.5), HINGE D690(2), D90 Handle(1), D276 Closer(1), EPS 3.5"(1), Silicone(0.1), ADFOAM(0.2), GLUE(0.05), Glow Push Panel(1), Diamond Plate(0.5), Wiper Gasket(0.03)
  - **Cooler 4x7**: Pine(3), TWS coil(110), Wiper Gasket, Jamison Gasket(0.18), K1277 Hinge(2), K56 Latch+Strike, EPS 3.5"(1), etc.
  - **Cooler 5x7**: Similar but K1277(3), K55 Complete latch, EPS 2"
  - **Freezer 3x7**: Adds Trymer insulation, heater cables (12ft+34ft), galv sheet
  - **Freezer 4x7**: K1277(2), K56, Trymer, heater cables (36ft+15ft)
  - **Slider 4x7–8x8**: SLD track, IMP panels, floor roller, striker, tongue, aluminum flat bar, upright gasket assemblies
  - **Exterior doors**: K1245 hinges, K56 latch, K481 Inside Release, no closer
  - **High sill variants**: Adjusted gasket, heater cable amounts

**B. Auto-Populate on Spec Completion**
- When door builder calls `onComplete(specs)`, immediately match specs to the closest recipe
- Match logic: door type (swing/slider) → size (width × height, bucketed) → temp (cooler/freezer) → sill type → exterior flag
- Fetch matching products from catalog via API: `GET /api/products?names=HINGE D690,D90 Handle,...`
- Pre-populate the components array with all matched products and their standard quantities
- User sees these on the confirmation page and can adjust quantities or remove items

**C. New API Endpoint for Bulk Product Lookup**
- Add `GET /api/products/bulk-lookup` that accepts a comma-separated list of product name fragments
- Returns matching products with id, name, unitOfMeasure, currentQty
- Used by the recipe auto-populate to convert product names → product IDs

**D. Fallback for Non-Exact Matches**
- If door size doesn't exactly match a recipe (e.g., 38" × 75"), find the closest recipe by size and flag components as "estimated — adjust quantities"
- Always let the user modify the auto-populated list

**Files affected:**
- `src/lib/door-recipes.ts` (new — recipe lookup table and matching logic)
- `src/components/doors/door-creation-flow.tsx` (call recipe lookup after builder completes)
- `src/components/doors/door-confirmation.tsx` (display auto-populated components)
- `src/app/api/products/bulk-lookup/route.ts` (new — bulk product name lookup)

---

### Step 11: Polish & Scroll Fix

Final polish pass across all touched files.

**Actions:**

**A. Overscroll Fix (Item 16)**
- Add to `globals.css`: `.overscroll-fix { overscroll-behavior: none; -webkit-overflow-scrolling: touch; }`
- Apply to all scrollable page containers in assemblies module
- Test on iOS Safari (primary target)

**B. Button Animations**
- Add CSS keyframes for workflow button effects
- Pulse ripple: `@keyframes ripple-orange { 0% { box-shadow: 0 0 0 0 rgba(232,121,43,0.4); } 100% { box-shadow: 0 0 0 20px rgba(232,121,43,0); } }`
- Apply via conditional class when action succeeds

**C. Verify All Changes**
- Run `npm run build` to catch TypeScript errors
- Test door creation flow end-to-end
- Verify spec sheet and manufacturing sheet render correctly
- Verify breadcrumb navigation works
- Verify celebration triggers on workflow actions

**Files affected:**
- `src/app/globals.css`
- All modified files (verification pass)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/hooks/use-assemblies.ts` — May need to accept `startedById` in update mutation
- `src/components/doors/door-creation-flow.tsx` — Orchestrates the entire door flow, will need updates for new steps
- `src/app/api/assemblies/[id]/route.ts` — Needs to handle `startedById` and `startedAt`
- `prisma/schema.prisma` — Schema migration needed for new Assembly fields

### Updates Needed for Consistency

- `context/project-status.md` — Update to note door shop overhaul completion
- `CLAUDE.md` — No changes needed (module structure unchanged)
- Assembly API response types — Ensure `startedBy` user relation is included in GET

### Impact on Existing Workflows

- Door creation flow gets additional steps (insulation, gasket, window) — makes it slightly longer but more complete
- Finish options reduced from 5+ to 3 — some existing doors may have old finish values; display gracefully
- Hardware changes are backward-compatible — old free-text values still display on existing doors
- New Assembly fields are nullable — no migration impact on existing data

---

## Validation Checklist

- [ ] Door builder flow: all new steps (insulation, gasket, window) work correctly
- [ ] Finish options: only WPG, SS, Gray shown; old values display gracefully on existing doors
- [ ] Hardware: dropdown selection works, validation prevents empty advance
- [ ] Interactive diagrams: each step shows correct contextual measurement visualization
- [ ] Cutouts: rendered on frame edges in both DoorPreview and DoorDiagramContextual
- [ ] Spec sheet: dimensions aligned, " symbols, 4-box hardware grid
- [ ] Manufacturing sheet: "HARDWARE" header, 4-box grid, aligned fields
- [ ] Confirmation page: larger fonts/buttons, split insulation/finish sections
- [ ] Breadcrumbs: clickable navigation backwards through builder steps
- [ ] Main page: job names on cards, spacing below New Door button
- [ ] Start Build: branded modal instead of browser confirm
- [ ] Build tracking: startedBy name and date shown on detail page
- [ ] Celebrations: trigger on Start Build, Complete, Ship
- [ ] Overscroll: no bounce on any assemblies page
- [ ] `npm run build` passes with zero errors

---

## Success Criteria

The implementation is complete when:

1. Every one of the 28 feedback items is addressed and verifiable
2. The door shop module visually matches the polish level of the receiving and BOMs modules
3. Interactive door diagrams provide clear, step-specific measurement guidance
4. Spec sheet and manufacturing sheet match the real RSNE paper forms in field layout and organization
5. All workflow actions (approve, start build, complete, ship) have branded UX with celebrations
6. `npm run build` succeeds with zero errors and the app deploys cleanly

---

## Notes

- The door engineering drawings (DR COOLER RSNE-B.pdf) show front elevation, horizontal section, and vertical section views — these are the reference for how cutouts, hinges, and dimensions should appear in the SVG diagrams
- The manufacturing sheet PDF shows the exact field order and layout that the digital version should match
- Some items (like the hardware catalog query) depend on what products exist in the database — may need to seed additional hardware products if they're not already in the catalog
- The 3D jamb depth visualization is the key "wow factor" moment — invest time making the CSS 3D transform smooth and convincing
- Window heated/non-heated auto-rule (freezer=heated, cooler=non-heated) removes a decision point from the user, which aligns with the "so easy a 3-year-old can do it" philosophy

---

## Implementation Notes

**Implemented:** 2026-03-24

### Summary

All 11 steps executed. 4 new files created, 14 existing files modified. Build passes with zero errors. All 28 feedback items addressed across the door shop module.

### Deviations from Plan

- Frame type selection in builder changed from "Standard Frame or Custom?" to explicit Full Frame / Face Frame / Bally Type choices (more direct, fewer clicks)
- `window.confirm` for extras/window preset removed from ExtrasSelector — simplified to just the 3 toggle chips
- Database push skipped (no local DATABASE_URL) — schema changes validated via `prisma generate`

### Issues Encountered

- Type mismatch on StartBuildModal `components` prop — `Record<string, unknown>[]` from API needed explicit cast to typed array. Fixed with inline type assertion.
- No other build errors encountered.
