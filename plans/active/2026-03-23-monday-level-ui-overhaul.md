# Plan: Monday.com-Level UI/UX Overhaul

**Created:** 2026-03-23
**Status:** Draft
**Request:** Comprehensive UI redesign to match Monday.com's level of polish, visual impact, and professional feel — using RSNE brand colors with Monday-level boldness and intentionality.

---

## Overview

### What This Plan Accomplishes

Transforms the RSNE Inventory App from "clean and functional" to "bold, polished, and memorable" — matching the quality bar set by Monday.com. Every page, card, badge, navigation element, and interaction gets rebuilt to feel like a premium field tool designed specifically for construction workers on job sites.

### Why This Matters

The app is used by shop foremen and crew members wearing gloves in direct sunlight. Faint colors vanish, small touch targets cause mis-taps, and generic styling fails to communicate status at a glance. Monday.com's polish isn't cosmetic — it's functional. Bold colors = instant status recognition. Proper hierarchy = faster decision-making. Smooth transitions = perceived speed. This overhaul makes the app feel as confident and professional as the tools these workers already trust.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Full design specification: color token scales, typography hierarchy, card/list templates with accent bars, navigation states, dashboard layout, micro-interaction choreography, form polish specs, empty/loading/error state designs |
| `product-skills` (PM toolkit) | RICE prioritization of all 17 audit findings, user-context analysis (gloves, sunlight, scanning speed), phased implementation order |

### How Skills Shaped the Plan

The frontend-design skill established the "Industrial Precision" aesthetic direction — bold like a Hilti tool, not decorative like a consumer app. Every spec is pressure-tested against the "glove test": can a worker with gloves, squinting in sunlight, use this element? The PM toolkit's RICE scoring confirmed that touch targets and status visibility are the highest-impact changes, which informed the step ordering (foundation tokens first, then cards/badges, then pages).

---

## Current State

### Relevant Existing Structure

**Design System (globals.css):**
- 33 color tokens defined but underutilized (components use /8 opacity)
- 20+ keyframe animations defined but many unused (ios-spring-in, phase-enter, etc.)
- Monday-style card classes defined (`.bom-card-confirmed`, `.bom-card-flagged`, `.bom-card-pending`) but never applied
- `.card-accent-left` class exists but unused

**Components (src/components/):**
- `bom/bom-card.tsx` — No accent bar, text-sm titles, generic hover
- `bom/bom-status-badge.tsx` — /8 opacity backgrounds, 6px dots
- `inventory/product-card.tsx` — No accent bar, text-sm titles
- `inventory/stock-badge.tsx` — /8 opacity backgrounds
- `inventory/category-filter.tsx` — ~32px touch targets
- `layout/bottom-nav.tsx` — No active background, basic active state
- `layout/sidebar-nav.tsx` — No left accent bar on active item
- `layout/header.tsx` — Subtle back button
- `layout/step-progress.tsx` — Labels hidden on mobile
- `dashboard/stock-summary-card.tsx` — All 4 cards identical size
- `dashboard/quick-actions.tsx` — 5-col cramped grid
- `shared/empty-state.tsx` — Faint icon and ring
- `ai/ai-input.tsx` — Listening state barely visible

**Pages (src/app/):**
- `page.tsx` (Dashboard) — No visual hierarchy, cramped spacing
- `inventory/page.tsx` — Small filter pills, tight card spacing
- `boms/page.tsx` — Small filter tabs, no card accent bars
- `assemblies/page.tsx` — Hardcoded gray colors, no tokens
- `cycle-counts/page.tsx` — Off-brand colors throughout
- `receiving/page.tsx` — Basic tab styling
- `boms/review/page.tsx` — Small buttons, faint confidence indicators

### Gaps or Problems Being Addressed

1. **Colors at /8 opacity are invisible in sunlight** — need /15 to /20
2. **No visual hierarchy** — all cards look identical, no accent bars
3. **Touch targets below 44px** — pills, buttons, list rows too small
4. **Text contrast fails WCAG AA** — text-muted at 3.2:1, needs 4.5:1
5. **127 off-brand raw Tailwind colors** — not using design tokens
6. **Animations defined but unused** — ios-spring-in, phase-enter, stagger beyond 8
7. **Inconsistent badge patterns** — 3 different CSS approaches for same intent
8. **No card hover depth** — shadow change only, no translate or bg shift
9. **Navigation lacks confidence** — no accent bars, no active backgrounds
10. **Dashboard has no entry point** — 4 identical summary cards

---

## Proposed Changes

### Summary of Changes

- Overhaul globals.css with expanded color tokens, WCAG-compliant text colors, new shadow tiers, extended stagger classes, skeleton shimmer
- Redesign every card component with left accent bars, text-base titles, proper hover/press states
- Rebuild all status badges with /15 opacity, 8px dots, standardized pattern
- Restyle navigation (sidebar, bottom nav) with active accent bars and backgrounds
- Transform dashboard with featured metric card and color-coded alert cards
- Polish all forms/inputs with bold focus states and validation animations
- Add fade-in animations to all list views
- Increase every touch target to minimum 44px
- Replace all 127 raw Tailwind colors with design tokens
- Redesign empty states, loading states with brand personality

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/app/globals.css` | Add color scales, fix text-muted, add shadow-brand-lg, skeleton shimmer, extend stagger to 12, standardize status bg tokens |
| `src/components/bom/bom-card.tsx` | Add status accent bar, text-base title, hover translate, chevron animation |
| `src/components/bom/bom-status-badge.tsx` | /15 backgrounds, 8px dots, standardized pattern |
| `src/components/inventory/product-card.tsx` | Add stock-status accent bar, text-base title, hover effects |
| `src/components/inventory/stock-badge.tsx` | /15 backgrounds, 8px dots, match bom-status-badge pattern |
| `src/components/inventory/category-filter.tsx` | 44px pills, affordance styling on unselected |
| `src/components/layout/sidebar-nav.tsx` | Left accent bar on active, stronger hover states |
| `src/components/layout/bottom-nav.tsx` | Active background pill, bolder active state |
| `src/components/layout/header.tsx` | Stronger back button, consistent height |
| `src/components/layout/step-progress.tsx` | Always show abbreviated labels on mobile |
| `src/components/dashboard/stock-summary-card.tsx` | Featured value card (full width), alert cards with colored backgrounds |
| `src/components/dashboard/quick-actions.tsx` | 4-col grid, larger icons, better spacing |
| `src/components/dashboard/low-stock-list.tsx` | 44px row height, larger icons |
| `src/components/shared/empty-state.tsx` | Brand-colored icon, stronger ring, larger text |
| `src/components/ai/ai-input.tsx` | Bold listening state, stronger soundbar opacity |
| `src/components/ai/voice-orb.tsx` | Minimum 44px on small variant |
| `src/components/bom/product-picker.tsx` | Consistent custom-add button styling |
| `src/components/receiving/po-match-card.tsx` | Bold confidence badges, 44px clear button |
| `src/components/receiving/receiving-flow.tsx` | Fix off-brand colors, entry card hierarchy |
| `src/app/page.tsx` | Dashboard rebuild: hierarchy, spacing, animation |
| `src/app/inventory/page.tsx` | Card spacing, filter sizing, list animations |
| `src/app/boms/page.tsx` | Tab sizing, card spacing, list animations |
| `src/app/boms/review/page.tsx` | Button sizing, confidence bars, breadcrumb, off-brand colors |
| `src/app/assemblies/page.tsx` | Replace all hardcoded grays with tokens, status colors, accent bars |
| `src/app/assemblies/[id]/page.tsx` | Token cleanup (15 errors), border consistency |
| `src/app/assemblies/new/page.tsx` | Token cleanup, input consistency |
| `src/app/cycle-counts/page.tsx` | Token cleanup (12 errors), result card animations |
| `src/app/receiving/page.tsx` | Tab sizing, token consistency |
| `src/app/inventory/[id]/page.tsx` | Detail card grouping, transaction row height |
| `src/app/inventory/[id]/adjust/page.tsx` | Preview card styling consistency |
| `src/app/inventory/[id]/edit/page.tsx` | Form label weight, input focus states |
| `src/app/inventory/new/page.tsx` | Form label weight, input focus states |
| `src/app/settings/page.tsx` | Token consistency check |
| `src/components/ui/input.tsx` | Focus ring: `focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20` |
| `src/components/ui/select.tsx` | Match input focus pattern, rounded-xl |
| `src/components/ui/badge.tsx` | Ensure base styling supports new patterns |

---

## Design Decisions

### Key Decisions Made

1. **Industrial Precision aesthetic over consumer playfulness**: The app should feel like a premium field tool (Hilti, Leica) — confident, bold, zero-nonsense. Not playful or decorative.
2. **Left accent bars on every card**: Monday.com's signature pattern. A 4px color bar at the card edge communicates status in 0.5 seconds without reading. This is the single highest-impact visual change.
3. **Status opacity /15 minimum, /20 for alerts**: /8 is invisible in sunlight. /15 is the minimum for outdoor readability while still feeling clean indoors.
4. **Text-muted to #6B7F96**: The current #8899AB fails WCAG AA. The new value passes at 4.5:1 while still feeling "muted."
5. **Featured dashboard metric**: Break the 2x2 grid. Inventory Value spans full width at large type, making the dashboard have a clear entry point.
6. **44px minimum everywhere, no exceptions**: Field workers with gloves. This is non-negotiable. Affects pills, buttons, list rows, icon buttons.
7. **Consistent badge pattern**: One implementation (bg-{color}/15, 8px dot, text-xs font-semibold) used everywhere. Three current patterns consolidated.
8. **Urbanist font stays**: It's distinctive and works. No font change needed — the hierarchy just needs bolder differentiation.

### Alternatives Considered

- **Dark theme for outdoor readability**: Rejected — too risky to introduce now, light theme with bold colors is sufficient.
- **Framer Motion for animations**: Rejected — CSS animations in globals.css are already excellent and lighter weight. Add Motion library only if needed later.
- **Complete component library rebuild**: Rejected — the shadcn/ui base is good. We're restyling, not replacing.

---

## Step-by-Step Tasks

### Step 1: Design Token Foundation (globals.css)

Expand the design token system to support the full overhaul. Everything else builds on this.

**Actions:**

- Change `--color-text-muted` from `#8899AB` to `#6B7F96` (WCAG AA compliant)
- Add status background tokens at proper opacity:
  - `--color-status-green-bg: rgba(34, 197, 94, 0.15)`
  - `--color-status-yellow-bg: rgba(234, 179, 8, 0.15)`
  - `--color-status-red-bg: rgba(239, 68, 68, 0.15)`
  - `--color-brand-blue-bg: rgba(46, 125, 186, 0.12)`
  - `--color-brand-orange-bg: rgba(232, 121, 43, 0.12)`
- Add bold variants for alert contexts (at /22 opacity)
- Add `.shadow-brand-lg` for elevated cards: `0 8px 24px rgba(11, 29, 58, 0.12), 0 4px 8px rgba(11, 29, 58, 0.06)`
- Add `.skeleton-shimmer` class using gradient animation (replace `animate-pulse`)
- Extend stagger classes to `stagger-12` (0.05s increments to 0.6s)
- Add card accent bar utility classes for each status color

**Files affected:**
- `src/app/globals.css`

---

### Step 2: Badge System Standardization

Rebuild both status badge components with one consistent, bold pattern.

**Actions:**

- Update `bom-status-badge.tsx`:
  - Backgrounds from `/8` to `/15` (use new tokens)
  - Status dots from `h-1.5 w-1.5` to `h-2 w-2`
  - Replace `bg-gray-100 text-gray-600` (DRAFT) with `bg-surface-secondary text-text-secondary`
  - Add `px-2.5 py-1` for proper badge sizing
- Update `stock-badge.tsx` to match exact same pattern
- Search for any other badge-like status indicators across the codebase and standardize

**Files affected:**
- `src/components/bom/bom-status-badge.tsx`
- `src/components/inventory/stock-badge.tsx`

---

### Step 3: Card Component Redesign — BOM & Product Cards

Add Monday-style left accent bars, increase title sizes, add proper hover states.

**Actions:**

- Update `bom-card.tsx`:
  - Add `border-l-4` with status-mapped color (DRAFT=gray-300, PENDING_REVIEW=brand-orange, APPROVED=brand-blue, IN_PROGRESS=status-yellow, COMPLETED=status-green, CANCELLED=status-red)
  - Title from `text-sm` to `text-base`
  - Add `hover:-translate-y-0.5 hover:shadow-brand-md` for depth on hover
  - Chevron: `group-hover:translate-x-1 group-hover:text-brand-blue transition-all duration-300`
  - Add `overflow-hidden` to card for clean accent bar rendering

- Update `product-card.tsx`:
  - Add `border-l-4` mapped to stock status (green/yellow/red)
  - Title from `text-sm` to `text-base`
  - Same hover pattern as BomCard
  - Chevron animation to match

**Files affected:**
- `src/components/bom/bom-card.tsx`
- `src/components/inventory/product-card.tsx`

---

### Step 4: Navigation Polish — Sidebar & Bottom Nav

Make active states unmistakable, add accent bars.

**Actions:**

- Update `sidebar-nav.tsx`:
  - Active item: add `border-l-4 border-brand-blue-bright` with adjusted padding
  - Active bg: `bg-brand-blue/15` instead of `bg-white/10`
  - Inactive: `border-l-4 border-transparent` for alignment
  - Hover: `hover:bg-white/8` (stronger than /5)

- Update `bottom-nav.tsx`:
  - Active tab: wrap icon+label in `bg-brand-blue/10 rounded-xl` pill
  - Label font: `text-[11px] font-bold` when active
  - Ensure min touch target 48px per tab

**Files affected:**
- `src/components/layout/sidebar-nav.tsx`
- `src/components/layout/bottom-nav.tsx`

---

### Step 5: Dashboard Transformation

Create visual hierarchy with featured metric and alert cards.

**Actions:**

- Update `stock-summary-card.tsx`:
  - Inventory Value card: span full width, `text-3xl font-extrabold`, larger icon container
  - Total Products: smaller card next to value card, or in a second row
  - Low Stock card: `bg-status-yellow/10` tinted background with yellow accent bar
  - Out of Stock card: `bg-status-red/10` tinted background with red accent bar
  - All cards keep current stagger animation

- Update `quick-actions.tsx`:
  - Change from `grid-cols-5` to `grid-cols-4` (move least-used action or use horizontal scroll)
  - Icon size from `h-5 w-5` to `h-6 w-6`
  - Touch target: explicit `min-h-[52px]`
  - Better label sizing

- Update `low-stock-list.tsx`:
  - Row height: `py-3.5` for 44px+ touch targets
  - Icon size: `h-4 w-4` minimum (from h-3.5)

- Update `page.tsx` (Dashboard):
  - Section spacing: `space-y-4`
  - Activity rows: `py-3.5` for touch targets
  - Menu button: `h-11 w-11` (from h-9)
  - Add `animate-fade-in-up` with stagger to activity list items

**Files affected:**
- `src/components/dashboard/stock-summary-card.tsx`
- `src/components/dashboard/quick-actions.tsx`
- `src/components/dashboard/low-stock-list.tsx`
- `src/app/page.tsx`

---

### Step 6: Touch Target Compliance Sweep

Systematically increase every interactive element to 44px minimum.

**Actions:**

- `category-filter.tsx`: Pills from `py-2` to `py-2.5`, add `min-h-[44px]`
- `voice-orb.tsx`: Small variant from `h-10 w-10` to `h-11 w-11`
- `boms/page.tsx`: Status filter tabs — increase padding to `py-3`
- `receiving/page.tsx`: Same tab treatment
- `boms/review/page.tsx`: Confirm/Fix buttons from `h-10 w-10` to `h-12 w-12`, increase gap
- `po-match-card.tsx`: Clear button from `h-6 w-6` to `h-8 w-8`
- `step-progress.tsx`: Step circles — ensure 44px tap zone
- All form buttons: verify `h-12` or `h-14` minimum

**Files affected:**
- `src/components/inventory/category-filter.tsx`
- `src/components/ai/voice-orb.tsx`
- `src/app/boms/page.tsx`
- `src/app/receiving/page.tsx`
- `src/app/boms/review/page.tsx`
- `src/components/receiving/po-match-card.tsx`
- `src/components/layout/step-progress.tsx`

---

### Step 7: Form & Input Polish

Standardize focus states and validation across all inputs.

**Actions:**

- Update `src/components/ui/input.tsx`: Add `focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20` to base input
- Update `src/components/ui/select.tsx`: Match input focus pattern
- Update `ai-input.tsx`:
  - Listening state: `border-2 border-brand-orange bg-brand-orange/10` (from /30 and /5)
  - Soundbar opacity: `bg-brand-orange/80` (from /60)
- Form labels across product-form, assembly forms: add `font-semibold` to required field labels

**Files affected:**
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ai/ai-input.tsx`
- `src/components/inventory/product-form.tsx`

---

### Step 8: List Animations & Transitions

Add fade-in stagger to every list view and smooth transitions throughout.

**Actions:**

- Every page with a card list (boms, inventory, assemblies, cycle-counts, receiving) — add `animate-fade-in-up stagger-${Math.min(i+1, 12)}` to each card
- Category filter transitions: `duration-200` → `duration-300`
- Card transitions: ensure `transition-all duration-300` on all cards
- Add `animate-ios-spring-in` to cycle count result cards
- Add `animate-phase-enter` to assembly creation step transitions
- Product card chevron: `group-hover:translate-x-1 transition-all duration-300`

**Files affected:**
- `src/app/boms/page.tsx`
- `src/app/inventory/page.tsx`
- `src/app/assemblies/page.tsx`
- `src/app/cycle-counts/page.tsx`
- `src/app/receiving/page.tsx`
- `src/components/inventory/category-filter.tsx`

---

### Step 9: Empty State & Loading State Refresh

Give empty and loading states the same polish as primary UI.

**Actions:**

- Update `empty-state.tsx`:
  - Icon container: `bg-brand-blue/10` (from bg-surface-secondary)
  - Icon color: `text-brand-blue` (from text-muted/60)
  - Ring: `border-brand-blue/20` (from border-custom/40)
  - Title: `text-xl font-bold` (from text-lg)
  - Description: `text-text-secondary` (from text-muted)

- Loading skeletons across pages:
  - Replace `animate-pulse` with `skeleton-shimmer` class
  - Add stagger delays to skeleton cards
  - Show colored left-border placeholder in skeleton cards

**Files affected:**
- `src/components/shared/empty-state.tsx`
- All pages with loading states (dashboard, inventory, boms, assemblies, cycle-counts)

---

### Step 10: Design Token Cleanup — Off-Brand Colors

Replace all 127 raw Tailwind colors flagged by the UX linter.

**Actions:**

- Systematic find-and-replace across all files:
  - `text-gray-400` → `text-text-muted`
  - `text-gray-500` → `text-text-secondary`
  - `text-gray-600` → `text-text-secondary`
  - `text-gray-700` → `text-text-primary`
  - `text-gray-900` → `text-navy`
  - `bg-gray-50` → `bg-surface-secondary`
  - `bg-gray-100` → `bg-surface-secondary`
  - `border-gray-100` → `border-border-custom/40`
  - `border-gray-200` → `border-border-custom`
  - `border-gray-300` → `border-border-custom`
  - `bg-green-50` → `bg-status-green/10`
  - `bg-red-50` → `bg-status-red/10`
  - `bg-yellow-50` → `bg-status-yellow/10`
  - `bg-orange-50` → `bg-brand-orange/10`
  - `bg-blue-50` → `bg-brand-blue/10`
- Focus on highest-error files first: assemblies/[id], cycle-counts, receiving-flow, boms/review
- Run `npm run ux:tokens` after to verify reduction

**Files affected:**
- `src/app/assemblies/[id]/page.tsx` (15 errors)
- `src/app/cycle-counts/page.tsx` (12 errors)
- `src/components/receiving/receiving-flow.tsx` (10 errors)
- `src/app/boms/review/page.tsx` (8 errors)
- All other flagged files (~80 remaining errors across ~30 files)

---

### Step 11: Assembly Pages Polish

These pages have the most off-brand styling and need extra attention.

**Actions:**

- `assemblies/page.tsx`:
  - Replace hardcoded `bg-gray-100 text-gray-600` status colors with token-based system
  - Add left accent bars to assembly cards based on status
  - Card spacing from `space-y-2` to `space-y-3`
  - Add fade-in-up stagger to card list

- `assemblies/[id]/page.tsx`:
  - Replace all 15 off-brand color instances
  - Standardize borders to `border-border-custom`
  - Door sheet view toggle: larger touch targets

- `assemblies/new/page.tsx`:
  - Input borders to design tokens
  - Form label weight differentiation
  - Step transitions with `animate-phase-enter`

**Files affected:**
- `src/app/assemblies/page.tsx`
- `src/app/assemblies/[id]/page.tsx`
- `src/app/assemblies/new/page.tsx`

---

### Step 12: Remaining Page Polish

Sweep through all remaining pages for consistency.

**Actions:**

- `inventory/[id]/page.tsx`: Detail card visual grouping, transaction row height to 44px
- `inventory/[id]/adjust/page.tsx`: Preview card use `bg-brand-blue/10 border border-brand-blue/20` for consistency
- `inventory/[id]/edit/page.tsx` & `inventory/new/page.tsx`: Form label weights, input focus states
- `settings/page.tsx`: Token consistency check
- `bom-templates/` pages: Card accent bars, token compliance
- `boms/review/page.tsx`: Add breadcrumb, increase button sizes, confidence bar height from 6px to 10px

**Files affected:**
- `src/app/inventory/[id]/page.tsx`
- `src/app/inventory/[id]/adjust/page.tsx`
- `src/app/inventory/[id]/edit/page.tsx`
- `src/app/inventory/new/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/bom-templates/` (all pages)
- `src/app/boms/review/page.tsx`

---

### Step 13: Final Validation & QA

Run all automated checks, visual review every page, verify accessibility.

**Actions:**

- Run `npm run ux:all` — target: <20 errors (from 127)
- Run `npx tsc --noEmit` — zero type errors in modified files
- Run `npm run build` — clean production build
- Manual review each page on mobile viewport (375px) for:
  - Touch targets (every button, pill, row ≥ 44px)
  - Color contrast (muted text readable)
  - Accent bars visible and correctly colored
  - Animations smooth (no jank, proper stagger)
  - No layout overflow or text clipping

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `DESIGN_BRIEF.md` — Should be updated to reflect the completed overhaul
- `context/project-status.md` — Update with "UI overhaul complete" status

### Updates Needed for Consistency

- After overhaul, update `DESIGN_BRIEF.md` to document the new status badge pattern, card accent bar system, and touch target standard as established patterns
- Any new components added in future should follow the patterns established here

### Impact on Existing Workflows

- No logic changes — all modifications are styling/className only
- No API changes
- No database changes
- No breaking changes to component props
- Existing tests unaffected (visual changes only)

---

## Validation Checklist

- [ ] `npm run ux:tokens` shows <20 errors (from 127)
- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npm run build` succeeds
- [ ] Every status badge uses /15 opacity with 8px dots
- [ ] Every card has a status-appropriate left accent bar
- [ ] Every interactive element is ≥44px touch target
- [ ] Text-muted passes WCAG AA (4.5:1 contrast)
- [ ] Dashboard has clear visual hierarchy (featured metric)
- [ ] Sidebar active item has left accent bar
- [ ] Bottom nav active tab has background pill
- [ ] All list views have fade-in stagger animation
- [ ] No raw Tailwind gray classes in modified files
- [ ] Empty states use brand-blue icon treatment

---

## Success Criteria

The implementation is complete when:

1. **Every page passes the "glove test"** — a construction worker with gloves, squinting in sunlight, can identify status, tap the right button, and navigate confidently
2. **UX token audit drops from 127 errors to <20** — the app consistently uses its own design system
3. **Visual parity with Monday.com's level of polish** — bold status colors, left accent bars on every list card, smooth stagger animations, clear dashboard hierarchy, consistent spacing
4. **Zero accessibility regressions** — all text passes WCAG AA, all touch targets ≥44px

---

## Notes

- This is a styling-only overhaul. No business logic, API, or database changes.
- Every change is a className/CSS modification — low risk, fully reversible.
- The 13 steps are ordered by dependency: tokens first (Step 1), then components that use them (Steps 2-9), then page-level cleanup (Steps 10-12), then validation (Step 13).
- Estimated total effort: significant — this touches 35+ files across every module. But each step is independently shippable and testable.
- The existing animation system in globals.css is excellent and mostly just needs to be *applied* — not rewritten.
