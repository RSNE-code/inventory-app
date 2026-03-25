# Plan: BOM Material Checkout & Returns

**Created:** 2026-03-06
**Status:** Implemented
**Request:** Build the checkout and return flow so materials can be pulled from inventory against approved BOMs.

---

## Overview

### What This Plan Accomplishes

Adds the ability for the shop foreman to check out materials from inventory against an approved BOM, and return unused materials back. This closes the loop between BOMs and inventory — materials are deducted on checkout, credited on return, and the BOM tracks exactly what's been pulled and what's still needed.

### Why This Matters

Without checkout, BOMs are just shopping lists. With it, inventory stays accurate automatically. The foreman pulls materials, scans or taps what they took, and the system handles the rest. This is the core workflow that makes the app useful day-to-day and sets up the foundation for an AI agent to eventually manage this process.

---

## Current State

### Relevant Existing Structure

| File | What's There |
|---|---|
| `prisma/schema.prisma` | BomLineItem already has `qtyCheckedOut`, `qtyReturned`, `qtyConsumed` fields (all Decimal, default 0) |
| `prisma/schema.prisma` | Transaction model has `bomId` and `bomLineItemId` foreign keys |
| `prisma/schema.prisma` | TransactionType enum has CHECKOUT, ADDITIONAL_PICKUP, RETURN_FULL, RETURN_PARTIAL, RETURN_SCRAP |
| `prisma/schema.prisma` | BomStatus enum has DRAFT, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED |
| `src/lib/stock.ts` | `adjustStock()` handles CHECKOUT (stock-decreasing) and RETURN_* (stock-increasing) types. Links to bomId/bomLineItemId. |
| `src/app/boms/[id]/page.tsx` | BOM detail page shows "Ready for checkout (coming soon)" for APPROVED BOMs |
| `src/components/bom/bom-line-item-row.tsx` | Already displays qtyCheckedOut and qtyReturned when non-zero |
| `src/hooks/use-boms.ts` | React Query hooks for BOM CRUD |
| `src/app/api/boms/[id]/route.ts` | BOM update API with status transitions: APPROVED → IN_PROGRESS |

### Gaps or Problems Being Addressed

- No API endpoint to check out materials from a BOM
- No UI for the foreman to select items and quantities to check out
- No return flow to credit materials back to inventory
- BOM status doesn't auto-transition to IN_PROGRESS on first checkout
- `qtyCheckedOut` and `qtyReturned` on BomLineItem never get updated

---

## Proposed Changes

### Summary of Changes

- New API endpoint: `POST /api/boms/[id]/checkout` — handles both checkouts and returns
- New React Query hook: `useCheckoutBom()` — mutation for the checkout API
- New checkout UI on the BOM detail page — replaces "coming soon" placeholder
- New return UI — button per line item for returns
- Auto-status transition: BOM moves to IN_PROGRESS on first checkout
- Update BomLineItem `qtyCheckedOut` / `qtyReturned` on each operation

### New Files to Create

| File Path | Purpose |
|---|---|
| `src/app/api/boms/[id]/checkout/route.ts` | API endpoint for checkout and return operations |

### Files to Modify

| File Path | Changes |
|---|---|
| `src/hooks/use-boms.ts` | Add `useCheckoutBom()` mutation hook |
| `src/app/boms/[id]/page.tsx` | Replace "coming soon" with checkout/return UI |
| `src/components/bom/bom-line-item-row.tsx` | Add checkout quantity input and return button in checkout mode |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Single API endpoint for both checkout and return.** The endpoint accepts an array of line item operations, each specifying a type (CHECKOUT or RETURN_PARTIAL) and quantity. This keeps the API simple — one call to check out multiple items at once.

2. **Checkout happens inline on the BOM detail page, not a separate page.** The foreman is already looking at the BOM. They just need to enter quantities and tap "Checkout." No need for a modal or separate screen — keep it fast and simple for mobile.

3. **Auto-transition to IN_PROGRESS.** The first checkout on an APPROVED BOM automatically moves it to IN_PROGRESS. No manual step needed. The foreman doesn't think about status — they just pull materials.

4. **Checkout quantities in the shop's unit (shop unit).** If a product has a shop unit (e.g., ft), the foreman enters in feet. The API converts to purchase units before calling adjustStock(). Consistent with how the rest of the app works.

5. **Allow partial checkouts.** The foreman can check out some items now and come back for more later. Each checkout adds to `qtyCheckedOut`. They don't have to pull everything at once.

6. **Returns go back to inventory immediately.** When materials come back from a job, the foreman enters the return quantity. Stock is credited via adjustStock() with RETURN_PARTIAL type. `qtyReturned` is incremented.

7. **Roles: ADMIN, OPERATIONS_MANAGER, OFFICE_MANAGER, SHOP_FOREMAN can checkout.** Same roles that can adjust stock. SALES_MANAGER can create BOMs but not pull materials.

### Alternatives Considered

1. **Separate checkout page (`/boms/[id]/checkout`):** Rejected — adds navigation friction on mobile. The BOM detail page already shows the items.

2. **Full return vs partial return distinction:** The schema has RETURN_FULL and RETURN_PARTIAL types. For simplicity, we'll use RETURN_PARTIAL for all returns (the foreman enters the qty returned). If the returned qty equals the checked out qty, it's effectively a full return — no need to distinguish in the UI.

3. **Checkout confirmation modal:** Rejected for now — adds an extra tap. The checkout button with quantity inputs is clear enough. If users accidentally check out wrong quantities, they can return materials.

### Open Questions

None — all decisions are straightforward based on existing patterns.

---

## Step-by-Step Tasks

### Step 1: Create Checkout API Endpoint

Create `src/app/api/boms/[id]/checkout/route.ts`

**API Contract:**

```typescript
POST /api/boms/[id]/checkout

Body: {
  items: Array<{
    bomLineItemId: string
    type: "CHECKOUT" | "RETURN"
    quantity: number  // in shop units (or purchase units if no shop unit)
  }>
}

Response: {
  data: {
    transactions: Transaction[]
    bom: BomWithDetails
  }
}
```

**Actions:**
- Validate auth — require ADMIN, OPERATIONS_MANAGER, OFFICE_MANAGER, or SHOP_FOREMAN
- Validate BOM exists and status is APPROVED or IN_PROGRESS (can't checkout from DRAFT, COMPLETED, or CANCELLED)
- For each item in the request:
  - Fetch the BomLineItem with its product
  - For CHECKOUT:
    - If product has shopUnit, convert quantity from shop units to purchase units using dimensions (reverse of getDisplayQty)
    - Call `adjustStock()` with type CHECKOUT, passing bomId and bomLineItemId
    - Increment `bomLineItem.qtyCheckedOut` by the purchase-unit quantity
  - For RETURN:
    - Same conversion logic
    - Call `adjustStock()` with type RETURN_PARTIAL, passing bomId and bomLineItemId
    - Increment `bomLineItem.qtyReturned` by the purchase-unit quantity
    - Validate return qty doesn't exceed (qtyCheckedOut - qtyReturned)
- If BOM status is APPROVED and any CHECKOUT items, update BOM status to IN_PROGRESS
- Return updated BOM with all line items

**Files affected:**
- `src/app/api/boms/[id]/checkout/route.ts` (new)

---

### Step 2: Add Checkout Hook

Add `useCheckoutBom()` to `src/hooks/use-boms.ts`.

**Actions:**
- Add mutation hook that POSTs to `/api/boms/${id}/checkout`
- On success, invalidate `["bom", id]` and `["boms"]` query caches
- Also invalidate `["products"]` since stock levels change

**Files affected:**
- `src/hooks/use-boms.ts`

---

### Step 3: Update BomLineItemRow for Checkout Mode

Add a checkout mode to `src/components/bom/bom-line-item-row.tsx` that shows:
- A quantity input for how much to check out
- A return button (when qtyCheckedOut > qtyReturned)
- Progress indicator: "12 of 24 ft checked out"

**New props:**
- `checkoutMode?: boolean` — enables checkout inputs
- `onCheckout?: (qty: number) => void` — callback when user enters checkout qty
- `onReturn?: (qty: number) => void` — callback when user enters return qty

**Layout in checkout mode:**
- Top line: item name (already full width)
- Second line: progress text like "8 of 16 ft checked out" (using shop unit if available)
- Right side: quantity input + "Pull" button for checkout
- If qtyCheckedOut > qtyReturned: show small "Return" link that reveals a return input

**Files affected:**
- `src/components/bom/bom-line-item-row.tsx`

---

### Step 4: Update BOM Detail Page

Replace the "Ready for checkout (coming soon)" placeholder with the actual checkout UI.

**Actions:**
- When BOM status is APPROVED or IN_PROGRESS:
  - Show line items in checkout mode (checkoutMode prop)
  - Add "Checkout Selected" button at the bottom that batches all entered quantities into one API call
  - Track pending checkout quantities in local state (similar to how editing tracks pendingQtyChanges)
- When status is IN_PROGRESS:
  - Show progress on each line item (checked out vs needed)
  - Show return option for items that have been checked out
  - Keep the "Mark Completed" button
- Remove the "Ready for checkout (coming soon)" text

**State management:**
- `pendingCheckouts: Record<string, number>` — line item id → qty to check out
- `pendingReturns: Record<string, number>` — line item id → qty to return
- `checkoutMode: boolean` — toggle between viewing and checkout entry

**Flow:**
1. Foreman opens approved BOM
2. Taps "Start Checkout" button
3. Enters quantities next to each item they're pulling
4. Taps "Confirm Checkout" → API call → inventory deducted → BOM moves to IN_PROGRESS
5. For returns: taps "Return" on a line item → enters qty → confirms → inventory credited

**Files affected:**
- `src/app/boms/[id]/page.tsx`

---

### Step 5: Add Shop Unit Conversion Utility for Reverse Direction

The existing `getDisplayQty()` converts purchase units → shop units for display. For checkout, we need the reverse: shop units → purchase units.

**Actions:**
- Add `toPurchaseQty()` function to `src/lib/units.ts`
- Takes a quantity in shop units and product data, returns quantity in purchase units
- Example: 5 ft of gasket (dimLength=100ft) → 0.05 rolls

```typescript
export function toPurchaseQty(shopQty: number, product: ProductForDisplay): number {
  if (!product.shopUnit) return shopQty // no conversion needed

  const dimLength = Number(product.dimLength || 0)
  const dimWidth = Number(product.dimWidth || 0)

  if (product.shopUnit === "sq ft" && dimLength > 0 && dimWidth > 0) {
    const areaPerUnit = toFeet(dimLength, product.dimLengthUnit || "ft") * toFeet(dimWidth, product.dimWidthUnit || "ft")
    return areaPerUnit > 0 ? shopQty / areaPerUnit : shopQty
  }

  if ((product.shopUnit === "ft" || product.shopUnit === "in") && dimLength > 0) {
    const lengthInFt = toFeet(dimLength, product.dimLengthUnit || "ft")
    const shopQtyInFt = product.shopUnit === "in" ? shopQty / 12 : shopQty
    return lengthInFt > 0 ? shopQtyInFt / lengthInFt : shopQty
  }

  return shopQty
}
```

**Files affected:**
- `src/lib/units.ts`

---

### Step 6: Build, Test, Deploy

**Actions:**
- Run `npm run build` to verify TypeScript compiles
- Rsync to GitHub repo
- Commit and push
- Verify on Vercel

---

## Connections & Dependencies

### Files That Reference This Area

- `src/lib/stock.ts` — called by the checkout API (not modified, just used)
- `src/lib/cost.ts` — not affected (WAC only recalcs on RECEIVE)
- `src/app/api/boms/[id]/route.ts` — status transition validation (not modified, checkout API handles its own)
- `src/types/index.ts` — may need BomLineItemData type updated if new props added

### Updates Needed for Consistency

- CLAUDE.md should note that Phase 2B (Material Checkout) is complete
- Memory file should be updated with checkout architecture notes

### Impact on Existing Workflows

- **BOM approval flow:** No change — approve still works the same
- **BOM editing:** Still works on DRAFT/APPROVED/IN_PROGRESS. Once items are checked out, the foreman can still edit qty needed but can't remove items that have been checked out.
- **Stock levels:** Checkout deducts, returns credit — all through adjustStock() so transaction history is preserved
- **Dashboard:** Low stock items will automatically reflect checkouts since currentQty is updated

---

## Validation Checklist

- [x] Checkout API creates transactions and deducts stock for each line item
- [x] BOM auto-transitions from APPROVED to IN_PROGRESS on first checkout
- [x] BomLineItem.qtyCheckedOut increments correctly
- [x] Return API credits stock and increments BomLineItem.qtyReturned
- [x] Return validation: can't return more than (qtyCheckedOut - qtyReturned)
- [x] Tier 2 items log transactions but don't affect stock
- [x] Shop unit conversion works correctly (foreman enters in ft, system deducts in purchase units)
- [x] TypeScript compiles clean (`npm run build`)
- [x] UI shows progress on each line item (checked out vs needed)

---

## Success Criteria

1. A foreman can open an approved BOM, enter quantities for each item, and check out materials — inventory deducts automatically
2. A foreman can return unused materials from a job — inventory credits automatically
3. The BOM shows clear progress: what's been pulled, what's still needed, what's been returned
4. The app builds and deploys without errors

---

## Notes

- The `qtyConsumed` field on BomLineItem exists but is not used in this plan. It's for a future "consume" action where materials are permanently used (vs. checked out and potentially returnable). Can be added later.
- `ADDITIONAL_PICKUP` transaction type exists for materials pulled beyond the original BOM quantity. For now, we'll allow checking out more than `qtyNeeded` (the foreman knows what they need). The system just tracks it. A warning could be shown in the UI.
- Future enhancement: the AI agent could auto-populate checkout quantities based on the BOM and confirm with the foreman, rather than manual entry.
- Non-catalog items: these don't have a product in inventory, so checkout for non-catalog items just records the transaction without stock impact. The BomLineItem still tracks qtyCheckedOut for completeness.

---

## Implementation Notes

**Implemented:** 2026-03-06

### Summary

Built the full material checkout and return flow. The foreman can now open an approved BOM, tap "Start Checkout", enter quantities for each item, and confirm — inventory deducts automatically. Returns work inline per line item. BOM auto-transitions to IN_PROGRESS on first checkout. IN_PROGRESS BOMs always show checkout progress with return options.

### Deviations from Plan

- Steps were executed out of order (Step 5 first, then 1-4) since `toPurchaseQty()` was needed by the checkout API. No functional difference.
- IN_PROGRESS BOMs show checkout progress inline without needing to tap "Start Checkout" — the checkout UI is always visible when the BOM is in progress, with a "Pull More Materials" button to enter new quantities.

### Issues Encountered

None
