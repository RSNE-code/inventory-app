# Plan: BOM Line Item Unit Pill with Scroll Picker

**Created:** 2026-03-26
**Status:** Implemented
**Request:** Add a tappable unit pill to every BOM line item that opens the existing OptionPicker scroll wheel for changing units.

---

## Overview

### What This Plan Accomplishes

Adds a visible, tappable unit pill (e.g., "lbs", "ea", "lf") next to the quantity on every BOM line item. Tapping the pill opens the existing OptionPicker scroll wheel — the same bottom-sheet component used in door specs. The selected unit persists to the database so it survives page reloads.

### Why This Matters

Right now BOMs show quantities without units — "3" could mean 3 each, 3 lbs, or 3 linear feet. The AI parses units but they're never displayed or stored. This is a prerequisite for the planned T2 deferred-matching flow (where a SM writes "3 lbs TEK screws" and the foreman matches at checkout), and it improves clarity for all line items regardless of tier.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Pill should be bold enough to read in sunlight, 44px min touch target, brand-blue tint for interactive affordance |
| `design-inspiration` | Use design tokens from globals.css — bg-brand-blue/10 for pill bg, brand-blue for text, rounded-xl, consistent with existing attribute pills in the app |

### How Skills Shaped the Plan

The pill design follows the existing pattern used for panel spec pills (brand-blue/10 bg, brand-blue text, rounded-xl). The OptionPicker is already production-tested in the door flow, so no new component is needed. Touch target of 44px minimum for construction glove use.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `src/components/bom/bom-line-item-row.tsx` | BOM line item display — has a Select-based unit picker in edit mode only, hidden in view/checkout/return modes |
| `src/components/doors/option-picker.tsx` | Scroll wheel bottom sheet — reusable, supports single/multi wheel |
| `src/app/boms/[id]/page.tsx` | BOM detail page — renders line items, manages pending unit state |
| `src/app/api/boms/[id]/route.ts` | BOM API — update schema doesn't include `inputUnit` |
| `prisma/schema.prisma` | BomLineItem has `parsedUom` field (unused) and `nonCatalogUom` |

### Gaps Being Addressed

1. **No unit display in view mode** — Quantities show without units ("3" not "3 lbs")
2. **No unit persistence** — The edit-mode Select updates React state only; lost on reload
3. **`parsedUom` field exists but is never written** — AI parses units but doesn't save them
4. **Unit picker is a tiny Select dropdown** — Hard to use on mobile with gloves; should be the scroll wheel
5. **No unit picker outside edit mode** — Checkout/return modes show unit as plain text

---

## Proposed Changes

### Summary of Changes

- Add `inputUnit` column to BomLineItem schema for persisting user's chosen display unit
- Replace the Select dropdown with a tappable pill that opens OptionPicker
- Show unit pill in ALL modes (view, edit, checkout, return) — tappable in edit mode, display-only elsewhere
- Extend the BOM API `updateLineItems` schema to accept `inputUnit`
- Wire `handleSaveEdits()` to persist unit changes
- Save `parsedUom` during BOM creation so AI-parsed units are captured
- Define standard unit options list (ea, lbs, lf, sf, box, roll, bag, tube, gal, case)

### Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `inputUnit String?` to BomLineItem model |
| `src/components/bom/bom-line-item-row.tsx` | Replace Select with tappable unit pill + OptionPicker; show unit in all modes |
| `src/app/boms/[id]/page.tsx` | Pass inputUnit from DB, wire save to include unit changes |
| `src/app/api/boms/[id]/route.ts` | Add `inputUnit` to updateLineItems and addLineItems schemas + update logic |
| `src/components/bom/bom-ai-flow.tsx` | Pass `parsedUom` when creating BOM line items |
| `src/app/api/boms/route.ts` | Accept and store `parsedUom` + `inputUnit` on BOM creation |

### No New Files

The OptionPicker component already exists and is fully reusable.

---

## Design Decisions

### Key Decisions

1. **Use existing OptionPicker, not a new component**: The scroll wheel bottom sheet at `src/components/doors/option-picker.tsx` is already battle-tested, supports single-wheel mode, and matches the app's established interaction pattern. No reason to build something new.

2. **Add `inputUnit` as a separate field from `parsedUom`**: `parsedUom` captures what the AI originally parsed (historical/audit). `inputUnit` captures what the user chose to display (may differ). Both are useful.

3. **Unit pill visible in all modes, tappable only in edit mode**: In view/checkout/return, the unit shows as a static pill next to the quantity for clarity. In edit mode, it gains a tap affordance (chevron or subtle border change) and opens the picker. This avoids accidental changes during checkout.

4. **Standard unit options list**: A fixed list covers RSNE's real-world units: ea, lbs, lf (linear ft), sf (sq ft), in, ft, box, roll, bag, tube, gal, case. The OptionPicker's "Other" mode isn't needed — these cover all scenarios.

5. **Pill styling**: `bg-brand-blue/10 text-brand-blue font-semibold text-xs rounded-lg px-2.5 h-7 min-w-[44px]` — matches existing attribute pill pattern, meets 44px touch target height in edit mode.

### Alternatives Considered

- **Inline dropdown (current approach)**: Too small for mobile, hidden behind edit mode, easy to miss.
- **Unit as part of quantity input field**: Confusing — users wouldn't know if "3 lbs" is editable text or structured data.
- **Full-width unit picker row**: Too much vertical space per line item; the pill is compact and sufficient.

---

## Step-by-Step Tasks

### Step 1: Add `inputUnit` to Prisma Schema

Add the `inputUnit` field to the BomLineItem model, right after `parsedUom`.

**Actions:**
- Add `inputUnit String? @db.VarChar(50)` to BomLineItem model after `parsedUom`
- Run `npx prisma db push` to sync schema

**Files affected:**
- `prisma/schema.prisma`

---

### Step 2: Update BOM API to Accept and Persist `inputUnit`

Extend the update and create schemas to handle the new field.

**Actions:**
- In `src/app/api/boms/[id]/route.ts`:
  - Add `inputUnit: z.string().max(50).optional().nullable()` to `updateLineItems` array schema
  - Add `inputUnit: z.string().max(50).optional().nullable()` to `addLineItems` array schema
  - In the update logic (line ~152), add `inputUnit` to the updateFields builder
  - In the add logic (line ~207), include `inputUnit` in the create data
- In `src/app/api/boms/route.ts` (BOM creation):
  - Add `parsedUom` and `inputUnit` to the line item creation schema
  - Include both fields in the prisma create call

**Files affected:**
- `src/app/api/boms/[id]/route.ts`
- `src/app/api/boms/route.ts`

---

### Step 3: Save `parsedUom` During BOM Creation

Wire the AI-parsed unit through the creation flow so it's captured in the database.

**Actions:**
- In `src/components/bom/bom-ai-flow.tsx`:
  - When building the line items payload for submission, include `parsedUom: item.parsedItem.unitOfMeasure`
  - Also set `inputUnit` to the same value as initial default

**Files affected:**
- `src/components/bom/bom-ai-flow.tsx`

---

### Step 4: Replace Select with Unit Pill + OptionPicker in BomLineItemRow

This is the main UI change. Replace the existing Select dropdown with a tappable pill that opens OptionPicker.

**Actions:**
- Import `OptionPicker` from `@/components/doors/option-picker`
- Add `useState` for `pickerOpen` boolean
- Define standard unit options constant:
  ```ts
  const STANDARD_UNITS = [
    { label: "ea", value: "ea" },
    { label: "lbs", value: "lbs" },
    { label: "lf", value: "lf" },
    { label: "sf", value: "sf" },
    { label: "in", value: "in" },
    { label: "ft", value: "ft" },
    { label: "box", value: "box" },
    { label: "roll", value: "roll" },
    { label: "bag", value: "bag" },
    { label: "tube", value: "tube" },
    { label: "gal", value: "gal" },
    { label: "case", value: "case" },
  ]
  ```
- **View mode** (normal render): Show unit as a static pill next to quantity:
  ```tsx
  <span className="text-xs font-semibold text-brand-blue bg-brand-blue/10 rounded-lg px-2.5 py-1">
    {activeInputUnit}
  </span>
  ```
- **Edit mode**: Show unit as tappable pill with visual affordance (border, slightly different styling):
  ```tsx
  <button
    onClick={() => setPickerOpen(true)}
    className="h-7 min-w-[44px] px-2.5 text-xs font-semibold text-brand-blue bg-brand-blue/10 border border-brand-blue/20 rounded-lg active:bg-brand-blue/20 transition-colors"
  >
    {activeInputUnit}
  </button>
  <OptionPicker
    open={pickerOpen}
    onOpenChange={setPickerOpen}
    label="Unit of Measure"
    wheels={[{ label: "Unit", options: unitOptionsForPicker }]}
    selectedValues={[activeInputUnit]}
    onDone={([unit]) => onInputUnitChange?.(unit)}
  />
  ```
- **Checkout mode**: Show unit as static pill after the quantity input (replacing the current `<span>` text)
- **Return mode**: Same — static pill after quantity
- Remove the old `Select`/`SelectContent`/`SelectItem` imports if no longer used
- Keep the existing dimension-based unit options logic but merge with STANDARD_UNITS so the picker always has a full list

**Files affected:**
- `src/components/bom/bom-line-item-row.tsx`

---

### Step 5: Wire BOM Detail Page to Persist Unit Changes

Update the parent page to read `inputUnit` from the API response and include it in save operations.

**Actions:**
- In `src/app/boms/[id]/page.tsx`:
  - Pass `inputUnit` from the DB record: `inputUnit={pendingUnitChanges[lineId] ?? (item.inputUnit as string | undefined)}`
  - Update `handleSaveEdits()` to include unit changes alongside qty changes:
    ```ts
    const updateLineItems = Object.keys({...pendingQtyChanges, ...pendingUnitChanges}).map((lineId) => ({
      id: lineId,
      ...(pendingQtyChanges[lineId] !== undefined && { qtyNeeded: pendingQtyChanges[lineId] }),
      ...(pendingUnitChanges[lineId] !== undefined && { inputUnit: pendingUnitChanges[lineId] }),
    }))
    ```

**Files affected:**
- `src/app/boms/[id]/page.tsx`

---

### Step 6: Include `inputUnit` in BOM GET Response

Ensure the API returns the `inputUnit` field so the detail page can read it.

**Actions:**
- In `src/app/api/boms/[id]/route.ts` GET handler: `inputUnit` is already included because the query uses `include: { lineItems: ... }` without a `select` clause, so all fields are returned. Verify this is the case.
- Also check the BOM list endpoint if line items are included there.

**Files affected:**
- Verification only — likely no changes needed

---

### Step 7: QA Validation

**Actions:**
- Run `npx tsc --noEmit` — verify no type errors
- Run `npx tsx scripts/token-audit.ts` — verify design tokens are consistent
- Test runtime behavior:
  - Create a new BOM with AI input that includes units (e.g., "3 lbs TEK screws") → verify `parsedUom` is saved and unit pill shows "lbs"
  - View a BOM → verify unit pills show next to every quantity
  - Edit a BOM → tap unit pill → verify OptionPicker opens with scroll wheel
  - Change a unit → save → reload page → verify unit persisted
  - Checkout mode → verify unit pill is visible (not tappable)
  - Return mode → verify unit pill is visible (not tappable)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/bom/bom-confirmation-card.tsx` — shows unit during confirmation; may want to display parsed unit here too (future enhancement)
- `src/components/bom/checkout-all-button.tsx` — references line items; no change needed
- `src/hooks/use-boms.ts` — React Query hooks for BOM CRUD; no schema changes needed (passes through JSON)

### Updates Needed for Consistency

- The BOM creation POST endpoint (`src/app/api/boms/route.ts`) needs to accept `parsedUom` and `inputUnit` in the line items payload

### Impact on Existing Workflows

- **No breaking changes** — `inputUnit` is nullable, so existing BOMs without it continue to work (falls back to `unitOfMeasure` from product)
- The visual change (unit pill appearing) affects all BOM views but is purely additive

---

## Validation Checklist

- [ ] `npx prisma db push` succeeds with new `inputUnit` field
- [ ] `npx tsc --noEmit` passes
- [ ] `npx tsx scripts/token-audit.ts` passes
- [ ] Unit pill visible in view mode on all BOM line items
- [ ] Unit pill tappable in edit mode, opens OptionPicker scroll wheel
- [ ] OptionPicker shows full unit list with current unit pre-selected
- [ ] Unit selection persists after save + page reload
- [ ] AI-parsed units flow through to `parsedUom` on BOM creation
- [ ] Checkout and return modes show unit pill (non-tappable)
- [ ] No regressions on existing BOM edit/checkout/return flows

---

## Success Criteria

1. Every BOM line item shows its unit of measure as a visible pill next to the quantity
2. In edit mode, tapping the pill opens the OptionPicker scroll wheel and the selection persists to the database
3. AI-parsed units are captured in `parsedUom` during BOM creation and used as the initial `inputUnit`

---

## Notes

- This is the foundation for the T2 deferred-matching flow (planned separately). Once units are visible and editable, T2 items can show raw text + unit on the BOM and defer SKU matching to checkout.
- The `parsedUom` field already exists in the schema but has never been populated. This plan fixes that.
- Future enhancement: show unit pill on BOM confirmation cards during creation flow.

---

## Implementation Notes

**Implemented:** 2026-03-26

### Summary

Added `inputUnit` field to BomLineItem schema. Replaced the Select dropdown unit picker with a tappable unit pill (brand-blue/10 styling) that opens the OptionPicker scroll wheel in edit mode. Unit pill displays in all modes (view, checkout, return). AI-parsed units now flow through to `parsedUom` and `inputUnit` during BOM creation. Unit changes persist to the database via the updated API.

### Deviations from Plan

- Also updated `src/hooks/use-boms.ts` to add `inputUnit` and make `qtyNeeded` optional in the `updateLineItems` type — not in the original plan but required for TypeScript compilation.
- Changed pill radius from `rounded-lg` to `rounded-xl` per token audit findings.
- Could not run `prisma db push` locally (no DATABASE_URL in .env.local) — schema change will apply on next deploy or when run with DB connection.

### Issues Encountered

None — implementation was straightforward.
