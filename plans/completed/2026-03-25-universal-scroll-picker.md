# Plan: Universal Scroll Picker for All Door Sheet Fields

**Created:** 2026-03-25
**Status:** Implemented
**Request:** Extend the bottom sheet scroll picker to ALL editable fields on the door confirmation page, with field-specific wheel configurations for swing and slider doors

---

## Overview

### What This Plan Accomplishes

Creates an `OptionPicker` component — a generic bottom sheet scroll picker that works for any option list (not just dimensions). Every editable field on the door confirmation page gets a scroll picker: Temperature, Frame Type, Hinge/Slide Side, Finish, Insulation, Gasket, Window (3-wheel), and Hardware (2-wheel per item with manufacturer + part). Opening Type becomes static. Job badge shows Job # prominently.

### Why This Matters

The tape measure picker proved that scroll pickers are the right input pattern for construction workers on job sites. Extending this to ALL fields eliminates keyboard typing entirely — the entire door sheet can be completed by scrolling and tapping. No typing, no dropdowns, no confusion.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Defined picker variants: single-wheel, multi-wheel, wheel-with-other. 48px items, brand-blue highlight on selection, same bottom sheet animation as tape measure. |
| `design-inspiration` | Confirmed: white background inside picker (not yellow — that's tape measure only), Figtree font, p-5 spacing, shadow-brand-md on sheet. Clean and fast for short option lists. |

### How Skills Shaped the Plan

The picker uses the same bottom sheet container as the tape measure (shared animation, overlay, Done button) but with a clean white interior for option lists. The scroll-snap wheel pattern works universally — even for 2-3 option lists, the physical scroll gesture feels better on a job site than tiny radio buttons.

---

## Current State

### Relevant Existing Structure

- `src/components/doors/tape-measure-input.tsx` — Bottom sheet scroll picker for dimensions (inches + fractions)
- `src/components/doors/door-confirmation.tsx` — Uses tape measure for dimensions, inline toggles/edits for other fields
- `src/components/doors/door-builder.tsx` — Has `HINGE_OPTIONS`, `LATCH_OPTIONS`, `CLOSER_OPTIONS`, `INSIDE_RELEASE_OPTIONS` arrays
- `src/components/doors/door-creation-flow.tsx` — Tracks `jobNumber` but doesn't pass it to DoorConfirmation

### Gaps or Problems Being Addressed

1. Most fields use inline tap-to-toggle (Temperature, Frame Type, Gasket) — small targets, no visual confirmation
2. Hardware fields use inline text edit — user types free text instead of picking from known parts
3. Window has no size selection on confirmation page
4. Opening Type is editable (shouldn't be — it's structural)
5. Job badge shows name only, not the Job # which is the primary reference for the team

---

## Proposed Changes

### Summary of Changes

- Create `src/components/doors/option-picker.tsx` — Generic bottom sheet scroll picker for option lists
- Create `src/lib/door-hardware-catalog.ts` — Hardware options data organized by category and door type
- Rewrite all SpecRow `onEdit` handlers in `door-confirmation.tsx` to open option pickers
- Fix job badge to show Job # + Job Name
- Make Opening Type static (remove onEdit)
- Pass `jobNumber` from creation flow to confirmation

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `src/components/doors/option-picker.tsx` | Generic scroll picker bottom sheet for option lists |
| `src/lib/door-hardware-catalog.ts` | Centralized hardware options by category and door type |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `src/components/doors/door-confirmation.tsx` | All fields use OptionPicker; Opening Type static; job badge shows #; add jobNumber prop |
| `src/components/doors/door-creation-flow.tsx` | Pass jobNumber to DoorConfirmation |

---

## Design Decisions

### Key Decisions Made

1. **One OptionPicker component, multiple configurations**: Rather than N different pickers, one component accepts `wheels: { label, options }[]` — single wheel for Temperature (2 options), dual wheel for Hardware (manufacturer + part), triple wheel for Window (height + width + heated).

2. **"Other" option with manual input**: For Finish and Slider Insulation, the last option is "Other" which reveals a text input inside the picker. User scrolls to "Other", types custom value, hits Done.

3. **Hardware catalog as separate data file**: Hardware options organized by `{ swingHinges, swingLatches, swingClosers, swingRelease, sliderHardware, sliderRollers, sliderStrikeTongue }` with manufacturer + part pairs. This data file can grow as new parts are added without touching UI code.

4. **Opening Type is static**: It's set during door type selection and shouldn't change on the confirmation page. Changing it would invalidate the entire spec.

5. **Shared bottom sheet infrastructure**: OptionPicker uses `createPortal(document.body)` and the same CSS animations as the tape measure picker. Same overlay, same Done button pattern, same 48px item height.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Create Hardware Catalog Data

Create `src/lib/door-hardware-catalog.ts` with all hardware options organized by category.

**Actions:**

- Define manufacturer list: `["DENT", "Kason"]`
- Define parts by category:
  - **Swing Hinges**: D690, D690CS (DENT); K1277 Cam-lift, K1248 Spring, K1245 (Kason)
  - **Swing Latches**: D90 (DENT); K56 Body Chrome, K55 Complete (Kason)
  - **Swing Closers**: D276 (DENT); K1094 (Kason); None
  - **Swing Inside Release**: K481 Safety Glow (Kason); Glow Push Panel; None
  - **Slider Hardware**: SLD 48, SLD 60, SLD 72, SLD 96, SLD 120 (Kason)
  - **Slider Rollers**: HD Floor Roller (Kason)
  - **Slider Strike/Tongue**: Slider Tongue Non-Padlock, Slider Strike (Kason)
- Export `getPartsForManufacturer(category, manufacturer)` helper
- Export `HARDWARE_MANUFACTURERS` constant

**Files affected:**
- `src/lib/door-hardware-catalog.ts` (new)

---

### Step 2: Create OptionPicker Component

Create the generic scroll picker bottom sheet.

**Actions:**

Create `src/components/doors/option-picker.tsx` with:

**Props:**
```typescript
interface OptionPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  wheels: {
    label: string
    options: { label: string; value: string }[]
    selectedValue: string
  }[]
  onDone: (values: string[]) => void
  /** If true, last option in first wheel shows a text input */
  allowOther?: boolean
  otherValue?: string
  onOtherChange?: (v: string) => void
}
```

**Component structure:**
- Same portal-based bottom sheet as tape measure (createPortal to body)
- Header: label + current selection display
- Wheel area: white background, scroll-snap wheels side by side
- Each wheel: vertical scroll list with 48px items, scroll-snap-align center
- Selected item: `bg-brand-blue/10 text-brand-blue font-bold` highlight band at center
- Selection indicator: horizontal line at center (brand-blue, not red like tape measure)
- "Other" mode: when scrolled to "Other" option, a text input appears below the wheels
- Footer: Clear + Done button (brand-orange, same as tape measure)
- Same animations: `animate-tape-open`, `animate-tape-overlay`

**Files affected:**
- `src/components/doors/option-picker.tsx` (new)

---

### Step 3: Update Job Badge and Props

Show Job # prominently in the job badge. Add jobNumber prop to DoorConfirmation.

**Actions:**

- Add `jobNumber: string` to DoorConfirmationProps interface
- Update job badge to show: `Job #1234 · Job Name` format (number first, bold, then name)
- Update DoorCreationFlow to pass `jobNumber` prop

**Files affected:**
- `src/components/doors/door-confirmation.tsx`
- `src/components/doors/door-creation-flow.tsx`

---

### Step 4: Wire All Swing Door Fields to OptionPicker

Replace all inline toggles/edits with OptionPicker instances.

**Actions:**

Add state: `const [activePicker, setActivePicker] = useState<string | null>(null)`

Wire each field:

- **Temperature**: Single wheel `[{label: "Cooler", value: "COOLER"}, {label: "Freezer", value: "FREEZER"}]`
- **Opening Type**: REMOVE onEdit — make static (no pencil icon)
- **Frame Type**: Single wheel `[Full Frame, Face Frame, Bally Type]`
- **Hinge Side**: Single wheel `[Right, Left]`
- **Finish**: Single wheel `[WPG, SS, Gray, Other]` with allowOther=true
- **Insulation Type**: Single wheel `[EPS, PIR]`
- **Gasket Type**: Single wheel `[Magnetic, Neoprene]`
- **Window**: 3-wheel picker: Height `[14]`, Width `[14, 24]`, Heated `[Non-Heated, Heated]` (plus "None" option to clear)
- **Heater Size**: Keep tape measure picker (it's a dimension)
- **Heater Location**: Keep inline text edit (free text field)
- **Hardware Hinges**: 2-wheel: Manufacturer `[DENT, Kason]` + Part (filtered by manufacturer)
- **Hardware Latch**: 2-wheel: Manufacturer + Part
- **Hardware Closer**: 2-wheel: Manufacturer + Part + None
- **Hardware Inside Release**: 2-wheel: Manufacturer + Part + None

Each SpecRow `onEdit` sets `activePicker` to the field name. One OptionPicker renders conditionally based on `activePicker`, configured per field.

**Files affected:**
- `src/components/doors/door-confirmation.tsx`

---

### Step 5: Wire Slider-Specific Fields

For slider doors, adjust the picker options.

**Actions:**

- **Slide Side**: Single wheel `[Right, Left]`
- **Insulation Type**: Single wheel `[IMP, Other]` with allowOther=true, defaults to IMP
- **Slider Hardware**: 2-wheel pickers for each category:
  - Sliding Hardware: Manufacturer + Part (SLD 48, SLD 60, etc.)
  - Roller: Manufacturer + Part (Kason HD Floor Roller)
  - Strike/Tongue: Manufacturer + Part (Kason Slider Tongue, Kason Slider Strike)

These are conditionally rendered based on `isSlider` in the Hardware section.

**Files affected:**
- `src/components/doors/door-confirmation.tsx`

---

### Step 6: QA and Validation

**Actions:**

- `npx tsc --noEmit` — zero errors
- `npx tsx scripts/token-audit.ts` — zero warnings
- Test: Every field on Cooler Swing 3×7 confirmation opens a picker
- Test: Every field on Freezer Exterior 3×7 confirmation opens a picker
- Test: Cooler Slider 4×7 — slider-specific hardware pickers work
- Test: "Other" option on Finish — reveals text input, value saves
- Test: Window picker — 3 wheels, selection updates correctly
- Test: Hardware picker — manufacturer change filters part list
- Test: Job badge shows "#1234 · Job Name" format
- Test: Opening Type is NOT tappable (static)

**Files affected:**
- All modified files

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/doors/door-builder.tsx` — Has hardware option arrays (will be replaced by catalog import in future, but not in this plan — builder uses dropdowns which work fine)
- `src/components/doors/door-creation-flow.tsx` — Passes props to DoorConfirmation

### Updates Needed for Consistency

- The door builder still uses `<select>` dropdowns for hardware — that's fine for the builder flow where you're stepping through one field at a time. The OptionPicker is for the confirmation page where all fields are visible and editable.

### Impact on Existing Workflows

- Door creation flow: Same workflow, but the confirmation page is now fully scroll-picker based instead of mixed inline edits
- No API changes, no data model changes
- All values are stored the same way (strings in the specs object)

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] Token audit: 0 errors, 0 warnings
- [ ] Opening Type is static (no edit affordance)
- [ ] Job badge shows Job # first, then Job Name
- [ ] Temperature picker: Cooler/Freezer wheel
- [ ] Frame Type picker: 3 options
- [ ] Hinge/Slide Side picker: Right/Left
- [ ] Finish picker: WPG/SS/Gray/Other with manual input
- [ ] Insulation picker: EPS/PIR (swing) or IMP/Other (slider)
- [ ] Gasket picker: Magnetic/Neoprene
- [ ] Window picker: 3 wheels (height/width/heated)
- [ ] Hardware pickers: Manufacturer + Part for each category
- [ ] All pickers use portal (no gray-screen bug)
- [ ] All pickers have Done button and overlay dismiss

---

## Success Criteria

The implementation is complete when:

1. Every field on the door confirmation page (except Opening Type) opens a scroll picker bottom sheet — zero inline text edits remain for enum/option fields
2. The picker pattern is consistent: same bottom sheet animation, same Done button, same 48px item height, same overlay
3. Hardware pickers show manufacturer + part as separate wheels with the part list filtered by manufacturer
4. Job badge shows Job # prominently before Job Name
5. "Other" option works for Finish and Slider Insulation — reveals text input, saves custom value

---

## Notes

- **Future improvement**: The door builder's hardware selection (Step SWING_HARDWARE) still uses `<select>` dropdowns. These could be upgraded to OptionPicker in a future pass, but the builder flow works differently (one field at a time) so it's lower priority.
- **Haptic feedback**: Like the tape measure, fire light haptics on scroll snap if Capacitor is available.
- **Window "None" option**: The window picker should have a "None" option at the top of the first wheel. Selecting it clears windowSize and windowHeated.
- **Hardware "None" option**: Closer and Inside Release have "None" as a valid option. This should be the first item in the part wheel.
