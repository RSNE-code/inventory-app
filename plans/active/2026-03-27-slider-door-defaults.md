# Plan: Slider Door Sheet Defaults & Hardware Improvements

**Created:** 2026-03-27
**Status:** Implemented
**Request:** Fix slider door defaults (insulation, hardware, tongue/strike separation) in the door creation flow.

---

## Overview

### What This Plan Accomplishes

Five targeted fixes to the slider door sheet: correct the insulation default from EPS to IMP, split tongue and strike into separate hardware cards, add Door Pull and Track to the hardware section with proper defaults, and pre-populate size-specific sliding hardware (SLD track model) based on door dimensions.

### Why This Matters

The door sheet is the source of truth for what the shop builds. Wrong defaults (EPS instead of IMP insulation) waste time on corrections. Missing hardware fields (door pull, track) mean the foreman has to look them up separately instead of having them pre-populated on the door spec sheet.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Confirmed: use existing HwBox card pattern for new hardware items. No design innovation — consistency is the goal. |

### How Skills Shaped the Plan

The frontend skill confirmed these are form/data changes within the existing door builder/confirmation UI pattern. No new components needed — split existing combined cards and add new cards using the same `HwBox` component and `OptionPicker` integration.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `src/lib/door-specs.ts` | `buildConfig()` sets `insulationType: "EPS"` for cooler sliders (line 543) |
| `src/lib/door-recipes.ts` | Slider recipes have SLD track model per size but no door pull |
| `src/lib/door-hardware-catalog.ts` | `SLIDER_STRIKE_TONGUE` combines tongue + strike in one array |
| `src/components/doors/door-confirmation.tsx` | "Strike / Tongue" is a single `HwBox` card (line 497) |

### Gaps Being Addressed

1. **Insulation default wrong**: `buildConfig()` gives cooler sliders `insulationType: "EPS"` but should be `"IMP"`. Confirmation picker already shows IMP-only for sliders — the default just doesn't match.
2. **Tongue and Strike combined**: Single "Strike / Tongue" card shows both parts together. They're separate components (STRIKER and Slider Tongue) and should have separate cards.
3. **No Door Pull field**: `specs.doorPull` exists on the interface but isn't pre-populated. The "Sliding Hardware" HwBox card conflates SLD track with door pull.
4. **No Track card**: Track model (SLD 48/60/72/96) is buried in the "Sliding Hardware" picker. Should be its own card with size-based default.
5. **No size-specific defaults**: `getStandardHardware()` returns `{}` for sliders. Should return track model based on door width.

---

## Proposed Changes

### Summary of Changes

- Fix `buildConfig()` to default slider insulation to `"IMP"` instead of `"EPS"`
- Add `getSliderHardwareDefaults()` function to return size-specific track model
- Split `SLIDER_STRIKE_TONGUE` into separate `SLIDER_STRIKES` and `SLIDER_TONGUES` arrays
- Add `SLIDER_DOOR_PULLS` array to hardware catalog
- Restructure slider hardware section: 4 cards (Track, Roller, Strike, Tongue) + Door Pull
- Add `doorPull` default to "Kason Slider Pull" in slider configs
- Pre-populate `trackType` with correct SLD model based on door width

### New Files to Create

None.

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/door-specs.ts` | Fix insulation default for sliders to IMP; add slider hardware defaults function |
| `src/lib/door-hardware-catalog.ts` | Split SLIDER_STRIKE_TONGUE into SLIDER_STRIKES + SLIDER_TONGUES; add SLIDER_DOOR_PULLS |
| `src/components/doors/door-confirmation.tsx` | Restructure slider hardware to 5 separate cards; add pickers for new fields |
| `src/lib/door-recipes.ts` | No changes needed — recipes already have correct per-size components |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **IMP default for ALL sliders**: Both cooler and freezer sliders use IMP insulation, not EPS or PIR. This matches the confirmation picker which already restricts sliders to IMP.

2. **Track card gets auto-populated per size**: SLD 48 for 4' width, SLD 60 for 5', SLD 72 for 6', SLD 96 for 8', SLD 120 for 10'. This is already in recipes — we just surface it in the hardware cards.

3. **Door Pull defaults to "Kason Slider Pull"**: Abbreviated from "Kason Slider Exterior Pull Handle" to fit card display. Field stored in `specs.doorPull`.

4. **Track defaults to blank**: Per Gabe's direction — user selects. However, if a standard size is chosen, auto-populate from the size mapping.

5. **Strike and Tongue are separate fields**: Need two new spec fields or repurpose existing. Current `specs.trackType` is overloaded (stores tongue). Plan: use `specs.strikeModel` (new) and `specs.tongueModel` (rename from trackType usage) plus `specs.trackModel` for the SLD track.

### Alternatives Considered

1. **Keep tongue/strike combined**: Rejected — Gabe explicitly asked for separation. They're different physical parts.
2. **Auto-populate door pull from recipe**: Rejected — door pull isn't in recipes and is a hardware spec, not a component.

### Open Questions

None — all requirements are clear from Gabe's feedback.

---

## Step-by-Step Tasks

### Step 1: Update Hardware Catalog — Split Tongue/Strike, Add Door Pulls

Split the combined `SLIDER_STRIKE_TONGUE` array into separate arrays and add door pull options.

**Actions:**
- Replace `SLIDER_STRIKE_TONGUE` with `SLIDER_STRIKES` and `SLIDER_TONGUES`
- Add `SLIDER_DOOR_PULLS` array with "Kason Slider Pull" as default option
- Add `SLIDER_TRACKS` array (alias for existing `SLIDER_HARDWARE` which contains SLD models)

**Files affected:**
- `src/lib/door-hardware-catalog.ts`

---

### Step 2: Fix Insulation Default and Add Slider Hardware Defaults

Change `buildConfig()` to use IMP for sliders. Add a function to return size-specific slider hardware defaults.

**Actions:**
- In `buildConfig()`: when `opening === "SLIDE"`, set `insulationType: "IMP"` regardless of temperature
- Add `getSliderHardwareDefaults(widthInClear: string)` that returns `{ trackModel, doorPull }` based on width
- Wire defaults into `buildConfig()` for slider configs so `specs.trackModel` and `specs.doorPull` are pre-set

**Files affected:**
- `src/lib/door-specs.ts`

---

### Step 3: Restructure Slider Hardware Cards in Confirmation

Replace the current 3-card slider hardware layout with 5 separate cards: Track, Door Pull, Roller, Strike, Tongue.

**Current layout:**
```
[Sliding Hardware (SLD track)]
[Roller] [Strike / Tongue]
```

**New layout:**
```
[Track (SLD model)] [Door Pull]
[Roller] [Strike]
[Tongue]
```

**Actions:**
- Split "Strike / Tongue" HwBox into two separate HwBox cards
- Rename "Sliding Hardware" to "Track" — shows `specs.trackModel`
- Add "Door Pull" HwBox — shows `specs.doorPull`, editable
- Update picker configs for each new card
- Add new picker cases: `sliderTrack`, `sliderDoorPull`, `sliderStrike`, `sliderTongue`

**Files affected:**
- `src/components/doors/door-confirmation.tsx`

---

### Step 4: Update Picker Handlers for New Fields

Wire up the new OptionPicker handlers for track, door pull, strike, and tongue so edits persist to specs.

**Actions:**
- Add spec fields: `trackModel`, `strikeModel`, `tongueModel` (keep `doorPull` as-is)
- Map picker selections to `onSpecChange` calls
- Ensure bidirectional flow: specs → display, picker → specs

**Files affected:**
- `src/components/doors/door-confirmation.tsx`
- `src/lib/door-specs.ts` (add fields to DoorSpecs interface)

---

### Step 5: Validate and QA

**Actions:**
- TypeScript check (`npx tsc --noEmit`)
- Token audit (`npx tsx scripts/token-audit.ts`)
- Mentally verify: creating a Cooler Slider 5x7 should show insulation=IMP, track=SLD 60, door pull=Kason Slider Pull, separate strike and tongue cards

**Files affected:** None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/doors/door-builder.tsx` — doesn't need changes (slider builder skips hardware step; hardware is on confirmation only)
- `src/lib/door-recipes.ts` — recipes already have per-size track models as components; no changes needed
- `src/components/doors/door-confirmation.tsx` — primary UI change

### Updates Needed for Consistency

- If `trackType` spec field is renamed or repurposed, grep for all usages and update

### Impact on Existing Workflows

- **New doors**: Will show correct defaults immediately
- **Existing doors**: Specs already saved won't change. If opened for editing, new fields (trackModel, strikeModel, tongueModel) will be null — confirmation should handle gracefully with "Not set" display
- **Recipes/Components**: No impact — component list flows from recipes, not from hardware cards

---

## Validation Checklist

- [ ] Cooler Slider insulation defaults to IMP (not EPS)
- [ ] Freezer Slider insulation defaults to IMP (not PIR)
- [ ] Track card shows correct SLD model per size (SLD 60 for 5', etc.)
- [ ] Door Pull card shows "Kason Slider Pull" by default
- [ ] Strike and Tongue are separate cards
- [ ] All cards are editable via OptionPicker
- [ ] Existing swing door hardware is unaffected
- [ ] TypeScript compiles cleanly
- [ ] Token audit passes

---

## Success Criteria

1. Slider door sheets show IMP insulation by default for all sizes
2. Hardware section has 5 separate cards: Track, Door Pull, Roller, Strike, Tongue
3. Track auto-populates with the correct SLD model for the selected door size
4. Door Pull defaults to "Kason Slider Pull"
5. All hardware cards are individually editable

---

## Notes

- The `SLIDER_HARDWARE` array in the catalog is really the track models (SLD 48/60/72/96/120). Renaming to `SLIDER_TRACKS` for clarity.
- Door recipes already have the correct per-size SLD track, striker, and tongue as components. The hardware cards are for the spec sheet display — they don't affect the component/material list.
- Future: freezer slider recipes don't exist in `door-recipes.ts`. The matcher falls through to cooler slider recipes. This is a separate issue from the defaults fix.
