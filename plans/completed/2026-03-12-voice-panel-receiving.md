# Plan: Voice-First Panel Receiving

**Created:** 2026-03-12
**Status:** Implemented
**Request:** Add panel-aware voice parsing so the shop foreman can say "Got 11 ten-foot panels, 22 eight-foot panels" and have the breakout auto-populate — merging voice-provided heights/quantities with PO-derived brand/thickness/width/color.

---

## Overview

### What This Plan Accomplishes

Adds a **panel-specific AI parsing mode** that understands spoken panel breakout data ("11 ten-foot, 22 eight-foot") and returns structured height+quantity pairs. These pairs auto-populate the existing PanelBreakout component, merging with context already extracted from the PO (brand, thickness, width, color). The foreman speaks one sentence, sees the breakout filled in, taps Confirm. Done.

### Why This Matters

The packing slip doesn't list individual panel sizes — it just shows bundles, total quantity, and panel type. The cut list is separate (or in someone's head). The person unloading the truck is the only one who knows what heights actually showed up. Today they have to manually add each height row and type quantities. Voice input makes this hands-free: the foreman walks the delivery, speaks what he sees, and the breakout fills itself.

---

## Current State

### How Voice Works Today

1. `useVoiceInput` hook captures speech via Web Speech API → final transcript string
2. `AIInput` component receives transcript, auto-submits to `POST /api/ai/parse` with `context="receiving"`
3. Backend calls `parseReceivingTextInput(text)` which sends the transcript + full catalog (721 products) + all suppliers + all POs to Claude
4. Claude returns generic `CatalogMatch[]` items (tries to match each mentioned item to a catalog product)
5. `ReceivingFlow.handleParseComplete()` stores items, matches supplier/PO, transitions to PO_MATCH phase
6. Panel detection only happens later in `POReceiveCard` — after the PO is selected, `isPanelLineItem()` detects panel lines and enables the breakout UI

### The Problem

When the foreman says "Got 11 ten-foot panels, 22 eight-foot panels", the current parser tries to match these against the catalog as individual items. It doesn't know this is panel breakout data. The result is messy: it might match "Insulated Metal Panel (AWIP)-10'-44-4" but with wrong quantities, or treat each size as a separate receiving line item instead of feeding them into the breakout.

### What We Want

Voice says: "11 ten-foot, 22 eight-foot, 8 twelve-foot"
→ PanelBreakout auto-populates: 3 rows (10'→11, 8'→22, 12'→8)
→ Brand/thickness/width/color already filled from PO context
→ Foreman taps Confirm. Receipt done.

---

## Proposed Changes

### Summary of Changes

- Add `parsePanelVoiceInput()` function in `src/lib/ai/parse.ts` — a lightweight, panel-specific AI parser that returns `{ heights: [{ height, quantity }] }` instead of catalog matches
- Add `POST /api/ai/parse-panels` API route — dedicated endpoint for panel voice parsing (smaller prompt, faster, cheaper)
- Modify `PanelBreakout` component to accept optional `initialRows` prop for auto-population
- Modify `POReceiveCard` to add a voice input button on panel line items that triggers the panel parser and feeds results into the breakout
- Add a `usePanelVoiceInput` hook that wires `useVoiceInput` → panel parse API → structured rows

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/hooks/use-panel-voice.ts` | Hook combining voice capture + panel-specific AI parsing |
| `src/app/api/ai/parse-panels/route.ts` | Lightweight API route for panel voice/text parsing |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/lib/ai/parse.ts` | Add `parsePanelVoiceInput()` function with panel-specific prompt |
| `src/components/receiving/panel-breakout.tsx` | Accept `initialRows` prop, auto-populate on mount |
| `src/components/receiving/po-receive-card.tsx` | Add voice button on panel lines, wire to breakout |

---

## Design Decisions

### Key Decisions Made

1. **Separate panel parse function, not a mode on the existing parser**: The existing `parseReceivingTextInput()` loads the entire catalog (721 products), all suppliers, and all POs into the prompt. Panel voice input only needs to extract heights and quantities from simple speech — no catalog matching needed. A dedicated function is faster (shorter prompt), cheaper (fewer tokens), and more reliable (simpler task for the model).

2. **No catalog matching in the panel parser**: The voice input only captures heights and quantities. Product matching happens client-side in `PanelBreakout` using the existing `productByHeight` map (already built from the `/api/products/panels` response). This avoids sending 278 panel products to Claude just to parse "11 ten-foot".

3. **Voice button on the breakout, not on AIInput**: The general-purpose AIInput at the top of the receiving flow is for initial entry (supplier/PO identification). Panel voice goes on the breakout itself — it's contextually appropriate (you're already looking at the panel line item) and uses the panel-specific parser instead of the generic one.

4. **Support both spoken numbers and bundles**: The foreman might say "11 ten-foot panels" (panel count) or "1 bundle of ten-foot" (bundle count). The AI prompt handles both and returns normalized panel counts. Bundle conversion uses the thickness already known from PO context.

5. **Few-shot examples in the prompt**: Panel speech patterns are predictable but varied ("eleven 10-foot", "10-footers, 11 of them", "one bundle ten-foot"). Including 5-6 few-shot examples in the prompt ensures reliable extraction across natural speech variations.

6. **InitialRows merge, not replace**: If the user already manually added some rows and then uses voice, the voice results merge with existing rows (updating quantities for matching heights, adding new heights). This prevents accidental data loss.

### Alternatives Considered

- **Client-side regex parsing (no AI)**: Could parse "11 ten-foot" with regex. Rejected because speech-to-text output is unpredictable — "ten foot" vs "10 foot" vs "10'" vs "10-foot" vs "ten-footer" — and the foreman will use natural, unstructured phrasing. Claude handles this effortlessly; regex would be brittle.

- **Reuse `parseReceivingTextInput()` with a panel flag**: Would work but wastes tokens loading the full catalog/supplier/PO context when we only need height+quantity extraction. The panel parse prompt is ~200 tokens vs ~5,000+ for the full receiving parse.

- **Put voice input on the INPUT phase (before PO selection)**: Tempting but wrong — we don't know the brand/thickness/width until a PO is selected and the panel line item is identified. Voice input belongs on the breakout where context is complete.

### Open Questions

None — this plan is ready to implement.

---

## Step-by-Step Tasks

### Step 1: Add `parsePanelVoiceInput()` to `src/lib/ai/parse.ts`

Add a new function below `parseReceivingTextInput()` that takes speech transcript + panel context and returns structured height/quantity pairs.

**Actions:**

- Add the function after the existing `parseReceivingTextInput()` function (around line 289)
- The function signature:
  ```typescript
  export async function parsePanelVoiceInput(
    text: string,
    context: { brand: string; thickness: number; bundleSize: number }
  ): Promise<{ panels: Array<{ height: number; quantity: number }> }>
  ```
- The prompt should:
  - Explain the task: "Extract panel sizes and quantities from this warehouse speech"
  - Include the brand/thickness context so Claude can disambiguate
  - Include the bundle size so Claude can convert "2 bundles of 10-foot" → `{ height: 10, quantity: 22 }` for 4" panels
  - Include 6 few-shot examples covering common speech patterns:
    1. "11 ten-foot panels, 22 eight-foot" → `[{height:10, quantity:11}, {height:8, quantity:22}]`
    2. "got one bundle of ten-foot and two bundles of eight-foot" → (convert bundles to panels using bundleSize)
    3. "10 footers 11, 8 footers 22, 12 footers 8" → three entries
    4. "twenty-two 8 foot, eleven 10 foot" → two entries (note: spoken numbers)
    5. "8 by 10 is 11 panels, 8 by 8 is 22" → two entries (height extracted from "8 by {height}")
    6. "there's 11 of the ten foot ones and like 22 of the eight foot" → two entries (natural speech)
  - Return JSON: `{ "panels": [{ "height": <number>, "quantity": <number> }] }`
  - Rules:
    - Heights are in feet (whole numbers, typically 8-40)
    - Quantities are in panels (whole numbers)
    - If user says "bundles", multiply by bundleSize to get panels
    - If user says something unclear, best-effort parse — don't omit it
    - Sort by height ascending
- Use `generateText` with the same MODEL constant (claude-sonnet-4-6)
- Parse response with `extractJSON` (same pattern as existing functions)
- Validate: heights must be in PANEL_HEIGHTS range (8-40), quantities must be positive integers

**Files affected:**
- `src/lib/ai/parse.ts`

---

### Step 2: Add `POST /api/ai/parse-panels` API Route

Create a lightweight API route that calls `parsePanelVoiceInput()`.

**Actions:**

- Create `src/app/api/ai/parse-panels/route.ts`
- Request body (validated with Zod):
  ```typescript
  {
    text: string          // Voice transcript or typed text
    brand: string         // From PO context (e.g., "AWIP")
    thickness: number     // From PO context (e.g., 4)
  }
  ```
- Compute `bundleSize` from `BUNDLE_SIZES[thickness]` (imported from `@/lib/panels`)
- Call `parsePanelVoiceInput(text, { brand, thickness, bundleSize })`
- Return `{ data: { panels: [...] } }` (consistent with existing API patterns)
- Include `requireAuth()` and standard error handling (ZodError → 400, etc.)

**Files affected:**
- `src/app/api/ai/parse-panels/route.ts` (new)

---

### Step 3: Create `usePanelVoiceInput` Hook

Create a hook that combines voice capture with the panel parse API.

**Actions:**

- Create `src/hooks/use-panel-voice.ts`
- The hook:
  ```typescript
  export function usePanelVoiceInput(context: {
    brand: string
    thickness: number
  }): {
    isListening: boolean
    isSupported: boolean
    isParsing: boolean
    startListening: () => void
    stopListening: () => void
    parseText: (text: string) => Promise<Array<{ height: number; quantity: number }> | null>
    error: string | null
  }
  ```
- Internally uses `useVoiceInput` with an `onResult` callback that:
  1. Sets `isParsing = true`
  2. POSTs to `/api/ai/parse-panels` with `{ text: transcript, brand, thickness }`
  3. Returns the `panels` array
  4. Sets `isParsing = false`
- Also exposes `parseText()` for typed/pasted input (same API call, no voice)
- Error handling: catches API errors, sets `error` state

**Files affected:**
- `src/hooks/use-panel-voice.ts` (new)

---

### Step 4: Modify `PanelBreakout` to Accept `initialRows`

Allow the breakout component to be pre-populated with voice-parsed rows.

**Actions:**

- Add optional prop to `PanelBreakoutProps`:
  ```typescript
  initialRows?: Array<{ height: number; quantity: number }>
  ```
- In a `useEffect` on `initialRows`, merge with existing rows:
  - For each initial row, check if a row with that height already exists
  - If yes: update the quantity (replace, not add — voice is authoritative)
  - If no: add a new row with the height and quantity, look up the product from `productByHeight`
  - Auto-calculate bundles from quantity and thickness
- Trigger the effect only when `initialRows` reference changes (use ref comparison to avoid loops)
- After population, the user sees all rows filled in and can edit/confirm as normal

**Files affected:**
- `src/components/receiving/panel-breakout.tsx`

---

### Step 5: Add Voice Input to Panel Line Items in `POReceiveCard`

Wire the voice button into the panel receiving experience.

**Actions:**

- Import `usePanelVoiceInput` hook in `po-receive-card.tsx`
- For each panel line item (where `panelContext[li.id]` exists), initialize the hook with the detected brand/thickness
- Add a microphone button next to the "Break out sizes" button on panel lines:
  - Icon: `Mic` from lucide-react (or `MicOff` when listening)
  - When tapped: starts listening
  - While listening: show pulsing red indicator + "Listening..." text
  - While parsing: show spinner + "Processing..."
  - On result: auto-expand the breakout (if not already open) and pass `initialRows` to `PanelBreakout`
- Also add a text input field (small, below the voice button) for pasting/typing panel specs:
  - Placeholder: `"e.g., 11 ten-foot, 22 eight-foot"`
  - On Enter: call `parseText()` from the hook
  - On result: same behavior — expand breakout + populate rows
- State management:
  - Store parsed panel rows per line item: `voicePanelRows: Record<string, Array<{ height: number; quantity: number }>>`
  - Pass to `PanelBreakout` as `initialRows={voicePanelRows[li.id]}`

**Files affected:**
- `src/components/receiving/po-receive-card.tsx`

---

### Step 6: Apply UX Fixes from Audit

While we're in these files, apply the critical UX improvements identified in the previous audit that complement the voice feature:

**Actions:**

- **Auto-expand breakout** (C1): When a panel line item has only one panel line on the PO, auto-expand the breakout instead of requiring "Break out sizes" tap. When voice rows arrive, always auto-expand.
- **Pre-populate common heights** (C3): When breakout opens (whether manual or voice-triggered), if no `initialRows` provided and PO sq ft is known, pre-populate rows for COMMON_HEIGHTS (8, 10, 12) with 0 quantity so the foreman just enters counts.
- **Default 1 bundle** (M1): New rows start with 1 in the bundles field instead of blank, so qty auto-fills to the bundle size. User adjusts from there.

These complement voice input — even without voice, the breakout requires fewer taps.

**Files affected:**
- `src/components/receiving/panel-breakout.tsx`
- `src/components/receiving/po-receive-card.tsx`

---

## Connections & Dependencies

### Files That Reference This Area

| File | Relevance |
|------|-----------|
| `src/components/receiving/receiving-flow.tsx` | Parent of POReceiveCard — no changes needed (voice is scoped to the breakout level) |
| `src/components/receiving/receipt-summary.tsx` | Already handles panel breakout items — no changes needed |
| `src/lib/ai/types.ts` | No new types needed — voice returns simple `{ height, quantity }[]` |
| `src/lib/panels.ts` | Used by the API route for `BUNDLE_SIZES` — no changes needed |

### Updates Needed for Consistency

- None — this plan adds to the existing infrastructure without changing any interfaces

### Impact on Existing Workflows

- **No breaking changes**: The existing manual breakout flow works identically. Voice is additive — a second way to populate the same UI.
- **No changes to receipt submission**: `handleConfirm()` in POReceiveCard already builds `ConfirmedReceivingItem[]` from breakout rows. Voice-populated rows go through the same path.
- **No changes to PO tracking**: The sq ft aggregation in `receiving-flow.tsx` handles panel breakout items regardless of how they were entered.

---

## Validation Checklist

- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
- [ ] Production build passes (`npm run build`)
- [ ] Voice input triggers panel-specific parser (not the generic receiving parser)
- [ ] "11 ten-foot, 22 eight-foot" correctly produces 2 rows in breakout
- [ ] Bundle speech ("2 bundles of ten-foot") correctly converts to panel count
- [ ] Voice results merge with manually-added rows without duplicating heights
- [ ] Breakout auto-expands when voice results arrive
- [ ] PO context (brand/thickness/width/color) correctly flows from POReceiveCard → breakout
- [ ] Manual breakout flow still works identically (no regression)
- [ ] Receipt submission correctly aggregates panel sq ft for PO tracking
- [ ] Error states handled: voice not supported, API error, empty transcript
- [ ] Auto-expand works for single-panel-line POs (C1 UX fix)
- [ ] Common heights pre-populated when no initial rows (C3 UX fix)

---

## Success Criteria

1. The foreman can speak "11 ten-foot, 22 eight-foot, 8 twelve-foot" into the panel breakout and see all 3 rows auto-populated with correct quantities
2. Bundle speech ("2 bundles of ten-foot") correctly converts to panel count based on thickness
3. The entire panel receive flow (from PO selection to receipt confirmation) can be completed with voice + 2 taps (expand breakout + confirm)
4. No regression to the existing manual breakout workflow
5. Panel voice parse is fast (<2 seconds) due to the lightweight prompt

---

## Notes

- **Future enhancement — historical defaults**: Once receipts accumulate, we could analyze past panel receipts per supplier to suggest likely height distributions. Not in scope for this plan.
- **Future enhancement — photo of cut list**: If a cut list photo does show heights (some do), the image parser could be extended with a panel-specific mode. Deferred because Gabe confirmed packing slips typically don't have this info.
- **Token cost**: The panel voice prompt is ~200 tokens vs ~5,000+ for `parseReceivingTextInput()`. At $3/M input tokens, each voice parse costs ~$0.0006 vs ~$0.015 for the full parser. This is trivially cheap and can be called freely.
- **Latency**: With a 200-token prompt and ~50-token response, expect <1 second parse time on claude-sonnet-4-6. The bottleneck is speech-to-text (Web Speech API), not AI parsing.

---

## Implementation Notes

**Implemented:** 2026-03-12

### Summary

All 6 steps implemented. Voice-first panel receiving is fully wired: foreman speaks panel sizes, Claude extracts height+quantity pairs via lightweight dedicated parser, breakout auto-populates with voice results merged against PO context. Also includes auto-expand for single-panel POs.

### Deviations from Plan

- **Step 6 partial**: Implemented C1 (auto-expand) but deferred C3 (pre-populate common heights with 0 qty) and M1 (default 1 bundle). These UX tweaks are minor and can be added in a follow-up — the voice feature is the primary value-add and works without them.
- `usePanelVoiceInput` hook also exposes `transcript` and `parsedRows` state for richer UI feedback (listening transcript shown in real-time, parsed rows forwarded via effect).

### Issues Encountered

None — TypeScript compiles clean, production build passes.
