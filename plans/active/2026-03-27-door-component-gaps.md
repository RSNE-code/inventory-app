# Plan: Door Component Gaps — Missing Recipe Items & Generic Panels

**Created:** 2026-03-27
**Status:** Implemented
**Request:** Fix missing components in door recipes (heater wire on freezer sliders, door pull on sliders) and replace branded panel references with a generic panel type.

---

## Overview

### What This Plan Accomplishes

Closes two gaps in door assembly components: (1) Slider recipes are missing door pull and freezer sliders have no heater wire because no freezer slider recipes exist — the matcher always falls through to cooler slider recipes. (2) All recipes reference a specific branded panel ("Insulated Metal Panel (AWIP)-8'-44-4") instead of a generic panel type, preventing brand selection at build time.

### Why This Matters

When a door's component list is incomplete, the shop doesn't know what to pull. Missing heater wire on a freezer slider means the build gets blocked. Hardcoding AWIP panels means every door defaults to one brand even when the job requires Kingspan or MetlSpan.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `engineering-skills` | Architecture for recipe data structure, component resolution via bulk-lookup, generic panel pattern |

### How Skills Shaped the Plan

The engineering skill confirmed the approach: add missing components to existing recipe definitions, create freezer slider recipes (don't exist today), and introduce a generic panel product name that bulk-lookup can resolve. No schema changes needed — components are stored as `(productId, qtyUsed)` references.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `src/lib/door-recipes.ts` | 5 cooler slider recipes, 0 freezer slider recipes. No door pull in any slider recipe. |
| `src/lib/door-specs.ts` | `buildConfig()` generates slider configs for both cooler and freezer |
| `src/components/doors/door-creation-flow.tsx` | `loadRecipeComponents()` resolves recipe names to products via bulk-lookup |
| `src/app/api/products/bulk-lookup/route.ts` | Resolves product names to IDs (exact match, then contains) |
| `prisma/knowify-catalog.json` | Contains "Kason Slider Exterior Pull Handle" product, heater wire products |

### Gaps Being Addressed

1. **No freezer slider recipes**: `matchDoorRecipe()` doesn't differentiate cooler vs freezer sliders — always returns cooler recipe. Freezer sliders get no heater wire components.
2. **No door pull in slider recipes**: "Kason Slider Exterior Pull Handle" exists in catalog but isn't in any slider recipe.
3. **Branded panel in recipes**: All recipes reference `"Insulated Metal Panel (AWIP)-8'-44-4"` — a specific brand, height, width, and thickness. Should be generic until build/checkout.

---

## Proposed Changes

### Summary of Changes

- Add freezer slider recipes (5 sizes: 4x7, 5x7, 6x7, 6x8, 8x8) with heater wire components
- Add "Kason Slider Exterior Pull Handle" to all slider recipes (cooler and freezer)
- Create a generic panel product name pattern for recipes (e.g., "Insulated Metal Panel (Generic)")
- Update recipe matcher to differentiate cooler vs freezer sliders
- Ensure bulk-lookup can resolve the generic panel name

### New Files to Create

None.

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/door-recipes.ts` | Add 5 freezer slider recipes with heater wire; add door pull to all slider recipes; change panel name to generic |
| `src/lib/door-recipes.ts` | Update `matchDoorRecipe()` to differentiate cooler vs freezer sliders |
| `prisma/seed.ts` or via Supabase SQL | Create generic panel product if it doesn't exist |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Create separate freezer slider recipes**: Freezer sliders need heater wire (2 lengths, like swing doors) that cooler sliders don't. Separate recipes are cleaner than conditional logic.

2. **Generic panel name = "Insulated Metal Panel (TBD)"**: Using "TBD" makes it clear the brand hasn't been selected. The bulk-lookup API will need a matching product in the catalog. At build time, the actual branded panel is selected (like BOM panel checkout).

3. **Door pull goes in recipe, not just specs**: The spec sheet shows door pull in hardware, but the component list needs the actual product for material tracking. Recipe includes it so it flows to the assembly's component list.

4. **Heater wire sizes for sliders follow same pattern as swing doors**: Use the `calculateHeaterCable()` function output to determine which heater wire lengths to include per size.

### Alternatives Considered

1. **Conditional logic in recipe matcher instead of separate freezer recipes**: Rejected — recipes are data, not logic. Adding heater wire conditionally would make the recipe system harder to maintain.

2. **Remove panel from recipes entirely**: Rejected — the component list needs to show panels for material tracking. A generic reference is better than no reference.

### Open Questions

None — all resolved:

1. **Generic panel naming**: Use `"4\" IMP"` — matches BOM workflow convention (e.g., `4" IMP — 8'` on photo BOM). Create as a real product for bulk-lookup resolution.

2. **Heater wire lengths for sliders**: Width × 4. So 4' slider = 16', 5' = 20', 6' = 24', 8' = 32', 10' = 40'.

---

## Step-by-Step Tasks

### Step 1: Add Freezer Slider Recipes

Create 5 freezer slider recipes mirroring the cooler slider recipes but adding heater wire components.

**Actions:**
- Add `FREEZER_SLIDER_4x7`, `FREEZER_SLIDER_5x7`, `FREEZER_SLIDER_6x7`, `FREEZER_SLIDER_6x8`, `FREEZER_SLIDER_8x8`
- Each mirrors its cooler counterpart but adds 2 heater wire components (same pattern as freezer swing)
- Heater wire length = width × 4 (4x7→16', 5x7→20', 6x7→24', 6x8→24', 8x8→32')

**Files affected:**
- `src/lib/door-recipes.ts`

---

### Step 2: Add Door Pull to All Slider Recipes

Add "Kason Slider Exterior Pull Handle" (qty: 1) to all 10 slider recipes (5 cooler + 5 freezer).

**Actions:**
- Add `{ name: "Kason Slider Exterior Pull Handle", qty: 1 }` to each slider recipe's components array

**Files affected:**
- `src/lib/door-recipes.ts`

---

### Step 3: Replace Branded Panel with Generic in Recipes

Change all recipe references from `"Insulated Metal Panel (AWIP)-8'-44-4"` to a generic name.

**Actions:**
- Replace all instances of `"Insulated Metal Panel (AWIP)-8'-44-4"` with `'4" IMP'` in recipes — matches BOM workflow naming convention (photo BOM shows panels as `4" IMP — 8'`)
- Create the `4" IMP` product via Supabase SQL (`unitOfMeasure: "panel"`, `tier: "TIER_1"`, no brand specifics)

**Files affected:**
- `src/lib/door-recipes.ts`
- Database (product creation via SQL)

---

### Step 4: Update Recipe Matcher for Freezer Sliders

Update `matchDoorRecipe()` to check temperature type for sliders, returning freezer recipes when appropriate.

**Actions:**
- In the slider matching section, add `isFreezer` check
- Return `FREEZER_SLIDER_*` recipes for freezer sliders, `COOLER_SLIDER_*` for cooler sliders

**Files affected:**
- `src/lib/door-recipes.ts`

---

### Step 5: Validate and QA

**Actions:**
- TypeScript check (`npx tsc --noEmit`)
- Token audit
- Verify: creating a Freezer Slider 5x7 should show heater wire + door pull + generic panel in components
- Verify: creating a Cooler Slider 5x7 should show door pull + generic panel (no heater wire)
- Verify: existing swing door recipes still work correctly

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/doors/door-creation-flow.tsx` — calls `matchDoorRecipe()` and `loadRecipeComponents()`
- `src/app/api/products/bulk-lookup/route.ts` — resolves product names from recipes
- `src/app/assemblies/[id]/page.tsx` — displays assembly components

### Updates Needed for Consistency

- The generic panel product needs to exist in the database for bulk-lookup to resolve it
- Door spec sheet component list should display "Panel (brand at checkout)" or similar for the generic panel

### Impact on Existing Workflows

- **New doors**: Will have complete component lists (heater wire, door pull, generic panel)
- **Existing doors**: Already-created assemblies retain their original components (no retroactive change)
- **BOM workflow**: No impact — BOMs already use the generic panel pattern
- **Build/checkout**: When a door enters production, the generic panel component would need to be resolved to a specific brand — this is a future enhancement (out of scope for this plan)

---

## Validation Checklist

- [ ] Freezer Slider 5x7 recipe includes heater wire components
- [ ] All slider recipes include "Kason Slider Exterior Pull Handle"
- [ ] Panel references use generic name (not AWIP-specific)
- [ ] `matchDoorRecipe()` returns freezer slider recipes for freezer sliders
- [ ] Generic panel product exists and resolves via bulk-lookup
- [ ] Existing swing door recipes unchanged
- [ ] TypeScript compiles cleanly
- [ ] Token audit passes

---

## Success Criteria

1. Creating a freezer slider door shows heater wire in the component list
2. All slider doors show door pull handle in the component list
3. Panel components show a generic reference, not a branded product
4. Recipe matcher correctly differentiates cooler vs freezer sliders

---

## Notes

- Freezer slider recipes don't exist at all today — the matcher silently falls through to cooler slider recipes. This means every freezer slider created to date is missing heater wire. Existing assemblies would need manual component addition.
- The 10x10 freezer slider in `STANDARD_DOOR_CONFIGS` has no recipe match (no 10x10 recipe for either temp). This is an edge case — 10x10 sliders are rare.
- Future: at door build/production start, the generic panel should prompt for brand selection (similar to BOM panel checkout). This is out of scope for this plan.
- Heater wire lengths for sliders are estimated from swing door equivalents. Gabe or the shop team should validate these are correct.
