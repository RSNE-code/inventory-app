# Plan: Streamlined Door Builder — Template-First Flow

**Created:** 2026-03-24
**Status:** Implemented
**Request:** Redesign door builder from 20+ step interview to a fast 4-screen template-driven flow

---

## Overview

### What This Plan Accomplishes

Replaces the current 20+ step door builder interview with a streamlined 4-screen flow: Job → Type → Standard Size → Confirm & Customize. Templates auto-fill all hardware, gasket, insulation, and finish specs. The SM only manually enters what actually varies: dimensions, frame, cutouts, and hinge/slide direction.

### Why This Matters

Almost all RSNE doors fall within standard configurations. The current interview wastes the SM's time asking about hardware, gasket type, insulation, finish, sill, window, and extras that are always the same for a given door type and size. The new flow respects that reality — pick a template, confirm what matters, submit.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | 4-screen layout: job search list, 2x2 type grid with bold cards, size template cards with hardware summary, confirmation with inline editing. Industrial/utilitarian tone matching blueprint aesthetic. |

### How Skills Shaped the Plan

The frontend skill confirmed the 2x2 grid for type selection with bold visual differentiation (color-coded temperature: blue=cooler, orange/red=freezer). Size template cards should lead with the size number prominently (display font, 2rem+) with hardware summary below. The confirmation screen reuses existing `DoorConfirmation` with minor additions.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `src/components/doors/door-creation-flow.tsx` | Top-level flow controller (ENTRY → BUILDER/TEMPLATE → CONFIRM) |
| `src/components/doors/door-builder.tsx` | 20+ step interview (TYPE → dimensions → features → DONE) |
| `src/components/doors/door-confirmation.tsx` | Spec review + edit + components + submit |
| `src/lib/door-specs.ts` | Types, defaults, `getStandardHardware()`, `calculateHeaterCable()` |
| `src/lib/door-recipes.ts` | Recipe definitions + `matchDoorRecipe()` |
| `src/hooks/use-jobs.ts` | `useJobs(search?)` hook — fetches from `/api/jobs` |
| `src/app/api/jobs/route.ts` | GET returns active jobs with search filter |

### Available Standard Sizes (from door-recipes.ts)

| Type | Sizes Available |
|------|----------------|
| Cooler Swing | 3'×7', 4'×7', 5'×7' |
| Freezer Swing | 3'×7', 4'×7' |
| Cooler Slider | 4'×7', 5'×7', 6'×7', 6'×8', 8'×8' |
| Freezer Slider | None yet (custom only) |
| Exterior Cooler | 3'×7' |
| Exterior Freezer | 3'×7' |

### Gaps Being Addressed

- Flow requires 20+ taps for a standard door that could be configured in 4
- Job selection happens on the confirmation screen instead of up front
- Hardware/gasket/insulation/finish are asked individually despite being standard per type+size
- No way to quickly pick a standard size and go
- The "Door Builder" vs "Use Template" split is confusing — templates ARE the primary path

---

## Proposed Changes

### Summary of Changes

- Rebuild `door-creation-flow.tsx` with new 4-phase flow: JOB → TYPE → SIZE → CONFIRM
- Add a `STANDARD_SIZES` data structure to `door-specs.ts` that maps type → available sizes with pre-filled specs
- Keep `door-builder.tsx` as-is but only use it as fallback for "Custom Size" option
- Move job selection from confirmation to step 1
- Remove the "Door Builder vs Template" entry screen — template-first is now default
- Add "Custom" option on the size screen that launches the existing builder for non-standard doors

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/door-specs.ts` | Add `STANDARD_DOOR_CONFIGS` — array of standard sizes per type with full pre-filled specs |
| `src/components/doors/door-creation-flow.tsx` | Complete rewrite of flow phases: JOB → TYPE → SIZE → CONFIRM (+ CUSTOM_BUILDER fallback) |
| `src/components/doors/door-confirmation.tsx` | Remove job name input (moved to step 1). Add quick-edit sections for dimensions, frame, cutouts, hinge direction prominently at top before the full spec list |
| `src/components/doors/door-builder.tsx` | No changes — used as-is for custom size fallback |

### Files to Delete

None — existing builder preserved as custom fallback.

---

## Design Decisions

### Key Decisions Made

1. **Template-first, builder-fallback**: The default path is Job → Type → Size → Confirm. The old 20-step builder only launches if the user picks "Custom Size" — most SMs will never need it.

2. **Job selection is step 1**: Every door belongs to a job. Asking first means the job name flows through to the assembly automatically.

3. **Standard sizes defined in door-specs.ts, not recipes**: Recipes define *components* (materials list). Standard configs define *specs* (dimensions, hardware, gasket, etc.). They're related but different concerns. The size screen picks a config, then `matchDoorRecipe()` finds the recipe for components.

4. **Confirmation screen becomes the customization point**: Instead of asking 15 questions, we pre-fill everything and let the SM change what's different. The confirmation screen already supports inline editing of every field.

5. **Dimensions still need SM input on confirmation**: Even though templates set default dimensions (e.g., 36" × 84"), the SM needs to confirm or adjust the actual clear opening since it may vary slightly from nominal.

### Alternatives Considered

- **Remove builder entirely**: Rejected — some doors are truly non-standard (custom frame dimensions, unusual sizes). The builder is a good fallback.
- **Wizard with fewer steps**: Rejected — even 7 steps is more taps than needed when you can pick a template and go straight to confirm.

---

## Step-by-Step Tasks

### Step 1: Add Standard Door Configurations to door-specs.ts

Add a `STANDARD_DOOR_CONFIGS` constant that maps each door type to its available standard sizes with full pre-filled specs.

**Actions:**

- Add interface `StandardDoorConfig` with fields: `id`, `label` (e.g., "3' × 7'"), `description`, `widthInClear`, `heightInClear`, `specs` (full Partial<DoorSpecs>)
- Add `STANDARD_DOOR_CONFIGS` grouped by type key: `COOLER_SWING`, `FREEZER_SWING`, `COOLER_SLIDER`, `FREEZER_SLIDER`
- Each config pre-fills: `doorCategory`, `temperatureType`, `openingType`, `frameType` (FULL_FRAME default for swing), `gasketType`, `finish` (WPG), `panelInsulated` (true), `insulationType`, `wiper` (true), `highSill` (false), `weatherShield` (false), `thresholdPlate` (false), `label` (true), `quantity` (1)
- Hardware filled via `getStandardHardware()` call for each size
- Heater cable auto-calculated for freezer configs

**Example config:**
```typescript
{
  id: "cooler-swing-3x7",
  label: "3' × 7'",
  description: "DENT D690 hinges, D90 latch, D276 closer, magnetic gasket",
  widthInClear: "36",
  heightInClear: "84",
  specs: {
    doorCategory: "HINGED_COOLER",
    temperatureType: "COOLER",
    openingType: "HINGE",
    frameType: "FULL_FRAME",
    gasketType: "MAGNETIC",
    finish: "WPG",
    insulationType: "EPS",
    // ... hardware from getStandardHardware("HINGED_COOLER", "36")
    // ... all boolean defaults
  }
}
```

**Files affected:**
- `src/lib/door-specs.ts`

---

### Step 2: Rebuild door-creation-flow.tsx

Replace the current ENTRY → BUILDER/TEMPLATE → CONFIRM flow with JOB → TYPE → SIZE → CONFIRM (+ CUSTOM_BUILDER fallback).

**Actions:**

New phase type:
```typescript
type FlowPhase = "JOB" | "TYPE" | "SIZE" | "CONFIRM" | "CUSTOM_BUILDER"
```

New step progress labels: `["Job", "Type", "Size", "Confirm"]`

**Phase JOB:**
- Use `useJobs(searchTerm)` hook to fetch active jobs
- Search input at top (debounced)
- Scrollable list of job cards showing job name + number + client
- Tapping a job stores `jobName` and `jobNumber`, advances to TYPE
- If no jobs exist, show text input for manual job name entry

**Phase TYPE:**
- 2×2 grid of large tappable cards:
  - **Cooler Swing** — blue-tinted card, Thermometer + DoorOpen icons
  - **Freezer Swing** — deeper blue/navy card, Snowflake + DoorOpen icons
  - **Cooler Slider** — blue-tinted card, Thermometer + ArrowLeftRight icons
  - **Freezer Slider** — deeper blue/navy card, Snowflake + ArrowLeftRight icons
- Each card has bold label, subtle icon
- Tapping sets `selectedType` and advances to SIZE
- Back button returns to JOB

**Phase SIZE:**
- Show standard sizes for the selected type from `STANDARD_DOOR_CONFIGS`
- Each size card shows:
  - Size prominently in display font (e.g., `3' × 7'`)
  - Hardware summary line below (e.g., "DENT D690 · D90 · Magnetic")
  - Subtle dimension text (e.g., "36\" × 84\" clear")
- Tapping a size: loads config specs, merges with job info, runs `matchDoorRecipe()` to get components via bulk lookup, advances to CONFIRM
- **"Custom Size"** option at bottom — advances to CUSTOM_BUILDER phase
- Back button returns to TYPE

**Phase CUSTOM_BUILDER:**
- Renders existing `<DoorBuilder>` component
- On complete, goes to CONFIRM with builder specs + recipe-matched components
- Back returns to SIZE

**Phase CONFIRM:**
- Renders `<DoorConfirmation>` (existing component)
- Job name already set from step 1 (no longer editable on this screen — already chosen)
- All specs pre-filled from template
- SM can: adjust dimensions, change frame type, add cutouts, set hinge/slide direction, edit components, add additional items
- Submit creates assembly

**Key implementation detail — recipe loading:**
The `handleSizeSelect(config)` function should:
1. Set specs from `config.specs`
2. Call `matchDoorRecipe(config.specs)` to get the recipe
3. Do the bulk-lookup fetch (same as current `handleBuilderComplete`)
4. Set components from the recipe
5. Advance to CONFIRM

This is the same recipe-loading logic that exists in the current `handleBuilderComplete` — extract it into a shared `loadRecipeComponents(specs)` async function.

**Files affected:**
- `src/components/doors/door-creation-flow.tsx`

---

### Step 3: Update DoorConfirmation — Remove Job Input, Add Quick-Edit Sections

**Actions:**

- Remove `jobName` input from confirmation screen (it's now set in step 1 and displayed read-only)
- Add a "Job" display at top showing selected job name (read-only badge)
- Add prominent "Quick Edit" section at top of confirmation with:
  - Dimensions (width × height × jamb) — inline editable, pre-filled from template
  - Frame type — dropdown, pre-filled
  - Hinge/Slide direction — segmented toggle (Left/Right)
  - Cutouts — expandable section to add/edit cutouts
- Keep existing full spec list below for any other overrides
- Keep existing components section

**Files affected:**
- `src/components/doors/door-confirmation.tsx`

---

### Step 4: Validation & QA

**Actions:**
- Run `npx tsc --noEmit` — no new errors
- Run `npm run ux:tokens` — no new off-brand tokens
- Verify flow: Job → Type → Size → Confirm → Submit works end-to-end
- Verify flow: Job → Type → Size → Custom → Builder → Confirm works
- Verify back navigation works at every step
- Verify specs are correctly pre-filled and editable
- Verify components are auto-populated from recipes
- Verify the created assembly has correct job name, specs, and components

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/assemblies/new/page.tsx` — renders `<DoorCreationFlow>` when step is "door-flow"
- `src/components/doors/door-builder.tsx` — kept as-is, used as custom fallback
- `src/components/doors/door-confirmation.tsx` — modified (step 3)
- `src/lib/door-recipes.ts` — used by recipe matching (no changes)
- `src/hooks/use-jobs.ts` — used for job search (no changes)

### Impact on Existing Workflows

- The old "Door Builder" (guided interview) still exists as the "Custom Size" path — nothing is removed
- The old "Use Template" path (from assembly templates in DB) is replaced by the new built-in standard size configs — cleaner and doesn't require DB templates
- The `DoorConfirmation` component's interface changes (jobName moves from editable prop to read-only display)

---

## Validation Checklist

- [ ] `npx tsc --noEmit` shows only pre-existing e2e error
- [ ] Flow starts at Job selection, not Door Builder vs Template choice
- [ ] Type screen shows 4 options in a 2×2 grid
- [ ] Size screen shows correct standard sizes per type
- [ ] Picking a size auto-fills ALL specs (hardware, gasket, insulation, finish, etc.)
- [ ] Components auto-populate from recipe matching
- [ ] Confirmation screen shows pre-filled specs, all editable
- [ ] Dimensions, frame, cutouts, hinge direction editable on confirmation
- [ ] "Custom Size" option launches existing builder
- [ ] Back navigation works at every step
- [ ] Submit creates assembly with correct specs, job, and components
- [ ] No new UX token violations

---

## Success Criteria

The implementation is complete when:

1. **Standard door creation takes 4 taps** — Job → Type → Size → Submit (assuming no customization needed)
2. **All standard sizes are available** without needing DB templates — configs built into the code
3. **Custom/non-standard doors still supported** via the existing builder as a fallback
4. **Specs are 100% correct** for each standard size (hardware matches `getStandardHardware()` output)

---

## Notes

- The `STANDARD_DOOR_CONFIGS` data structure lives in `door-specs.ts` because it's spec data, not recipe/component data. The recipe matching in `door-recipes.ts` handles the component side.
- Freezer sliders have no recipes defined yet. The size screen should show "Custom" as the only option for freezer sliders until recipes are added.
- Exterior doors (cooler 3'×7' and freezer 3'×7') could be added as sub-options later — for now, the SM can select a standard interior size and toggle `isExterior` on the confirmation screen, which will adjust hardware via `getStandardHardware()`.
- The existing `useAssemblyTemplates()` hook and DB-based templates become unused for doors after this change. They still work for non-door assembly types. Consider removing door templates from the DB in a future cleanup.
