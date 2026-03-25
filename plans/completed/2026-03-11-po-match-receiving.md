# Plan: PO Match & Reconciliation in Receiving Workflow

**Created:** 2026-03-11
**Status:** Implemented
**Request:** When a user snaps a packing slip, AI extracts the PO number and auto-matches it to an open Knowify PO. The user can reconcile the receipt against that PO, with quantity variance flagging.

---

## Overview

### What This Plan Accomplishes

Adds purchase order matching to the receiving workflow. When a packing slip is photographed, the AI extracts the PO number (if present), auto-matches it to an open PO in the database, and pre-fills the receipt with the PO's items, quantities, and costs. The user confirms what was actually received, with variance alerts when quantities don't match.

### Why This Matters

This is WF1 Step 3 from the PRD — the single most time-saving feature in receiving. Instead of manually entering every item from a delivery, the user just snaps a photo and confirms. PO pre-fill eliminates data entry, and variance detection catches mistakes before they corrupt inventory data.

---

## Current State

### Relevant Existing Structure

- **Prisma schema**: `PurchaseOrder` model with `POLineItem` already exists (lines 189-214 of schema.prisma), including `POStatus` enum (OPEN, PARTIALLY_RECEIVED, RECEIVED, CLOSED). `Receipt` model has optional `purchaseOrderId` FK ready to go.
- **AI parsing**: `parseImageInput()` already extracts `poNumber` from images and returns it in the result. The `ReceivingParseResult` type already has a `poNumber` field.
- **Receiving flow**: `ReceivingFlow` component has 3 phases (INPUT → REVIEW → SUMMARY). Currently ignores the `poNumber` from parse results.
- **Supplier match**: Pattern exists in `supplier-match.ts` / `use-receiving.ts` for fuzzy matching — PO match will follow the same pattern.
- **Knowify PO data**: 376 POs in `reference/Knowify RSNE POs.xlsx` — header-level only (no line items). 68 vendors, PO numbers are numeric strings (e.g., "403").
- **No PO API routes exist yet**. The `PurchaseOrder` model is defined but completely unused.

### Gaps or Problems Being Addressed

1. **PO data not loaded** — 376 Knowify POs need to be seeded into the database
2. **No PO API** — No endpoints to search/fetch POs
3. **PO number ignored** — AI already extracts it from images but the receiving flow throws it away
4. **No pre-fill** — User manually enters every item even when a PO already defines them
5. **No variance detection** — No way to flag "PO says 50, you entered 45"

---

## Proposed Changes

### Summary of Changes

- Seed 376 Knowify POs into the `PurchaseOrder` table (header-level, no line items since the export doesn't have them)
- Create PO search/match API routes
- Create a PO fuzzy matcher (by PO number, vendor, and amount)
- Add a new phase to the receiving flow: after INPUT, if a PO is matched, show a "PO Match" step where the user confirms the PO
- Wire up `purchaseOrderId` on Receipt creation
- Add PO search/picker UI for manual PO selection
- Add "No PO" bypass for ad-hoc purchases

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `prisma/seed-pos.ts` | Seed script to load Knowify POs into PurchaseOrder table |
| `src/lib/ai/po-match.ts` | Fuzzy PO matching logic (by number, vendor name, amount) |
| `src/app/api/pos/route.ts` | GET: search/list open POs; optionally filter by supplier |
| `src/app/api/pos/match/route.ts` | POST: match a PO by number/vendor/amount from AI parse |
| `src/components/receiving/po-match-card.tsx` | UI card showing matched PO with confirm/change/skip actions |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/components/receiving/receiving-flow.tsx` | Add PO match step between INPUT and REVIEW. When AI returns poNumber, auto-match and show PO card. Wire purchaseOrderId through to receipt submission. |
| `src/app/api/receiving/route.ts` | Accept optional `purchaseOrderId` in receipt creation schema. Link receipt to PO. |
| `src/hooks/use-receiving.ts` | Add `usePoMatch` mutation and `usePoSearch` query hooks. Update `useCreateReceipt` to accept `purchaseOrderId`. |
| `src/lib/ai/types.ts` | Add `MatchedPO` interface for PO match results. |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Header-only PO seed (no line items)**: The Knowify export only has PO-level data (number, vendor, amount, date, job). No product line items are available. POs will be seeded without line items. This means we can match POs but NOT pre-fill item lists from them yet. Item pre-fill can be added later when Knowify provides line-item export or when POs are created natively in the app.

2. **PO match happens automatically after AI parse**: When the image parser returns a `poNumber`, the system auto-matches it. If no PO number is extracted, the system offers a searchable PO picker. The user always has a "No PO" option.

3. **Fuzzy PO matching**: Match by exact PO number first, then fall back to vendor + amount + date range matching. This handles cases where the AI misreads a digit or the packing slip doesn't have the PO number but does have the vendor name and dollar amount.

4. **PO as optional context, not gatekeeper**: Since we have no line items, the matched PO serves as metadata on the receipt (linking receipt → PO for traceability) rather than driving the item list. The AI-parsed items from the photo remain the primary data source. When line items are eventually available, the PO will pre-fill and variance detection will kick in.

5. **New flow phase "PO_MATCH"**: Inserting between INPUT and REVIEW. Keeps the existing 3-phase flow intact and adds a 4th step. The step progress bar updates to 4 steps when a PO is relevant.

### Alternatives Considered

- **Pre-fill from PO line items**: Can't do this yet — Knowify export has no line items. Designed the architecture to support it later by keeping POLineItem model and adding to the PO match card when data becomes available.
- **Skip PO step entirely**: Would lose the traceability Gabe needs. Even without line items, linking receipt → PO is valuable for audit trail.
- **Manual-only PO entry**: Misses the whole point of AI-first. Auto-match from the packing slip photo is the core value.

### Open Questions

1. **PO status management**: Should we update PO status (OPEN → PARTIALLY_RECEIVED → RECEIVED) when receipts are logged against them? The spreadsheet shows all POs as "Active" with Balance = Amount. **Recommendation**: Yes, track status transitions — it's simple to implement and the schema already supports it.

2. **Future line-item support**: When Gabe can export PO line items from Knowify, we'll add a second seed to populate `POLineItem` records. The architecture is ready for this — the `POLineItem` model already exists with `qtyOrdered`, `qtyReceived`, `unitCost`, and links to `Product`.

---

## Step-by-Step Tasks

### Step 1: Seed Knowify POs into Database

Parse `reference/Knowify RSNE POs.xlsx` and insert 376 POs into the `PurchaseOrder` table. Match vendor names to existing `Supplier` records using the same fuzzy logic from `supplier-match.ts`.

**Actions:**

- Create `prisma/seed-pos.ts` that:
  - Reads the XLSX file using the `xlsx` package (already in workspace node_modules)
  - For each row, extracts: PO # (→ `poNumber`), Vendor Name (→ match to `supplierId`), Created Date (→ `createdAt`), Amount (→ store in `notes` as metadata since schema has no `amount` field), Client/Department Name + Project Name (→ `notes`)
  - Fuzzy-matches vendor names to existing Supplier records
  - Uses `createMany` with `skipDuplicates` (unique on `poNumber`)
  - Sets all POs to status `OPEN`
- Add an `amount` and `jobName` field to PurchaseOrder schema (the existing schema doesn't have these but they're valuable for matching)
- Run `prisma db push` and the seed script

**Files affected:**

- `prisma/seed-pos.ts` (new)
- `prisma/schema.prisma` (add `amount` Decimal and `jobName` String fields to PurchaseOrder)

---

### Step 2: Create PO Match Module

Build fuzzy PO matching logic that takes an extracted PO number (and optionally vendor name and amount) and returns the best matching PurchaseOrder.

**Actions:**

- Create `src/lib/ai/po-match.ts` with:
  - `matchPO(params: { poNumber?: string; vendorName?: string; amount?: number })` → returns best match
  - Exact match on `poNumber` first (highest confidence)
  - If no exact match, try normalized number match (strip leading zeros, handle OCR artifacts like O→0)
  - Fallback: match by vendor + amount range (±10%)
  - Returns: `{ id, poNumber, supplierName, amount, jobName, confidence }` or null

**Files affected:**

- `src/lib/ai/po-match.ts` (new)
- `src/lib/ai/types.ts` (add `MatchedPO` interface)

---

### Step 3: Create PO API Routes

**Actions:**

- Create `src/app/api/pos/route.ts`:
  - `GET /api/pos` — list open POs, optional `?supplierId=xxx` and `?search=xxx` (searches poNumber, jobName)
  - Returns PO with supplier name, amount, job name, date
- Create `src/app/api/pos/match/route.ts`:
  - `POST /api/pos/match` — accepts `{ poNumber?, vendorName?, amount? }`, returns best match using `matchPO()`

**Files affected:**

- `src/app/api/pos/route.ts` (new)
- `src/app/api/pos/match/route.ts` (new)

---

### Step 4: Add React Query Hooks

**Actions:**

- Add to `src/hooks/use-receiving.ts`:
  - `usePoMatch()` — mutation that calls `POST /api/pos/match`
  - `usePoSearch(supplierId?, search?)` — query that calls `GET /api/pos`
- Update `useCreateReceipt` to accept optional `purchaseOrderId` in the payload

**Files affected:**

- `src/hooks/use-receiving.ts`

---

### Step 5: Build PO Match Card Component

Create the UI card that shows when a PO is matched. Shows PO number, vendor, amount, job name, and date. Has three actions: Confirm, Change PO, No PO.

**Actions:**

- Create `src/components/receiving/po-match-card.tsx`:
  - Displays matched PO details in a clean card
  - "Matched PO" header with confidence badge
  - PO number prominent, vendor/job/amount as secondary details
  - Three buttons: "Use This PO" (confirm), "Different PO" (opens search), "No PO" (skip)
  - When "Different PO" is tapped, show a searchable PO list filtered by the matched supplier
  - Invoke `frontend-design` skill for this component

**Files affected:**

- `src/components/receiving/po-match-card.tsx` (new)

---

### Step 6: Wire PO Match into Receiving Flow

Integrate the PO match step into the existing `ReceivingFlow` component.

**Actions:**

- Update phase type: `"INPUT" | "PO_MATCH" | "REVIEW" | "SUMMARY"`
- Update step progress to show 4 steps when PO flow is active, 3 when skipped
- After `handleParseComplete`:
  - If AI returned a `poNumber`, auto-call PO match API
  - If match found, transition to PO_MATCH phase showing the POMatchCard
  - If no PO number extracted, transition to PO_MATCH phase with search picker (user can search or skip)
- PO_MATCH phase renders:
  - If auto-matched: `POMatchCard` with the matched PO
  - If not matched: PO search/picker with "No PO" option
- On PO confirm: store `purchaseOrderId` in state, transition to REVIEW
- On "No PO": set `purchaseOrderId = null`, transition to REVIEW
- Pass `purchaseOrderId` through to `handleSubmitReceipt()`
- Update receipt creation call to include `purchaseOrderId`

**Files affected:**

- `src/components/receiving/receiving-flow.tsx`

---

### Step 7: Update Receipt API to Accept PO

**Actions:**

- Add `purchaseOrderId: z.string().uuid().optional().nullable()` to `createReceiptSchema`
- Pass it through to `receipt.create()` data
- Optionally: after receipt creation, check if all PO items are received and update PO status

**Files affected:**

- `src/app/api/receiving/route.ts`

---

### Step 8: Run Seed, Push Schema, Test

**Actions:**

- Add `amount` and `jobName` to PurchaseOrder in schema.prisma
- Run schema push with session-mode pooler URL
- Run PO seed script
- Test end-to-end: snap a photo → AI extracts PO# → auto-match → confirm → receipt linked to PO
- Verify "No PO" flow still works for ad-hoc receipts

**Files affected:**

- `prisma/schema.prisma`
- Database (376 PO records)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/receiving/receiving-flow.tsx` — main flow being modified
- `src/app/api/receiving/route.ts` — receipt creation being extended
- `src/hooks/use-receiving.ts` — hooks being extended
- `src/lib/ai/types.ts` — types being extended
- `src/app/api/ai/parse-image/route.ts` — already extracts poNumber, no changes needed
- `src/lib/ai/parse.ts` — already has RECEIVING_SCHEMA with poNumber field, no changes needed

### Updates Needed for Consistency

- `context/project-status.md` — update to reflect PO matching is implemented
- `MEMORY.md` — add PO match architecture notes
- `context/ai-module.md` — add PO match module docs

### Impact on Existing Workflows

- Receiving flow gains a new step (PO match) but existing behavior is preserved — "No PO" skips it entirely
- Receipt model now optionally links to PO for traceability
- No impact on other workflows (BOM, checkout, fabrication)

---

## Validation Checklist

- [ ] 376 POs seeded from Knowify export, linked to correct suppliers
- [ ] `GET /api/pos` returns open POs, filterable by supplier and search term
- [ ] `POST /api/pos/match` matches by PO number with high confidence
- [ ] Snapping a packing slip with a PO number auto-matches the correct PO
- [ ] PO match card displays correctly with confirm/change/skip actions
- [ ] "No PO" flow works for ad-hoc receipts (existing behavior preserved)
- [ ] Receipt is linked to PO via `purchaseOrderId` when PO is confirmed
- [ ] Manual PO search/picker works when auto-match fails
- [ ] Step progress shows 4 steps when PO flow is active
- [ ] All existing receiving tests/flows still work

---

## Success Criteria

The implementation is complete when:

1. A user can snap a packing slip photo and the system auto-matches it to the correct Knowify PO within 2 seconds
2. The user can confirm, change, or skip the PO match before proceeding to review items
3. Receipts are linked to POs in the database for audit traceability
4. The "No PO" path works seamlessly for ad-hoc deliveries with zero friction

---

## Notes

- **Future: PO line-item pre-fill** — When Knowify line-item export becomes available, add a `seed-po-lines.ts` to populate `POLineItem` records. The `POMatchCard` can then show expected items and the REVIEW phase can pre-fill from PO lines instead of requiring AI parsing. Variance detection (PO qty vs. received qty) activates at that point.
- **Future: PO status tracking** — As receipts are logged, POs can transition OPEN → PARTIALLY_RECEIVED → RECEIVED → CLOSED. The dashboard could show "X open POs awaiting delivery."
- **Future: blanket order tracking** — PRD mentions blanket orders (WF9 Step 4). The same PO model can represent blanket orders with running draw tracking.
- The Knowify export shows all POs with Balance = Amount (nothing received). This is accurate — no receiving has been done through the app yet.

---

## Implementation Notes

**Implemented:** 2026-03-11

### Summary

All 8 steps executed. 375 Knowify POs seeded (1 skipped — "Skilled Trades Partners Inc." had no matching supplier, likely a labor sub). Schema extended with `amount`, `jobName`, `clientName` on PurchaseOrder. PO match module, API routes, hooks, UI card, and receiving flow integration all complete. Build passes clean.

### Deviations from Plan

- Added `clientName` field to PurchaseOrder schema (not in original plan) — the Knowify export has a Client/Department column that's useful for matching and display.
- Excluded `prisma/seed-*.ts` from tsconfig to prevent build errors from untyped xlsx require.
- PO status updates to PARTIALLY_RECEIVED immediately on any receipt (simplified from the plan's "check if all items received" since we don't have line items yet).

### Issues Encountered

- xlsx package dynamic import failed (ESM/CJS mismatch) — resolved by using `require()` instead
- Seed TS files were included in Next.js build — resolved by adding to tsconfig exclude
