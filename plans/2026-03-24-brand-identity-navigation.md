# Plan: Brand Identity & Navigation

**Created:** 2026-03-24
**Status:** Implemented
**Request:** Session 2 — Rebrand the boring header, apply Sora display font, design custom bottom nav with sliding indicator, establish app personality.

---

## Overview

### What This Plan Accomplishes

Transforms the app's identity from "generic enterprise tool" to "premium command center." The dashboard header becomes a personalized greeting with contextual action summary ("Good afternoon, Gabe — 3 BOMs need approval"). Sora display font is applied to key headings. The bottom nav gets a sliding pill indicator (reusing Session 1's tab-indicator pattern) and an active dot accent. The standard Header component gets a cleaner treatment with Sora for titles.

### Why This Matters

First impressions define whether users think "this is professional" or "this is a toy." The current "Dashboard" / "Inventory" / "Assemblies" titles are flat and interchangeable with any enterprise app. A personalized greeting + action summary turns the header from a label into a command briefing. The bottom nav upgrade with sliding indicator makes navigation feel intentional and polished — the same pattern users love in iOS apps.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Header design direction: industrial-refined aesthetic — bold Sora greeting, compact action summary as a single-line ticker, RSNE logo as identity anchor. Nav icons: keep Lucide but add an active-state dot accent below (custom, not the icon itself) for visual weight. Sliding pill indicator reuses Session 1 pattern. |

### How Skills Shaped the Plan

Frontend-design pushed for restraint on the header — a greeting + one-line action summary is more impactful than cramming stats into the header. The "industrial-refined" tone means bold typography but clean composition. For nav icons, the skill advised against custom SVG icons (maintenance burden, accessibility risk) and instead recommended enhancing Lucide icons with a branded active state: dot accent + scale + color transition.

---

## Current State

### Relevant Existing Structure

| File | Current State |
|------|--------------|
| `src/components/layout/header.tsx` | Generic header: logo + title string + optional back/menu. Navy bg, `text-lg font-bold`. Used on all pages except dashboard. |
| `src/app/page.tsx` | Dashboard has its own inline header: logo + "Dashboard" + menu. No greeting, no action summary. |
| `src/components/layout/bottom-nav.tsx` | 5 tabs with Lucide icons. Active state: `text-brand-blue bg-brand-blue/10`. No indicator. |
| `src/hooks/use-me.ts` | Returns `{ name, email, role }` — name is available for greeting. |
| `src/hooks/use-dashboard.ts` | Returns `DashboardData` with `bomStatusCounts`, `fabrication.pendingApprovals`, `summary.lowStockCount`, `doorQueueCount`, `alerts`. |

### Gaps or Problems Being Addressed

1. **Header is boring** — "Dashboard", "Inventory", "Assemblies" are labels, not experiences
2. **No personalization** — user's name is available but never shown in the UI
3. **No action context** — the foreman has to scroll to find what needs attention
4. **Bottom nav feels generic** — standard Lucide icons with color swap, no motion or personality
5. **No display font usage** — Sora was added in Session 1 but not applied anywhere yet

---

## Proposed Changes

### Summary of Changes

- Redesign dashboard header: personalized greeting (Sora 700), one-line action summary, RSNE logo
- Update standard Header component: Sora for title text, slightly refined layout
- Add sliding pill indicator to bottom nav (reuse Session 1 pattern)
- Add active dot accent below nav icons
- Apply `font-display` (Sora) to page-level headings across the app

### New Files to Create

None — all changes fit within existing files.

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Replace inline header with personalized greeting + action summary |
| `src/components/layout/header.tsx` | Apply Sora to title, refine layout |
| `src/components/layout/bottom-nav.tsx` | Add sliding pill indicator + active dot accent |
| `src/app/globals.css` | Add nav indicator dot keyframe |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Greeting uses first name only**: `"Good morning, Gabe"` not `"Good morning, Gabe Perez"`. First name is warmer, fits mobile width. Extract first word from `me.name`.

2. **Action summary is a single prioritized line**: The header shows ONE action — the most urgent. Priority order: (1) pending approvals → (2) BOMs needing review → (3) low stock items → (4) "All clear." This prevents clutter and gives a single call-to-action.

3. **Time-of-day greeting**: Before 12pm = "Good morning", 12-17 = "Good afternoon", after 17 = "Good evening". Uses client-side `new Date().getHours()`.

4. **Sora for display text, Urbanist stays for body**: Sora 700 on the greeting line and page titles. Urbanist remains for body text, labels, badges. This creates clear typographic hierarchy.

5. **Bottom nav uses dot accent, not custom icons**: Replacing Lucide icons with custom SVGs creates maintenance burden and accessibility risk. Instead, the active tab gets: (a) brand-blue icon at scale-110, (b) a small 4px dot below the label, (c) sliding pill indicator behind the active tab. This makes the nav feel crafted without replacing the icon set.

6. **Dashboard header is unique, other pages use standard Header**: The dashboard gets the greeting + action summary. All other pages keep the standard `<Header title="..." />` but with Sora font applied.

### Alternatives Considered

- **Animated greeting with typewriter effect**: Rejected — would delay information display. Workers need instant context.
- **Multiple action items in header**: Rejected — clutters the header. One prioritized line is cleaner.
- **Custom SVG nav icons**: Rejected — maintenance burden, accessibility risk. Enhanced Lucide icons with branded active state achieves similar effect.
- **Full-width gradient header**: Rejected — the current navy header is clean and established. Just needs better content.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Dashboard Header Redesign

Replace the dashboard's inline header with a personalized greeting and action summary.

**Actions:**

- Import `useMe` hook to get user's name
- Add greeting logic:
  ```tsx
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const firstName = me?.name?.split(" ")[0] || ""
  ```
- Add action summary logic using dashboard data:
  ```tsx
  function getActionSummary(d: DashboardData): string {
    const approvals = d.fabrication.pendingApprovals
    if (approvals > 0) return `${approvals} door${approvals !== 1 ? "s" : ""} awaiting approval`
    const review = d.bomStatusCounts?.PENDING_REVIEW || 0
    if (review > 0) return `${review} BOM${review !== 1 ? "s" : ""} need${review === 1 ? "s" : ""} review`
    const low = d.summary.lowStockCount
    if (low > 0) return `${low} item${low !== 1 ? "s" : ""} running low`
    return "All clear — you're caught up"
  }
  ```
- Replace the header JSX:
  - Navy background with gradient (keep existing)
  - Top row: RSNE logo (left) + menu button (right)
  - Second row: greeting in Sora 700 white, `text-xl`
  - Third row: action summary in `text-sm text-white/70` with a colored dot indicator (orange if action needed, green if all clear)
  - Bottom padding: `pb-3` for breathing room
- Apply `animate-fade-in` to the greeting for a smooth entrance

**Files affected:**
- `src/app/page.tsx`

---

### Step 2: Standard Header Upgrade

Apply Sora display font to the Header component's title.

**Actions:**

- Change the `<h1>` className from `text-lg font-bold text-white` to add `font-display` class:
  ```tsx
  <h1 className="flex-1 text-lg font-bold text-white truncate tracking-tight font-display">
  ```
- This automatically applies Sora 700 to all page titles across the app (Inventory, BOMs, Assemblies, etc.)
- No other changes to the Header component structure

**Files affected:**
- `src/components/layout/header.tsx`

---

### Step 3: Bottom Nav Sliding Indicator

Add the sliding pill indicator to the bottom navigation, reusing Session 1's pattern.

**Actions:**

- Add `useRef` for the nav container and `useState` + `useEffect` for indicator position measurement (same pattern as assemblies page tab indicator)
- Add the sliding indicator div behind the active tab:
  ```tsx
  <div
    className="absolute top-1 bottom-1 rounded-xl bg-brand-blue/10 tab-indicator"
    style={{ left: indicator.left, width: indicator.width }}
  />
  ```
- Update tab items to be `relative z-10` so they render above the indicator
- Keep existing color/scale transitions on tabs

**Files affected:**
- `src/components/layout/bottom-nav.tsx`

---

### Step 4: Active Dot Accent on Nav Icons

Add a small dot below the active tab's label to give visual weight.

**Actions:**

- Below the label `<span>`, add a conditional dot:
  ```tsx
  {isActive && (
    <div className="h-1 w-1 rounded-full bg-brand-blue animate-nav-dot" />
  )}
  ```
- Add the `animate-nav-dot` keyframe to globals.css:
  ```css
  @keyframes nav-dot-in {
    from { opacity: 0; transform: scale(0); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-nav-dot {
    animation: nav-dot-in var(--duration-fast) var(--ease-spring) both;
  }
  ```
- This dot appears with a spring animation when a tab becomes active

**Files affected:**
- `src/components/layout/bottom-nav.tsx`
- `src/app/globals.css`

---

### Step 5: Apply Sora to Key Headings Across App

Apply `font-display` to section headings on major pages that don't use the Header component's title.

**Actions:**

- Dashboard page (`src/app/page.tsx`): The greeting already uses Sora (Step 1). Apply `font-display` to section headings (Action Items, Work Pipelines, etc.) if they exist as visible headings.
- Review each dashboard section component to see if headings exist and if adding `font-display` adds value. Only apply to prominent headings, not labels or badge text.
- This step is conservative — only touch headings that benefit from the display font. Don't over-apply.

**Files affected:**
- `src/app/page.tsx` (already modified in Step 1)
- Potentially: dashboard section components (only if they have prominent headings)

---

### Step 6: Validation & QA

Type check, token audit, and visual verification.

**Actions:**

- Run `npx tsc --noEmit` — verify zero new errors
- Run `npx tsx scripts/token-audit.ts` — verify no new off-brand tokens
- Verify:
  - Dashboard shows personalized greeting with user's first name
  - Greeting changes based on time of day
  - Action summary shows the most urgent item (or "All clear")
  - Action summary dot is orange when actions needed, green when all clear
  - Standard Header shows Sora font on titles
  - Bottom nav has sliding indicator behind active tab
  - Active dot appears with spring animation on tab switch
  - Indicator slides smoothly between tabs
  - All touch targets >= 44px
  - No off-brand tokens in modified files
  - Header looks correct on 375px viewport (no text overflow)

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- Every page that uses `<Header title="..." />` benefits from Sora font automatically (Step 2)
- `src/app/page.tsx` is the main dashboard — changes are self-contained
- `src/components/layout/bottom-nav.tsx` appears on every mobile page

### Updates Needed for Consistency

- The dashboard's custom header and the standard Header component should feel cohesive — both navy, both using Sora, same logo treatment.

### Impact on Existing Workflows

- **Header props unchanged** — `<Header title="..." showBack showMenu />` API stays the same
- **Bottom nav structure unchanged** — same 5 tabs, same routes, same icons. Only visual enhancement.
- **Dashboard data unchanged** — no new API calls. All data for the action summary already exists in `DashboardData`.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx tsx scripts/token-audit.ts` shows no new errors in modified files
- [ ] Dashboard greeting shows first name ("Good morning, Gabe")
- [ ] Greeting is time-appropriate (morning/afternoon/evening)
- [ ] Action summary shows most urgent item
- [ ] "All clear" shows when nothing needs attention
- [ ] Action dot is orange (action needed) or green (all clear)
- [ ] Standard Header title uses Sora font
- [ ] Bottom nav sliding indicator works
- [ ] Active dot appears with spring animation
- [ ] Nav indicator slides between tabs on navigation
- [ ] All touch targets >= 44px
- [ ] No off-brand tokens in modified files
- [ ] No text overflow on 375px viewport

---

## Success Criteria

The implementation is complete when:

1. **Opening the app feels personal** — "Good afternoon, Gabe — 3 BOMs need review" greets the user instantly
2. **Typography has hierarchy** — Sora display font on headings creates clear visual distinction from body text
3. **Navigation feels alive** — sliding indicator and active dot on bottom nav makes every tab switch feel intentional

---

## Notes

- The greeting is client-side (uses `new Date()`). This means it reflects the user's local time, which is correct behavior for a mobile app.
- The action summary priority order (approvals → reviews → low stock → all clear) matches the foreman's mental model: "what's blocking production?" comes first.
- The bottom nav sliding indicator uses the same `tab-indicator` CSS class from Session 1, ensuring consistent spring animation.
- Future Session 3 (Door Sheet) may want to add a unique header treatment for the door builder flow. The standard Header component is flexible enough to support this via the `action` prop.
- The "All clear" state is important — it gives positive reinforcement when there's nothing to do. The green dot makes it feel rewarding.

---

## Implementation Notes

**Implemented:** 2026-03-24

### Summary

- Redesigned dashboard header with personalized time-of-day greeting ("Good afternoon, Gabe") using Sora display font
- Added prioritized action summary with colored dot indicator (orange = action needed, green = all clear)
- Applied Sora display font to standard Header component title (affects all pages)
- Added sliding pill indicator to bottom nav (reuses Session 1 tab-indicator pattern)
- Added spring-animated active dot below active nav tab
- Applied font-display to "Recent Activity" section heading on dashboard
- Added `nav-dot-in` keyframe animation to globals.css

### Deviations from Plan

- Step 5 (Sora on key headings) was kept minimal — only applied to dashboard "Recent Activity" heading. Dashboard section components (ActionItems, WorkPipelines, etc.) have their own heading styles that are better left as Urbanist for now to avoid over-applying the display font.

### Issues Encountered

None
