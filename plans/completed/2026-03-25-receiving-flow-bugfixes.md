# Plan: Receiving Flow Bug Fixes

**Created:** 2026-03-25
**Status:** Implemented
**Request:** Fix voided receipts not resetting PO status, 0-item receipt submissions, and bottom nav gap

---

## Overview

### What This Plan Accomplishes

Fixes three production bugs in the receiving module: (1) voiding a receipt now reliably resets PO line item `qtyReceived` and recalculates PO status, (2) prevents submitting empty receipts and shows "All items received" state for fully-received POs, (3) adds safe area fallback to the bottom nav for Safari.

### Why This Matters

These bugs break the core receiving workflow — Gabe received 25 of 25 items on a PO, the system created a receipt with 0 items, and voiding didn't reset the PO. This means inventory counts are wrong and POs show incorrect status. Daily operations depend on this working correctly.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `engineering-skills` (backend) | Confirmed the void API's line item matching approach needs a more robust strategy — should use the receipt's own transaction records as the source of truth rather than fuzzy matching |
| `design-inspiration` | Confirmed "All items received" empty state should be a simple info card with check icon, no redesign needed |

### How Skills Shaped the Plan

The backend skill's key insight: the void API tries to match receipt transactions to PO line items by productId, then by name, then by any-with-received-qty. This fuzzy cascade can fail. Instead, we should store the `poLineItemId` directly on each receipt transaction during creation, so void can use an exact match. This requires a small schema addition but eliminates all matching ambiguity.

---

## Current State

### Relevant Existing Structure

- `src/app/api/receiving/route.ts` — Receipt creation: increments PO line item `qtyReceived`, sets PO status
- `src/app/api/receiving/[id]/route.ts` — Void receipt: reverses stock, attempts to decrement PO line items via fuzzy matching
- `src/components/receiving/po-receive-card.tsx` — PO receive UI: initializes quantities as `max(0, ordered - received)`, button disabled at 0
- `src/components/receiving/receiving-flow.tsx` — Flow orchestration: `handleSubmitReceipt` filters by `productId` for count
- `src/components/receiving/receipt-summary.tsx` — Pre-submit review: Confirm button NOT disabled at 0 items
- `src/components/layout/bottom-nav.tsx` — Fixed bottom nav with safe area padding

### Gaps or Problems Being Addressed

1. **Void doesn't reliably reset PO qtyReceived**: Fuzzy matching between receipt transactions and PO line items fails for header-level POs. Even when it matches, the PO may have multiple line items and the decrement goes to the wrong one.

2. **0-item receipts can be submitted**: `handleSubmitReceipt` filters `confirmedItems` by `productId || isPanelBreakout`, but PO receive items from header-level POs (without line-item-level product matching) may not have `productId` set. Also, `receipt-summary.tsx` doesn't disable Confirm at 0 items.

3. **Bottom nav gap**: `pb-[env(safe-area-inset-bottom)]` has no fallback — returns 0px on browsers that don't support the CSS env var.

---

## Proposed Changes

### Summary of Changes

- Fix void API to use receipt item data directly for PO line item decrement (not fuzzy matching)
- Fix `handleSubmitReceipt` to count all confirmed items, not just those with `productId`
- Add 0-item guard in receipt-summary.tsx Confirm button
- Add "All items received" state in po-receive-card.tsx when all quantities are 0
- Add API-level rejection of 0-item receipts
- Fix bottom nav safe area fallback

### New Files to Create

None.

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `src/app/api/receiving/[id]/route.ts` | Rewrite PO line item decrement to use receipt's stored poLineItemId on each transaction item, falling back to current matching logic |
| `src/app/api/receiving/route.ts` | Store `poLineItemId` on receipt transactions; reject 0-item receipts |
| `src/components/receiving/receiving-flow.tsx` | Fix item count in toast to use `confirmedItems.length`; prevent submit when 0 items |
| `src/components/receiving/receipt-summary.tsx` | Disable Confirm button when 0 items |
| `src/components/receiving/po-receive-card.tsx` | Show "All items received" state when all quantities are 0 |
| `src/components/layout/bottom-nav.tsx` | Add safe area fallback: `pb-[max(0.5rem,env(safe-area-inset-bottom))]` |

---

## Design Decisions

### Key Decisions Made

1. **Store poLineItemId on receipt items**: During receipt creation, when `poLineItemUpdates` are provided, we store the `poLineItemId` on the corresponding stock transaction. This gives void an exact match instead of fuzzy matching. The matching between receipt items and PO line items is already done on the frontend (po-receive-card maps each item to its `poLineItemId`) — we just need to persist it.

2. **API-level 0-item rejection**: Add a check in the receipt creation API to reject requests with 0 resolved items. This is a safety net — the UI should prevent it, but the API should enforce it too.

3. **"All items received" state**: When a PO's quantities all initialize to 0 (fully received), show an info card instead of the empty receive form. This prevents confusion about why Confirm says "0 items".

4. **Keep backward compatibility**: The void API's current fuzzy matching stays as a fallback for receipts created before the `poLineItemId` storage. New receipts will have exact matching.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Fix Receipt Creation — Store poLineItemId, Reject 0 Items

**Actions:**

- In `src/app/api/receiving/route.ts`:
  - Add validation: if `resolvedItems.length === 0`, return 400 error "No items to receive"
  - When creating stock transactions in `adjustStock`, pass a `metadata` or `notes` field that includes the `poLineItemId` so void can trace back
  - OR better: add `poLineItemId` to the receipt item creation. Check if the schema has a field for this on StockTransaction.

- Check the Prisma schema for StockTransaction to see available fields for storing poLineItemId linkage.

**Files affected:**
- `src/app/api/receiving/route.ts`
- Possibly `prisma/schema.prisma` if we need to add a field

---

### Step 2: Fix Void API — Reliable PO Line Item Decrement

**Actions:**

- In `src/app/api/receiving/[id]/route.ts`:
  - After loading the receipt, also load the receipt's items (the actual Receipt → ReceiptItem or StockTransaction records)
  - For each item being reversed, use the stored `poLineItemId` for exact matching
  - Fall back to current fuzzy matching logic for legacy receipts without stored `poLineItemId`
  - Add logging/error handling if no matching PO line item is found
  - Verify the PO status recalculation includes the `OPEN` case (currently does: lines 125-134)

**Files affected:**
- `src/app/api/receiving/[id]/route.ts`

---

### Step 3: Fix Frontend — Item Count and Submit Guard

**Actions:**

- In `src/components/receiving/receiving-flow.tsx`:
  - Change toast on line 302 from `catalogItems.length` to `confirmedItems.length`
  - Add guard before `createReceipt.mutateAsync`: if `confirmedItems.length === 0`, show error toast and return early

- In `src/components/receiving/receipt-summary.tsx`:
  - Add `disabled={items.length === 0}` to the Confirm Receipt button (line ~223)
  - When `items.length === 0`, show a warning message instead of the button

**Files affected:**
- `src/components/receiving/receiving-flow.tsx`
- `src/components/receiving/receipt-summary.tsx`

---

### Step 4: Add "All Items Received" State

**Actions:**

- In `src/components/receiving/po-receive-card.tsx`:
  - After calculating `itemsToReceiveCount` (line 104), check if ALL line items have `qtyReceived >= qtyOrdered`
  - If true, render an "All items on this PO have been received" info card with a CheckCircle icon, instead of the line item list and confirm button
  - The user can still go "Back to PO selection" to choose a different PO

**Files affected:**
- `src/components/receiving/po-receive-card.tsx`

---

### Step 5: Fix Bottom Nav Safe Area

**Actions:**

- In `src/components/layout/bottom-nav.tsx`:
  - Change `pb-[env(safe-area-inset-bottom)]` to `pb-[max(0.5rem,env(safe-area-inset-bottom))]`
  - This ensures at least 8px padding even if the browser doesn't support the CSS env var

**Files affected:**
- `src/components/layout/bottom-nav.tsx`

---

### Step 6: QA

**Actions:**

- `npx tsc --noEmit` — zero errors
- `npx tsx scripts/token-audit.ts` — zero warnings
- Verify: Cannot submit a receipt with 0 items (API returns 400)
- Verify: Toast shows correct item count after receiving
- Verify: Fully-received PO shows "All items received" state
- Verify: Voiding a receipt resets PO line item qtyReceived
- Verify: PO status changes from CLOSED back to OPEN/PARTIALLY_RECEIVED after void
- Verify: Bottom nav has padding on all devices

**Files affected:**
- All modified files

---

## Connections & Dependencies

### Files That Reference This Area

- `src/hooks/use-receiving.ts` — Query invalidation after receipt creation/void
- `src/components/receiving/receipt-history.tsx` — Displays voided receipts
- `src/app/receiving/page.tsx` — Hosts the receiving flow

### Updates Needed for Consistency

- If a `poLineItemId` field is added to StockTransaction, need `prisma generate` and `prisma db push`

### Impact on Existing Workflows

- Receipt creation: now rejects 0-item submissions (prevents bad data)
- Void: more reliable PO status reset (fixes the core bug)
- PO receive: shows informative state for fully-received POs instead of confusing 0-item form

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] Token audit: 0 errors, 0 warnings
- [ ] API rejects receipt with 0 items (400 response)
- [ ] Toast shows correct count after successful receive
- [ ] Confirm Receipt button disabled when 0 items (receipt-summary)
- [ ] "All items received" state shown for fully-received POs
- [ ] Void receipt resets PO line item qtyReceived to 0
- [ ] PO status changes from CLOSED to OPEN after void
- [ ] Bottom nav has visible padding on Safari iOS
- [ ] Existing receipts (without poLineItemId) can still be voided via fallback matching

---

## Success Criteria

The implementation is complete when:

1. Voiding a receipt reliably resets PO line item quantities and PO status — a voided receipt's PO goes back to OPEN or PARTIALLY_RECEIVED
2. It is impossible to create a receipt with 0 items — both UI and API prevent it
3. Navigating to a fully-received PO shows "All items received" instead of a 0-qty receive form
4. The toast after receiving shows the actual number of items received, not 0
5. Bottom nav sits flush against the bottom of the screen on all iOS Safari devices

---

## Notes

- The `poLineItemId` storage on StockTransaction may require a schema migration. Check if there's an existing `metadata` JSON field or `notes` string that can hold this temporarily. If not, a nullable `poLineItemId` field is cleaner but requires `prisma db push`.
- The receiving flow has complex panel breakout logic. This plan doesn't touch that — only the standard item flow and the void/status logic.
- Consider adding a "Re-receive" button on voided receipts in receipt history — this would pre-populate the receive form with the voided receipt's items. Future enhancement, not in this plan.
