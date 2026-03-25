# Plan: AI-First BOM Creation (WF2)

**Created:** 2026-03-09
**Status:** Implemented
**Request:** Rebuild the BOM builder so natural language (voice/text) and photo input are primary, manual catalog browse is fallback

---

## Overview

### What This Plan Accomplishes

Adds an AI-first BOM creation flow to the existing "New BOM" page. The Sales Manager dictates, types, or photographs a material list — the AI parses it into structured line items, matches to the product catalog, classifies tiers, structures non-catalog items, and shows live stock visibility (green/yellow/red). The existing manual form becomes a fallback tab. Same tabbed pattern as the receiving page.

### Why This Matters

BOM creation is the second-highest-impact workflow. The PRD says: "Voice and typed input is the primary path — catalog browse is the fallback." Currently, the SM has to search the catalog item by item and manually fill in non-catalog fields. Natural language input ("20 feet of 4-inch IMP, 5 boxes hinges, 2 tubes caulk, a 3x7 swing door") is dramatically faster and matches how the SM already thinks about materials.

---

## Current State

### Relevant Existing Structure

| File | What It Does |
|------|-------------|
| `src/app/boms/new/page.tsx` | Current form-based BOM creation (job name → product picker → non-catalog form → submit) |
| `src/app/api/boms/route.ts` | POST creates BOM with line items (supports catalog + non-catalog items) |
| `src/hooks/use-boms.ts` | `useCreateBom()` hook — POSTs to `/api/boms` |
| `src/components/bom/product-picker.tsx` | Searchable catalog dropdown |
| `src/components/bom/bom-line-item-row.tsx` | Line item display with qty/unit editing, dimension conversion |
| `src/components/ai/ai-input.tsx` | Text + voice + camera input bar (reusable) |
| `src/lib/ai/parse.ts` | `parseTextInput()` and `parseImageInput()` |
| `src/lib/ai/catalog-match.ts` | `matchItemsToCatalog()` with lastCost/avgCost |
| `src/lib/ai/types.ts` | ParsedLineItem, CatalogMatch, ConfirmedReceivingItem |
| `src/components/receiving/receiving-flow.tsx` | Reference pattern for 3-phase AI flow |

### Gaps Being Addressed

1. **No AI input on BOM creation.** The AIInput component exists but isn't wired to the BOM page.
2. **No stock visibility during BOM building.** PRD requires green/yellow/red stock status per item as the BOM is built.
3. **Non-catalog items require manual form filling.** AI should structure them automatically ("4in galvalume angle trim 10ft" → Category=Metal Trim, Dimension=4", Finish=Galvalume, Qty=10, UOM=linear ft).
4. **No tier classification by AI.** The AI can infer whether an item is Tier 1 (tracked) or Tier 2 (expensed) based on the catalog match.

---

## Proposed Changes

### Summary of Changes

- **Add a BOM-specific confirmation card** that shows stock status (green/yellow/red), tier badge, editable quantity, and non-catalog structured fields
- **Create a BOM AI flow component** that orchestrates: AI Input → Review/Edit Items → Submit (creates BOM as DRAFT)
- **Update the New BOM page** with tabs: "AI Build" (default) | "Manual Entry" (existing form)
- **Add stock status color logic** to confirmation cards based on current stock vs. quantity needed

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/bom/bom-confirmation-card.tsx` | BOM-specific confirmation card with stock status, tier, editable qty |
| `src/components/bom/bom-ai-flow.tsx` | AI-first BOM creation flow (job selection → AI input → review → submit) |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/app/boms/new/page.tsx` | Add tab layout: AI Build (default) vs Manual Entry (existing form) |
| `src/lib/ai/types.ts` | Add `ConfirmedBomItem` type |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Two-section flow, not three phases.** Unlike receiving (which has a separate Summary phase before committing stock), BOM creation just produces a DRAFT — no irreversible stock changes. So the flow is: (1) Job + AI Input, (2) Review items + Submit as Draft. No separate summary phase needed. The BOM detail page already handles the review/approve/checkout lifecycle.

2. **Job name stays as a text field.** The PRD mentions syncing jobs from Knowify, but that integration doesn't exist yet. Keep the simple text input for job name — it can be upgraded to a pre-populated dropdown when Knowify sync is built.

3. **Stock status as color coding.** For each catalog item on the BOM: green = enough in stock, yellow = will deplete stock below reorder point, red = not enough on hand. Uses `currentQty` and `reorderPoint` from the matched product. Non-catalog items don't show stock status.

4. **Tier auto-classification.** If the item matches a catalog product, use that product's tier. If it's non-catalog, default to TIER_2 (expensed) since non-catalog items are typically incidentals. The SM can override.

5. **Iterative AI input.** The SM can add items in multiple rounds — speak/type a batch, review, then speak/type more. Each parse result appends to the item list. This matches how BOMs are often built: the SM remembers items in chunks.

6. **Reuse existing BomLineItemRow for confirmed items.** After AI confirmation, items render using the existing `BomLineItemRow` component (in editable mode) rather than a custom display. This ensures consistent qty/unit editing behavior and dimension conversion.

7. **Submit creates DRAFT BOM.** The AI flow creates the BOM with status DRAFT (same as the manual form). The approval workflow remains unchanged — happens on the BOM detail page.

### Alternatives Considered

- **Three-phase flow with summary:** Rejected — BOM creation produces a DRAFT, not a committed action. Adding a summary step would be redundant since the BOM detail page is the review/approval step.
- **Replace the entire new BOM page:** Rejected — keeping the manual form as a tab ensures no regression and gives a fallback for edge cases.
- **Inline stock alerts only on submit:** Rejected — the PRD specifically requires live stock visibility as items are added, not just at the end.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Add ConfirmedBomItem Type

**Actions:**
- Add to `src/lib/ai/types.ts`:
  ```ts
  export interface ConfirmedBomItem {
    productId: string | null
    productName: string
    sku: string | null
    unitOfMeasure: string
    tier: "TIER_1" | "TIER_2"
    qtyNeeded: number
    isNonCatalog: boolean
    nonCatalogCategory: string | null
    nonCatalogUom: string | null
    nonCatalogEstCost: number | null
    currentQty: number      // for stock status display
    reorderPoint: number    // for stock status display
    dimLength: number | null
    dimLengthUnit: string | null
    dimWidth: number | null
    dimWidthUnit: string | null
    catalogMatch: CatalogMatch
  }
  ```

**Files affected:**
- `src/lib/ai/types.ts`

---

### Step 2: Build BOM Confirmation Card

A BOM-specific card showing each parsed item with stock status, tier, and editable quantity.

**Actions:**
- Create `src/components/bom/bom-confirmation-card.tsx`
- Each card shows:
  - Product name (matched catalog name or AI-parsed name for non-catalog)
  - Category badge
  - Tier badge (Tracked / Expensed) — auto-set from catalog match, editable via tap
  - Stock status indicator:
    - Green dot + "In stock: X {unit}" when currentQty >= qtyNeeded
    - Yellow dot + "Low: X {unit}" when currentQty < qtyNeeded but > 0
    - Red dot + "Out of stock" when currentQty <= 0
    - No stock indicator for non-catalog items
  - Editable quantity input
  - Unit of measure
  - Non-catalog badge if applicable, with structured fields shown (category, dimensions, finish, material)
  - Accept (green check) / Reject (red X) buttons
  - Alternative matches expandable (same as receiving pattern)
  - Parsed raw text attribution
- Also create `BomConfirmationList` wrapper with "Confirm All" button (same pattern as receiving)

**Files affected:**
- `src/components/bom/bom-confirmation-card.tsx` (new)

---

### Step 3: Build BOM AI Flow Component

The main orchestrator for AI-first BOM creation.

**Actions:**
- Create `src/components/bom/bom-ai-flow.tsx`
- State:
  - `jobName: string` — job name input
  - `notes: string`
  - `pendingMatches: CatalogMatch[]` — items awaiting review
  - `confirmedItems: ConfirmedBomItem[]` — accepted items ready for BOM
- Layout (single scrollable page, not phased):
  1. **Job section** (top): Job name input field. Always visible.
  2. **AI Input section**: AIInput component for text/voice/photo. Always visible so SM can add more items anytime.
  3. **Pending items** (if any): BomConfirmationList showing items that need review.
  4. **Confirmed items** (if any): List of accepted items using `BomLineItemRow` in editable mode, with stock status dots. Each item has a remove button.
  5. **Notes section** (collapsible or at bottom)
  6. **Submit button**: "Create BOM (X items)" — calls `useCreateBom()`, navigates to BOM detail page on success.
- On AIInput `onParseComplete`:
  - Append new parsed items to `pendingMatches`
- On accept:
  - Build `ConfirmedBomItem` from the match
  - Set tier from catalog match product tier (or TIER_2 for non-catalog)
  - Set stock fields from matched product (currentQty, reorderPoint) — 0 for non-catalog
  - Move from pending to confirmed
- On reject:
  - Remove from pending
- On Confirm All:
  - Accept all pending items with defaults
- On Submit:
  - Validate jobName and at least 1 confirmed item
  - POST via `useCreateBom()` with all confirmed items mapped to the BOM line item schema
  - On success: toast + navigate to `/boms/{id}`

**Files affected:**
- `src/components/bom/bom-ai-flow.tsx` (new)

---

### Step 4: Add reorderPoint and Dimensions to Catalog Match

The BOM confirmation card needs `reorderPoint` and dimension fields to show stock status and support unit conversion. These aren't currently in the CatalogMatch product data.

**Actions:**
- In `src/lib/ai/catalog-match.ts`:
  - Add to the product select query: `reorderPoint`, `dimLength`, `dimLengthUnit`, `dimWidth`, `dimWidthUnit`
  - Add to the `CatalogProduct` interface
  - Add to the returned `matchedProduct` object in `CatalogMatch`
- In `src/lib/ai/types.ts`:
  - Add to `CatalogMatch.matchedProduct`: `reorderPoint: number`, `dimLength: number | null`, `dimLengthUnit: string | null`, `dimWidth: number | null`, `dimWidthUnit: string | null`

**Files affected:**
- `src/lib/ai/catalog-match.ts`
- `src/lib/ai/types.ts`

---

### Step 5: Update the New BOM Page

Replace the current page with a tabbed layout.

**Actions:**
- Rewrite `src/app/boms/new/page.tsx`:
  - Same tab pattern as receiving page: "AI Build" (default) | "Manual Entry"
  - AI Build tab renders `<BomAIFlow />`
  - Manual Entry tab renders the existing form (extract into `ManualBomForm` function within the same file)
  - Header: "New BOM" with back button (unchanged)

**Files affected:**
- `src/app/boms/new/page.tsx`

---

### Step 6: Build and Test

**Actions:**
- Run `npm run build` to verify no TypeScript errors
- Verify:
  - Text input parses items and shows confirmation cards with stock status
  - Voice input works through the same flow
  - Photo input (handwritten BOM) parses and matches
  - Confirm All works for high-confidence items
  - Stock status shows green/yellow/red correctly per item
  - Non-catalog items show with structured fields and TIER_2 default
  - Tier can be visually identified on each card
  - Confirmed items appear in editable list with BomLineItemRow
  - Submit creates DRAFT BOM and navigates to detail page
  - Manual Entry tab works exactly as before

**Files affected:**
- None (validation step)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/boms/page.tsx` — BOM list page links to `/boms/new`
- `src/app/boms/[id]/page.tsx` — BOM detail page (receives created BOMs)
- `src/app/page.tsx` — dashboard shows active BOMs count
- `src/hooks/use-boms.ts` — `useCreateBom()` hook (unchanged)
- `src/app/api/boms/route.ts` — BOM creation API (unchanged)

### Updates Needed for Consistency

- `CLAUDE.md` — update project status
- Memory file — update status

### Impact on Existing Workflows

- **No breaking changes.** The BOM creation API is unchanged. The manual form is preserved as a tab.
- **BOM detail/edit page is unchanged.** The AI flow creates DRAFTs — the existing approval/checkout lifecycle is unaffected.
- **CatalogMatch type expanded** — `matchedProduct` gets more fields. This is additive; existing consumers (receiving flow) are unaffected since they don't use the new fields.

---

## Validation Checklist

- [ ] Text input → AI parses → confirmation cards with stock status appear
- [ ] Voice input works through the same parse → confirm flow
- [ ] Photo of handwritten BOM → AI parses → confirmation cards
- [ ] Stock status colors: green (sufficient), yellow (low), red (insufficient/out)
- [ ] Non-catalog items show with structured fields (category, dimensions, etc.)
- [ ] Tier auto-classified from catalog match; TIER_2 default for non-catalog
- [ ] "Confirm All" accepts all high-confidence items
- [ ] Confirmed items editable (qty, unit) before submission
- [ ] SM can add more items via AI input after initial parse
- [ ] Submit creates DRAFT BOM and navigates to detail page
- [ ] Manual Entry tab works exactly as before
- [ ] `npm run build` passes with no TypeScript errors
- [ ] CLAUDE.md and memory updated

---

## Success Criteria

The implementation is complete when:

1. A Sales Manager can voice-dictate or type a material list, see AI-parsed items with stock status, and create a DRAFT BOM in under 60 seconds
2. All three input methods (text, voice, photo) produce structured line items with catalog matching and stock visibility
3. The manual form remains accessible as a fallback tab
4. Created BOMs work correctly through the existing approval → checkout lifecycle
5. The app builds without errors

---

## Notes

- **Assembly items** (doors, panels) are mentioned in the PRD but assembly templates aren't built yet. When they are (Step 5 of the AI-First Redesign), the AI parser can match "3x7 swing door" to an assembly template. For now, these will match as catalog products or be structured as non-catalog items.
- **BOM templates** (PRD WF2 Step 3) are not in scope here. They can be added later as a separate feature — "Start from template" option alongside the AI input.
- **Job list from Knowify** is future work. For now, job name is a free text field.
- **Notifications** (PRD says "BOM approval triggers notification") already exist in the schema but aren't wired up. That's a separate concern from the BOM creation flow.

---

## Implementation Notes

**Implemented:** 2026-03-09

### Summary

Built the full AI-first BOM creation flow with AI Input (voice/text/photo) → confirmation cards with stock status (green/yellow/red) → editable confirmed items list → submit as DRAFT. Tabbed page layout (AI Build | Manual Entry) matching the receiving page pattern.

### Deviations from Plan

- **Steps 1 + 4 combined** — added `ConfirmedBomItem` type and expanded `CatalogMatch` with reorderPoint/dimensions in the same pass.
- **Added `nonCatalogName` to `ConfirmedBomItem`** — discovered during validation that this field was missing from the type but needed for the API. Fixed before it could cause issues.
- **Confirmed items use custom inline display** instead of reusing `BomLineItemRow` — simpler to show stock status dots + editable qty + tier badges inline rather than adapting the existing component which has complex dimension conversion logic not needed during initial BOM creation.

### Issues Encountered

- **Missing `nonCatalogName` field** — caught during automated data flow validation. The type was missing this field but the API expected it. Fixed by adding the field to `ConfirmedBomItem` and updating all builders.
