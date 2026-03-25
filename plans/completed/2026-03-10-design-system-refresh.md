# Plan: Design System Refresh — Urbanist Font, Step Progress, Breadcrumbs, Stockout Risk, Responsive Sidebar

**Created:** 2026-03-10
**Status:** Implemented
**Request:** Full design system refresh based on Gabe's UI inspiration images — Urbanist font, step progress indicators, breadcrumb nav, stockout risk detail, and responsive desktop/tablet sidebar layout.

---

## Overview

### What This Plan Accomplishes

A cohesive visual and UX overhaul of the RSNE Inventory App covering five areas: (1) swapping to Urbanist as the primary font, (2) adding step progress indicators to all multi-step workflows, (3) adding breadcrumb navigation for depth awareness, (4) enhancing the product detail page with stockout risk intelligence, and (5) adding a responsive sidebar navigation for desktop/tablet screens while keeping the mobile bottom nav.

### Why This Matters

The app's current UI was built mobile-first during rapid AI-first development. As the app matures toward team-wide deployment, it needs to feel polished, professional, and usable across devices. Gabe's inspiration images establish the visual direction — clean, modern, with clear wayfinding and data-rich detail views. These changes transform the app from a functional prototype into a production-quality tool the entire RSNE team will use daily.

---

## Current State

### Relevant Existing Structure

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout — loads DM Sans + Plus Jakarta Sans fonts, wraps in Providers, renders BottomNav |
| `src/app/globals.css` | Tailwind v4 `@theme inline` config — defines `--font-sans`, `--font-heading`, all RSNE brand colors |
| `src/components/layout/bottom-nav.tsx` | Mobile bottom nav — 5 tabs (Dashboard, BOMs, Inventory, Assemblies, More) |
| `src/components/layout/header.tsx` | Sticky navy header (h-14) with back button, title, optional action |
| `src/app/page.tsx` | Dashboard — stock summary, alerts, active BOMs, fab status, low stock |
| `src/app/inventory/[id]/page.tsx` | Product detail — stock level card, action buttons, details grid, transactions |
| `src/components/receiving/receiving-flow.tsx` | Multi-step: `"INPUT" \| "REVIEW" \| "SUMMARY"` |
| `src/components/doors/door-creation-flow.tsx` | Multi-step: `"INPUT" \| "REVIEW" \| "CONFIRM"` |
| `src/components/bom/bom-ai-flow.tsx` | BOM creation (no explicit phase type — uses conditional rendering) |
| `src/app/assemblies/new/page.tsx` | Assembly creation: `"type" \| "template" \| "details" \| "door-flow"` |

### Gaps or Problems Being Addressed

1. **Font** — DM Sans + Plus Jakarta Sans are functional but generic. Urbanist provides a more modern, distinctive personality.
2. **No step indicators** — Multi-step workflows (receiving, door creation, BOM, assembly) show no visual progress. Users don't know how many steps remain.
3. **No breadcrumbs** — When deep in a detail or workflow page, there's no path context. Users rely on the back button with no visual trail.
4. **Basic product detail** — The stock level card shows a number and reorder point but no stockout risk, no forecast, no allocated/safety breakdown.
5. **Mobile-only layout** — No sidebar navigation for tablet/desktop users. The bottom nav works on phones but wastes screen real estate on wider screens.

---

## Proposed Changes

### Summary of Changes

- Replace DM Sans + Plus Jakarta Sans with Urbanist font family throughout the app
- Create a reusable `StepProgress` component and integrate it into all multi-step workflows
- Create a reusable `Breadcrumb` component and add it to all detail and workflow pages
- Enhance the product detail page with stockout risk gauge, breakdown grid, AI forecast chart, and forecast callout
- Create a `SidebarNav` component that shows on screens >= 768px, hide BottomNav on those screens, adjust layout grid

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/layout/step-progress.tsx` | Reusable numbered step indicator with connecting lines and checkmarks |
| `src/components/layout/breadcrumb.tsx` | Reusable breadcrumb trail component |
| `src/components/layout/sidebar-nav.tsx` | Persistent sidebar navigation for tablet/desktop (≥768px) |
| `src/components/layout/app-shell.tsx` | Layout wrapper that combines sidebar + main content area responsively |
| `src/components/inventory/stockout-risk-card.tsx` | Stockout risk gauge + "In X days" badge + breakdown grid |
| `src/components/inventory/inventory-forecast-chart.tsx` | AI-projected inventory chart with trend line |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/app/globals.css` | Replace font imports and `--font-sans`/`--font-heading` with Urbanist |
| `src/app/layout.tsx` | Replace font imports with Urbanist, swap BottomNav+main for AppShell |
| `src/components/layout/bottom-nav.tsx` | Add `md:hidden` to hide on tablet/desktop |
| `src/components/layout/header.tsx` | Add breadcrumb slot, adjust for sidebar context |
| `src/components/receiving/receiving-flow.tsx` | Add StepProgress component at top of flow |
| `src/components/doors/door-creation-flow.tsx` | Add StepProgress component at top of flow |
| `src/components/bom/bom-ai-flow.tsx` | Add StepProgress component at top of flow |
| `src/app/assemblies/new/page.tsx` | Add StepProgress component at top of flow |
| `src/app/inventory/[id]/page.tsx` | Add breadcrumb, add StockoutRiskCard, add forecast chart |
| `src/app/boms/[id]/page.tsx` | Add breadcrumb |
| `src/app/assemblies/[id]/page.tsx` | Add breadcrumb |
| `src/app/receiving/page.tsx` | Add breadcrumb |
| `src/app/cycle-counts/page.tsx` | Add breadcrumb |
| `src/app/page.tsx` | Responsive grid for dashboard cards on wider screens |
| `src/app/inventory/page.tsx` | Add breadcrumb |
| `src/app/inventory/new/page.tsx` | Add breadcrumb |
| `src/app/inventory/[id]/edit/page.tsx` | Add breadcrumb |
| `src/app/inventory/[id]/adjust/page.tsx` | Add breadcrumb |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Urbanist for both body and headings**: Rather than pairing two fonts, Urbanist's weight range (400–800) covers both roles. This simplifies font loading and creates a more cohesive look. Headings use weight 600-700, body uses 400-500.

2. **StepProgress is a presentation-only component**: It receives `steps` (label array), `currentStep` (index), and optional `completedSteps`. Each workflow maps its own phases to step indices. This keeps the component reusable without coupling to workflow logic.

3. **Breadcrumb is auto-derived from route path**: Rather than manually passing breadcrumb props everywhere, the component reads the pathname and maps route segments to labels using a lookup table. Override props available for custom labels (e.g., product names).

4. **Sidebar uses the same nav items as BottomNav**: Both nav components share the same route config (plus additional items like Receiving, Cycle Counts, Settings that are currently under "More"). The sidebar expands "More" into explicit items.

5. **AppShell wrapper pattern**: A single `AppShell` component wraps the layout, rendering sidebar on md+ and adjusting main content area. This avoids scattering responsive logic across every page.

6. **Stockout risk uses existing data — no new API needed initially**: Days-until-stockout can be estimated from average daily consumption (derived from recent transactions). The AI forecast chart uses a simple projection line. A future enhancement could add a dedicated AI analysis endpoint.

7. **Mobile-first remains the default**: All existing mobile layouts are preserved. Desktop/tablet enhancements are additive via Tailwind responsive prefixes (`md:`, `lg:`).

### Alternatives Considered

- **Two separate fonts (Urbanist + Inter)**: Rejected — single font family is cleaner and reduces load time.
- **Breadcrumb in header bar**: Considered placing breadcrumbs inside the navy header. Rejected — header is already compact (h-14) and breadcrumbs work better below it with more horizontal space.
- **Full dashboard redesign for desktop**: Deferred — the card grid responsive adjustment is sufficient for now. A full desktop dashboard overhaul can come later.

### Open Questions

None — all design direction provided by Gabe's inspiration images and preferences.

---

## Step-by-Step Tasks

### Step 1: Swap to Urbanist Font

Replace DM Sans + Plus Jakarta Sans with Urbanist across the entire app.

**Actions:**

- In `globals.css`: Replace the Google Fonts import URL with Urbanist (weights 400, 500, 600, 700). Update `--font-sans` and `--font-heading` to both use `'Urbanist', sans-serif`.
- In `layout.tsx`: Replace `DM_Sans` and `Plus_Jakarta_Sans` imports with `Urbanist` from `next/font/google`. Configure with weights `["400", "500", "600", "700"]`. Set single CSS variable `--font-urbanist`. Update body className.
- Remove any remaining references to `--font-dm-sans` or `--font-plus-jakarta` variables.

**Files affected:**
- `src/app/globals.css`
- `src/app/layout.tsx`

---

### Step 2: Create StepProgress Component

Build a reusable step progress indicator showing numbered circles connected by lines, with checkmarks on completed steps.

**Actions:**

- Create `src/components/layout/step-progress.tsx`
- Props: `{ steps: string[]; currentStep: number; className?: string }`
- Visual design:
  - Horizontal row of numbered circles (1, 2, 3...) connected by lines
  - Completed steps: filled brand-blue circle with white checkmark, label in brand-blue
  - Current step: filled brand-blue circle with white number, bold label
  - Future steps: gray outlined circle with gray number, muted label
  - Connecting lines: solid brand-blue between completed steps, dashed gray for future
- Responsive: on very small screens, hide labels and show just circles

**Files affected:**
- `src/components/layout/step-progress.tsx` (new)

---

### Step 3: Integrate StepProgress into All Multi-Step Workflows

Add the StepProgress component to every multi-step flow in the app.

**Actions:**

- **Receiving flow** (`src/components/receiving/receiving-flow.tsx`):
  - Steps: ["Input", "Review", "Summary"]
  - Map phase to index: INPUT=0, REVIEW=1, SUMMARY=2
  - Place `<StepProgress>` at the top of the component, above the phase content

- **Door creation flow** (`src/components/doors/door-creation-flow.tsx`):
  - Steps: ["Describe", "Review", "Confirm"]
  - Map phase to index: INPUT=0, REVIEW=1, CONFIRM=2
  - Place at top of component

- **BOM creation flow** (`src/components/bom/bom-ai-flow.tsx`):
  - Read this file first to understand its internal phase pattern
  - Define appropriate steps based on actual flow stages
  - Add StepProgress at top

- **Assembly creation** (`src/app/assemblies/new/page.tsx`):
  - Steps: ["Type", "Template", "Details"] (for panel/floor)
  - For door flow: ["Type", "Describe", "Review", "Confirm"]
  - Map `step` state to index
  - Place at top of page content

**Files affected:**
- `src/components/receiving/receiving-flow.tsx`
- `src/components/doors/door-creation-flow.tsx`
- `src/components/bom/bom-ai-flow.tsx`
- `src/app/assemblies/new/page.tsx`

---

### Step 4: Create Breadcrumb Component

Build a reusable breadcrumb trail component for navigation context.

**Actions:**

- Create `src/components/layout/breadcrumb.tsx`
- Props: `{ items?: Array<{ label: string; href?: string }>; className?: string }`
- If `items` provided, render those. Otherwise, auto-generate from pathname using a route label map.
- Route label map:
  - `/` → "Dashboard"
  - `/inventory` → "Inventory"
  - `/inventory/new` → "New Product"
  - `/inventory/[id]` → product name (passed as override)
  - `/inventory/[id]/edit` → "Edit"
  - `/inventory/[id]/adjust` → "Adjust Stock"
  - `/boms` → "BOMs"
  - `/boms/new` → "New BOM"
  - `/boms/[id]` → BOM name (override)
  - `/assemblies` → "Assemblies"
  - `/assemblies/new` → "New Assembly"
  - `/assemblies/[id]` → assembly name (override)
  - `/receiving` → "Receiving"
  - `/cycle-counts` → "Cycle Counts"
  - `/settings` → "Settings"
- Visual: `Home / Section / Page` with `>` separator, last item non-clickable and bold
- Style: small text, muted color, tucked just below the header with px-4 py-2 bg-surface-secondary
- On mobile: show abbreviated (last 2 segments only) to save space

**Files affected:**
- `src/components/layout/breadcrumb.tsx` (new)

---

### Step 5: Add Breadcrumbs to All Detail and Workflow Pages

Integrate the Breadcrumb component into every page that isn't a top-level list.

**Actions:**

- Add `<Breadcrumb>` immediately below `<Header>` on each page
- For pages with dynamic titles (product detail, BOM detail, assembly detail), pass the entity name as the last breadcrumb item
- Pages to update:
  - `src/app/inventory/[id]/page.tsx` — items: [Inventory, {product.name}]
  - `src/app/inventory/[id]/edit/page.tsx` — items: [Inventory, {product.name}, Edit]
  - `src/app/inventory/[id]/adjust/page.tsx` — items: [Inventory, {product.name}, Adjust Stock]
  - `src/app/inventory/new/page.tsx` — items: [Inventory, New Product]
  - `src/app/boms/[id]/page.tsx` — items: [BOMs, {bom.jobName}]
  - `src/app/boms/new/page.tsx` — items: [BOMs, New BOM]
  - `src/app/assemblies/[id]/page.tsx` — items: [Assemblies, {assembly.name}]
  - `src/app/assemblies/new/page.tsx` — items: [Assemblies, New Assembly]
  - `src/app/receiving/page.tsx` — items: [Receiving]
  - `src/app/cycle-counts/page.tsx` — items: [Cycle Counts]

**Files affected:**
- All pages listed above

---

### Step 6: Create Stockout Risk Card Component

Build the stockout risk visualization for product detail pages.

**Actions:**

- Create `src/components/inventory/stockout-risk-card.tsx`
- Props: `{ product: ProductWithTransactions }` (currentQty, reorderPoint, transactions, safetyStock, allocatedQty, etc.)
- Sections:
  1. **Risk Gauge**: Semi-circular gauge from green (safe) → yellow (watch) → red (critical). Position based on days-until-stockout estimate.
  2. **"In X days" Badge**: Bold badge showing estimated days until stockout. Color-coded (green/yellow/red).
  3. **Breakdown Grid**: 3 cells showing Available / Allocated / Safety Stock with values and labels.
  4. **AI Forecast Callout**: A text callout with light blue background: "Based on {N}-day consumption trend, reorder by {date} to avoid stockout." Simple calculation from average daily consumption rate.
- Days-until-stockout calculation: `availableQty / avgDailyConsumption`. avgDailyConsumption derived from CHECKOUT/CONSUME transactions in last 30-60 days.
- If no consumption data, show "Insufficient data" state instead of gauge.
- If product has allocatedQty field, use it. Otherwise default to 0. Safety stock = reorderPoint (approximation).

**Files affected:**
- `src/components/inventory/stockout-risk-card.tsx` (new)

---

### Step 7: Create Inventory Forecast Chart Component

Build a projected inventory chart showing historical and forecasted stock levels.

**Actions:**

- Create `src/components/inventory/inventory-forecast-chart.tsx`
- Props: `{ product: ProductWithTransactions }`
- Uses a simple SVG or lightweight chart approach (avoid heavy chart libraries — use a basic SVG line chart)
- Shows:
  - Last 30 days of actual stock levels (derived from transactions, walking backwards from current qty)
  - Next 14 days projected (dashed line, based on avg consumption rate)
  - Reorder point as a horizontal dashed red line
  - Zero line
- Color: Actual = brand-blue solid, Projected = brand-blue dashed, Reorder = status-red dashed
- Card wrapper with "Projected Inventory" heading
- If insufficient transaction data (< 3 transactions), show a "Not enough data to project" message

**Files affected:**
- `src/components/inventory/inventory-forecast-chart.tsx` (new)

---

### Step 8: Integrate Stockout Risk into Product Detail Page

Add the new stockout risk components to the product detail page.

**Actions:**

- In `src/app/inventory/[id]/page.tsx`:
  - Import `StockoutRiskCard` and `InventoryForecastChart`
  - Add `<StockoutRiskCard>` between the stock level card and the action buttons
  - Add `<InventoryForecastChart>` after the details card, before recent activity
  - Only show these for TIER_1 products (tracked inventory)
  - Pass the product object (which already includes transactions from the API)

**Files affected:**
- `src/app/inventory/[id]/page.tsx`

---

### Step 9: Create Sidebar Navigation Component

Build the persistent sidebar for tablet and desktop screens.

**Actions:**

- Create `src/components/layout/sidebar-nav.tsx`
- Visible only on `md:` and above (≥768px), hidden on mobile
- Design:
  - Fixed left sidebar, full height, width 240px (lg: 260px)
  - Navy background (`bg-navy`) matching header
  - RSNE logo at top (existing `/logo.jpg`)
  - Nav items with icon + label, vertical list
  - Active item: white text with subtle bg highlight (`bg-navy-light`)
  - Inactive: muted white text (`text-white/60`)
  - Items: Dashboard, Inventory, BOMs, Assemblies, Receiving, Cycle Counts, Settings
  - Bottom: user name/role badge (from useMe hook)
- Nav items array (expanded from BottomNav's 5 tabs):
  ```
  Dashboard → /
  Inventory → /inventory
  BOMs → /boms
  Assemblies → /assemblies
  Receiving → /receiving
  Cycle Counts → /cycle-counts
  Settings → /settings
  ```

**Files affected:**
- `src/components/layout/sidebar-nav.tsx` (new)

---

### Step 10: Create AppShell Layout Wrapper

Build the responsive layout wrapper that combines sidebar + main content.

**Actions:**

- Create `src/components/layout/app-shell.tsx`
- Renders:
  - On mobile (<768px): just `{children}` with `pb-16` for bottom nav
  - On md+: sidebar on left + scrollable main content area on right
- Uses Tailwind responsive classes:
  ```
  <div className="md:flex">
    <SidebarNav className="hidden md:flex" />
    <main className="flex-1 md:ml-[240px] pb-16 md:pb-0">
      {children}
    </main>
  </div>
  ```
- Update `layout.tsx` to use `<AppShell>` instead of raw `<main>` + `<BottomNav>`

**Files affected:**
- `src/components/layout/app-shell.tsx` (new)
- `src/app/layout.tsx`

---

### Step 11: Update BottomNav for Responsive Hiding

Hide the bottom nav on tablet/desktop where the sidebar takes over.

**Actions:**

- In `src/components/layout/bottom-nav.tsx`:
  - Add `md:hidden` to the outer `<nav>` className
  - No other changes needed — the BottomNav continues to work exactly as-is on mobile

**Files affected:**
- `src/components/layout/bottom-nav.tsx`

---

### Step 12: Responsive Dashboard Grid

Make the dashboard use a multi-column grid on wider screens.

**Actions:**

- In `src/app/page.tsx`:
  - Wrap the main content cards in a responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
  - Stock summary and alerts can span full width on desktop: `md:col-span-2 lg:col-span-3`
  - Quick action buttons, active BOMs, fab status, low stock, recent activity flow into the grid naturally

**Files affected:**
- `src/app/page.tsx`

---

### Step 13: Build Verification

Run the app build to catch any TypeScript or import errors.

**Actions:**

- Run `cd rsne-inventory && npm run build`
- Fix any TypeScript errors
- Verify the app renders correctly in dev mode

**Files affected:**
- Any files with errors discovered during build

---

## Connections & Dependencies

### Files That Reference This Area

- Every page in the app uses `Header` and `BottomNav` through `layout.tsx`
- Font variables are used implicitly via Tailwind's `font-sans` utility everywhere
- The `globals.css` theme is the foundation for all styling

### Updates Needed for Consistency

- `CLAUDE.md` — update "Tech Stack" and font references
- `MEMORY.md` — add note about Urbanist font and new layout components

### Impact on Existing Workflows

- All existing functionality is preserved. Changes are purely additive (new components, responsive classes).
- No API changes, no database changes, no business logic changes.
- All mobile layouts remain identical — desktop/tablet enhancements layer on top.

---

## Validation Checklist

- [ ] Urbanist font renders correctly for both body and heading text
- [ ] Old font references (DM Sans, Plus Jakarta Sans) are fully removed
- [ ] StepProgress component shows in receiving flow, door creation, BOM creation, and assembly creation
- [ ] Step indicators correctly track current step and show checkmarks for completed steps
- [ ] Breadcrumbs appear on all detail and workflow pages with correct labels
- [ ] Breadcrumb links navigate correctly
- [ ] Stockout risk card shows on Tier 1 product detail pages with gauge and breakdown
- [ ] Inventory forecast chart renders historical + projected lines
- [ ] Sidebar nav appears on screens ≥768px with all 7 nav items
- [ ] Bottom nav hides on screens ≥768px
- [ ] Sidebar active state highlights correctly based on current route
- [ ] Dashboard cards arrange in multi-column grid on wider screens
- [ ] App builds without TypeScript errors (`npm run build`)
- [ ] Mobile layouts are unchanged — no regressions on small screens

---

## Success Criteria

The implementation is complete when:

1. The entire app uses Urbanist font exclusively — no DM Sans or Plus Jakarta Sans references remain
2. Every multi-step workflow shows a step progress indicator that accurately tracks progress
3. Every non-top-level page shows a breadcrumb trail for navigation context
4. Product detail pages for Tier 1 items display stockout risk intelligence (gauge, breakdown, forecast)
5. Screens ≥768px show a persistent sidebar nav and hide the bottom nav; mobile is unchanged
6. The app builds clean with `npm run build`

---

## Notes

- The stockout risk calculation is a simple heuristic (avg daily consumption from recent transactions). A future enhancement could add a dedicated AI endpoint for more sophisticated forecasting.
- The forecast chart uses basic SVG to avoid adding a charting library dependency. If richer charts are needed later, recharts or Chart.js could be added.
- The sidebar nav items expand on what was previously hidden under "More" (Receiving, Cycle Counts get their own sidebar entries).
- Urbanist is available on Google Fonts with the weights we need (400-700), and via next/font/google for optimal loading.

---

## Implementation Notes

**Implemented:** 2026-03-10

### Summary

All 13 steps executed successfully. Urbanist font replaced DM Sans + Plus Jakarta Sans. StepProgress added to 4 workflows (receiving, door creation, BOM, assembly). Breadcrumb nav added to 10 pages. StockoutRiskCard and InventoryForecastChart added to product detail (Tier 1 only). SidebarNav + AppShell created for responsive desktop/tablet layout. BottomNav hidden on md+. Dashboard uses responsive grid.

### Deviations from Plan

- BomAIFlow has no explicit phases, so the step indicator derives current step from state (job name filled → materials added → confirmed items exist) rather than a phase enum.
- AppShell renders both SidebarNav and BottomNav internally, rather than having them as separate siblings in layout.tsx. Cleaner encapsulation.
- Dashboard responsive grid uses two `grid` sections (secondary cards + low stock/activity) rather than a single 3-column grid, for better visual flow.

### Issues Encountered

None — build passed clean on first attempt.
