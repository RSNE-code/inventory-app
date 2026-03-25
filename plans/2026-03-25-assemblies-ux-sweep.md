# Plan: Assemblies Module UX Sweep

**Created:** 2026-03-25
**Status:** Implemented
**Request:** Fix 18 UX issues found in fabrication module audit — raw field names, missing units, abbreviated labels, inconsistent empty states

---

## Overview

### What This Plan Accomplishes

Creates a shared field label registry (`door-field-labels.ts`) and sweeps 8 files across the assemblies module to replace raw camelCase field names with human-readable labels, add inch marks to all dimension displays, expand abbreviated labels, and standardize empty state handling. Focuses on P1 and P2 issues that directly affect readability for shop floor users.

### Why This Matters

Construction workers and shop foremen use this app on phones, often with gloves, in bright sunlight. Raw field names like "hingeMfrName" and dimensions without units ("36 x 84") force them to decode data instead of working. Every second of confusion costs productivity on the shop floor.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Confirmed the clean Apple Notes aesthetic — labels should be full words, not abbreviations. Consistent typography hierarchy across all hardware boxes. |
| `engineering-skills` (architecture) | Validated shared module pattern for `door-field-labels.ts` — typed Record with exhaustive coverage, imported by 6+ files. |
| `product-skills` (UX researcher) | Prioritized: P1 = anything that shows raw code to users (change log, field names); P2 = missing context (units, jargon); P3 = polish (loading states, style inconsistencies). Deferred P3 items that don't affect usability. |

### How Skills Shaped the Plan

The UX researcher perspective pushed raw-field-names and missing-units to top priority — these are the things that make the app feel "developer-built, not user-built." The architecture skill confirmed that a single label registry is the right pattern (vs. per-component label maps) since 6+ files need the same mappings. Frontend-design skill confirmed "Manufacturer" over "Mfr" for readability on mobile.

---

## Current State

### Relevant Existing Structure

- `src/lib/door-specs.ts` — Has `FIELD_METADATA` with labels, but incomplete (doesn't cover all fields) and used inconsistently
- `src/components/doors/door-confirmation.tsx` — Has `getDisplayLabel()` fallback that converts camelCase → Title Case (breaks on "hingeMfrName" → "Hingembr Name")
- `src/components/doors/door-spec-sheet.tsx` — HardwareBox uses "Mfr" / "Model" abbreviated labels, has "Not specified" italic fallback
- `src/components/doors/door-manufacturing-sheet.tsx` — MfgHardwareBox uses non-breaking space for empty values
- `src/app/assemblies/[id]/page.tsx` — Change log shows raw `entry.fieldName` directly; old-specs display uses manual field→label mapping
- `src/app/assemblies/page.tsx` — Card dimensions shown without inch marks; frame type uses regex replace on raw enum

### Gaps or Problems Being Addressed

1. **No single source of truth for field labels** — Each component invents its own label conversion
2. **Change log shows raw camelCase** — "hingeMfrName" visible to users
3. **Dimensions without units** — "36 x 84" on assembly cards (should be `36" × 84"`)
4. **Abbreviated labels** — "Mfr" in hardware boxes across spec sheet and confirmation
5. **Inconsistent empty states** — spec-sheet says "Not specified" in italic; mfg-sheet uses `\u00A0`; confirmation shows nothing
6. **Cutout display inconsistent** — spec-sheet has proper 3-column grid with `"` marks; confirmation has inline text without units
7. **Frame type shown as regex-cleaned enum** — `FULL_FRAME` → "Full Frame" via regex instead of proper label lookup

---

## Proposed Changes

### Summary of Changes

- Create `src/lib/door-field-labels.ts` — exhaustive field→label map for all DoorSpecs fields
- Update `door-confirmation.tsx` — use registry for `getDisplayLabel()`, add units to cutout display
- Update `door-spec-sheet.tsx` — expand "Mfr" to "Manufacturer" in HardwareBox
- Update `door-manufacturing-sheet.tsx` — expand "Mfr" label, consistent empty state
- Update `assemblies/[id]/page.tsx` — use registry for change log field names, fix old-specs labels
- Update `assemblies/page.tsx` — add `"` to dimension display on cards, use registry for frame type
- Update `door-builder.tsx` — clean up hardware dropdown display (cosmetic, labels only)

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `src/lib/door-field-labels.ts` | Shared field label registry — maps every DoorSpecs field to a human-readable label |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `src/components/doors/door-confirmation.tsx` | Replace `getDisplayLabel()` with registry import; upgrade cutout display to 3-column grid with `"` marks |
| `src/components/doors/door-spec-sheet.tsx` | HardwareBox: "Mfr" → "Manufacturer" |
| `src/components/doors/door-manufacturing-sheet.tsx` | MfgHardwareBox: add "Not specified" italic for empty; consistent with spec-sheet |
| `src/app/assemblies/[id]/page.tsx` | Change log: map `fieldName` through registry; old-specs: use registry for labels |
| `src/app/assemblies/page.tsx` | Card dimensions: `{w}" × {h}"` with inch marks; frame type: use registry |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Single registry file over extending FIELD_METADATA**: `FIELD_METADATA` in `door-specs.ts` is typed for form validation (options, required, categories). Label display is a separate concern. A dedicated label map is simpler and doesn't bloat the validation metadata.

2. **"Manufacturer" over "Mfr"**: Mobile users scanning quickly. Full word is unambiguous. The hardware boxes have enough space — they're 2-column grid on a phone-width card.

3. **Consistent "Not specified" italic pattern**: Match the spec-sheet HardwareBox treatment (`<p className="text-xs text-text-muted italic">Not specified</p>`) everywhere.

4. **Don't touch P3 items in this pass**: Loading states, SVG diagram labels, and styling inconsistencies are real but don't affect data readability. Keep this plan focused on data display correctness.

5. **Cutout display in confirmation matches spec-sheet**: Use the same 3-column grid with "Floor→Bottom", "Floor→Top", "Width" labels and `"` inch marks.

### Alternatives Considered

- **Extend FIELD_METADATA with a `displayLabel` field** — Rejected because it mixes validation schema with presentation. Also, FIELD_METADATA doesn't cover all fields (no entries for cutout sub-fields, heater fields, etc.).
- **Fix labels inline in each component** — Rejected because 6+ files need the same mappings. Duplication would drift.

### Open Questions (if any)

None — all decisions are straightforward data display fixes.

---

## Step-by-Step Tasks

### Step 1: Create Field Label Registry

Create `src/lib/door-field-labels.ts` with an exhaustive map of all DoorSpecs field names to human-readable labels.

**Actions:**

- Create file with `export const DOOR_FIELD_LABELS: Record<string, string>` mapping every field in the `DoorSpecs` interface
- Include a `getDoorFieldLabel(field: string): string` helper that looks up the registry and falls back to cleaned-up Title Case (proper camelCase splitting, not the broken regex)
- Include a `formatDoorFieldValue(field: string, value: unknown): string` helper for consistent value formatting (booleans → "Yes"/"No", enums → friendly labels like "FULL_FRAME" → "Full Frame", "HINGED_COOLER" → "Hinged Cooler")

**Field mappings to include:**

```
doorCategory → "Door Category"
serialNumber → "Serial Number"
label → "Label"
jobNumber → "Job Number"
jobName → "Job Name"
jobSiteName → "Job Site"
widthInClear → "Width (in clear)"
heightInClear → "Height (in clear)"
wallThickness → "Wall Thickness"
jambDepth → "Jamb Depth"
temperatureType → "Temperature"
openingType → "Opening Type"
hingeSide → "Hinge Side"
slideSide → "Slide Side"
frameType → "Frame Type"
frameCustom → "Custom Frame"
frameLHS → "Frame Left"
frameRHS → "Frame Right"
frameTop → "Frame Top"
highSill → "High Sill"
sillHeight → "Sill Height"
wiper → "Wiper"
panelThickness → "Panel Thickness"
panelInsulated → "Panel Insulated"
insulation → "Insulation"
insulationType → "Insulation Type"
finish → "Finish"
skinMaterial → "Skin Material"
windowSize → "Window"
windowHeated → "Heated Window"
hingeMfrName → "Hinge Manufacturer"
hingeModel → "Hinge Model"
hingeOffset → "Hinge Offset"
latchMfrName → "Latch Manufacturer"
latchModel → "Latch Model"
latchOffset → "Latch Offset"
insideRelease → "Inside Release"
closerModel → "Closer"
heaterSize → "Heater Size"
heaterCableLocation → "Heater Location"
gasketType → "Gasket Type"
cutouts → "Cutouts"
isExterior → "Exterior Door"
weatherShield → "Weather Shield"
thresholdPlate → "Threshold Plate"
doorPull → "Door Pull"
trackType → "Track Type"
specialNotes → "Special Notes"
infoLine → "Info"
quantity → "Quantity"
```

**Enum value mappings to include:**

```
HINGED_COOLER → "Hinged Cooler"
HINGED_FREEZER → "Hinged Freezer"
SLIDING → "Sliding"
COOLER → "Cooler"
FREEZER → "Freezer"
HINGE → "Hinged"
SLIDE → "Sliding"
FULL_FRAME → "Full Frame"
FACE_FRAME → "Face Frame"
BALLY_TYPE → "Bally Type"
MAGNETIC → "Magnetic"
NEOPRENE → "Neoprene"
LEFT → "Left"
RIGHT → "Right"
IMP → "IMP"
EPS → "EPS"
PIR → "PIR"
WPG → "WPG"
SS → "Stainless Steel"
Gray → "Gray"
```

**Files affected:**

- `src/lib/door-field-labels.ts` (new)

---

### Step 2: Update door-confirmation.tsx — Labels and Cutouts

Replace the broken `getDisplayLabel()` with the registry. Upgrade cutout display to match spec-sheet format.

**Actions:**

- Import `getDoorFieldLabel` and `formatDoorFieldValue` from `door-field-labels.ts`
- Replace `getDisplayLabel()` function body with: `return getDoorFieldLabel(field)`
- Replace `formatValue()` function body with: `return formatDoorFieldValue(field, value)`
- Upgrade cutout section from inline text (`{c.floorToBottom} → {c.floorToTop}, Width: {c.frameWidth}`) to 3-column grid matching spec-sheet:
  ```
  Floor→Bottom: {c.floorToBottom}"
  Floor→Top: {c.floorToTop}"
  Width: {c.frameWidth}"
  ```
- In the hardware grid, expand "Mfr" labels to "Manufacturer"

**Files affected:**

- `src/components/doors/door-confirmation.tsx`

---

### Step 3: Update assemblies/[id]/page.tsx — Change Log and Old Specs

Fix the change log to show human-readable field names. Fix old-specs display labels.

**Actions:**

- Import `getDoorFieldLabel` and `formatDoorFieldValue` from `door-field-labels.ts`
- Change log (line 415): Replace `String(entry.fieldName)` with `getDoorFieldLabel(String(entry.fieldName))`
- Old-specs display (line 326): Replace inline label logic `field === "doorType" ? "Type" : field.charAt(0).toUpperCase() + field.slice(1)` with `getDoorFieldLabel(field)`

**Files affected:**

- `src/app/assemblies/[id]/page.tsx`

---

### Step 4: Update assemblies/page.tsx — Card Dimensions and Frame Labels

Add inch marks to dimension display on assembly cards. Use registry for frame type labels.

**Actions:**

- Import `getDoorFieldLabel` and `formatDoorFieldValue` from `door-field-labels.ts`
- Dimension display (line 323-324): Change `{w} x {h}` to `{w}" × {h}"`
- Frame type display (line 343): Replace `frame.replace(/_/g, " ").replace(/\b\w/g, ...)` with `formatDoorFieldValue("frameType", frame)`

**Files affected:**

- `src/app/assemblies/page.tsx`

---

### Step 5: Update door-spec-sheet.tsx — Expand "Mfr" Labels

Expand abbreviated labels in HardwareBox component.

**Actions:**

- In `HardwareBox` component, change `<span className="text-xs text-text-muted">Mfr</span>` to `<span className="text-xs text-text-muted">Manufacturer</span>`
- This applies on lines 91 in the spec-sheet HardwareBox

**Files affected:**

- `src/components/doors/door-spec-sheet.tsx`

---

### Step 6: Update door-manufacturing-sheet.tsx — Consistent Empty State

Add "Not specified" italic fallback to MfgHardwareBox when no part number.

**Actions:**

- In `MfgHardwareBox`, replace the non-breaking space fallback `{partNumber || "\u00A0"}` with:
  ```tsx
  {partNumber ? (
    <p className="text-sm font-semibold text-navy tabular-nums">{partNumber}</p>
  ) : (
    <p className="text-xs text-text-muted italic">Not specified</p>
  )}
  ```

**Files affected:**

- `src/components/doors/door-manufacturing-sheet.tsx`

---

### Step 7: QA and Validation

Run TypeScript check, token audit, and verify runtime behavior.

**Actions:**

- Run `npx tsc --noEmit` — zero errors in changed files
- Run `npx tsx scripts/token-audit.ts` — no new warnings from changes
- Verify the field label registry covers all fields in `DoorSpecs` interface
- Verify change log displays human-readable labels
- Verify assembly cards show `36" × 84"` format
- Verify hardware boxes show "Manufacturer" not "Mfr"
- Verify cutouts on confirmation page have `"` marks and proper column layout

**Files affected:**

- All modified files

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/doors/door-creation-flow.tsx` — Uses `door-confirmation.tsx` (benefits from improved labels)
- `src/components/doors/door-builder.tsx` — Hardware dropdowns (not modified in this pass; pipe separators are internal data format, not shown to users in the final display)
- `src/app/assemblies/new/page.tsx` — Wraps `DoorCreationFlow` (no changes needed)

### Updates Needed for Consistency

- The new `door-field-labels.ts` should be referenced in CLAUDE.md workspace structure if it becomes a key shared utility (assess after implementation)

### Impact on Existing Workflows

- No behavior changes — this is purely display/presentation
- All data storage, API responses, and form logic remain unchanged
- Change log data in the database still stores camelCase field names; only the display layer changes

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with zero errors in changed files
- [ ] `npx tsx scripts/token-audit.ts` has no new warnings
- [ ] Change log on assembly detail page shows "Hinge Manufacturer" not "hingeMfrName"
- [ ] Assembly cards show `36" × 84"` with inch marks
- [ ] Hardware boxes in spec-sheet say "Manufacturer" not "Mfr"
- [ ] Hardware boxes in confirmation page say "Manufacturer" not "Mfr"
- [ ] Manufacturing sheet shows "Not specified" italic for empty hardware boxes
- [ ] Cutouts on confirmation page use 3-column grid with `"` marks
- [ ] Frame type on assembly cards shows "Full Frame" not regex output
- [ ] All DoorSpecs interface fields have entries in DOOR_FIELD_LABELS

---

## Success Criteria

The implementation is complete when:

1. No raw camelCase field names appear anywhere in the user-facing UI across the entire assemblies module
2. All dimension displays include inch marks (`"`)
3. All hardware labels use full words ("Manufacturer", "Model") not abbreviations
4. Empty hardware states show consistent "Not specified" italic text across all three display views (confirmation, spec sheet, manufacturing sheet)
5. The field label registry is the single source of truth, imported by all components that display field labels

---

## Notes

- **P3 items deferred**: Loading state improvements, SVG diagram labels, LABEL/NO LABEL radio buttons, approval card styling, finish color mapping brittleness, window size magic strings, size card text overflow. These should be addressed in a future polish pass.
- **Hardware dropdown pipe separators** (door-builder.tsx): The `"DENT|D690"` format is internal data, split before display to user. Not a user-facing issue — the dropdown shows "DENT D690" as the label.
- **"JWO" jargon** in manufacturing sheet: This is standard industry terminology that shop workers understand. Decided not to change based on user context (construction workers know "JWO = Job Work Order").
