# Plan: Fix AI Catalog Matching — Prompt Redesign

**Created:** 2026-03-17
**Status:** Implemented
**Request:** Redesign AI catalog matching prompts with few-shot examples, unambiguous ID format, and explicit partial-match guidance to fix near-zero match rates

---

## Overview

### What This Plan Accomplishes

Redesigns the catalog matching prompts in `src/lib/ai/parse.ts` to solve three confirmed root causes of match failure: (1) the AI returns null instead of attempting matches, (2) the AI confuses numeric IDs with SKUs in the pipe-delimited format, and (3) the AI assigns low confidence (0.45) to obvious partial matches. The fix applies three prompt engineering patterns: few-shot examples, an unambiguous catalog format, and explicit partial-match scoring guidance.

### Why This Matters

The BOM photo capture workflow is the primary way materials lists get into the system. With 1 out of 15 items matching, every BOM requires manual data entry — defeating the purpose of the AI-first design. Fixing this makes the core WF2 (BOM Creation) workflow actually work.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `engineering-skills` (senior-prompt-engineer) | Few-shot example design, structured output patterns, RAG context formatting |

### How Skills Shaped the Plan

The prompt engineering skill identified that the catalog context follows a RAG pattern — the AI must match against a provided reference list, not generate from memory. The skill's few-shot design workflow (simple case, edge case, complex case) directly informed the example selection. The structured output guidance confirmed that Zod schema descriptions should reinforce (not contradict) the prompt instructions.

---

## Current State

### Relevant Existing Structure

- `src/lib/ai/parse.ts` — 4 parsers sharing `loadIndexedCatalog()`, `resolveProductId()`, and `toCatalogMatch()`
- `src/app/api/ai/parse-image-fast/route.ts` — streaming BOM parser route with diagnostic logging
- Catalog: 1,217 active products, sorted alphabetically, indexed 1-1217
- Current format: `42|FROTH-PAK 200|FP200` (ambiguous — 3 pipe-delimited values, AI picks wrong column)

### Gaps or Problems Being Addressed

1. **AI returns null matchedProductId** — prompt previously said "a wrong match is worse than no match" (fixed in earlier commit but still no few-shot examples showing correct behavior)
2. **AI returns SKUs instead of numeric IDs** — catalog format `42|name|SKU` has three pipe-separated values; AI confuses which is the ID. Diagnostic log showed `IMP-AWIP-8-4` returned instead of a number.
3. **Low confidence on obvious matches** — "T-Bar" → "T-Bar 4" x 16'" scored 0.45 confidence. The AI doesn't know that partial name matches with extra specs are common and should score high.
4. **No few-shot examples** — AI has no reference for what a correct match looks like

---

## Proposed Changes

### Summary of Changes

- Change catalog format from `ID|name|SKU` to `[ID] name (SKU)` — brackets make the ID visually distinct and impossible to confuse with other fields
- Add 3 few-shot matching examples to the BOM streaming prompt showing exact expected behavior
- Add explicit confidence scoring guide for partial matches
- Apply same format and guidance changes to text and receiving parsers
- Remove diagnostic logging after fix is verified

### New Files to Create

None.

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/lib/ai/parse.ts` | Change `loadIndexedCatalog()` format, add few-shot examples to all 4 prompt functions, add confidence scoring guide |
| `src/app/api/ai/parse-image-fast/route.ts` | Keep diagnostic logging for one more deploy cycle, then remove |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **`[ID] name (SKU)` format instead of `ID|name|SKU`**: Brackets create an unambiguous visual boundary. The AI can't mistake `[42]` for a SKU. This is a standard RAG citation pattern (e.g., `[1] source text`). Costs ~2 extra tokens per product (~2,400 total) but eliminates format confusion.

2. **3 few-shot examples, not more**: Prompt engineering best practice is 3-5 examples (simple, edge, complex). With 1,217 products in context, token budget is tight. Three examples demonstrate: (a) exact match, (b) partial name match with specs, (c) no match → null. These cover the failure modes.

3. **Explicit confidence calibration guide**: Instead of leaving confidence to the AI's judgment, provide a scoring rubric: exact name = 0.95, partial name = 0.80-0.90, ambiguous/generic = 0.50-0.70. This directly addresses the 0.45 confidence on obvious matches.

4. **Same format across all 4 parsers**: Consistency prevents confusion if context is shared or prompts are compared. All parsers use the same `[ID] name (SKU)` format and matching guidance.

### Alternatives Considered

- **Numbered list format (`1. FROTH-PAK 200`)**: Cleaner but loses SKU info which helps with matching. Rejected.
- **JSON catalog format**: More explicit but massively increases token count (~5x). Rejected.
- **Two-step approach (extract items, then match server-side)**: More reliable but doubles latency and loses streaming. Rejected — fix the prompt first; revisit only if this doesn't work.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Change catalog format to `[ID] name (SKU)`

Update `loadIndexedCatalog()` to produce a format where the ID is visually distinct.

**Actions:**

- Change the line format from `${idx}|${p.name}${p.sku ? `|${p.sku}` : ""}` to `[${idx}] ${p.name}${p.sku ? ` (${p.sku})` : ""}`
- This produces lines like: `[42] FROTH-PAK 200 (FP200)` or `[1095] T-Bar 4" x 16'`
- Update all prompt text that references the format: change `(each line is: numeric_id|product_name|sku)` to `(each line is: [id] product_name (sku))`
- Update schema descriptions: change `"The numeric_id from the catalog (the number before the first |)"` to `"The number in brackets [id] from the catalog, as a string"`

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 2: Add few-shot matching examples to BOM streaming prompt

Add 3 examples using real catalog items that demonstrate the expected matching behavior.

**Actions:**

- Add examples between the catalog listing and the rules section in `parseBomImageStream()`
- Example 1 (exact match): `Handwritten: "FROTH-PAK 200" → matchedProductId: "363", matchConfidence: 0.95` (index 363 = FROTH-PAK 200)
- Example 2 (partial match with specs): `Handwritten: "T-Bar" → matchedProductId: "1095", matchConfidence: 0.85, alternativeProductIds: ["1096"]` (T-Bar 4" is most common, 5" is alternative)
- Example 3 (no catalog match): `Handwritten: "custom bracket" → matchedProductId: null, matchConfidence: 0` (truly unique item)
- Format examples as a clear `MATCHING EXAMPLES:` section

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 3: Add confidence calibration guide

Add explicit confidence scoring rubric so the AI doesn't under-rate obvious matches.

**Actions:**

- Add a `CONFIDENCE GUIDE:` section to the BOM streaming prompt:
  - Exact name match → 0.90-0.95
  - Name matches but sizes/specs differ or are missing → 0.75-0.90
  - Related product, plausible match → 0.50-0.75
  - Weak/generic match → 0.30-0.50
- Explicitly state: "A handwritten 'T-Bar' matching 'T-Bar 4\" x 16\'' is a 0.85 match — the size is an extra spec, not a mismatch."

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 4: Apply same changes to text and receiving parsers

Apply the format, few-shot, and confidence changes to `parseTextInput()`, `parseReceivingTextInput()`, and `parseImageInput()`.

**Actions:**

- Update all catalog format references to match Step 1
- Add abbreviated matching examples (can be shorter since these aren't the primary photo-parse path)
- Add the same confidence calibration guide
- Update JSON return schema descriptions to reference `[id]` format

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 5: Update supplier format for consistency

Apply the same `[ID] name` format to `loadIndexedSuppliers()`.

**Actions:**

- Change from `${idx}|${s.name}` to `[${idx}] ${s.name}`
- Update prompt references accordingly

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 6: Build, deploy, and verify with diagnostic logs

**Actions:**

- Run `npm run build` — verify no errors
- Commit and push
- Wait for Vercel deploy
- Ask Gabe to upload the same BOM photo
- Pull Vercel logs to verify: (a) AI returns numeric IDs not SKUs, (b) more items match, (c) confidence scores are higher
- If successful, remove diagnostic logging in a follow-up commit

**Files affected:**
- `src/lib/ai/parse.ts`
- `src/app/api/ai/parse-image-fast/route.ts`

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/api/ai/parse/route.ts` — calls `parseTextInput()` (no changes needed)
- `src/app/api/ai/parse-image/route.ts` — calls `parseImageInput()` (no changes needed)
- `src/app/api/ai/parse-image-fast/route.ts` — calls `parseBomImageStream()` (diagnostic logging changes only)
- `src/components/bom/bom-photo-capture.tsx` — consumes stream output (no changes needed)

### Updates Needed for Consistency

- All 4 parsers must use the same catalog format (`[ID] name (SKU)`)
- Schema descriptions in Zod must match prompt instructions

### Impact on Existing Workflows

- **BOM photo capture (WF2)**: Should see dramatic improvement in match rates
- **Receiving (WF1)**: Same improvement for supplier and product matching
- **Text/voice input**: Same improvement
- **No breaking changes**: `resolveProductId()` already handles numeric strings

---

## Validation Checklist

- [ ] `npm run build` passes
- [ ] `loadIndexedCatalog()` outputs `[ID] name (SKU)` format
- [ ] `loadIndexedSuppliers()` outputs `[ID] name` format
- [ ] BOM streaming prompt has 3 few-shot matching examples
- [ ] BOM streaming prompt has confidence calibration guide
- [ ] All 4 parsers reference the `[id]` bracket format consistently
- [ ] Zod schema descriptions say "number in brackets [id]"
- [ ] Vercel deploy succeeds
- [ ] Diagnostic logs show AI returning numeric IDs (not SKUs or nulls)
- [ ] Test photo upload matches majority of items to catalog

---

## Success Criteria

The implementation is complete when:

1. The test BOM photo (Needham Sudbury / Rowe Farms) matches 10+ of its ~15 items to catalog products (vs. 1/15 before)
2. T-Bar specifically matches to "T-Bar 4" x 16'" with confidence ≥ 0.75
3. No items return SKU strings as matchedProductId — all return numeric index strings or null
4. Build passes and deploys successfully

---

## Notes

- The handwritten BOM has items like "Steel 4" cooler", "QC 2x6A TWS", and "drip pins" that may genuinely have no catalog match. Those returning null is correct behavior. The goal is 10+/15, not 15/15.
- "tech screws" has no exact catalog match — the catalog has various Tek screws (#12 TEK 5, etc.). This is a valid ambiguous match case where confidence should be 0.50-0.70 with alternatives.
- After this fix is verified working, remove the diagnostic `console.log` lines from the streaming route to keep Vercel logs clean.
- If match rates are still below target after this fix, the next approach would be a two-step pipeline: Claude extracts item names → server-side fuzzy match against catalog (bypassing prompt-based matching entirely).

---

## Implementation Notes

**Implemented:** 2026-03-17

### Summary

All 6 steps executed. Changed catalog format to `[id] name (SKU)`, supplier format to `[id] name`. Added 3 few-shot matching examples and confidence calibration guide to the BOM streaming prompt. Applied consistent format references and confidence guide to all 4 parsers. Updated Zod schema descriptions. Build passes, deployed to Vercel.

### Deviations from Plan

None — implemented exactly as planned.

### Issues Encountered

None.
