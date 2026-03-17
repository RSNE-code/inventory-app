# Plan: AI-First BOM Creation — Photo Capture with Two-Pass Matching & Learning Loop

**Created:** 2026-03-16
**Status:** Implemented
**Request:** Redesign BOM creation so photo capture is the primary input, with two-pass AI matching, a learning loop, and Gabe's review queue for the training period.

---

## Overview

### What This Plan Accomplishes

Transforms BOM creation from a manual product-picking exercise into a "snap and go" workflow. The SM photographs a material list, watches items appear in real time as the AI matches them, handles 0-2 flagged items, and taps Create. A learning loop ensures accuracy improves with every BOM, targeting 97%+ after ~50 BOMs. Gabe reviews matches during the training period to feed the learning loop.

### Why This Matters

The current POS quick-pick works but still requires the SM to know the catalog and tap items one by one. For a 20-item takeoff sheet, that's 2-3 minutes of data entry. Photo capture reduces this to 20 seconds + a few taps. For a company creating 25+ BOMs/day, that's ~1 hour of labor saved daily ($35/hr = $175/day, $3,850/month ROI vs. $46/month API cost).

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Camera as hero UI element, live item feed animation choreography, industrial aesthetic |
| `engineering-skills` (backend) | Two-pass API design, streaming architecture, match history query patterns |
| `engineering-skills` (prompt engineer) | Error taxonomy with residual rates per error type, mitigation techniques |
| `engineering-advanced-skills` (database) | MatchHistory schema with indexing strategy, confidence storage on BomLineItem |
| `product-skills` (UX researcher) | Layered error recovery, SM reviews only flagged items, live feed reduces perceived wait |
| `product-skills` (product manager) | Scoring matrix: Full Power mode scores 8.15/10 vs Hybrid 6.45 and Manual 6.55 |
| `finance-skills` | $0.083/BOM cost, 21x ROI at 25 BOMs/day, break-even at 1.4 BOMs/day |

### How Skills Shaped the Plan

The UX research identified that the SM should NOT review every match — only flagged items. The prompt engineer's error taxonomy showed that with dimension parsing + match history, residual error rate drops to 2-3% after 50 BOMs. The database designer recommended a dedicated MatchHistory table (not inline on BomLineItem) with normalized text indexing for fast lookup. Frontend design specified the live item feed as the wait-state pattern, with items "upgrading" from tentative to confirmed.

---

## Current State

### Relevant Existing Structure

| File | What Exists |
|------|-------------|
| `src/lib/ai/parse.ts` | Haiku (text) + Sonnet (vision) parsing. Catalog context loading. Panel detection. |
| `src/lib/ai/catalog-match.ts` | Token-based fuzzy matching with abbreviation expansion |
| `src/lib/ai/types.ts` | ParsedLineItem, CatalogMatch, ParseResult types with confidence scoring |
| `src/components/ai/ai-input.tsx` | Camera capture with compression (800KB, 1200px), voice, text input |
| `src/app/api/ai/parse-image/route.ts` | Image parsing endpoint (single-pass, returns matched items) |
| `src/components/bom/bom-quick-pick.tsx` | POS register UI (will become manual fallback) |
| `src/app/api/products/browse/route.ts` | Unified product browsing (favorites + search + category) |
| `src/app/boms/[id]/page.tsx` | BOM detail with sticky action bar, panel checkout |

### Gaps Being Addressed

1. No two-pass matching — single pass gives 70-85% accuracy, no refinement
2. No match history — system doesn't learn from corrections
3. No review queue — no way for Gabe to review/train the system
4. Photo is buried as a secondary option, not the hero action
5. No streaming/progressive rendering — user waits for full response
6. Panel items carry brand info on BOM — should be generic until checkout
7. No swipe-to-delete on item rows
8. Confidence scores not stored on BOM line items

---

## Proposed Changes

### Summary of Changes

- New photo-first BOM creation screen (camera as hero, manual as fallback link)
- Two-pass matching pipeline (Pass 1 fast + Pass 2 refinement)
- Live item feed animation (receipt-printer style, items appear one by one)
- Match history table + learning loop
- Confidence + raw text stored on BomLineItem
- Gabe's review queue page
- Generic panel handling (no brand on BOM, "Brand TBD" display)
- Swipe-to-delete on all item rows
- Auto-approve toggle for post-training period

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/bom/bom-photo-capture.tsx` | New hero BOM creation component (camera primary, manual fallback) |
| `src/components/bom/live-item-feed.tsx` | Receipt-printer animation component for items appearing during parsing |
| `src/components/bom/swipeable-row.tsx` | Swipe-to-delete wrapper for item rows |
| `src/components/bom/flagged-item-resolver.tsx` | UI for SM to pick from alternatives on low-confidence items |
| `src/app/api/ai/parse-image-fast/route.ts` | Pass 1: Haiku vision → fast text extraction + fuzzy match |
| `src/app/api/ai/refine-matches/route.ts` | Pass 2: Sonnet with full catalog + match history context |
| `src/app/api/match-history/route.ts` | CRUD for match history (bulk confirm, lookup) |
| `src/app/boms/review/page.tsx` | Gabe's review queue page |
| `src/app/api/boms/review/route.ts` | Review queue API (list pending, confirm/fix items) |
| `src/app/api/boms/[id]/review/route.ts` | Per-BOM review API (confirm/fix individual line items) |
| `src/hooks/use-match-history.ts` | React Query hooks for match history |
| `prisma/seed-match-history.ts` | Optional: seed common abbreviations as pre-confirmed matches |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `prisma/schema.prisma` | Add MatchHistory model, add confidence/rawText fields to BomLineItem, add PENDING_REVIEW to BomStatus |
| `src/app/boms/page.tsx` | Replace BomQuickPick with BomPhotoCapture in "Create BOM" tab |
| `src/app/boms/new/page.tsx` | Update to use BomPhotoCapture |
| `src/components/bom/bom-line-item-row.tsx` | Add swipe-to-delete, show confidence indicator, raw text reference |
| `src/app/api/boms/route.ts` | Store confidence + rawText on line items at creation |
| `src/components/layout/bottom-nav.tsx` | Add review queue badge (count of pending BOMs) for Gabe |

---

## Design Decisions

### Key Decisions Made

1. **Camera is the HERO, not a feature.** The BOM creation screen is dominated by a large camera capture area. Manual entry is a small "or enter manually →" link below it. This is an intentional hierarchy shift — the app teaches users that photo is the primary workflow.

2. **Two separate API endpoints for Pass 1 and Pass 2** (not streaming). Pass 1 returns quickly (~3s), the frontend renders items immediately. Pass 2 is called as a separate request and updates items in place. This avoids streaming complexity while still giving progressive feedback.

3. **MatchHistory is a separate table, not inline on BomLineItem.** Match history needs fast text lookup across all BOMs, per-user aggregation, and usage counting. Storing this on BomLineItem would require cross-BOM queries every time. A dedicated table with normalized text indexing is cleaner.

4. **Confidence stored on BomLineItem, not computed.** Each line item gets a `matchConfidence` score (0-1) and `rawText` (original text from the photo). This enables the review queue to show exactly what was parsed and how confident the match was, without re-computing.

5. **Panels are always generic on the BOM.** When the AI detects a panel item, it creates a non-catalog line item with `{type: "panel", thickness, cutLengthFt}` — no brand. The panel checkout flow (already built) handles brand selection. The BOM line item shows "Insulated Metal Panel 4" × 10' (Brand TBD)".

6. **PENDING_REVIEW status instead of DRAFT for photo-created BOMs.** Photo-created BOMs go to `PENDING_REVIEW` status (visible in Gabe's review queue). After Gabe approves, they transition to `APPROVED`. Manual BOMs still go to `DRAFT` (normal flow). This lets Gabe distinguish which BOMs need his attention.

7. **Swipe-to-delete uses CSS touch events, not a library.** Keep dependencies minimal. A simple `touchstart/touchmove/touchend` handler with CSS transform achieves the swipe-left-to-delete pattern.

### Alternatives Considered

- **Streaming responses for live feed:** Rejected — adds SSE/WebSocket complexity. Simulated progressive rendering (items appearing with staggered animation) from a single batch response achieves the same perceived effect with simpler code.
- **Embedding-based matching:** Rejected — at 500 products, the full catalog fits in a single LLM prompt (~15K tokens). Embeddings add infrastructure (vector DB) without meaningful accuracy improvement at this catalog size.
- **OM as quality gate:** Rejected by Gabe — the OM doesn't play a role in BOM accuracy. Gabe reviews during training period, then system auto-approves once confident.

### Open Questions

None — all decisions confirmed by Gabe in conversation.

---

## Step-by-Step Tasks

### Step 1: Schema Changes — MatchHistory + BomLineItem Updates

Add the MatchHistory model and update BomLineItem with confidence/rawText fields.

**Actions:**
- Add `MatchHistory` model to `prisma/schema.prisma`
- Add `PENDING_REVIEW` to `BomStatus` enum
- Add `matchConfidence`, `rawText`, and `rawImageUrl` fields to `BomLineItem`
- Add unique compound index on MatchHistory `(normalizedText, userId)`
- Push schema to database

**Schema additions:**

```prisma
model MatchHistory {
  id              String   @id @default(uuid())
  rawText         String   // Original text from photo/voice ("OC 2x3")
  normalizedText  String   // Lowercase, trimmed, collapsed spaces
  product         Product  @relation(fields: [productId], references: [id])
  productId       String
  user            User     @relation(fields: [userId], references: [id])
  userId          String
  confirmed       Boolean  @default(false)  // User confirmed this match
  usageCount      Int      @default(1)      // Times this match was used
  lastUsedAt      DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([normalizedText, userId])
  @@index([userId, normalizedText])
  @@index([productId])
}
```

BomLineItem additions:
```prisma
model BomLineItem {
  // ... existing fields ...
  matchConfidence  Float?    // 0-1 AI confidence score
  rawText          String?   // Original text from photo/voice parse
}
```

BomStatus addition:
```prisma
enum BomStatus {
  DRAFT
  PENDING_REVIEW  // Photo-created, awaiting Gabe's review
  APPROVED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

Product + User relation additions for MatchHistory.

**Files affected:**
- `prisma/schema.prisma`

---

### Step 2: Pass 1 API — Fast Image Parse

Create the fast-parse endpoint that uses Haiku for text extraction and quick fuzzy matching.

**Actions:**
- Create `src/app/api/ai/parse-image-fast/route.ts`
- Accept FormData with image(s)
- Step 1: Use Sonnet vision to extract raw text + quantities from the image (this needs vision capabilities — Haiku 4.5 also supports vision but Sonnet is more accurate for handwriting)
- Step 2: For each extracted item, check MatchHistory for instant matches first
- Step 3: Fuzzy match remaining items against catalog using existing `catalogMatch` logic
- Step 4: Detect panels → generic specs (thickness + cut length, NO brand)
- Return: `{items: [{rawText, name, quantity, unitOfMeasure, matchedProductId, matchConfidence, isPanel, panelSpecs, alternatives[]}]}`

**Key behavior:**
- Items matched from MatchHistory get confidence 0.99 (trusted)
- Items fuzzy-matched get their actual confidence score
- Panel items always return as non-catalog with `{type: "panel", thickness, cutLengthFt}`, no brand fields
- Response is NOT streamed — returns full batch for simplicity

**Files affected:**
- `src/app/api/ai/parse-image-fast/route.ts` (new)

---

### Step 3: Pass 2 API — Background Refinement

Create the refinement endpoint that uses Sonnet with full context for higher accuracy.

**Actions:**
- Create `src/app/api/ai/refine-matches/route.ts`
- Accept: `{items: [{rawText, matchedProductId, confidence}], userId}`
- Load full catalog context + user's top 50 match history entries as few-shot examples
- Send to Sonnet: "Given these raw texts and initial matches, verify or improve each match"
- For items with confidence < 0.85: provide top 3 alternatives
- Return refined matches with updated confidence scores

**Key behavior:**
- Only re-evaluates items with confidence < 0.95 (don't waste tokens on already-confident matches)
- Includes match history as few-shot: "This user previously confirmed 'OC 2x3' = TWS Outside Corner 2"x3" (confirmed 12 times)"
- Dimension-aware: extracts and compares dimensions explicitly (2"x3" vs 2"x2")
- Panel items: verify thickness and cut length, don't attempt brand matching

**Files affected:**
- `src/app/api/ai/refine-matches/route.ts` (new)

---

### Step 4: Match History API

CRUD endpoints for the learning loop.

**Actions:**
- Create `src/app/api/match-history/route.ts`
- `GET /api/match-history?text=OC+2x3` — lookup match for normalized text
- `POST /api/match-history` — bulk confirm matches: `{matches: [{rawText, productId}]}`
- On confirm: upsert MatchHistory (increment usageCount if exists, create if new)
- Normalize text: lowercase, trim, collapse whitespace, remove quotes

**Files affected:**
- `src/app/api/match-history/route.ts` (new)
- `src/hooks/use-match-history.ts` (new)

---

### Step 5: Photo Capture Hero Component

The main BOM creation UI with camera as the dominant action.

**Actions:**
- Create `src/components/bom/bom-photo-capture.tsx`
- Layout (top to bottom):
  1. **Job picker** (compact, 1 line when selected)
  2. **Camera capture area** — large (at least 200px tall), navy background, big orange camera icon in center, text: "Snap your material list". This is THE action. Full-width, impossible to miss.
  3. **"or enter manually →"** — small text link below camera area, navigates to POS quick-pick
  4. **After photo taken:** transitions to live item feed view (Step 6)
  5. **Cart bar at bottom** (above nav) with item count + Create BOM button

**Camera interaction:**
- Tap camera area → opens native camera (via hidden file input, `capture="environment"`)
- Support multiple photos ("Add another page" button after first photo)
- Photo thumbnail shows in top-left corner as reference during processing

**State management:**
- `phase: "capture" | "processing" | "review"` — three distinct UI states
- `capture`: show camera hero
- `processing`: show live item feed with items appearing
- `review`: all items loaded, SM can edit/delete, flagged items highlighted

**Files affected:**
- `src/components/bom/bom-photo-capture.tsx` (new)
- `src/app/boms/page.tsx` (update: use BomPhotoCapture instead of BomQuickPick)
- `src/app/boms/new/page.tsx` (update: use BomPhotoCapture)

---

### Step 6: Live Item Feed Animation

Receipt-printer style animation for items appearing during processing.

**Actions:**
- Create `src/components/bom/live-item-feed.tsx`
- Receives items array and renders them with staggered animation
- Each item row:
  - Slides in from below with fade (200ms ease-out, staggered 250ms apart)
  - Orange left-border flash on arrival
  - **Tentative state:** dotted bottom border, no checkmark
  - **Confirmed state (after Pass 2):** solid border, green check fades in, subtle green background flash
  - **Flagged state:** orange dot, "Tap to review" text below product name
- Items show: product name, quantity (editable), unit of measure, confidence indicator
- Swipe-left to delete (or X button)

**Animation timing:**
- T+0s: Photo captured, "Reading your list..." text with pulse
- T+1-3s: Pass 1 returns. Items start appearing one by one (250ms stagger)
- T+3s: All items visible in tentative state. Header: "Matching to catalog..."
- T+3-15s: Pass 2 called. As results return, items upgrade top-to-bottom (500ms apart)
- T+15s: Done. Header: "X items matched". Flagged items (if any) highlighted at top.

**Files affected:**
- `src/components/bom/live-item-feed.tsx` (new)

---

### Step 7: Flagged Item Resolver

UI for SM to handle low-confidence items.

**Actions:**
- Create `src/components/bom/flagged-item-resolver.tsx`
- When SM taps a flagged item (orange dot), expands inline to show:
  - The raw text from the photo: "You wrote: 'OC 2x3'"
  - Top 3 alternative product matches as big tappable buttons (h-14, full width)
  - "None of these — add as custom item" option
- Selecting a match: replaces the item, marks as confirmed (feeds learning loop)
- Selecting custom: keeps raw text as non-catalog item

**Files affected:**
- `src/components/bom/flagged-item-resolver.tsx` (new)

---

### Step 8: Swipeable Row Component

Swipe-to-delete wrapper for all item rows.

**Actions:**
- Create `src/components/bom/swipeable-row.tsx`
- Uses touch events (touchstart, touchmove, touchend) — no library
- Swipe left > 80px: reveals red delete background, releases to delete
- Visual: row slides left, red background with trash icon revealed underneath
- Also has an X button visible on the row (for non-touch or quick taps)
- Apply to: live item feed rows, cart expanded rows, BOM detail line items

**Files affected:**
- `src/components/bom/swipeable-row.tsx` (new)
- `src/components/bom/bom-line-item-row.tsx` (wrap with SwipeableRow)

---

### Step 9: Review Queue Page + API

Gabe's review queue for training the learning loop.

**Actions:**
- Create `src/app/boms/review/page.tsx` — list of BOMs with status PENDING_REVIEW
- Create `src/app/api/boms/review/route.ts` — GET: list pending BOMs with line items, confidence, rawText
- Create `src/app/api/boms/[id]/review/route.ts` — PUT: confirm/fix individual line items
  - Confirm: marks matchConfidence → 1.0, upserts MatchHistory with confirmed=true
  - Fix: swaps productId, updates matchConfidence → 1.0, upserts MatchHistory
  - Approve: transitions BOM from PENDING_REVIEW → APPROVED

**Review page UI:**
- List of pending BOMs, newest first
- Tap BOM → see line items with:
  - Product name (matched) + raw text (from photo) side by side
  - Confidence score as a colored bar (green > 0.9, yellow 0.7-0.9, red < 0.7)
  - ✓ button to confirm match
  - ✕ button to fix → opens product picker to select correct product
- "Approve All & Approve BOM" button at bottom — confirms all unreviewed items and approves

**Badge in nav:**
- Bottom nav shows a badge on the BOMs icon with count of PENDING_REVIEW BOMs (only for Gabe/Admin)

**Files affected:**
- `src/app/boms/review/page.tsx` (new)
- `src/app/api/boms/review/route.ts` (new)
- `src/app/api/boms/[id]/review/route.ts` (new)
- `src/components/layout/bottom-nav.tsx` (add review badge)

---

### Step 10: Update BOM Creation API

Store confidence scores and raw text when creating BOMs from photo matches.

**Actions:**
- Update `src/app/api/boms/route.ts`:
  - Accept `matchConfidence` and `rawText` per line item in the schema
  - Accept `source: "photo" | "manual"` field
  - If source = "photo": create BOM with status `PENDING_REVIEW`
  - If source = "manual": create BOM with status `DRAFT` (existing behavior)
  - Store confidence and rawText on each BomLineItem

**Files affected:**
- `src/app/api/boms/route.ts`

---

### Step 11: Generic Panel Display

Update panel line items to show "Brand TBD" on BOMs.

**Actions:**
- Update `src/components/bom/bom-line-item-row.tsx`:
  - When `nonCatalogSpecs.type === "panel"`: display as "Insulated Metal Panel {thickness}" × {cutLength}' — Brand TBD"
  - Show a subtle badge: "Brand selected at checkout"
  - Do NOT show brand fields in the panel specs display
- Update AI parse to strip brand from panel specs when creating BOM line items (keep thickness + cut length only)

**Files affected:**
- `src/components/bom/bom-line-item-row.tsx`
- `src/lib/ai/parse.ts` (panel detection: strip brand, keep dimensions)

---

### Step 12: Wire Up BOM Creation Flow

Connect the photo capture → Pass 1 → Pass 2 → Create BOM flow.

**Actions:**
- In `bom-photo-capture.tsx`:
  1. Photo captured → call Pass 1 API → render items via LiveItemFeed
  2. Simultaneously call Pass 2 API → update items in place as results return
  3. SM handles flagged items (if any) via FlaggedItemResolver
  4. SM taps "Create BOM" → POST /api/boms with all items + confidence + rawText + source="photo"
  5. BOM created with PENDING_REVIEW status
  6. Toast: "BOM created — pending review"
  7. Navigate to BOM detail page

**Files affected:**
- `src/components/bom/bom-photo-capture.tsx`

---

### Step 13: Auto-Approve Setting

Add a setting for Gabe to disable mandatory review when confidence is consistently high.

**Actions:**
- Add to Settings page: "Auto-approve photo BOMs when all items have 95%+ confidence"
- Toggle stored in a `settings` table or as an environment variable
- When enabled: photo BOMs with all items ≥ 0.95 confidence go directly to APPROVED (skip PENDING_REVIEW)
- When disabled (default): all photo BOMs go to PENDING_REVIEW

**Files affected:**
- `src/app/settings/page.tsx`
- `src/app/api/boms/route.ts` (check setting when determining initial status)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/boms/page.tsx` — BOM list page with Create tab
- `src/app/boms/new/page.tsx` — New BOM page
- `src/app/boms/[id]/page.tsx` — BOM detail (existing, handles PENDING_REVIEW status display)
- `src/hooks/use-boms.ts` — BOM hooks (add review queue hooks)
- `src/components/layout/bottom-nav.tsx` — Navigation (add review badge)

### Updates Needed for Consistency

- BOM status badge component needs to handle PENDING_REVIEW (amber/orange color)
- BOM list page filter pills need PENDING_REVIEW option
- BOM detail page action buttons need to handle PENDING_REVIEW → APPROVED transition

### Impact on Existing Workflows

- Manual BOM creation (POS quick-pick) continues to work unchanged — still accessible via "or enter manually" link
- Existing BOM approval flow unchanged for manual BOMs (DRAFT → APPROVED)
- Panel checkout flow unchanged — already handles brand selection, this just ensures panels arrive without a brand
- Fabrication tracking unchanged — trim auto-deduction still works on checkout

---

## Validation Checklist

- [ ] Schema pushed: MatchHistory table exists, BomLineItem has matchConfidence + rawText, PENDING_REVIEW status works
- [ ] Pass 1: Photo → items returned in < 5 seconds with confidence scores
- [ ] Pass 2: Refinement updates items with higher confidence in < 15 seconds
- [ ] Live item feed: items appear one by one with staggered animation
- [ ] Flagged items: orange dot visible, tap opens alternatives, selection updates item
- [ ] Swipe-to-delete: works on all item rows
- [ ] Panel items: show as generic (thickness + cut length), no brand, "Brand TBD" badge
- [ ] BOM creation: photo BOMs created with PENDING_REVIEW status
- [ ] Review queue: Gabe can see pending BOMs, confirm/fix items, approve
- [ ] Learning loop: confirmed matches appear in MatchHistory, improve future Pass 1 speed
- [ ] Manual fallback: "or enter manually" link opens POS quick-pick, works normally
- [ ] All buttons: minimum 48px height, high contrast
- [ ] Build passes clean
- [ ] Deployed to Vercel

---

## Success Criteria

1. SM can create a BOM from a photo in under 25 seconds (including flagged item resolution)
2. Camera is the visually dominant action on the BOM creation screen — no ambiguity about what to do
3. Items appear progressively during processing (live feed), not as a batch after a wait
4. Gabe can review and approve photo BOMs with per-item confirm/fix
5. Match accuracy improves measurably over 50 BOMs (tracked via MatchHistory usage counts)
6. Panel items on BOMs are brand-agnostic; brand selected only at checkout by Foreman
7. Swipe-left or X to delete any item, globally consistent

---

## Notes

- The learning loop is the long-term differentiator. After 50 BOMs, the system should match most items instantly from history without any LLM call, making Pass 1 nearly free (both in latency and tokens).
- Consider seeding MatchHistory with known RSNE abbreviations (IMP, OC, IC, TWS, tek, etc.) to bootstrap the learning loop before the first real BOM.
- Multi-photo support ("Add another page") is important for long material lists — implement in Step 5 as part of the camera capture flow.
- The auto-approve toggle (Step 13) is the graduation mechanism. When Gabe is confident the system matches accurately, he flips the switch and photo BOMs skip review entirely.
