# BOM Module Audit & Implementation Plan v2

**Created:** 2026-03-12
**Status:** COMPLETE
**Audit Method:** 4 parallel specialized agents (API Design, Database/Data Integrity, Frontend Quality, Tech Debt)
**Total Raw Findings:** 73 across all agents (deduplicated to 18 actionable fixes below)

---

## Consolidated Findings (Deduplicated & Prioritized)

### P0 — Authorization / Data Corruption

- [x] **1. Missing authorization on PUT /boms/[id]**
  - Source: API Design Review #1
  - File: `src/app/api/boms/[id]/route.ts` line 75
  - Problem: Any authenticated user (including CREW, DOOR_SHOP) can modify BOM metadata (jobName, notes) and force status transitions (except APPROVED). Only line-item edits check creator ownership.
  - Fix: Add `requireRole()` call at the top of PUT handler for all modifications.

### P1 — Bugs / Data Integrity

- [x] **2. Race condition: validation outside transaction in checkout**
  - Source: API Design #3, Database #1
  - File: `src/app/api/boms/[id]/checkout/route.ts` lines 32-85
  - Problem: BOM + line items fetched outside transaction, validated with stale data. Concurrent checkouts can over-deduct stock or allow invalid returns.
  - Fix: Move BOM fetch + validation inside the `$transaction()` block. Re-fetch line items with `tx.bomLineItem.findMany()`.

- [x] **3. Missing bomId validation on line item updates**
  - Source: Database #2
  - File: `src/app/api/boms/[id]/route.ts` lines 140-147
  - Problem: `updateLineItems` uses `where: { id: item.id }` without checking `bomId` or `isActive`. User could modify line items from other BOMs.
  - Fix: Add `bomId: id, isActive: true` to the where clause.

- [x] **4. Checkout fetches soft-deleted line items**
  - Source: Database #3, Database #11
  - File: `src/app/api/boms/[id]/checkout/route.ts` lines 32-41
  - Problem: No `isActive: true` filter on checkout fetch. Operations can target deleted items.
  - Fix: Add `where: { isActive: true }` to lineItems include.

- [x] **5. Non-catalog validation gap**
  - Source: API Design #2, Database #10
  - File: `src/app/api/boms/route.ts` lines 7-16
  - Problem: `nonCatalogName` not required when `isNonCatalog: true`. Creates unnamed items.
  - Fix: Add `.refine()` to zod schema requiring name when isNonCatalog.

- [x] **6. Floating-point tolerance inconsistency**
  - Source: API Design #4
  - File: `src/app/api/boms/[id]/checkout/route.ts` lines 68, 77
  - Problem: Catalog returns use `+ 0.0001` tolerance, non-catalog returns use strict comparison.
  - Fix: Apply consistent tolerance (named constant) to both paths.

- [x] **7. Inconsistent Zod error format in checkout**
  - Source: API Design #6
  - File: `src/app/api/boms/[id]/checkout/route.ts` line 229
  - Problem: Returns raw `error.issues` array instead of formatted string like other endpoints.
  - Fix: Format consistently as `error.issues.map(i => ...).join("; ")`.

### P2 — Robustness / Quality

- [x] **8. Frontend return qty input allows exceeding outstanding**
  - Source: Frontend #7.3
  - File: `src/components/bom/bom-line-item-row.tsx` lines 140-154
  - Problem: `max={outstanding}` HTML attribute ignored by most browsers. User can type any value.
  - Fix: Clamp value in onChange handler.

- [x] **9. Product picker silently swallows API errors**
  - Source: Frontend #2.1
  - File: `src/components/bom/product-picker.tsx` lines 47-60
  - Problem: Non-OK responses silently ignored. User sees empty results, not an error.
  - Fix: Add error handling branch for !res.ok.

- [x] **10. Status change buttons missing pending text**
  - Source: Frontend #7.1
  - File: `src/app/boms/[id]/page.tsx` lines 524-538
  - Problem: Buttons disabled during mutation but text doesn't change to indicate loading.
  - Fix: Show "Approving...", "Cancelling...", etc. during pending state.

- [x] **11. Missing aria-labels on icon-only buttons**
  - Source: Frontend #8.1
  - Files: `bom-confirmation-card.tsx`, `bom-line-item-row.tsx`, `checkout-all-button.tsx`
  - Problem: Accept/reject/trash icon buttons have no accessible labels.
  - Fix: Add `aria-label` to all icon-only buttons.

- [x] **12. Duplicate stock-level utility functions**
  - Source: Frontend #5.2, #5.3
  - Files: `bom-ai-flow.tsx` lines 28-40, `bom-confirmation-card.tsx` lines 12-25
  - Problem: `getItemStockLevel` / `getStockLevel` + `stockDotColor` duplicated.
  - Fix: Extract to shared `src/lib/bom-utils.ts`.

- [x] **13. Hard-coded hex colors instead of theme classes**
  - Source: Tech Debt #24
  - Files: `boms/new/page.tsx` lines 39, 50; `bom-ai-flow.tsx` line 211
  - Problem: `#E8792B` hard-coded instead of `brand-orange` CSS variable.
  - Fix: Replace with `text-brand-orange` / `border-brand-orange`.

### P3 — Performance / Polish

- [x] **14. N+1 query in line item updates**
  - Source: API Design #7
  - File: `src/app/api/boms/[id]/route.ts` lines 140-146
  - Problem: Sequential UPDATE per line item. With 10 items = 10 queries.
  - Fix: Use `Promise.all()` to parallelize.

- [x] **15. Missing database indexes on foreign keys**
  - Source: Database #8
  - Problem: No explicit indexes on `BomLineItem.bomId`, `Transaction.bomId`, `Transaction.bomLineItemId`.
  - Fix: Add `@@index` directives to schema.

### E2E Tests

- [x] **16. Write Playwright BOM E2E tests**
  - New file: `e2e/bom.spec.ts`
  - Tests: List page, create BOM (manual), detail page, status transitions, page stability

---

## Out of Scope (Acknowledged but Deferred)

These findings are valid but too large for this sprint or have low ROI:
- God component refactor of BomDetailPage (XL effort, no runtime bug)
- Service layer extraction (L effort, architecture improvement)
- Decimal arithmetic refactor to use Prisma Decimal library (M effort, edge case)
- Missing unique constraint on (bomId, productId) (requires migration + testing)
- React Query cache invalidation sequencing (low-probability issue)
- Error boundary component (no crash reports to justify)
- Rate limiting on BOM endpoints (internal app, authenticated users)
- Optimistic updates (UX enhancement, not a bug)
- buildQtyUpdates moved to backend (requires API contract change)
