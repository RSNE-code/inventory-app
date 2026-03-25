# Plan: Shadcn Base Component Audit

**Created:** 2026-03-25
**Status:** Implemented
**Request:** Audit and fix all shadcn/ui base components for baked-in styles that silently override usage-site styles

---

## Overview

### What This Plan Accomplishes

Audits every file in `src/components/ui/` and fixes base component classes that conflict with the design system. After this, base components are either (a) clean containers whose look is controlled at the usage site (Card, Dialog, Sheet) or (b) self-styled atoms whose baked-in styles ARE the design system spec (Button, Badge, Input, Label).

### Why This Matters

The Card component had `py-6 gap-6 shadow-brand` baked in, silently overriding `p-5` written at every usage site — causing the dashboard padding bug. The same pattern exists in Dialog (`p-6`), Sheet (`p-4`), and several dropdown/select items using `rounded-sm` instead of `rounded-xl`. Every one of these is a ticking time bomb for visual inconsistency.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `design-inspiration` | Confirmed design system specs: cards p-5, inputs h-9 px-3 text-sm, buttons h-9 px-4 text-sm, badges px-2 py-0.5 text-xs rounded-full |

### How Skills Shaped the Plan

The design-inspiration skill's design-system.md defines exactly what each component type should look like. This lets us categorize components into "containers" (Card, Dialog, Sheet — should be clean) vs "atoms" (Button, Badge, Input — should be self-styled). Containers get their padding at usage sites. Atoms carry their own styles because they ARE the spec.

---

## Current State

### Relevant Existing Structure

15 files in `src/components/ui/`:
badge, button, card, dialog, dropdown-menu, form, input, label, select, separator, sheet, sonner, supplier-logo, swipe-to-delete, tabs

### Gaps or Problems Being Addressed

| Component | Problem | Impact |
|-----------|---------|--------|
| **dialog.tsx** | `p-6` baked in DialogContent | Overrides any p-5 at usage sites |
| **sheet.tsx** | SheetHeader `p-4`, SheetFooter `p-4` | Inconsistent with p-5 design system |
| **dropdown-menu.tsx** | Items use `rounded-sm` | Clashes with rounded-xl design system |
| **select.tsx** | Items use `rounded-sm` | Clashes with rounded-xl design system |
| **input.tsx** | Uses `text-base` (16px) | Design system says text-sm (14px) for inputs |
| **card.tsx** | CardHeader still has `gap-2`, CardFooter has `[.border-t]:pt-6` | Minor padding conflicts |

---

## Proposed Changes

### Summary of Changes

- **Dialog**: Change `p-6` → `p-5` on DialogContent
- **Sheet**: Change header/footer `p-4` → `p-5`
- **Dropdown-menu**: Change item `rounded-sm` → `rounded-xl`
- **Select**: Change item `rounded-sm` → `rounded-xl`
- **Input**: Change `text-base` → `text-sm`
- **Card**: Clean up remaining `gap-2` on CardHeader, `pt-6` on CardFooter

### Components NOT changed (correctly self-styled)

| Component | Why it stays | Matches design system |
|-----------|-------------|----------------------|
| **Badge** | `px-2 py-0.5 text-xs font-medium rounded-full` IS the badge | Yes — badges are pills |
| **Button** | Size variants (`h-9 px-4 text-sm`) ARE the button spec | Yes — matches design system buttons |
| **Label** | `text-sm font-medium` IS the label spec | Yes |
| **Separator** | Already clean | Yes |
| **Sonner** | Already clean | Yes |
| **Supplier-logo** | Already clean | Yes |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `src/components/ui/dialog.tsx` | DialogContent: `p-6` → `p-5` |
| `src/components/ui/sheet.tsx` | SheetHeader: `p-4` → `p-5`; SheetFooter: `p-4` → `p-5` |
| `src/components/ui/dropdown-menu.tsx` | All `rounded-sm` → `rounded-xl` on items |
| `src/components/ui/select.tsx` | All `rounded-sm` → `rounded-xl` on items |
| `src/components/ui/input.tsx` | `text-base` → `text-sm` |
| `src/components/ui/card.tsx` | CardHeader: remove `gap-2`; CardFooter: remove `[.border-t]:pt-6` |
| `src/components/ui/tabs.tsx` | TabsList: `p-[3px]` → `p-1` (use scale value) |

---

## Design Decisions

### Key Decisions Made

1. **Containers vs Atoms**: Card, Dialog, Sheet are "containers" — their internal padding should match the design system p-5 or be controlled at the usage site. Button, Badge, Input, Label are "atoms" — their baked-in styles ARE the spec and should not be touched.

2. **rounded-sm → rounded-xl on menu/select items**: The design system says everything uses rounded-xl. Menu items using rounded-sm is a shadcn default that doesn't match our design system.

3. **Input text-base → text-sm**: Design system specifies 14px (text-sm) for form inputs. text-base (16px) was the shadcn default. Note: iOS auto-zooms on inputs below 16px, but we already set `maximum-scale=1` in the viewport, so this is safe.

4. **Don't touch Button/Badge/Label**: These components' baked-in styles match the design system. Stripping them would break every usage site.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Fix Dialog

**Actions:**
- DialogContent: `p-6` → `p-5`

**Files affected:**
- `src/components/ui/dialog.tsx`

---

### Step 2: Fix Sheet

**Actions:**
- SheetHeader: `p-4` → `p-5`
- SheetFooter: `p-4` → `p-5`

**Files affected:**
- `src/components/ui/sheet.tsx`

---

### Step 3: Fix Dropdown Menu Items

**Actions:**
- All `rounded-sm` → `rounded-xl` in DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem

**Files affected:**
- `src/components/ui/dropdown-menu.tsx`

---

### Step 4: Fix Select Items

**Actions:**
- All `rounded-sm` → `rounded-xl` in SelectItem

**Files affected:**
- `src/components/ui/select.tsx`

---

### Step 5: Fix Input Font Size

**Actions:**
- `text-base` → `text-sm`

**Files affected:**
- `src/components/ui/input.tsx`

---

### Step 6: Clean Up Card Sub-Components

**Actions:**
- CardHeader: remove `gap-2`
- CardFooter: remove `[.border-t]:pt-6`

**Files affected:**
- `src/components/ui/card.tsx`

---

### Step 7: Fix Tabs Arbitrary Value

**Actions:**
- TabsList: `p-[3px]` → `p-1`

**Files affected:**
- `src/components/ui/tabs.tsx`

---

### Step 8: QA

**Actions:**
- `npx tsc --noEmit` — zero errors
- `npx tsx scripts/token-audit.ts` — zero warnings
- Visual check: Dashboard cards, door creation dialogs, sheet modals, dropdown menus, select dropdowns, tab bars

**Files affected:**
- All modified files

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] Token audit: 0 errors, 0 warnings
- [ ] Dialog padding matches cards (p-5)
- [ ] Sheet header/footer padding matches cards (p-5)
- [ ] Dropdown menu items have rounded corners (rounded-xl)
- [ ] Select items have rounded corners (rounded-xl)
- [ ] Input text is 14px (text-sm), not 16px
- [ ] No `rounded-sm` remains in any UI component
- [ ] No arbitrary values (`p-[3px]`) remain in UI components

---

## Success Criteria

1. Every container component (Card, Dialog, Sheet) has zero conflicting padding/gap/shadow in its base — all controlled at usage site or matching design system p-5
2. Every atom component (Button, Badge, Input, Label) has styles that exactly match the design system spec
3. Zero `rounded-sm` or `rounded-md` in any UI base component
4. Token audit passes with 0 errors, 0 warnings

---

## Notes

- The `shadow-brand-md` on Dialog and Sheet is CORRECT for floating elements — the design system says dropdowns/modals/toasts get shadows. Don't remove these.
- Button's `shadow-xs` on the outline variant is intentional per shadcn — leave it.
- Swipe-to-delete has `font-semibold text-sm` on its delete button — this is correct for a destructive action button.
