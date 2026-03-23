# Plan: BOM Workflow UX Fixes

**Created:** 2026-03-23
**Status:** Implemented
**Request:** Fix 4 BOM workflow UX issues — panel defaults, pending review editing, voice in edit mode, job messaging

---

## Overview

### What This Plan Accomplishes

Fixes 4 UX friction points in the BOM creation and editing workflow: (1) panels show editable width/profile/color defaults, (2) photo-created BOMs in PENDING_REVIEW can be edited, (3) edit mode gets voice/AI input matching add-material mode, (4) missing job selection gets a visible callout.

### Why This Matters

These are field-reported issues from the product owner. Each one causes confusion or blocks a workflow that should be frictionless. Construction workers shouldn't have to figure out why they can't edit a photo BOM, or wonder why voice works in one mode but not another.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Layout specs for panel editor expansion (width/profile row + color row), voice input helper text/placeholder copy, job callout style (inline banner, brand-orange), panel view-mode pills (brand-blue/10 badges) |
| `product-skills` (UX researcher) | Confirmed PENDING_REVIEW should be editable — it's a pre-approval state like DRAFT, blocking edits defeats the purpose. No risk to approval workflow. |

### How Skills Shaped the Plan

The frontend-design skill defined the exact layout for the panel editor expansion (two rows of dropdowns below the existing stepper controls) and specified the inline banner pattern for job messaging over alternatives like toast or modal. The product skill confirmed the PENDING_REVIEW edit permission change has zero risk — the approval gate is the real control point.

---

## Current State

### Relevant Existing Structure

| File | Current State |
|------|--------------|
| `src/components/bom/panel-dimension-editor.tsx` | Shows thickness (stepper) + cut length (ft/in). No width/profile/color. Uses off-brand `bg-blue-50 border-blue-200`. |
| `src/app/boms/[id]/page.tsx` | `canEdit` checks `["DRAFT", "APPROVED"]` — excludes PENDING_REVIEW. Edit mode shows only ProductPicker. Add-material mode shows AIInput + ProductPicker. Panel specs not shown in view mode. |
| `src/components/bom/bom-quick-pick.tsx` | No visual feedback when cart has items but no job selected. Only fails on submit with toast. |

### Gaps or Problems Being Addressed

1. **Panel specs incomplete** — Width, profile, color not editable on BOM detail; not visible in view mode
2. **PENDING_REVIEW blocks editing** — Photo BOMs can't be corrected before approval
3. **Edit mode lacks voice** — Two paths to add items act differently, confusing users
4. **Job required silently** — No indication a job is needed until form submission fails

---

## Proposed Changes

### Summary of Changes

- Extend PanelDimensionEditor with width, profile, color dropdowns + expanded onUpdate signature
- Add PENDING_REVIEW to canEdit status list
- Add AIInput + divider + ProductPicker to edit mode (matching add-material pattern)
- Add panel spec pills (width/profile/color) in view mode below panel items
- Add inline orange callout when cart has items but no job selected
- Replace off-brand blue-50/blue-200 colors with brand-blue tokens

### New Files to Create

None.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/bom/panel-dimension-editor.tsx` | Add width/profile/color dropdowns, extend interface and onUpdate, replace off-brand colors |
| `src/app/boms/[id]/page.tsx` | Add PENDING_REVIEW to canEdit, add AIInput to edit mode, add panel spec pills in view mode, update PanelDimensionEditor call with new props |
| `src/components/bom/bom-quick-pick.tsx` | Add job-required callout banner below JobPicker |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Width + Profile in one row, Color below**: Three dropdowns in a single row would be too cramped on mobile. Two + one stacks cleanly and keeps labels readable.
2. **Edit mode mirrors add-material exactly**: Same AIInput + divider + ProductPicker pattern, different placeholder text ("Add 10 sheets foam..." vs "Also grabbing 2 tubes caulk...") to match the edit context.
3. **Inline banner for job callout, not toast**: Toasts are transient and easy to miss. An inline banner persists and is spatially connected to the JobPicker. Orange color signals urgency without blocking.
4. **Panel spec pills in view mode only**: Not shown in edit (editor is open), checkout, or return modes to avoid clutter.

### Alternatives Considered

- **Toast for job messaging**: Rejected — too transient, user misses it while focused on product list
- **Separate "Panel Specs" card**: Rejected — over-designed for 3 small data points. Pills are lightweight.
- **Keep edit and add-material as separate experiences**: Rejected — user-reported confusion. Same capability, same UI.

### Open Questions

None — all decisions confirmed by product owner and skill outputs.

---

## Step-by-Step Tasks

### Step 1: Extend PanelDimensionEditor with Width/Profile/Color

Add 3 new optional props (widthIn, profile, color) with defaults. Extend onUpdate signature. Add Select dropdowns below cut length. Replace off-brand colors.

**Actions:**

- Add imports: `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from shadcn, `PANEL_PROFILES` from panels lib
- Add constants: `WIDTH_OPTIONS = [24, 30, 36, 40, 42, 44, 45, 46]`, `COLOR_OPTIONS = ["Igloo White", "White", "Regal White", ...]`
- Extend interface: add `widthIn?: number`, `profile?: string`, `color?: string` props with defaults 44, "Mesa", "Igloo White"
- Extend `onUpdate` signature: `(thickness, lengthFt, lengthIn, widthIn?, profile?, color?) => void`
- Collapsed state label: `{thickness}" × {display} · {widthIn}"w · {profile} · {color}`
- Expanded state: add Width + Profile row (`flex gap-2, each flex-1`) and Color row (full width) between Cut Length and Done button
- Replace `bg-blue-50 border border-blue-200` with `bg-brand-blue/10 border border-brand-blue/30` (2 occurrences: collapsed button + expanded container)
- All Select triggers: `h-10 bg-white`, matching existing stepper height

**Files affected:**
- `src/components/bom/panel-dimension-editor.tsx`

---

### Step 2: Update BOM Detail Page — Permissions, Voice, Panel Specs

Three changes in one file: canEdit fix, edit mode AIInput, panel view-mode pills, and updated PanelDimensionEditor call.

**Actions:**

- **Fix 2 (Permissions)**: Change `canEdit` from `["DRAFT", "APPROVED"]` to `["DRAFT", "PENDING_REVIEW", "APPROVED"]`
- **Fix 3 (Voice in edit mode)**: Replace the edit-mode block (lines 426-435) with the same pattern as add-material (lines 399-424) but with edit-context copy:
  - Mic icon + "Speak or type to add items" helper text
  - AIInput with placeholder `"Add 10 sheets foam and 2 boxes screws..."`
  - Divider with "or search catalog"
  - ProductPicker
- **Fix 1 (Panel spec pills in view mode)**: Before the panel dimension editor block, add a view-mode-only section showing width/profile/color as small pills: `bg-brand-blue/10 text-brand-blue font-medium rounded-md px-2 py-0.5`
- **Fix 1 (Updated editor call)**: Pass `widthIn`, `profile`, `color` props from specs to PanelDimensionEditor. Update onUpdate handler to include widthIn/profile/color in newSpecs.
- **Token cleanup**: Replace `bg-blue-50/30 border-t border-blue-100` on the panel editor wrapper with `bg-brand-blue/[0.04] border-t border-brand-blue/20`
- **Token cleanup**: Replace `text-gray-500` and `border-gray-200` and `text-gray-400` in the add-material section with design tokens

**Files affected:**
- `src/app/boms/[id]/page.tsx`

---

### Step 3: Add Job Required Callout to BomQuickPick

Show an inline orange banner when cart has items but no job is selected.

**Actions:**

- After the JobPicker closing tag (line 485), add a conditional block:
  ```tsx
  {!jobName && cart.length > 0 && (
    <div className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-orange/10 border border-brand-orange/20 animate-fade-in-up">
      <span className="text-brand-orange text-sm font-semibold">Select a job to create this BOM</span>
    </div>
  )}
  ```
- No import changes needed — all utilities already available

**Files affected:**
- `src/components/bom/bom-quick-pick.tsx`

---

### Step 4: Validation & QA

Type check, token audit, and UX verification.

**Actions:**

- Run `npx tsc --noEmit` — verify zero new errors
- Run `npx tsx scripts/token-audit.ts` — verify no new off-brand tokens in modified files
- Manual UX checklist on modified files:
  - All buttons/selects ≥ 44px touch target
  - No off-brand gray tokens
  - Panel editor collapsed/expanded states both render correctly
  - Voice input appears in edit mode
  - Job callout appears/disappears correctly
  - Panel spec pills visible in view mode, hidden in edit/checkout/return

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/api/boms/[id]/route.ts` — Server-side BOM update handler. The `updateLineItems` endpoint already supports `nonCatalogSpecs` updates, so the panel editor's save mechanism (direct fetch to PUT) will work without API changes.
- `src/lib/panels.ts` — Exports `PANEL_PROFILES` used by the editor.

### Updates Needed for Consistency

- The add-material mode's off-brand colors (`text-gray-500`, `border-gray-200`, `text-gray-400`) should be cleaned up as part of Step 2.

### Impact on Existing Workflows

- **No API changes** — all modifications are frontend-only
- **No database changes** — panel specs already stored as JSON blob
- **No breaking changes** — PanelDimensionEditor's new props are optional with defaults, so any existing callers still work
- **BOM approval flow unchanged** — PENDING_REVIEW still requires explicit approval to advance

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] Panel editor shows width/profile/color in expanded state
- [ ] Panel editor collapsed state shows full spec summary
- [ ] Panel spec pills visible in view mode for panel items
- [ ] BOMs in PENDING_REVIEW status can be edited
- [ ] Edit mode shows AIInput + divider + ProductPicker
- [ ] Job callout appears when cart > 0 and no job selected
- [ ] Job callout disappears when job is selected
- [ ] No off-brand gray tokens in modified files
- [ ] All interactive elements ≥ 44px touch target

---

## Success Criteria

The implementation is complete when:

1. **Panel items on any BOM show full specs** (width/profile/color) in both view and edit mode
2. **Photo-created BOMs can be edited** before approval, matching manual BOM behavior
3. **Edit mode has voice input** — identical capability to add-material mode
4. **Users see a clear callout** when they need to select a job before creating a BOM

---

## Notes

- The PanelDimensionEditor's extended onUpdate signature uses optional trailing params for backward compatibility. Existing callers that don't pass widthIn/profile/color will still work with defaults.
- The off-brand color cleanup in Step 2 is opportunistic — we're already editing those lines, so we fix the tokens while we're there.
- These fixes are all frontend/className changes with one small permission logic change (canEdit). Very low risk.

---

## Implementation Notes

**Implemented:** 2026-03-23

### Summary

All 4 fixes implemented, QA'd, and pushed.

### Deviations from Plan

None.

### Issues Encountered

None.
