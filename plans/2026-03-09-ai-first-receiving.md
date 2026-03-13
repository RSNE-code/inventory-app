# Plan: AI-First Receiving (WF1)

**Created:** 2026-03-09
**Status:** Implemented
**Request:** Rebuild the receiving page so photo/voice/text AI input is the primary path, manual form is fallback

---

## Overview

### What This Plan Accomplishes

Transforms the receiving page from a manual form (pick supplier → search catalog → type quantities) into an AI-first workflow where the foreman snaps a photo of the packing slip, the AI extracts everything (supplier, items, quantities, costs), and the foreman confirms with one tap. Text and voice input are secondary paths. The existing manual form becomes a fallback accessible via a toggle.

### Why This Matters

This is the highest-impact workflow in the entire app. Today, receiving a shipment takes 5 steps and 2 people (foreman hands packing slip to office manager, who scans it, uploads it, and marks the PO received in Knowify). The AI-first approach collapses that into 1 step and 1 person — the foreman who's already standing next to the material.

---

## Current State

### Relevant Existing Structure

| File | What It Does |
|------|-------------|
| `src/app/receiving/page.tsx` | Current form-based receiving page (supplier picker → product search → qty/cost entry) |
| `src/app/api/receiving/route.ts` | POST creates receipt + adjustStock for each item; GET returns history |
| `src/components/receiving/supplier-picker.tsx` | Searchable supplier dropdown |
| `src/components/receiving/receipt-line-row.tsx` | Line item row with qty/cost inputs |
| `src/hooks/use-receiving.ts` | `useSuppliers()` and `useCreateReceipt()` hooks |
| `src/lib/ai/parse.ts` | `parseTextInput()` and `parseImageInput()` — extracts structured items from text/images |
| `src/lib/ai/catalog-match.ts` | `matchItemsToCatalog()` — fuzzy matches parsed items to product catalog |
| `src/lib/ai/types.ts` | `ParsedLineItem`, `CatalogMatch`, `ParseResult`, `ReceivingParseResult` |
| `src/components/ai/ai-input.tsx` | Text + voice + camera input bar |
| `src/components/ai/confirmation-card.tsx` | `ConfirmationCard` + `ConfirmationList` for reviewing AI-parsed items |
| `src/lib/stock.ts` | `adjustStock()` — universal stock transaction handler with WAC recalc |
| `src/lib/cost.ts` | `calculateWAC()` |

### Gaps Being Addressed

1. **AI components aren't wired to receiving.** The AIInput, parsing, matching, and confirmation cards all exist but the receiving page doesn't use them.
2. **No supplier auto-detection.** The image parser extracts supplier name, but nothing matches it to a supplier in the database.
3. **No unit cost handling in confirmation cards.** Receiving needs cost per item — the current ConfirmationCard shows stock info but not cost fields.
4. **No receipt summary step.** The PRD requires a summary screen before final commit.
5. **No "Confirm All" → stock update flow.** The ConfirmationList has a Confirm All button but it doesn't connect to the receiving API.

---

## Proposed Changes

### Summary of Changes

- **Rebuild `receiving/page.tsx`** with a multi-step AI-first flow: AI Input → Review/Confirm Items → Receipt Summary → Done
- **Add supplier matching** — match AI-extracted supplier name to database suppliers (fuzzy)
- **Create a receiving-specific confirmation card** that includes editable unit cost fields
- **Add a receipt summary component** showing all confirmed items, supplier, total cost before final submit
- **Modify the receiving API** to accept optional `supplierName` (for auto-matching when supplier ID isn't known)
- **Keep the manual form** as a fallback tab/toggle

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/receiving/receiving-confirmation-card.tsx` | Receiving-specific confirmation card with editable qty + unit cost fields |
| `src/components/receiving/receipt-summary.tsx` | Final summary screen before committing the receipt |
| `src/components/receiving/receiving-flow.tsx` | Main AI-first receiving flow component (orchestrates the multi-step process) |
| `src/lib/ai/supplier-match.ts` | Fuzzy match AI-extracted supplier name to database suppliers |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/app/receiving/page.tsx` | Replace with tab layout: "AI Receive" (default) vs "Manual" (current form) |
| `src/app/api/receiving/route.ts` | Accept optional `supplierName` for auto-resolved supplier, support non-catalog items in notes |
| `src/hooks/use-receiving.ts` | Add `useSupplierMatch()` hook for supplier fuzzy matching |
| `src/lib/ai/types.ts` | Add `ConfirmedReceivingItem` type for items ready to submit |

### Files to Delete

None — we preserve the manual form as fallback.

---

## Design Decisions

### Key Decisions Made

1. **Multi-step flow, not single page.** The receiving flow has 3 phases: (1) AI Input — snap photo or type/speak, (2) Review Items — confirmation cards with editable qty/cost, supplier auto-matched, (3) Receipt Summary — final review before submit. Each phase is a visual state within a single page, not separate routes. This keeps navigation simple while giving the foreman a clear progression.

2. **Receiving-specific confirmation card, not reusing the generic one.** The generic `ConfirmationCard` shows category, tier, stock level — useful for BOM creation. Receiving needs different info: editable unit cost, received quantity (editable), and last purchase cost (for reference). Building a separate component avoids over-complicating the generic one.

3. **Supplier fuzzy matching as a separate utility.** The AI extracts "ABC Supply Co." from a packing slip. We need to match that to the supplier in our database (which might be "ABC Supply" or "ABC Supply Company"). This is a small, focused matching function — not part of the product catalog matcher.

4. **Tab layout for AI vs Manual.** Rather than hiding the manual form or making it a separate page, a simple tab toggle at the top lets the foreman switch. AI tab is selected by default. This avoids a "mode" that's hard to discover.

5. **Unit cost defaults to last purchase cost.** When AI doesn't extract a cost from the packing slip (common — packing slips often don't show prices), the system defaults to `product.lastCost`. The foreman can edit it, but usually doesn't need to. Cost can also be updated later when the invoice arrives.

6. **Non-catalog items are logged but don't affect stock.** If the AI parses an item that doesn't match any catalog product, it appears in the confirmation list with a "non-catalog" badge. The foreman can still confirm it — it gets logged in the receipt notes for record-keeping, but no stock transaction is created (since there's no product to update).

### Alternatives Considered

- **Separate `/receiving/ai` route:** Rejected — adds navigation complexity. Tabs on one page is simpler.
- **Inline editing on generic ConfirmationCard:** Rejected — would bloat the generic component with receiving-specific fields (unit cost, last cost reference). Better to build a focused component.
- **Skip receipt summary step:** Rejected — the PRD explicitly requires a summary before commit. It's also a safeguard against errors.

### Open Questions

None — all decisions can be made technically. No Gabe input needed.

---

## Step-by-Step Tasks

### Step 1: Add Supplier Fuzzy Matching

Create a utility to match AI-extracted supplier names against the database.

**Actions:**
- Create `src/lib/ai/supplier-match.ts`
- Function: `matchSupplier(extractedName: string): Promise<{ id: string; name: string; confidence: number } | null>`
- Load all active suppliers from DB
- Normalize and compare (lowercase, remove Inc/LLC/Co suffixes, token overlap)
- Return best match if confidence ≥ 0.6, else null
- Add `useSupplierMatch()` hook to `use-receiving.ts` — takes a supplier name string, returns matched supplier or null

**Files affected:**
- `src/lib/ai/supplier-match.ts` (new)
- `src/hooks/use-receiving.ts` (add hook)

---

### Step 2: Add ConfirmedReceivingItem Type

Extend the AI types to include a confirmed receiving item — an item that's been reviewed and is ready to submit.

**Actions:**
- Add to `src/lib/ai/types.ts`:
  ```ts
  export interface ConfirmedReceivingItem {
    productId: string | null // null for non-catalog
    productName: string
    quantity: number
    unitCost: number
    unitOfMeasure: string
    isNonCatalog: boolean
    catalogMatch: CatalogMatch // original match for reference
  }
  ```

**Files affected:**
- `src/lib/ai/types.ts`

---

### Step 3: Build Receiving Confirmation Card

A receiving-specific card that shows each parsed item with editable quantity and unit cost.

**Actions:**
- Create `src/components/receiving/receiving-confirmation-card.tsx`
- Shows: product name (matched or parsed), quantity (editable number input), unit of measure, unit cost (editable number input, defaults to lastCost or AI-extracted cost), line total (qty × cost), confidence badge, non-catalog badge if applicable
- Accept/Reject buttons (same pattern as generic card)
- Alternative matches expandable (same pattern)
- When accepting, the component emits a `ConfirmedReceivingItem`
- Also create a `ReceivingConfirmationList` that wraps multiple cards with a "Confirm All" action

**Files affected:**
- `src/components/receiving/receiving-confirmation-card.tsx` (new)

---

### Step 4: Build Receipt Summary Component

Shows the final receipt before committing — supplier, all items, total cost, confirm button.

**Actions:**
- Create `src/components/receiving/receipt-summary.tsx`
- Props: `supplier: { id: string; name: string }`, `items: ConfirmedReceivingItem[]`, `notes: string`, `onConfirm()`, `onBack()`, `isSubmitting: boolean`
- Displays: supplier name, table/list of items (name, qty, UOM, unit cost, line total), total cost at bottom, notes field, large orange "Confirm Receipt" button, "Back" link to go back to review step
- Read-only — no editing here. If foreman wants to change something, they go back.

**Files affected:**
- `src/components/receiving/receipt-summary.tsx` (new)

---

### Step 5: Build the AI Receiving Flow Component

The main orchestrator that manages the multi-step AI-first receiving process.

**Actions:**
- Create `src/components/receiving/receiving-flow.tsx`
- State machine with 3 phases:
  1. **INPUT** — Shows AIInput component (camera prominent). Empty state encourages photo capture. Text/voice also available.
  2. **REVIEW** — Shows supplier (auto-matched with option to change), ReceivingConfirmationList with all parsed items. User confirms/rejects/edits each item. "Continue to Summary" button when at least 1 item confirmed.
  3. **SUMMARY** — Shows ReceiptSummary. User confirms → calls receiving API → shows success → resets.
- On AIInput `onParseComplete`:
  - Store the `ReceivingParseResult`
  - Auto-match supplier name (from AI extraction) using `matchSupplier()`
  - If supplier not matched, show supplier picker inline for manual selection
  - Move to REVIEW phase
- On "Confirm All" or individual accepts:
  - Build `ConfirmedReceivingItem[]` from accepted matches
  - Default unitCost to `parsedItem.estimatedCost` → `matchedProduct.lastCost` → 0
- On "Continue to Summary":
  - Validate supplier is selected
  - Validate at least 1 confirmed item
  - Move to SUMMARY phase
- On "Confirm Receipt":
  - POST to `/api/receiving` with supplierId + items
  - On success: toast, reset to INPUT phase
  - On error: toast error, stay on SUMMARY

**Files affected:**
- `src/components/receiving/receiving-flow.tsx` (new)

---

### Step 6: Update the Receiving API

Support the new flow — accept items where lastCost might be used, handle the non-catalog case gracefully.

**Actions:**
- Modify `src/app/api/receiving/route.ts`:
  - Update schema: `unitCost` min changes from `z.number().min(0)` to `z.number().min(0).default(0)` (cost may not be known at receive time)
  - Add optional `nonCatalogItems` field: array of `{ name, quantity, unitCost, unitOfMeasure }` — stored in receipt notes as JSON for record-keeping
  - Keep existing stock adjustment logic unchanged

**Files affected:**
- `src/app/api/receiving/route.ts`

---

### Step 7: Update the Receiving Page

Replace the current single-form page with a tabbed layout.

**Actions:**
- Rewrite `src/app/receiving/page.tsx`:
  - Two tabs at top: "AI Receive" (default, selected) | "Manual Entry"
  - AI Receive tab renders `<ReceivingFlow />`
  - Manual Entry tab renders the existing form (move current form logic into an inline component or keep it in the same file behind the tab state)
  - Header stays the same: "Receive Material" with back button

**Files affected:**
- `src/app/receiving/page.tsx`

---

### Step 8: Add lastCost to Catalog Match Data

The confirmation card needs to show/default to the last purchase cost. Currently `CatalogMatch.matchedProduct` doesn't include `lastCost` or `avgCost`.

**Actions:**
- In `src/lib/ai/catalog-match.ts`: add `lastCost` and `avgCost` to the product select query and the `CatalogMatch.matchedProduct` interface
- Update `src/lib/ai/types.ts`: add `lastCost: number` and `avgCost: number` to the `matchedProduct` type in `CatalogMatch`

**Files affected:**
- `src/lib/ai/catalog-match.ts`
- `src/lib/ai/types.ts`

---

### Step 9: Build and Test

Run the dev server and verify:
- Photo capture → AI parsing → supplier match → confirmation cards → summary → receipt creation
- Voice input → same flow
- Text input → same flow
- Manual form tab still works
- Stock updates correctly after receipt
- WAC recalculates when unit cost is provided
- Non-catalog items show but don't create stock transactions
- Error handling (API errors, failed parsing, no matches)

**Actions:**
- `cd rsne-inventory && npm run build` to verify no TypeScript errors
- Test manually in dev server

**Files affected:**
- None (validation step)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/page.tsx` (dashboard) — links to `/receiving`
- `src/components/layout/sidebar.tsx` or nav — links to receiving
- `src/app/api/receiving/route.ts` — the API being called

### Updates Needed for Consistency

- `CLAUDE.md` — update Project Status to note Step 2 is in progress/complete
- Memory file — update status

### Impact on Existing Workflows

- **No breaking changes.** The existing receiving API contract is preserved (existing POST body still works). We're adding to it, not changing it.
- **Manual form is preserved** as a tab. Anyone who used the old form can still use it.
- **Stock and cost logic unchanged.** `adjustStock()` and `calculateWAC()` are called the same way.

---

## Validation Checklist

- [ ] Photo of a packing slip → AI parses items and supplier → confirmation cards appear
- [ ] Supplier auto-matched from packing slip text (or manual selection if no match)
- [ ] Each item shows editable quantity and unit cost (defaulting to last cost)
- [ ] "Confirm All" accepts all high-confidence items at once
- [ ] Receipt summary shows all items, supplier, total cost before final submit
- [ ] Confirming receipt creates stock transactions and updates product quantities
- [ ] WAC recalculates when unit cost is provided
- [ ] Non-catalog items appear but don't create stock transactions
- [ ] Voice and text input also work through the same flow
- [ ] Manual Entry tab works exactly as before
- [ ] `npm run build` passes with no TypeScript errors
- [ ] CLAUDE.md and memory updated

---

## Success Criteria

The implementation is complete when:

1. A foreman can snap a photo of a packing slip, review the AI-parsed items with costs, and confirm the receipt in 3 taps (camera → confirm all → confirm receipt)
2. All three input methods (photo, voice, text) flow through the same confirmation → summary → receipt pipeline
3. The manual form is still accessible as a fallback tab
4. Stock quantities, WAC, and transaction history update correctly on receipt confirmation
5. The app builds without errors and the page is mobile-friendly

---

## Notes

- **Knowify PO integration is NOT in scope.** That's a future step. For now, receiving works without POs — the foreman captures what arrived, the system updates stock. PO matching will layer on top later.
- **Packing slip image storage is deferred.** The PRD mentions storing the packing slip image with the receipt. This can be added later (upload to Supabase Storage, link to receipt record). Not critical for the core flow.
- **Cost entry flexibility.** Many packing slips don't show prices. The system defaults to last purchase cost. If no cost exists (new item), it defaults to 0. The office manager can update costs later when the invoice arrives — this is a common pattern in receiving workflows.

---

## Implementation Notes

**Implemented:** 2026-03-09

### Summary

Built the full AI-first receiving flow with 3-phase UI (Input → Review → Summary), supplier fuzzy matching, receiving-specific confirmation cards with editable qty/cost, receipt summary, and tabbed page layout (AI Receive | Manual Entry). All existing functionality preserved.

### Deviations from Plan

- **Step 6 (API update) skipped** — the existing receiving API schema already accepts `unitCost: z.number().min(0)` which handles the 0 default case. Non-catalog items are handled in the `ReceivingFlow` component by appending them to receipt notes. No API schema change was needed.
- **Step 8 (lastCost in catalog match) done early** — executed before Step 3 since the confirmation card depended on it.
- **Added `/api/suppliers/match` route** — plan mentioned the supplier matching utility and hook but didn't explicitly call out the API route. Added it to bridge client → server for the fuzzy matching.

### Issues Encountered

None.
