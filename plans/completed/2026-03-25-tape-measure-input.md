# Plan: Tape Measure Scroll Picker for Dimension Inputs

**Created:** 2026-03-25
**Status:** Implemented
**Request:** Replace plain text dimension inputs with a skeuomorphic tape measure scroll picker that supports inches + fractional increments (down to 1/16")

---

## Overview

### What This Plan Accomplishes

Creates a `TapeMeasureInput` component — a bottom sheet scroll picker styled as a weathered, beat-up Stanley tape measure. When users tap any dimension field, the picker slides up with two scroll wheels: inches (0–120) and fractions (0 to 15/16). Tick marks match real tape measure graduation heights. The picker replaces the current plain text `DimensionInput` across the entire door builder, confirmation page, and anywhere else dimensions are entered.

### Why This Matters

Construction workers think in fractions — 36-3/16", not 36.1875. The current text input forces decimal conversion, which is slow and error-prone on a job site. A tape measure picker is instantly familiar, works great with gloved fingers (large scroll targets), and eliminates conversion math entirely. Plus, it looks incredible — a weathered yellow tape measure with scratches and wear marks. This is the kind of detail that makes the app feel like it was built BY construction workers, FOR construction workers.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Defined the skeuomorphic direction: weathered Stanley tape measure, yellow background, graduated tick marks, red selection line, scratches/wear texture via CSS. Bottom sheet pattern with scroll-snap wheels. |
| `design-inspiration` | Confirmed bottom sheet follows design system: rounded-xl top corners, shadow-brand-md. Done button uses primary CTA spec. Tape measure area is the creative zone — skeuomorphic styling stays inside the picker, doesn't leak into the rest of the app. |

### How Skills Shaped the Plan

The key insight: the bottom sheet container follows the clean design system (rounded-xl, Figtree font, standard button), but the tape measure area INSIDE is a deliberate skeuomorphic break — like opening a tool from your belt. This contrast makes it feel special without violating the app's overall consistency. The weathered texture uses CSS only (gradients, noise, pseudo-elements) — no image assets needed.

---

## Current State

### Relevant Existing Structure

- `src/components/doors/interview-step.tsx` — Contains `DimensionInput` component (plain text input with decimal inputMode)
- `src/components/doors/door-builder.tsx` — Uses `DimensionInput` for width, height, jamb depth, sill height, cutout dimensions (7+ instances)
- `src/components/doors/door-confirmation.tsx` — Uses `EditRow` for inline dimension editing
- `src/components/doors/spec-primitives.tsx` — `SpecRow` with `onEdit` callback for tappable fields
- `src/lib/door-specs.ts` — `parseWidthInches()` function that handles "36", "3'", "36-1/4" formats

### Gaps or Problems Being Addressed

1. **Decimal-only input**: Current `DimensionInput` uses `inputMode="decimal"` — users must convert 3/16" to 0.1875
2. **No fraction support**: The input validates with `parseFloat()` — fractions like "3/16" would fail
3. **Small touch targets**: Plain text input on a phone is hard to use with gloves
4. **No visual connection to the trade**: A plain number input could be any app. A tape measure says "this app was built for us"

---

## Proposed Changes

### Summary of Changes

- Create `src/components/doors/tape-measure-input.tsx` — The scroll picker component (bottom sheet + tape measure wheels)
- Create CSS for tape measure textures in `globals.css` — Weathered yellow, scratches, tick marks
- Update `src/components/doors/interview-step.tsx` — `DimensionInput` opens the tape measure picker instead of plain text input
- Update `src/components/doors/door-confirmation.tsx` — Dimension edit fields use the tape measure picker
- Update `src/lib/door-specs.ts` — Add `formatFractionalInches()` and `parseFractionalInches()` helpers

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `src/components/doors/tape-measure-input.tsx` | The tape measure bottom sheet scroll picker component |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `src/app/globals.css` | Add tape measure texture CSS (weathered yellow gradient, scratch overlay, tick mark styles) |
| `src/components/doors/interview-step.tsx` | `DimensionInput` opens tape measure picker on tap |
| `src/components/doors/door-confirmation.tsx` | Dimension SpecRow edit mode uses tape measure picker |
| `src/lib/door-specs.ts` | Add fractional inch formatting/parsing utilities |

---

## Design Decisions

### Key Decisions Made

1. **Bottom sheet, not inline**: The tape measure picker slides up as a bottom sheet (half-screen) when a dimension field is tapped. The form stays visible behind a dim overlay. This is the standard iOS picker pattern — familiar and thumb-friendly.

2. **Two scroll wheels**: Left wheel = whole inches (0–120), right wheel = fractions (0, 1/16, 1/8, 3/16, 1/4, 5/16, 3/8, 7/16, 1/2, 9/16, 5/8, 11/16, 3/4, 13/16, 7/8, 15/16). Total 17 fraction options. Scroll-snap for crisp stops.

3. **Skeuomorphic tape measure styling**:
   - **Background**: Weathered yellow (#FFD54F → #FFC107 gradient) with subtle noise texture overlay
   - **Tick marks**: SVG or div-based, graduated heights — tallest for inches (16px), medium for 1/2 and 1/4 (12px, 10px), shorter for 1/8 (7px), shortest for 1/16 (4px). Black tick lines, 1-2px wide.
   - **Selection indicator**: Red/orange line across the center (like the hook end of a tape measure), with a subtle glow
   - **Weathering**: CSS pseudo-elements with diagonal scratch lines (repeating-linear-gradient at angles), slight opacity variation, worn edge effect on the container borders
   - **Numbers**: Bold, black, slightly condensed — like printed tape measure numbers. On the inch wheel, numbers appear at every inch mark.

4. **Value format**: Stored as string like `"36-3/16"` or `"36"` (no fraction if even inch). Display shows `36-3/16"` with the inch mark. Parsing converts to decimal for any math operations.

5. **Reusable outside doors**: The component accepts `min`, `max`, `value`, `onChange` props. It can be used for any dimension input in the app (panel sizes, inventory item dimensions, etc.).

6. **Haptic feedback**: On Capacitor (native), trigger a light haptic on each scroll snap stop — feels like clicking a ratchet.

### Alternatives Considered

- **Two plain inputs (inches + fraction dropdown)**: Simpler but boring. No visual impact. Dropdown with 17 fraction options is clunky.
- **Single text input with fraction parsing**: Already exists (sort of). Doesn't solve the conversion problem — users still have to know "3/16" format.
- **Horizontal tape measure scroll**: Cool but takes too much horizontal space and doesn't work for the fraction component.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Add Fractional Inch Utilities

Add helpers to `door-specs.ts` for formatting and parsing fractional inches.

**Actions:**

- Add `FRACTIONS` constant: array of `{ label: string, decimal: number }` for all 17 fraction values (0, 1/16, 1/8, ... 15/16)
- Add `formatFractionalInches(inches: number | string): string` — converts `36.1875` → `"36-3/16"`, `36` → `"36"`, `36.5` → `"36-1/2"`
- Add `parseFractionalInches(value: string): number` — converts `"36-3/16"` → `36.1875`, `"36"` → `36`, handles existing decimal strings too
- Add `splitInchesAndFraction(value: string): { inches: number, fractionIndex: number }` — splits for the picker wheels

**Files affected:**
- `src/lib/door-specs.ts`

---

### Step 2: Create Tape Measure CSS

Add the weathered tape measure texture styles to globals.css.

**Actions:**

- Add `.tape-measure-bg` class: yellow gradient background, noise overlay via pseudo-element, scratch marks via repeating-linear-gradient
- Add `.tape-measure-tick` classes for different graduation heights (`.tick-inch`, `.tick-half`, `.tick-quarter`, `.tick-eighth`, `.tick-sixteenth`)
- Add `.tape-measure-selection` class: red/orange center line with glow
- Add `.tape-measure-worn-edge` class: slightly rounded, darkened edge effect
- Add keyframe for subtle scroll momentum feel

**Files affected:**
- `src/app/globals.css`

---

### Step 3: Create TapeMeasureInput Component

Build the main component: bottom sheet with scroll-snap wheels styled as a tape measure.

**Actions:**

Create `src/components/doors/tape-measure-input.tsx` with:

**Props interface:**
```typescript
interface TapeMeasureInputProps {
  value: string              // Current value like "36-3/16" or "36"
  onChange: (value: string) => void  // Called with formatted string
  label?: string             // Field label shown in the sheet header
  min?: number               // Minimum inches (default 0)
  max?: number               // Maximum inches (default 120)
  open: boolean              // Controlled open state
  onOpenChange: (open: boolean) => void
}
```

**Component structure:**
1. **Overlay**: Semi-transparent black backdrop, tappable to dismiss
2. **Bottom sheet**: Slides up with `animate-in slide-in-from-bottom duration-300`. Rounded-xl top corners. White background for the header/footer, tape measure yellow for the picker area.
3. **Header**: Label text (e.g., "Width (in clear)") + current value display in large bold text
4. **Tape measure picker area**:
   - Two side-by-side scroll containers with `snap-y snap-mandatory`
   - Left: Inches wheel (each item is a row with the number + inch tick mark graphic)
   - Right: Fractions wheel (each item shows the fraction + graduated tick mark)
   - Center selection band: red/orange horizontal line across both wheels with subtle glow
   - Weathered yellow background with CSS scratch texture
   - Each scroll item is 48px tall (above 44px minimum) for easy gloved tapping
5. **Footer**: "Done" button (full-width, brand-orange, h-12) + "Clear" ghost button

**Scroll behavior:**
- `overflow-y: auto; scroll-snap-type: y mandatory` on each wheel
- Each item: `scroll-snap-align: center; height: 48px`
- On mount, scroll to current value position
- On scroll end, read the snapped position and update value
- Use `IntersectionObserver` or scroll position math to detect selected item

**Tape measure visual details:**
- Yellow background: `linear-gradient(180deg, #FFD54F 0%, #FFC107 50%, #FFB300 100%)`
- Scratches: `::after` pseudo-element with `repeating-linear-gradient(35deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)`
- Tick marks rendered as divs inside each scroll item:
  - Inch (whole number): 20px wide, 2px thick, black
  - 1/2: 16px wide
  - 1/4: 12px wide
  - 1/8: 8px wide
  - 1/16: 5px wide
- Numbers on inch wheel: bold, black, tabular-nums, right-aligned next to tick
- Fractions on fraction wheel: displayed as actual fraction text ("3/16", "1/4") left of tick

**Files affected:**
- `src/components/doors/tape-measure-input.tsx` (new)

---

### Step 4: Wire Into DimensionInput

Update the existing `DimensionInput` in interview-step.tsx to open the tape measure picker.

**Actions:**

- Import `TapeMeasureInput` from `./tape-measure-input`
- Add `const [pickerOpen, setPickerOpen] = useState(false)` state
- Replace the plain `<input type="text">` with a tappable display that shows the formatted value and opens the picker on tap
- Keep the "Next" button behavior — picker's Done button calls `onSubmit`
- The DimensionInput still accepts `value` and `onChange` — the tape measure picker just provides a better input method
- Fallback: keep the text input available as a small link ("type manually") below the picker trigger for edge cases

**Files affected:**
- `src/components/doors/interview-step.tsx`

---

### Step 5: Wire Into Confirmation Page

Update dimension editing in door-confirmation.tsx to use the tape measure picker.

**Actions:**

- Import `TapeMeasureInput`
- Add `const [measureField, setMeasureField] = useState<string | null>(null)` for tracking which dimension field is being edited
- When a dimension SpecRow is tapped (widthInClear, heightInClear, jambDepth, wallThickness), open the tape measure picker instead of the inline text EditRow
- On picker Done, update the spec value and close

**Files affected:**
- `src/components/doors/door-confirmation.tsx`

---

### Step 6: QA and Permutation Testing

**Actions:**

- `npx tsc --noEmit` — zero errors
- `npx tsx scripts/token-audit.ts` — zero warnings
- Test: Open picker for width → scroll to 36 inches, 3/16 fraction → value shows "36-3/16"
- Test: Open picker for jamb depth → scroll to 4 inches, 0 fraction → value shows "4"
- Test: Pre-populated value (template 36") → picker opens scrolled to 36, 0
- Test: Picker dismissal (tap overlay, tap Done, tap Clear)
- Test: Fraction wheel shows all 17 values with correct tick heights
- Test: 375px mobile — bottom sheet doesn't overflow, scroll wheels are thumb-friendly
- Test: Value format compatibility — `parseWidthInches()` in door-specs.ts handles "36-3/16" format

**Files affected:**
- All modified files

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/doors/door-builder.tsx` — Uses `DimensionInput` 7 times (inherits the new picker automatically)
- `src/components/doors/door-creation-flow.tsx` — Wraps the builder flow
- `src/lib/door-specs.ts` — `parseWidthInches()` already handles feet-inches and fractions, but needs to handle the new "36-3/16" hyphenated format
- `src/lib/door-recipes.ts` — `parseWidthToInches()` — same update needed

### Updates Needed for Consistency

- Both `parseWidthInches()` (door-specs.ts) and `parseWidthToInches()` (door-recipes.ts) need to handle "36-3/16" format

### Impact on Existing Workflows

- Door builder: DimensionInput automatically uses the picker — all 7 dimension steps get it for free
- Door confirmation: Dimension edits use the picker instead of plain text inline edit
- Existing stored values ("36", "48", "84") continue to work — the picker just adds fraction precision
- Template pre-populated values scroll the picker to the correct position on open

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] Token audit: 0 errors, 0 warnings
- [ ] Tape measure picker opens from DimensionInput in door builder
- [ ] Tape measure picker opens from dimension SpecRow in confirmation page
- [ ] Inches wheel scrolls 0–120 with snap stops
- [ ] Fraction wheel shows all 17 values (0 through 15/16)
- [ ] Tick marks have graduated heights (inch > 1/2 > 1/4 > 1/8 > 1/16)
- [ ] Weathered yellow texture visible with scratch overlay
- [ ] Red selection line visible at center
- [ ] Value formats correctly: "36-3/16", "36-1/2", "36" (no fraction for whole numbers)
- [ ] `parseWidthInches()` handles "36-3/16" format
- [ ] Done button closes picker and updates value
- [ ] Overlay tap dismisses picker
- [ ] Pre-populated values scroll picker to correct position
- [ ] Works at 375px — no overflow, thumb-friendly scroll

---

## Success Criteria

The implementation is complete when:

1. Every dimension input in the door module opens the tape measure scroll picker
2. Users can select any measurement from 0" to 120" in 1/16" increments without typing or decimal conversion
3. The picker looks like an actual weathered tape measure — yellow background, graduated tick marks, scratch texture, red selection line
4. Stored values use fractional format ("36-3/16") and all existing parsers handle it correctly
5. The component is reusable — can be used anywhere dimensions are needed outside the door module

---

## Notes

- **Haptic feedback**: If Capacitor's Haptics plugin is available, fire `Haptics.impact({ style: ImpactStyle.Light })` on each scroll snap. This makes the picker feel physical — like clicking stops on a ratchet. Degrade gracefully on web (no haptics, just visual).
- **Accessibility**: The picker should have aria-label on each wheel, and the "type manually" fallback link ensures keyboard users can still enter values.
- **Future**: This component could be extended with a "feet + inches" mode for larger measurements (room dimensions, panel lengths) where you'd want a 3-wheel picker: feet | inches | fraction.
- **Performance**: The inch wheel has 121 items (0–120). Use virtualized rendering if scroll performance is choppy — but 121 items is small enough that it should be fine without virtualization.
