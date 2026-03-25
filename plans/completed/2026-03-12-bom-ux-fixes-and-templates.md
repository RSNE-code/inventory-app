# BOM Module UX Fixes & Template Feature

**Created:** 2026-03-12
**Status:** COMPLETE
**Source:** Design/UX Audit Report (outputs/2026-03-12-bom-design-ux-audit.md)

---

## Phase 1: P0 — Critical Fixes

### 1. Approval Confirmation Dialog
- **File:** `src/app/boms/[id]/page.tsx`
- **Change:** Wrap `handleStatusChange("APPROVED")` in a confirmation dialog showing item count + job name. Also add confirmation for CANCELLED when materials are checked out.
- **Approach:** Add state `confirmAction` to track which dialog is open. Render inline confirmation card (like CheckoutAllButton pattern).

### 2. Role-Based Messaging for "Stuck" BOMs
- **File:** `src/app/boms/[id]/page.tsx`
- **Change:** When user lacks permission for the next action, show a contextual message instead of nothing.
  - DRAFT BOM + non-approver role → "This BOM needs approval from an Admin or Office Manager"
  - APPROVED BOM + non-checkout role → "This BOM is approved. A Shop Foreman or Admin can check out materials"
- **Approach:** Add `canApprove` check (role-based). Show info card when user can't act.

### 3. Non-Catalog Form Inline Validation
- **File:** `src/app/boms/new/page.tsx`
- **Change:** Add inline error states (red borders, helper text) to non-catalog form fields instead of only toast errors.
- **Approach:** Add `ncErrors` state object, validate on submit attempt, show per-field error messages.

---

## Phase 2: P1 — Major UX Fixes

### 4. Mode Indicator on Detail Page
- **File:** `src/app/boms/[id]/page.tsx`
- **Change:** Show a persistent banner below breadcrumb when in edit/add-material/return mode.
- **Approach:** Render a colored banner: "Editing BOM" / "Adding Materials" / "Returning Materials" with mode-appropriate styling.

### 5. Surface Insufficient Stock Warnings
- **File:** `src/app/boms/[id]/page.tsx` (handleCheckout, handleCheckoutAll)
- **Change:** Read `warnings.insufficientStock` from checkout response and show toast warning.
- **Approach:** Check response data for warnings after successful checkout.

### 6. Completion Validation
- **File:** `src/app/boms/[id]/page.tsx`
- **Change:** Before allowing COMPLETED, check if items have outstanding unchecked-out quantities. Show confirmation if so.
- **Approach:** Calculate total unchecked items, show warning dialog before completing.

### 7. Cancel BOM Confirmation
- **File:** `src/app/boms/[id]/page.tsx`
- **Change:** Show confirmation when cancelling a BOM that has checked-out materials.
- **Approach:** Check `hasOutstandingMaterial` before cancelling, show warning dialog.

### 8. Improve Error Messages
- **Files:** `src/app/boms/[id]/page.tsx`, `src/app/boms/new/page.tsx`
- **Change:** Replace generic "Failed to..." messages with actionable guidance. Parse error responses to differentiate permission/validation/network errors.
- **Approach:** Create helper function `formatBomError(err)` that maps common error patterns to user-friendly messages.

### 9. Remove APPROVED → DRAFT Transition
- **File:** `src/app/api/boms/[id]/route.ts`
- **Change:** Remove "DRAFT" from APPROVED valid transitions. This is a dangerous foot-gun.
- **Approach:** Edit the validTransitions map.

### 10. Hard-coded Color in Checkout Card
- **File:** `src/components/bom/checkout-all-button.tsx`
- **Change:** Replace `border-[#E8792B]` with `border-brand-orange`.

### 11. Touch Targets
- **Files:** `src/components/bom/bom-confirmation-card.tsx`, `src/components/bom/bom-line-item-row.tsx`
- **Change:** Increase accept/reject buttons from h-10 to h-11, trash button from h-9 to h-11.

### 12. WCAG Contrast on Yellow Badge
- **File:** `src/components/bom/bom-status-badge.tsx`
- **Change:** Darken IN_PROGRESS text color for WCAG AA compliance. Use amber-700 instead of status-yellow for text.

---

## Phase 3: BOM Template Feature

### Schema Changes
- **File:** `prisma/schema.prisma`
- **Status:** BomTemplate and BomTemplateLineItem models already exist in schema (checked).

### 13. Template API Routes
- **New file:** `src/app/api/bom-templates/route.ts` — GET (list) + POST (create)
- **New file:** `src/app/api/bom-templates/[id]/route.ts` — GET (detail) + PUT (update) + DELETE
- **Roles:** ADMIN, OPERATIONS_MANAGER, OFFICE_MANAGER, SALES_MANAGER can manage templates.

### 14. Template Hooks
- **New file:** `src/hooks/use-bom-templates.ts` — useBomTemplates, useBomTemplate, useCreateBomTemplate, useUpdateBomTemplate, useDeleteBomTemplate

### 15. Template Management Page
- **New file:** `src/app/bom-templates/page.tsx` — List templates with create button
- **New file:** `src/app/bom-templates/new/page.tsx` — Create template form (name, description, product picker for line items)
- **New file:** `src/app/bom-templates/[id]/page.tsx` — View/edit template detail

### 16. Template Components
- **New file:** `src/components/bom/template-line-item-row.tsx` — Line item display for templates (simplified, no checkout/return)

### 17. Template Picker in BOM Creation
- **File:** `src/app/boms/new/page.tsx`
- **Change:** Add "From Template" tab or button in Manual Entry that lets user select a template to pre-fill line items.

---

## Phase 4: E2E Tests

### 18. Update Existing BOM E2E Tests
- **File:** `e2e/bom.spec.ts`
- **Change:** Add tests for confirmation dialogs, role messaging, template flow.

---

## Implementation Order
1. Phases 1-2 in parallel (UX fixes across existing files)
2. Phase 3 (template feature — new files)
3. Phase 4 (E2E tests)
