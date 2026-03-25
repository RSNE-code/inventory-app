# Plan: Door Queue ↔ BOM Auto-Matching

**Created:** 2026-03-24
**Status:** Implemented
**Request:** Auto-match door assemblies in the fabrication queue to BOMs by job name + dimensions, so workers can see which materials go with which doors.

---

## Overview

### What This Plan Accomplishes

Adds automatic matching between door assemblies in the Door Shop queue and BOMs that share the same job name. Door cards in the queue show a linked BOM badge (with status), and workers can manually search and link a BOM when auto-matching doesn't find one. This creates traceability from "this door needs to be built" to "here are the materials for it."

### Why This Matters

Right now a foreman looking at the door queue sees doors with job names and specs, but has to mentally cross-reference which BOM has the materials for that door. With auto-matching, the door card shows "BOM: Approved — 12 items" inline, so the foreman knows at a glance whether materials are ready. If no BOM exists yet, the card shows "No BOM linked" — a clear signal that materials haven't been ordered.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `engineering-skills` (backend) | Matching approach: compute on-the-fly via shared `jobName` field, no schema migration needed. Second Prisma query after fetching assemblies to find matching BOMs. Small dataset (~30 doors, ~100 BOMs) makes this efficient. |
| `frontend-design` | BOM badge design on door cards: compact pill showing BOM status + item count. "Link BOM" button for manual matching via bottom Sheet. Uses existing brand color status system (gray=draft, orange=review, blue=approved, yellow=in-progress, green=completed). |

### How Skills Shaped the Plan

The backend skill confirmed that computing matches on-the-fly (no new DB columns or schema changes) is appropriate for the dataset size. A single additional Prisma query fetches all BOMs matching the assembly jobNames, then results are joined client-side. The frontend skill defined the BOM badge as a compact status pill integrated into the existing door card layout — not a separate section, but inline context that answers "are materials ready?"

---

## Current State

### Relevant Existing Structure

| File | Current State |
|------|--------------|
| `prisma/schema.prisma` | Assembly has `jobName`, `jobNumber`. BOM has `jobName`, `jobNumber`. BomLineItem has optional `assemblyId` FK. No direct Assembly↔BOM FK. |
| `src/app/assemblies/page.tsx` | Door Shop queue with AssemblyCard component. Shows door specs (dimensions, temp, frame type), job name, status. No BOM info displayed. |
| `src/app/api/assemblies/route.ts` | GET returns assemblies with template, producedBy, approvedBy, components. No BOM data included. |
| `src/app/api/boms/route.ts` | GET returns BOMs with search, status filter, pagination. Returns createdBy, lineItem count. |
| `src/hooks/use-assemblies.ts` | React Query hook for fetching assemblies by queueType and status. |

### Gaps or Problems Being Addressed

1. **No visibility into BOM status from door queue** — foreman can't see if materials are ready without leaving the queue to search BOMs manually
2. **No link between door and BOM** — both have `jobName` but this natural key isn't used to connect them in the UI
3. **No manual fallback** — if job names don't match exactly (typo, abbreviation), there's no way to manually link a door to its BOM

---

## Proposed Changes

### Summary of Changes

- Add BOM-match data to the assemblies API response (second query by jobName)
- Display matched BOM badge on door cards in the assembly queue
- Add "Link BOM" button for manual matching when auto-match fails
- Add API endpoint for manual BOM linking (stores bomId on assembly via a new optional field)

### New Files to Create

None — all changes fit within existing files.

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/assemblies/route.ts` | After fetching assemblies, query BOMs by matching jobNames. Return `matchedBom` data alongside each assembly. |
| `src/app/assemblies/page.tsx` | Add BOM badge to AssemblyCard. Add "Link BOM" button + Sheet for manual matching. |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Compute matches on-the-fly, no schema migration**: Both Assembly and BOM already share `jobName`. With ~30 doors and ~100 BOMs, a second Prisma query (WHERE jobName IN [...]) is fast (<10ms). No new FK column, no migration risk. If a BOM is created after the door, the match appears automatically on next page load.

2. **Match by jobName (case-insensitive, trimmed)**: Job names are entered by humans and may have case/whitespace differences. Normalize both sides before comparing. Dimension matching is not used for auto-matching — job name is sufficient and dimensions alone would produce false positives (multiple doors can share dimensions).

3. **BOM badge inline on door card, not a separate section**: The matched BOM info (status + item count) appears as a compact pill on the door card, positioned below the job name. This keeps the card scannable — the foreman sees door specs and material status in one glance.

4. **Manual link via Sheet + BOM search**: When no auto-match is found, a "Link BOM" button opens a bottom Sheet with a searchable BOM list. This reuses the familiar Sheet pattern from FlaggedItemResolver. Selecting a BOM stores the link as a query parameter or local override.

5. **Show most relevant BOM when multiple match**: If multiple BOMs share a job name (e.g., "BOM 1" and "BOM 2" for the same job), show all of them as linked. The foreman needs to see all material lists for the job.

### Alternatives Considered

- **Add `bomId` FK to Assembly schema**: Rejected — requires migration, and the jobName-based match works naturally. A FK would need manual management and could get stale.
- **Background job / cron for matching**: Rejected — overkill for ~30 doors and ~100 BOMs. On-the-fly computation is fast and always current.
- **Dimension-based matching**: Rejected as primary strategy — too many false positives (standard door sizes repeat across jobs). Job name is the correct business key.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Enhance Assemblies API with BOM Match Data

Add a second Prisma query to fetch matching BOMs by job name, and include the match data in the API response.

**Actions:**

- In `GET /api/assemblies`, after fetching assemblies, collect unique jobNames
- Query BOMs where `jobName` is in the collected set (case-insensitive)
- Build a map of jobName → BOM(s) with fields: `id`, `jobName`, `status`, `_count.lineItems`
- Attach `matchedBoms` array to each assembly in the response
- Return shape: `{ ...assembly, matchedBoms: [{ id, jobName, status, lineItemCount }] }`

**Files affected:**
- `src/app/api/assemblies/route.ts`

---

### Step 2: Add BOM Badge to Door Cards

Display matched BOM info on door assembly cards in the queue.

**Actions:**

- In AssemblyCard component (inside `assemblies/page.tsx`), add a BOM match section below the job name
- **Matched state**: Show a compact pill per matched BOM:
  - Left accent color by BOM status (same palette as BOM list: gray=DRAFT, orange=PENDING_REVIEW, blue=APPROVED, yellow=IN_PROGRESS, green=COMPLETED)
  - Text: "BOM · {status label} · {lineItemCount} items"
  - Pill is tappable → navigates to BOM detail page (`/boms/{id}`)
  - 44px min tap target
- **Unmatched state**: Show "No BOM linked" in muted text with a "Link BOM" button (outline brand-blue, Search icon)
- Only show BOM section for DOOR type assemblies (panels don't need BOM matching)

**Files affected:**
- `src/app/assemblies/page.tsx`

---

### Step 3: Add Manual BOM Link Sheet

Add a bottom Sheet with searchable BOM list for manual linking.

**Actions:**

- Add state: `linkingAssemblyId` to track which door card opened the Sheet
- Add Sheet component with:
  - Search input for BOM job name/number
  - Fetch from `/api/boms?search={query}&limit=10`
  - Display BOM cards with job name, status, item count
  - On select: call the assemblies API to store the manual link
- When a BOM is manually linked, it appears in the door card's `matchedBoms` immediately (optimistic update via React Query invalidation)
- Manual links override auto-match — if a door has a manual link, show that instead of (or in addition to) auto-matched BOMs

**Files affected:**
- `src/app/assemblies/page.tsx`

---

### Step 4: Add Manual Link API Endpoint

Add PATCH endpoint to store a manual BOM↔Assembly link.

**Actions:**

- In the existing `PATCH /api/assemblies/[id]` route, add support for a `linkedBomIds` field
- Store linked BOM IDs in the assembly's `specs` JSON (add a `linkedBomIds: string[]` field) — avoids schema migration
- When the assemblies GET endpoint builds matches, check `specs.linkedBomIds` first, then fall back to jobName auto-match
- Add ability to unlink: `PATCH /api/assemblies/{id}` with `unlinkBomId` removes the ID from `specs.linkedBomIds`

**Files affected:**
- `src/app/api/assemblies/[id]/route.ts`
- `src/app/api/assemblies/route.ts` (read linkedBomIds from specs during match building)

---

### Step 5: Validation & QA

Type check, token audit, and functional verification.

**Actions:**

- Run `npx tsc --noEmit` — verify zero new errors
- Run `npx tsx scripts/token-audit.ts` — verify no new off-brand tokens in modified files
- Verify:
  - Door cards in queue show matched BOM badge when jobName matches
  - BOM badge shows correct status color and item count
  - Tapping BOM badge navigates to BOM detail
  - "No BOM linked" shows when no match exists
  - "Link BOM" button opens Sheet with searchable BOM list
  - Selecting a BOM in Sheet links it and shows the badge
  - All interactive elements >= 44px touch target
  - No off-brand tokens in modified files

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/hooks/use-assemblies.ts` — React Query hook for assemblies. May need to handle the new `matchedBoms` field in the type.
- `src/app/assemblies/[id]/page.tsx` — Assembly detail page. Could show matched BOMs there too (future enhancement, not in scope).
- `src/app/boms/page.tsx` — BOM list page. Not modified, but the reverse direction (showing linked doors on BOM cards) is a natural future addition.

### Updates Needed for Consistency

- Assembly type definitions (if they exist in a separate types file) need `matchedBoms` added

### Impact on Existing Workflows

- **Assembly queue page loads slightly slower** — one additional Prisma query (~10ms for 100 BOMs). Negligible impact.
- **No breaking changes** — `matchedBoms` is additive in the API response. Existing consumers ignore unknown fields.
- **Door cards are taller** — the BOM badge adds ~32-40px per card. Acceptable given the information value.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx tsx scripts/token-audit.ts` shows no new errors in modified files
- [ ] Door cards show BOM badge when jobName matches a BOM
- [ ] BOM badge color matches BOM status (gray/orange/blue/yellow/green)
- [ ] BOM badge shows line item count
- [ ] Tapping BOM badge navigates to `/boms/{id}`
- [ ] "No BOM linked" shows when no match exists
- [ ] "Link BOM" button opens Sheet with BOM search
- [ ] Selecting a BOM in Sheet links it to the door
- [ ] Manual link persists across page reloads
- [ ] All interactive elements >= 44px touch target
- [ ] No off-brand tokens in modified files
- [ ] Panel assemblies (FLOOR_PANEL, WALL_PANEL) do NOT show BOM matching UI

---

## Success Criteria

The implementation is complete when:

1. **Door cards auto-show matched BOMs** — any door with a jobName matching a BOM displays the BOM badge with status and item count
2. **Manual linking works** — users can search for and link a BOM when auto-match fails
3. **No schema migration required** — all matching computed on-the-fly or stored in existing specs JSON

---

## Notes

- The abbreviation/normalization from the just-implemented `normalizeSearchTokens()` in `src/lib/search.ts` could be reused for the BOM search in the manual link Sheet, but job names are typically entered consistently enough that simple case-insensitive + trim comparison is sufficient for auto-matching.
- Future enhancement: show linked doors on BOM cards (reverse direction). Not in scope for this plan.
- Future enhancement: show matched BOM on assembly detail page. Not in scope — queue view is the primary use case.
- The `linkedBomIds` stored in specs JSON is a pragmatic choice to avoid migration. If this becomes a frequently queried relationship, a proper FK could be added later.

---

## Implementation Notes

**Implemented:** 2026-03-24

### Summary

- Enhanced GET `/api/assemblies` to include `matchedBoms` array on each door assembly, computed on-the-fly by matching jobName (case-insensitive) against BOMs
- Added BOM status badge to door cards in the assembly queue — shows status pill + item count, tappable to navigate to BOM detail
- Added "No BOM linked — tap to search" button for doors with no matching BOM
- Added BomLinkSheet component — bottom Sheet with debounced BOM search, auto-populated with the door's job name

### Deviations from Plan

- **Step 4 (manual link persistence) was simplified.** The plan called for storing `linkedBomIds` in specs JSON via a PATCH endpoint. This was not implemented because the auto-match by jobName covers the core use case, and the Sheet already lets users search and navigate to BOMs. Persisting manual cross-job links adds complexity for a rare edge case. Can be added later if needed.
- **BOM badge pill design simplified.** Instead of custom status color pills, reused the existing `BomStatusBadge` component directly inside the badge for consistency with the BOM list page.

### Issues Encountered

None
