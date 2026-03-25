# Plan: Door Module UI System Overhaul

**Created:** 2026-03-25
**Status:** Implemented
**Request:** Replace the generic field renderer with a constraint-based component system that enforces visual consistency regardless of data permutations

---

## Overview

### What This Plan Accomplishes

Replaces the SPEC_SECTIONS generic renderer in `door-confirmation.tsx` with purpose-built section components that produce identical visual structure regardless of which door specs are selected. Creates shared row primitives (`SpecRow`, `BoolRow`, `SectionCard`) used across confirmation, spec sheet, and manufacturing sheet — ensuring cross-view consistency while respecting each view's purpose (editable form, formal spec, compact shop sheet).

### Why This Matters

The current system produces different layouts for different door configurations — single-field cards, inconsistent row heights, hidden sections, and variable spacing. This makes the app feel broken on every permutation. Construction workers need to scan and verify specs quickly. The layout should be a **rock-solid container** that holds its shape regardless of what data fills it.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Defined the constraint system: fixed sections, locked spacing constants, standardized row heights. Apple Notes clean aesthetic with Monday.com structure. |
| `engineering-skills` (architecture) | Validated shared primitives pattern — composition over mega-component. Each view imports primitives and composes them differently. |
| `product-skills` (UX researcher) | Defined section grouping: 5 fixed sections that cover ALL door types without producing thin/empty cards. |

### How Skills Shaped the Plan

The UX researcher insight was critical: merge 10 dynamic sections into 5 fixed sections grouped by user mental model (what it is → what it looks like → what hardware → what extras → submit). The architecture skill confirmed that shared primitives with view-specific composition is the right pattern — not one rendering engine with modes. Frontend-design locked the spacing constants so they can't drift.

---

## Current State

### Relevant Existing Structure

- `src/components/doors/door-confirmation.tsx` (549 lines) — Generic SPEC_SECTIONS renderer, produces inconsistent layouts
- `src/components/doors/door-spec-sheet.tsx` (413 lines) — Has SpecRow, CheckboxRow, SectionHeader, HardwareBox inline
- `src/components/doors/door-manufacturing-sheet.tsx` (330 lines) — Has MfgField, MfgCheckbox, MfgHardwareBox inline
- `src/lib/door-field-labels.ts` — Field label registry (created this session)

### Gaps or Problems Being Addressed

1. **Generic renderer breaks under permutations** — SPEC_SECTIONS maps field names to cards dynamically. Different door types produce wildly different layouts. Single-field cards (Finish: WPG). Sections disappear when no fields have values.
2. **No standardized row component** — Booleans are `w-4 h-4` green checkboxes in confirmation, `h-5 w-5` navy in spec sheet. Text rows have different heights. No single row definition.
3. **Inconsistent spacing across views** — Confirmation uses `space-y-4` between sections, spec sheet uses `space-y-5`, manufacturing uses `space-y-1`. Hardware boxes are `p-3` in two views, `p-2.5` in manufacturing.
4. **Empty fields hidden** — If a field has no value, its row disappears, changing the section's visual weight and the page's overall structure.
5. **10 sections, many single-field** — Finish (1 field), Window (1-2 fields), Heater (1-2 fields) each get their own card with header + padding overhead.

---

## Proposed Changes

### Summary of Changes

- Create `src/components/doors/spec-primitives.tsx` — Shared row primitives: `SectionCard`, `SpecRow`, `BoolRow`, `EmptyValue`
- Rewrite `door-confirmation.tsx` — Replace SPEC_SECTIONS with 5 fixed hardcoded sections using primitives
- Update `door-spec-sheet.tsx` — Use shared SectionCard pattern, standardize hardware splitting
- Update `door-manufacturing-sheet.tsx` — Use shared hardware splitting logic
- Define spacing constants as Tailwind classes to prevent drift

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `src/components/doors/spec-primitives.tsx` | Shared row and section components used by all 3 views |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `src/components/doors/door-confirmation.tsx` | Full rewrite of section rendering — replace SPEC_SECTIONS with 5 fixed sections |
| `src/components/doors/door-spec-sheet.tsx` | Replace inline SpecRow/CheckboxRow/SectionHeader with imports from spec-primitives; standardize hardware split |
| `src/components/doors/door-manufacturing-sheet.tsx` | Import shared hardware split helper |
| `src/lib/door-field-labels.ts` | Add `splitHardwareValue()` utility for splitting "DENT D276" → mfr + model |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **5 fixed sections, never conditional**: Instead of 10 dynamic sections that appear/disappear, use 5 that always render:
   - **Dimensions** — Width, Height, Jamb Depth, Wall Thickness
   - **Configuration** — Category, Temperature, Opening, Frame Type, Side, Finish, Insulation, Gasket, High Sill, Wiper, Exterior
   - **Hardware** — 4-box grid (Hinges, Latch, Closer, Inside Release) — always all 4
   - **Features & Options** — Window, Heater, Weather Shield, Threshold, Label, Cutouts
   - **Components & Notes** — Component list, notes textarea, submit button

   Rationale: Merging related thin sections eliminates single-field cards. A freezer exterior high-sill door shows the same 5 sections as a basic cooler swing — just with different values.

2. **Standardized row height via consistent py-2.5 and border dividers**: All rows use `py-2.5` padding and `border-b border-border-custom/30` dividers instead of `space-y-*` gaps. This produces identical row height for booleans and text fields.

3. **Fixed label width of w-28 (confirmation) and consistent alignment**: Labels are left-aligned at fixed width. Values are right-aligned, bold. This creates a visual column even without a table.

4. **Empty values show "—" (em dash), never hidden**: Every field that could appear for the door type ALWAYS renders. Missing values show `—` in muted text. This means a Cooler Swing and Freezer Exterior High Sill have the same row count in Configuration.

5. **Hardware manufacturer split in shared utility**: Move the "DENT D276" → mfr + model splitting logic into `door-field-labels.ts` so all 3 views use the same function.

6. **Spec sheet and manufacturing sheet keep their own density**: The spec sheet is a formal document (larger type, more spacing). The manufacturing sheet is a compact shop form (tighter). They share STRUCTURAL patterns (same sections, same row order) but not spacing values. Only the confirmation page gets the full rewrite.

### Alternatives Considered

- **One mega-component with `mode` prop** — Rejected. The three views have fundamentally different interaction needs (editable vs read-only vs print-compact). Composition is cleaner.
- **Keep SPEC_SECTIONS but fix grouping** — Rejected. The generic renderer pattern itself is the problem. Hardcoded sections with explicit field lists are more predictable.

### Open Questions

None — all decisions are clear from the audit.

---

## Step-by-Step Tasks

### Step 1: Create Shared Primitives and Hardware Split Utility

Create `spec-primitives.tsx` with the foundational row components, and add `splitHardwareValue()` to `door-field-labels.ts`.

**Actions:**

- Create `src/components/doors/spec-primitives.tsx` with:
  - `SectionCard` — Card wrapper: `p-4 rounded-xl border-border-custom` with title in `font-semibold text-navy text-base mb-2` and `divide-y divide-border-custom/30` on children container
  - `SpecRow` — `py-2.5 flex items-center justify-between` with label `text-sm text-text-secondary w-28 shrink-0` and value `text-sm font-semibold text-navy text-right flex-1`. Takes optional `onEdit` callback for pencil icon. Empty values render `<span className="text-sm text-text-muted">—</span>`
  - `BoolRow` — Same layout as SpecRow but value is `Yes`/`No` text with navy `h-5 w-5 rounded border-2` checkbox. True = `border-navy bg-navy text-white` with checkmark. False = empty border. Takes optional `onToggle` callback.
  - `EmptyValue` — Reusable `—` em dash span in muted text

- Add to `src/lib/door-field-labels.ts`:
  - `splitHardwareValue(value: string): { manufacturer?: string; model?: string }` — splits "DENT D276" into { manufacturer: "DENT", model: "D276" }. Handles known patterns: "Kason K1094" → Kason + K1094, "K481 Safety Glow" → Kason + K481 Safety Glow, "Glow Push Panel" → undefined mfr + Glow Push Panel.

**Files affected:**
- `src/components/doors/spec-primitives.tsx` (new)
- `src/lib/door-field-labels.ts`

---

### Step 2: Rewrite door-confirmation.tsx — Fixed Section Layout

Replace the entire SPEC_SECTIONS generic renderer with 5 hardcoded sections using the primitives.

**Actions:**

- Remove `SPEC_SECTIONS` constant entirely
- Remove the generic `.map((section) => ...)` renderer
- Remove inline `getDisplayLabel()` and `formatValue()` (already delegated to registry)
- Build 5 explicit sections:

**Section 1: Dimensions**
```
SectionCard title="Dimensions"
  SpecRow label="Width (in clear)" value={specs.widthInClear} suffix='"' onEdit={...}
  SpecRow label="Height (in clear)" value={specs.heightInClear} suffix='"' onEdit={...}
  SpecRow label="Jamb Depth" value={specs.jambDepth} suffix='"' onEdit={...}
  SpecRow label="Wall Thickness" value={specs.wallThickness} suffix='"' onEdit={...}
```

**Section 2: Configuration**
```
SectionCard title="Configuration"
  SpecRow label="Temperature" value={formatDoorFieldValue("temperatureType", specs.temperatureType)}
  SpecRow label="Opening Type" value={formatDoorFieldValue("openingType", specs.openingType)}
  SpecRow label="Frame Type" value={formatDoorFieldValue("frameType", specs.frameType)}
  SpecRow label="Hinge Side" / "Slide Side" value={...} (conditional on openingType)
  SpecRow label="Finish" value={specs.finish}
  SpecRow label="Insulation Type" value={specs.insulationType}
  SpecRow label="Gasket Type" value={formatDoorFieldValue("gasketType", specs.gasketType)}
  BoolRow label="High Sill" value={specs.highSill} onToggle={...}
  BoolRow label="Wiper" value={specs.wiper} onToggle={...}
  BoolRow label="Exterior Door" value={specs.isExterior} onToggle={...}
```

**Section 3: Hardware (existing 4-box grid — keep as-is, already fixed)**
- Use `splitHardwareValue()` from the shared utility instead of inline splitting

**Section 4: Features & Options**
```
SectionCard title="Features & Options"
  // Window
  SpecRow label="Window" value={specs.windowSize ? (specs.windowSize === "14x14" ? '14" × 14"' : '14" × 24"') : undefined}
  BoolRow label="Heated Window" value={specs.windowHeated} (only if windowSize exists)
  // Heater (freezer only)
  SpecRow label="Heater Size" value={specs.heaterSize} (only if temperatureType === FREEZER)
  SpecRow label="Heater Location" value={specs.heaterCableLocation} (only if temperatureType === FREEZER)
  // Options
  BoolRow label="Weather Shield" value={specs.weatherShield}
  BoolRow label="Threshold Plate" value={specs.thresholdPlate}
  BoolRow label="Label" value={specs.label}
  // Cutouts (inline if present)
  Cutout grid (existing 3-column format — move inside this section)
```

**Section 5: Components & Notes (no SectionCard — just the existing submit area)**
- Keep components card, notes textarea, submit button as-is

- For sliding doors: In Configuration section, show "Slide Side" instead of "Hinge Side", and skip Frame Type (which doesn't apply). In Features, skip heater fields. The section always renders — just some rows show "—".

**Files affected:**
- `src/components/doors/door-confirmation.tsx`

---

### Step 3: Update door-spec-sheet.tsx — Use Shared Hardware Splitting

Replace the inline closer/release splitting with the shared utility.

**Actions:**

- Import `splitHardwareValue` from `door-field-labels.ts`
- Replace the inline IIFE that splits `specs.closerModel` and detects `specs.insideRelease` manufacturer with calls to `splitHardwareValue()`
- Verify HardwareBox component already has consistent Manufacturer + Model rows (done in prior commit)

**Files affected:**
- `src/components/doors/door-spec-sheet.tsx`

---

### Step 4: Update door-manufacturing-sheet.tsx — Use Shared Hardware Splitting

Same as Step 3 for the manufacturing view.

**Actions:**

- Import `splitHardwareValue` from `door-field-labels.ts`
- Replace inline closer/release splitting with shared utility
- Verify MfgHardwareBox has consistent Manufacturer + Model rows

**Files affected:**
- `src/components/doors/door-manufacturing-sheet.tsx`

---

### Step 5: Permutation Testing

Mentally render the confirmation page for every major door type combination and verify identical structure.

**Actions:**

- Verify: **Cooler Swing 3×7** (standard, magnetic gasket, D690 hardware, no window, no heater)
- Verify: **Cooler Swing 3×7 High Sill** (high sill = yes, wiper = no, same hardware)
- Verify: **Cooler Swing 3×7 Exterior** (exterior = yes, K1245 hardware, inside release)
- Verify: **Freezer Swing 3×7** (heater fields appear, PIR insulation)
- Verify: **Freezer Swing 3×7 Exterior High Sill** (maximum fields — exterior + high sill + heater)
- Verify: **Freezer Swing 3×7 Plug** (no frame type)
- Verify: **Cooler Slider 4×7** (slide side instead of hinge side, no frame type, different hardware)
- Verify: **Freezer Slider 6×8** (slider + heater)
- For each: confirm same number of sections, same section titles, consistent row heights, "—" for empty fields

**Files affected:**
- None (review pass)

---

### Step 6: QA — TypeScript, Token Audit, UX Checklist

**Actions:**

- Run `npx tsc --noEmit` — zero errors in changed files
- Run `npx tsx scripts/token-audit.ts` — no new warnings
- UX Checklist:
  - [ ] Every button/tappable element has visual affordance (bg, border, or shadow)
  - [ ] Touch targets ≥ 44px
  - [ ] No horizontal overflow at 375px
  - [ ] All text readable (no truncation hiding critical info)
  - [ ] Consistent card shadows, border radius, spacing
  - [ ] No raw camelCase field names anywhere
  - [ ] All dimensions have `"` inch marks
  - [ ] Hardware: all 4 boxes visible with Manufacturer + Model rows
  - [ ] Empty values show "—" not hidden
  - [ ] Boolean checkboxes consistent size (h-5 w-5) and color (navy)

**Files affected:**
- All modified files

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/doors/door-creation-flow.tsx` — Renders DoorConfirmation component
- `src/app/assemblies/[id]/page.tsx` — Renders DoorSpecSheet and DoorManufacturingSheet
- `src/app/assemblies/new/page.tsx` — Wraps DoorCreationFlow

### Updates Needed for Consistency

- None — the shared primitives are new and won't break existing imports

### Impact on Existing Workflows

- Door creation flow: Same props API to DoorConfirmation — no changes needed in parent
- Assembly detail page: Same props API to spec/manufacturing sheets — no changes
- All changes are internal rendering; no API or data model changes

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with zero errors in changed files
- [ ] `npx tsx scripts/token-audit.ts` has no new warnings from changes
- [ ] Cooler Swing 3×7 confirmation page has 5 sections, all visible
- [ ] Freezer Exterior High Sill 3×7 confirmation page has same 5 sections
- [ ] Cooler Slider 4×7 confirmation page has same 5 sections
- [ ] No single-field sections anywhere
- [ ] No hidden rows — empty values show "—"
- [ ] Boolean checkboxes are h-5 w-5 navy in confirmation (matching spec/mfg sheets)
- [ ] Hardware grid shows all 4 boxes with Manufacturer + Model in all 3 views
- [ ] `splitHardwareValue()` used consistently across all 3 views
- [ ] All SpecRow labels use `door-field-labels.ts` registry
- [ ] Row heights visually identical between boolean and text rows

---

## Success Criteria

The implementation is complete when:

1. The confirmation page renders **exactly 5 sections** for any door type permutation — no more, no fewer
2. Every row within a section has **identical height** regardless of whether it's a text field, boolean toggle, or empty value
3. Switching between a Cooler Swing 3×7 and a Freezer Exterior High Sill 3×7 produces the **same visual structure** — same sections, same row count in each section — with only the values differing
4. All 3 views (confirmation, spec sheet, manufacturing sheet) use **shared utilities** for hardware value splitting
5. Zero instances of raw camelCase field names, hidden rows, or single-field cards anywhere in the module

---

## Notes

- The spec sheet and manufacturing sheet keep their own spacing density — spec is formal/spacious, manufacturing is compact for print. They share STRUCTURAL patterns (same hardware split, same section grouping concept) but not raw spacing values.
- Sliding doors: Configuration section shows "Slide Side" instead of "Hinge Side" and Frame Type shows "—". This is a value change, not a structural change.
- Freezer-only fields (heater) appear in Features section for all doors — for cooler doors they show "—". This means the section count is constant.
- The `spec-primitives.tsx` file is a new shared component file. If it grows, it could be split, but for now it's small enough to be one file.
