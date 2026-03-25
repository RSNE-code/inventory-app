# Plan: Panel Handling Improvements & Unit Conversion System

**Created:** 2026-03-18
**Status:** Implemented
**Request:** Block panels from being added as custom items + add editable panel dimensions; build a unit conversion system for bulk units (case, box, pallet, lbs)

---

## Overview

### What This Plan Accomplishes

Two features that improve BOM accuracy after photo capture: (1) Panels always stay panels with editable dimensions so users can correct AI mistakes, and (2) bulk units like "case" and "box" get converted to catalog units with a learning system that stops asking once it knows the answer.

### Why This Matters

Panels are the highest-value items RSNE handles — wrong dimensions mean wrong cuts and wasted material. The current flow lets panels escape into "custom item" limbo where they skip the brand/height checkout flow entirely. Meanwhile, unit mismatches between BOMs and catalog ("1 case" vs "each") silently corrupt quantities, costing, and inventory accuracy.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Inline edit pattern for dimensions (tap-to-edit, not modal); unit conversion prompt design (subtle card expansion, not blocking modal) |
| `engineering-skills` (backend) | API design for unit conversion CRUD; detection logic for bulk unit mismatch |
| `engineering-advanced-skills` (database) | UnitConversion table design with product-specific + global fallback layers |
| `product-skills` (UX researcher) | Mobile-first input patterns: use steppers/pickers not free text for dimensions; trust-building "learning" indicator for conversions |

### How Skills Shaped the Plan

The UX research confirmed that warehouse workers need tap-based inputs (not typing) for dimensions — so the panel editor uses increment/decrement for thickness and separate feet/inches fields. The database design uses a two-tier lookup (product-specific first, global fallback) so the system gets smarter over time without requiring exhaustive setup. Frontend design keeps both features inline on the item card rather than modal overlays, maintaining the fast scan-and-confirm flow.

---

## Current State

### Relevant Existing Structure

| File | Relevance |
|------|-----------|
| `src/components/bom/bom-photo-capture.tsx` | Photo review flow — `keepAsCustom()` doesn't clear panelSpecs; `handleSubmit()` sends panelSpecs as nonCatalogSpecs |
| `src/components/bom/live-item-feed.tsx` | Item cards during review — has qty controls but no dimension editing or unit prompts |
| `src/components/bom/flagged-item-resolver.tsx` | "Add as custom item" button — no panel-awareness |
| `src/app/boms/[id]/page.tsx` | BOM detail page — panel items detected by `nonCatalogSpecs.type === "panel"` |
| `src/components/bom/bom-line-item-row.tsx` | Line item display — has unit picker for ft/in/sqft but not for bulk unit conversions |
| `prisma/schema.prisma` | BomLineItem has `nonCatalogSpecs` (JSON), `nonCatalogUom`; Product has `unitOfMeasure` — no conversion table exists |
| `src/lib/ai/parse.ts` | AI returns `unitOfMeasure` from photo; `bomItemSchema` now has `lengthFt`, `lengthIn`, `thicknessIn` |

### Gaps or Problems Being Addressed

1. **Panel escape hatch:** "Add as custom item" on a panel strips it of panel checkout flow — no brand/height selection, no waste tracking
2. **No dimension editing:** If AI misreads "7'6\"" as "7'", user has no way to correct it during review
3. **UOM override:** Catalog product UOM ("each") silently replaces AI-parsed UOM ("case") — user sees wrong unit, no way to fix
4. **No conversion storage:** System has no concept of "1 case = 12 each" — each photo parse starts from zero
5. **No UOM editing on BOM:** PUT API only allows editing `qtyNeeded` and `fabricationSource`, not units

---

## Proposed Changes

### Summary of Changes

**Feature 1 — Panel handling:**
- Hide "add as custom item" in FlaggedItemResolver when item is a panel
- Add inline dimension editor on panel items in LiveItemFeed (thickness stepper + feet/inches fields)
- Pass edited dimensions back through to panelSpecs on submit
- Add dimension editing on BOM detail page for panel items (post-creation)

**Feature 2 — Unit conversions:**
- New `UnitConversion` Prisma model (product-specific + global fallback)
- New API routes: `GET/POST /api/unit-conversions`
- Detection logic in bom-photo-capture: compare parsed UOM vs catalog UOM
- Inline conversion prompt on item cards during review
- Auto-apply known conversions; only ask when unknown
- Store `parsedUom` and `convertedQty` on BomLineItem for audit trail

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/bom/panel-dimension-editor.tsx` | Inline editor for panel thickness + cut length (feet/inches) |
| `src/components/bom/unit-conversion-prompt.tsx` | Inline prompt asking "How many [each] in a [case]?" with number input |
| `src/app/api/unit-conversions/route.ts` | GET (lookup) + POST (create/update) unit conversions |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `prisma/schema.prisma` | Add `UnitConversion` model; add `parsedUom` field to `BomLineItem` |
| `src/components/bom/flagged-item-resolver.tsx` | Accept `isPanel` prop; hide "add as custom" when true |
| `src/components/bom/bom-photo-capture.tsx` | Pass `isPanel` to FlaggedItemResolver; add dimension edit callbacks; add conversion detection + prompt state; preserve parsed UOM alongside catalog UOM |
| `src/components/bom/live-item-feed.tsx` | Add `onEditDimensions` callback; render PanelDimensionEditor for panel items; render UnitConversionPrompt when bulk unit detected |
| `src/app/api/boms/route.ts` | Accept `parsedUom` field on line items |
| `src/app/boms/[id]/page.tsx` | Add dimension editing for panel items in edit mode |
| `src/components/bom/bom-line-item-row.tsx` | Show parsed UOM vs catalog UOM when they differ; support dimension editing for panels |

---

## Design Decisions

### Key Decisions Made

1. **Block, don't preserve:** Panels can never become custom items. Simpler than trying to re-detect panels from custom item text downstream. The "add as custom" button simply doesn't appear for panel items.

2. **Inline editing, not modals:** Dimension editor and unit conversion prompt expand inline on the item card. Warehouse workers are tapping through items quickly — modals break flow.

3. **Two-tier conversion lookup:** Product-specific conversions first (`FROTH-PAK + case → 12`), then global defaults (`case → 12`). Product-specific always wins. This lets common conversions work immediately while allowing product-level overrides.

4. **Store parsedUom on BomLineItem:** Even after conversion, we keep what the BOM originally said ("1 case") so users can audit and the system can learn. This is a new field alongside the existing `nonCatalogUom`.

5. **Conversion prompt only during review:** Don't interrupt the streaming parse. Wait until `feedPhase === "done"` and the user is reviewing items, then show conversion prompts on items that need them.

6. **Qty adjustment on conversion:** When user says "1 case = 12 each", the quantity updates from 1 to 12 and the UOM switches to "each". The original "1 case" is preserved in `parsedUom` for the audit trail.

### Alternatives Considered

- **Modal dimension editor:** Rejected — too heavy for a quick correction. Tapping each panel to open a modal would slow down review of multi-panel BOMs.
- **Ask conversion during parse (streaming):** Rejected — items are still arriving. Better to batch conversion prompts after all items are parsed.
- **Global-only conversions (no product-specific):** Rejected — a "case" of screws (100) is different from a "case" of FROTH-PAK (12). Product-specific is essential.
- **Free-text dimension input:** Rejected — parsing "7 ft 6 in" from free text is the problem we're solving. Use structured feet + inches fields instead.

### Open Questions

None — direction is clear from Gabe's input.

---

## Step-by-Step Tasks

### Step 1: Database — Add UnitConversion model and parsedUom field

Add the conversion table and audit field to the schema.

**Actions:**

- Add `UnitConversion` model to `prisma/schema.prisma`:
  ```prisma
  model UnitConversion {
    id          String   @id @default(uuid()) @db.Uuid
    productId   String?  @db.Uuid
    product     Product? @relation(fields: [productId], references: [id])
    fromUnit    String   @db.VarChar(30)   // "case", "box", "pallet", "lb"
    toUnit      String   @db.VarChar(30)   // "each", "linear ft", etc.
    factor      Decimal  @db.Decimal(12, 4) // 1 case = factor × toUnit
    createdBy   String   @db.Uuid
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    @@unique([productId, fromUnit, toUnit])
    @@index([fromUnit, toUnit])
  }
  ```
- Add `parsedUom` field to `BomLineItem`: `parsedUom String? @db.VarChar(50)` — stores the original AI-parsed unit before conversion
- Add `UnitConversion` relation to `Product` model: `unitConversions UnitConversion[]`
- Run `npx prisma db push` to apply

**Files affected:**

- `prisma/schema.prisma`

---

### Step 2: API — Unit conversion lookup and creation

Create the API route for querying and storing conversions.

**Actions:**

- Create `src/app/api/unit-conversions/route.ts`:
  - `GET ?productId=X&fromUnit=case&toUnit=each` — returns product-specific conversion if exists, else global (productId=null) conversion, else null
  - `POST { productId?, fromUnit, toUnit, factor }` — upserts conversion (unique on productId+fromUnit+toUnit)
- Both endpoints require authentication
- GET returns `{ factor: number, isProductSpecific: boolean } | null`
- POST returns the created/updated conversion

**Files affected:**

- `src/app/api/unit-conversions/route.ts` (new)

---

### Step 3: API — Accept parsedUom on BOM creation

Update the BOM creation endpoint to store the original parsed unit.

**Actions:**

- In `src/app/api/boms/route.ts`, add `parsedUom` to the line item validation schema (optional string, max 50)
- Pass `parsedUom` through to `prisma.bomLineItem.create()`

**Files affected:**

- `src/app/api/boms/route.ts`

---

### Step 4: UI — Block "add as custom" for panels

Prevent panel items from escaping the panel checkout flow.

**Actions:**

- In `src/components/bom/flagged-item-resolver.tsx`:
  - Add `isPanel?: boolean` prop
  - When `isPanel` is true, hide the "None of these — add as custom item" button
  - Show helper text instead: "This is a panel item — dimensions can be edited below"
- In `src/components/bom/bom-photo-capture.tsx`:
  - Pass `isPanel` to `FlaggedItemResolver` from the feed item's `isPanel` field
  - In `keepAsCustom()`: if item `isPanel`, don't allow the action (defensive — button should already be hidden)

**Files affected:**

- `src/components/bom/flagged-item-resolver.tsx`
- `src/components/bom/bom-photo-capture.tsx`

---

### Step 5: UI — Panel dimension editor component

Create the inline dimension editor for panel items.

**Actions:**

- Create `src/components/bom/panel-dimension-editor.tsx`:
  - Props: `thickness: number`, `lengthFt: number`, `lengthIn: number`, `onUpdate: (thickness, lengthFt, lengthIn) => void`
  - Layout: single row with three compact input groups:
    - Thickness: stepper (2–8 range, 1-inch increments) with `"` suffix
    - Length feet: number input (1–50 range) with `'` suffix
    - Length inches: stepper (0–11 range, 1-inch increments) with `"` suffix
  - Styled to match existing card aesthetic: `bg-surface-secondary` rounded, compact padding
  - Shows current dimensions as `4" × 7'6"` when collapsed; tap to expand editor
- The component is purely presentational — state management happens in the parent

**Files affected:**

- `src/components/bom/panel-dimension-editor.tsx` (new)

---

### Step 6: UI — Wire dimension editor into LiveItemFeed

Add dimension editing to panel items during photo review.

**Actions:**

- In `src/components/bom/live-item-feed.tsx`:
  - Import `PanelDimensionEditor`
  - For items where `isPanel === true`, render the dimension editor below the item name
  - Add `onEditDimensions: (id: string, thickness: number, lengthFt: number, lengthIn: number) => void` prop
- In `src/components/bom/bom-photo-capture.tsx`:
  - Add `editItemDimensions(id, thickness, lengthFt, lengthIn)` handler:
    - Updates the item's `panelSpecs` with new dimensions
    - Recalculates `productName` to reflect new dimensions (e.g., `4" IMP — 7'6"`)
  - Pass handler to `LiveItemFeed`
  - In `handleSubmit()`: ensure edited panelSpecs flow through to `nonCatalogSpecs`

**Files affected:**

- `src/components/bom/live-item-feed.tsx`
- `src/components/bom/bom-photo-capture.tsx`

---

### Step 7: UI — Unit conversion prompt component

Create the inline conversion prompt for bulk units.

**Actions:**

- Create `src/components/bom/unit-conversion-prompt.tsx`:
  - Props: `parsedQty: number`, `parsedUnit: string`, `catalogUnit: string`, `knownFactor?: number`, `onConfirm: (factor: number) => void`
  - **Asking state** (no known factor):
    - Amber/orange banner below item: `"BOM says 1 case — how many each in a case?"`
    - Number input with +/- stepper, pre-populated with common default if available
    - Confirm button
  - **Resolved state** (factor known or just confirmed):
    - Subtle green pill: `"1 case = 12 each ✓"` — tap to re-edit
  - **Auto-resolved state** (factor found from DB):
    - Same green pill but with "learned" indicator: `"1 case = 12 each (saved)"`
    - No prompt needed — conversion applied automatically
- Compact design — should not dominate the card

**Files affected:**

- `src/components/bom/unit-conversion-prompt.tsx` (new)

---

### Step 8: UI — Wire conversion system into photo review

Integrate conversion detection and prompts into the BOM photo capture flow.

**Actions:**

- In `src/components/bom/bom-photo-capture.tsx`:
  - Define bulk unit list: `["case", "box", "pallet", "carton", "bag", "roll", "lb", "lbs", "pound", "pounds"]`
  - After stream completes (`feedPhase === "done"`), for each item:
    - Compare `match.parsedItem.unitOfMeasure` (AI-parsed) vs `match.matchedProduct?.unitOfMeasure` (catalog)
    - If parsed UOM is a bulk unit AND catalog UOM differs → flag for conversion
    - Fetch `GET /api/unit-conversions?productId=X&fromUnit=case&toUnit=each`
    - If conversion exists → auto-apply: multiply qty by factor, switch UOM, show resolved pill
    - If no conversion → show prompt
  - Add `FeedItem` fields: `needsConversion: boolean`, `parsedUom: string`, `conversionFactor?: number`
  - On conversion confirm:
    - Update item qty (parsedQty × factor) and UOM (to catalog unit)
    - `POST /api/unit-conversions` to save for future
    - Update item state to show resolved pill
  - In `handleSubmit()`: include `parsedUom` in line item data

- In `src/components/bom/live-item-feed.tsx`:
  - Import `UnitConversionPrompt`
  - Render below items that have `needsConversion === true`
  - Pass conversion callbacks through

**Files affected:**

- `src/components/bom/bom-photo-capture.tsx`
- `src/components/bom/live-item-feed.tsx`

---

### Step 9: UI — Dimension editing on BOM detail page

Allow panel dimension editing after BOM creation (in edit mode).

**Actions:**

- In `src/app/boms/[id]/page.tsx`:
  - For panel items (`nonCatalogSpecs.type === "panel"`) in edit mode:
    - Render `PanelDimensionEditor` with current specs
    - On update: call `PUT /api/boms/[id]` with updated `nonCatalogSpecs`
- In `src/app/api/boms/[id]/route.ts` (PUT handler):
  - Add `nonCatalogSpecs` to the `updateLineItems` schema (optional JSON)
  - Apply update to the line item
  - Also update `nonCatalogName` to reflect new dimensions (e.g., `4" IMP — 7'6"`)

**Files affected:**

- `src/app/boms/[id]/page.tsx`
- `src/app/api/boms/[id]/route.ts`

---

### Step 10: Validation and testing

Verify both features work end-to-end.

**Actions:**

- Test panel flow:
  - Take photo of BOM with panel items → verify "add as custom" is hidden
  - Verify dimension editor appears on panel cards
  - Edit dimensions → verify updated values flow through to BOM creation
  - Open BOM detail in edit mode → verify dimension editing works
  - Checkout panel → verify panel checkout sheet uses edited dimensions
- Test unit conversion flow:
  - Take photo of BOM that says "1 case" for a product cataloged as "each"
  - Verify conversion prompt appears after parsing completes
  - Enter factor (e.g., 12) → verify qty updates to 12, UOM to "each"
  - Take another photo with same product + "case" → verify auto-applies saved conversion
  - Verify `parsedUom` stored on BOM line item for audit
- Test edge cases:
  - Panel with correct dimensions → editor shows, no changes needed
  - Item with matching UOM (parsed "each" = catalog "each") → no conversion prompt
  - Non-catalog item with bulk unit → conversion prompt still appears (use global fallback)
  - Multiple items needing conversion → all prompts visible, independently resolvable

**Files affected:**

- All files from previous steps (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/bom/panel-checkout-sheet.tsx` — reads `nonCatalogSpecs` for panel checkout; will use updated dimensions
- `src/app/api/boms/[id]/panel-checkout/route.ts` — reads panel specs for waste calculation; no changes needed (reads from DB)
- `src/app/api/boms/[id]/checkout/route.ts` — rejects panel items; no changes needed
- `src/lib/ai/parse.ts` — already updated with structured dimension fields; no further changes

### Updates Needed for Consistency

- `context/project-status.md` — update with new features after implementation
- `context/ai-module.md` — add note about unit conversion system

### Impact on Existing Workflows

- **BOM photo capture:** Adds dimension editing and conversion prompts to review phase. Slightly more steps when conversions are needed, but this captures data that was previously lost.
- **BOM detail/edit:** Panel items gain dimension editing in edit mode. No impact on non-panel items.
- **Panel checkout:** Uses whatever dimensions are on `nonCatalogSpecs` — already works, just gets more accurate input.
- **Existing BOMs:** Unaffected. `parsedUom` field is nullable, old BOMs just have null.

---

## Validation Checklist

- [ ] `UnitConversion` table created and `parsedUom` field added to `BomLineItem`
- [ ] Unit conversion API returns product-specific conversion, falls back to global, returns null
- [ ] "Add as custom item" button hidden for panel items in FlaggedItemResolver
- [ ] Panel dimension editor renders inline on panel cards during photo review
- [ ] Edited dimensions update panelSpecs and productName in real-time
- [ ] Conversion prompt appears for bulk unit mismatches after parsing completes
- [ ] Confirmed conversions save to DB and auto-apply on subsequent scans
- [ ] `parsedUom` stored on BomLineItem for audit trail
- [ ] Panel dimensions editable on BOM detail page in edit mode
- [ ] Build passes with no type errors

---

## Success Criteria

The implementation is complete when:

1. A panel item cannot be added as a custom item — the option is not available
2. Panel dimensions are editable during BOM review and on the BOM detail page
3. Bulk unit mismatches trigger a conversion prompt that stores the answer for reuse
4. Previously-answered conversions auto-apply without asking again
5. All original units are preserved in `parsedUom` for audit trail

---

## Notes

- The conversion system will build up data organically. Early on, most items will prompt. Over time, the system learns and prompts decrease. This is the intended UX.
- Weight-based units (lbs, pounds) are treated the same as quantity-based (case, box) — user is asked "how many [catalog unit] is X lbs?" The system doesn't try to do weight math.
- Future enhancement: admin page to view/edit all stored conversions. Not in scope for this plan.
- Future enhancement: suggest conversion factors based on similar products or industry standards. Not in scope.
