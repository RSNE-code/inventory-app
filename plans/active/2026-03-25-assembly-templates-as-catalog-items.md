# Plan: Assembly Templates as First-Class Catalog Items in AI Matching

**Created:** 2026-03-25
**Status:** Implemented
**Request:** Make assembly templates behave exactly like standard catalog products in the AI fuzzy-match flow during BOM creation — same confirmation UI, same alternatives, same tap-to-accept behavior.

---

## Overview

### What This Plan Accomplishes

Assembly templates (doors, sliders, floor panels, ramps) will flow through the exact same matching pipeline as regular catalog products. When a handwritten "Cooler Slider 5' x 6'6"" is parsed, it will appear as a fuzzy match with a blue circle checkbox, tappable to reveal best match options (e.g., "Cooler Slider 5' x 7'" at 92% confidence, "Cooler Slider 6' x 7'" at 78% confidence). No separate non-catalog treatment.

### Why This Matters

The current separate handling creates friction — assembly items auto-confirm without user review, or worse, show as unmatched "custom items" requiring manual catalog search. Gabe expects the same UX for a door match as a T-bar match: fuzzy match → tap → pick from ranked alternatives → confirm.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `engineering-skills` (backend + architecture) | Identified that the cleanest approach is to promote assembly templates into the `matchedProduct` field on `CatalogMatch`, not as `isNonCatalog` items. The `AT:` prefix resolution in `toCatalogMatch` is the single chokepoint. |
| `frontend-design` + `design-inspiration` | Invoked earlier in session — confirmed that assembly matches should use the same card styling as product matches with an "RSNE Fab" badge for differentiation. |

### How Skills Shaped the Plan

The architecture analysis revealed that the entire assembly template divergence stems from ONE function: `toCatalogMatch()` in `parse.ts`. When it detects the `AT:` prefix, it sets `matchedProduct: null` and `isNonCatalog: true`, which cascades through every downstream component. The fix is to populate `matchedProduct` with assembly template data instead — then all existing product-match UI just works. The LLM prompt improvements from the current session stay as-is since they're working.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `src/lib/ai/parse.ts` | `toCatalogMatch()` — the chokepoint where AT: matches diverge to non-catalog path |
| `src/lib/ai/types.ts` | `CatalogMatch` interface — defines `matchedProduct` shape |
| `src/app/api/ai/parse-image-fast/route.ts` | Streaming image parser — resolves AT: IDs, creates CatalogMatch objects |
| `src/components/bom/bom-photo-capture.tsx` | Photo BOM — creates FeedItems from CatalogMatch, handles submission |
| `src/components/bom/live-item-feed.tsx` | Renders streaming feed items — determines flagged/likely/confirmed states |
| `src/components/bom/flagged-item-resolver.tsx` | Shows "Match to catalog" / alternatives when user taps a flagged/likely item |
| `src/components/bom/bom-confirmation-card.tsx` | Manual BOM flow — renders match cards with alternatives |
| `src/components/bom/bom-ai-flow.tsx` | Manual BOM flow — handles parse results, confirmation, submission |
| `src/app/api/boms/route.ts` | BOM creation API — sets `fabricationSource` for assembly items |
| `src/app/api/boms/[id]/route.ts` | BOM update API — handles addLineItems for assembly items |

### Gaps or Problems Being Addressed

1. **Assembly templates set `matchedProduct: null`** — forces every downstream component to special-case them
2. **No alternatives shown** — user can't see "Cooler Slider 5x7" vs "Cooler Slider 6x7" ranked by confidence
3. **Photo flow auto-confirms** — user never gets to review/choose the right template
4. **Manual flow shows blue card** — but clicking it just accepts, no alternatives appear
5. **FlaggedItemResolver doesn't know about assembly templates** — can't show them as match options

---

## Proposed Changes

### Summary of Changes

- **Core change:** `toCatalogMatch()` populates `matchedProduct` for assembly templates (with a flag to distinguish them from regular products) instead of returning null
- **LLM prompt:** Already improved — ensure alternativeProductIds include other assembly templates
- **Types:** Add `isAssemblyTemplate` flag to the `matchedProduct` object on `CatalogMatch`
- **Photo flow:** Remove auto-confirm for assembly templates — treat as regular fuzzy matches
- **FlaggedItemResolver:** Include assembly templates in the match options alongside products
- **Submission:** Detect assembly template matches at submit time and set proper `nonCatalogSpecs` / `fabricationSource`

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/lib/ai/types.ts` | Add `isAssemblyTemplate?: boolean` and `assemblyTemplateId?: string` to `matchedProduct` type |
| `src/lib/ai/parse.ts` | Rewrite AT: path in `toCatalogMatch` to populate `matchedProduct`. Load assembly template details for hydration. Add assembly templates to alternative matches. |
| `src/app/api/ai/parse-image-fast/route.ts` | Load assembly template map alongside product map. Pass to toBomCatalogMatch. Include assembly templates in dimension-conflict exemption. |
| `src/components/bom/bom-photo-capture.tsx` | Remove `isAssemblyTemplate` auto-confirm. Let assembly templates flow as regular likely/flagged items. Update submission to detect assembly template IDs in `matchedProduct`. |
| `src/components/bom/live-item-feed.tsx` | Remove `isAssemblyTemplate` special fields from FeedItem. Assembly items render identically to products. |
| `src/components/bom/flagged-item-resolver.tsx` | Include assembly templates in search results when resolving a flagged item. |
| `src/components/bom/bom-confirmation-card.tsx` | Remove `isAssemblyTemplate` special-casing. Assembly matches render via the standard `matchedProduct` path with an "RSNE Fab" badge based on `matchedProduct.isAssemblyTemplate`. |
| `src/components/bom/bom-ai-flow.tsx` | Update `handleConfirmAll` and submission to detect assembly template IDs in `matchedProduct` and produce correct `nonCatalogSpecs`. |
| `src/app/api/products/browse/route.ts` | Keep assembly template search but return with `isAssemblyTemplate` flag on the product-like object. |
| `src/app/api/boms/route.ts` | Update fabricationSource detection — check `matchedProduct.isAssemblyTemplate` in addition to `nonCatalogSpecs`. |
| `src/app/api/boms/[id]/route.ts` | Same fabricationSource update for the PUT endpoint. |

---

## Design Decisions

### Key Decisions Made

1. **Populate `matchedProduct` for assembly templates instead of keeping them as non-catalog:** This is the minimal-change approach. Every downstream component already knows how to render, accept, and show alternatives for items with `matchedProduct`. Adding a single `isAssemblyTemplate` flag lets us reuse 100% of existing UI.

2. **Keep `isNonCatalog: false` for assembly template matches:** Even though assemblies aren't "products" in the traditional sense, from a matching/UI perspective they should behave identically. The `isNonCatalog` flag only gets set to `true` at submission time when converting to BOM line items.

3. **Assembly templates appear as alternatives to each other:** When the LLM matches "Sliding Door 5x6'6"" to "Cooler Slider 5' x 7'", the alternative matches should include other slider templates (6x7, 8x8, etc.) — not random catalog products. This requires including other assembly templates in the `alternativeMatches` array.

4. **Submission-time conversion:** The conversion from "product-like match" to "non-catalog BOM line item with assemblyTemplateId" happens at BOM submit, not at match time. This keeps the matching pipeline clean.

### Alternatives Considered

1. **Create actual Product records for each assembly template:** Would truly unify them but adds ghost inventory items, complicates reporting, and requires a migration. Rejected — too heavy for the UX benefit.

2. **Keep the current non-catalog path but fix the UI:** Would require special-casing every component. We tried this already and it keeps creating gaps. Rejected — whack-a-mole.

---

## Step-by-Step Tasks

### Step 1: Update CatalogMatch Types

Add assembly template fields to the `matchedProduct` type so assembly templates can populate it.

**Actions:**
- In `CatalogMatch.matchedProduct`, add optional fields: `isAssemblyTemplate?: boolean`, `assemblyTemplateId?: string`, `assemblyType?: string`
- These fields let downstream code distinguish assembly templates from regular products without checking a separate property

**Files affected:**
- `src/lib/ai/types.ts`

---

### Step 2: Load Assembly Template Details in Parse Pipeline

The `toCatalogMatch` function needs access to assembly template details (name, type) to hydrate `matchedProduct`. Currently it only has the `AT:uuid` ID string.

**Actions:**
- In `parse.ts`, create a `loadAssemblyTemplateMap()` function that returns `Map<string, { id, name, type, description }>` (similar to `loadProductMap`)
- Pass this map to `toCatalogMatch` as a new parameter
- Update `toBomCatalogMatch` to also accept and forward the assembly template map
- Update callers in `parseTextInput`, `parseReceivingTextInput`, `parseVoiceInput` to load and pass the map

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 3: Rewrite `toCatalogMatch` Assembly Template Path

The core change: when an `AT:` prefixed match is detected, populate `matchedProduct` instead of returning non-catalog.

**Actions:**
- When `isAssemblyTemplate` is true, look up the template from the assembly template map
- Populate `matchedProduct` with: `id: templateId`, `name: template.name`, `isAssemblyTemplate: true`, `assemblyTemplateId: templateId`, `assemblyType: template.type`, `unitOfMeasure: "each"`, `currentQty: 0`, `tier: "TIER_1"`, `categoryName: assemblyTypeLabel(template.type)`, `sku: null`, `lastCost: 0`, `avgCost: 0`, `reorderPoint: 0`, `dimLength: null`, etc.
- Set `isNonCatalog: false` — the match behaves like a product match
- Keep `assemblyTemplateId` on the CatalogMatch itself as well (for submission)
- Build `alternativeMatches` from other assembly templates of the same type (e.g., other slider sizes), ranked by dimension proximity to the parsed item

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 4: Update Streaming Image Parser Route

The `parse-image-fast` route needs the assembly template map to pass to `toBomCatalogMatch`.

**Actions:**
- Load `assemblyTemplateMap` in the initial parallel data load
- Pass it through to `toBomCatalogMatch`
- Remove assembly-template-specific confidence boosting (it's now a regular match)
- Assembly template matches should NOT be excluded from dimension conflict checks — but dimension conflicts should compare against the template's implied dimensions (e.g., "5x7" template)

**Files affected:**
- `src/app/api/ai/parse-image-fast/route.ts`

---

### Step 5: Update Photo BOM Frontend

Remove all assembly template special-casing from the photo capture flow. Assembly items should flow through the same flagged/likely/confirmed states as products.

**Actions:**
- Remove `isAssemblyTemplate` auto-confirm logic — confidence comes from the AI like any other match
- Remove `isAssemblyTemplate`, `assemblyTemplateId`, `nonCatalogCategory` fields from FeedItem
- Assembly items appear with `productId: template.id`, `productName: template.name`, `confidence: <from AI>`
- When submitting, detect `matchedProduct.isAssemblyTemplate` on the original CatalogMatch and convert to non-catalog line item with `assemblyTemplateId` in `nonCatalogSpecs`
- Add "RSNE Fab" visual indicator in LiveItemFeed for items where the product name matches a known assembly template pattern (or carry a small flag)

**Files affected:**
- `src/components/bom/bom-photo-capture.tsx`
- `src/components/bom/live-item-feed.tsx`

---

### Step 6: Update FlaggedItemResolver for Assembly Templates

When the user taps a flagged/likely item, the resolver needs to show assembly templates as match options.

**Actions:**
- The resolver currently searches `/api/products/browse` which already returns assembly templates — verify this works
- When the user selects an assembly template match option, the resolver should pass it back the same way as a product selection
- Ensure the resolver's result carries the assembly template ID so submission can detect it

**Files affected:**
- `src/components/bom/flagged-item-resolver.tsx`

---

### Step 7: Update Manual BOM Confirmation Card

Remove assembly template special-casing. Assembly matches now have `matchedProduct` populated, so they naturally render with product styling.

**Actions:**
- Remove `isAssemblyTemplate` variable and all conditional branches that use it
- Add "RSNE Fab" badge check: if `match.matchedProduct?.isAssemblyTemplate`, show the wrench + "RSNE Fab" badge alongside the category badge
- Alternatives now work naturally since `alternativeMatches` is populated with other assembly templates

**Files affected:**
- `src/components/bom/bom-confirmation-card.tsx`

---

### Step 8: Update Manual BOM Flow Submission

The `handleConfirmAll` and `handleSubmit` in `bom-ai-flow.tsx` need to detect assembly template matches at submission time and convert them to non-catalog line items.

**Actions:**
- In `handleConfirmAll`: when building ConfirmedBomItem, if `match.matchedProduct?.isAssemblyTemplate`, set `isNonCatalog: true`, `nonCatalogName: product.name`, `nonCatalogCategory: assemblyTypeLabel`, `nonCatalogUom: "each"`
- In `handleSubmit`: when mapping confirmedItems to lineItems, if the item came from an assembly template match, include `nonCatalogSpecs: { type: "assembly", assemblyTemplateId }` and set `isNonCatalog: true`
- In `handleAddProduct` (product picker path): simplify — assembly template products from browse API now have `isAssemblyTemplate` directly, no need for separate handling

**Files affected:**
- `src/components/bom/bom-ai-flow.tsx`

---

### Step 9: Update BOM APIs for Assembly Template Detection

The BOM creation and update APIs detect assembly templates via `nonCatalogSpecs.assemblyTemplateId` to set `fabricationSource`. Verify this still works with the new flow.

**Actions:**
- Verify POST `/api/boms` correctly sets `fabricationSource: "RSNE_MADE"` when `nonCatalogSpecs` contains `assemblyTemplateId`
- Verify PUT `/api/boms/[id]` does the same for `addLineItems`
- No changes expected — the submission payload stays the same

**Files affected:**
- `src/app/api/boms/route.ts` (verify only)
- `src/app/api/boms/[id]/route.ts` (verify only)

---

### Step 10: QA and Validation

**Actions:**
- TypeScript check: `npx tsc --noEmit`
- Token audit: `npx tsx scripts/token-audit.ts`
- Test scenario 1: Photo BOM with "Cooler Slider 5' x 6'6"" → should show as blue likely match → tap → see "Cooler Slider 5' x 7'" and "Cooler Slider 6' x 7'" as options
- Test scenario 2: Photo BOM with "3x7 cooler door" → should match to "Cooler Door 3' x 7'" with alternatives
- Test scenario 3: Photo BOM with "Jamison 5x7 door" → should match to Jamison product, NOT assembly template
- Test scenario 4: Manual text entry "cooler door 3x7" → confirmation card with alternatives
- Test scenario 5: ProductPicker search "cooler door" → assembly templates appear, selecting one adds correctly
- Test scenario 6: Submit BOM with assembly items → `fabricationSource: RSNE_MADE` set correctly
- Test scenario 7: Approve BOM with assembly items → "missing fab order" flag appears

**Files affected:**
- All modified files

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/dashboard/action-items.tsx` — uses `unfabricatedAssemblyCount` (unchanged)
- `src/components/bom/bom-card.tsx` — shows missing fab badge (unchanged)
- `src/components/bom/bom-line-item-row.tsx` — shows "No fab order" warning (unchanged)
- `src/app/api/dashboard/route.ts` — queries unfabricated items (unchanged)

### Updates Needed for Consistency

- `src/lib/ai/catalog-match.ts` — the local fuzzy matcher added earlier also handles assembly templates separately. It should be updated to populate `matchedProduct` the same way as `toCatalogMatch`. However, this is a secondary code path (only used when the LLM returns no match) — can be done as a follow-up.

### Impact on Existing Workflows

- **Photo BOM:** Assembly items will no longer auto-confirm. Users will need to tap-to-confirm like regular products. This is the DESIRED behavior.
- **Manual BOM:** Assembly matches will show proper alternatives instead of a single accept button. This is the DESIRED behavior.
- **Product Picker:** No change — already works.
- **BOM Submission:** No change to the API payload shape — still uses `nonCatalogSpecs`.

---

## Validation Checklist

- [ ] TypeScript compiles with no new errors
- [ ] Token audit passes with 0 errors
- [ ] Photo BOM: "Cooler Slider 5x6'6"" shows as likely match (blue), not auto-confirmed
- [ ] Photo BOM: Tapping the match shows ranked assembly template alternatives
- [ ] Manual BOM: "cooler door 3x7" shows confirmation card with assembly template alternatives
- [ ] Submission: Assembly items create non-catalog line items with `fabricationSource: RSNE_MADE`
- [ ] Jamison doors still match to catalog products, not assembly templates
- [ ] Missing fab order flags still work on dashboard and BOM detail
- [ ] "Confirm All" button works for assembly template matches

---

## Success Criteria

The implementation is complete when:

1. A handwritten "Cooler Slider 5' x 6'6"" fuzzy matches to "Cooler Slider 5' x 7'" — identical UX to a T-bar matching to "T-Bar 4" x 16'"
2. Tapping ANY assembly template match shows ranked alternatives (other sizes/types) — same as tapping any product match
3. Assembly items flow through the same confirmation → accept → submit pipeline as products with zero special-casing visible to the user

---

## Notes

- The LLM prompt improvements from earlier today should stay — they help the AI find the right assembly template in the first place
- The `assemblyTemplateId` field on `CatalogMatch` stays as a convenience for submission — even though `matchedProduct.assemblyTemplateId` is the canonical source
- Future enhancement: match history for assembly templates (user corrects "Sliding Door 5x7" → "Cooler Slider 5' x 7'" once, then it auto-matches next time)
