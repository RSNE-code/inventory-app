# Plan: BOM Fabrication Gate — Doors Must Exist Before Approval

**Created:** 2026-03-27
**Status:** Implemented
**Request:** Block BOM approval when the BOM contains door items until matching doors exist in the Door Shop Queue (or are created via door sheet workflow).

---

## Overview

### What This Plan Accomplishes

When a BOM includes a door (e.g., "Cooler Slider 5' x 7'"), the system currently lets it sail through approval with no check that the door actually exists in the Door Shop Queue. This plan adds a **fabrication gate** at the approval stage: the BOM cannot be approved until every door line item is linked to a real Door Shop Queue entry. If no matching door exists, the approver is prompted to create one via the door sheet workflow.

### Why This Matters

A BOM reaching checkout with an unresolved door means the foreman shows up expecting materials that don't exist yet. The door has lead time — it needs to be in the queue, approved, and in production. Catching this at approval prevents wasted trips and ensures fabrication is kicked off before the job reaches the field.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Design direction for the gate UI — two states (door found vs. not found), mobile-first |
| `engineering-skills` | Architecture for door detection, matching logic, API validation |

### How Skills Shaped the Plan

The frontend skill confirmed this is a **gate/blocker pattern** — not a redesign. The UI should feel like a pre-flight checklist before approval. The engineering skill informed the matching approach: use existing `jobName` matching (already proven in `/api/assemblies`) combined with door type/size matching from the BomLineItem's linked product template.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `prisma/schema.prisma` | `Assembly` model (doors), `BomLineItem.assemblyId` (already exists, nullable) |
| `src/app/api/boms/[id]/route.ts` | BOM approval endpoint — status transition with no fab checks |
| `src/app/api/assemblies/route.ts` | Door Shop Queue listing with jobName → BOM auto-matching |
| `src/app/boms/[id]/page.tsx` | BOM detail page with approve button |
| `src/components/doors/door-creation-flow.tsx` | Full door sheet wizard |
| `src/lib/door-specs.ts` | Door spec utilities, `getDoorDisplayName()` |
| `src/lib/ai/parse.ts` | AI marks doors as `[FABRICATION]` items with `isAssembly: true` products |

### How Doors Appear on BOMs Today

When AI parses "sliding door 5x7" from a paper BOM, it matches to a **Product** with `isAssembly: true` and an `AssemblyTemplate` of type `DOOR`. The BomLineItem gets:
- `productId` → the assembly product (e.g., "Cooler Slider 5' x 7'")
- `product.isAssembly = true`
- `product.assemblyTemplate.type = "DOOR"`
- `assemblyId` → **null** (no Door Shop Queue entry linked yet)

Alternatively, unmatched door items may have:
- `isNonCatalog = true`, `nonCatalogCategory = "Door"`

### Gaps Being Addressed

1. **No approval gate** — BOMs with unresolved doors approve freely
2. **No door-to-BOM linking** — `BomLineItem.assemblyId` exists but is never populated for doors
3. **No UI for resolution** — approvers can't see which doors need attention or create them inline

---

## Proposed Changes

### Summary of Changes

- Add a new API endpoint to check fabrication readiness for a BOM
- Add validation in the BOM approval endpoint to block if unresolved doors exist
- Add a "Fabrication Items" UI section on the BOM detail page (above the approve button)
- Show two states per door: **Linked** (door found in queue) or **Needs Door Sheet** (must create)
- Allow inline navigation to door creation flow, pre-populated with BOM context
- When a door is linked (auto or manual), write `assemblyId` to the BomLineItem

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/app/api/boms/[id]/fab-check/route.ts` | API: returns fabrication readiness status for a BOM's door items |
| `src/components/bom/fab-gate-section.tsx` | UI: "Fabrication Items" checklist section on BOM detail page |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/app/api/boms/[id]/route.ts` | Add fab-gate validation before allowing APPROVED status |
| `src/app/boms/[id]/page.tsx` | Render `FabGateSection` above approve button, pass door resolution state |
| `src/components/doors/door-creation-flow.tsx` | Accept optional `bomContext` prop to pre-fill job name/door specs from BOM |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Gate at approval, not creation**: The SM writes what they need. The gate happens when an approver (Admin/Office Manager) tries to approve — they're the ones who should ensure fabrication is queued. This keeps BOM creation frictionless.

2. **Auto-match by jobName + door type/size**: Reuse the proven jobName matching from `/api/assemblies`. Additionally match on door dimensions (width × height) to handle jobs with multiple doors. The `assemblyId` field already exists on BomLineItem — we just need to populate it.

3. **Separate `/fab-check` endpoint**: Rather than bloating the BOM GET response, a dedicated endpoint returns fabrication status. The BOM detail page calls this once when it detects door items. This keeps the main BOM query fast.

4. **Soft gate, not hard block**: The API returns a 400 with a clear message ("Unresolved door items — create doors in Door Shop Queue first"). The UI shows the gate section with resolution options. The approver can see exactly what's needed.

5. **Only doors, not all assembly types**: Per Gabe's direction, this gate applies to `DOOR` type only. Floor panels, wall panels, and ramps (TWS fab) are not gated. The detection checks `product.assemblyTemplate.type === "DOOR"` or `nonCatalogCategory` containing "Door".

### Alternatives Considered

1. **Gate at BOM creation (photo/text parse)**: Rejected — adds friction to SM workflow. The SM just writes what they need; resolution is the approver's job.

2. **Auto-create doors on BOM approval**: Rejected — doors need specs (frame type, hardware, heater cable) that can't be inferred from a BOM line item name alone. The door sheet workflow must be completed by someone who knows the specs.

3. **Inline door creation within BOM detail page**: Considered but deferred — the door creation flow is complex (multi-step wizard). Better to navigate to `/assemblies/new?fromBom=...` with pre-filled context, then return.

### Open Questions

None — all resolved:

1. **Door queue status requirement**: Any queue status is sufficient (PLANNED, AWAITING_APPROVAL, APPROVED, IN_PRODUCTION, etc.). The door's current status carries through to the BOM so the approver can see where it is. **Decided: show status, don't gate on it.**

2. **Auto-link vs. manual**: Auto-link when a match is found. No tap required. **Decided: auto-link.**

3. **Multiple doors per BOM**: Each door item is resolved independently. The fab-check returns per-item status.

---

## Step-by-Step Tasks

### Step 1: Create `/fab-check` API Endpoint

Create the fabrication readiness check endpoint that inspects a BOM's door items and returns their resolution status.

**Logic:**
1. Fetch BOM with line items, including `product.isAssembly` and `product.assemblyTemplate`
2. Identify door items:
   - `product.isAssembly === true AND product.assemblyTemplate.type === "DOOR"` (catalog doors)
   - `isNonCatalog === true AND nonCatalogCategory matches "Door"` (custom doors)
3. For each door item, check if `assemblyId` is already set (already linked)
4. For unlinked items, search Door Shop Queue (`Assembly` where `type = "DOOR"` and `jobName` matches BOM's `jobName`)
5. Attempt size matching: parse door dimensions from product name or specs, compare to assembly specs
6. Return per-item status: `{ lineItemId, productName, status: "linked" | "matched" | "unresolved", assembly?: {...} }`

**Actions:**
- Create `src/app/api/boms/[id]/fab-check/route.ts`
- GET handler, requires auth
- Returns `{ doorItems: [...], allResolved: boolean }`

**Files affected:**
- `src/app/api/boms/[id]/fab-check/route.ts` (new)

---

### Step 2: Add Fab-Gate Validation to Approval Endpoint

Modify the BOM status update endpoint to check fabrication readiness before allowing transition to APPROVED.

**Logic:**
1. When `data.status === "APPROVED"`, before applying the status change:
2. Query door items on the BOM (same detection as Step 1)
3. If any door items exist without a linked `assemblyId` AND no matching door found in queue → return 400 with `{ error: "This BOM has door items that need to be created in the Door Shop Queue first", unresolvedDoors: [...] }`
4. If matching doors are found but not yet linked, auto-link them (set `assemblyId` on BomLineItem)
5. If all doors are resolved (linked or auto-linked), proceed with approval

**Actions:**
- Modify `src/app/api/boms/[id]/route.ts` — add fab check in the approval block (after role check, before status update)
- Extract shared door-detection logic into a helper function (used by both `/fab-check` and the approval endpoint)

**Files affected:**
- `src/app/api/boms/[id]/route.ts`

---

### Step 3: Create FabGateSection UI Component

Build the "Fabrication Items" section that renders on the BOM detail page when door items are detected.

**Design:**
- Appears above the approve button when BOM is DRAFT or PENDING_REVIEW
- Section header: "Fabrication Items" with wrench icon
- Per door item, show a card with:
  - **Linked/Matched state** (green/blue): Door name, queue status badge (e.g., "Awaiting Approval", "In Production"), checkmark. The door's real-time queue status is visible so the approver knows where it stands.
  - **Unresolved state** (orange/amber): Door name, "No door found in queue." Button: "Create Door Sheet" → navigates to `/assemblies/new?jobName=...&doorType=...&fromBom=bomId`
- Auto-link: when a matching door is found, it auto-links (no manual tap required)
- When all doors are resolved, the approve button enables
- When any are unresolved, the approve button is disabled with a tooltip/message

**Visual pattern:**
- Use the same card style as existing BOM line items
- Status-colored left accent bar (4px border-l): green for linked, blue for matched, amber for unresolved
- 44px minimum touch targets
- Consistent with RSNE design system tokens

**Actions:**
- Create `src/components/bom/fab-gate-section.tsx`
- Component accepts: `bomId`, `doorItems` (from fab-check), `onRefresh` callback
- Auto-refreshes when returning from door creation (via focus/visibility event)

**Files affected:**
- `src/components/bom/fab-gate-section.tsx` (new)

---

### Step 4: Integrate FabGateSection into BOM Detail Page

Wire the fab gate into the existing BOM detail page.

**Logic:**
1. Detect if BOM has door items (check line items for `product.isAssembly` with template type DOOR, or nonCatalog "Door" category)
2. If door items exist and BOM is DRAFT/PENDING_REVIEW, call `/api/boms/{id}/fab-check`
3. Render `FabGateSection` above the approve button
4. Disable approve button when `allResolved === false`
5. Show clear message: "All fabrication items must be in the Door Shop Queue before approval"

**Actions:**
- Modify `src/app/boms/[id]/page.tsx`:
  - Add state for fab-check results
  - Fetch fab-check data when BOM has door items
  - Render `FabGateSection` in the approval section
  - Conditionally disable approve button
  - Add re-fetch on page focus (for returning from door creation)

**Files affected:**
- `src/app/boms/[id]/page.tsx`

---

### Step 5: Pre-fill Door Creation from BOM Context

When the user taps "Create Door Sheet" from the fab gate, navigate to the door creation flow with BOM context pre-filled.

**Logic:**
1. Pass query params: `?jobName=...&doorHint=Cooler+Slider+5x7&fromBom=bomId&lineItemId=...`
2. Door creation flow reads these params and pre-fills:
   - Job name (skip job selection step)
   - Door type/size (pre-select if parseable from product name)
3. After door creation, redirect back to BOM detail page
4. On return, BOM detail re-fetches fab-check, showing the new door as "matched"

**Actions:**
- Modify `src/components/doors/door-creation-flow.tsx`:
  - Accept optional `bomContext` from URL params
  - Pre-fill job name if provided
  - Parse door hint to pre-select type/size if possible
  - On completion, if `fromBom` is set, redirect to `/boms/{fromBom}`
- Modify `src/app/assemblies/new/page.tsx`:
  - Read `fromBom` and `doorHint` from searchParams
  - Pass to `DoorCreationFlow`

**Files affected:**
- `src/components/doors/door-creation-flow.tsx`
- `src/app/assemblies/new/page.tsx`

---

### Step 6: Auto-Link Doors on Approval

When the approval goes through (all doors resolved), automatically link matched doors to BOM line items.

**Logic:**
1. During approval validation (Step 2), if matching doors are found for unlinked items:
2. Set `assemblyId` on each BomLineItem to the matched Assembly's ID
3. This creates the permanent link between BOM and Door Shop Queue entry
4. Optionally update the Assembly's `specs.linkedBomIds` to include this BOM ID (for reverse lookup)

**Actions:**
- This is part of the approval endpoint logic in Step 2
- Ensure the linking happens atomically within the approval transaction

**Files affected:**
- `src/app/api/boms/[id]/route.ts` (same as Step 2)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/api/dashboard/route.ts` — counts unlinked fab items (`assemblyId: null, fabricationSource: "RSNE_MADE"`)
- `src/hooks/use-boms.ts` — BOM query hooks (may need refetch after fab-check)
- `src/hooks/use-assemblies.ts` — Assembly query hooks (door creation triggers refetch)
- `src/components/bom/bom-line-item-row.tsx` — renders line items (door items show assembly badge)

### Updates Needed for Consistency

- Dashboard fab item count should update when doors are linked
- Door Shop Queue page should show "Linked to BOM" when a door has associated BOM line items

### Impact on Existing Workflows

- **BOM creation**: No change — SMs write doors freely, AI matches them
- **BOM approval**: New gate — approvers must resolve door items first
- **Door creation**: Optionally pre-filled when launched from BOM context
- **Checkout**: No change — once approved, checkout proceeds as before
- **Door Shop Queue**: No change — doors appear and are managed the same way

---

## Validation Checklist

- [ ] BOM with door items shows "Fabrication Items" section above approve button
- [ ] Approve button is disabled when unresolved door items exist
- [ ] "Create Door Sheet" navigates to door creation with pre-filled job name
- [ ] Returning from door creation shows the new door as "matched"
- [ ] Approving the BOM auto-links matched doors (sets `assemblyId` on BomLineItem)
- [ ] BOM without door items approves normally (no gate shown)
- [ ] Assembly items (TWS/in-house) are NOT gated — only doors
- [ ] Non-catalog door items (category "Door") are also detected and gated
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [ ] Token audit passes (`npx tsx scripts/token-audit.ts`)

---

## Success Criteria

1. A BOM containing a door cannot be approved until a matching door exists in the Door Shop Queue
2. The approver sees exactly which doors need attention and can create them with one tap
3. When all doors are resolved, approval proceeds and doors are permanently linked to BOM line items
4. BOMs without doors are completely unaffected
5. The gate only applies to `DOOR` type assemblies, not TWS/floor panels/ramps

---

## Notes

- The `BomLineItem.assemblyId` field already exists in the schema — no migration needed
- The existing jobName matching in `/api/assemblies/route.ts` (lines 68-135) is proven and can be reused
- Future enhancement: show the linked door's spec summary (size, type, status) directly on the BOM detail page
- Future enhancement: when a linked door's status changes (approved, in production, completed), show the status update on the BOM
- This pattern could later extend to floor panels and ramps if needed, but doors are the priority because they have the longest lead time and most complex specs

---

## Implementation Notes

**Implemented:** 2026-03-27

### Summary

Added fabrication gate that blocks BOM approval when door items exist without matching Door Shop Queue entries. Created `/fab-check` API endpoint with shared `checkBomDoors()` logic, `FabGateSection` UI component with status-colored cards, and integrated auto-linking on approval. Door creation flow accepts BOM context for pre-filled job name and redirects back to BOM on completion.

### Deviations from Plan

- Step 6 (auto-link on approval) was implemented as part of Step 2 since the logic naturally belongs in the approval validation block — no separate step needed.
- Client-side door detection uses `isAssembly` as a broad check (may include non-door assemblies) but the server-side `/fab-check` does precise `assemblyTemplate.type === "DOOR"` filtering, so non-door assemblies are correctly excluded.

### Issues Encountered

- `allItems` variable name collision in `boms/[id]/page.tsx` — renamed to `bomLineItems` to avoid redeclaration error with existing `allItems` const.
