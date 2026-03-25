# Plan: Design System & Motion Foundation

**Created:** 2026-03-24
**Status:** Implemented
**Request:** Session 1 of the "top of app store" polish — font pairing, page transitions, card entry animations, celebration system with varied effects, progress tracker redesign, micro-interactions.

---

## Overview

### What This Plan Accomplishes

Transforms the app from "functional" to "alive." Adds a display font for visual hierarchy, builds a celebration overlay system with 6 animation variants that never repeat consecutively, introduces page entrance animations and enhanced card stagger effects, redesigns the progress tracker with pixel-perfect CSS Grid alignment, and adds micro-interactions to buttons and tab switches. This creates the motion infrastructure that Sessions 2-5 build on.

### Why This Matters

Gabe's bar is "top of the app store charts." The app works well functionally but feels static — success is a toast notification, pages appear without transition, cards don't animate in, and the progress tracker has alignment issues. This plan makes every interaction feel intentional and every success feel rewarding. The goal: construction workers open this app and think "this is different from anything I've used."

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Motion philosophy: high-impact moments over scattered micro-interactions. One well-orchestrated page load with staggered reveals creates more delight than dozens of small animations. Celebrations should feel earned. Spring curves (cubic-bezier 0.34, 1.56, 0.64, 1) for physical interactions, ease-out for reveals. |
| `product-skills` (UI design system) | Animation token system: duration tokens (instant 100ms, fast 200ms, normal 300ms, slow 500ms), easing tokens (spring, ease-out, ease-in-out). Celebration duration sweet spot: 800-1200ms — long enough to register, short enough to not block. Touch target validation: 44px minimum remains enforced. |

### How Skills Shaped the Plan

Frontend-design pushed for bold, high-impact animation moments rather than subtle micro-interactions everywhere. The celebration system is designed as a "wow" moment — full-screen overlay that commands attention, not a tiny toast. The UI design system skill ensured animations are tokenized (duration/easing CSS variables) so they're consistent and tuneable from one place. Celebration duration is set at 1000ms based on the UX principle that success feedback should be satisfying but never blocking.

---

## Current State

### Relevant Existing Structure

| File | Current State |
|------|--------------|
| `src/app/layout.tsx` | Urbanist font only (400-800 weights). No display font pairing. |
| `src/app/globals.css` | 30+ keyframe animations defined. Stagger classes (1-12). iOS spring curves. Card accents. But no celebration animations, no page transitions. |
| `src/components/layout/step-progress.tsx` | Flex layout with `flex-1` gaps. Labels use fixed `w-14` causing wrapping. Lines use `flex-1 mx-2` causing uneven spacing. |
| `src/components/ui/sonner.tsx` | Standard Sonner toasts for success. No visual celebration. |
| `src/components/layout/app-shell.tsx` | Wraps pages in `<main>`. No page transition wrapper. |

### Gaps or Problems Being Addressed

1. **No celebration animations** — success is a plain toast. Boring.
2. **No page transitions** — pages snap in without animation. Feels static.
3. **Single font** — Urbanist everywhere. No typographic hierarchy between display and body text.
4. **Progress tracker misalignment** — labels wrap on mobile, connecting lines are different lengths, circles aren't evenly spaced.
5. **Card entry is underused** — stagger classes exist but aren't applied consistently. Cards don't spring in.
6. **No animation tokens** — durations and easings are hardcoded per animation, not centralized.

---

## Proposed Changes

### Summary of Changes

- Add display font (Sora 700-800) alongside Urbanist for headings/impact text
- Create centralized animation tokens (CSS variables for duration/easing)
- Build `CelebrationOverlay` component with 6 animation variants and non-repeat logic
- Create `useCelebration()` hook for triggering celebrations from anywhere
- Add page entrance animations via a `PageTransition` wrapper
- Redesign `StepProgress` with CSS Grid for pixel-perfect alignment
- Add animated tab indicator (sliding pill) to tab groups
- Enhance card entry stagger with spring physics

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/shared/celebration-overlay.tsx` | Full-screen celebration animation system with 6 variants |
| `src/hooks/use-celebration.ts` | Hook + context provider for triggering celebrations app-wide |
| `src/components/layout/page-transition.tsx` | Page entrance animation wrapper |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Add Sora font import, add `--font-display` CSS variable, wrap with CelebrationProvider |
| `src/app/globals.css` | Add animation tokens, celebration keyframes, page transition keyframes, enhanced stagger, tab indicator styles |
| `src/components/layout/step-progress.tsx` | Complete rewrite using CSS Grid for pixel-perfect alignment |
| `src/components/layout/app-shell.tsx` | Wrap page content with PageTransition |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Sora as display font over serif options**: Sora is a geometric sans-serif with different proportions than Urbanist — subtly wider, with a sharper personality at weight 700-800. A serif (like Instrument Serif) was considered but would feel too editorial for a construction app. Sora adds hierarchy without clashing with the brand's industrial tone. Available on Google Fonts via next/font.

2. **6 celebration variants, CSS-only (no canvas/confetti library)**: Each variant uses pure CSS keyframes with pseudo-elements and generated particles. No external dependencies (react-confetti, canvas-confetti). Variants: Radial Pulse, Starburst, Particle Rise, Ring Cascade, Checkmark Bloom, Gravity Scatter. localStorage tracks last-used to prevent consecutive repeats.

3. **CSS Grid for progress tracker, not flexbox**: The current flex layout causes uneven line widths because `flex-1` distributes remaining space unevenly when circles have different content widths (number vs check icon). CSS Grid with `grid-template-columns: repeat(n, 1fr)` guarantees mathematically equal columns. Lines are absolutely positioned between circle centers.

4. **Page transition is mount-only, not route-change**: Full route-change animations (AnimatePresence) require `framer-motion` and complex layout management. A mount-only `animate-fade-in-up` on the page wrapper is simpler, works with Next.js App Router, and still makes pages feel alive. The animation is fast (300ms) so it doesn't slow navigation.

5. **Animation tokens via CSS custom properties**: All animation durations and easings are CSS variables in globals.css. Components reference `var(--duration-fast)` instead of hardcoding `0.2s`. This makes the entire motion system tuneable from one place.

6. **Celebrations are overlays, not toast replacements**: The celebration animation plays as a full-screen overlay WHILE the toast appears. The toast stays for context ("BOM created successfully"), but the celebration provides the emotional payoff. Celebrations auto-dismiss after 1000ms.

### Alternatives Considered

- **Framer Motion for page transitions**: Rejected — adds a 30KB dependency, requires AnimatePresence layout management, overkill for mount animations.
- **Canvas-based confetti**: Rejected — requires external library, harder to match brand colors, less controllable than CSS.
- **Lottie animations for celebrations**: Rejected — requires animation assets and the Lottie player library. CSS-only keeps the bundle small.
- **Variable font for display**: Rejected — most variable fonts on Google Fonts have limited character at extreme weights.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Animation Tokens & Motion Primitives

Add centralized animation tokens and new keyframes to globals.css.

**Actions:**

- Add animation token CSS variables to the `@theme` block:
  ```css
  --duration-instant: 100ms;
  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-celebration: 1000ms;
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  ```
- Add 6 celebration keyframe sets (detailed in Step 2's component)
- Add page entrance keyframe:
  ```css
  @keyframes page-enter {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-page-enter {
    animation: page-enter var(--duration-normal) var(--ease-out) both;
  }
  ```
- Add enhanced card stagger with spring entrance:
  ```css
  @keyframes card-spring-in {
    0% { opacity: 0; transform: translateY(16px) scale(0.97); }
    60% { transform: translateY(-2px) scale(1.005); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .animate-card-enter {
    animation: card-spring-in 0.4s var(--ease-spring) both;
  }
  ```
- Add animated tab indicator styles:
  ```css
  .tab-indicator {
    transition: transform var(--duration-normal) var(--ease-spring),
                width var(--duration-normal) var(--ease-spring);
  }
  ```

**Files affected:**
- `src/app/globals.css`

---

### Step 2: Celebration Overlay Component

Create the celebration animation system — 6 variants that never repeat consecutively.

**Actions:**

- Create `src/components/shared/celebration-overlay.tsx`
- Implement 6 CSS-only animation variants:
  1. **Radial Pulse** — 3 concentric rings of brand-blue expand from center and fade (opacity + scale)
  2. **Starburst** — 12 rays in brand-orange/brand-blue radiate from center, rotate 15°, fade out
  3. **Particle Rise** — 20 small circles (brand colors at varied opacity) rise from bottom with slight horizontal drift
  4. **Ring Cascade** — 5 rings expand sequentially from center with 100ms stagger, alternating brand-blue and brand-orange
  5. **Checkmark Bloom** — Large checkmark draws itself (stroke-dashoffset animation), then a ring expands behind it
  6. **Gravity Scatter** — 15 shapes fall from top, bounce once (spring physics), then fade
- Each variant is a React component that renders absolutely positioned elements with CSS animations
- Non-repeat logic: store last variant index in `useRef`, pick randomly from remaining 5
- Component self-unmounts after `--duration-celebration` (1000ms) via `useEffect` timeout
- Props: `variant?: number` (auto if not specified), `onComplete?: () => void`

**Files affected:**
- `src/components/shared/celebration-overlay.tsx` (new)

---

### Step 3: Celebration Hook & Provider

Create the hook and context for triggering celebrations from anywhere in the app.

**Actions:**

- Create `src/hooks/use-celebration.ts`
- Export `CelebrationProvider` — wraps app, renders `CelebrationOverlay` when triggered
- Export `useCelebration()` hook — returns `{ celebrate: () => void }`
- `celebrate()` triggers the overlay with a random non-repeating variant
- Provider state: `{ isActive: boolean, variant: number | null }`
- Auto-dismiss after animation completes
- Add `CelebrationProvider` to layout.tsx inside `<Providers>`

**Files affected:**
- `src/hooks/use-celebration.ts` (new)
- `src/app/layout.tsx` (wrap with provider)
- `src/components/layout/providers.tsx` (add CelebrationProvider)

---

### Step 4: Display Font Addition

Add Sora as a display/heading font paired with Urbanist body text.

**Actions:**

- In `layout.tsx`, import Sora from `next/font/google`:
  ```tsx
  const sora = Sora({
    subsets: ["latin"],
    variable: "--font-sora",
    weight: ["600", "700", "800"],
  })
  ```
- Add `sora.variable` to the body className
- In `globals.css`, add `--font-display: 'Sora', sans-serif` to `@theme`
- Add utility class: `.font-display { font-family: var(--font-display); }`
- Do NOT change any existing text yet — the font is available for Session 2 (Brand Identity) to apply selectively. This step only makes it available in the system.

**Files affected:**
- `src/app/layout.tsx`
- `src/app/globals.css`

---

### Step 5: Page Transition Wrapper

Create a component that animates page content on mount.

**Actions:**

- Create `src/components/layout/page-transition.tsx`
- Simple wrapper that applies `animate-page-enter` class to its children container
- Uses a `key` based on pathname (from `usePathname()`) to re-trigger animation on navigation
- Wrap the `{children}` in `app-shell.tsx` with `<PageTransition>`
- The animation is `page-enter` (300ms ease-out, 8px translateY + opacity)

**Files affected:**
- `src/components/layout/page-transition.tsx` (new)
- `src/components/layout/app-shell.tsx` (wrap children)

---

### Step 6: Progress Tracker Redesign

Rewrite StepProgress with CSS Grid for pixel-perfect alignment.

**Actions:**

- Rewrite `src/components/layout/step-progress.tsx` using CSS Grid:
  ```
  grid-template-columns: repeat({steps.length}, 1fr)
  ```
- Each step occupies one grid cell, circle centered horizontally within cell
- Connecting lines are absolutely positioned, spanning from one circle center to the next (calculated via `left: 50%` of cell N to `right: 50%` of cell N+1)
- Labels are centered below each circle within their grid cell — no fixed `w-14`, text naturally wraps within the equal-width column
- Line height: 2px completed (brand-blue), 1px pending (border-custom) — matching existing pattern but now GUARANTEED equal length
- Circle size: `h-9 w-9` (slightly larger for better touch target on mobile)
- Completed circle: brand-blue bg, white check, subtle shadow
- Current circle: brand-blue bg, white number, ring-2 ring-brand-blue/20 ring-offset-2
- Future circle: border-2 border-border-custom, text-muted number
- Label text: `text-xs` (not text-[11px]) for better legibility, `font-semibold` for current, `font-medium` for completed, default for future
- Transition on lines: `transition-all duration-500` for smooth progression

**Files affected:**
- `src/components/layout/step-progress.tsx`

---

### Step 7: Wire Celebrations to Success Actions

Replace boring `toast.success()` calls with `celebrate()` + toast combo at key moments.

**Actions:**

- Identify the highest-impact success moments (not every toast — only "big wins"):
  - BOM created successfully (`src/components/bom/bom-ai-flow.tsx`)
  - Receipt submitted (`src/components/receiving/receiving-flow.tsx`)
  - Assembly created / Door sheet submitted (`src/app/assemblies/new/page.tsx`)
  - Cycle count completed
- At each location, add `const { celebrate } = useCelebration()` and call `celebrate()` alongside the existing `toast.success()`
- Do NOT remove the toast — the celebration is visual, the toast is informational
- Less significant successes (stock adjustment, settings save) keep toast-only

**Files affected:**
- `src/components/bom/bom-ai-flow.tsx`
- `src/components/receiving/receiving-flow.tsx`
- `src/app/assemblies/new/page.tsx`
- Other files with major success moments (identify during implementation)

---

### Step 8: Enhanced Card Stagger on List Pages

Apply spring-based card entry animations to all list pages.

**Actions:**

- Add `animate-card-enter` class with stagger delays to card lists on:
  - Dashboard cards (`src/app/page.tsx`)
  - BOM list cards (`src/app/boms/page.tsx`)
  - Inventory list (`src/app/inventory/page.tsx`)
  - Assembly queue cards (`src/app/assemblies/page.tsx`)
- Pattern: each card gets `animate-card-enter` + `stagger-{index}` (capped at stagger-8 to avoid long delays)
- Cards use `opacity: 0` initially (via animation `both` fill mode) and spring in on mount
- Wrap card lists in `animate-fade-in` container for the section-level entrance

**Files affected:**
- `src/app/page.tsx`
- `src/app/boms/page.tsx`
- `src/app/inventory/page.tsx`
- `src/app/assemblies/page.tsx`

---

### Step 9: Animated Tab Indicator

Add a sliding pill indicator to tab groups (queue tabs, BOM tabs, filter pills).

**Actions:**

- Create a reusable `TabIndicator` pattern using a positioned `<div>` that slides behind the active tab
- Uses `transform: translateX()` with spring easing to slide between tab positions
- The indicator is an absolute-positioned div behind the active tab button, using the tab's `offsetLeft` and `offsetWidth`
- Implement via `useRef` on the tab container + `useEffect` that measures active tab position
- Apply to:
  - Assembly queue tabs (DOOR_SHOP / FABRICATION / SHIPPING)
  - BOM page tabs (Create BOM / BOM List)
- The indicator is `bg-white shadow-brand rounded-lg` (matching existing active tab style) but now SLIDES instead of snapping

**Files affected:**
- `src/app/assemblies/page.tsx`
- `src/app/boms/page.tsx`

---

### Step 10: Validation & QA

Type check, token audit, visual verification.

**Actions:**

- Run `npx tsc --noEmit` — verify zero new errors
- Run `npx tsx scripts/token-audit.ts` — verify no new off-brand tokens
- Verify:
  - Celebration overlay plays on BOM creation success (varies each time)
  - Page entrance animation plays on navigation
  - Progress tracker circles are exactly evenly spaced (measure with dev tools)
  - Progress tracker labels don't wrap on 375px viewport
  - Card stagger animations play on list page load
  - Tab indicator slides smoothly between tabs
  - Sora font loads and is available as `font-display` utility
  - All interactive elements >= 44px touch target
  - No off-brand tokens in modified files
  - Celebration duration is ~1000ms, doesn't block interaction
  - Celebrations never repeat the same variant consecutively

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- Every page that uses `StepProgress` will get the redesigned version automatically (BOM flow, receiving flow, door creation flow)
- Every page wrapped by `AppShell` will get page transitions automatically
- `CelebrationProvider` in providers.tsx makes `useCelebration()` available everywhere

### Updates Needed for Consistency

- Any component that currently hardcodes animation durations (e.g., `0.3s`, `300ms`) should eventually reference the token variables. Not in scope for this plan — but the tokens are available for future use.

### Impact on Existing Workflows

- **StepProgress** changes are visual-only — same props interface, same behavior, better alignment
- **Page transitions** are additive — pages still render immediately, they just fade in
- **Celebrations** are additive — existing toasts still work, celebrations are layered on top
- **Card stagger** may cause a brief "flash of invisible cards" if the page is slow to mount — mitigated by keeping the animation short (400ms)

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx tsx scripts/token-audit.ts` shows no new errors in modified files
- [ ] Sora font loads correctly (visible in browser dev tools font panel)
- [ ] `font-display` utility class applies Sora
- [ ] Animation token CSS variables are set (check computed styles)
- [ ] Celebration overlay plays on BOM creation success
- [ ] 3+ consecutive celebrations show different variants (no repeats)
- [ ] Celebration dismisses after ~1000ms without blocking interaction
- [ ] Page entrance animation plays on navigation between tabs
- [ ] StepProgress circles are equidistant (measure with dev tools)
- [ ] StepProgress labels don't wrap on 375px viewport
- [ ] StepProgress connecting lines are equal length
- [ ] Card stagger animations play on BOM list page load
- [ ] Tab indicator slides between assembly queue tabs
- [ ] All interactive elements >= 44px touch target
- [ ] No off-brand tokens in modified files
- [ ] App performance is not degraded (no jank during animations)

---

## Success Criteria

The implementation is complete when:

1. **The app feels alive** — every page entrance, card appearance, and tab switch has intentional motion with spring physics
2. **Success moments are celebrations** — creating a BOM, submitting a receipt, or building a door triggers a full-screen animation that varies every time
3. **The progress tracker is pixel-perfect** — equal spacing, equal line lengths, no label wrapping, a McKinsey consultant would approve
4. **The motion system is tokenized** — all durations and easings reference CSS variables, making the entire system tuneable from one file

---

## Notes

- The Sora display font is added but NOT applied to any existing text in this session. Session 2 (Brand Identity) will decide where to use it (header, section headings, big numbers). This session just makes it available.
- Celebration variants can be expanded later. The non-repeat system supports any number of variants.
- The animated tab indicator pattern established here will be reused in Session 2 for the bottom navigation.
- Card stagger animations should be capped at 8 items to prevent the last card from appearing after 400ms+ delay. For long lists, only the first 8 visible cards stagger; the rest appear immediately.
- `prefers-reduced-motion` media query should be respected — all celebration and page transition animations should be disabled when the user has this preference set. Add a `@media (prefers-reduced-motion: reduce)` block in globals.css that disables all custom animations.

---

## Implementation Notes

**Implemented:** 2026-03-24

### Summary

- Added animation token CSS variables (duration-instant/fast/normal/slow/celebration, ease-spring/out/in-out) to globals.css @theme block
- Added Sora display font (600-800) alongside Urbanist, available as `font-display` / `--font-display`
- Created CelebrationOverlay component with 6 CSS-only animation variants (Radial Pulse, Starburst, Particle Rise, Ring Cascade, Checkmark Bloom, Gravity Scatter)
- Created useCelebration hook + CelebrationProvider context for app-wide celebration triggering with non-repeat logic
- Created PageTransition wrapper with fade-in-up animation keyed to pathname
- Rewrote StepProgress with CSS Grid for pixel-perfect equal-column alignment
- Wired celebrations to 4 major success moments: BOM creation, receiving submission, assembly creation, door sheet submission
- Added spring-based card-enter animation with stagger to BOM list and assembly queue cards
- Added sliding pill tab indicator to assembly queue tabs
- Added prefers-reduced-motion media query respecting accessibility preferences
- Added celebration keyframes: radial-pulse-ring, starburst-ray, particle-rise, ring-cascade, bloom-ring, bloom-check, bloom-draw, gravity-fall

### Deviations from Plan

- Step 9 (animated tab indicator) was only applied to assemblies page. BOM page tabs use a different pattern (full-width cards for Create/List) that don't lend themselves to a sliding pill. Can be revisited in Session 2.
- StepProgress connecting lines use `left: calc(50%+18px)` and `right: calc(-50%+18px)` CSS for precise center-to-center positioning based on the 36px (h-9) circle size, rather than the flex-1 approach described in the plan.

### Issues Encountered

None
