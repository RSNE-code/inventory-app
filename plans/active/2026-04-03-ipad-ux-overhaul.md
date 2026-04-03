# Plan: iPad App UX Overhaul — 15 Issues

**Created:** 2026-04-03
**Status:** Draft
**Request:** Fix 15 UX issues identified in Gabe's hands-on iPad audit — broken functionality, missing features, and polish gaps vs the webapp.

---

## Overview

### What This Plan Accomplishes

Transforms the iPad app from a structural layout shell into a polished, user-centric experience that matches the webapp's refined UX — step trackers, prominent CTAs, job pickers, queue reordering, and proper data formatting — all optimized for the iPad 11" form factor.

### Why This Matters

The webapp's UX was refined over weeks of iteration with Gabe. The iPad app currently has the layout structure but is missing the workflows, CTAs, and polish that make the webapp usable by construction foremen. These aren't nice-to-haves — they're core workflow elements (step tracking, job selection, queue prioritization) that foremen depend on daily.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Invoked earlier this session — iPad layout creative direction |
| `design-inspiration` | Invoked earlier this session — design system consistency rules |

### How Skills Shaped the Plan

Both skills were invoked during the iPad layout overhaul planning earlier. Their guidance on spacing, card consistency, and iPad-native patterns still applies. This plan focuses on UX/feature parity rather than layout structure.

---

## Current State

### Relevant Existing Structure

**Components that exist but aren't used:**
- `mobile/components/layout/StepProgress.tsx` — fully built, matches webapp, zero usage
- Webapp has JobPicker, queue reordering, step tracking — none ported to mobile

**Components with bugs:**
- `ReceivingFlow.tsx` — no step tracker, no prominent CTAs, PO select sets supplier wrong
- `assemblies/new.tsx` — Create Door navigates to dashboard instead of detail
- `boms/new.tsx` — "Photo/AI Parse" links to same screen as manual entry

**Dashboard widgets:**
- Inventory Value card takes a full column — foremen don't need this
- Trend chart is small and underutilized

### Gaps or Problems Being Addressed

1. **BOM Create tab**: Two stretched cards, bad copy ("Photo/AI Parse"), both link same place
2. **Missing reorder/prioritize**: BOMs and Assemblies can't be reordered
3. **"New Door" not prominent**: Ghost button in header, invisible
4. **Photo route = manual route**: Both BOM entry cards go to `/boms/new`
5. **No job picker**: Job name is a plain text input everywhere
6. **No step trackers**: StepProgress component exists but unused
7. **Back arrows on tab screens**: Should only appear on pushed detail screens
8. **Dashboard layout wrong**: Inventory Value wastes space, trend chart too small
9. **Header logo cramped**: Logo too small, too close to title text
10. **Receive tab UX poor**: No prominent CTAs, no step tracking, supplier flow wrong
11. **Bounce animation excessive**: `damping: 15` too bouncy for iPad
12. **No selected card highlight**: SplitView doesn't show which card is active
13. **No job picker in assembly creation**: Plain text input
14. **Assembly detail raw data**: Shows `true`/`false` flags instead of formatted specs
15. **Create Door dead end**: `router.replace` goes to wrong route, receipt history broken

---

## Proposed Changes

### Summary of Changes

- Redesign BOM Create tab with side-by-side prominent cards using webapp language
- Restructure dashboard: remove Inventory Value, 3-card row, full-width trend chart
- Remove `showBack` from all tab-level Header calls
- Reduce FadeInDown damping from 15 to 20 across all screens
- Add selected state highlighting to SplitView cards + auto-select first item
- Fix header logo size and spacing
- Fix Create Door navigation + Photo BOM routing
- Add StepProgress to ReceivingFlow and BOM creation
- Build JobPicker component (reusable autocomplete)
- Add queue reorder UI to BOMs list and Assemblies list
- Overhaul Receive tab with prominent Packing Slip + Browse POs entry cards
- Format assembly specs properly (no raw true/false)
- Make "New Door" / "New Assembly" button prominent (orange CTA)
- Fix receipt history rendering

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `mobile/components/shared/JobPicker.tsx` | Reusable job search/select autocomplete |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `mobile/app/(tabs)/index.tsx` | Remove Inventory Value, 3-card middle row, full-width trend |
| `mobile/app/(tabs)/boms.tsx` | Redesign Create tab, add reorder to BOM list, selected highlight |
| `mobile/app/(tabs)/assemblies.tsx` | Add reorder UI, selected highlight, auto-select first, prominent New button |
| `mobile/app/(tabs)/receive.tsx` | Remove IPadPage wrapper (receive flow manages own layout) |
| `mobile/app/(tabs)/inventory.tsx` | Remove showBack from Header |
| `mobile/app/boms/new.tsx` | Add StepProgress, integrate JobPicker |
| `mobile/app/assemblies/new.tsx` | Fix Create Door navigation, integrate JobPicker, prominent CTA |
| `mobile/components/receiving/ReceivingFlow.tsx` | Complete overhaul: prominent entry cards, step tracker, fix PO flow |
| `mobile/components/receiving/ReceiptHistory.tsx` | Fix rendering issues |
| `mobile/components/assemblies/AssemblyDetailContent.tsx` | Format specs properly |
| `mobile/components/layout/Header.tsx` | Increase logo size, add gap |
| `mobile/components/layout/SplitView.tsx` | No changes needed (styling handled by parent) |
| `mobile/constants/animations.ts` | Reduce SPRING_CONFIG damping, CARD_ENTER_DELAY |

---

## Design Decisions

### Key Decisions Made

1. **BOM Create cards use webapp language**: "Packing Slip" (camera, orange) + "Browse Products" (cart, blue) — side-by-side on iPad, stacked on phone. This is what foremen understand.

2. **Dashboard 3-card row**: Needs Attention + BOM Status + Fabrication in one row. These are the three things foremen check first. Trend chart expands to full width below — more room for the visualization.

3. **JobPicker as reusable component**: Used in BOM creation, Assembly creation, and potentially Receiving. Search-based autocomplete with dropdown, matching webapp pattern but optimized for touch (larger targets, bottom sheet on phone).

4. **Selected card highlight via accent bar**: On iPad SplitView, the selected card gets a `brandBlue` left accent bar and a light blue background tint. This is the standard iPad master-detail selection pattern.

5. **Reduce animation globally**: Change damping from 15→20 and reduce CARD_ENTER_DELAY from 60→40ms. Still animated but less bouncy — more professional on the larger iPad screen.

6. **Assembly specs formatting**: Map boolean fields to human labels ("Yes"/"No"), format dimensions with units, group related specs. Same data, proper presentation.

---

## Step-by-Step Tasks

### Step 1: Quick Wins — Animation, Header, Back Arrows

Reduce bounce, fix logo, remove back arrows from tab screens.

**Actions:**

- In `mobile/constants/animations.ts`: Change `SPRING_CONFIG.damping` from 15 to 20, `CARD_ENTER_DELAY` from 60 to 40
- In `mobile/components/layout/Header.tsx`: Increase `logoImage` from 32→40px, add `marginRight: spacing.sm` to logo
- In `mobile/app/(tabs)/index.tsx`: Remove `showBack` if present (should already not have it — verify)
- In `mobile/app/(tabs)/receive.tsx`, `boms.tsx`, `assemblies.tsx`, `inventory.tsx`: Verify no `showBack` on tab-level Headers (these are tab screens, not pushed screens)

**Files affected:**
- `mobile/constants/animations.ts`
- `mobile/components/layout/Header.tsx`
- `mobile/app/(tabs)/*.tsx` (verify only)

---

### Step 2: Dashboard Restructure

Remove Inventory Value widget, put Needs Attention + BOM Status + Fabrication in a 3-card row on iPad, expand Inventory Trend to full width.

**Actions:**

- Remove `StockSummaryCard` import and usage from dashboard
- On iPad: Render ActionItems (full width) → then a 3-column row: WorkPipelines renders its two internal cards (BOM Status + Fabrication) — but WorkPipelines is one component that renders both. Need to check if it can be split or if we put ActionItems + WorkPipelines in a row. Actually, looking at the current code, WorkPipelines already renders BOM Status and Fabrication as two cards. So the 3-card row should be: Needs Attention (narrow, left) + BOM Status (center) + Fabrication (right). This means we need WorkPipelines to expose its two sections separately, or we restructure.
- Simpler approach: Keep ActionItems full-width on top. Below that, a 2-column row: WorkPipelines (left, contains BOM + Fab) + a spacer or something else. Then full-width Trend Chart. Then Low Stock + Recent Activity side-by-side.
- Actually, Gabe's instruction was clear: "Needs attention, BOM status, and Fabrication cards should be on same row." So ActionItems + WorkPipelines (BOM + Fab) = 3 things in one row. WorkPipelines is one component but visually renders 2 cards. We could render ActionItems (1/3) + WorkPipelines (2/3) in a row, or we need to decompose WorkPipelines.
- Best approach: Render `ActionItems` and `WorkPipelines` side-by-side in a row. ActionItems takes 1/3, WorkPipelines takes 2/3 (it already renders BOM + Fab as two sub-cards internally). This gives the visual of 3 cards in a row.
- Remove `StockSummaryCard` entirely
- Move `InventoryTrendChart` to full-width (not in a 2-column pair)
- Keep `LowStockList` + `RecentActivity` side-by-side below trend

**iPad layout (top to bottom):**
1. ActionItems (1/3) + WorkPipelines (2/3) — side-by-side row
2. InventoryTrendChart — full width
3. LowStockList + RecentActivity — side-by-side row

**Files affected:**
- `mobile/app/(tabs)/index.tsx`

---

### Step 3: BOM Create Tab Redesign

Replace stretched cards with side-by-side prominent entry cards using webapp language. Photo BOM is the primary CTA (orange), Browse Products is secondary (blue).

**Actions:**

- Redesign the Create BOM tab content:
  - On iPad: Two cards side-by-side (50/50)
  - Left card: "Packing Slip" — Camera icon in orange circle, subtitle "Snap a photo of your packing slip or BOM sheet", orange left accent bar, larger touch target
  - Right card: "Browse Products" — ShoppingCart icon in blue circle, subtitle "Search the catalog and build a BOM by hand", blue left accent bar
  - Both cards should be tall enough to be visually prominent (min-height ~140px on iPad)
- Update `onPress` handlers:
  - "Packing Slip" → navigate to `/boms/new?mode=photo` (or pass param to trigger camera immediately)
  - "Browse Products" → navigate to `/boms/new?mode=manual`
- On phone: Stack vertically (same cards, same prominence)

**Files affected:**
- `mobile/app/(tabs)/boms.tsx`

---

### Step 4: Selected Card Highlight + Auto-Select First

Add visual selection state to SplitView master panels. Auto-select the first item when a list loads.

**Actions:**

- In `mobile/app/(tabs)/boms.tsx`:
  - When BOM list loads and `isTablet && boms.length > 0`, auto-set `selectedBomId` to `boms[0].id`
  - Pass `isSelected` prop to `BomCard` when `bom.id === selectedBomId`
  - Style selected card: `backgroundColor: 'rgba(46, 125, 186, 0.06)'`, `borderLeftWidth: 4`, `borderLeftColor: colors.brandBlue`

- In `mobile/app/(tabs)/assemblies.tsx`:
  - Same auto-select first pattern
  - Same selected highlighting on `AssemblyCard`

- In `mobile/components/bom/BomCard.tsx`: Add optional `isSelected` prop, apply highlight styles
- In `mobile/components/assemblies/AssemblyCard.tsx`: Same pattern

**Files affected:**
- `mobile/app/(tabs)/boms.tsx`
- `mobile/app/(tabs)/assemblies.tsx`
- `mobile/components/bom/BomCard.tsx`
- `mobile/components/assemblies/AssemblyCard.tsx`

---

### Step 5: Fix Broken Navigation

Fix Create Door dead-end and photo BOM routing.

**Actions:**

- In `mobile/app/assemblies/new.tsx`:
  - `handleCreateDoor`: Change `router.replace(\`/assemblies/${newId}\`)` to properly navigate. Test that the route works. The issue is likely that `router.replace` doesn't work for this route pattern. Try `router.push` instead, or use `router.back()` followed by navigation.
  - Add error handling if `newId` is undefined

- In `mobile/app/boms/new.tsx`:
  - Accept a `mode` search param (photo vs manual)
  - If `mode=photo`, immediately trigger camera capture on mount
  - If `mode=manual`, show the text/AI input as current

**Files affected:**
- `mobile/app/assemblies/new.tsx`
- `mobile/app/boms/new.tsx`

---

### Step 6: Build JobPicker Component

Create a reusable job search/select autocomplete that works on both phone and iPad.

**Actions:**

- Create `mobile/components/shared/JobPicker.tsx`:
  - Props: `selectedJob`, `onSelect`, `placeholder`
  - Unselected state: Search input with Briefcase icon, "Search jobs..." placeholder
  - On type: dropdown/inline list of matching jobs (fetched from API)
  - Each result: Job name (bold) + Job # + client (muted)
  - Selected state: Pill showing job name + number with "Change" link
  - Touch-optimized: 48px row height, clear tap targets
  - Use existing `useQuery` pattern to fetch jobs from `/api/jobs` or similar endpoint

- Check what API endpoint exists for jobs:
  - Search for job-related API calls in the webapp
  - May need to use the BOM/Assembly data to extract job names, or there may be a dedicated endpoint

**Files affected:**
- `mobile/components/shared/JobPicker.tsx` (new)
- `mobile/hooks/use-jobs.ts` (new, if needed)

---

### Step 7: Integrate JobPicker Into Forms

Replace plain text job name inputs with the JobPicker component.

**Actions:**

- In `mobile/app/boms/new.tsx`: Replace `<Input label="Job Name *">` with `<JobPicker>`
- In `mobile/app/assemblies/new.tsx`: Replace `<Input label="Job Name">` with `<JobPicker>`
- Wire up the selected job's name/number to the form state

**Files affected:**
- `mobile/app/boms/new.tsx`
- `mobile/app/assemblies/new.tsx`

---

### Step 8: Add StepProgress to Workflows

Wire up the existing StepProgress component to ReceivingFlow and BOM creation.

**Actions:**

- In `mobile/components/receiving/ReceivingFlow.tsx`:
  - Add `<StepProgress steps={["Input", "Review", "Confirm"]} currentStep={phaseIndex} />` at top
  - Map phases: INPUT=0, REVIEW=1, SUMMARY=2

- In `mobile/app/boms/new.tsx`:
  - Add `<StepProgress steps={["Items", "Job Info", "Review"]} currentStep={phaseIndex} />`
  - Map phases: input=0, job=1 (new phase), review=2

**Files affected:**
- `mobile/components/receiving/ReceivingFlow.tsx`
- `mobile/app/boms/new.tsx`

---

### Step 9: Receive Tab Overhaul

Redesign the INPUT phase of ReceivingFlow with prominent entry cards matching webapp intent.

**Actions:**

- Replace the current INPUT phase hero layout with two prominent entry cards:
  - **"Packing Slip"** card: Camera icon (large, orange background circle), bold title, subtitle "Take a photo of your packing slip", full-width orange CTA button style, tap triggers camera
  - **"Browse POs"** card: ClipboardList icon (large, blue background circle), bold title, subtitle "Select a PO to receive against", tap opens PO browser inline
  - On iPad: side-by-side (50/50). On phone: stacked.
  - Below cards: divider with "or type / speak below" text, then AIInput

- Fix PO select flow:
  - Currently `handlePOSelect` sets supplier from PO data incorrectly (uses `po.id` as supplier ID)
  - Should set the actual supplier info and transition to a PO-specific receive flow

- Add step tracker at top of the flow

**Files affected:**
- `mobile/components/receiving/ReceivingFlow.tsx`

---

### Step 10: Assembly Detail Formatting

Format specs properly instead of showing raw true/false flags.

**Actions:**

- In `mobile/components/assemblies/AssemblyDetailContent.tsx`:
  - In the specs rendering section, add formatting logic:
    - Boolean values: Show "Yes" / "No" instead of "true" / "false"
    - Dimension values: Append units (e.g., `"36"` → `"36 inches"`)
    - camelCase keys: Already converted with regex, but improve: `doorWidth` → `"Door Width"`, `isInsulated` → `"Insulated"`
    - Null/undefined: Show "Not specified" (already done)
  - Consider grouping specs into logical sections (Dimensions, Temperature, Frame) if keys are recognized

**Files affected:**
- `mobile/components/assemblies/AssemblyDetailContent.tsx`

---

### Step 11: Prominent "New" Buttons

Make "New Door" and "New Assembly" buttons visible and prominent.

**Actions:**

- In `mobile/app/(tabs)/assemblies.tsx`:
  - Change the header "New" button from `variant="ghost"` to a more visible style
  - On Door Shop tab: Label should be "New Door" (not just "New"), orange color
  - On Fabrication tab: Label should be "New Panel / Floor / Ramp"
  - Consider adding a floating or inline CTA in the master panel when the list is short

**Files affected:**
- `mobile/app/(tabs)/assemblies.tsx`

---

### Step 12: Receipt History Fix

Fix broken receipt history rendering.

**Actions:**

- In `mobile/components/receiving/ReceiptHistory.tsx`:
  - Debug the rendering issue (likely a data structure mismatch)
  - Ensure `item._count?.lineItems` and `item.totalAmount` are properly accessed
  - The FlatList may have nesting issues with the parent ScrollView — check if it needs to be rendered as a plain `.map()` instead
  - Add date display to each receipt card

**Files affected:**
- `mobile/components/receiving/ReceiptHistory.tsx`
- `mobile/app/(tabs)/receive.tsx` (may need to remove nested ScrollView)

---

### Step 13: QA — Full Workflow Walkthrough

Walk through every user workflow on iPad simulator, testing the complete flow end-to-end.

**Actions:**

- TypeScript check: `cd mobile && npx tsc --noEmit`
- Dashboard: Verify 3-card row, no inventory value, full-width trend
- BOM Create: Tap "Packing Slip" → verify camera triggers. Tap "Browse Products" → verify manual entry
- BOM List: Verify first item auto-selected, selected highlight visible, cards show status
- Assemblies: Verify first item auto-selected, "New Door" prominent, detail specs formatted
- Create Door: Fill form → tap Create → verify navigates to new door detail (not dashboard)
- Receive: Verify prominent entry cards, step tracker, PO flow works
- Receipt History: Verify list renders
- All tab screens: No back arrows in headers
- Animation: Cards enter smoothly, no excessive bounce
- Commit and push

**Files affected:**
- All modified files (verification only)

---

## Validation Checklist

- [ ] Dashboard shows 3 widgets in top row (Needs Attention + BOM + Fab), no Inventory Value
- [ ] Inventory Trend chart spans full width
- [ ] BOM Create tab shows side-by-side prominent cards ("Packing Slip" + "Browse Products")
- [ ] "Packing Slip" triggers camera, "Browse Products" opens manual entry
- [ ] BOM List auto-selects first item, selected card has blue highlight
- [ ] Assemblies auto-selects first item with highlight
- [ ] Assembly specs show "Yes"/"No" not "true"/"false"
- [ ] "New Door" button is prominent orange
- [ ] Create Door successfully creates and navigates to detail
- [ ] Job picker works in BOM and Assembly creation
- [ ] Step tracker visible in Receiving and BOM flows
- [ ] Receive tab has prominent "Packing Slip" + "Browse POs" entry cards
- [ ] Receipt History renders correctly
- [ ] No back arrows on any tab screen
- [ ] Animations are smooth but not bouncy
- [ ] Header logo properly sized with spacing
- [ ] TypeScript compiles clean

---

## Success Criteria

1. Every user workflow (create BOM, receive material, create door, browse inventory) works end-to-end on iPad without dead ends or crashes
2. Every screen matches webapp UX intent — step trackers, CTAs, job pickers, formatted data
3. The app feels designed for iPad, not stretched from phone

---

## Notes

- Queue reordering (issue #2) is a larger feature that requires API support for position/order fields. If the webapp has this, we need to check the API endpoints. If the API doesn't support order, this becomes a backend task too. May need to defer to a follow-up plan.
- JobPicker depends on having a jobs API endpoint. Need to verify this exists in the webapp API routes.
- Some fixes (animation, header, back arrows) are 1-minute changes. Others (receive overhaul, job picker, reorder) are 30-60 minute implementations each. Prioritize by impact.
