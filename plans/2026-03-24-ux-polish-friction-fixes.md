# Plan: UX Polish & Friction Fixes — Final Cleanup Pass

**Created:** 2026-03-24
**Status:** Draft
**Request:** Systematic cleanup: off-brand tokens, loading/error/empty states, copy consistency, mobile edge cases

---

## Overview

### What This Plan Accomplishes

Final polish pass that eliminates 81 off-brand color token errors, replaces all bare "Loading..." text with skeleton shimmers, standardizes error and empty states, and ensures consistent button copy across all flows. This is cleanup work — no new features, no redesigns.

### Why This Matters

Inconsistency is the enemy of polish. A user who sees a branded skeleton shimmer on the dashboard but plain "Loading..." text on BOM detail subconsciously registers the app as unfinished. This pass brings every screen to the same quality bar.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Defined 4 standard patterns: skeleton-shimmer for loading (never "Loading..." text), consistent error block (red icon + retry), two-tier empty states (page-level branded vs inline lightweight), button copy standards (Create/Add/Save Changes/Confirm/Done) |

### How Skills Shaped the Plan

The frontend-design skill established that this isn't about adding new patterns — every pattern already exists somewhere in the app. The job is to find inconsistencies and make them match the established pattern. The button copy table provides a concrete reference for every action type.

---

## Current State

### Token Audit: 81 Errors Across 60 Files

Top offenders (by error count):
- `door-spec-sheet.tsx` — 24 errors
- `door-manufacturing-sheet.tsx` — 23 errors
- `door-builder.tsx` — 18 errors
- `door-confirmation.tsx` — 17 errors
- `receipt-summary.tsx` — 15 errors
- `receiving-confirmation-card.tsx` — 12 errors
- `confirmation-card.tsx` — 9 errors
- `panel-breakout.tsx` — 8 errors
- `boms/[id]/page.tsx` — 8 errors
- `cycle-counts/page.tsx` — 7 errors

### Loading State Issues: 8 Bare "Loading..." Strings

- `bom-templates/[id]/page.tsx:191`
- `assemblies/[id]/page.tsx:84`
- `inventory/[id]/adjust/page.tsx:72`
- `inventory/[id]/edit/page.tsx:17-18`
- `inventory/[id]/page.tsx:26`
- `boms/review/page.tsx:72`
- `boms/[id]/page.tsx:268`

### Skeleton Component Uses animate-pulse

- `shared/skeleton.tsx:9` — uses `animate-pulse` instead of `skeleton-shimmer`

---

## Proposed Changes

### Summary of Changes

- Replace 81 off-brand color tokens with design tokens across 60 files
- Replace 8 bare "Loading..." strings with skeleton shimmer blocks
- Fix skeleton.tsx to use `skeleton-shimmer` instead of `animate-pulse`
- Standardize error states to consistent red icon + retry pattern
- Verify empty states use branded EmptyState component

### New Files to Create

None.

### Files to Modify

All 60 files listed in the token audit, plus the 8 loading state files. The implementation will use parallel agents to batch these efficiently.

---

## Design Decisions

### Key Decisions Made

1. **Batch token cleanup by agent**: Group files into batches of 5-8 for parallel agent processing. Each agent gets the replacement map and a file list.
2. **Don't touch shadcn base components**: Files like `button.tsx`, `dialog.tsx`, `tabs.tsx`, `select.tsx`, `sheet.tsx`, `input.tsx` have raw colors that are part of the shadcn design system defaults. Changing them may break the component library. Skip these — they're not user-facing brand violations.
3. **Skeleton shimmer replacement is simple**: Replace the `div` content inside loading blocks with `skeleton-shimmer` rounded divs matching the content shape. Don't over-engineer — 2-3 shimmer blocks is enough.
4. **Button copy standardization is audit-only in this pass**: Document any violations found but only fix obvious ones. A separate copy pass would be too risky for this many files.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Fix Skeleton Component

Change `skeleton.tsx` from `animate-pulse` to `skeleton-shimmer`.

**Actions:**

- In `src/components/shared/skeleton.tsx`, replace `animate-pulse` with `skeleton-shimmer`
- This affects all pages that use `<ListSkeleton>` — they'll all get shimmer automatically

**Files affected:**
- `src/components/shared/skeleton.tsx`

---

### Step 2: Replace "Loading..." Text with Skeletons

Replace all 8 bare "Loading..." strings with skeleton shimmer blocks.

**Actions:**

For each file, replace the "Loading..." text with 2-3 skeleton shimmer divs matching the expected content shape:

```tsx
// Replace this:
<div className="text-center py-12 text-text-muted">Loading...</div>

// With this:
<div className="p-4 space-y-3">
  <div className="h-20 rounded-xl skeleton-shimmer" />
  <div className="h-48 rounded-xl skeleton-shimmer stagger-1" />
  <div className="h-32 rounded-xl skeleton-shimmer stagger-2" />
</div>
```

For Header components showing "Loading..." as title, change to the actual page title (e.g., `"Product Detail"` not `"Loading..."`).

**Files affected:**
- `src/app/bom-templates/[id]/page.tsx`
- `src/app/assemblies/[id]/page.tsx`
- `src/app/inventory/[id]/adjust/page.tsx`
- `src/app/inventory/[id]/edit/page.tsx`
- `src/app/inventory/[id]/page.tsx`
- `src/app/boms/review/page.tsx`
- `src/app/boms/[id]/page.tsx`

---

### Step 3: Token Cleanup — Door Components (Batch 1, ~82 errors)

The door components have the most token errors. Clean all 4 door files.

**Actions:**

Use parallel agents to clean these files using the standard replacement map:
- `text-gray-400` → `text-text-muted`
- `text-gray-500` → `text-text-secondary`
- `text-gray-600` → `text-text-secondary`
- `text-gray-700` → `text-text-primary`
- `text-gray-800` → `text-navy`
- `text-gray-900` → `text-navy`
- `bg-gray-50` → `bg-surface-secondary`
- `bg-gray-100` → `bg-surface-secondary`
- `bg-gray-200` → `bg-border-custom`
- `border-gray-100` → `border-border-custom/40`
- `border-gray-200` → `border-border-custom`
- `border-gray-300` → `border-border-custom`
- `text-green-*` → `text-status-green`
- `text-red-*` → `text-status-red`
- `text-yellow-*` → `text-status-yellow`
- `text-blue-*` → `text-brand-blue`
- `bg-green-50` → `bg-status-green/10`
- `bg-red-50` → `bg-status-red/10`
- `border-green-*` → `border-status-green/30`
- `border-red-*` → `border-status-red/30`

**Files affected:**
- `src/components/doors/door-spec-sheet.tsx` (24 errors)
- `src/components/doors/door-manufacturing-sheet.tsx` (23 errors)
- `src/components/doors/door-builder.tsx` (18 errors)
- `src/components/doors/door-confirmation.tsx` (17 errors)

---

### Step 4: Token Cleanup — Receiving & AI Components (Batch 2, ~44 errors)

**Files affected:**
- `src/components/receiving/receipt-summary.tsx` (15 errors)
- `src/components/receiving/receiving-confirmation-card.tsx` (12 errors)
- `src/components/ai/confirmation-card.tsx` (9 errors)
- `src/components/receiving/panel-breakout.tsx` (8 errors)

---

### Step 5: Token Cleanup — BOM, Inventory, Cycle Counts (Batch 3, ~40 errors)

**Files affected:**
- `src/app/boms/[id]/page.tsx` (8 errors)
- `src/app/cycle-counts/page.tsx` (7 errors)
- `src/components/inventory/stockout-risk-card.tsx` (6 errors)
- `src/app/assemblies/page.tsx` (6 errors)
- `src/app/assemblies/[id]/page.tsx` (6 errors)
- `src/components/receiving/po-match-card.tsx` (5 errors)
- `src/components/receiving/po-browser.tsx` (5 errors)
- `src/components/bom/bom-ai-flow.tsx` (5 errors)

---

### Step 6: Token Cleanup — Remaining Files (Batch 4, ~30 errors)

All remaining files with 1-4 errors each. Use parallel agents.

**Files affected:**
- `src/components/doors/door-creation-flow.tsx` (4)
- `src/components/bom/job-picker.tsx` (4)
- `src/components/bom/bom-photo-capture.tsx` (4)
- `src/components/bom/bom-confirmation-card.tsx` (4)
- `src/components/shipping/finished-goods-list.tsx` (4)
- `src/components/receiving/receipt-history.tsx` (4)
- `src/app/boms/page.tsx` (4)
- `src/components/bom/unit-conversion-prompt.tsx` (3)
- `src/app/settings/page.tsx` (3)
- `src/app/boms/review/page.tsx` (3)
- `src/app/bom-templates/[id]/page.tsx` (3)
- `src/app/assemblies/new/page.tsx` (3)
- `src/components/bom/panel-dimension-editor.tsx` (5)
- `src/components/bom/bom-quick-pick.tsx` (5)
- And remaining 1-2 error files

---

### Step 7: Validation & QA

**Actions:**

- Run `npx tsc --noEmit` — verify zero new errors
- Run `npx tsx scripts/token-audit.ts` — target: <20 errors (remaining should be shadcn base components only)
- Verify no "Loading..." text remains in source (`grep -rn "Loading\.\.\." src/`)
- Verify skeleton.tsx uses `skeleton-shimmer`
- Spot-check 5 pages for loading/error/empty state consistency

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

Every component in the app. This is a sweep, not a targeted change.

### Impact on Existing Workflows

- **Zero functional changes** — all modifications are className replacements and loading state cosmetics
- **No breaking changes** — replacing gray-500 with text-secondary doesn't change behavior
- **Visual improvement only** — screens look more consistent, brand-aligned

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] Token audit errors drop from 81 to <20
- [ ] No bare "Loading..." text in any page (except button loading state text like "Saving...")
- [ ] `skeleton.tsx` uses `skeleton-shimmer` not `animate-pulse`
- [ ] Door components (4 files) have zero off-brand tokens
- [ ] Receiving components (4 files) have zero off-brand tokens
- [ ] AI confirmation card has zero off-brand tokens

---

## Success Criteria

The implementation is complete when:

1. **Token audit drops from 81 to <20 errors** — remaining errors are shadcn base components only
2. **Every loading state uses skeleton shimmer** — no bare "Loading..." text on any page
3. **Visual consistency is maintained** — no regressions, no broken layouts

---

## Notes

- Shadcn base components (`button.tsx`, `dialog.tsx`, `tabs.tsx`, `select.tsx`, `sheet.tsx`, `input.tsx`) are excluded from token cleanup. Their colors are part of the component library defaults and changing them risks breaking the design system.
- This plan uses parallel agents heavily — 4 batches of token cleanup can run simultaneously.
- Button copy standardization was scoped down to audit-only. Fixing all button labels across 60+ files in one pass is too risky. Can be done as a follow-up.
- The `animate-pulse` on status dots (bom-status-badge, stock-badge, work-pipelines) is intentional — pulsing dots indicate active/pending status. Don't change these.
