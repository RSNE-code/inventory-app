# Plan: Assembly Items as First-Class Catalog Products

**Created:** 2026-03-26
**Status:** Implemented
**Request:** Restructure assembly items from non-catalog hacks to real Product records with an `isAssembly` flag, linked to AssemblyTemplates via a join table, with proper BomLineItem→Assembly foreign keys.

---

## Overview

### What This Plan Accomplishes

Assembly items (doors, floor panels, wall panels, ramps) become real records in the Product table with an `isAssembly` boolean flag. A new `assemblyTemplateId` field on Product links each assembly product to its AssemblyTemplate. BomLineItems reference assembly products via `productId` like any other catalog item — no more `isNonCatalog` hacks with JSON specs. The "In-house" badge renders from a single source of truth: `product.isAssembly === true`.

### Why This Matters

The current architecture stores assembly items as non-catalog line items with assembly metadata buried in JSON (`nonCatalogSpecs`). This forces every piece of code — AI matching, product search, BOM creation, BOM display, badge rendering — to special-case assembly templates as "pseudo-products." There are 8+ places checking different conditions for the same concept. Gabe's mental model is correct and simpler: assembly items are catalog products that happen to be made in-house. This restructuring aligns the code with that model.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `engineering-advanced-skills` (database design) | Schema change strategy: direct FK vs join table, migration approach |
| `engineering-skills` (architecture) | Data model simplification, impact on matching pipeline |
| `frontend-design` | Badge rendering unification — single `isAssembly` field |
| `design-inspiration` | Badge consistency across all surfaces using design system tokens |

### How Skills Shaped the Plan

Database design skill confirmed that a direct FK (`Product.assemblyTemplateId`) is cleaner than a join table for this 1:1 relationship (one product maps to one template). Architecture skill validated that the matching pipeline simplifies dramatically when assembly templates are real products. Frontend/design skills confirmed the badge can derive from a single boolean field on Product, eliminating 8 scattered condition checks.

---

## Current State

### Relevant Existing Structure

| File | Current Role |
|------|-------------|
| `prisma/schema.prisma` | Product model has no assembly fields; AssemblyTemplate is standalone |
| `prisma/seed-assemblies.ts` | Seeds ~15 assembly templates with component lists |
| `src/lib/ai/catalog-match.ts` | Fetches products AND templates separately, scores templates with custom logic, returns pseudo-product objects |
| `src/lib/ai/types.ts` | CatalogMatch has `isAssemblyTemplate`, `assemblyTemplateId`, `assemblyType` fields on matchedProduct |
| `src/app/api/products/browse/route.ts` | Queries AssemblyTemplate table separately, creates fake product objects with `assembly-template:` ID prefix |
| `src/app/api/boms/route.ts` | POST auto-detects assembly items via `nonCatalogSpecs.assemblyTemplateId`; GET counts unfabricated assemblies via `isNonCatalog + fabricationSource + nonCatalogCategory` |
| `src/app/api/boms/[id]/route.ts` | PATCH detects assembly templates via JSON spec inspection |
| `src/app/boms/[id]/page.tsx` | `handleAddProduct` has branching logic for `isAssemblyTemplate` → creates non-catalog line items |
| `src/components/bom/product-picker.tsx` | Renders assembly templates with special styling, `isAssemblyTemplate` interface field |
| `src/components/bom/bom-confirmation-card.tsx` | Checks `match.matchedProduct?.isAssemblyTemplate` for badge |
| `src/components/bom/bom-line-item-row.tsx` | Checks `fabricationSource === "RSNE_MADE"` for badge |
| `src/components/bom/live-item-feed.tsx` | Checks `isAssemblyTemplate` for badge |

### Gaps or Problems Being Addressed

1. **Assembly items are not in the Product table** — they can't be browsed, managed, or tracked like normal catalog items
2. **BomLineItems store assembly info as non-catalog items** with JSON specs (`isNonCatalog: true` + `nonCatalogSpecs: { type: "assembly", assemblyTemplateId }`)
3. **Badge logic is scattered** across 8 components checking 3 different conditions
4. **Product search injects fake product objects** with `assembly-template:` ID prefixes that every consumer must handle
5. **BOM→Assembly linking uses job name matching** instead of foreign keys
6. **Unfabricated assembly counting** relies on fragile multi-condition queries against non-catalog fields

---

## Proposed Changes

### Summary of Changes

- Add `isAssembly` boolean and `assemblyTemplateId` FK to the Product model
- Create real Product records for each AssemblyTemplate during seed/migration
- Remove `assembly-template:` prefix hack from browse API — assembly products are just products
- Simplify catalog matching — assembly products match as regular products with `isAssembly: true`
- BomLineItems for assemblies use `productId` (not `isNonCatalog`)
- Badge renders from `product.isAssembly` — one field, one check, everywhere
- Unfabricated assembly counting queries `product.isAssembly` instead of non-catalog heuristics
- Auto-set `fabricationSource: "RSNE_MADE"` based on `product.isAssembly` instead of JSON inspection

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `prisma/schema.prisma` | Add `isAssembly Boolean @default(false)` and `assemblyTemplateId String?` + relation to Product |
| `prisma/seed-assemblies.ts` | Create Product records for each template, link via `assemblyTemplateId` |
| `src/lib/ai/catalog-match.ts` | Remove separate assembly template scoring; assembly products match as regular products |
| `src/lib/ai/types.ts` | Add `isAssembly?: boolean` to matchedProduct; deprecate `isAssemblyTemplate` |
| `src/app/api/products/browse/route.ts` | Remove separate AssemblyTemplate query; assembly products already in Product table |
| `src/app/api/boms/route.ts` | POST: detect `product.isAssembly` for auto-setting fabricationSource; GET: count unfabricated via `product.isAssembly` |
| `src/app/api/boms/[id]/route.ts` | PATCH: detect `product.isAssembly` for fabricationSource |
| `src/app/boms/[id]/page.tsx` | Remove `isAssemblyTemplate` branching in `handleAddProduct` — assembly items added like any product |
| `src/components/bom/product-picker.tsx` | Badge from `product.isAssembly` instead of `isAssemblyTemplate` |
| `src/components/bom/bom-confirmation-card.tsx` | Badge from `product.isAssembly` |
| `src/components/bom/bom-line-item-row.tsx` | Badge from `product.isAssembly` (keep fabricationSource for RSNE_MADE vs SUPPLIER toggle) |
| `src/components/bom/live-item-feed.tsx` | Badge from `product.isAssembly` |
| `src/components/bom/bom-ai-flow.tsx` | Badge from `product.isAssembly` |
| `src/components/ai/ai-input.tsx` | Badge from `product.isAssembly` |

### Files to Delete

None — all changes are modifications to existing files.

---

## Design Decisions

### Key Decisions Made

1. **Direct FK instead of join table**: Product gets `assemblyTemplateId` referencing AssemblyTemplate. This is a 1:1 relationship (each assembly product maps to exactly one template), so a join table adds unnecessary complexity. The FK is nullable — only assembly products have it populated.

2. **`isAssembly` boolean on Product**: Rather than inferring assembly status from `assemblyTemplateId IS NOT NULL`, an explicit boolean is clearer for queries, badges, and future cases where an assembly product might not have a template (custom one-off builds).

3. **Assembly products get `currentQty: 0` and no stock tracking**: Assembly items represent things RSNE builds to order — they don't sit in inventory. `currentQty` stays 0, `reorderPoint` stays 0. They're in the Product table for identity/matching, not for stock tracking.

4. **Keep `fabricationSource` on BomLineItem**: This field still serves a purpose — it distinguishes RSNE_MADE vs SUPPLIER for non-assembly items (e.g., TWS trim that can be either fabricated or bought). For assembly products, it's auto-set to `RSNE_MADE`.

5. **Preserve AssemblyTemplate table**: Templates define the bill of materials (components) for building an assembly. The Product record is the "what" (Cooler Door 3'x7'), the template is the "how" (these components in these quantities). Both are needed.

6. **Migration creates Products from existing templates**: Each AssemblyTemplate gets a corresponding Product record in a new "Assemblies" category. Existing BomLineItems that reference assembly templates via JSON specs are migrated to use `productId`.

7. **Keep assembly template matching score logic but apply to Products**: The dimension/synonym matching in `catalog-match.ts` is good — it just needs to operate on Product records (that happen to have `isAssembly: true`) instead of separate AssemblyTemplate records.

### Alternatives Considered

1. **Join table for Product↔AssemblyTemplate**: Rejected because the relationship is 1:1, not many-to-many. A join table adds a query hop with no benefit.

2. **Removing AssemblyTemplate entirely**: Rejected because templates define component recipes — that data doesn't belong on Product.

3. **Using a separate `assemblyType` enum on Product**: Considered, but `isAssembly` boolean is sufficient. The assembly type (DOOR, FLOOR_PANEL, etc.) is already on the linked AssemblyTemplate and can be included in Product queries via the relation.

### Open Questions

1. **Existing BomLineItems**: There may be existing BOMs with assembly items stored as non-catalog. The migration script should convert these to proper product references. **Decision needed**: Should we also backfill `assemblyId` links for assemblies that were matched by job name? (Recommendation: yes, do it in the migration.)

---

## Step-by-Step Tasks

### Step 1: Schema Changes

Add assembly fields to Product model and push to database.

**Actions:**

- Add `isAssembly Boolean @default(false)` to Product model
- Add `assemblyTemplate AssemblyTemplate? @relation(fields: [assemblyTemplateId], references: [id])` and `assemblyTemplateId String?` to Product model
- Add `product Product?` back-relation to AssemblyTemplate model
- Create an "Assemblies" category in the seed if it doesn't exist
- Run `npx prisma db push` to apply

**Files affected:**

- `prisma/schema.prisma`

---

### Step 2: Migration Script — Create Assembly Products

Create Product records for each existing AssemblyTemplate. Migrate existing BomLineItems.

**Actions:**

- Write a migration script that:
  1. Creates/finds an "Assemblies" category
  2. For each active AssemblyTemplate, creates a Product record: `name` = template name, `isAssembly: true`, `assemblyTemplateId` = template ID, `unitOfMeasure: "each"`, `tier: "TIER_1"`, `currentQty: 0`, `reorderPoint: 0`, `categoryId` = Assemblies category
  3. Finds all BomLineItems where `isNonCatalog: true` AND `nonCatalogSpecs` contains `assemblyTemplateId`
  4. For each, updates: set `productId` = the new Product ID, `isNonCatalog: false`, clear `nonCatalogName`, `nonCatalogCategory`, `nonCatalogUom`, `nonCatalogSpecs`
  5. Preserves `fabricationSource: "RSNE_MADE"` (already set)
- Update `prisma/seed-assemblies.ts` to also create Product records when seeding templates

**Files affected:**

- `prisma/seed-assemblies.ts` (update seed to create Products)
- New script: `prisma/migrate-assembly-products.ts` (one-time migration)

---

### Step 3: Simplify Product Browse API

Remove the parallel AssemblyTemplate query — assembly products are now in the Product table.

**Actions:**

- Remove the `assemblyResults` block that queries AssemblyTemplate and creates fake product objects
- Remove the `assemblyTypeLabel` function (no longer needed here)
- Remove the merge logic (`[...assemblyResults, ...products]`)
- Add `isAssembly` and `assemblyTemplateId` to the product select fields
- Assembly products now appear naturally in search results because they're real products
- Include `assemblyTemplate: { select: { type: true } }` in the select so the UI can show assembly type

**Files affected:**

- `src/app/api/products/browse/route.ts`

---

### Step 4: Simplify Catalog Matching

Assembly products match as regular products — remove separate template scoring.

**Actions:**

- Remove the `assemblyTemplates` fetch from `matchItemsToCatalog`
- Remove `matchSingleItem`'s assembly template scoring branch (steps 2-3, 5)
- Remove `calculateAssemblyMatchScore`, `assemblyTokenMatch`, `ASSEMBLY_SYNONYMS`, `parseDimInches`, `assemblyTypeLabel`
- Keep `SUPPLIER_NAMES` — but move the check to suppress assembly product matches when supplier is mentioned (check `product.isAssembly` in the scoring loop)
- Add dimension/synonym matching to the main `calculateMatchScore` function for products where `isAssembly: true` — this preserves the quality of assembly matching
- Update `buildProductMatch` to include `isAssembly` from the product record
- In types.ts: add `isAssembly?: boolean` to matchedProduct interface; keep `isAssemblyTemplate` temporarily as an alias for backward compatibility during transition

**Files affected:**

- `src/lib/ai/catalog-match.ts`
- `src/lib/ai/types.ts`

---

### Step 5: Simplify BOM API Routes

Remove JSON spec inspection for assembly detection.

**Actions:**

- **POST `/api/boms`**: When creating line items, check if the referenced `productId` points to an assembly product (`isAssembly: true`). If so, auto-set `fabricationSource: "RSNE_MADE"`. Remove the `nonCatalogSpecs.assemblyTemplateId` check.
- **GET `/api/boms`**: Change unfabricated assembly counting from `isNonCatalog: true, nonCatalogCategory in assemblyCategories` to joining on Product where `isAssembly: true, assemblyId: null`.
- **PATCH `/api/boms/[id]`**: Same simplification — detect assembly products by `product.isAssembly` instead of JSON inspection.

**Files affected:**

- `src/app/api/boms/route.ts`
- `src/app/api/boms/[id]/route.ts`

---

### Step 6: Simplify BOM Detail Page

Remove assembly-specific branching in `handleAddProduct`.

**Actions:**

- Remove the `if (product.isAssemblyTemplate)` branch in `handleAddProduct`
- Assembly products are added exactly like regular products: `addLineItems: [{ productId, tier: "TIER_1", qtyNeeded: 1 }]`
- The API (Step 5) handles auto-setting `fabricationSource` based on `product.isAssembly`
- Remove `product.id.replace("assembly-template:", "")` logic — IDs are now real UUIDs

**Files affected:**

- `src/app/boms/[id]/page.tsx`

---

### Step 7: Unify Badge Rendering

Replace all scattered badge condition checks with `product.isAssembly`.

**Actions:**

- **ProductPicker**: Check `product.isAssembly` instead of `product.isAssemblyTemplate`. Remove `isAssemblyTemplate` from interface.
- **BomConfirmationCard**: Check `match.matchedProduct?.isAssembly` instead of `isAssemblyTemplate`. Badge: blue `bg-blue-50 text-brand-blue` with Wrench icon + "In-house" text.
- **BomLineItemRow**: Keep `fabricationSource` toggle for RSNE_MADE/SUPPLIER (this is about sourcing choice, not assembly identity). Add "In-house" badge from `product.isAssembly` if available.
- **LiveItemFeed**: Check `item.isAssembly` instead of `isAssemblyTemplate`.
- **BomAiFlow**: Same — use `isAssembly`.
- **AiInput**: Same — use `isAssembly`.

Badge styling (consistent everywhere):
```tsx
<span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-brand-blue">
  <Wrench className="h-3 w-3" />
  In-house
</span>
```

**Files affected:**

- `src/components/bom/product-picker.tsx`
- `src/components/bom/bom-confirmation-card.tsx`
- `src/components/bom/bom-line-item-row.tsx`
- `src/components/bom/live-item-feed.tsx`
- `src/components/bom/bom-ai-flow.tsx`
- `src/components/ai/ai-input.tsx`

---

### Step 8: QA and Validation

Verify everything works end-to-end.

**Actions:**

- Run `npx tsc --noEmit` — zero TypeScript errors
- Run `npx tsx scripts/token-audit.ts` — design token compliance
- Run `npm run build` — production build succeeds
- Manual verification checklist:
  - Search "door" in product picker → assembly products appear with In-house badge
  - AI voice/text parse "cooler door 3x7" → matches assembly product, shows badge
  - Photo parse with assembly items → correct matching and badge
  - Create BOM with assembly item → `productId` set, `isNonCatalog: false`, `fabricationSource: "RSNE_MADE"`
  - BOM list shows unfabricated assembly count correctly
  - BOM detail shows In-house badge on assembly line items
  - Assembly queue still works (templates still have components for fabrication)

**Files affected:**

- No files changed — validation only

---

## Connections & Dependencies

### Files That Reference This Area

- `src/hooks/use-assemblies.ts` — Creates assemblies from templates. **No change needed** — still uses `templateId` on Assembly model.
- `src/app/api/assembly-templates/route.ts` — Returns templates. **No change needed** — templates still exist.
- `src/app/api/assemblies/route.ts` — Assembly CRUD. **No change needed** — Assembly model unchanged.
- Door Shop / Fabrication queue pages — Display assemblies. **No change needed** — they read from Assembly model.

### Updates Needed for Consistency

- `context/project-status.md` — Note that assembly items are now first-class catalog products
- `reference/docs/schema.md` (if exists) — Update Product model documentation

### Impact on Existing Workflows

- **BOM Creation (WF2)**: Simplified — assembly items added like any product. No branching logic.
- **AI Matching**: Simplified — one scoring system for all products. Assembly products still get dimension/synonym boosts.
- **Product Browse**: Simplified — one query, one table. Assembly products sort naturally.
- **Fabrication Queue (WF6-8)**: Unchanged — Assembly model and templates are preserved.
- **Checkout (WF3)**: No impact — assembly items on BOMs now have real `productId`s.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] `npx tsx scripts/token-audit.ts` — no regressions
- [ ] Assembly products exist in Product table with `isAssembly: true`
- [ ] Product search returns assembly products with In-house badge
- [ ] AI matching returns assembly products (not pseudo-products)
- [ ] BOM creation stores assembly items with `productId` (not `isNonCatalog`)
- [ ] BOM list shows correct unfabricated assembly counts
- [ ] In-house badge appears consistently in: product picker, confirmation cards, BOM line items, live feed, AI flow
- [ ] Assembly queue still creates assemblies from templates
- [ ] Existing BOMs with old non-catalog assembly items are migrated

---

## Success Criteria

The implementation is complete when:

1. Assembly items are real Product records with `isAssembly: true` and linked to their AssemblyTemplate via `assemblyTemplateId`
2. The "In-house" badge renders from `product.isAssembly` in every UI surface — one field, one check
3. BomLineItems for assembly products use `productId` — no `isNonCatalog` hack, no JSON specs
4. All existing data is migrated without loss
5. The assembly/fabrication queue workflow is unaffected

---

## Notes

- The `fabricationSource` field on BomLineItem is preserved — it still serves a purpose for non-assembly items that can be either RSNE-fabricated or supplier-purchased (e.g., TWS trim). For assembly products, it's auto-set to `RSNE_MADE`.
- AssemblyTemplate is preserved as-is — it defines the component recipe for building an assembly. Product is the "what," template is the "how."
- This migration is backward-compatible: existing assembly queue items, assembly components, and template definitions are untouched. Only the BOM-side representation changes.
- Future consideration: assembly products could eventually track completed inventory (`currentQty` for finished goods in stock), but that's a separate feature.
