# Plan: BOM Module UX Fixes (7 Issues)

**Created:** 2026-03-13
**Status:** Draft
**Request:** Fix 7 UX issues in the BOM module identified through hands-on user testing

---

## Overview

### What This Plan Accomplishes

Fixes 7 usability issues in the BOM detail page, return flow, checkout flow, panel checkout, and BOM creation. These are all real-world friction points discovered through hands-on testing of the BOM module.

### Why This Matters

The BOM module is a core daily-use workflow. These issues create confusion (seeing "5 remaining" when panels are fulfilled by sq ft), lost work (navigating away loses a BOM in progress), and friction (manual number entry for returns, no "Return All" option, checkout confirmation buried inline).

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `rsne-inventory/src/app/boms/[id]/page.tsx` | BOM detail — view, edit, checkout, return modes |
| `rsne-inventory/src/components/bom/bom-line-item-row.tsx` | Row component — renders in view/edit/checkout/return modes |
| `rsne-inventory/src/components/bom/checkout-all-button.tsx` | Inline confirmation card for bulk checkout |
| `rsne-inventory/src/components/bom/panel-checkout-sheet.tsx` | Panel checkout bottom sheet with brand/height breakout |
| `rsne-inventory/src/app/api/boms/[id]/panel-checkout/route.ts` | Panel checkout API — validates by panel count |
| `rsne-inventory/src/app/boms/new/page.tsx` | New BOM creation (manual tab) |
| `rsne-inventory/src/components/bom/bom-ai-flow.tsx` | New BOM creation (AI tab) |

### Gaps or Problems Being Addressed

1. No "Return All" button — user must enter return qty for every item manually
2. Return quantities use raw number input — should use +/- stepper defaulting to outstanding amount
3. Navigating away from BOM creation loses all work with no warning
4. "Add Additional Items" flow is confusing — doesn't support non-catalog items or voice input well
5. Panel checkout counts by panel qty, not sq ft equivalence — 5×20' panels should satisfy 10×10' panels
6. Checkout confirmation is an inline card below the list, not a centered scrollable modal
7. Return option appears immediately after first partial checkout — should only appear after all items have been checked out

---

## Proposed Changes

### Summary of Changes

- Add "Return All" button at top of return mode that pre-fills all items to max outstanding
- Replace return qty input with +/- stepper, default to outstanding amount, cap at outstanding
- Add `beforeunload` + Next.js route-change interception on BOM creation pages
- Redesign "Add Additional Items" as a plus button below existing items, with catalog search + voice + non-catalog pills
- Change panel fulfillment check from panel count to sq ft equivalence — show "Fulfilled" badge in green
- Convert CheckoutAllButton from inline Card to centered Dialog modal with scrollable content
- Only show "Return Material" button when ALL line items have qtyCheckedOut > 0

### Files to Modify

| File | Changes |
|------|---------|
| `boms/[id]/page.tsx` | Add "Return All" prefill logic, wire stepper callbacks, update return visibility condition, replace add-material mode UI, update panel remaining display |
| `bom-line-item-row.tsx` | Replace return mode `<Input>` with +/- stepper component, default qty to outstanding |
| `checkout-all-button.tsx` | Convert from inline Card to Dialog modal, add scroll, center on screen |
| `panel-checkout-sheet.tsx` | Add sq ft equivalence validation alongside panel count |
| `panel-checkout/route.ts` | Accept sq ft-based fulfillment (don't reject when panel count < needed but sq ft is met) |
| `boms/new/page.tsx` | Add unsaved changes warning on navigation |
| `bom-ai-flow.tsx` | Add unsaved changes warning on navigation |

### Files to Create

None — all changes are modifications to existing files.

---

## Design Decisions

### Key Decisions Made

1. **Return stepper defaults to outstanding qty, not zero**: User's most common action is returning everything they checked out. Starting at max and letting them minus down is fewer taps than starting at zero and plussing up.

2. **"Return All" pre-fills all items to max**: One tap to return everything, then adjust individual items if needed. Mimics the "Check Out All" pattern.

3. **Panel fulfillment by sq ft, not panel count**: The BOM specifies panels by cut length. If 10×10' panels = 3,667 sq ft needed, then 5×20' panels = 3,667 sq ft satisfies the requirement. The API should track both panel count and sq ft fulfillment.

4. **Return only after all items touched**: If any item has `qtyCheckedOut === 0`, the BOM hasn't been fully checked out yet. Return should only appear when every item has some checkout activity, matching Gabe's mental model of "return after the BOM's been checked out."

5. **Checkout confirmation as Dialog, not inline Card**: Dialogs are the established pattern for confirmations in this app (approve, cancel, complete all use Dialog). Checkout should match.

6. **Nav-away uses both `beforeunload` and router interception**: `beforeunload` catches browser back/refresh. Next.js `router.events` or a custom hook catches in-app navigation. Both save as draft if user confirms.

7. **Add Additional Items keeps it simple**: Plus button → inline form below existing items with three pills: catalog search text input (with mic icon inside), "Add Panel" pill, "Non-Catalog Item" pill. Matches the manual entry page pattern.

### Alternatives Considered

- **Draft auto-save on timer**: Rejected — too complex, might save incomplete BOMs. Prompt on nav-away is simpler and matches user expectation.
- **Panel fulfillment as a separate "sq ft mode"**: Rejected — sq ft equivalence should be automatic. The system should always check both panel count and sq ft.
- **Showing return after a time delay**: Rejected — arbitrary. "All items have checkout activity" is a clear, deterministic rule.

---

## Step-by-Step Tasks

### Step 1: Return All Button + Stepper UI

Add a "Return All" button at the top of return mode and replace the number input with +/- stepper buttons.

**Actions:**

- In `boms/[id]/page.tsx`:
  - Add a `handleReturnAllPrefill()` function that sets `returnQtys` for every item to its outstanding amount (`qtyCheckedOut - qtyReturned`)
  - Add a "Return All" button in the return mode header area (next to "Return Material" heading)
  - When tapped, pre-fills all return quantities to max outstanding

- In `bom-line-item-row.tsx` return mode section (lines 114-149):
  - Replace `<Input type="number">` with a +/- stepper: `[−]  {qty}  [+]`
  - Default `returnQty` to outstanding amount (passed from parent via pre-fill or prop)
  - Minus button decrements by 1 (or appropriate step), floor at 0
  - Plus button increments by 1, ceiling at outstanding amount
  - Display current value between buttons (not editable text input)
  - Keep the unit label to the right

**Files affected:**
- `rsne-inventory/src/app/boms/[id]/page.tsx`
- `rsne-inventory/src/components/bom/bom-line-item-row.tsx`

---

### Step 2: Checkout Confirmation Modal

Convert the `CheckoutAllButton` from an inline Card to a centered Dialog modal.

**Actions:**

- In `checkout-all-button.tsx`:
  - Replace the `Card` confirmation view with `Dialog` / `DialogContent` / `DialogHeader` / `DialogFooter`
  - Keep the same content (item list with quantities)
  - Make the item list scrollable with `max-h-[60vh] overflow-y-auto`
  - Center on screen (Dialog does this by default)
  - Keep the same button pattern: Confirm + Cancel
  - Keep the `PackageCheck` icon in the trigger button

**Files affected:**
- `rsne-inventory/src/components/bom/checkout-all-button.tsx`

---

### Step 3: Panel Sq Ft Equivalence

Fix panel checkout to recognize sq ft equivalence and show "Fulfilled" when total sq ft is met.

**Actions:**

- In `boms/[id]/page.tsx` panel button section (lines 491-508):
  - Calculate `neededSqFt` from `panelSpecs.cutLengthFt × panelSpecs.widthIn/12 × qtyNeeded`
  - Fetch actual checked-out sq ft from transaction history OR calculate from the checkout records
  - If `checkedOutSqFt >= neededSqFt`, show a green "Fulfilled" badge instead of "Check Out Panels (X remaining)"
  - If partially fulfilled by sq ft but not by panel count, show remaining in sq ft terms

- In `panel-checkout/route.ts`:
  - Add sq ft equivalence check: if `totalBreakoutSqFt >= remainingSqFt`, allow checkout even if panel count differs
  - Update `bomLineItem.qtyCheckedOut` to reflect fulfillment status properly
  - Consider adding a `sqFtCheckedOut` tracking field or computing from transactions

- In `panel-checkout-sheet.tsx`:
  - Update the running total to show sq ft comparison: "X sq ft of Y sq ft needed"
  - Change validation from `totalPanels > remaining` to `totalSqFt > remainingSqFt`
  - Show green when sq ft target is met regardless of panel count

**Files affected:**
- `rsne-inventory/src/app/boms/[id]/page.tsx`
- `rsne-inventory/src/app/api/boms/[id]/panel-checkout/route.ts`
- `rsne-inventory/src/components/bom/panel-checkout-sheet.tsx`

---

### Step 4: Nav-Away Draft Save Warning

Add unsaved changes detection and prompt on BOM creation pages.

**Actions:**

- Create a reusable `useUnsavedChanges` hook or inline the logic:
  - `beforeunload` event listener when form has unsaved data
  - Next.js App Router doesn't have `router.events` — use `window.onbeforeunload` for browser navigation + a custom approach for in-app links
  - For in-app navigation: intercept link clicks within the layout, or use a `NavigationGuard` component that wraps the page

- In `bom-ai-flow.tsx`:
  - Track `hasUnsavedChanges` = `confirmedItems.length > 0 || pendingMatches.length > 0`
  - Add `beforeunload` listener when `hasUnsavedChanges` is true
  - On attempted nav-away, show Dialog: "Save BOM as draft?" with Save Draft / Discard / Cancel
  - "Save Draft" creates the BOM with status DRAFT and navigates to the target
  - "Discard" navigates without saving

- In `boms/new/page.tsx` (ManualBomForm):
  - Track `hasUnsavedChanges` = `lineItems.length > 0 || jobName.trim() !== ""`
  - Same pattern: `beforeunload` + Dialog prompt
  - "Save Draft" creates BOM as DRAFT

**Files affected:**
- `rsne-inventory/src/components/bom/bom-ai-flow.tsx`
- `rsne-inventory/src/app/boms/new/page.tsx`

---

### Step 5: Add Additional Items Redesign

Simplify the "Add Additional Items" flow on the BOM detail page.

**Actions:**

- In `boms/[id]/page.tsx`:
  - Remove the current `add-material` mode top section (lines 399-424)
  - Replace with a simpler inline form that appears BELOW the existing item list:
    - A text input with mic icon inside (similar to AIInput but compact) for catalog search + voice
    - Two pill buttons below: "Add Panel" and "Non-Catalog Item"
    - "Non-Catalog Item" opens the same non-catalog form from manual entry (name, category, uom, qty, est cost)
  - The plus button in the header triggers this form to appear
  - AI-parsed results add directly to the BOM (existing `handleAIAddItems` logic)
  - Non-catalog items add directly to the BOM via `updateBom.mutateAsync`

- The flow should be:
  1. User taps "+" button or "Add Material" button
  2. Below the existing items, a compact input area appears:
     - Text input with mic icon for voice/catalog search
     - "Add Panel" pill | "Non-Catalog Item" pill below the input
  3. Catalog results add to BOM immediately
  4. Non-catalog form appears inline below when pill is tapped

**Files affected:**
- `rsne-inventory/src/app/boms/[id]/page.tsx`

---

### Step 6: Return Option Timing

Only show "Return Material" after all items have been checked out.

**Actions:**

- In `boms/[id]/page.tsx`:
  - Change the condition for showing the Return Material button
  - Current: `bom.status === "IN_PROGRESS" && hasOutstandingMaterial`
  - New: `bom.status === "IN_PROGRESS" && hasOutstandingMaterial && allItemsTouched`
  - Where `allItemsTouched` = every line item has `qtyCheckedOut > 0`
  - This means: you can't return until every item on the BOM has had at least some material checked out

**Files affected:**
- `rsne-inventory/src/app/boms/[id]/page.tsx`

---

### Step 7: Validation & Testing

Verify all 7 fixes work together.

**Actions:**

- Run `npm run build` in `rsne-inventory/` to catch type errors
- Test scenarios:
  - [ ] Return mode: "Return All" button pre-fills all items, stepper +/- works, can't exceed outstanding
  - [ ] Checkout confirmation: appears as centered modal, scrollable with many items
  - [ ] Panel checkout: 5×20' panels satisfies 10×10' requirement, shows "Fulfilled" in green
  - [ ] Nav-away: attempting to leave during BOM creation shows save/discard dialog
  - [ ] Add items: plus button shows inline form below items, catalog + voice + non-catalog all work
  - [ ] Return timing: Return button hidden until all items have been checked out at least partially
  - [ ] No regressions in existing checkout, approve, cancel, complete flows

**Files affected:**
- All modified files

---

## Connections & Dependencies

### Files That Reference This Area

- `rsne-inventory/src/hooks/use-boms.ts` — React Query hooks (no changes needed)
- `rsne-inventory/src/app/api/boms/[id]/checkout/route.ts` — Regular checkout API (no changes needed)
- `rsne-inventory/src/components/ai/ai-input.tsx` — AI input component (reused as-is)
- `rsne-inventory/src/lib/panels.ts` — Panel utility functions (may need new sq ft helper)

### Updates Needed for Consistency

- `context/project-status.md` — Add note about BOM UX fixes
- Panel fulfillment logic must be consistent between frontend display and API validation

### Impact on Existing Workflows

- Return flow changes are additive (stepper + Return All on top of existing)
- Checkout confirmation changes are visual only (same data, different container)
- Panel equivalence changes the fundamental fulfillment logic — need to ensure existing panel checkouts still display correctly
- Nav-away warning is new behavior — won't affect existing saved BOMs

---

## Validation Checklist

- [ ] Return All button pre-fills all return quantities
- [ ] +/- stepper works for returns, respects bounds
- [ ] Checkout confirmation renders as centered scrollable modal
- [ ] Panel checkout recognizes sq ft equivalence (5×20' = 10×10')
- [ ] "Fulfilled" badge shows green when sq ft target met
- [ ] Nav-away from BOM creation shows save/discard prompt
- [ ] beforeunload fires on browser back/refresh
- [ ] Add Additional Items shows below existing list with catalog + voice + non-catalog
- [ ] Non-catalog item form works in add-material mode
- [ ] Return button hidden until all items have checkout activity
- [ ] `npm run build` passes with no type errors
- [ ] Existing approve/cancel/complete dialogs unchanged

---

## Success Criteria

The implementation is complete when:

1. All 7 UX issues are resolved and the BOM module builds without errors
2. Panel checkout correctly shows "Fulfilled" when sq ft equivalence is met
3. Users cannot lose BOM work by accidentally navigating away

---

## Notes

- The panel sq ft equivalence (issue #5) is the most complex change — it touches the API validation logic and changes how fulfillment is calculated. This needs careful testing with real panel specs.
- The `beforeunload` approach for nav-away (issue #3) works for browser navigation but is limited for in-app routing in Next.js App Router. We may need a `NavigationGuard` pattern that intercepts `<Link>` clicks and `router.push()` calls.
- Issue #2 confirmed: if users need MORE material than what's on the BOM, they should use "Add Additional Items" to increase the BOM first, then check out. The return stepper caps at the outstanding amount.
