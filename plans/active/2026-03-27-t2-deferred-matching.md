# Plan: T2 Deferred Matching — Pass-Through on BOM, Match at Checkout

**Created:** 2026-03-27
**Status:** Implemented
**Request:** T2 items (fasteners, consumables) pass through as-is on BOMs with the SM's raw text. No catalog matching friction. Foreman matches to specific catalog product at checkout.

---

## Overview

### What This Plan Accomplishes

Changes how Tier 2 items (fasteners, caulking, tape, consumables) flow through the BOM system. Instead of the AI trying to match "TEK screws" to a specific SKU like "#12 TEK 5" (causing wrong matches and friction), T2 items pass through as written — the SM's raw text becomes the line item. At checkout, the foreman picks the exact product from a filtered catalog list, since he's the one pulling it from the shelf.

### Why This Matters

T2 items are the #1 source of matching friction. SMs write general descriptions ("3 lbs TEK screws", "1 box drive pins") that the AI matches to wrong specific SKUs (drive pins → "Shots & Pins", butyl → "TREMCO JS-773"). Users then have to reject the match, search the catalog, or add as custom — more taps than just writing it on paper. By deferring matching to the person who actually knows what they're pulling, we eliminate this entire class of friction.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | T2 pass-through rows on confirmation screen: simple green-checked rows with name + qty + unit pill. Checkout product picker: filtered list of T2 catalog products, tappable cards, 44px targets. |
| `design-inspiration` | Use existing design tokens. T2 rows should use purple-50 bg tint (matches existing T2 badge). Product picker at checkout should match existing ProductPicker pattern. |

### How Skills Shaped the Plan

T2 items on the BOM confirmation screen get a visually distinct but simpler treatment — auto-confirmed with a purple T2 badge, no matching UI. At checkout, the product picker reuses the existing `ProductPicker` component pattern (search + scrollable list) but filtered to the relevant T2 category.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `src/components/bom/bom-photo-capture.tsx` | Photo BOM flow — streams items, builds feed, submits BOM |
| `src/components/bom/live-item-feed.tsx` | Renders parsed items with stepper + unit pill |
| `src/app/api/ai/parse-image-fast/route.ts` | AI parsing + post-processing |
| `src/lib/ai/parse.ts` | AI prompt, schema, catalog matching |
| `src/app/boms/[id]/page.tsx` | BOM detail + checkout mode |
| `src/components/bom/bom-line-item-row.tsx` | Line item rendering in all modes |
| `src/app/api/boms/[id]/checkout/route.ts` | Checkout API |
| `prisma/seed-knowify.ts` | T2 classification: Fasteners, Caulking & Sealants, Tape, Shots & Pins |
| `prisma/schema.prisma` | BomLineItem model |

### Gaps Being Addressed

1. **AI tries to match T2 items to specific SKUs** — causes wrong matches (drive pins → "Shots & Pins"), forcing user to fix
2. **Photo BOM hardcodes all items to TIER_1** — `bom-photo-capture.tsx:524` ignores matched product's tier
3. **No tier-aware behavior on confirmation screen** — T1 and T2 items get identical treatment
4. **No product matching at checkout** — T2 items just get qty checked out with no product linkage
5. **T2 items show conversion prompts and matching friction** — same ceremony as $1,000 panels

---

## Proposed Changes

### Summary of Changes

- **AI parsing**: Detect T2 items (by matched product tier or keyword analysis) and mark them — skip catalog matching for T2
- **Photo BOM feed**: T2 items auto-confirm with raw text as name, no resolver/matching UI
- **BOM submission**: Use matched product's tier (fix hardcoded TIER_1 bug), T2 items saved as non-catalog with raw text
- **BOM detail page**: T2 items display with purple tint and "Match at checkout" note
- **Checkout flow**: T2 items show product picker — foreman selects specific catalog product before checkout completes
- **Checkout API**: Accept optional `productId` override for T2 items, link to product for costing

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/ai/parse-image-fast/route.ts` | Mark T2 items in stream output, skip catalog match for T2 |
| `src/components/bom/bom-photo-capture.tsx` | Fix tier hardcode, auto-confirm T2 items, pass through as-is |
| `src/components/bom/live-item-feed.tsx` | Visual differentiation for T2 pass-through items (purple tint, no resolver) |
| `src/app/boms/[id]/page.tsx` | Checkout mode: add product picker for unmatched T2 items |
| `src/components/bom/bom-line-item-row.tsx` | Checkout mode: show product picker trigger for T2 items without productId |
| `src/app/api/boms/[id]/checkout/route.ts` | Accept productId for T2 items, link to product on checkout |
| `src/lib/ai/parse.ts` | Add T2 category keywords to ProductData for tier detection |

### No New Files

Reuses existing `ProductPicker` component for checkout matching.

---

## Design Decisions

### Key Decisions

1. **T2 detection uses matched product tier + keyword fallback**: If the AI matches to a catalog product that IS T2 (Fasteners, Caulking, etc.), we know it's T2. If no match, we check the parsed item name against T2 keywords (tek, screw, rivet, bolt, pin, caulk, silicone, butyl, tape, adhesive). This avoids adding tier awareness to the AI prompt.

2. **T2 items saved as non-catalog on BOM**: Even if the AI matched "butyl" to "FSI-96 BUTYL", we DON'T save the productId on the BOM. Instead, we save `isNonCatalog: true` with the raw text. The product link happens at checkout. This means the BOM is a "shopping list" in the SM's language, not the catalog's.

3. **Foreman forced to match at checkout**: T2 line items without a productId cannot be checked out until the foreman picks a product. This ensures costing data is captured (the whole point of T2) while shifting the matching burden to the right person.

4. **Product picker filtered by T2 category**: When the foreman taps a T2 item at checkout, the picker shows only relevant T2 products (Fasteners if the item looks like a fastener, all T2 if unsure). This keeps the list manageable.

5. **No changes to T1 flow**: Panels, trim, tracked materials keep full AI matching. This change ONLY affects T2 items.

### Alternatives Considered

- **Tell the AI about tiers in the prompt**: Rejected — adds complexity to the prompt, AI might misclassify, and it doesn't solve the fundamental problem (SM doesn't know which specific SKU).
- **Auto-match T2 but with lower confidence threshold**: Rejected — the wrong match is worse than no match for T2 items.
- **Skip T2 items entirely (don't show on BOM)**: Rejected — they need to be on the BOM for costing and for the foreman to know what to pull.

### Open Questions

1. **Should the foreman be able to check out T2 items WITHOUT matching to a product?** (e.g., "I grabbed some random TEK screws, don't care which SKU") — Current plan forces matching for costing. Gabe to confirm.

---

## Step-by-Step Tasks

### Step 1: Add T2 Detection Utility

Create a utility function that determines if a parsed item is T2 based on matched product tier or keyword analysis.

**Actions:**
- Add `isLikelyT2(productTier: string | null, itemName: string, category: string | null): boolean` to `src/lib/units.ts` (or a new `src/lib/tier-utils.ts`)
- Keywords: tek, screw, bolt, rivet, nut, washer, fastener, pin, shot, clamp, anchor, caulk, silicone, adhesive, sealant, butyl, tape, dbsc, durasil, froth
- If matched product has `tier === "TIER_2"`, return true
- If no product match, check item name/category against keywords

**Files affected:**
- `src/lib/units.ts` (or new file)

---

### Step 2: Mark T2 Items in Photo BOM Stream

In the parse-image-fast post-processing, detect T2 items and add a flag to the CatalogMatch output.

**Actions:**
- After catalog matching, check if matched product is T2 or if item name contains T2 keywords
- For T2 items: override `isNonCatalog: true`, clear `matchedProduct` (don't link to specific SKU), set `matchConfidence: 1.0` (auto-confirm), preserve raw text as parsedItem.name
- Keep the category from the matched product for filtering at checkout (store in parsedItem.category)

**Files affected:**
- `src/app/api/ai/parse-image-fast/route.ts`

---

### Step 3: Fix Tier Hardcode + Auto-Confirm T2 in Photo BOM

Fix the TIER_1 hardcode and make T2 items auto-confirm without matching.

**Actions:**
- In `bom-photo-capture.tsx` line 524: Use matched product's tier when available, default to T2 for non-catalog items with T2 keywords
- Add tier field to `FeedItem` interface
- T2 items: set `confirmed: true` immediately (no review needed)
- T2 items in `handleSubmit`: set `tier: "TIER_2"`, `isNonCatalog: true`, use raw text as `nonCatalogName`

**Files affected:**
- `src/components/bom/bom-photo-capture.tsx`

---

### Step 4: Visual Differentiation for T2 Items on Feed

T2 items on the confirmation screen get a simpler, auto-confirmed treatment.

**Actions:**
- In `live-item-feed.tsx`: if item has tier === "TIER_2" (or detected as T2):
  - Green checkmark (auto-confirmed)
  - Purple T2 badge
  - No resolver/tap-to-review behavior
  - Show raw text as name (not catalog product name)
  - Still has qty stepper + unit pill (editable)
  - No flagged/orange styling even if low confidence

**Files affected:**
- `src/components/bom/live-item-feed.tsx`

---

### Step 5: T2 Product Picker at Checkout

When the foreman checks out T2 items, show a product picker to match to a specific catalog product.

**Actions:**
- In `bom-line-item-row.tsx` checkout mode: for T2 items without `productId`, show "Select product" button instead of qty input
- Tapping opens a product picker (reuse `ProductPicker` component) filtered to T2 products
- Once product selected, show the normal qty input for checkout
- Store the selected productId on the BomLineItem via API

**Files affected:**
- `src/components/bom/bom-line-item-row.tsx`
- `src/app/boms/[id]/page.tsx`

---

### Step 6: Checkout API — Accept Product Link for T2

Allow the checkout API to link a T2 item to a specific catalog product.

**Actions:**
- Add `productId` to the checkout item schema (optional)
- When provided on a non-catalog T2 item, update `BomLineItem.productId` to link to the selected product
- This enables costing via the linked product's WAC

**Files affected:**
- `src/app/api/boms/[id]/checkout/route.ts`

---

### Step 7: QA Validation

**Actions:**
- Run `npx tsc --noEmit`
- Run `npx tsx scripts/token-audit.ts`
- Test photo BOM with the test image (Needham Sudbury Farms):
  - T2 items (TEK screws, drive pins, butyl, silicone) auto-confirm with raw text
  - T1 items (panels, doors, T-bar) go through normal matching
  - UOM pills show correctly for all items
- Test checkout:
  - T2 items require product selection before checkout
  - T1 items check out normally
- Test BOM detail view shows T2 items with "Match at checkout" indicator

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/bom/checkout-all-button.tsx` — may need to skip T2 items without product match
- `src/hooks/use-boms.ts` — React Query hooks, no changes needed
- `src/lib/stock.ts` — T2 stock handling already correct (skips qty updates for non-RECEIVE)
- `src/components/bom/bom-ai-flow.tsx` — text/voice BOM flow, separate from photo flow (future alignment)

### Updates Needed for Consistency

- The text/voice BOM flow (`bom-ai-flow.tsx`) should eventually get the same T2 treatment, but that's a separate effort
- `checkout-all-button` should only include items that have a product linked

### Impact on Existing Workflows

- **BOM creation**: T2 items become frictionless (auto-confirm, no matching)
- **BOM detail view**: T2 items show differently (purple tint, "match at checkout")
- **Checkout**: T2 items gain a new step (product selection), but this replaces the current friction of wrong matches at creation time — net improvement
- **Costing**: No change — T2 items still get costed via their linked product, just the linking happens at checkout instead of creation

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npx tsx scripts/token-audit.ts` — no new errors
- [ ] Photo BOM: T2 items auto-confirm with raw text + correct UOM
- [ ] Photo BOM: T1 items still go through full matching flow
- [ ] Photo BOM: tier correctly set on all items (not hardcoded TIER_1)
- [ ] BOM detail: T2 items show purple tint + "Match at checkout" note
- [ ] Checkout: T2 items show product picker, foreman must select before checkout
- [ ] Checkout: T1 items check out normally (no regression)
- [ ] Checkout API: productId link saved for T2 items
- [ ] No regressions on existing BOM creation/edit/checkout flows

---

## Success Criteria

1. T2 items on photo BOMs auto-confirm with the SM's raw text — zero matching friction
2. Foreman can match T2 items to specific catalog products at checkout via a product picker
3. T1 items are completely unaffected — same AI matching flow as today
4. The test image (Needham Sudbury Farms BOM) processes correctly: panels/doors/T-bar get T1 matching, screws/pins/butyl/silicone get T2 pass-through

---

## Notes

- This plan focuses on the photo BOM flow (`bom-photo-capture.tsx` + `live-item-feed.tsx`). The text/voice BOM flow (`bom-ai-flow.tsx` + `bom-confirmation-card.tsx`) should get the same treatment in a follow-up.
- The T2 keyword list should be maintained alongside the seed data classification. If new T2 categories are added to the catalog, the keywords should be updated.
- Future enhancement: "Fastener kits" — predefined bundles of common fasteners that auto-add to BOMs with one tap.
- The match history system will still learn from T2 items matched at checkout, improving future suggestions.
