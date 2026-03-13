# QA Report — RSNE Inventory App (BOM Focus)
**Date:** 2026-03-12
**Focus:** BOMs (creation, detail, checkout, panel flow)

## Summary
- 2 critical issues found
- 6 major issues found
- 7 minor issues found
- 4 suggestions

---

## Critical Issues

### [C1] Stock Can Go Negative — No Lower Bound on Checkout
- **File:** `src/lib/stock.ts:59`
- **Description:** `adjustStock()` subtracts checkout quantity from `currentQty` with no floor check. If checkout exceeds available stock, the product's `currentQty` goes negative.
- **Impact:** Inventory corruption — negative quantities create phantom inventory and break reorder logic, cycle counts, and reporting.
- **Current behavior:** The checkout API adds a "warning" to the response for insufficient stock (checkout/route.ts:126) but the transaction still proceeds. Panel checkout has the same behavior (panel-checkout/route.ts:121).
- **Reproduction:** Approve a BOM, check out more panels than exist in inventory.

### [C2] Panel Checkout Creates Transactions in Sq Ft but Tracks Line Item in Panels
- **File:** `src/app/api/boms/[id]/panel-checkout/route.ts:128` and `:144`
- **Description:** `adjustStock()` is called with `quantity: totalSqFt` (sq ft), but `bomLineItem.qtyCheckedOut` is incremented by `totalBreakoutPanels` (panel count). The BOM line item's `qtyNeeded` is also in panels. This creates a unit mismatch between the inventory transaction layer (sq ft) and the BOM tracking layer (panels).
- **Impact:** If the regular checkout route is later used on the same line item, `toPurchaseQty()` would use the wrong conversion factor. Returns are also problematic since the return flow uses the regular checkout API which expects consistent units.
- **Reproduction:** Create a panel BOM item (20 panels), do a partial panel checkout (10 panels from 8-footers), then try to use the regular "Add Material" checkout for the remaining 10.

---

## Major Issues

### [M1] Panel Checkout Does Not Track Cost
- **File:** `src/app/api/boms/[id]/panel-checkout/route.ts:126-135`
- **Description:** `adjustStock()` is called without `unitCost`. The resulting transaction has `unitCost: null` and `totalCost: null`. Panel products auto-created here also have `avgCost: 0` and `lastCost: 0`.
- **Impact:** Job costing reports will show $0 for all panel material, making cost tracking useless for panels.

### [M2] Regular Checkout Also Does Not Track Cost
- **File:** `src/app/api/boms/[id]/checkout/route.ts:129-138`
- **Description:** Same as M1 — `adjustStock()` called without `unitCost` for all checkout operations.
- **Impact:** No cost data on any BOM checkout transaction. This is existing behavior (not introduced by the panel feature) but worth flagging.

### [M3] Update BOM API Missing `nonCatalogSpecs` in addLineItems Schema
- **File:** `src/app/api/boms/[id]/route.ts:50-66`
- **Description:** The `updateBomSchema.addLineItems` does not include `nonCatalogSpecs`. If a panel line item is added via the PUT endpoint (e.g., "Add Material" mode on BOM detail), the specs JSON will be silently stripped by Zod.
- **Impact:** Panel items added after initial BOM creation won't have specs, breaking the panel checkout flow for those items.

### [M4] Panel Specs Not Validated at Creation Time
- **File:** `src/app/api/boms/route.ts:16`
- **Description:** `nonCatalogSpecs` uses `z.any()` — no structural validation. The panel checkout route expects `{ type: "panel", thickness: number, widthIn: number, cutLengthFt: number, ... }` but nothing enforces this at write time.
- **Impact:** Malformed specs could be stored, causing the panel checkout to fail with a confusing error ("This line item is not a panel item") even though the user added it as a panel.

### [M5] Panel Find-or-Create Uses Exact Name Match — Duplication Risk
- **File:** `src/app/api/boms/[id]/panel-checkout/route.ts:94-96`
- **Description:** Products are found by `where: { name: productName }` using the constructed name. If the same panel was previously created via the receiving flow with a slightly different name (e.g., different rounding), a duplicate product is created.
- **Impact:** Stock fragmentation — the same physical panel exists as two different products with separate inventory counts.

### [M6] Non-Catalog AI Duplicate Detection Missing
- **File:** `src/components/bom/bom-ai-flow.tsx:43-47`
- **Description:** Duplicate detection in `handleParseComplete` only works for items with a `matchedProduct.id`. Non-catalog items (where `matchedProduct` is null) skip the duplicate check entirely. Speaking "20 tubes caulk" twice adds two separate 20-qty entries.
- **Impact:** BOM quantities inflated by duplicate AI entries for non-catalog items.

---

## Minor Issues

### [m1] BOM Confirmation Card Icons Missing Aria Labels
- **File:** `src/components/bom/bom-confirmation-card.tsx`
- **Description:** The Accept (check) and Reject (X) icon buttons have no `aria-label`. Screen readers cannot identify their purpose.
- **Impact:** Accessibility — WCAG non-compliance for icon-only buttons.

### [m2] Job Picker "No Matching Jobs" Only Shows When Search Has Text
- **File:** `src/components/bom/job-picker.tsx:122`
- **Description:** The "No matching jobs found" message only renders when `search.length >= 1 && jobs.length === 0`. If the database has zero active jobs, focusing the empty search field shows nothing — no results and no "no results" message.
- **Impact:** Minor UX confusion when there are truly no jobs in the system.

### [m3] Cut Length Parser Error Message Is Generic
- **File:** `src/components/bom/panel-line-item-form.tsx:101`
- **Description:** When inches >= 12 are entered (e.g., "7'14"), the error says "Enter a valid cut length" instead of "Inches must be less than 12".
- **Impact:** Users may not understand why their input was rejected.

### [m4] Non-Catalog Checkout Qty Can Exceed qtyNeeded
- **File:** `src/app/api/boms/[id]/checkout/route.ts:96-106`
- **Description:** Non-catalog items (no productId) have no validation preventing `qtyCheckedOut` from exceeding `qtyNeeded`. You can check out 100 units of a 10-qty non-catalog item.
- **Impact:** Semantic violation — non-catalog items allow overbooking.

### [m5] Middleware Deprecation Warning
- **File:** `middleware.ts`
- **Description:** Next.js 16 has renamed the "middleware" convention to "proxy". Build shows deprecation warning.
- **Impact:** Non-blocking now, will require migration in future Next.js versions.

### [m6] Panel Checkout Sheet Brand Must Be Re-Selected Each Open
- **File:** `src/components/bom/panel-checkout-sheet.tsx:77-85`
- **Description:** Opening the panel checkout sheet always resets `selectedBrand` to null. If a foreman is checking out multiple panel line items for the same brand, they must re-select the brand each time.
- **Impact:** UX friction for multi-item panel checkouts.

### [m7] Floating Point Precision in Panel Sq Ft Calculations
- **File:** `src/lib/panels.ts:237-239`
- **Description:** `panelSqFt()` uses `heightFt * (widthInches / 12)`. For fractional widths (45.375"), accumulated floating point errors across many panels could cause micro-discrepancies between checkout and return quantities.
- **Impact:** Extremely rare edge case, partially mitigated by `QTY_TOLERANCE` on returns.

---

## Suggestions

### [S1] Add `unitCost` to Checkout Transactions
Use the product's `avgCost` or `lastCost` as the `unitCost` for CHECKOUT transactions. This enables job costing without requiring the foreman to enter a price.

### [S2] Add Stock Floor Validation
Before calling `adjustStock()` for CHECKOUT, validate `currentQty >= checkoutQty` and either block the transaction or require explicit confirmation to go negative.

### [S3] Validate `nonCatalogSpecs` Structure
Replace `z.any()` with a discriminated union: if `type === "panel"`, require `thickness`, `cutLengthFt`, `widthIn`. Otherwise allow any JSON.

### [S4] Remember Brand Across Panel Checkouts
Store the last-used brand in local state (or localStorage) so the foreman doesn't re-select it for every panel line item on the same BOM.

---

## Files Audited

### API Routes
- `src/app/api/boms/route.ts` (GET, POST)
- `src/app/api/boms/[id]/route.ts` (GET, PUT)
- `src/app/api/boms/[id]/checkout/route.ts` (POST)
- `src/app/api/boms/[id]/panel-checkout/route.ts` (POST)

### Hooks
- `src/hooks/use-boms.ts`
- `src/hooks/use-jobs.ts`

### Components
- `src/app/boms/page.tsx`
- `src/app/boms/new/page.tsx`
- `src/app/boms/[id]/page.tsx`
- `src/components/bom/bom-ai-flow.tsx`
- `src/components/bom/bom-confirmation-card.tsx`
- `src/components/bom/bom-line-item-row.tsx`
- `src/components/bom/bom-status-badge.tsx`
- `src/components/bom/checkout-all-button.tsx`
- `src/components/bom/job-picker.tsx`
- `src/components/bom/panel-checkout-sheet.tsx`
- `src/components/bom/panel-line-item-form.tsx`
- `src/components/bom/product-picker.tsx`

### Libraries
- `src/lib/stock.ts`
- `src/lib/cost.ts`
- `src/lib/units.ts`
- `src/lib/panels.ts`
- `src/lib/bom-utils.ts`

### Schema
- `prisma/schema.prisma` (Bom, BomLineItem, Product, Category models)
