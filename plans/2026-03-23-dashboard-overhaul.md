# Plan: Dashboard Overhaul — Actionable Command Center

**Created:** 2026-03-23
**Status:** Draft
**Request:** Transform dashboard from vanity metrics to actionable snapshot — "what do I need to deal with right now?"

---

## Overview

### What This Plan Accomplishes

Replaces the current dashboard (4 identical summary cards + activity cards + trend chart) with a triage-oriented command center. The new layout answers "what needs my attention?" in 3 seconds: action items at top, work pipeline status in the middle, inventory context at the bottom. Adds BOM-by-status counts, door queue count, and items approaching reorder to the API.

### Why This Matters

The foreman opens this app while walking to the shop. They don't need to know total product count — they need to know "3 BOMs need approval, 2 doors are waiting, 5 items need reorder." Every second spent hunting for actionable info is a second wasted. The dashboard should function like a triage screen, not a report.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Layout hierarchy (action items → pipelines → context → details), card specs with accent bars, "Needs Attention" card pattern, BOM/Fab pipeline card layout with status rows |
| `engineering-skills` (backend) | Use `prisma.bom.groupBy` for status counts (single query vs 4), `prisma.assembly.count` for door queue, both added to existing Promise.all |
| `product-skills` | Invoked during earlier session — confirmed "what needs action" framing over vanity metrics |

### How Skills Shaped the Plan

The frontend-design skill established the "Industrial Command Center" hierarchy: urgency zone at top (orange accent), pipeline zone middle (blue/orange), context zone bottom. The backend skill confirmed groupBy is the right approach for BOM status counts (one DB round trip instead of four). The layout prioritizes tappable action items over static metrics.

---

## Current State

### Relevant Existing Structure

| File | Purpose |
|------|---------|
| `src/app/api/dashboard/route.ts` | API endpoint — returns summary, lowStockItems, recentTransactions, activeBomCount, alerts, fabrication |
| `src/hooks/use-dashboard.ts` | React Query hook, 30s refetch interval |
| `src/types/index.ts` | DashboardData, StockSummary, FabricationSummary, DashboardAlert types |
| `src/app/page.tsx` | Dashboard page — renders all sections |
| `src/components/dashboard/stock-summary-card.tsx` | Featured value card + alert cards (recently redesigned) |
| `src/components/dashboard/quick-actions.tsx` | 4-col grid of action shortcuts |
| `src/components/dashboard/low-stock-list.tsx` | Low stock items list |
| `src/components/dashboard/inventory-trend-chart.tsx` | Historical trend chart |

### Gaps or Problems Being Addressed

1. **No BOM status breakdown** — API returns one `activeBomCount` number, not per-status
2. **No door queue count** — fabrication summary has pending approvals + in production but not door-specific queue
3. **No "needs action" prioritization** — all cards look the same, no urgency hierarchy
4. **Vanity metrics prominent** — total product count is useless info taking prime real estate
5. **Quick actions grid** — takes space but isn't what the foreman checks first
6. **Trend chart too prominent** — nice context but not actionable, sits too high in the layout

---

## Proposed Changes

### Summary of Changes

- **API**: Add BOM groupBy status counts and door queue count to dashboard endpoint
- **Types**: Extend DashboardData with `bomStatusCounts` and `doorQueueCount`
- **New component**: `ActionItems` — "Needs Attention" card showing items requiring human action
- **New component**: `WorkPipelines` — BOM pipeline + Fabrication pipeline side-by-side cards
- **Rewrite**: `stock-summary-card.tsx` → simplified single inventory value card
- **Remove**: `quick-actions.tsx` from dashboard (still available via bottom nav)
- **Reorder page**: Actions → Pipelines → Value → Low Stock → Trend → Recent Activity

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/dashboard/action-items.tsx` | "Needs Attention" card — tappable rows for BOMs needing review, doors awaiting approval, items needing reorder, out of stock items |
| `src/components/dashboard/work-pipelines.tsx` | Side-by-side BOM pipeline + Fabrication pipeline cards with status row breakdowns |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/dashboard/route.ts` | Add BOM groupBy query + door queue count to Promise.all, include in response |
| `src/types/index.ts` | Add `bomStatusCounts: Record<string, number>` and `doorQueueCount: number` to DashboardData |
| `src/components/dashboard/stock-summary-card.tsx` | Simplify to single inventory value card with inline low/out counts |
| `src/app/page.tsx` | New layout order, import new components, remove quick-actions, remove trend chart from mid-page |

### Files to Delete

None — quick-actions.tsx stays in place (may be used elsewhere or re-added later), just not imported by the dashboard.

---

## Design Decisions

### Key Decisions Made

1. **"Needs Attention" card at top**: The foreman's eye hits this first. Orange accent bar signals urgency. Each row is independently tappable — they can go directly to BOMs or inventory.
2. **BOM pipeline as status rows, not individual cards**: A single card with 4 status rows (Draft: 2, Review: 3, Approved: 4, In Progress: 1) is more scannable than 4 separate cards. Each row gets the matching status dot color.
3. **Remove quick actions from dashboard**: Bottom nav already provides these shortcuts. The dashboard space is better used for status information. Quick actions compete with the actionable items.
4. **Trend chart moved below low stock**: It's context, not action. Low stock list is more immediately useful.
5. **groupBy for BOM counts**: Single Prisma query returning all status counts, more efficient than 4 separate count queries.
6. **Keep recent activity**: It's useful context but now sits at the very bottom where it belongs.

### Alternatives Considered

- **Horizontal scrollable status cards for BOMs**: Rejected — scrolling hides information, status rows in one card are scannable without interaction.
- **Remove trend chart entirely**: Rejected — it provides useful context about inventory value trajectory. Just deprioritized to lower position.
- **Separate door queue card**: Rejected — door queue count fits naturally in the fabrication pipeline card.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Extend Dashboard API with BOM Status Counts + Door Queue

Add two new queries to the existing Promise.all in the dashboard API route.

**Actions:**

- Add `prisma.bom.groupBy({ by: ['status'], where: { status: { in: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'IN_PROGRESS'] } }, _count: true })` to the Promise.all
- Add `prisma.assembly.count({ where: { type: 'DOOR', status: { in: ['PLANNED', 'AWAITING_APPROVAL', 'APPROVED'] } } })` to the Promise.all
- Transform groupBy result into `Record<string, number>` with defaults for missing statuses
- Add `bomStatusCounts` and `doorQueueCount` to the response JSON

**Files affected:**
- `src/app/api/dashboard/route.ts`

---

### Step 2: Extend DashboardData Types

Add the new fields to the TypeScript types.

**Actions:**

- Add `bomStatusCounts: Record<string, number>` to `DashboardData` interface
- Add `doorQueueCount: number` to `DashboardData` interface

**Files affected:**
- `src/types/index.ts`

---

### Step 3: Create ActionItems Component

Build the "Needs Attention" card that shows items requiring human action.

**Actions:**

- Create `src/components/dashboard/action-items.tsx`
- Props: `{ bomStatusCounts, doorQueueCount, lowStockCount, outOfStockCount, pendingApprovals }`
- Build action rows from the data:
  - If `bomStatusCounts.PENDING_REVIEW > 0`: "X BOMs pending review" → `/boms?status=PENDING_REVIEW`
  - If `pendingApprovals > 0`: "X doors awaiting approval" → `/assemblies`
  - If `outOfStockCount > 0`: "X items out of stock" → `/inventory?status=out` (red/critical)
  - If `lowStockCount > 0`: "X items need reorder" → `/inventory?status=low` (yellow/warning)
- Card styling: `card-accent-orange bg-brand-orange/[0.04]`
- Each row: `min-h-[44px]` tappable `<Link>` with icon, text, count badge, `ChevronRight`
- Critical rows (out of stock): `text-status-red` with red dot
- Warning rows: `text-status-yellow` with yellow dot
- Info rows (BOMs, doors): `text-brand-blue` with blue dot
- If zero items need attention: show green "All clear" state with `Check` icon

**Files affected:**
- `src/components/dashboard/action-items.tsx` (new)

---

### Step 4: Create WorkPipelines Component

Build the BOM + Fabrication pipeline cards.

**Actions:**

- Create `src/components/dashboard/work-pipelines.tsx`
- Props: `{ bomStatusCounts, fabrication, doorQueueCount }`
- Two cards in `grid grid-cols-2 gap-3`

**BOM Pipeline card:**
- `card-accent-blue`, tappable → `/boms`
- Header: `ClipboardList` icon + "BOMs" title
- Status rows with colored dots (matching bom-status-badge):
  - Draft (gray dot): count
  - Review (orange dot, pulse): count
  - Approved (blue dot): count
  - In Progress (yellow dot): count
- Only show rows with count > 0

**Fabrication Pipeline card:**
- `card-accent-orange`, tappable → `/assemblies`
- Header: `Factory` icon + "Fabrication" title
- Rows:
  - "X in queue" (includes doorQueueCount context)
  - "X in production" (from fabrication.inProduction)
  - "X completed" (from fabrication.completed)
- Only show rows with count > 0

**Files affected:**
- `src/components/dashboard/work-pipelines.tsx` (new)

---

### Step 5: Simplify StockSummaryCards → Inventory Value Card

Reduce to a single featured card showing inventory value with inline counts.

**Actions:**

- Rewrite `stock-summary-card.tsx` to render a single full-width card:
  - `card-accent-blue`, `overflow-hidden`
  - Large value: `text-3xl font-extrabold text-navy` showing `formatCurrency(totalValue)`
  - Label: "Inventory Value" in `text-xs font-semibold uppercase tracking-wide text-text-muted`
  - Subtitle row: `{totalProducts} products · {lowStockCount} low stock · {outOfStockCount} out`
  - DollarSign icon in `h-12 w-12` container
  - Tap → `/inventory`
- Props stay the same (`{ summary: StockSummary }`) — no interface change needed

**Files affected:**
- `src/components/dashboard/stock-summary-card.tsx`

---

### Step 6: Rebuild Dashboard Page Layout

Wire everything together in the new layout order.

**Actions:**

- Import new components: `ActionItems`, `WorkPipelines`
- Remove import: `QuickActions` (no longer rendered on dashboard)
- New layout order:
  1. `<ActionItems>` — animate-fade-in-up stagger-1
  2. `<WorkPipelines>` — animate-fade-in-up stagger-2
  3. `<StockSummaryCards>` (now single value card) — animate-fade-in-up stagger-3
  4. `<LowStockList>` — animate-fade-in-up stagger-4
  5. `<InventoryTrendChart>` — animate-fade-in-up stagger-5
  6. Recent Activity card — animate-fade-in-up stagger-6
- Pass new data: `dashboard.bomStatusCounts`, `dashboard.doorQueueCount` to ActionItems and WorkPipelines
- Update skeleton loaders to match new layout (action card skeleton, two pipeline card skeletons, value card skeleton)
- Keep error state and empty state as-is

**Files affected:**
- `src/app/page.tsx`

---

### Step 7: Validation & QA

Type check, token audit, and UX verification.

**Actions:**

- Run `npx tsc --noEmit` — verify zero new errors
- Run `npx tsx scripts/token-audit.ts` — verify no new off-brand tokens
- Verify all new components use design tokens (no raw gray classes)
- Verify all tappable elements ≥ 44px touch targets
- Verify dashboard renders correctly when all counts are 0 (empty state)
- Verify dashboard renders when some sections have data and others don't
- Mobile sanity check at 375px: no overflow, proper stacking

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/hooks/use-dashboard.ts` — fetches from the API. No changes needed (response shape extends, doesn't break).
- `src/components/dashboard/quick-actions.tsx` — no longer imported by dashboard page but file stays.

### Updates Needed for Consistency

- None — no CLAUDE.md changes needed, no context files affected.

### Impact on Existing Workflows

- **Dashboard API** returns additional fields. Existing consumers (the hook) destructure `data.data` which will have new optional fields — non-breaking.
- **Quick actions removed from dashboard** but still accessible via bottom nav routes (Receive, Create BOM, Inventory, Assemblies). No functionality lost.
- **Trend chart repositioned** lower — still visible, just not in the prime position.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx tsx scripts/token-audit.ts` shows no new errors in modified/created files
- [ ] Dashboard API returns `bomStatusCounts` with all 4 statuses
- [ ] Dashboard API returns `doorQueueCount`
- [ ] Action Items card shows correct counts and links to correct pages
- [ ] Action Items shows "All clear" when nothing needs attention
- [ ] BOM Pipeline card shows per-status breakdown with colored dots
- [ ] Fabrication Pipeline card shows queue/production/completed counts
- [ ] Inventory Value card shows value, product count, low/out counts
- [ ] All tappable cards link to correct pages
- [ ] All interactive elements ≥ 44px touch target
- [ ] No off-brand gray tokens in new/modified files
- [ ] Skeleton loaders match new layout
- [ ] Dashboard renders correctly with all-zero data

---

## Success Criteria

The implementation is complete when:

1. **A foreman opening the dashboard can identify what needs their attention in under 3 seconds** — action items card is the first thing they see with clear counts and tap-to-act links
2. **BOM and fabrication pipeline status is visible at a glance** — per-status breakdown without tapping into sub-pages
3. **Vanity metrics are deprioritized** — total product count is no longer a standalone card, inventory value provides useful context at a glance
4. **Every card is actionable** — tapping any card navigates to the relevant page with appropriate filters

---

## Notes

- The `quick-actions.tsx` component is not deleted, just removed from the dashboard. If Gabe wants it back or on another page, it's still available.
- The `alerts` array in the API response is now somewhat redundant with the ActionItems component doing its own logic. Could be cleaned up in a future pass, but leaving it for now since it doesn't hurt.
- The doorQueueCount specifically counts doors in pre-production states (PLANNED, AWAITING_APPROVAL, APPROVED). Doors already IN_PRODUCTION are counted in the fabrication pipeline's "in production" number.
- This plan feeds directly into the next planned feature (low stock → order list) since the "items need reorder" action item will eventually link to that module instead of just the inventory page.
