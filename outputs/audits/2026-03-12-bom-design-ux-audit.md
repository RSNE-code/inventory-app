# BOM Module Design & UX Audit Report

**Date:** 2026-03-12
**Audit Method:** 3 parallel specialized agents (UX Researcher, UI Design System, Product Manager)
**Total Raw Findings:** 57 across all agents (deduplicated to 28 actionable findings below)

---

## Consolidated Findings (Deduplicated & Prioritized)

### P0 — Critical (Workflow Blockers / Data Integrity)

**1. BOM Approval Has No Review Step**
- Source: UX Researcher #4.3, Product Manager #3
- File: `src/app/boms/[id]/page.tsx` lines 524-530
- Problem: "Approve BOM" is a single click with no review screen, summary, or confirmation dialog. Users can accidentally approve incomplete BOMs. The APPROVED → DRAFT downgrade exists in the API but has no UI and no confirmation.
- Impact: Irreversible workflow progression; silent downgrades possible via API.

**2. Role-Based Dead Ends in BOM Lifecycle**
- Source: Product Manager #1, #2
- Files: `src/app/api/boms/[id]/route.ts` lines 83, 113-114; `src/app/boms/[id]/page.tsx` lines 59-62
- Problem: SHOP_FOREMAN can create BOMs but cannot approve them. SALES_MANAGER can create/approve but cannot checkout. After approval, these users see no guidance on next steps — the BOM appears "stuck."
- Impact: Workflow deadlock for specific roles with no recovery path.

**3. Non-Catalog Item Form Shows No Inline Validation**
- Source: UX Researcher #1.3
- File: `src/app/boms/new/page.tsx` lines 129-133
- Problem: Required fields (name, unit, qty) only show a generic toast error on submission attempt. No inline highlighting of which fields are missing.
- Impact: User must hunt for the problem; poor error prevention.

---

### P1 — Major (UX Degradation / Confusion)

**4. No Mode Indicator on Detail Page**
- Source: UX Researcher #5.1
- File: `src/app/boms/[id]/page.tsx` lines 346-394
- Problem: Page content changes dramatically across view/edit/add-material/return modes but no persistent indicator shows which mode the user is in. Users may not realize they've entered edit mode.

**5. Insufficient Stock Warning Not Shown in UI**
- Source: Product Manager #4
- File: `src/app/api/boms/[id]/checkout/route.ts` lines 125-127, 220-221
- Problem: Checkout API returns `warnings.insufficientStock` but the UI never reads or displays it. Users are blind to negative stock situations after checkout.

**6. COMPLETED Status Allowed Without Validation**
- Source: Product Manager #6
- Files: `src/app/boms/[id]/page.tsx` line 589; `src/app/api/boms/[id]/route.ts` lines 96-110
- Problem: User can mark BOM as COMPLETED even if items remain unchecked out or returns are outstanding. No validation on qtyCheckedOut vs qtyNeeded.

**7. Inconsistent Button States Across Modes**
- Source: UX Researcher #6.1, Product Manager #7, #14
- File: `src/app/boms/[id]/page.tsx` lines 473-559
- Problem: Each mode uses different button colors (blue for edit, blue for add-material, green for return). "Check Out All" vs "Adjust & Check Out" overlap in function with unclear distinction. Users must re-learn button semantics per mode.

**8. Generic Error Messages Lack Actionability**
- Source: UX Researcher #7.1, #7.2
- File: `src/app/boms/[id]/page.tsx` lines 85-87, 104-106, 120-122
- Problem: All error handlers use generic messages ("Failed to update status", "Failed to save changes"). No distinction between permission denied, validation failure, or network error. No inline field highlighting on validation errors.

**9. No Undo for Confirmed Items in AI Flow**
- Source: UX Researcher #3.1
- File: `src/components/bom/bom-ai-flow.tsx` lines 130-132
- Problem: Single-click removal of confirmed items with no confirmation dialog. Qty adjustments are silently lost.

**10. No "Unsaved Changes" Warning on Navigation**
- Source: UX Researcher #3.2
- File: `src/app/boms/[id]/page.tsx` lines 52, 64-71
- Problem: Navigating away from edit mode discards all pending changes without warning.

**11. No Inline Help for AI Input**
- Source: UX Researcher #9.1
- File: `src/components/bom/bom-ai-flow.tsx` lines 199-205
- Problem: AI input placeholder provides no examples of expected format. Users don't know how to phrase material requests for best results.

**12. Unit Conversion Calculations Not Explained**
- Source: UX Researcher #2.2
- File: `src/components/bom/bom-line-item-row.tsx` lines 73-93
- Problem: Auto-calculated "pieces needed" from area/length input has no visible formula. Users see "17 pieces" but don't understand the math.

**13. PUT Endpoint Too Permissive for Role-Specific Actions**
- Source: Product Manager #8
- File: `src/app/api/boms/[id]/route.ts` line 84
- Problem: PUT allows SALES_MANAGER and SHOP_FOREMAN to edit notes/quantities on BOMs they didn't create. No separation between "edit line items" and "change status" permissions.

**14. Cancel BOM With Checked-Out Materials Has No Confirmation**
- Source: Product Manager #10
- File: `src/app/boms/[id]/page.tsx` lines 531-538
- Problem: Cancelling a BOM with outstanding checked-out materials leaves materials stranded. No warning or confirmation dialog.

---

### P2 — Major (Visual / Design System)

**15. Hard-Coded Colors Instead of Design Tokens**
- Source: UI Design System #1
- Files: Multiple (`bom-confirmation-card.tsx`, `bom-ai-flow.tsx`, `bom-line-item-row.tsx`)
- Problem: Extensive use of `gray-400`, `gray-500`, `yellow-50`, `orange-600`, `blue-700`, `purple-700` etc. instead of semantic CSS variables or Tailwind theme classes. Tier badges use purple (not in brand system).

**16. Touch Targets Below 44px Minimum**
- Source: UI Design System #5
- Files: `bom-confirmation-card.tsx` (accept/reject buttons 40px), `bom-line-item-row.tsx` (trash button 36px), unit selector 24px
- Problem: Mobile-first app has interactive elements below iOS/Android minimum touch target guidelines (44x44px).

**17. Yellow Status Badge Fails WCAG AA Contrast**
- Source: UI Design System #7
- Problem: Yellow badge for "In Progress" status has contrast ratio of ~2.5:1 vs required 4.5:1 for WCAG AA.

**18. Quantity Input Styling Inconsistent**
- Source: UX Researcher #6.2
- Files: Multiple (`product-picker.tsx`, `bom-line-item-row.tsx`, `bom-confirmation-card.tsx`)
- Problem: Number inputs vary in height (h-9, h-10, h-12), width, and styling across components.

---

### P3 — Minor (Polish / Enhancement)

**19. No Tier System Explanation in UI**
- Source: UX Researcher #5.3, #9.2
- Problem: TIER_1/TIER_2 displayed as "Tracked"/"Expensed" or "T1"/"T2" with no tooltips or explanation.

**20. "Non-Catalog" Category Not Explained**
- Source: UX Researcher #2.3
- File: `src/app/boms/new/page.tsx` lines 264-335
- Problem: No guidance on when/why to use non-catalog items vs catalog search.

**21. No Audit Trail for Non-Approval Status Changes**
- Source: Product Manager #13
- File: `src/app/api/boms/[id]/route.ts`
- Problem: Only APPROVED transition records who/when. CANCELLED and COMPLETED have no reason field or user logging.

**22. Non-Catalog Items Not Editable Post-Addition**
- Source: Product Manager #12
- Problem: Once added, non-catalog item details (name, category, UOM) can only be changed by deleting and re-adding.

**23. Step Progress Indicator Doesn't Match AI Flow**
- Source: UX Researcher #8.1
- File: `src/components/bom/bom-ai-flow.tsx` lines 172-176
- Problem: "Step 1 of 3" implies linear progression but the actual flow is non-linear.

**24. Confirmation Card Over-Information on Mobile**
- Source: UX Researcher #8.2, UI Design System #8
- File: `src/components/bom/bom-confirmation-card.tsx`
- Problem: Card shows product name + badges + stock + alternatives + qty + parsed text. Too dense for mobile. Cards may break on 375px screens.

**25. Inconsistent Empty State Messaging**
- Source: UX Researcher #6.3
- Files: `src/app/boms/page.tsx`, `src/components/bom/bom-ai-flow.tsx`
- Problem: Different visual hierarchy and tone across empty states.

**26. Status Badge Doesn't Link to Next Action**
- Source: UX Researcher #5.2
- File: `src/app/boms/[id]/page.tsx` lines 315-319
- Problem: Status shown but no hint about what the user should do next.

**27. No Export/Print for BOMs**
- Source: UX Researcher #10.4
- Problem: Shop floor staff need printed copies; no export option exists.

**28. No Bulk Operations on BOM List**
- Source: UX Researcher #10.2
- File: `src/app/boms/page.tsx`
- Problem: Must approve/manage BOMs one at a time from list view.

---

## Summary

| Severity | Count |
|----------|-------|
| P0 — Critical | 3 |
| P1 — Major (UX) | 11 |
| P2 — Major (Visual) | 4 |
| P3 — Minor | 10 |
| **Total** | **28** |

---

## Recommended Implementation Order

### Phase 1: Critical (Immediate)
1. Add approval confirmation dialog with item review (#1)
2. Add role-based messaging for "stuck" BOMs (#2)
3. Add inline validation to non-catalog form (#3)

### Phase 2: High-Impact UX
4. Add mode indicator to detail page (#4)
5. Surface insufficient stock warnings after checkout (#5)
6. Add completion validation (#6)
7. Standardize button semantics across modes (#7)
8. Improve error messages with actionable guidance (#8)
9. Add confirmation for AI flow item removal (#9)
10. Add unsaved changes warning (#10)

### Phase 3: Design System
11. Replace hard-coded colors with design tokens (#15)
12. Fix touch targets to 44px minimum (#16)
13. Fix WCAG contrast on yellow badge (#17)
14. Standardize quantity input component (#18)

### Phase 4: Polish
15-28. Remaining minor findings as capacity allows.
