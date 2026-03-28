# Plan: Draft Mode, Save Progress & Partial Checkout with Pick Indicators

**Created:** 2026-03-28
**Status:** Implemented
**Request:** Add draft saving for BOMs and fab items, enable partial checkout across sessions, and add clear pick indicators for the foreman.

---

## Overview

### What This Plan Accomplishes

Three connected improvements that let users work across multiple sessions: (1) "Save as Draft" option during BOM and door sheet creation so work isn't lost, (2) partial checkout where the foreman taps circle checkboxes to mark items as picked and checks out only what he's pulled, returning the next day for the rest, (3) clear visual indicators showing picked vs. outstanding vs. already-checked-out items.

### Why This Matters

Real jobs don't happen in one sitting. The SM writes a BOM during lunch but gets called to a site — he needs to save and finish later. The foreman pulls half the material on Monday, the rest on Tuesday. Right now, everything is all-or-nothing. These changes match how the shop actually works.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Pick indicator UX — circle checkboxes matching Things 3 pattern already used in live-item-feed. Clear 3-state visual (empty/picking/done). |
| `engineering-skills` | Architecture — no schema changes needed for partial checkout (qtyCheckedOut is already cumulative). Draft BOMs use existing DRAFT status. Fab items need DRAFT added to AssemblyStatus enum. |

### How Skills Shaped the Plan

The frontend skill confirmed the existing circle-checkbox pattern from `live-item-feed.tsx` should be reused for pick indicators — foreman taps the circle to mark an item as "picking this trip." The engineering skill identified that partial checkout already works at the data level (qtyCheckedOut accumulates across sessions) — the gap is purely UI. Draft BOM status already exists; fab items need a schema addition.

---

## Current State

### Relevant Existing Structure

| File | Current Behavior |
|------|-----------------|
| `src/components/bom/bom-photo-capture.tsx` | Photo BOMs submit directly → PENDING_REVIEW. No "Save as Draft" option. |
| `src/app/boms/[id]/page.tsx` | Checkout has "Check Out All" (everything at once) or "Adjust & Check Out" (manual qty per item). No pick checkboxes. |
| `src/components/bom/bom-line-item-row.tsx` | Shows "12/20 ft pulled" text but no tappable pick indicator. |
| `src/components/bom/checkout-all-button.tsx` | Checks out ALL remaining items in one click. |
| `src/components/doors/door-creation-flow.tsx` | Doors submit directly → AWAITING_APPROVAL. No save-as-draft. |
| `prisma/schema.prisma` | BomStatus has DRAFT. AssemblyStatus does NOT have DRAFT. |
| BomLineItem schema | `qtyCheckedOut` accumulates across sessions (already supports multi-day checkout). |

### Gaps Being Addressed

1. **No way to save partial BOM creation** — if you close the browser mid-review, everything is lost
2. **No way to save a draft door sheet** — must complete the entire flow in one sitting
3. **Checkout is visually unclear** — no pick checkboxes, no distinction between "picking now" vs "already pulled" vs "still needed"
4. **"Check Out All" is the wrong default** — implies everything ships at once, but jobs often need partial fulfillment

---

## Proposed Changes

### Summary of Changes

- **BOM Creation**: Add "Save as Draft" button alongside "Create BOM" on photo capture review
- **BOM Draft Editing**: Draft BOMs are editable from the BOM detail page — resume adding/removing items
- **Fab Draft**: Add DRAFT to AssemblyStatus enum; add "Save as Draft" to door creation flow
- **Checkout Pick UI**: Replace "Check Out All" with a pick-and-checkout workflow:
  - Circle checkboxes on each line item (tap to mark as picking)
  - 3 visual states: empty (not picked), blue ring (picking this trip), green filled (already checked out)
  - "Check Out X Items" button shows count of picked items
  - Progress bar per item showing picked/needed ratio
- **Multi-session checkout**: Already works via qtyCheckedOut — just needs better visual feedback on return visits

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/bom/pick-checkout-section.tsx` | New checkout UI with pick checkboxes and "Check Out Picked" button |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `prisma/schema.prisma` | Add DRAFT to AssemblyStatus enum |
| `src/components/bom/bom-photo-capture.tsx` | Add "Save as Draft" button alongside "Create BOM" |
| `src/app/api/boms/route.ts` | Accept `status: "DRAFT"` from creation (currently forces PENDING_REVIEW for photo BOMs) |
| `src/app/boms/[id]/page.tsx` | Replace checkout section with PickCheckoutSection; add "Resume Editing" for draft BOMs |
| `src/components/bom/bom-line-item-row.tsx` | Add pick circle checkbox in checkout mode; 3-state visual |
| `src/components/doors/door-creation-flow.tsx` | Add "Save as Draft" button on confirmation step |
| `src/app/api/assemblies/route.ts` | Support DRAFT status for new assemblies |
| `src/app/assemblies/[id]/page.tsx` | Show "Resume Editing" for draft assemblies |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Pick state is session-local (not persisted)**: When the foreman opens a BOM to check out, he taps items he's about to pull. This "picking" state lives in React state only — it doesn't need to be saved to the database. When he confirms, `qtyCheckedOut` is updated (persisted). Next visit, he sees what's remaining.

2. **3-state circle checkbox**: Matches the existing Things 3 pattern from live-item-feed:
   - **Empty circle** — not yet picked, still needed
   - **Blue ring with check** — selected for checkout this trip
   - **Green filled with check** — fully checked out (qtyCheckedOut >= qtyNeeded)
   - **Partial progress bar** — shows qtyCheckedOut/qtyNeeded when partially fulfilled

3. **"Save as Draft" saves to server, not localStorage**: Draft BOMs are real database records with DRAFT status. This means they persist across devices and browsers — the SM can start on his phone and finish on the tablet.

4. **"Check Out Picked" replaces "Check Out All"**: The primary action button only checks out items the foreman has explicitly picked. "Check Out All Remaining" becomes a secondary option for when everything ships at once.

5. **Draft assemblies use DRAFT status**: Adding DRAFT to AssemblyStatus enum. Draft doors don't appear in the approval queue — they're only visible to the creator until submitted.

6. **Panel checkboxes are auto-state**: Panels show a circle checkbox but it's not tappable — it auto-fills to green once the panel checkout sheet is completed (qtyCheckedOut > 0). The foreman must go through the panel checkout sheet first; the checkbox just reflects that state.

### Alternatives Considered

1. **localStorage for draft persistence**: Rejected — data loss on device switch, no recovery after cache clear. Server-side drafts are more reliable and match multi-device usage.

2. **Separate "pick list" entity**: Rejected — over-engineering. The existing qtyCheckedOut field already tracks cumulative checkout. The pick state is transient (this session only).

3. **Auto-save drafts**: Considered for future — auto-save BOM edits every 30 seconds. Deferred to avoid complexity. Explicit "Save as Draft" button is sufficient for now.

### Open Questions

None — all resolved:

1. **Draft BOM re-editing**: BOM detail edit mode. Photo processing is done — user just adjusts items. **Decided.**

2. **Draft door re-editing**: Editable spec sheet (door-confirmation component). Wizard steps already completed. **Decided.**

3. **Panel pick indicators**: Panels DO get a circle checkbox, but it's read-only until the panel checkout sheet is completed. Once the panel checkout sheet is done (qtyCheckedOut > 0), the circle auto-fills to green. The foreman can't manually check it — it reflects the panel checkout sheet's state. **Decided.**

---

## Step-by-Step Tasks

### Step 1: Add DRAFT to AssemblyStatus Enum

Add DRAFT status for assemblies so door sheets can be saved as drafts.

**Actions:**
- Add `DRAFT` to `AssemblyStatus` enum in `prisma/schema.prisma` (before PLANNED)
- Run schema push via Supabase SQL

**Files affected:**
- `prisma/schema.prisma`

---

### Step 2: Add "Save as Draft" to BOM Photo Capture

Add a secondary button on the BOM creation review screen.

**Actions:**
- In `bom-photo-capture.tsx`, add "Save as Draft" button next to "Create BOM"
- "Save as Draft" calls the same `/api/boms` endpoint but with `status: "DRAFT"` instead of auto-assigning PENDING_REVIEW
- Show toast: "BOM saved as draft"
- Redirect to `/boms` list (draft BOM appears with DRAFT badge)

**Files affected:**
- `src/components/bom/bom-photo-capture.tsx`
- `src/app/api/boms/route.ts` (accept optional `status` field, default to existing behavior)

---

### Step 3: Add "Save as Draft" to Door Creation Flow

Add a secondary button on the door confirmation step.

**Actions:**
- In `door-creation-flow.tsx`, add "Save as Draft" button on the CONFIRM phase
- Creates assembly with `status: "DRAFT"` and `approvalStatus: "NOT_REQUIRED"` instead of AWAITING_APPROVAL
- Show toast: "Door sheet saved as draft"
- Redirect to `/assemblies` list or back to BOM if `fromBomId` is set
- Update `/api/assemblies` to accept DRAFT status

**Files affected:**
- `src/components/doors/door-creation-flow.tsx`
- `src/app/api/assemblies/route.ts`

---

### Step 4: Draft BOM Editing from Detail Page

Allow users to resume editing a draft BOM.

**Actions:**
- On BOM detail page, when status is DRAFT:
  - Show "Resume Editing" button (primary) and "Submit for Review" button
  - "Resume Editing" enters edit mode (existing functionality)
  - "Submit for Review" changes status to PENDING_REVIEW
  - Show edit/remove controls on line items
- Draft BOMs show "DRAFT" badge on the BOM list
- Add "Add item from catalog" search on draft BOM detail

**Files affected:**
- `src/app/boms/[id]/page.tsx`

---

### Step 5: Create Pick Checkout UI

Build the new checkout experience with pick indicators.

**Design:**
- Each line item row gets a tappable circle checkbox on the left (44px touch target)
- **3 states per item:**
  - Empty gray circle — needs picking, not selected yet
  - Blue circle with check — selected for checkout this trip
  - Green filled circle with check — fully checked out (all sessions combined)
  - For partially checked out items: show progress ring (arc showing qtyCheckedOut/qtyNeeded)
- Tapping an unpicked item:
  - Marks it as "picking" (blue state)
  - Auto-fills checkout quantity with remaining amount (qtyNeeded - qtyCheckedOut)
  - Quantity is editable (can pick less than remaining)
- Tapping a "picking" item: deselects it
- Bottom bar shows: "Check Out X Items" with total count of picked items
- Secondary action: "Select All Remaining" to pick everything at once

**Actions:**
- Create `src/components/bom/pick-checkout-section.tsx`
- Component manages local pick state (Record<lineItemId, pickQty>)
- Renders pick circles on each line item
- "Check Out Picked" button calls existing checkout API with only picked items
- After checkout: picked items transition to green, remaining stay empty

**Files affected:**
- `src/components/bom/pick-checkout-section.tsx` (new)
- `src/app/boms/[id]/page.tsx` (integrate)

---

### Step 6: Update BOM Detail Page with Pick Checkout

Replace the current checkout UI with the new pick-based checkout.

**Actions:**
- For APPROVED and IN_PROGRESS BOMs:
  - Replace "Check Out All" + "Adjust & Check Out" with PickCheckoutSection
  - Show progress summary: "8 of 14 items fulfilled" or "First checkout"
  - Each line item shows its pick state and fulfillment progress
- For IN_PROGRESS BOMs (return visit):
  - Items already fully checked out show green circles
  - Partially checked out items show progress + remaining qty
  - New items (added via "Add Material") show empty circles
- Keep "Return" flow unchanged (separate mode)
- Keep "Mark Completed" unchanged

**Files affected:**
- `src/app/boms/[id]/page.tsx`
- `src/components/bom/bom-line-item-row.tsx` (add pick circle variant)

---

### Step 7: Validate and QA

**Actions:**
- TypeScript check
- Token audit
- Test scenarios:
  - Create photo BOM → Save as Draft → Reopen → Edit → Submit for Review
  - Create door sheet → Save as Draft → Reopen → Submit for Approval
  - Open approved BOM → Pick 3 of 10 items → Check out picked → Close
  - Reopen same BOM → See 3 green, 7 empty → Pick 4 more → Check out
  - Verify panel items show read-only circle, auto-green after panel checkout sheet done

---

## Connections & Dependencies

### Files That Reference This Area

- `src/hooks/use-boms.ts` — BOM mutation hooks (may need `status` param for draft creation)
- `src/components/bom/checkout-all-button.tsx` — will be replaced by PickCheckoutSection
- `src/app/api/boms/[id]/checkout/route.ts` — checkout API (no changes needed — already accepts per-item quantities)
- `src/components/bom/bom-status-badge.tsx` — already renders DRAFT badge

### Updates Needed for Consistency

- BOM list should show draft BOMs with DRAFT badge (already works)
- Assembly list should show draft doors (filter update needed)
- Dashboard alerts might need to exclude drafts

### Impact on Existing Workflows

- **BOM creation**: New option (Save as Draft) alongside existing "Create BOM" — no breaking change
- **Door creation**: New option (Save as Draft) alongside existing "Submit for Approval" — no breaking change
- **Checkout**: Replaces "Check Out All" with pick-and-checkout — better UX, same underlying API
- **Returns**: Unchanged
- **Panel checkout**: Unchanged (separate specialized flow)

---

## Validation Checklist

- [ ] Photo BOM can be saved as draft and reopened for editing
- [ ] Door sheet can be saved as draft and reopened
- [ ] Draft BOMs show DRAFT badge on list and detail pages
- [ ] Draft assemblies don't appear in approval queue
- [ ] Pick checkboxes show on checkout-ready BOM line items
- [ ] 3 visual states work: empty (needed), blue (picking), green (done)
- [ ] Partial checkout works: pick 3 items, check out, come back, see progress
- [ ] "Select All Remaining" picks all unfulfilled items
- [ ] Panel items show read-only circle that auto-fills green after panel checkout sheet completed
- [ ] TypeScript compiles cleanly
- [ ] Token audit passes

---

## Success Criteria

1. A SM can save a half-finished BOM as a draft and return to it later
2. A SM can save a half-finished door sheet as a draft
3. A foreman can tap circle checkboxes to mark items as picked, checkout only those items, and return the next day to pick the rest
4. The checkout screen clearly shows what's been picked (green) vs. still needed (empty) vs. being picked now (blue)
5. Panel items show auto-state checkbox (green after panel checkout sheet is completed)

---

## Notes

- The `qtyConsumed` field on BomLineItem is currently unused — could be repurposed for "pick quantity this session" if we ever need server-side pick persistence. For now, session-local state is sufficient.
- Future enhancement: auto-save drafts (periodic save without explicit button tap). Deferred for simplicity.
- Future enhancement: draft collaboration — multiple users editing the same draft BOM. Not needed now (single-user per BOM).
- The `CheckoutAllButton` component can be kept as a "Select All Remaining" utility within the new PickCheckoutSection rather than being deleted.
