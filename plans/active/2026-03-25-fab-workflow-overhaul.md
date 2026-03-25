# Plan: Fabrication Workflow Overhaul + Door Queue Updates

**Created:** 2026-03-25
**Status:** Implemented
**Request:** Complete overhaul of the fabrication (panels/floors/ramps) creation flow, detail page, and component management — plus door queue job number visibility improvements.

---

## Overview

### What This Plan Accomplishes

Transforms the fabrication workflow from a minimal template-picker into a full-featured creation flow that mirrors the door workflow's polish: job picker → type selection → spec entry with scroll-wheel pickers → component auto-calculation → review/confirm. Adds ramp support as a new assembly type, improves the detail page with type-specific headers and lifecycle tracking, and brings component management up to par with swipe-to-delete and search-to-add across the entire app.

### Why This Matters

The fabrication workflow is the second most-used path in the app (after doors). Currently it's a skeleton — no job picker, no spec entry, no dimension inputs, no ramps. Shop foremen building wall panels, floor panels, and ramps need the same guided, mobile-first experience that door creation provides. The door queue also needs job numbers visible at a glance so foremen can quickly identify which build belongs to which job.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` + `design-inspiration` | Scroll-picker reuse pattern (TapeMeasureInput for dimensions, OptionPicker for materials/insulation). Card and section styling per design system (p-5, rounded-xl, border-border-custom). Apple Notes cleanliness for nav, Monday.com boldness for status/type cards. |
| `engineering-skills` (backend) | Panel/ramp spec schema design. Component auto-calculation pattern (spec → recipe → product lookup). RAMP enum migration safety. API contract for new assembly types. |
| `product-skills` (UX researcher) | Fab creation flow mirrors door flow (proven pattern users already know). Type tabs on detail page for scanability. Swipe-to-delete as established deletion pattern — consistency reduces learning curve. |

### How Skills Shaped the Plan

The frontend-design skill confirms we reuse TapeMeasureInput (feet+inches wheels) and OptionPicker (material/insulation lists) rather than building new picker components. The engineering skill identified that component auto-calculation should happen client-side via a recipe-lookup pattern (same as doors), not server-side, to keep the API simple. The UX skill confirmed that mirroring the door workflow step-by-step reduces cognitive load for users who already know that flow.

---

## Current State

### Relevant Existing Structure

| File | Current Role |
|------|-------------|
| `src/app/assemblies/new/page.tsx` (440 lines) | Fab creation flow — Type → Template → Details (Job text input + Batch Size + AI components) |
| `src/app/assemblies/page.tsx` (539 lines) | Queue page with Door Shop / Fabrication / Ship tabs. AssemblyCard component. |
| `src/app/assemblies/[id]/page.tsx` (510 lines) | Detail page — status card, components list, door sheet toggle, action buttons |
| `src/hooks/use-assemblies.ts` (155 lines) | React Query hooks for assembly CRUD |
| `src/components/doors/door-creation-flow.tsx` (552 lines) | Door flow — JOB → TYPE → SIZE → CONFIRM. Reference for job picker pattern. |
| `src/components/doors/tape-measure-input.tsx` (318 lines) | Scroll-wheel dimension picker (feet + fractional inches) |
| `src/components/doors/option-picker.tsx` (258 lines) | Multi-wheel option picker (bottom sheet) |
| `src/components/ui/swipe-to-delete.tsx` (155 lines) | Swipe-to-reveal-delete component |
| `src/components/bom/product-picker.tsx` | Search-as-you-type product finder (uses `/api/products/browse`) |
| `src/components/layout/step-progress.tsx` (92 lines) | Step tracker with clickable circles |
| `prisma/schema.prisma` | AssemblyType enum: DOOR, FLOOR_PANEL, WALL_PANEL (no RAMP) |
| `prisma/seed-assemblies.ts` | 6 WALL_PANEL templates, 6 FLOOR_PANEL templates, many DOOR templates |

### Gaps or Problems Being Addressed

1. **No RAMP assembly type** — schema only has DOOR, FLOOR_PANEL, WALL_PANEL
2. **No job picker in fab flow** — just a text input, unlike the door flow's search-and-select
3. **Template cards show component counts** — unnecessary detail that clutters the selection
4. **Scroll position bug** — selecting template/custom lands at page bottom
5. **No floor panel or ramp templates** in creation flow (templates exist in DB but ramp type missing)
6. **Details page header says "Assignment"** — should show type (Floor Panels / Wall Panels / Ramp) + job info
7. **No spec entry for panels/ramps** — no dimensions, insulation, materials pickers
8. **No component auto-calculation** — panels don't compute materials from specs
9. **Tracker only has 3 steps** — needs lifecycle steps (Build, Ship) like doors
10. **Adding components requires AI input only** — no manual search-to-add
11. **Component deletion uses trash icon** — should use swipe-to-delete globally
12. **Door queue cards lack job number** — foremen can't identify builds at a glance
13. **Door queue pills lack job number** — same visibility issue

---

## Proposed Changes

### Summary of Changes

- Add `RAMP` to `AssemblyType` enum in Prisma schema
- Add ramp templates to seed data
- Create `src/lib/panel-specs.ts` — Panel/ramp spec types, material options, insulation options, recipes
- Overhaul `src/app/assemblies/new/page.tsx` — Complete rewrite of fab creation flow
- Create `src/components/fab/fab-creation-flow.tsx` — New component for panel/floor/ramp creation (extracted from page)
- Create `src/components/fab/panel-spec-form.tsx` — Spec entry form for wall/floor panels with scroll pickers
- Create `src/components/fab/ramp-spec-form.tsx` — Spec entry form for ramps with scroll pickers
- Create `src/components/fab/component-list.tsx` — Reusable component list with search-to-add + swipe-to-delete
- Modify `src/app/assemblies/page.tsx` — Add job # to door queue cards and pills
- Modify `src/app/assemblies/[id]/page.tsx` — Type-specific header, job info display, lifecycle tracker
- Modify `src/app/api/assemblies/route.ts` — Accept panel/ramp specs, handle RAMP queueType routing

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `src/lib/panel-specs.ts` | Panel/ramp spec types, material constants, insulation options, dimension constraints, recipe-to-component mapping |
| `src/components/fab/fab-creation-flow.tsx` | Full fab creation flow: Job → Type → Template/Specs → Review/Confirm |
| `src/components/fab/panel-spec-form.tsx` | Wall/floor panel spec entry with TapeMeasureInput (dimensions) + OptionPicker (insulation, materials) |
| `src/components/fab/ramp-spec-form.tsx` | Ramp spec entry with TapeMeasureInput (5 dimension fields) + OptionPicker (insulation, diamond plate) |
| `src/components/fab/component-list.tsx` | Shared component list: ProductPicker search-to-add + SwipeToDelete rows + quantity editing |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `prisma/schema.prisma` | Add `RAMP` to `AssemblyType` enum |
| `prisma/seed-assemblies.ts` | Add ramp templates (EPS ramp 8', 10', etc.) |
| `src/app/assemblies/new/page.tsx` | Simplify to routing shell — delegates to DoorCreationFlow or FabCreationFlow |
| `src/app/assemblies/page.tsx` | AssemblyCard: add job # sub-header, add job # to door spec pills |
| `src/app/assemblies/[id]/page.tsx` | Type header (Floor Panel / Wall Panel / Ramp), job name+number display, panel/ramp specs card, lifecycle status tracker |
| `src/app/api/assemblies/route.ts` | Route RAMP to FABRICATION queue, accept/store panel/ramp specs |
| `src/hooks/use-assemblies.ts` | No changes needed (generic enough) |

### Files to Delete

None — all changes build on existing files.

---

## Design Decisions

### Key Decisions Made

1. **Extract FabCreationFlow into its own component** — Mirrors DoorCreationFlow pattern. Keeps assemblies/new/page.tsx as a thin routing shell. Clean separation of concerns.

2. **Reuse TapeMeasureInput and OptionPicker (not rebuild)** — Both components already handle bottom-sheet scroll pickers with the exact UX Gabe wants. TapeMeasureInput handles feet+inches for panel dimensions. OptionPicker handles material/insulation lists. Moving them from `components/doors/` is unnecessary — they're generic enough.

3. **Panel spec form separate from ramp spec form** — Different field sets (panels: W×L, insulation, side 1/2 materials; ramps: W×L×H, bottom lip, top lip, diamond plate). Separate components keep each clean and focused.

4. **Component auto-calculation via client-side recipe lookup** — Same pattern as door recipes. A `matchPanelRecipe(specs)` function returns component list → bulk product lookup API resolves to actual products. No new API needed.

5. **Replace "Batch Size" with "Quantity"** — Gabe explicitly asked for this. Simpler language, same underlying field (`batchSize` in DB).

6. **Lifecycle tracker on detail page** — StepProgress component reused to show: Planned → Building → Complete → Shipped. Non-interactive (status-driven), just visual progress.

7. **ComponentList as shared component** — Used in both FabCreationFlow (creation) and potentially detail page (editing). Integrates ProductPicker for search-to-add, SwipeToDelete for removal, inline quantity editing.

8. **RAMP routes to FABRICATION queue** — Same as FLOOR_PANEL and WALL_PANEL. No new queue tab needed.

### Alternatives Considered

- **Separate /assemblies/new/panel and /assemblies/new/ramp pages** — Rejected. Too much duplication. Single FabCreationFlow with type-specific spec forms is cleaner.
- **Server-side component calculation** — Rejected. Client-side is faster (no round-trip) and matches the door recipe pattern.
- **New BottomNav tab for Fabrication** — Not requested. Fabrication is already accessible via Assemblies tab.

### Open Questions

1. **Ramp templates** — What specific ramp sizes/specs should be seeded as templates? (Can add more later via seed data.)
2. **Material abbreviations** — FRP, TWS, SS, SWS — should these have full names in the picker? (e.g., "FRP — Fiberglass Reinforced Panel", "SS — Stainless Steel")
3. **Insulation thickness options** — What specific thicknesses for the scroll wheel? (2", 3", 3.5", 4", 5"?)
4. **Component auto-calc formulas** — For custom-sized panels (not template sizes), how are material quantities calculated? (e.g., sq ft of FRP = width × length × 2 sides?)

---

## Step-by-Step Tasks

### Step 1: Schema — Add RAMP to AssemblyType

Add RAMP to the AssemblyType enum so ramps can be created as assemblies.

**Actions:**
- Add `RAMP` to `enum AssemblyType` in schema.prisma (after WALL_PANEL)
- Run `npx prisma db push` to apply
- Add `RAMP` to typeLabels maps in `page.tsx` and `[id]/page.tsx`

**Files affected:**
- `prisma/schema.prisma`
- `src/app/assemblies/page.tsx` (typeLabels)
- `src/app/assemblies/[id]/page.tsx` (typeLabels)

---

### Step 2: API — Route RAMP to FABRICATION queue

Update the assembly creation API to handle RAMP type and store panel/ramp specs.

**Actions:**
- In `src/app/api/assemblies/route.ts` POST handler, add RAMP to FABRICATION queueType routing (alongside FLOOR_PANEL, WALL_PANEL)
- Ensure specs JSON is stored for panel/ramp assemblies (already supported — `specs: Json?`)
- RAMP assemblies should NOT require approval (same as panels: `approvalStatus: NOT_REQUIRED`)

**Files affected:**
- `src/app/api/assemblies/route.ts`

---

### Step 3: Lib — Create panel/ramp spec system

Create the data types, material options, and recipe system for panels and ramps.

**Actions:**
- Create `src/lib/panel-specs.ts` with:
  - `PanelSpecs` interface: `{ width: string, length: string, insulation: string, insulationThickness: string, side1Material: string, side2Material: string }`
  - `RampSpecs` interface: `{ width: string, length: string, height: string, bottomLip: string, topLip: string, insulation: string, diamondPlateThickness: string }`
  - `INSULATION_OPTIONS`: `["EPS", "PIR", "Dow High-Load"]`
  - `INSULATION_THICKNESS_OPTIONS`: `["2", "3", "3.5", "4", "5"]` (inches)
  - `PANEL_MATERIAL_OPTIONS`: `["FRP", "TWS", "SS", "SWS"]` (with "Other" handled by OptionPicker's allowOther)
  - `DIAMOND_PLATE_OPTIONS`: `[".063", ".125", ".25"]`
  - `PANEL_MAX_WIDTH_FT`: 4
  - `PANEL_MAX_LENGTH_FT`: 20
  - `getDefaultPanelSpecs(type: "WALL_PANEL" | "FLOOR_PANEL")` — defaults (floor: side1=None, side2=None)
  - `getDefaultRampSpecs()` — empty defaults
  - `matchPanelRecipe(specs: PanelSpecs, type: AssemblyType)` → component name/qty list (matches against template data patterns)

**Files affected:**
- `src/lib/panel-specs.ts` (new)

---

### Step 4: Component — Create ComponentList (shared)

Build the reusable component list with search-to-add and swipe-to-delete.

**Actions:**
- Create `src/components/fab/component-list.tsx`:
  - Props: `components`, `onAdd(product, qty)`, `onRemove(index)`, `onQtyChange(index, qty)`, `batchSize?`
  - Renders ProductPicker at top (search-as-you-type from `/api/products/browse`)
  - "Add" button appears when a product is selected (or tap product row to add with qty=1)
  - Each component row: product name, stock status dot, qty input, UOM label
  - Each row wrapped in `<SwipeToDelete onDelete={() => onRemove(index)}>`
  - Batch size multiplier note at bottom if batchSize > 1
  - Empty state: "Search for products above to add components"

**Files affected:**
- `src/components/fab/component-list.tsx` (new)

---

### Step 5: Component — Create PanelSpecForm

Build the spec entry form for wall and floor panels with scroll pickers.

**Actions:**
- Create `src/components/fab/panel-spec-form.tsx`:
  - Props: `specs: PanelSpecs`, `onChange(specs)`, `type: "WALL_PANEL" | "FLOOR_PANEL"`
  - **Quantity** row: simple number input (replaces old "Batch Size")
  - **Dimensions** section:
    - Width: TapeMeasureInput (max 48 inches / 4 feet)
    - Length: TapeMeasureInput (max 240 inches / 20 feet)
  - **Insulation** section:
    - Type: OptionPicker single wheel (EPS, PIR, Dow High-Load)
    - Thickness: TapeMeasureInput or OptionPicker (2", 3", 3.5", 4", 5")
  - **Materials** section:
    - Side 1: OptionPicker with allowOther (FRP, TWS, SS, SWS, Other) — default "None" for floors
    - Side 2: OptionPicker with allowOther (same options) — default "None" for floors
  - Each field uses SpecRow-style layout (label left, value/trigger right, min-h-[44px])
  - Section grouping with SectionCard-style dividers

**Files affected:**
- `src/components/fab/panel-spec-form.tsx` (new)

---

### Step 6: Component — Create RampSpecForm

Build the spec entry form for ramps with scroll pickers.

**Actions:**
- Create `src/components/fab/ramp-spec-form.tsx`:
  - Props: `specs: RampSpecs`, `onChange(specs)`
  - **Quantity** row: simple number input
  - **Dimensions** section (all in inches, TapeMeasureInput):
    - Width (inches)
    - Length (inches)
    - Height (inches — highest point on ramp)
    - Bottom Lip (inches)
    - Top Lip (inches)
  - **Insulation** section:
    - Type: OptionPicker single wheel (EPS, PIR, Dow High-Load)
  - **Finish** section:
    - Diamond Plate Thickness: OptionPicker single wheel (.063, .125, .25)

**Files affected:**
- `src/components/fab/ramp-spec-form.tsx` (new)

---

### Step 7: Component — Create FabCreationFlow

Build the full fabrication creation flow, mirroring the door workflow's structure.

**Actions:**
- Create `src/components/fab/fab-creation-flow.tsx`:
  - **Phases**: `JOB → TYPE → TEMPLATE → SPECS → REVIEW`
  - **Step tracker**: `["Job", "Type", "Specs", "Review"]` (4 steps — Template selection is part of Type/Specs phase)
  - **JOB phase** (copy from door-creation-flow.tsx):
    - Search input with `useJobs` hook
    - Job list with Briefcase icon, name, number/client
    - Manual entry fallback
    - "Continue" advances to TYPE
  - **TYPE phase**:
    - Three cards: Wall Panel | Floor Panel | Ramp
    - Wall/Floor use Layers icon, Ramp uses a suitable icon
    - Cooler-gray bg for standard, no blue (ramps are neither cooler nor freezer)
    - Selecting type advances to TEMPLATE (or SPECS for Ramp if no ramp templates)
  - **TEMPLATE phase** (for Wall/Floor only):
    - Template cards: name + description only (NO component count — Gabe's request)
    - "Custom" option with dashed border
    - Selecting template pre-fills specs + components from template data
    - Advances to SPECS
  - **SPECS phase**:
    - Renders PanelSpecForm (wall/floor) or RampSpecForm (ramp)
    - If template selected, fields pre-filled with template defaults
    - "Continue" button advances to REVIEW
    - Component auto-calculation runs when specs change (debounced) or on "Continue"
  - **REVIEW phase**:
    - Summary card showing all specs (read-only, grouped by section)
    - ComponentList (editable — can add/remove/change qty)
    - Notes textarea
    - "Add to Fabrication Queue" submit button
    - Back button

- `scrollTo(0, 0)` on each phase transition (fixes scroll position bug)

**Files affected:**
- `src/components/fab/fab-creation-flow.tsx` (new)

---

### Step 8: Page — Simplify assemblies/new routing shell

Reduce the new assembly page to a thin routing shell that delegates to DoorCreationFlow or FabCreationFlow.

**Actions:**
- Rewrite `src/app/assemblies/new/page.tsx`:
  - If `?type=DOOR` → render DoorCreationFlow (existing)
  - If `?type=PANEL` → render FabCreationFlow (new)
  - Otherwise → type selection screen (Door / Panel-Floor-Ramp)
  - Type selection:
    - "New Door" card → navigates to `?type=DOOR`
    - "New Panel / Floor / Ramp" card → navigates to `?type=PANEL`
  - Remove all old template/details/component state — moved to FabCreationFlow

**Files affected:**
- `src/app/assemblies/new/page.tsx`

---

### Step 9: Page — Update assembly detail page

Add type-specific header with job info, panel/ramp specs display, and lifecycle status tracker.

**Actions:**
- Modify `src/app/assemblies/[id]/page.tsx`:
  - **Header area**: Replace generic "Assembly Detail" with type-specific display:
    - Type badge (Floor Panel / Wall Panel / Ramp / Door) with icon
    - Job Name prominently (large, navy, bold)
    - Job Number as sub-text (text-brand-blue, "Job #1234")
    - Status badge (existing)
  - **Lifecycle tracker** (new section, below header card):
    - Use StepProgress component in read-only mode (no onStepClick)
    - Steps: `["Created", "Building", "Complete", "Shipped"]`
    - Map assembly status to step index:
      - PLANNED/AWAITING_APPROVAL/APPROVED → step 0
      - IN_PRODUCTION → step 1
      - COMPLETED/ALLOCATED → step 2
      - SHIPPED → step 3
  - **Panel/Ramp specs card** (new section, after lifecycle tracker):
    - If assembly has specs and type is WALL_PANEL/FLOOR_PANEL/RAMP:
      - Display specs in a read-only SectionCard-style layout
      - Panels: Dimensions, Insulation (type + thickness), Materials (Side 1, Side 2)
      - Ramps: Dimensions (W × L × H, lips), Insulation, Diamond Plate
  - **Components section**: Wrap each component row in SwipeToDelete (for editable statuses only: PLANNED, APPROVED)

**Files affected:**
- `src/app/assemblies/[id]/page.tsx`

---

### Step 10: Page — Door queue job number + pills

Add job number visibility to door queue cards.

**Actions:**
- Modify `src/app/assemblies/page.tsx` AssemblyCard:
  - **Job number sub-header**: Below the job name, show `Job #{jobNumber}` in `text-xs text-brand-blue font-medium` (currently this is below the specs pills — move it up to directly under the job name)
  - **Door spec pills**: Add job number pill at the start of the pill row: `<span className="text-xs font-semibold text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded">#{jobNumber}</span>` — only if jobNumber exists
  - This gives foremen two touchpoints to see the job number: in the card header area AND in the pills row

**Files affected:**
- `src/app/assemblies/page.tsx`

---

### Step 11: Template cards — Remove component count

Clean up template selection cards to remove component information.

**Actions:**
- In FabCreationFlow TEMPLATE phase (Step 7 above), template cards show only:
  - Template name (font-semibold text-navy)
  - Description (text-xs text-text-secondary)
  - NO "{N} components" text
- This is handled in Step 7 when building FabCreationFlow, but noted here for tracking

**Files affected:**
- `src/components/fab/fab-creation-flow.tsx` (covered in Step 7)

---

### Step 12: Global — SwipeToDelete for all component cards

Apply swipe-to-delete pattern to component rows everywhere in the app.

**Actions:**
- In `src/app/assemblies/[id]/page.tsx` — Wrap each component row in SwipeToDelete (only when status allows editing: PLANNED, APPROVED)
- In FabCreationFlow REVIEW phase — ComponentList already uses SwipeToDelete (Step 4)
- Check DoorConfirmation component rows — if they use trash icon, wrap in SwipeToDelete instead
- Remove standalone trash icon buttons from component rows where SwipeToDelete is applied

**Files affected:**
- `src/app/assemblies/[id]/page.tsx`
- `src/components/doors/door-confirmation.tsx` (if applicable)

---

### Step 13: Validation and QA

Run full validation to ensure everything works correctly.

**Actions:**
- `npx tsc --noEmit` — TypeScript compilation check
- `npx tsx scripts/token-audit.ts` — Design token consistency (0 warnings target)
- Test fab creation flow: Job → Type → Template → Specs → Review → Submit
- Test ramp creation flow: Job → Type → Specs → Review → Submit
- Test custom panel creation (no template): Job → Type → Custom → Specs → Review → Submit
- Test door queue: verify job number shows in cards and pills
- Test detail page: verify type header, lifecycle tracker, specs display
- Test swipe-to-delete on component rows
- Test scroll position: each phase transition should start at top
- Mobile test (375px): verify all touch targets ≥ 44px, no overflow

**Files affected:**
- All modified files

---

## Connections & Dependencies

### Files That Reference This Area

| File | Dependency |
|------|-----------|
| `src/hooks/use-assemblies.ts` | Hooks used by all assembly pages — no changes needed (generic) |
| `src/components/shipping/finished-goods-list.tsx` | Displays finished goods — may need RAMP in type display |
| `src/app/api/assemblies/batch-ship/route.ts` | Batch ship — no changes needed |
| `src/components/shared/start-build-modal.tsx` | Start build confirmation — no changes needed |
| `prisma/seed-assemblies.ts` | Template seed data — add ramp templates |

### Updates Needed for Consistency

- `typeLabels` map needs RAMP entry in every file that displays assembly types
- `finished-goods-list.tsx` getSpecsSummary may need ramp handling
- Bottom nav safe area (already fixed in previous commit)

### Impact on Existing Workflows

- **Door creation**: Unchanged — DoorCreationFlow is untouched
- **Existing panel assemblies**: Backward compatible — old assemblies without specs still render
- **Shipping**: RAMP assemblies will appear in shipping tab alongside panels
- **API consumers**: POST /api/assemblies now accepts RAMP type — additive change

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npx tsx scripts/token-audit.ts` shows 0 warnings
- [ ] RAMP exists in AssemblyType enum and DB accepts it
- [ ] Fab creation flow: Wall Panel with template → components auto-populated
- [ ] Fab creation flow: Floor Panel custom → dimensions/insulation/materials editable
- [ ] Fab creation flow: Ramp → all 5 dimension fields + insulation + diamond plate
- [ ] Job picker works identically to door flow (search, select, manual entry)
- [ ] Template cards show name + description only (no component count)
- [ ] Scroll position resets to top on each phase transition
- [ ] Detail page shows type-specific header with job name + number
- [ ] Detail page shows lifecycle tracker (Created → Building → Complete → Shipped)
- [ ] Detail page shows panel/ramp specs in read-only card
- [ ] Door queue cards show job # as sub-header beneath job name
- [ ] Door queue pills include job # for door assemblies
- [ ] SwipeToDelete works on all component rows (fab creation + detail page)
- [ ] ProductPicker search-to-add works in component list
- [ ] Mobile (375px): all touch targets ≥ 44px, no horizontal overflow
- [ ] All design tokens are brand-correct (no gray-*, no shadow-sm/md/lg on cards)

---

## Success Criteria

The implementation is complete when:

1. A user can create a Wall Panel, Floor Panel, or Ramp assembly through a guided flow (Job → Type → Specs → Review) with scroll-wheel pickers for all spec fields
2. Template selection pre-fills specs and components, and template cards show only name + description
3. Component rows throughout the app use swipe-to-delete and search-to-add (ProductPicker)
4. Door queue cards display job number prominently (sub-header + pills)
5. Assembly detail page shows type-specific header, lifecycle tracker, and panel/ramp specs
6. All changes pass TypeScript compilation and design token audit with 0 errors/warnings

---

## Notes

- **Ramp templates**: The seed data currently has no ramp templates. We'll add a few common sizes but Gabe may want to adjust after seeing them in the app.
- **Component auto-calculation**: The recipe matching for panels is based on the existing template component data. For truly custom sizes (non-template), a formula-based calculation (sq ft × material usage rate) would be more accurate — but that's a future enhancement. For now, we match to the closest template recipe or let the user add components manually.
- **Insulation thickness scroll wheel vs option picker**: Thickness values are discrete (2", 3", 3.5", 4", 5") so an OptionPicker with a single wheel makes more sense than TapeMeasureInput which is designed for continuous inch+fraction values.
- **Material abbreviations**: Using short codes (FRP, TWS, SS, SWS) as primary labels since shop workers know them. "Other" option with manual text input via OptionPicker's `allowOther` prop handles edge cases.
- **Future consideration**: Panel dimension entry could be enhanced with a visual panel size diagram. The tape measure picker handles feet+inches well but a visual preview showing the actual panel proportions would be a nice touch for a future iteration.

---

## Implementation Notes

**Implemented:** 2026-03-25

### Summary

Complete fabrication workflow overhaul: added RAMP to AssemblyType enum, created panel/ramp spec system with recipe matching, built FabCreationFlow with job picker → type → template → specs → review phases using TapeMeasureInput and OptionPicker scroll wheels, simplified assemblies/new page to thin routing shell, updated detail page with lifecycle tracker and panel/ramp specs display, added job # visibility to door queue cards (sub-header + pills), added SwipeToDelete to component rows, and updated all type label maps across the app.

### Deviations from Plan

- Step 12 (global SwipeToDelete for door-confirmation.tsx) deferred — DoorConfirmation already uses a different component management pattern. Applied to detail page component rows only.
- Ramp seed templates (Step in plan notes) not added to seed-assemblies.ts — ramp templates can be added once Gabe confirms specific ramp sizes/specs.

### Issues Encountered

- TypeScript errors from `Record<string, unknown>` specs — resolved by using `!!` guards and `String()` casts for JSX rendering, and refactoring spec display to a filtered array pattern.
- `useCreateAssembly` hook type didn't include "RAMP" — added to hook type union.
