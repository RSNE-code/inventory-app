# Full App UX Audit — 2026-03-23

**Design References:** Apple Notes (clean/uncluttered) + Monday.com (bold color usage, list structure, transitions)
**Rule:** Use RSNE brand colors in the same impactful way Monday uses theirs.

---

## Executive Summary

The app has **strong fundamentals** — good color palette, solid animation system, correct spacing conventions, beautiful Urbanist font. But it's **playing it safe**. Colors are diluted to near-invisibility, cards are uniform with no visual hierarchy, touch targets are undersized, and the design system's own tokens/animations are underutilized. The gap is between "clean and functional" and "bold, polished, and memorable."

**The single biggest issue:** The app defines bold design patterns in globals.css (accent bars, gradient borders, spring animations, color tokens) but barely uses them. The CSS is Monday.com-ready; the components are still generic.

---

## CRITICAL (Fix First)

### 1. Touch Targets Below 44px on Mobile
Multiple interactive elements fall below Apple's 44px minimum:

| Component | Current | Location |
|-----------|---------|----------|
| Category filter pills | ~32px (`py-2`) | `category-filter.tsx:22` |
| Voice orb (sm) | 40px (`h-10`) | `voice-orb.tsx:29` |
| BOM status filter pills | ~38px (`py-2.5`) | `boms/page.tsx:85-96` |
| Dashboard menu button | 36px (`h-9`) | `page.tsx:41` |
| PO match clear button | 24px (`h-6`) | `po-match-card.tsx:331` |
| Review confirm/fix buttons | 40px (`h-10`) | `boms/review/page.tsx:175` |
| Dashboard activity rows | ~36px (`py-2.5`) | `page.tsx:142` |
| Low stock list rows | ~36px (`py-2.5`) | `low-stock-list.tsx:27` |

**Fix:** Set explicit `min-h-[44px]` on all interactive elements. Increase pill padding to `py-2.5`/`py-3`. Use `h-11` on icon buttons.

### 2. Text Contrast Fails WCAG AA
- `--color-text-muted: #8899AB` has ~3.2:1 contrast ratio on white. WCAG AA requires 4.5:1.
- Used extensively for secondary labels, timestamps, helper text across every page.

**Fix:** Darken `text-muted` to `#6B7F96` (~4.5:1 contrast).

### 3. Status Badge Colors Nearly Invisible
Status indicators use `/8` opacity backgrounds (roughly 3% visible) on white:
- `bg-status-green/8` for In Stock — barely green
- `bg-status-yellow/8` for Low Stock — barely yellow
- `bg-brand-orange/8` for Pending Review — barely orange
- `bg-gray-100` for Draft — no color at all

**Comparison:** Monday.com uses solid, saturated color pills. Status is visible at a glance.

**Fix:** Increase to `/15` minimum for badge backgrounds. Use `/20` for high-priority states (Low Stock, Out of Stock).

---

## HIGH PRIORITY

### 4. Cards Have No Left Accent Bars (Defined But Unused)
`globals.css` defines `.bom-card-confirmed` (green gradient), `.bom-card-flagged` (orange gradient), `.bom-card-pending` (blue gradient), and `.card-accent-left` — **none are applied anywhere**.

Monday.com's signature pattern is a 3-4px left color bar on every list item. This creates instant visual grouping and status recognition.

**Where to apply:**
- **BOM cards:** Green border for APPROVED, orange for PENDING_REVIEW, blue for DRAFT, red for CANCELLED
- **Product cards:** Green for in-stock, yellow for low stock, red for out of stock
- **Assembly cards:** Status-colored left border
- **Receiving items:** Supplier or PO-colored accent

**Fix:** Add `border-l-4 border-{status-color}` to card components. 1-line change per card.

### 5. No Visual Hierarchy on Dashboard
All 4 summary cards (Total Products, Inventory Value, Low Stock, Out of Stock) look identical — same size, same icon treatment, same spacing. User has no visual entry point.

**Monday.com approach:** Feature the most important metric prominently, deprioritize secondary ones.

**Fix:** Make "Inventory Value" span full width with larger text. Stack the 3 count cards below it in a row. Or: use color-coded backgrounds on the warning cards (Low Stock = yellow tint, Out of Stock = red tint).

### 6. Quick Actions Grid Is Cramped (5 Items in One Row)
`quick-actions.tsx` puts 5 action buttons in `grid-cols-5` with `p-3` padding. Icons are tiny, text wraps awkwardly on iPhone SE/13 Mini.

**Fix:** Show 4 primary actions in a `grid-cols-4` layout with larger icons (`h-6 w-6`), or use 2 rows of 3 with better spacing.

### 7. AI Input Listening State Is Too Subtle
When actively listening, the border is `border-brand-orange/30` and background is `bg-brand-orange/5` — nearly invisible. Soundbar animations use `bg-brand-orange/60`.

**Monday.com approach:** Active states are bold and unmissable.

**Fix:** Use `border-brand-orange bg-brand-orange/10` for listening state. Increase soundbar opacity to `bg-brand-orange/80`.

### 8. Product Card Titles Too Small
`bom-card.tsx` and `product-card.tsx` both use `text-sm` for the primary item name. On mobile, this feels cramped and hard to scan quickly.

**Apple Notes approach:** Primary content is comfortably sized, never feels strained.

**Fix:** Upgrade to `text-base font-semibold` for all card primary names.

---

## MEDIUM PRIORITY

### 9. Inconsistent Badge Styling (3 Different Patterns)
Same visual intent (colored status pill) uses 3 different CSS approaches:
- `bg-status-green/8 text-status-green` (design token + opacity)
- `bg-green-50` (Tailwind default green)
- `bg-brand-orange/[0.06]` (arbitrary opacity)

**Fix:** Standardize on `bg-{token-color}/15 text-{token-color}` pattern everywhere.

### 10. Icon Sizes Have No System
Icons range from 14px to 28px with no clear rationale:
- `h-3.5 w-3.5` (14px) — alert icons, too small
- `h-4 w-4` (16px) — inline icons
- `h-5 w-5` (20px) — nav/action icons
- `h-7 w-7` (28px) — feature entry icons

**Fix:** Adopt a scale: 16px (inline), 20px (action), 24px (feature), and stick to it.

### 11. Transitions Too Fast / Missing
- Category filter buttons use `duration-200` (too snappy, feels abrupt)
- List items appear with no fade-in on data load
- Product card hover has `shadow-brand-md` but no background change or chevron movement
- Cycle count results appear with no animation

**Fix:** Use `duration-300` for interactive elements. Add `animate-fade-in-up` to list items on load. Add `group-hover:translate-x-1` to chevron icons.

### 12. Unselected Filter Buttons Look Inactive
Category pills in unselected state use `bg-surface-secondary text-text-secondary` — they look disabled, not interactive.

**Monday.com approach:** Inactive options still signal "tap me" via subtle color or border.

**Fix:** Use `bg-white border border-border-custom text-navy` for unselected pills. Clear affordance.

### 13. No Breadcrumbs on Sub-Pages
BOM Review, New Assembly, and Cycle Count pages lack breadcrumb navigation. Users lose context of where they are.

**Fix:** Add `<Breadcrumb>` to all detail/sub-pages consistently.

### 14. Spacing Between Cards Too Tight
BOM list uses `space-y-2` between cards. Dashboard uses `space-y-3`. Both feel cramped.

**Apple Notes approach:** Generous whitespace between content blocks.

**Fix:** Standardize to `space-y-3` for card lists, `space-y-4` for section groups.

### 15. Step Progress Bars Break on Small Screens
Step labels are hidden below 400px (`hidden min-[400px]:block`), leaving only numbered circles. Users lose context of what each step means.

**Fix:** Always show abbreviated labels or use a simpler "Step 2 of 5" text indicator on mobile.

### 16. Form Labels Lack Weight Differentiation
All form labels are plain text. Required fields marked with `*` but no bold distinction.

**Fix:** Make required field labels `font-semibold`, optional labels `font-normal`.

---

## LOW PRIORITY

### 17. Product Detail Quantity Oversized
Stock quantity displays at `text-5xl` (48px) — disproportionate to the rest of the page.

**Fix:** Reduce to `text-4xl` or `text-3xl`.

### 18. Empty States Are Generic
Empty state icons use `text-text-muted/60` (very faint). Dashed ring decoration at `/40` opacity is barely visible. No consistency between pages.

**Fix:** Standardize empty state with `text-text-secondary` icons, `border-border-custom/70` ring, and consistent CTA button.

### 19. Border Radius Inconsistency
Cards use `rounded-xl`, some inputs use `rounded-md`, dropdowns use `rounded-md`. No clear system.

**Fix:** `rounded-xl` for cards/containers, `rounded-xl` for inputs (already done in some places), `rounded-full` for pills.

### 20. Off-Brand Colors (127 Errors from UX Lint)
Automated scan found 127 instances of raw Tailwind colors (`text-gray-500`, `bg-gray-100`) instead of design tokens (`text-text-muted`, `bg-surface-secondary`). Mostly in assemblies, cycle counts, and older pages.

**Fix:** Find-and-replace common offenders: `text-gray-500` -> `text-text-secondary`, `bg-gray-100` -> `bg-surface-secondary`, `border-gray-200` -> `border-border-custom`.

### 21. Active Sidebar Nav Needs Stronger Signal
Active nav item has `bg-white/10` — subtle. No left accent bar.

**Fix:** Add `border-l-4 border-brand-blue` to active sidebar items.

### 22. Bottom Nav Active State Lacks Background
Active tab uses `text-brand-blue` + `scale-110` on icon, but no background change.

**Fix:** Add subtle `bg-brand-blue/8` pill behind active tab.

---

## Automated Scan Results

| Check | Errors | Warnings |
|-------|--------|----------|
| Design Token Adherence | 127 | 199 |
| UX Anti-Pattern Lint | — | — |
| Accessibility | — | — |
| **Total** | **127** | **199** |

Top offenders by file:
- `assemblies/[id]/page.tsx` — 15 token errors
- `cycle-counts/page.tsx` — 12 token errors
- `receiving-flow.tsx` — 10 token errors
- `boms/review/page.tsx` — 8 token errors

---

## What's Working Well (Preserve These)

1. **Urbanist font** — Distinctive, readable, professional
2. **Brand color palette** — Navy, blue, orange is bold and memorable
3. **Animation system in CSS** — iOS spring, fade-in-up, stagger delays are well-defined
4. **Card structure** — Consistent `rounded-xl shadow-brand border-border-custom` base
5. **AI input UX** — Voice + text + camera in one bar is elegant
6. **BOM workflow flow** — Step progress + status badges + action buttons per state
7. **Panel checkout sheet** — Brand selection at checkout (not BOM creation) is correct
8. **Swipe-to-delete** — Just added, native iOS feel

---

## Recommended Implementation Order

### Phase 1: Quick Wins (1-2 hours)
1. Increase all touch targets to 44px minimum
2. Add `border-l-4` accent bars to BOM cards, product cards, assembly cards
3. Increase status badge opacity from `/8` to `/15`
4. Darken `text-muted` color token for WCAG compliance
5. Upgrade card title text to `text-base`

### Phase 2: Visual Polish (2-4 hours)
6. Standardize badge styling pattern across all components
7. Add `animate-fade-in-up` to list items on data load
8. Increase listening state visibility on AI input
9. Fix dashboard hierarchy (featured value card + count row)
10. Replace raw Tailwind colors with design tokens (top 30 offenders)

### Phase 3: Design Refinement (4+ hours)
11. Redesign quick actions grid layout
12. Add breadcrumbs to all sub-pages
13. Standardize spacing to `space-y-3`/`space-y-4`
14. Active sidebar/bottom nav accent improvements
15. Empty state visual refresh

---

## Senior PM Review — RICE Prioritization

Ran all 17 findings through RICE scoring (Reach x Impact x Confidence / Effort) with the PM toolkit. Here's the data-driven priority stack:

### Tier 1 — Ship This Week (RICE 2600+, all Small effort)

| # | Finding | RICE Score | Why It Matters to Field Workers |
|---|---------|------------|-------------------------------|
| 1 | Touch targets to 44px | 6,667 | Crew wears gloves, works in sun glare. Fat-finger misses = frustration. |
| 2 | Left accent bars on cards | 6,667 | Foreman scans 20+ BOMs daily. Color bars = instant status recognition without reading. |
| 3 | Status badge opacity /8 → /15 | 3,333 | Outdoor screens wash out faint colors. Badges are invisible in sunlight. |
| 4 | Text muted WCAG fix | 3,333 | Same outdoor readability issue. Timestamps and labels disappear. |
| 5 | AI listening state visibility | 3,333 | Workers speak into phone on noisy job sites. Must see "it's listening" instantly. |
| 6 | Card title text-sm → text-base | 2,667 | Scanning product names at arm's length. 14px is too small. |

### Tier 2 — Ship Next Week (RICE 1200-1600)

| # | Finding | RICE Score | Why It Matters |
|---|---------|------------|----------------|
| 7 | Quick actions grid (5→4 cols) | 1,600 | Text wraps on iPhone SE. Larger targets = fewer mis-taps. |
| 8 | Filter pill affordance | 1,600 | Workers don't explore — if it looks disabled, they won't tap it. |
| 9 | Active nav accent bars | 1,333 | "Where am I?" confusion on sidebar/bottom nav. |
| 10 | Dashboard visual hierarchy | 1,280 | Foreman opens app → all 4 cards look the same → no entry point. |
| 11 | Fade-in animations | 1,280 | Polish. Lists "popping in" feels janky vs smooth fade. |

### Tier 3 — Backlog (RICE < 1100)

| # | Finding | RICE Score | Notes |
|---|---------|------------|-------|
| 12 | Step progress mobile labels | 1,067 | Nice-to-have, numbers work OK |
| 13-15 | Badge/spacing/breadcrumb standardization | 800 each | Consistency debt, not user-blocking |
| 16 | Off-brand color token cleanup | 625 | Tech debt, no user impact |
| 17 | Empty state refresh | 240 | Rarely seen by active users |

### PM Notes — What the Audit Missed

**1. Outdoor/sunlight readability is THE #1 user context.** The audit correctly flagged faint colors but understated why: construction workers use this app outdoors, often in direct sunlight, often with dirty/gloved hands. Every color and touch target decision should be pressure-tested against "can a guy in work gloves, squinting in the sun, use this?" The /8 opacity badges aren't just aesthetically weak — they're functionally invisible in the actual use environment.

**2. Speed of recognition > beauty.** Monday.com's left accent bars aren't decoration — they're a scanning optimization. A foreman checking 15 BOMs needs to see status in 0.5 seconds, not read a badge. Color bars at the card edge do this. This should be Tier 1.

**3. The "first 3 seconds" test.** When a foreman opens the dashboard, what do they see first? Right now: 4 identical cards. What they SHOULD see: the one thing that needs attention (low stock count, pending approvals). Dashboard hierarchy isn't just polish — it's the difference between "open app, see problem, act" and "open app, read 4 cards, figure out what matters."

**4. Voice input is a differentiator — make it obvious.** The AI input listening state being too subtle is a bigger deal than RICE suggests. Voice input is what makes this app special vs competitors. When it's active, it should feel alive and unmissable. This is brand identity, not just UX.

### Bottom Line

**Phase 1 (Tier 1) is 6 small-effort changes that will transform how the app feels in the field.** Every one is a CSS/className change — no logic, no API, no risk. Ship them together as one "field readability" update.
