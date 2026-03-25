# Plan: AI Magic — Parsing Accuracy & Match Learning

**Created:** 2026-03-24
**Status:** Implemented
**Request:** Improve AI parsing accuracy — prompt hardening, abbreviation expansion, confidence calibration, match history learning, dimension validation

---

## Overview

### What This Plan Accomplishes

Makes the AI smarter at matching what workers say/type to what's actually in the catalog. Expands the abbreviation dictionary with construction trade terms, integrates match history so corrections stick, calibrates confidence thresholds into a 4-tier system (auto-confirm / suggested / flagged / no match), hardens the parse prompts, and normalizes dimensions before matching.

### Why This Matters

Every time the AI fails to match an item, the foreman has to manually search the catalog. Every wrong match that goes unnoticed creates inventory errors. Better matching = fewer taps, fewer errors, faster workflows. Match history learning means the system gets better over time as users correct it.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `engineering-skills` (backend) | Match history lookup-before-match pattern, confidence formula change (item coverage not symmetric overlap), consolidated abbreviation map, dimension normalization approach |
| `product-skills` (PM) | 4-tier confidence thresholds confirmed: 0.85+ auto-confirm, 0.60-0.85 suggested, 0.40-0.60 flagged, <0.40 no match. Match history bypasses thresholds entirely. |

### How Skills Shaped the Plan

The backend skill identified that the MatchHistory infrastructure already exists (table + API) but is never consulted during matching — the fix is a simple lookup-before-match addition to catalog-match.ts. The product skill confirmed the 4-tier threshold system and the principle that match history corrections should bypass confidence scoring entirely (prior user corrections > algorithmic guessing).

---

## Current State

### Relevant Existing Structure

| File | Current State |
|------|--------------|
| `src/lib/ai/catalog-match.ts` | Token-based matching with symmetric scoring, 11 abbreviations, single 0.4 threshold, no match history lookup |
| `src/lib/ai/parse.ts` | System prompt with basic industry context, confidence calibration guidance in prompt, loads indexed catalog for AI |
| `src/lib/search.ts` | `normalizeSearchTokens()` with 7 abbreviation mappings (separate from catalog-match) |
| `src/app/api/match-history/route.ts` | GET/POST/DELETE endpoints for match history — functional but unused by matching logic |
| `prisma/schema.prisma` | `MatchHistory` model with rawText, normalizedText, productId, userId, confirmed, usageCount |

### Gaps or Problems Being Addressed

1. **Match history exists but is never consulted** — corrections don't improve future matching
2. **Two separate abbreviation dictionaries** — `catalog-match.ts` has 11 entries, `search.ts` has 7, with minimal overlap
3. **Symmetric scoring** — `matchedTokens / max(both lengths)` underscores items where the user typed fewer tokens than the product name
4. **Single threshold (0.4)** — everything above is a match, everything below is non-catalog. No gradation.
5. **Dimension parsing inconsistencies** — "7'6\"" and "90 in" should be equivalent but aren't normalized before matching
6. **Missing trade abbreviations** — "DP" for diamond plate, "HC" for heater cable, gauge numbers (O63, O40), etc.

---

## Proposed Changes

### Summary of Changes

- Consolidate abbreviations into a single shared dictionary in `src/lib/search.ts` with 30+ construction terms
- Add match history lookup to `catalog-match.ts` — check before fuzzy matching
- Change confidence scoring from symmetric to item-coverage based
- Implement 4-tier confidence thresholds with a new `matchTier` field on CatalogMatch
- Add dimension normalization utility function
- Harden AI parse prompts with more abbreviation examples and dimension rules
- Ensure match history is recorded when users confirm/correct matches

### New Files to Create

None — all changes are modifications to existing files.

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/search.ts` | Expand ABBREVIATION_MAP to 30+ entries, export it for use by catalog-match |
| `src/lib/ai/catalog-match.ts` | Import shared abbreviations, add match history lookup before fuzzy match, change scoring formula, add 4-tier threshold logic, add dimension normalization |
| `src/lib/ai/parse.ts` | Harden system prompt with more abbreviation examples, dimension format rules, and construction context |
| `src/lib/ai/types.ts` | Add `matchTier` field to CatalogMatch type: `"auto" \| "suggested" \| "flagged" \| "none"` |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Single shared abbreviation dictionary**: Both `catalog-match.ts` and `search.ts` need the same abbreviations. One source of truth in `search.ts`, imported by both.
2. **Item-coverage scoring**: Change from `matchedTokens / max(itemLen, productLen)` to `matchedTokens / itemTokens.length`. What the user typed matters more — if all their tokens match, it's a good match even if the product name has extra tokens.
3. **Match history bypasses thresholds**: If a confirmed history match exists, set confidence to 0.98 and tier to "auto" regardless of fuzzy score. User corrections are the strongest signal.
4. **4-tier thresholds over 2-tier**: Gives the UI more information to render appropriate affordance (green/blue/orange/gray) without adding user friction.
5. **Dimension normalization in catalog-match, not in parse**: The AI already parses dimensions into the `ParsedLineItem.dimensions` structure. Normalization happens when comparing parsed dimensions against catalog product dimensions during matching.

### Alternatives Considered

- **PostgreSQL full-text search for matching**: Rejected — token-based matching is simpler, fast enough for ~500 products, and doesn't require raw SQL
- **ML-based matching**: Rejected — overkill for this catalog size. Match history + better abbreviations will solve 90% of issues
- **Store match history globally (not per-user)**: Considered but rejected for now — per-user is safer (one user's corrections don't affect another). Can be expanded later.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Expand Shared Abbreviation Dictionary

Consolidate and expand the abbreviation map in `search.ts`.

**Actions:**

- Expand `ABBREVIATION_MAP` in `src/lib/search.ts` with construction trade terms:
  ```typescript
  const ABBREVIATION_MAP: Record<string, string> = {
    // Gauge/thickness
    o63: ".063", o40: ".040", o90: ".090", o32: ".032", o24: ".024",
    // Materials
    ss: "stainless steel", galv: "galvanized", alum: "aluminum",
    dp: "diamond plate", frp: "fiberglass reinforced panel",
    // Panels
    imp: "insulated metal panel",
    // Trim/metal work
    oc: "outside corner", ic: "inside corner",
    tws: "trim wall steel",
    // Sealants/adhesives
    fp: "froth pak",
    // Hardware
    hc: "heater cable", hw: "hardware",
    // Fasteners
    tek: "tek", sd: "self drilling",
    // Units
    lf: "linear feet", sf: "square feet", ea: "each",
    pcs: "pieces", qty: "quantity",
    // Dimensions
    ft: "ft", in: "in",
    // Common shorthand
    wht: "white", blk: "black", clr: "clear",
    ga: "gauge", thk: "thick",
  }
  ```
- Export `ABBREVIATION_MAP` so `catalog-match.ts` can import it
- Keep `normalizeSearchTokens()` using this map (already does)

**Files affected:**
- `src/lib/search.ts`

---

### Step 2: Add matchTier to CatalogMatch Type

Add a tier field so the UI can render appropriate styling per confidence level.

**Actions:**

- Add to `CatalogMatch` interface in `src/lib/ai/types.ts`:
  ```typescript
  /** Confidence tier for UI rendering: auto (green), suggested (blue), flagged (orange), none (gray) */
  matchTier?: "auto" | "suggested" | "flagged" | "none"
  ```
- This is optional with a default behavior — existing code that doesn't check `matchTier` continues to work

**Files affected:**
- `src/lib/ai/types.ts`

---

### Step 3: Upgrade Catalog Matching — History Lookup + Scoring + Tiers

The biggest change. Add match history consultation, improve scoring, implement 4-tier thresholds.

**Actions:**

- Import `ABBREVIATION_MAP` from `@/lib/search` (replace the local `ABBREVIATIONS` object)
- Import `normalizeSearchTokens` from `@/lib/search` for normalizing match history lookups

**Match history lookup (add before fuzzy matching in `matchSingleItem`):**
```typescript
// Check match history first
const normalizedItemText = normalizeSearchTokens(item.name).join(" ")
const historyMatch = await prisma.matchHistory.findFirst({
  where: {
    normalizedText: normalizedItemText,
    confirmed: true,
    productId: { not: null },
  },
  orderBy: { usageCount: "desc" },
  include: { product: { select: { id: true, name: true, ... } } },
})

if (historyMatch && historyMatch.product) {
  // History match bypasses fuzzy matching
  return { ...buildCatalogMatch(historyMatch.product, item), matchConfidence: 0.98, matchTier: "auto" }
}
```

Note: `matchSingleItem` needs to become `async` since it now queries the DB.

**Scoring formula change:**
- From: `matchedTokens / Math.max(itemTokens.length, productTokens.length)`
- To: `matchedTokens / itemTokens.length` (coverage of user intent)
- Add small penalty for product name being much longer: `* (1 - 0.1 * Math.max(0, productTokens.length - itemTokens.length - 2) / productTokens.length)`
- This means if user types 3 tokens and all 3 match a 10-token product name, score is still ~0.85 (not 0.3)

**4-tier thresholds (replace single 0.4 threshold):**
```typescript
function getMatchTier(confidence: number): "auto" | "suggested" | "flagged" | "none" {
  if (confidence >= 0.85) return "auto"
  if (confidence >= 0.60) return "suggested"
  if (confidence >= 0.40) return "flagged"
  return "none"
}
```
- Set `matchTier` on every returned `CatalogMatch`
- Keep the existing `isNonCatalog` logic (< 0.40 = non-catalog) for backward compatibility

**Use shared abbreviation map:**
- Replace local `ABBREVIATIONS` with imported `ABBREVIATION_MAP`
- Update `checkAbbreviationMatch` to use the new map format (string values, not string[] arrays)

**Files affected:**
- `src/lib/ai/catalog-match.ts`

---

### Step 4: Harden AI Parse Prompts

Strengthen the system prompt and matching guidance.

**Actions:**

- In `src/lib/ai/parse.ts`, expand the `SYSTEM_PROMPT` industry context:
  ```
  - Gauge/thickness shorthand: O63 = .063", O40 = .040", O90 = .090". These are sheet metal gauges.
  - Diamond plate: also called "DP", "checker plate", "tread plate". Gauge is part of the name (e.g., "Diamond Plate .063 4' x 8'")
  - Dimensions: Workers say "4x8" meaning 4' x 8' (feet). "7'6" = 7 feet 6 inches = 7.5 feet.
  - TWS (Trim Wall Steel) comes in types: OC (Outside Corner), IC (Inside Corner), Cap, Screed, Base, Flat Batten. Format: "TWS OC 2x3" = 2" x 3" outside corner.
  - Panel shorthand: "4in IMP W/W 3x20" = 4" thick Insulated Metal Panel, White/White, 3' wide x 20' long
  - Heater cable: also "HC", measured in linear feet
  - FROTH-PAK: brand name for spray foam kits (200, 620 sizes)
  ```

- In the MATCHING GUIDANCE section of `parseTextInput`, add:
  ```
  - When you see gauge numbers like "O63" or ".063", these identify specific material thicknesses. Match to products with that gauge in the name.
  - Dimension format: "4x8" = 4' x 8'. "7'6" = 7'6" = 7.5 feet. Always convert to feet for matching.
  - If the user says a size and only one catalog product matches that size, it's a strong match even if the name is partial.
  ```

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 5: Validation & QA

Type check, test matching improvements.

**Actions:**

- Run `npx tsc --noEmit` — verify zero new errors
- Test normalization: verify "4x8 O63 diamond plate" tokens = ["4", "8", ".063", "diamond", "plate"]
- Test scoring: verify a 3-token search matching all 3 tokens of a 8-token product scores ~0.85 (not 0.3)
- Test match history: verify that if a correction exists, it's returned with 0.98 confidence
- Test tier assignment: verify confidence → tier mapping is correct
- Verify existing parse flows still work (text input, voice input, photo input)

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/api/ai/parse/route.ts` — calls `parseTextInput()`, passes results to frontend
- `src/app/api/ai/parse-image/route.ts` — calls image parsing, uses same `CatalogMatch` type
- `src/app/api/ai/parse-image-fast/route.ts` — uses match history for fast re-matching
- `src/app/api/ai/refine-matches/route.ts` — re-runs matching with user corrections
- `src/components/bom/bom-ai-flow.tsx` — renders CatalogMatch results, checks `matchConfidence`
- `src/components/bom/bom-confirmation-card.tsx` — displays confidence, styling based on level
- `src/components/bom/flagged-item-resolver.tsx` — shows alternatives for low-confidence matches
- `src/components/receiving/receiving-confirmation-card.tsx` — same pattern for receiving flow

### Updates Needed for Consistency

- The `matchTier` field is optional, so existing UI code continues to work without changes. UI can be updated in Session 5 (UX Polish) to use `matchTier` for card styling.

### Impact on Existing Workflows

- **Better matches everywhere** — text, voice, and photo parsing all use the same matching pipeline
- **Match history learning kicks in** — corrections start improving future matches immediately
- **No breaking changes** — `matchTier` is optional, `isNonCatalog` logic unchanged, existing thresholds still function as floor
- **`matchSingleItem` becomes async** — `matchItemsToCatalog` is already async, so this is a straightforward change

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] Abbreviation map has 30+ entries, exported from `search.ts`
- [ ] `catalog-match.ts` imports shared abbreviation map (not local copy)
- [ ] Match history is consulted before fuzzy matching
- [ ] History matches get confidence 0.98 and tier "auto"
- [ ] Scoring uses item-coverage formula (not symmetric)
- [ ] `matchTier` field is set on all CatalogMatch results
- [ ] Tier thresholds: 0.85+ = auto, 0.60-0.85 = suggested, 0.40-0.60 = flagged, <0.40 = none
- [ ] System prompt includes expanded abbreviation context
- [ ] Existing parse flows (text/voice/photo) still work

---

## Success Criteria

The implementation is complete when:

1. **"4x8 O63 diamond plate" matches "Diamond Plate .063 4' x 8'" with high confidence** via the improved scoring + abbreviation expansion
2. **User corrections persist** — correcting a match once means next time the same text auto-matches at 0.98
3. **Confidence tiers are assigned** — every CatalogMatch has a `matchTier` that the UI can use for appropriate styling

---

## Notes

- The abbreviation map will grow over time as new terms are encountered. The Session 5 UX Polish pass can add a mechanism for users to report "this didn't match" which captures new abbreviations.
- Match history is per-user for now. A global match history (aggregated across all users) could be a future enhancement — but needs careful thought about conflicting corrections.
- The `matchTier` field is set in the matching layer but the UI doesn't need to change in this session. Session 5 (UX Polish) can update confirmation cards to use tier-based styling (green/blue/orange/gray).
- `matchSingleItem` becoming async means `matchItemsToCatalog` needs to use `Promise.all` instead of `.map()` — a simple change since it's already async.
