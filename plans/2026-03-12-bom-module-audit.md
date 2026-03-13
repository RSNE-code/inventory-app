# BOM Module Audit & Fixes

**Created:** 2026-03-12
**Status:** IN PROGRESS
**Scope:** Backend reliability, data integrity, code quality, E2E testing

---

## Audit Summary

Full code review of the BOM module (~3,000 lines across 14 files). Found 8 actionable issues ranked by severity.

## Fixes (Priority Order)

### P0 — Data Integrity

- [ ] **1. Wrap checkout operations in a single DB transaction**
  - File: `src/app/api/boms/[id]/checkout/route.ts`
  - Problem: `adjustStock()`, `bomLineItem.update()`, and `bom.update()` run as separate operations. A failure mid-way leaves inconsistent state (stock deducted but line item not updated, or vice versa).
  - Fix: Wrap the entire checkout loop in `prisma.$transaction()`, pass `tx` to `adjustStock`.

- [ ] **2. Fix hard delete of line items → soft delete**
  - File: `src/app/api/boms/[id]/route.ts` line 132
  - Problem: `deleteMany` hard-deletes BomLineItems, violating project rule "soft deletes only."
  - Fix: Add `isActive` field to BomLineItem, change delete to `updateMany({ isActive: false })`, filter inactive items in queries.

### P1 — Bug Fixes

- [ ] **3. Fix variable shadowing in handleAIAddItems**
  - File: `src/app/boms/[id]/page.tsx` line 132
  - Problem: `const result = await updateBom.mutateAsync(...)` shadows the function parameter `result: ParseResult`.
  - Fix: Rename inner variable to `updateResult`.

- [ ] **4. Extract duplicated auto-adjust qtyNeeded logic**
  - File: `src/app/boms/[id]/page.tsx`
  - Problem: `handleCheckout` (lines 206-220) and `handleCheckoutAll` (lines 164-179) contain identical auto-adjust logic.
  - Fix: Extract to `buildQtyUpdates(items, allItems)` helper.

### P2 — Robustness

- [ ] **5. Add stock availability check before checkout**
  - File: `src/app/api/boms/[id]/checkout/route.ts`
  - Problem: Checkout can drive stock negative with no warning.
  - Fix: Check `currentQty >= purchaseQty` before checkout. Allow negative but log a warning and include `insufficientStock: true` in the response so the UI can show a notice.

- [ ] **6. Prevent duplicate product on same BOM**
  - File: `src/app/api/boms/[id]/route.ts`
  - Problem: Adding a line item with an already-existing productId creates a duplicate.
  - Fix: Before creating, check existing line items for same productId. If found, sum quantities instead.

### P3 — Playwright E2E Tests

- [ ] **7. Set up Playwright and write BOM E2E tests**
  - New files: `playwright.config.ts`, `e2e/bom.spec.ts`
  - Tests: BOM list page loads, create BOM flow, BOM detail page, status transitions, checkout flow

---

## Out of Scope
- UI/design changes (per feedback: don't over-redesign working UI)
- Type refactoring of Record<string, unknown> (large change, no runtime impact)
- APPROVED → DRAFT transition (intentional backend flexibility)
