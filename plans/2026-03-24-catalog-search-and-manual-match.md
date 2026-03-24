# Plan: Catalog Search Fix + Manual Match on Flagged Items

**Created:** 2026-03-24
**Status:** Implemented
**Request:** Fix missing items in catalog search (normalization) + add manual catalog match option on flagged BOM items

---

## Overview

### What This Plan Accomplishes

Fixes the bug where products can't be found in search due to trade shorthand ("4x8" vs "4' x 8'", "O63" vs ".063") by adding token-based search with normalization. Also adds a "Match to Catalog" button on flagged BOM items that opens a search sheet, giving users the ability to manually find and select the right catalog product when AI matching fails.

### Why This Matters

Workers use trade shorthand — "O63 diamond plate" not "Diamond Plate .063 4' x 8'". When they can't find products, they create duplicates as custom items or give up. This fixes the search gap and gives them a self-service recovery path when AI matching is wrong.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | "Match to Catalog" button style (outline blue, between confirm and custom), bottom Sheet with ProductPicker for search, specs for the flow |
| `engineering-skills` (backend) | Token-based search with normalization: split search into tokens, normalize apostrophes/abbreviations, AND each token against name/sku via Prisma `contains`. No raw SQL needed. |

### How Skills Shaped the Plan

The backend skill confirmed that token-split + normalization is the right approach for a ~500 product catalog (full-text search is overkill). The frontend skill defined the "Match to Catalog" button placement and the Sheet-based search flow that reuses the existing ProductPicker pattern.

---

## Current State

### Relevant Existing Structure

| File | Current State |
|------|--------------|
| `src/components/bom/product-picker.tsx` | Calls `/api/inventory` (wrong endpoint), single-string `contains` search |
| `src/app/api/products/browse/route.ts` | Single-string `contains` search on name/sku, no normalization |
| `src/app/api/inventory/route.ts` | Single-string `contains` search on name/sku, no normalization |
| `src/components/bom/flagged-item-resolver.tsx` | Shows fuzzy matches + "Add as custom item". No manual catalog search option. |

### Gaps or Problems Being Addressed

1. **ProductPicker calls wrong API** — uses `/api/inventory` instead of `/api/products/browse`
2. **Search too strict** — "4x8" doesn't match "4' x 8'" (apostrophe), "O63" doesn't match ".063" (abbreviation)
3. **No manual match option** — when AI matching fails, users can only accept the fuzzy match or add as custom. No way to search the catalog themselves.

---

## Proposed Changes

### Summary of Changes

- Create a shared `normalizeSearchTokens()` utility function
- Update `/api/products/browse` search to use token-based AND query with normalization
- Update `/api/inventory` search to use the same token-based approach
- Fix ProductPicker to call `/api/products/browse` instead of `/api/inventory`
- Add "Match to Catalog" button to FlaggedItemResolver with Sheet-based ProductPicker search

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/lib/search.ts` | Shared search normalization utility — `normalizeSearchTokens()` function |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/products/browse/route.ts` | Replace single `contains` with token-based AND query using `normalizeSearchTokens()` |
| `src/app/api/inventory/route.ts` | Same token-based search upgrade |
| `src/components/bom/product-picker.tsx` | Change API endpoint from `/api/inventory` to `/api/products/browse` |
| `src/components/bom/flagged-item-resolver.tsx` | Add "Match to Catalog" button + Sheet with ProductPicker |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Token-based AND search over full-text search**: For ~500 products, splitting the search into tokens and AND'ing them via Prisma `contains` is simpler, faster to build, and doesn't require raw SQL. Full-text search is overkill.
2. **Normalization handles apostrophes + abbreviations**: Strip `'`, `"`, `′`, `″` from search terms. Expand common trade abbreviations (O63→.063, ga→gauge, ss→stainless steel). Split "4x8" by treating `x` between digits as a separator.
3. **Shared utility in src/lib/search.ts**: Both API endpoints use the same normalization logic. One function, two consumers.
4. **ProductPicker → /api/products/browse**: The browse endpoint is the correct one — it has category context, favorites, and returns the right shape. The inventory endpoint is for inventory management, not product selection.
5. **Sheet (not modal) for manual match**: Bottom sheet matches the app's existing pattern (PanelCheckoutSheet, etc.). Sheet slides up from bottom, natural for mobile.
6. **"Match to Catalog" button between confirm and custom**: Outline blue style — visually distinct from the green confirm and orange custom buttons. Not the primary action (AI match is still preferred), but clearly available.

### Alternatives Considered

- **PostgreSQL `ILIKE` with wildcards**: Rejected — doesn't handle word order or abbreviations
- **PostgreSQL full-text search (tsvector/tsquery)**: Rejected — requires raw SQL, complex to maintain, overkill for 500 products
- **Client-side fuzzy search (fuse.js)**: Rejected — would need to load all 500 products to the client

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Create Search Normalization Utility

Create a shared function that normalizes search input into tokens suitable for database matching.

**Actions:**

- Create `src/lib/search.ts`
- Export `normalizeSearchTokens(input: string): string[]`
- Logic:
  1. Lowercase the input
  2. Replace apostrophes/foot/inch marks: `['′`]` → empty, `["″]` → empty
  3. Replace `x` between digits with space: `"4x8"` → `"4 8"`
  4. Strip special characters except dots and hyphens: `[^\w\s.\-]` → space
  5. Split into tokens by whitespace
  6. Expand abbreviations map: `{ "o63": ".063", "o40": ".040", "o90": ".090", "ga": "gauge", "ss": "stainless steel", "galv": "galvanized", "alum": "aluminum", "dp": "diamond plate" }`
  7. Filter out empty tokens and single-character tokens (except numbers)
  8. Return array of tokens
- Export `buildTokenSearch(tokens: string[]): Prisma-compatible AND query`
  - Returns `{ AND: tokens.map(t => ({ OR: [{ name: { contains: t, mode: "insensitive" } }, { sku: { contains: t, mode: "insensitive" } }] })) }`

**Files affected:**
- `src/lib/search.ts` (new)

---

### Step 2: Update Browse API with Token Search

Replace the single `contains` search with token-based AND query.

**Actions:**

- Import `normalizeSearchTokens` from `@/lib/search`
- Replace the search block (lines 99-110) with:
  ```typescript
  if (search) {
    const tokens = normalizeSearchTokens(search)
    if (tokens.length > 0) {
      where.AND = tokens.map(token => ({
        OR: [
          { name: { contains: token, mode: "insensitive" } },
          { sku: { contains: token, mode: "insensitive" } },
        ]
      }))
    }
    // Keep panel exclusion logic
    const panelTerms = ["panel", "imp", "insulated metal"]
    if (panelTerms.some((term) => search.toLowerCase().includes(term))) {
      where.category = { name: { not: { equals: "Insulated Metal Panel" } } }
    }
  }
  ```
- Increase default limit from 50 to keep current behavior

**Files affected:**
- `src/app/api/products/browse/route.ts`

---

### Step 3: Update Inventory API with Token Search

Apply the same normalization to the inventory endpoint for consistency.

**Actions:**

- Import `normalizeSearchTokens` from `@/lib/search`
- Find the search block where `contains` is used on name/sku
- Replace with same token-based AND pattern as browse API

**Files affected:**
- `src/app/api/inventory/route.ts`

---

### Step 4: Fix ProductPicker API Endpoint

Change from `/api/inventory` to `/api/products/browse`.

**Actions:**

- In `product-picker.tsx` line 62, change:
  - From: `/api/inventory?search=${encodeURIComponent(search)}&limit=10`
  - To: `/api/products/browse?search=${encodeURIComponent(search)}&limit=10`
- The response shape is compatible: both return `{ data: ProductResult[] }`
- The browse endpoint returns additional fields (tier, category) which the ProductPicker already handles

**Files affected:**
- `src/components/bom/product-picker.tsx`

---

### Step 5: Add Manual Match to FlaggedItemResolver

Add "Match to Catalog" button and Sheet-based search.

**Actions:**

- Add imports: `Search` from lucide-react, `Sheet/SheetContent/SheetHeader/SheetTitle` from shadcn, `ProductPicker` from bom
- Add `onManualMatch?: (productId: string, productName: string) => void` to props interface
- Add state: `const [searchOpen, setSearchOpen] = useState(false)`
- Between the alternatives list and the "Add as custom item" button, add:
  ```tsx
  <button
    type="button"
    onClick={() => setSearchOpen(true)}
    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-brand-blue text-brand-blue font-semibold text-sm hover:bg-brand-blue/5 active:scale-[0.97] transition-all"
  >
    <Search className="h-4 w-4" />
    Match to catalog item
  </button>
  ```
- Add Sheet component at the bottom:
  ```tsx
  <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
    <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
      <SheetHeader>
        <SheetTitle>Find catalog item</SheetTitle>
        <p className="text-sm text-text-muted">Matching: "{rawText}"</p>
      </SheetHeader>
      <div className="mt-4">
        <ProductPicker
          onSelect={(product) => {
            onManualMatch?.(product.id, product.name) || onSelect(product.id, product.name)
            setSearchOpen(false)
          }}
          placeholder="Search by name, SKU, or description..."
        />
      </div>
    </SheetContent>
  </Sheet>
  ```
- Replace off-brand `bg-orange-50 border-orange-200` on the wrapper with `bg-brand-orange/10 border border-brand-orange/20`
- Replace `text-orange-500` on AlertCircle with `text-brand-orange`

**Files affected:**
- `src/components/bom/flagged-item-resolver.tsx`

---

### Step 6: Validation & QA

Type check, token audit, search verification.

**Actions:**

- Run `npx tsc --noEmit` — verify zero new errors
- Run `npx tsx scripts/token-audit.ts` — verify no new off-brand tokens
- Verify search normalization works for test cases:
  - "4x8" → tokens ["4", "8"] → matches "4' x 8'"
  - "O63 diamond plate" → tokens [".063", "diamond", "plate"] → matches "Diamond Plate .063 4' x 8'"
  - "diamond" → tokens ["diamond"] → matches "Diamond Plate .063 4' x 8'"
  - "FSI" → tokens ["fsi"] → matches "FSI-96 BUTYL"
- Verify FlaggedItemResolver shows 3 buttons: confirm match, match to catalog, add custom
- Verify Sheet opens with ProductPicker and selecting an item resolves the flag
- All interactive elements >= 44px touch target
- No off-brand gray tokens in modified files

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/boms/[id]/page.tsx` — Uses ProductPicker in edit mode. Will benefit from the API fix automatically.
- `src/components/bom/bom-quick-pick.tsx` — Uses `/api/products/browse` directly (not ProductPicker). Will benefit from browse API normalization automatically.
- `src/components/bom/bom-ai-flow.tsx` — Uses FlaggedItemResolver. The new `onManualMatch` prop is optional, so existing callers won't break.

### Updates Needed for Consistency

- Any component that uses ProductPicker will automatically benefit from the API endpoint fix and improved search.

### Impact on Existing Workflows

- **Search results improve everywhere** — browse API normalization affects BomQuickPick, ProductPicker, and any future search consumers
- **FlaggedItemResolver gains a new option** — existing props are unchanged, new `onManualMatch` is optional
- **No breaking changes** — all modifications are additive

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx tsx scripts/token-audit.ts` shows no new errors in modified files
- [ ] Search "4x8" returns products with "4' x 8'" in the name
- [ ] Search "O63 diamond" returns "Diamond Plate .063 4' x 8'"
- [ ] Search "diamond plate" returns diamond plate products
- [ ] ProductPicker calls `/api/products/browse` (not `/api/inventory`)
- [ ] FlaggedItemResolver shows "Match to catalog item" button
- [ ] Tapping "Match to catalog" opens Sheet with ProductPicker
- [ ] Selecting a product in the Sheet resolves the flagged item
- [ ] Sheet closes after selection
- [ ] No off-brand tokens in modified files
- [ ] All buttons >= 44px touch target

---

## Success Criteria

The implementation is complete when:

1. **"4x8 O63 diamond plate" finds "Diamond Plate .063 4' x 8'"** in any search context (ProductPicker, browse, inventory)
2. **Users can manually match flagged items to catalog products** via a search sheet
3. **ProductPicker uses the correct API endpoint** (`/api/products/browse`)

---

## Notes

- The abbreviation map in `normalizeSearchTokens()` is intentionally small and focused on known trade shorthand. It can be extended as new abbreviations are discovered.
- The `x` → space conversion is scoped to `x` between digits only (via regex `\d+x\d+`) to avoid breaking words like "box" or "wax".
- The browse API's panel exclusion logic is preserved — searching "panel" still doesn't show branded panel products.
- The `onManualMatch` prop on FlaggedItemResolver is optional. If not provided, falls back to `onSelect` which handles the same way. This means existing callers of FlaggedItemResolver don't need changes.

---

## Implementation Notes

**Implemented:** 2026-03-24

### Summary

- Created `src/lib/search.ts` with `normalizeSearchTokens()` and `buildTokenSearch()` utilities
- Updated `/api/products/browse` to use token-based AND search with normalization
- Updated `/api/inventory` to use same token-based search (with AND-merge for existing status filters)
- Fixed ProductPicker to call `/api/products/browse` instead of `/api/inventory`
- Added "Match to catalog item" button and bottom Sheet with ProductPicker to FlaggedItemResolver
- Replaced off-brand orange tokens (`bg-orange-50`, `border-orange-200`, `text-orange-500`) with brand tokens

### Deviations from Plan

- Inventory API: merged token search conditions with existing `where.AND` array (for stock status filters) instead of overwriting — prevents breaking the low/out-of-stock filter logic that already uses `AND`.
- `buildTokenSearch()` helper was exported from `search.ts` but not used directly by the API routes (they inline the pattern for clarity with the panel exclusion logic). The helper remains available for future consumers.

### Issues Encountered

None
