# Plan: Custom Item Memory & TWS Catalog Matching

**Created:** 2026-03-18
**Status:** Implemented
**Request:** Save custom items to the learning loop so they match on future scans; improve matching for TWS coverplate items that are fabricated in-house from coil stock

---

## Overview

### What This Plan Accomplishes

Two improvements to the BOM matching system: (1) Custom items get remembered so the same handwritten text matches the same custom name next time, and (2) TWS trim products get added to the catalog with fabrication recipes linking them to Galvanized Coil, so they match properly and deduct from coil stock at checkout.

### Why This Matters

Currently every BOM scan starts from scratch for custom items — workers re-type the same custom names repeatedly. TWS coverplates are core RSNE products but the catalog only has 1 TWS variant (TWS Cap), so the AI can never match OC, IC, Crown, Base, etc. These are fabrication items that consume coil stock — without proper matching, there's no inventory tracking for coil consumption.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `engineering-skills` (backend) | MatchHistory schema extension design; custom item resolution during Pass 2 |
| `product-skills` (product manager) | Decision: custom items stay custom with remembered names; items appearing 3+ times get flagged for catalog review (Option C hybrid) |

### How Skills Shaped the Plan

The product decision is a hybrid: custom items get saved with their name so they auto-match on future scans, but items that appear frequently (3+ times across BOMs) get surfaced on the dashboard as "candidates for catalog." This avoids auto-creating low-quality catalog entries while ensuring frequently-used items eventually get proper catalog representation with SKUs, recipes, and costs.

---

## Current State

### Relevant Existing Structure

| File | Relevance |
|------|-----------|
| `prisma/schema.prisma` | MatchHistory requires `productId` (non-nullable FK) — can't store custom items |
| `src/app/api/match-history/route.ts` | POST bulk-upserts with productId; GET lookups by normalized text |
| `src/components/bom/bom-photo-capture.tsx` | Learning loop at line 469 filters `!i.isNonCatalog` |
| `src/app/api/ai/parse-image-fast/route.ts` | Loads top 200 match history entries for boosting |
| `src/app/api/ai/refine-matches/route.ts` | Pass 2 uses top 50 history entries as few-shot examples |
| `prisma/seed.ts` | Only 1 TWS product (TWS Cap 2"x4.25"x2"); no OC/IC/Crown/Base variants |
| `src/lib/ai/parse.ts` | System prompt mentions IMP, FRP abbreviations but not TWS-specific guidance |

### Gaps or Problems Being Addressed

1. **Custom items forgotten:** MatchHistory requires productId — custom items (no product) can't be stored
2. **TWS products missing from catalog:** Only 1 of ~20+ common TWS variants exists; AI can't match to products that don't exist
3. **No fabrication recipes:** TWS→Coil recipes not seeded; checkout can't auto-deduct coil stock
4. **AI prompt lacks TWS context:** System prompt doesn't explain TWS abbreviations (OC = Outside Corner, IC = Inside Corner, etc.)

---

## Proposed Changes

### Summary of Changes

**Feature 1 — Custom item memory:**
- Make `productId` optional on MatchHistory model
- Add `customName` field for non-catalog item names
- Include custom items in the learning loop (bom-photo-capture submit)
- Use custom match history during Pass 2 to suggest previously-used custom names
- Surface frequently-used custom items (3+ occurrences) on dashboard as "catalog candidates"

**Feature 2 — TWS catalog + fabrication:**
- Add common TWS products to seed data (OC, IC, Crown, Base, Molding in standard sizes)
- Create FabricationRecipe entries linking each TWS product to appropriate coil stock
- Add TWS abbreviation context to the AI system prompt
- Verify checkout flow correctly deducts coil stock for RSNE_MADE items

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `prisma/seed-tws.ts` | Seed script for TWS products + fabrication recipes (imported by main seed) |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `prisma/schema.prisma` | Make MatchHistory.productId optional; add customName field |
| `src/app/api/match-history/route.ts` | Support custom item upserts (customName instead of productId) |
| `src/components/bom/bom-photo-capture.tsx` | Include custom items in learning loop on submit |
| `src/app/api/ai/refine-matches/route.ts` | Include custom match history in Pass 2 context |
| `src/app/api/ai/parse-image-fast/route.ts` | Include custom match history for boosting |
| `src/lib/ai/parse.ts` | Add TWS abbreviations to system prompt |
| `prisma/seed.ts` | Import and run TWS seed data |

---

## Design Decisions

### Key Decisions Made

1. **Make productId optional, add customName:** Rather than creating a separate table, extend MatchHistory. A row either has `productId` (catalog match) or `customName` (custom item) — never both. This keeps the learning loop unified.

2. **Custom items stay custom — flag for catalog at 3+ uses:** Don't auto-create catalog products (data quality risk). Instead, remember the custom name for future matching, and when an item appears 3+ times, surface it on the dashboard as a "catalog candidate" for Gabe to review.

3. **Seed TWS products rather than dynamic creation:** TWS products are standard, finite items (OC, IC, Crown, Base, Molding × standard sizes). Better to add them properly to the catalog with correct UOMs, costs, and fabrication recipes than to let them accumulate as custom items.

4. **Add TWS context to AI prompt:** The system prompt already explains IMP, FRP, SS abbreviations. Adding TWS/OC/IC/Crown etc. is the same pattern — helps the AI match handwritten shorthand to catalog products.

### Alternatives Considered

- **Separate CustomItemHistory table:** Rejected — duplicates the learning loop infrastructure. MatchHistory already has the right shape.
- **Auto-create catalog products from custom items:** Rejected — leads to duplicates, missing SKUs, no costs. Better to flag for manual review.
- **Dynamic TWS matching without catalog products:** Rejected — without catalog entries, there's nothing to match to. The AI needs products in the prompt context.

### Open Questions

None — all answered. TWS product data is in `outputs/tws-fabrication-recipes.csv`. Seed script exists at `prisma/seed-fabrication-recipes.ts`. Source coil is always "Galvanized Steel Coil - Textured White (26ga)". Consumption rates per piece are in the CSV. The missing piece is that most TWS products don't exist in the catalog yet (only TWS Cap and Galvanized Screed) — Step 6 needs to add the remaining products to the catalog first, then run the existing fabrication recipe seed.

---

## Step-by-Step Tasks

### Step 1: Schema — Make MatchHistory support custom items

**Actions:**

- In `prisma/schema.prisma`, modify MatchHistory:
  - Change `productId` from required to optional: `productId String?`
  - Change `product` relation to optional: `product Product? @relation(...)`
  - Add `customName String?` field — stores the custom item name when no catalog match
  - Add validation comment: either productId or customName must be set, never both
- Run `npx prisma db push`

**Files affected:**
- `prisma/schema.prisma`

---

### Step 2: API — Update match history to support custom items

**Actions:**

- In `src/app/api/match-history/route.ts`:
  - POST handler: accept `customName` as alternative to `productId` in the matches array
  - Upsert logic: if customName provided (no productId), store with `productId: null, customName: name`
  - GET handler: return customName in results when no productId
- Validation: reject entries that have neither productId nor customName

**Files affected:**
- `src/app/api/match-history/route.ts`

---

### Step 3: Learning loop — Save custom items on BOM submit

**Actions:**

- In `src/components/bom/bom-photo-capture.tsx`:
  - Remove the `!i.isNonCatalog` filter from the confirmed matches (line ~470)
  - For catalog items: send `{ rawText, productId }` (existing behavior)
  - For custom items: send `{ rawText, customName: productName }` (new)
  - Both go to the same `/api/match-history` POST endpoint

**Files affected:**
- `src/components/bom/bom-photo-capture.tsx`

---

### Step 4: Pass 2 — Use custom history for matching

**Actions:**

- In `src/app/api/ai/refine-matches/route.ts`:
  - Load custom match history alongside catalog history
  - Format custom entries as: `"TWS Coverplate 2x2" → [CUSTOM: TWS Coverplate 2x2] (confirmed 3x)`
  - Include in the prompt context so Sonnet can suggest custom names for unmatched items
- In `src/app/api/ai/parse-image-fast/route.ts`:
  - Load custom history entries alongside catalog history
  - For items matching custom history: set `isNonCatalog: true`, use customName as productName, boost confidence

**Files affected:**
- `src/app/api/ai/refine-matches/route.ts`
- `src/app/api/ai/parse-image-fast/route.ts`

---

### Step 5: AI prompt — Add TWS abbreviation context

**Actions:**

- In `src/lib/ai/parse.ts`, update SYSTEM_PROMPT to add TWS context:
  ```
  - TWS = Trim/Wall/Steel metal trim pieces. Common types: OC = Outside Corner, IC = Inside Corner, Crown, Base, Molding, Cap, Flatstock
  - TWS dimensions: width x depth (e.g., "OC 2x3" = Outside Corner 2" x 3")
  - TWS items are cut from steel coil — match to catalog TWS products by type + size
  ```
- Also update the BOM-specific prompt (parseBomImageStream) with the same context

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 6: Seed — Add missing TWS products to catalog, then run fabrication recipe seed

The CSV (`outputs/tws-fabrication-recipes.csv`) has 13 TWS variants. The catalog only has TWS Cap and Galvanized Screed. Need to add the missing products first.

**Actions:**

- Add missing TWS products to the catalog via a seed script or direct insert:
  - TWS Inside Corner 2" x 2" (2.67 sq ft/piece)
  - TWS Inside Corner 3" x 3" (4.00 sq ft/piece)
  - TWS Inside Corner 3.5" x 3.5" w/ 1.5" Standoff (5.67 sq ft/piece)
  - TWS Outside Corner 2" x 3" (3.33 sq ft/piece)
  - TWS Outside Corner 2" x 6" (5.33 sq ft/piece)
  - TWS Outside Corner 2" x 7" (6.00 sq ft/piece)
  - TWS Outside Corner 3" x 6" (6.00 sq ft/piece)
  - TWS Outside Corner 3" x 7" (6.67 sq ft/piece)
  - TWS Cooler Screed (5.17 sq ft/piece)
  - TWS Freezer Screed (2.33 sq ft/piece — comes in pairs)
  - TWS Base Cover Trim 1.5" x 2" x 2" (4.08 sq ft/piece)
  - TWS Flat Batten 6" w/ Hem (4.00 sq ft/piece)
  - (TWS Cap already exists in catalog)
- All in "Trim & Accessories" category, UOM "each", 8' length
- Source: "Galvanized Steel Coil - Textured White (26ga)"
- Then run `prisma/seed-fabrication-recipes.ts` to create the recipe links
- Existing seed script already handles matching products by name and creating recipes

**Files affected:**
- `prisma/seed-fabrication-recipes.ts` (may need minor updates)
- New seed script or API call to add missing products

---

### Step 7: Validation and testing

**Actions:**

- Verify custom item memory:
  - Add "TWS Coverplate 2x2" as custom on BOM #1
  - Scan a new BOM with similar text → verify it auto-suggests "TWS Coverplate 2x2"
- Verify TWS catalog matching:
  - After seeding TWS products, scan a BOM with "OC 2x3" → verify it matches to "TWS OC 2"x3" 8'"
  - Verify fabricationSource auto-set to RSNE_MADE
- Verify checkout deduction:
  - Check out a TWS item from a BOM → verify coil stock decreases by recipe amount
- Verify catalog candidate surfacing:
  - Custom item used 3+ times → appears in dashboard alerts (future enhancement — note only)

**Files affected:**
- All files from previous steps (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/api/boms/route.ts` — auto-sets RSNE_MADE using FabricationRecipe lookup; will work automatically for new TWS products
- `src/app/api/boms/[id]/checkout/route.ts` — deducts source material using recipe; will work for TWS→Coil
- `src/components/bom/bom-photo-capture.tsx` — already has learning loop; needs custom item extension

### Updates Needed for Consistency

- `context/project-status.md` — update after implementation
- `context/ai-module.md` — add note about custom item memory

### Impact on Existing Workflows

- **BOM photo capture:** Custom items now saved to learning loop. No UX change — happens transparently on submit.
- **Future BOM scans:** Custom items auto-match with previously-used names. Reduces manual re-typing.
- **TWS items:** Match to real catalog products → get proper fabrication source → deduct coil at checkout. Full pipeline works.
- **Existing match history:** Unaffected. productId stays required for existing entries; new entries can have productId OR customName.

---

## Validation Checklist

- [ ] MatchHistory.productId is optional; customName field exists
- [ ] Custom items saved to match history on BOM submit
- [ ] Custom match history used in Pass 2 (refine-matches) context
- [ ] Custom match history used in parse-image-fast for boosting
- [ ] TWS abbreviations in AI system prompt
- [ ] TWS products seeded in catalog (OC, IC, Crown, Base, Molding, Cap)
- [ ] FabricationRecipes link TWS products to coil stock
- [ ] TWS items match from BOM photos and auto-set RSNE_MADE
- [ ] Build passes with no type errors

---

## Success Criteria

The implementation is complete when:

1. A custom item added once ("TWS Coverplate 2x2") auto-matches on the next BOM scan with the same name
2. TWS items on handwritten BOMs match to catalog products and are flagged as RSNE_MADE
3. Checking out TWS items deducts the correct amount from coil stock
4. Existing catalog matching continues to work without regression

---

## Notes

- **TWS seed data needs Gabe's input** on exact sizes, coil types, and consumption rates. The plan uses placeholders.
- **Dashboard "catalog candidates"** (surfacing custom items used 3+ times) is noted as a future enhancement — not in scope for this plan.
- The MatchHistory extension is backward-compatible — existing entries with productId continue working unchanged.
- Custom item matching is user-scoped (same as catalog matching). If one user's custom names should benefit all users, that's a future consideration.
