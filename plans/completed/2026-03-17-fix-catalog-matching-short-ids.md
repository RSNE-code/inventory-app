# Plan: Fix AI Catalog Matching — Short Numeric IDs

**Created:** 2026-03-17
**Status:** Implemented
**Request:** Replace UUID-based product IDs with short numeric indices in all AI prompts to fix near-zero catalog match rates

---

## Overview

### What This Plan Accomplishes

Replaces 36-character UUIDs (e.g., `550e8400-e29b-41d4-a716-446655440000`) with short numeric indices (`1`, `2`, `3`...) in the catalog context sent to Claude. After the AI responds, a server-side mapping layer converts the short IDs back to real UUIDs before product lookup. This change touches `src/lib/ai/parse.ts` (the core parsing module) and the streaming API route that calls it.

### Why This Matters

Users are uploading material list photos and getting 1 out of 15 items matched, even when the items are obvious catalog matches. The root cause: Claude must copy exact 36-character UUID strings from a 584-product list. This is an unreliable pattern for structured output — the model either returns `null` (can't confidently reproduce the UUID) or hallucinates a non-existent UUID that fails the productMap lookup. Short numeric IDs (`"42"`) are trivially copyable, dramatically increasing match rates.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `engineering-skills` (backend) | API data transformation pattern: server should own the ID mapping layer, not push long identifiers onto the LLM |
| `engineering-skills` (prompt engineer) | Structured output design: keep token overhead low, use format the model can reliably reproduce. Short numeric IDs are a standard pattern for LLM catalog matching |

### How Skills Shaped the Plan

The backend skill confirmed the approach: add a mapping layer between the LLM and the database, keeping UUIDs internal. The prompt engineering skill validated that UUIDs are an anti-pattern for structured output — models reliably reproduce short identifiers but struggle with long opaque strings. Both skills agreed: the fix is a data transformation layer, not a prompt rewrite.

---

## Current State

### Relevant Existing Structure

- `src/lib/ai/parse.ts` — Core AI parsing module. Contains 5 parsers, all sharing `loadCatalogContext()` and `toCatalogMatch()`
- `src/app/api/ai/parse-image-fast/route.ts` — Streaming BOM image parser route, calls `parseBomImageStream()` + `toBomCatalogMatch()`
- `src/app/api/ai/parse-image/route.ts` — Receiving image parser route, calls `parseImageInput()`

### Gaps or Problems Being Addressed

1. **`loadCatalogContext()`** returns `UUID|name|SKU` format — Claude must reproduce exact UUIDs
2. **`loadSupplierContext()`** also uses UUIDs (`ID:UUID | name`) — same problem for supplier matching
3. **`toCatalogMatch()`** looks up `item.matchedProductId` in `productMap` keyed by UUID — any UUID mismatch = silent failure (treated as non-catalog)
4. **`toBomCatalogMatch()`** passes through to `toCatalogMatch()` — same UUID dependency
5. **Alternatives also fail** — `alternativeProductIds` also require exact UUIDs

---

## Proposed Changes

### Summary of Changes

- Replace `loadCatalogContext()` with `loadIndexedCatalog()` that returns short numeric IDs + a mapping object
- Replace `loadSupplierContext()` with `loadIndexedSuppliers()` (same pattern)
- Add `resolveProductId()` helper to convert short IDs back to UUIDs
- Update all 4 parser functions that use catalog context to: (a) send short IDs in prompt, (b) resolve IDs in response before productMap lookup
- Update `parseBomImageStream()` to return the index map so the route can resolve IDs
- Update the streaming route to resolve short IDs before `toBomCatalogMatch()`

### New Files to Create

None — all changes are within existing files.

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/lib/ai/parse.ts` | Replace `loadCatalogContext` with `loadIndexedCatalog`, replace `loadSupplierContext` with `loadIndexedSuppliers`, add `resolveProductId` helper, update all 4 parser functions, update `parseBomImageStream` return type |
| `src/app/api/ai/parse-image-fast/route.ts` | Resolve short IDs from stream items before calling `toBomCatalogMatch` |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Short numeric indices (1-indexed), not hashes or abbreviated UUIDs**: Numeric IDs are the shortest possible identifier. `"42"` is 2 tokens; a UUID is 10+ tokens. Shorter = more reliable copying.

2. **Mapping layer in `parse.ts`, not in the API routes**: The resolution from short ID → UUID happens inside `parse.ts` for the non-streaming parsers (they already resolve internally). For the streaming parser, the map is returned alongside the stream so the route can resolve before building CatalogMatch objects.

3. **Same pattern for suppliers**: `loadSupplierContext()` has the same UUID problem. Apply the same indexed approach for consistency.

4. **Backwards-compatible `resolveProductId()`**: The helper accepts both short numeric strings AND existing UUIDs. If the model somehow returns a UUID (e.g., from cached behavior), it still works.

### Alternatives Considered

- **Two-step approach (extract names → fuzzy match server-side)**: More robust but much more complex, slower (two AI calls), and loses the streaming benefit. Rejected for now — short IDs should solve 90%+ of the problem.
- **Abbreviated UUIDs (first 8 chars)**: Still 8 characters and collision-prone with 584 products. Rejected.
- **Prompt-only fix (better instructions)**: Won't help — the issue is structural (UUID length), not instructional. Rejected.

### Open Questions

None — this is a straightforward data transformation fix.

---

## Step-by-Step Tasks

### Step 1: Add `loadIndexedCatalog()` and `resolveProductId()` to `parse.ts`

Replace `loadCatalogContext()` with a new function that returns both the prompt text and a mapping object.

**Actions:**

- Add `IndexedCatalog` interface: `{ text: string, indexToId: Map<number, string> }`
- Add `loadIndexedCatalog()`: queries same products, maps `index+1` → UUID, returns `"1|ALUM ANGLE 1.5x1.5x16'|AET515154\n2|..."` format
- Add `resolveProductId(id: string | null, indexToId: Map<number, string>): string | null` — converts short index to UUID, passes through UUIDs unchanged
- Keep `loadCatalogContext()` temporarily as a wrapper that calls `loadIndexedCatalog().text` if any other code references it (check first)

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 2: Add `loadIndexedSuppliers()` to `parse.ts`

Same pattern for suppliers — short numeric IDs instead of UUIDs.

**Actions:**

- Add `IndexedSuppliers` interface: `{ text: string, indexToId: Map<number, string> }`
- Add `loadIndexedSuppliers()`: returns `"1|Hadco Metal Trading\n2|Metl-Span\n..."` format
- Used by `parseReceivingTextInput()` and `parseImageInput()`

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 3: Update `parseTextInput()` to use indexed catalog

**Actions:**

- Replace `loadCatalogContext()` call with `loadIndexedCatalog()`
- Update prompt to use `catalog.text` instead of `catalogContext`
- After AI response, resolve `item.matchedProductId` and `item.alternativeProductIds` through `resolveProductId()` before passing to `toCatalogMatch()`

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 4: Update `parseReceivingTextInput()` to use indexed catalog + suppliers

**Actions:**

- Replace both `loadCatalogContext()` and `loadSupplierContext()` with indexed versions
- Update prompt to use `.text` properties
- Resolve `item.matchedProductId`, `item.alternativeProductIds`, and `parsed.supplierId` through `resolveProductId()` before returning

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 5: Update `parseImageInput()` to use indexed catalog + suppliers

**Actions:**

- Same changes as Step 4 but for the image parser
- Replace both loaders with indexed versions
- Resolve all IDs in the response before building the return object

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 6: Update `parseBomImageStream()` to use indexed catalog and return index map

**Actions:**

- Replace `loadCatalogContext()` with `loadIndexedCatalog()`
- Update prompt to use `catalog.text`
- Change return type to include `indexToId` map alongside the stream result
- Export the `IndexedCatalog` type for use by the route

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 7: Update streaming route to resolve short IDs

**Actions:**

- Destructure `indexToId` from `parseBomImageStream()` result
- Before calling `toBomCatalogMatch()`, resolve `item.matchedProductId` and `item.alternativeProductIds` through `resolveProductId()`
- Import `resolveProductId` from parse.ts (or pass the map to `toBomCatalogMatch`)

**Files affected:**
- `src/app/api/ai/parse-image-fast/route.ts`

---

### Step 8: Build verification + deploy

**Actions:**

- Run `npm run build` to verify no type errors
- Commit all changes
- Push to trigger Vercel deploy
- Verify deploy succeeds (check `npx vercel ls`)

**Files affected:**
- N/A (verification step)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/api/ai/parse/route.ts` — calls `parseTextInput()` (no changes needed — internal ID resolution)
- `src/app/api/ai/parse-image/route.ts` — calls `parseImageInput()` (no changes needed)
- `src/app/api/ai/parse-image-fast/route.ts` — calls `parseBomImageStream()` + `toBomCatalogMatch()` (needs Step 7 changes)
- `src/components/bom/bom-photo-capture.tsx` — consumes stream output (no changes needed — IDs already resolved server-side)

### Updates Needed for Consistency

- `context/ai-module.md` — update to note the short-ID indexing approach if desired (low priority)

### Impact on Existing Workflows

- **BOM photo capture (WF2)**: Match rates should dramatically improve — the core bug fix
- **Receiving (WF1)**: Same improvement for packing slip photo parsing and text/voice input
- **Text/voice input**: Same improvement across all AI input paths
- **Match history**: Still works — match history stores real UUIDs. The resolution happens before history comparison in the streaming route.
- **No breaking changes**: The `CatalogMatch` type and all downstream consumers remain unchanged. The ID resolution is fully internal to the parse layer.

---

## Validation Checklist

- [ ] `npm run build` passes with no new errors
- [ ] `parseBomImageStream()` sends short numeric IDs in prompt (not UUIDs)
- [ ] `parseTextInput()` sends short numeric IDs in prompt
- [ ] `parseImageInput()` sends short numeric IDs for both products and suppliers
- [ ] `resolveProductId()` correctly maps short IDs → UUIDs
- [ ] `resolveProductId()` passes through real UUIDs unchanged (backward compat)
- [ ] Streaming route resolves IDs before building CatalogMatch objects
- [ ] Vercel deploy succeeds
- [ ] Test with a photo upload — significantly more items match to catalog products

---

## Success Criteria

The implementation is complete when:

1. All AI prompts use short numeric IDs (1, 2, 3...) instead of UUIDs
2. A server-side mapping layer converts AI-returned short IDs back to real UUIDs
3. Photo uploads match the majority of recognizable items to catalog products (vs. 1/15 before)
4. Build passes and deploys successfully to Vercel

---

## Notes

- Token savings are a bonus: ~584 products × ~30 tokens per UUID ≈ 17,500 tokens saved per prompt. Short IDs use ~584 × 2 tokens ≈ 1,200 tokens. Net savings: ~16,000 tokens per request.
- If match rates are still low after this fix, the next investigation should be the confidence threshold gate in `toCatalogMatch()` (T2 items need 0.80 confidence — may be too aggressive).
- The `parsePanelVoiceInput()` function doesn't use catalog context — no changes needed there.

---

## Implementation Notes

**Implemented:** 2026-03-17

### Summary

Replaced UUID-based catalog and supplier IDs with short numeric indices across all 4 AI parsers. Added `loadIndexedCatalog()`, `loadIndexedSuppliers()`, and `resolveProductId()` to `parse.ts`. Updated the streaming route to resolve IDs before building CatalogMatch objects. Build passes and deployed successfully to Vercel.

### Deviations from Plan

None — implemented exactly as planned.

### Issues Encountered

None.
