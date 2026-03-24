# Plan: Reorder List — Shopping List for the Office Manager

**Created:** 2026-03-24
**Status:** Implemented
**Request:** Reference tool showing items needing reorder, grouped by supplier, with copy-to-clipboard for ordering

---

## Overview

### What This Plan Accomplishes

Adds a Reorder List page that shows all products at or below their reorder point, grouped by supplier. Each supplier group shows items with suggested order quantities and estimated costs. The office manager can copy a supplier's order list to clipboard and paste it into an email or Knowify to place the order. Accessible from the dashboard "needs reorder" link and inventory page.

### Why This Matters

Currently, "18 items need reorder" in the dashboard is informational but not actionable. The office manager has to manually check each low-stock item, figure out who supplies it, and decide how much to order. This tool turns that into a one-page shopping list grouped by vendor — ready to act on.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Layout: summary bar at top (total items, cost, suppliers), supplier groups as cards with orange accent bars, dense item rows within groups, "Copy to Clipboard" button per group. Think "shopping list grouped by store." |
| `engineering-skills` (backend) | Two-query approach: load all TIER_1 products + filter in JS for cross-column comparison, then `distinct: ["productId"]` with `orderBy: desc` on RECEIVE transactions to get most recent supplier per product. No raw SQL needed. |

### How Skills Shaped the Plan

The backend skill solved the "products don't have a direct supplier" problem — we infer supplier from the most recent RECEIVE transaction's receipt. The frontend skill defined the layout as a manifest/shopping list (dense rows, not cards) with copy-to-clipboard formatting that the OM can paste directly into emails.

---

## Current State

### Relevant Existing Structure

| File | Relevance |
|------|-----------|
| `src/app/api/dashboard/route.ts` | Already computes `lowStockCount` and `outOfStockCount` |
| `src/components/dashboard/action-items.tsx` | "X items need reorder" links to `/inventory?status=low` — will update to link to reorder list |
| `src/components/dashboard/low-stock-list.tsx` | Shows top 10 low stock items — complementary, not replaced |
| `prisma/schema.prisma` | Product has `currentQty`, `reorderPoint`, `lastCost`, `avgCost`. Supplier linked through Receipt → Transaction. |

### Gaps or Problems Being Addressed

1. **No reorder reference** — low stock alerts exist but no actionable "what to order" view
2. **No supplier grouping** — items are shown individually, not by vendor
3. **No suggested quantities** — OM has to calculate how much to order
4. **No export/copy** — can't easily get the list into Knowify or email

---

## Proposed Changes

### Summary of Changes

- New API endpoint: `GET /api/reorder-list` — returns low-stock products grouped by supplier
- New page: `src/app/reorder/page.tsx` — reorder list view with supplier groups
- New component: `src/components/inventory/reorder-list.tsx` — supplier group cards with items and copy button
- Update dashboard action items link from `/inventory?status=low` to `/reorder`
- Add "Reorder List" link to inventory page header

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/app/api/reorder-list/route.ts` | API endpoint returning low-stock products grouped by supplier |
| `src/app/reorder/page.tsx` | Reorder list page |
| `src/components/inventory/reorder-list.tsx` | Supplier group cards with items, copy-to-clipboard |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/action-items.tsx` | Change "needs reorder" link from `/inventory?status=low` to `/reorder` |

---

## Design Decisions

### Key Decisions Made

1. **New page at `/reorder` not a tab within inventory**: This is a distinct workflow — the OM opens it to prep orders, not to browse inventory. Clean URL, clean purpose.
2. **Supplier inferred from most recent receipt**: Products don't have a `supplierId` field. We look at the most recent RECEIVE transaction to determine who last supplied each item. Products with no receiving history go in an "Unknown Supplier" group.
3. **Copy to clipboard, not CSV export**: The OM pastes into emails and Knowify. Plain text in clipboard is more useful than a downloaded file. Format: product name, qty, est. cost in a simple table.
4. **Suggested qty = reorderPoint - currentQty**: Simple and transparent. Shows "how many to get back to the reorder point." Can be refined later with lead time or order multiples.
5. **Include both low stock AND out of stock**: Out of stock items are the most urgent. They show first within each supplier group with red accent.

### Alternatives Considered

- **Tab within inventory page**: Rejected — inventory page is for browsing/searching. Reorder is a different mental model (action prep, not discovery).
- **Full PO creation system**: Rejected — RSNE uses Knowify for POs. This is a reference/decision tool, not a replacement.
- **CSV download**: Rejected — copy to clipboard is faster for the OM's workflow (paste into email/Knowify).

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Create Reorder List API Endpoint

Build the API that returns low-stock products grouped by supplier.

**Actions:**

- Create `src/app/api/reorder-list/route.ts`
- GET handler:
  - `requireAuth()` + role check: ADMIN, OPERATIONS_MANAGER, OFFICE_MANAGER
  - Query 1: Load all active TIER_1 products with category
  - Filter in JS: `currentQty <= reorderPoint && reorderPoint > 0`
  - Also include: `currentQty <= 0` (out of stock)
  - Query 2: For all low-stock product IDs, get most recent RECEIVE transaction per product using `distinct: ["productId"]` + `orderBy: { createdAt: "desc" }`, including `receipt.supplier`
  - Build supplier map: `Map<supplierId, { supplier, products[] }>`
  - Products with no receiving history → "Unknown Supplier" group
  - For each product: compute `suggestedQty = max(0, reorderPoint - currentQty)`, `estimatedCost = suggestedQty * lastCost`
  - Sort: out-of-stock items first within each group, then by name
  - Response: `{ data: { groups: SupplierGroup[], summary: { totalItems, totalEstimatedCost, supplierCount } } }`

**Files affected:**
- `src/app/api/reorder-list/route.ts` (new)

---

### Step 2: Create Reorder List Component

Build the supplier group cards with items and copy button.

**Actions:**

- Create `src/components/inventory/reorder-list.tsx`
- Fetches from `/api/reorder-list` via React Query
- **Summary bar** at top: Card with `card-accent-orange`, showing total items, total estimated cost, number of suppliers
- **Supplier groups**: One Card per supplier with `card-accent-orange overflow-hidden`
  - Header: supplier name (text-base font-bold) + item count badge + estimated subtotal
  - "Copy to Clipboard" button in header: `clipboard` icon, `text-brand-blue text-sm font-semibold`
  - Item rows within the card: dense rows with `min-h-[44px] py-2.5 border-b border-border-custom/40`
    - Product name (text-sm font-semibold truncate)
    - Current qty / reorder point (text-xs text-text-muted)
    - Suggested order qty (text-sm font-bold text-brand-orange tabular-nums)
    - Est. cost (text-xs text-text-muted tabular-nums)
  - Out of stock items: `text-status-red` on the current qty, red dot indicator
- **Copy format**: Plain text table per supplier:
  ```
  REORDER LIST — {Supplier Name}
  Date: {today}

  {Product Name} — Qty: {suggestedQty} — Est: ${cost}
  {Product Name} — Qty: {suggestedQty} — Est: ${cost}

  Total: {count} items — Est. ${totalCost}
  ```
- **Empty state**: If no items need reorder, show EmptyState with CheckCircle + "Inventory is healthy — nothing to reorder"
- **Loading state**: Skeleton shimmer matching the layout shape

**Files affected:**
- `src/components/inventory/reorder-list.tsx` (new)

---

### Step 3: Create Reorder Page

Simple page wrapper with header and the ReorderList component.

**Actions:**

- Create `src/app/reorder/page.tsx`
- Header: "Reorder List" with back button
- Render `<ReorderList />`
- `animate-page-enter` on the content

**Files affected:**
- `src/app/reorder/page.tsx` (new)

---

### Step 4: Update Dashboard Link

Change the "needs reorder" action item to link to `/reorder` instead of `/inventory?status=low`.

**Actions:**

- In `src/components/dashboard/action-items.tsx`, find the low stock row
- Change `href: "/inventory?status=low"` to `href: "/reorder"`

**Files affected:**
- `src/components/dashboard/action-items.tsx`

---

### Step 5: Validation & QA

Type check, token audit, UX verification.

**Actions:**

- Run `npx tsc --noEmit` — zero new errors
- Run `npx tsx scripts/token-audit.ts` — no new off-brand tokens
- Verify reorder page shows at `/reorder`
- Verify copy to clipboard produces clean text format
- Verify empty state shows when all items are above reorder point
- Verify out-of-stock items show with red indicator
- All touch targets >= 44px
- No off-brand tokens in new files

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/dashboard/action-items.tsx` — links to reorder page (updated in Step 4)
- `src/components/dashboard/low-stock-list.tsx` — complementary, shows top 10 in dashboard. Not changed.

### Updates Needed for Consistency

- None — this is a new page, no existing references to update.

### Impact on Existing Workflows

- **Dashboard "needs reorder" link changes** from inventory filtered view to dedicated reorder page. More actionable.
- **No other workflows affected** — this is a read-only reference tool.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx tsx scripts/token-audit.ts` shows no new errors in new files
- [ ] Reorder list API returns products grouped by supplier
- [ ] Products with no receiving history show under "Unknown Supplier"
- [ ] Suggested qty = reorderPoint - currentQty
- [ ] Out of stock items show with red indicator and appear first in group
- [ ] Copy to clipboard produces clean text format
- [ ] Empty state shows "Inventory is healthy" when nothing needs reorder
- [ ] Dashboard "needs reorder" links to `/reorder`
- [ ] All touch targets >= 44px
- [ ] Loading state uses skeleton shimmer

---

## Success Criteria

The implementation is complete when:

1. **The office manager can open `/reorder` and see all items needing reorder grouped by supplier** with quantities and costs
2. **Copy to clipboard works** — tapping copy on a supplier group puts a formatted text list in the clipboard ready to paste into email or Knowify
3. **Dashboard links to the reorder page** — "X items need reorder" goes to `/reorder`

---

## Notes

- The "Unknown Supplier" group will contain items that have never been received through the system. As receiving usage grows, this group should shrink naturally.
- The suggested qty formula (`reorderPoint - currentQty`) is simple. A future enhancement could factor in lead time, order multiples (e.g., "order in cases of 12"), or historical usage rates.
- This page is read-only — no mutations. It's a reference tool, not a PO creator.
- Could add a "Last ordered" date per item in a future iteration (from most recent PO line item).
