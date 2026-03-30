# Plan: Delete BOMs/Fab Items + Paper BOM Attachment

**Created:** 2026-03-30
**Status:** Draft
**Request:** Add hard-delete for BOMs and Fab items, and store/display paper BOM photos as attachments.

---

## Overview

### What This Plan Accomplishes

Two features: (1) Hard-delete capability for BOMs and assemblies (Fab items) with confirmation dialogs, so items that shouldn't exist can be permanently removed. (2) Paper BOM photo persistence — when a photo is uploaded for AI parsing, the original image is stored in Supabase Storage and displayed on the BOM detail page so foremen can review the source document.

### Why This Matters

Currently, BOMs can only be "cancelled" and assemblies have no removal path at all. This clutters the system with items that shouldn't be there. For paper BOMs, the original photo is parsed by AI and then discarded — but foremen need to reference the original to confirm information matches what was parsed.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Creative direction for delete confirmation dialogs and attachment viewer UI |
| `design-inspiration` | Design system consistency — cards, spacing, typography, touch targets, color tokens |

### How Skills Shaped the Plan

The design system enforces 44px minimum touch targets (construction workers with gloves), status colors at /15 opacity minimum, and card-based layouts. Delete buttons will use `status-red` for danger signaling. The paper BOM viewer will use a card-based layout consistent with the rest of the app. All UI follows the RSNE brand colors (navy, brand-blue, brand-orange) with the same boldness as Monday.com.

---

## Current State

### Relevant Existing Structure

- `src/app/api/boms/[id]/route.ts` — GET and PUT only, no DELETE
- `src/app/api/assemblies/[id]/route.ts` — GET and PATCH only, no DELETE
- `src/hooks/use-boms.ts` — CRUD hooks, no delete hook
- `src/hooks/use-assemblies.ts` — CRUD hooks, no delete hook
- `src/app/boms/[id]/page.tsx` — BOM detail page, has cancel button but no delete
- `src/app/assemblies/[id]/page.tsx` — Assembly detail page, no delete
- `src/components/bom/bom-photo-capture.tsx` — Captures photo, sends to AI, discards photo after parse
- `src/app/api/ai/parse-image/route.ts` — Receives photo FormData, parses with Claude Vision, returns items
- `prisma/schema.prisma` — Bom model has no `paperBomUrl` field
- `src/lib/supabase/client.ts` and `server.ts` — Supabase client exists but no Storage usage yet

### Gaps or Problems Being Addressed

1. **No delete capability** — BOMs and assemblies can only be soft-deleted (CANCELLED/isActive). Items that should never have been created clutter the system.
2. **Paper BOM photos are lost** — Photos are parsed by AI and immediately discarded. Foremen can't review the original handwritten BOM to verify parsed data.

---

## Proposed Changes

### Summary of Changes

- Add `paperBomUrl` field to the `Bom` Prisma model
- Create Supabase Storage bucket `paper-boms` for storing uploaded BOM photos
- Add `DELETE` endpoint for `/api/boms/[id]` — hard-deletes BOM plus cascaded line items, nullifies transaction references
- Add `DELETE` endpoint for `/api/assemblies/[id]` — hard-deletes assembly plus cascaded components/logs, nullifies transaction and BOM line item references
- Add upload API route `/api/boms/[id]/upload-paper` to store the paper BOM photo
- Modify `bom-photo-capture.tsx` to upload the compressed photo to storage after AI parse
- Add `useDeleteBom()` and `useDeleteAssembly()` hooks
- Add delete buttons with confirmation dialogs on BOM detail and assembly detail pages
- Add paper BOM viewer on BOM detail page (thumbnail + full-screen view)

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/app/api/boms/[id]/upload-paper/route.ts` | API endpoint to upload paper BOM photo to Supabase Storage and save URL on BOM record |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `prisma/schema.prisma` | Add `paperBomUrl String?` to Bom model |
| `src/app/api/boms/[id]/route.ts` | Add DELETE handler — hard-delete BOM with safety checks |
| `src/app/api/assemblies/[id]/route.ts` | Add DELETE handler — hard-delete assembly with safety checks |
| `src/hooks/use-boms.ts` | Add `useDeleteBom()` mutation hook |
| `src/hooks/use-assemblies.ts` | Add `useDeleteAssembly()` mutation hook |
| `src/app/boms/[id]/page.tsx` | Add delete button with confirmation dialog; add paper BOM thumbnail/viewer |
| `src/app/assemblies/[id]/page.tsx` | Add delete button with confirmation dialog |
| `src/components/bom/bom-photo-capture.tsx` | After successful AI parse, upload original compressed photo to `/api/boms/[id]/upload-paper` |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Hard delete with nullified references, not cascade on transactions**: Transactions are financial records. Deleting a BOM should NOT delete its checkout/return transactions — instead, `bomId` is set to `null` on those transactions. This preserves the audit trail while removing the BOM. Same for assemblies.

2. **Role-restricted delete (ADMIN only)**: Only ADMIN users can delete BOMs and assemblies. This prevents accidental deletion by field workers. The user (Gabe) is the owner/admin.

3. **Safety guards on delete**: BOMs with `IN_PROGRESS` status cannot be deleted (materials already checked out). Assemblies with `IN_PRODUCTION` or later status cannot be deleted (materials already consumed). Must cancel first or complete the workflow.

4. **Paper BOM stored in Supabase Storage**: The compressed photo (~800KB JPEG) is uploaded to a `paper-boms` bucket in Supabase Storage. The public URL is stored on the `Bom.paperBomUrl` field. This uses the existing Supabase infrastructure already set up for auth.

5. **Upload happens after BOM creation, not during**: The photo capture flow first creates the BOM (to get the BOM ID), then uploads the paper BOM photo as a separate call. This keeps the existing BOM creation flow clean and avoids mixing FormData with JSON.

6. **Paper BOM also stored when photo uploaded to existing BOM**: When adding items via photo on the BOM detail page (the AI input), the photo is also stored.

### Alternatives Considered

- **Soft delete only (keep CANCELLED)**: Rejected — user specifically wants items gone, not just hidden.
- **Store photo as base64 in database**: Rejected — photos are ~800KB, would bloat the database. Supabase Storage is purpose-built for this.
- **Store photo inline during BOM creation POST**: Rejected — would require changing the API from JSON to FormData, breaking existing manual creation flow.

### Open Questions

None — requirements are clear.

---

## Step-by-Step Tasks

### Step 1: Add `paperBomUrl` field to Prisma schema

Add the nullable `paperBomUrl` field to the `Bom` model so we can store the Supabase Storage URL.

**Actions:**
- Add `paperBomUrl String?` to the Bom model in `prisma/schema.prisma`, after the `notes` field
- Run `npx prisma db push` to apply the schema change

**Files affected:**
- `prisma/schema.prisma`

---

### Step 2: Create paper BOM upload API route

Create an endpoint that receives the photo file, uploads it to Supabase Storage (`paper-boms` bucket), and saves the URL on the BOM record.

**Actions:**
- Create `src/app/api/boms/[id]/upload-paper/route.ts`
- POST handler: receives FormData with `image` file
- Auth required (any authenticated user)
- Uploads to Supabase Storage bucket `paper-boms` with path `{bomId}/{timestamp}.jpg`
- Updates `Bom.paperBomUrl` with the public URL
- Returns the URL in the response

**Files affected:**
- `src/app/api/boms/[id]/upload-paper/route.ts` (new)

---

### Step 3: Add DELETE endpoint for BOMs

Add a DELETE handler to `/api/boms/[id]/route.ts` that hard-deletes a BOM after safety checks.

**Actions:**
- Add `DELETE` export to `src/app/api/boms/[id]/route.ts`
- Require ADMIN role
- Safety check: reject if status is `IN_PROGRESS` (materials checked out — must complete or cancel first)
- Nullify `bomId` on all related Transaction records
- Delete the paper BOM from Supabase Storage if `paperBomUrl` exists
- Delete the BOM (line items cascade automatically via `onDelete: Cascade`)
- Return 200 with success message

**Files affected:**
- `src/app/api/boms/[id]/route.ts`

---

### Step 4: Add DELETE endpoint for assemblies

Add a DELETE handler to `/api/assemblies/[id]/route.ts` that hard-deletes an assembly after safety checks.

**Actions:**
- Add `DELETE` export to `src/app/api/assemblies/[id]/route.ts`
- Require ADMIN role
- Safety check: reject if status is `IN_PRODUCTION`, `COMPLETED`, `ALLOCATED`, or `SHIPPED` (materials consumed)
- Nullify `assemblyId` on all related Transaction records
- Nullify `assemblyId` on all related BomLineItem records
- Delete the assembly (components and change log cascade automatically via `onDelete: Cascade`)
- Return 200 with success message

**Files affected:**
- `src/app/api/assemblies/[id]/route.ts`

---

### Step 5: Add `useDeleteBom` and `useDeleteAssembly` hooks

Add React Query mutation hooks for the new DELETE endpoints.

**Actions:**
- Add `useDeleteBom()` to `src/hooks/use-boms.ts` — calls `DELETE /api/boms/{id}`, invalidates `boms` and `dashboard` queries
- Add `useDeleteAssembly()` to `src/hooks/use-assemblies.ts` — calls `DELETE /api/assemblies/{id}`, invalidates `assemblies` and `dashboard` queries

**Files affected:**
- `src/hooks/use-boms.ts`
- `src/hooks/use-assemblies.ts`

---

### Step 6: Add delete UI to BOM detail page + paper BOM viewer

Add a delete button with confirmation dialog on the BOM detail page. Also add a paper BOM attachment viewer.

**Actions:**
- **Delete button**: Red "Delete BOM" button visible only to ADMIN users. Shows a confirmation dialog (AlertDialog from shadcn/ui) with the BOM job name. On confirm, calls `useDeleteBom`, shows toast, navigates back to BOM list.
- **Paper BOM viewer**: If `bom.paperBomUrl` exists, show a thumbnail card below the BOM header. Tapping opens the full image in a modal/sheet. Uses the `Image` icon from lucide-react.
- Follow design system: `status-red` for delete button, card styling `rounded-xl shadow-sm border border-border p-4`, 44px touch targets.

**Files affected:**
- `src/app/boms/[id]/page.tsx`

---

### Step 7: Add delete UI to assembly detail page

Add a delete button with confirmation dialog on the assembly detail page.

**Actions:**
- **Delete button**: Red "Delete" button visible only to ADMIN users. Shows a confirmation dialog with the assembly type and job name. On confirm, calls `useDeleteAssembly`, shows toast, navigates back to assemblies list.
- Only shown when assembly status is `PLANNED`, `AWAITING_APPROVAL`, or `APPROVED` (before production starts).

**Files affected:**
- `src/app/assemblies/[id]/page.tsx`

---

### Step 8: Modify photo capture to upload paper BOM

After the BOM is created from a photo, upload the compressed image to the paper BOM storage endpoint.

**Actions:**
- In `bom-photo-capture.tsx`, after `createBom.mutateAsync()` succeeds and returns the BOM ID, send the compressed photo to `/api/boms/${bomId}/upload-paper` via FormData
- This is a fire-and-forget call — don't block the UI flow. If upload fails, log a warning but don't break the BOM creation.
- Store the compressed file in a ref so it's available after the parse phase

**Files affected:**
- `src/components/bom/bom-photo-capture.tsx`

---

### Step 9: QA Validation

Run TypeScript checks and verify the implementation.

**Actions:**
- Run `npx tsc --noEmit` to verify no type errors
- Verify delete endpoints handle all edge cases (already deleted, not found, wrong status)
- Verify cascade behavior: deleting a BOM removes line items but preserves transactions (with null bomId)
- Verify paper BOM upload stores file and URL correctly
- Verify UI shows delete button only for ADMIN, and only when status allows it

**Files affected:**
- None (validation only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/boms/page.tsx` — BOM list page (may show deleted BOMs briefly before cache invalidation)
- `src/app/assemblies/page.tsx` — Assembly list page
- `src/components/bom/bom-card.tsx` — BOM card in list view
- `src/app/api/boms/[id]/fab-check/route.ts` — Checks BOM doors, references line items

### Updates Needed for Consistency

- `reference/docs/design-system.md` — Update "Soft deletes" note to reflect that BOMs and assemblies now support hard delete
- `context/project-status.md` — Note new capabilities

### Impact on Existing Workflows

- **BOM creation via photo**: Now also stores the original photo. No change to the parsing workflow.
- **BOM detail view**: New delete button and paper BOM viewer added.
- **Assembly detail view**: New delete button added.
- **Transaction history**: Transactions that referenced deleted BOMs/assemblies will show null for those FKs. This is acceptable — the transaction record itself (quantity, cost, date) is preserved.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no errors
- [ ] DELETE `/api/boms/{id}` returns 200 for ADMIN, 403 for non-ADMIN
- [ ] DELETE `/api/boms/{id}` returns 400 for IN_PROGRESS BOMs
- [ ] DELETE `/api/assemblies/{id}` returns 200 for ADMIN, 403 for non-ADMIN
- [ ] DELETE `/api/assemblies/{id}` returns 400 for IN_PRODUCTION+ assemblies
- [ ] Deleting a BOM removes its line items (cascade) but preserves transactions
- [ ] Deleting an assembly removes components/logs (cascade) but preserves transactions
- [ ] Paper BOM photo uploads to Supabase Storage successfully
- [ ] Paper BOM URL is saved on the Bom record
- [ ] Paper BOM thumbnail appears on BOM detail page
- [ ] Paper BOM opens in full-screen viewer on tap
- [ ] Delete buttons only visible to ADMIN users
- [ ] Confirmation dialog appears before delete
- [ ] After delete, user is navigated back to list page

---

## Success Criteria

1. BOMs and assemblies can be permanently deleted by ADMIN users with a confirmation dialog
2. Paper BOM photos are stored and viewable as attachments on the BOM detail page
3. All existing workflows (BOM creation, checkout, approval, assembly production) continue to work unchanged
4. TypeScript compiles with no errors

---

## Notes

- The `paper-boms` Supabase Storage bucket needs to be created. This can be done via the Supabase dashboard or via the API. The upload endpoint should handle bucket creation gracefully.
- Future enhancement: could add paper BOM upload to the BOM detail page directly (not just during photo capture) for cases where someone wants to attach a paper BOM to a manually-created BOM.
- The design system says "Soft deletes. Never hard-delete." — this plan deliberately overrides that convention per the user's explicit request. The design system note should be updated.
