# Plan: Finished Goods Shipping Workflow

**Created:** 2026-03-23
**Status:** Implemented
**Request:** Give completed assemblies a path to jobs — finished goods view, ship-to-job flow, batch shipping

---

## Overview

### What This Plan Accomplishes

Adds a "Ready to Ship" tab to the Assemblies page showing completed fabricated items (doors, panels) grouped by job. Foremen can ship individual items or batch-ship everything for a job with one tap. Adds a batch-ship API endpoint that transitions assemblies to SHIPPED in a single transaction. Expands the SHIPPED role check to include Shop Foreman.

### Why This Matters

Currently, completed assemblies sit in a list with no clear path to "this is done, it goes to Job X." The foreman has to individually mark each item shipped with no job context. Grouping by job and enabling batch shipping matches how the physical world works — you load a truck for a job, not for individual items.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Page layout: job-grouped cards with green accent bars, item rows within cards, "Ship" per item + "Ship All" per job group. Third tab on Assemblies page (not new nav item). Recently Shipped tab for history. |
| `engineering-skills` (backend) | Batch ship endpoint in a transaction (not N individual PATCH calls). Client-side grouping (dataset is small). Add SHOP_FOREMAN to SHIPPED role check. |

### How Skills Shaped the Plan

The frontend skill established that this should be a tab within Assemblies (not a new page or nav item), keeping navigation simple. The backend skill confirmed that a batch endpoint is worth building for data consistency, but grouping should stay client-side since the completed assembly count is always small. Adding SHOP_FOREMAN to the ship role removes unnecessary friction.

---

## Current State

### Relevant Existing Structure

| File | Purpose |
|------|---------|
| `src/app/assemblies/page.tsx` | Assembly list with "Door Shop" and "Fabrication" tabs |
| `src/app/api/assemblies/[id]/route.ts` | PATCH endpoint — handles SHIPPED status, sets `shippedAt`, role check for ADMIN/OPERATIONS_MANAGER |
| `src/hooks/use-assemblies.ts` | `useAssemblies({ status })` filter, `useUpdateAssembly()` mutation |
| `prisma/schema.prisma` | Assembly model with `status`, `shippedAt`, `jobName`, `jobNumber` fields |

### Gaps or Problems Being Addressed

1. **No finished goods view** — completed assemblies are mixed into the fabrication list with no grouping
2. **No batch shipping** — each item must be individually marked shipped via the detail page
3. **No job grouping** — foreman can't see "what's ready for this job?"
4. **SHOP_FOREMAN can't ship** — only ADMIN/OM can, but the foreman is the one loading the truck
5. **No shipping history** — no view of recently shipped items

---

## Proposed Changes

### Summary of Changes

- Add "Ready to Ship" as a third tab on the Assemblies page
- Create a FinishedGoodsList component showing completed assemblies grouped by job
- Add batch-ship API endpoint (`POST /api/assemblies/batch-ship`)
- Expand SHIPPED role check to include SHOP_FOREMAN
- Add "Recently Shipped" tab within the Ready to Ship view

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/shipping/finished-goods-list.tsx` | Grouped list of completed assemblies with ship actions |
| `src/app/api/assemblies/batch-ship/route.ts` | Batch ship endpoint — marks multiple assemblies SHIPPED in a transaction |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/assemblies/page.tsx` | Add third tab "Ready to Ship", render FinishedGoodsList when active |
| `src/app/api/assemblies/[id]/route.ts` | Add SHOP_FOREMAN to SHIPPED role check |
| `src/hooks/use-assemblies.ts` | Add `useBatchShip()` mutation hook |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Third tab on Assemblies, not a new page**: Keeps navigation simple. Assemblies page already has tabs — adding one more is natural. No new bottom nav item needed (already at 5 max).
2. **Group by jobName client-side**: The number of completed assemblies at any time is small (<50). A `reduce` by `jobName` in the component is simpler than a server-side groupBy query.
3. **Batch ship in a transaction**: Prevents partial state if one update fails. Single API call, single success/error response.
4. **Ship button per item + Ship All per job**: Foreman might need to hold one item back (e.g., not ready yet). Individual + batch gives both options.
5. **SHOP_FOREMAN can ship**: Removes friction. Shipping is logistics, not finance. The foreman is physically loading the truck.
6. **"No Job Assigned" group at bottom**: Items without a jobName still show up but are separated. Ship button works but the item goes to SHIPPED without job context.

### Alternatives Considered

- **New page at `/shipping`**: Rejected — adds a route that needs its own nav item. Tab within Assemblies is cleaner.
- **Individual PATCH calls for batch**: Rejected — partial failure risk. Transaction is safer.
- **Server-side groupBy**: Rejected — unnecessary complexity for a small dataset.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Add Batch Ship API Endpoint

Create a new endpoint that accepts an array of assembly IDs and marks them all SHIPPED in a transaction.

**Actions:**

- Create `src/app/api/assemblies/batch-ship/route.ts`
- POST handler:
  - `requireAuth()` + `requireRole(user.role, ["ADMIN", "OPERATIONS_MANAGER", "SHOP_FOREMAN"])`
  - Validate body: `z.object({ assemblyIds: z.array(z.string().uuid()).min(1) })`
  - Verify all assemblies exist and are in COMPLETED status
  - `prisma.$transaction`: update all assemblies to `status: "SHIPPED"`, `shippedAt: new Date()`
  - Return `{ data: { shipped: count } }`
  - Error handling: 400 for validation, 401 for auth, 409 if any assembly isn't COMPLETED

**Files affected:**
- `src/app/api/assemblies/batch-ship/route.ts` (new)

---

### Step 2: Expand SHIPPED Role Check

Allow Shop Foreman to mark individual items shipped.

**Actions:**

- In `src/app/api/assemblies/[id]/route.ts`, find the SHIPPED role check (line ~119-121)
- Change `["ADMIN", "OPERATIONS_MANAGER"]` to `["ADMIN", "OPERATIONS_MANAGER", "SHOP_FOREMAN"]`

**Files affected:**
- `src/app/api/assemblies/[id]/route.ts`

---

### Step 3: Add useBatchShip Hook

Add a mutation hook for the batch ship endpoint.

**Actions:**

- Add to `src/hooks/use-assemblies.ts`:
```typescript
export function useBatchShip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assemblyIds: string[]) => {
      const res = await fetch("/api/assemblies/batch-ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assemblyIds }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to ship assemblies")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assemblies"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
```

**Files affected:**
- `src/hooks/use-assemblies.ts`

---

### Step 4: Create FinishedGoodsList Component

Build the grouped list of completed assemblies with ship actions.

**Actions:**

- Create `src/components/shipping/finished-goods-list.tsx`
- Props: none (fetches its own data via `useAssemblies`)
- Internal state: `activeView: "ready" | "shipped"`
- Sub-tab bar: "Ready to Ship" | "Recently Shipped"

**Ready to Ship view:**
- Fetch `useAssemblies({ status: "COMPLETED" })`
- Group by `jobName` client-side: `assemblies.reduce()` into `Record<string, Assembly[]>`
- Sort groups: jobs with most items first
- For each job group:
  - Card with `card-accent-green overflow-hidden`
  - Header: job name (text-base font-bold) + item count badge
  - Item rows: type icon + name/specs + completed date + cost + "Ship" button
  - "Ship All" button at bottom of card: `bg-brand-blue text-white h-12 rounded-xl`
- "No Job Assigned" group at bottom (if any items have null jobName)
- Empty state: "All shipped — nothing waiting" with CheckCircle icon

**Recently Shipped view:**
- Fetch `useAssemblies({ status: "SHIPPED" })`
- Simple flat list, most recent first (sorted by `shippedAt`)
- Each row: name, job, shipped date
- `card-accent-gray` styling
- Empty state: "No shipments yet"

**Ship action per item:**
- Uses `useUpdateAssembly()` to set `status: "SHIPPED"`
- Toast: "Shipped to {jobName}"
- Animate item out with `animate-ios-spring-out`

**Ship All action:**
- Uses `useBatchShip()` with all assembly IDs in that job group
- Toast: "Shipped {count} items to {jobName}"
- Animate entire group out

**Door specs display:**
- For DOOR type: show width × height, cooler/freezer, swing/slider
- For PANEL type: show thickness, cut length
- Use `text-xs text-text-muted` for specs line

**Files affected:**
- `src/components/shipping/finished-goods-list.tsx` (new)

---

### Step 5: Add "Ready to Ship" Tab to Assemblies Page

Add the third tab and wire it to the FinishedGoodsList component.

**Actions:**

- In `src/app/assemblies/page.tsx`:
  - Change `QueueTab` type to include `"SHIPPING"`: `type QueueTab = "DOOR_SHOP" | "FABRICATION" | "SHIPPING"`
  - Add third tab button: "Ready to Ship" with `Truck` icon from lucide-react
  - When `activeTab === "SHIPPING"`, render `<FinishedGoodsList />` instead of the assembly card list
  - Import `FinishedGoodsList` and `Truck` icon
  - Tab bar uses existing segmented control pattern with `min-h-[44px]`

**Files affected:**
- `src/app/assemblies/page.tsx`

---

### Step 6: Validation & QA

Type check, token audit, UX verification.

**Actions:**

- Run `npx tsc --noEmit` — verify zero new errors
- Run `npx tsx scripts/token-audit.ts` — verify no new off-brand tokens
- Verify all new components use design tokens
- Verify all tappable elements >= 44px
- Verify batch ship endpoint handles edge cases (empty array, non-COMPLETED assemblies, unauthorized role)
- Verify empty states render correctly
- Mobile sanity check at 375px

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/assemblies/[id]/page.tsx` — Individual assembly detail page. Has existing "Mark Shipped" button. No changes needed — it already calls `useUpdateAssembly` with `status: "SHIPPED"`.
- `src/components/dashboard/work-pipelines.tsx` — Shows fabrication pipeline. Will auto-update since it reads from the same API that now shows fewer COMPLETED items after shipping.
- `src/components/dashboard/action-items.tsx` — Shows door queue count. No impact (counts pre-production doors, not completed ones).

### Updates Needed for Consistency

- `context/project-status.md` could be updated to note Workflow 8 is partially implemented. But per CLAUDE.md rules, only update if structure changed — this is feature code, not workspace structure.

### Impact on Existing Workflows

- **Assembly list**: Gets a third tab. Existing Door Shop and Fabrication tabs unchanged.
- **Dashboard**: Fabrication pipeline card auto-updates (fewer completed items after shipping).
- **Assembly detail page**: Still works independently for individual ship actions.
- **No breaking changes**: All existing functionality preserved.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx tsx scripts/token-audit.ts` shows no new errors in modified/created files
- [ ] Batch ship endpoint validates input (Zod)
- [ ] Batch ship endpoint requires auth + role check
- [ ] Batch ship endpoint uses transaction (all-or-nothing)
- [ ] Batch ship returns 409 if any assembly isn't COMPLETED
- [ ] SHOP_FOREMAN can ship (individual and batch)
- [ ] Completed assemblies grouped by job on "Ready to Ship" tab
- [ ] "Ship" button per item works with toast confirmation
- [ ] "Ship All" button per job group works with toast confirmation
- [ ] Recently Shipped tab shows shipped items sorted by date
- [ ] Empty states render correctly for both tabs
- [ ] All interactive elements >= 44px touch target
- [ ] No off-brand tokens in new files

---

## Success Criteria

The implementation is complete when:

1. **A foreman can see all completed items grouped by job** and ship them individually or all at once
2. **Batch shipping is atomic** — all items for a job ship together or none do
3. **Shipped items have a history** — the "Recently Shipped" tab shows what went where and when
4. **The existing assembly workflow is unchanged** — Door Shop and Fabrication tabs work exactly as before

---

## Notes

- This plan intentionally does NOT tackle the door↔BOM linking question. That's a separate product decision that depends on this workflow being in place first. Once shipping works, the connection between "completed door" and "BOM that requested it" becomes a natural extension.
- The `ALLOCATED` status in the schema remains unused. It was intended for "assigned to a job but not yet shipped." For now, we skip it — items go directly from COMPLETED to SHIPPED. If job pre-allocation becomes important later, ALLOCATED can be implemented as an intermediate step.
- The batch-ship endpoint could be extended later to accept a `jobName` override (for shipping unassigned items to a specific job). For now, it just uses whatever `jobName` the assembly already has.
- This feeds into the dashboard — the "Fabrication" pipeline card in WorkPipelines already shows completed count. As items ship, that count decreases naturally.
