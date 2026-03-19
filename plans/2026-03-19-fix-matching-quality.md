# Plan: Fix AI Catalog Matching Quality

**Created:** 2026-03-19
**Status:** Implemented
**Request:** Make AI matching trustworthy — wrong matches should never auto-confirm, build test harness to measure accuracy, fix root causes

---

## Overview

### What This Plan Accomplishes

A comprehensive overhaul of the matching pipeline: automated test harness to measure accuracy, prompt rewrite that penalizes wrong dimensions, post-AI verification layer, raised confidence thresholds, capped history boosting, and clear UX feedback for custom items. Target: 90%+ correct matches, with wrong matches flagged for review instead of auto-confirmed.

### Why This Matters

The app is unusable if SMs can't trust the matching. A wrong match at 99% confidence that auto-confirms is worse than no match at all — it creates silent errors in BOMs that propagate to checkout, inventory, and costing. Trust must be earned through accuracy, not inflated confidence.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `engineering-skills` (prompt engineer) | Prompt restructuring: dimension-first matching, stricter confidence calibration, verification layer design |
| `product-skills` (UX researcher) | Trust patterns for AI-assisted workflows: never auto-confirm, require one-tap verification, clear custom item feedback |

### How Skills Shaped the Plan

The prompt engineering input identified that the current prompt actively sabotages matching by saying "ALWAYS try to match" and "missing size details is NOT a low-confidence match." These instructions tell the AI to force-match everything with high confidence. The UX research input confirmed that auto-confirmation at 0.85 destroys trust — users need to verify every match, but the UI should make verification fast (one tap to confirm, not multiple steps).

---

## Current State

### Root Causes Identified

1. **Prompt says "ALWAYS try to match every item"** — Biases AI toward forcing wrong matches instead of returning null
2. **Prompt says "missing size details is NOT a low-confidence match"** — Tells AI to ignore dimension mismatches
3. **Auto-confirm threshold at 0.85** — Too low. AI regularly returns 0.85-0.95 for wrong matches
4. **No post-AI dimension verification** — AI returns dimensions AND a matched product, but nobody checks if they align
5. **History boosting up to 0.999** — If a wrong match was ever confirmed, it self-reinforces forever
6. **Two confidence scores confuse the system** — `confidence` (reading) and `matchConfidence` (match quality) serve different purposes but both affect confirmed state
7. **No feedback for custom items** — User clicks "add as custom" and gets no confirmation

### Relevant Files

| File | Role in Pipeline |
|------|-----------------|
| `src/lib/ai/parse.ts` | SYSTEM_PROMPT, bomItemSchema, parseBomImageStream prompt |
| `src/app/api/ai/parse-image-fast/route.ts` | History boosting (0.95+), NDJSON streaming |
| `src/components/bom/bom-photo-capture.tsx` | Auto-confirm at 0.85, Pass 2 trigger, learning loop |
| `src/components/bom/live-item-feed.tsx` | Flagged display at 0.70, status indicators |
| `src/app/api/ai/refine-matches/route.ts` | Pass 2 refinement |
| `src/app/api/match-history/route.ts` | Learning loop persistence |

---

## Proposed Changes

### Summary of Changes

**Test harness (Step 1):**
- Create a test script that sends text items through the matching API and reports accuracy
- Build a comprehensive test case file with expected matches

**Prompt rewrite (Step 2):**
- Remove "ALWAYS try to match" — replace with "only match if confident"
- Add dimension verification instruction — "if dimensions don't match, return null"
- Restructure confidence guide with stricter thresholds
- Add explicit "no match" examples

**Post-AI verification (Step 3):**
- After AI returns a match, verify dimensions align before accepting
- If AI says item is 10"x10" but matched product is 6", downgrade confidence to 0

**Confidence threshold overhaul (Step 4):**
- Raise auto-confirm from 0.85 to 0.95
- Unify confidence handling — use `matchConfidence` consistently
- Cap history boosting at 0.90 (below auto-confirm) so history-boosted items still get user review

**Custom item UX feedback (Step 5):**
- Toast notification when custom item is added
- Visual indicator in the item list showing it was added as custom

**Run test harness and iterate (Step 6):**
- Run tests against improved pipeline, measure accuracy
- Tune thresholds based on results

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `scripts/test-matching.ts` | Automated matching test harness |
| `scripts/test-cases.json` | Test cases: rawText → expected product name or "NO_MATCH" |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/lib/ai/parse.ts` | Rewrite SYSTEM_PROMPT and BOM prompt; add dimension verification |
| `src/app/api/ai/parse-image-fast/route.ts` | Cap history boosting; add post-AI verification |
| `src/components/bom/bom-photo-capture.tsx` | Raise auto-confirm to 0.95; add custom item toast |
| `src/components/bom/live-item-feed.tsx` | Use matchConfidence consistently; add custom item badge |
| `src/app/api/ai/refine-matches/route.ts` | Stricter refinement rules |

---

## Design Decisions

### Key Decisions Made

1. **Never auto-confirm below 0.95:** The current 0.85 threshold lets too many wrong matches through. At 0.95, only near-exact matches pass. Everything else gets flagged for one-tap review — fast but intentional.

2. **Cap history boosting at 0.90:** History should inform, not override. A previously-confirmed match should still require user review (just be pre-selected as the likely match). This prevents the self-reinforcing error loop where a wrong match gets boosted to 0.999 forever.

3. **Prompt: "prefer no match over wrong match":** Flip the AI's bias. Currently it's told to always match. Instead, tell it to only match when confident, and explicitly return null for items with no good catalog equivalent. A null match is cheap to fix (user picks from catalog); a wrong match is expensive (user might not notice).

4. **Post-AI dimension verification:** Even with better prompts, the AI will sometimes return wrong matches. A simple check — "does the matched product's name contain dimensions that conflict with the parsed dimensions?" — catches obvious errors like 10"x10" matching to 6".

5. **Test harness runs against real catalog:** Not mocked data. The test calls the actual parsing function with text input, using the real product catalog from the database. This catches issues that only show up with the real data.

### Alternatives Considered

- **Stricter prompt only (no verification layer):** Rejected — prompts are probabilistic. The AI will still occasionally return wrong matches. Verification is a deterministic safety net.
- **Remove auto-confirm entirely:** Considered but rejected — would require tapping every item on a 15-item BOM. Too slow. Instead, raise the threshold so auto-confirm only fires on near-exact matches.
- **Weighted scoring (TF-IDF, embedding):** Rejected for now — adds complexity. The current approach (better prompts + dimension check) addresses the root causes. Can revisit if test results show it's needed.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Create matching test harness and test cases

Build an automated script that sends test items through the text parsing pipeline and reports accuracy.

**Actions:**

- Create `scripts/test-cases.json` with 30+ test cases covering:
  - TWS items with dimensions ("TWS OC 2x3", "TWS IC 3x3", "TWS Cover Plate 10x10")
  - Panel items ("4\" IMP 7'-6\"", "4\" ceiling panels 8'")
  - Common materials ("Froth Pak", "butyl caulk", "silicone sealant white")
  - Abbreviations ("OC 2x3", "IC 2x2", "FRP 4x8")
  - Items NOT in catalog ("custom welded bracket", "TWS Cover Plate 10x10 hem 3x sides")
  - Edge cases ("T-Bar", "shots and pins", "PVC corner")
  - Each case: `{ rawText, expectedProduct (name or "NO_MATCH"), notes }`

- Create `scripts/test-matching.ts`:
  - Loads the real product catalog from DB
  - For each test case, calls `parseTextInput(rawText)` from parse.ts
  - Compares matched product name to expectedProduct
  - Reports: PASS (correct match), FAIL (wrong match), MISS (should have matched but didn't), FALSE_POSITIVE (matched but should be NO_MATCH)
  - Outputs summary table with pass rate

**Files affected:**
- `scripts/test-cases.json` (new)
- `scripts/test-matching.ts` (new)

---

### Step 2: Rewrite matching prompts

Fix the root cause — the AI is told to force-match everything with high confidence.

**Actions:**

- In `src/lib/ai/parse.ts`, rewrite the BOM-specific prompt (in `parseBomImageStream`):
  - Remove: "ALWAYS try to match every item. The user can easily correct a wrong match, but missing matches create extra work."
  - Replace with: "Only match an item to a catalog product if you are confident it is the same product. A WRONG match is much worse than no match — the user can easily add missing items, but wrong matches cause silent inventory errors."
  - Remove: "A handwritten item missing size details is NOT a low-confidence match — warehouse workers rarely write full specs."
  - Replace with: "If the BOM specifies dimensions (e.g., 10"x10") and the best catalog match has DIFFERENT dimensions (e.g., 6"), do NOT match it. Return matchedProductId: null. Dimension mismatches are product mismatches."
  - Update confidence guide:
    ```
    CONFIDENCE CALIBRATION (be strict — wrong matches at high confidence destroy trust):
    - 0.95-1.0: Product name AND dimensions match exactly (e.g., "OC 2x3" → "TWS Outside Corner 2" x 3"")
    - 0.85-0.95: Product name matches, dimensions absent or compatible (e.g., "Froth Pak" → "FROTH-PAK 200")
    - 0.70-0.85: Likely the same product but some ambiguity (e.g., "T-Bar" when multiple sizes exist)
    - 0.50-0.70: Plausible but uncertain — flag for review
    - Below 0.50 or dimensions conflict: set matchedProductId to null
    ```
  - Add explicit NO_MATCH examples:
    ```
    4. Handwritten says "TWS Cover Plate 10x10 hem 3 sides" →
       matchedProductId: null, matchConfidence: 0, alternativeProductIds: []
       (No catalog product matches these dimensions — this is a custom fabrication item)
    ```

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 3: Add post-AI dimension verification

A deterministic check that catches dimension mismatches the AI missed.

**Actions:**

- In `src/app/api/ai/parse-image-fast/route.ts`, after `toBomCatalogMatch()` and before history boosting:
  - Extract dimensions from the AI's parsed text (rawText + name) using a simple regex
  - Extract dimensions from the matched product's name
  - If both have dimensions and they conflict → set `matchConfidence: 0`, `matchedProduct: null`
  - Example: rawText mentions "10x10", matched product is "6\" w/ Hem" → dimensions conflict → null match

- Create a helper function `verifyDimensionMatch(parsedText: string, productName: string): boolean`:
  - Extract all NxN or N"xN" dimension patterns from both strings
  - If parsed text has dimensions that don't appear in the product name → return false
  - If product name has specific dimensions that don't match parsed text → return false
  - If neither has dimensions → return true (no conflict)

**Files affected:**
- `src/app/api/ai/parse-image-fast/route.ts`

---

### Step 4: Fix confidence thresholds and history boosting

Raise auto-confirm, cap boosting, unify confidence handling.

**Actions:**

- In `src/components/bom/bom-photo-capture.tsx`:
  - Change auto-confirm from `matchConfidence >= 0.85` to `matchConfidence >= 0.95`
  - This means only near-exact matches auto-confirm
  - Everything 0.70-0.95 shows as "needs review" but with the match pre-selected

- In `src/app/api/ai/parse-image-fast/route.ts`:
  - Cap history boosting at 0.90 instead of 0.95+:
    ```typescript
    matchConfidence: Math.max(catalogMatch.matchConfidence, 0.90)
    ```
  - This means history-boosted items still get flagged for review (below 0.95 threshold) but are pre-selected as likely correct

- In `src/components/bom/live-item-feed.tsx`:
  - Use `matchConfidence` (from the item's `confidence` field) consistently for all thresholds
  - Change flagged threshold: items NOT confirmed (regardless of confidence value) show as needing review
  - Items auto-confirmed (0.95+) show green checkmark
  - Items 0.70-0.95 show blue "likely match — tap to confirm" indicator
  - Items below 0.70 show orange "needs review"

- In `src/components/bom/bom-photo-capture.tsx` Pass 2 handler:
  - Don't auto-set `confirmed: true` on refined items — let the threshold handle it

**Files affected:**
- `src/components/bom/bom-photo-capture.tsx`
- `src/app/api/ai/parse-image-fast/route.ts`
- `src/components/bom/live-item-feed.tsx`

---

### Step 5: Custom item UX feedback

Give users clear confirmation when they add a custom item.

**Actions:**

- In `src/components/bom/bom-photo-capture.tsx`:
  - In `keepAsCustom()`: add `toast.success(`Added "${item.productName}" as custom item`)`
  - In `resolveItem()`: add `toast.success(`Matched to ${productName}`)`

- In `src/components/bom/live-item-feed.tsx`:
  - For items with `isNonCatalog === true`: show a small "Custom" badge below the product name (blue pill)
  - This makes custom items visually distinct from catalog matches

**Files affected:**
- `src/components/bom/bom-photo-capture.tsx`
- `src/components/bom/live-item-feed.tsx`

---

### Step 6: Run test harness, measure, iterate

Use the test harness to validate improvements.

**Actions:**

- Run `scripts/test-matching.ts` against current (pre-fix) code to establish baseline accuracy
- Apply prompt + verification + threshold changes
- Run test harness again to measure improvement
- Tune thresholds if needed based on results
- Target: 90%+ correct matches, 0% false positives above 0.95 confidence
- Document results in plan

**Files affected:**
- `scripts/test-matching.ts` (run only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/api/boms/route.ts` — reads matchConfidence from items; no changes needed
- `src/app/api/ai/refine-matches/route.ts` — Pass 2 refinement; may need confidence guide update to match new prompt
- `src/components/bom/flagged-item-resolver.tsx` — renders for flagged items; no changes needed

### Impact on Existing Workflows

- **More items will need review:** Raising the threshold from 0.85 to 0.95 means ~20-40% of items that previously auto-confirmed will now need one-tap review. This is intentional — those items were often wrong.
- **History boosting no longer auto-confirms:** Previously-matched items will still show as the pre-selected match but require a tap to confirm. This breaks the self-reinforcing error loop.
- **Fewer wrong matches:** Items with dimension conflicts will be flagged as "no match" instead of confidently wrong. Users add the correct item instead of unknowingly accepting the wrong one.

---

## Validation Checklist

- [ ] Test harness runs against real catalog and reports accuracy
- [ ] Prompt rewritten with stricter matching rules and NO_MATCH examples
- [ ] Post-AI dimension verification catches obvious mismatches
- [ ] Auto-confirm threshold raised to 0.95
- [ ] History boosting capped at 0.90
- [ ] Custom items show toast + "Custom" badge
- [ ] Test harness shows 90%+ accuracy after changes
- [ ] No false positives above 0.95 confidence in test suite
- [ ] Build passes

---

## Success Criteria

The implementation is complete when:

1. The test harness exists and runs reproducibly against the real catalog
2. "TWS Cover Plate 10x10 hem 3 sides" returns NO_MATCH (not TWS Flat Batten at 99%)
3. Items with dimension mismatches are never auto-confirmed
4. Custom item additions show clear visual feedback
5. Overall test suite accuracy is 90%+ with 0% false positives above 0.95

---

## Notes

- The test harness is the most valuable deliverable — it turns matching quality from a subjective complaint into a measurable metric that can be tracked over time.
- History boosting at 0.90 is a deliberate design choice. It means "we think this is right based on past behavior, but please confirm." This balances speed (pre-selected match) with trust (requires a tap).
- The 0.95 auto-confirm threshold may need adjustment after testing. If too many correct matches land at 0.93-0.94, we might lower to 0.93. The test harness will tell us.
- Future enhancement: allow "batch confirm" — tap once to confirm all items above 0.85 confidence. This restores the speed of auto-confirm but makes it explicit.
