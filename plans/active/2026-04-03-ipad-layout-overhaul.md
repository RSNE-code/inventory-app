# Plan: iPad Layout Overhaul

**Created:** 2026-04-03
**Status:** Implemented
**Request:** Adapt every mobile app screen to take advantage of iPad 11" screen real estate with split views, multi-column grids, constrained forms, and generous spacing.

---

## Overview

### What This Plan Accomplishes

Transforms every screen in the React Native app from a stretched phone layout into a purpose-built iPad experience. The infrastructure already exists (`SplitView`, `ResponsiveGrid`, `IPadPage`, `useIsTablet` hook) but zero screens use it. This plan wires up every screen to those components and adds iPad-specific spacing, creating an app that feels native to the iPad 11" Air — the foreman's primary device.

### Why This Matters

The iPad 11" Air is the primary device for construction foremen using this app. A stretched phone layout wastes 60% of the screen, makes the app feel amateur, and reduces productivity. iPad-native layouts let users see more data at once (multi-column dashboards, side-by-side master-detail) and interact more efficiently with properly-spaced touch targets for gloved hands.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Creative direction: which screens get SplitView vs Grid vs IPadPage. Dashboard widget arrangement in 2-column grid. List screens pattern selection. |
| `design-inspiration` | Design system enforcement: consistent card styling, spacing scale for iPad (24px screen padding vs 16px phone), typography stays same size. Tab bar remains bottom. |

### How Skills Shaped the Plan

Frontend-design identified that list screens should use two different patterns: multi-column cards for scan-heavy browsing (Inventory) and SplitView master-detail for deep-detail flows (BOMs, Assemblies). Design-inspiration enforced that iPad gets more space, not bigger text — information density increases without font inflation. Both skills agreed cards must be visually identical across all screens.

---

## Current State

### Relevant Existing Structure

**Layout components (built but unused):**
- `mobile/components/layout/SplitView.tsx` — 38/62 master-detail split
- `mobile/components/layout/ResponsiveGrid.tsx` — adaptive column grid
- `mobile/components/layout/iPadPage.tsx` — centered max-width container

**Hooks (built but unused):**
- `mobile/lib/hooks/useDeviceType.ts` — `useIsTablet()`, `useColumns()`, `useTouchTarget()`

**Constants (defined but not leveraged):**
- `mobile/constants/layout.ts` — `TABLET_BREAKPOINT` (768), `FORM_MAX_WIDTH` (600), `SETTINGS_MAX_WIDTH` (500), `SPLIT_VIEW` ratios

**Screens (all phone-only layout):**
- 5 tab screens: Dashboard, Receive, Inventory, BOMs, Assemblies
- 10+ detail/form screens: Product detail/new/edit/adjust, BOM detail/new/review, Assembly detail/new, Settings, Login, Cycle Counts, Reorder, BOM Templates

### Gaps or Problems Being Addressed

- Every screen renders single-column, full-width — phone layout stretched to iPad
- No split-view master-detail anywhere — all navigation is stack-push
- Dashboard stacks 6 widgets vertically — wastes half the iPad screen
- Forms stretch edge-to-edge on iPad — inputs are absurdly wide
- No iPad-specific padding — 16px padding looks cramped on 820pt screen
- Detail screens don't use the extra width for side-by-side cards

---

## Proposed Changes

### Summary of Changes

- Add `useResponsiveSpacing()` hook for iPad-aware padding
- Update Dashboard to use `ResponsiveGrid` for 2-column widget layout
- Update Inventory list to use `ResponsiveGrid` for 2-column product cards
- Update BOMs tab to use `SplitView` master-detail on iPad
- Update Assemblies tab to use `SplitView` master-detail on iPad
- Update Receive tab to use `IPadPage` for centered AI flow
- Wrap all form screens in `IPadPage` (New Product, Edit Product, Adjust Stock, New BOM, New Assembly)
- Update all detail screens with `IPadPage` at wider max-width (720px) and side-by-side card sections
- Update Settings to use `IPadPage` with `SETTINGS_MAX_WIDTH`
- Update Header to use iPad-appropriate spacing
- Increase screen-level padding from 16px to 24px on iPad

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `mobile/lib/hooks/useDeviceType.ts` | Add `useResponsiveSpacing()` hook |
| `mobile/constants/layout.ts` | Add `DETAIL_MAX_WIDTH` constant (720) |
| `mobile/app/(tabs)/index.tsx` | Wrap dashboard widgets in `ResponsiveGrid`, iPad padding |
| `mobile/app/(tabs)/inventory.tsx` | 2-column `ResponsiveGrid` for product cards on iPad |
| `mobile/app/(tabs)/boms.tsx` | `SplitView` master-detail for BOM list tab on iPad |
| `mobile/app/(tabs)/assemblies.tsx` | `SplitView` master-detail for assembly queues on iPad |
| `mobile/app/(tabs)/receive.tsx` | `IPadPage` wrapper for receiving flow |
| `mobile/app/inventory/new.tsx` | Wrap form in `IPadPage` |
| `mobile/app/inventory/[id].tsx` | `IPadPage` at 720px, side-by-side cards on iPad |
| `mobile/app/inventory/[id]/edit.tsx` | Wrap form in `IPadPage` |
| `mobile/app/inventory/[id]/adjust.tsx` | Wrap form in `IPadPage` |
| `mobile/app/boms/new.tsx` | Wrap form in `IPadPage` |
| `mobile/app/boms/[id].tsx` | `IPadPage` at 720px, enhanced detail layout |
| `mobile/app/boms/review.tsx` | Wrap in `IPadPage` |
| `mobile/app/assemblies/new.tsx` | Wrap form in `IPadPage` |
| `mobile/app/assemblies/[id].tsx` | `IPadPage` at 720px, side-by-side specs + actions |
| `mobile/app/settings.tsx` | Wrap in `IPadPage` with `SETTINGS_MAX_WIDTH` |
| `mobile/app/cycle-counts.tsx` | Wrap in `IPadPage` |
| `mobile/app/reorder.tsx` | Wrap in `IPadPage` |
| `mobile/app/bom-templates/index.tsx` | 2-column grid on iPad |
| `mobile/app/bom-templates/[id].tsx` | `IPadPage` at 720px |
| `mobile/app/bom-templates/new.tsx` | Wrap form in `IPadPage` |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Dashboard uses ResponsiveGrid, not SplitView**: The dashboard is a single-page overview with 6 widgets. A 2-column grid with some full-width spans is the right pattern — SplitView implies master-detail navigation which doesn't apply here.

2. **Inventory uses multi-column cards, BOMs/Assemblies use SplitView**: Inventory browsing is scan-heavy — users want to see many items. BOMs and Assemblies have rich detail views with line items, specs, and actions — the SplitView master-detail pattern lets users browse and inspect without navigation.

3. **SplitView shows inline detail (no navigation push on iPad)**: When a BOM/Assembly card is tapped on iPad, the detail renders in the right panel instead of pushing a new screen. This requires embedding the detail view content directly in the tab screen rather than navigating to `boms/[id]`. The `[id]` route remains for direct deep links and phone navigation.

4. **Forms get IPadPage(600), details get IPadPage(720)**: Forms don't need full width — 600px prevents absurdly wide inputs. Detail screens benefit from slightly more width (720px) to accommodate side-by-side stat cards and wider line item tables.

5. **iPad gets more spacing, not bigger text**: Screen padding increases from 16px to 24px. Typography stays identical. The extra space creates breathing room and makes the density feel intentional, not cramped.

6. **Tab bar stays at bottom**: iPadOS apps (Files, Notes) use bottom tabs successfully. Converting to a sidebar would be a much larger change and isn't needed. The existing `TabBar.tsx` naturally gets more horizontal room on iPad.

7. **Login screen unchanged**: Already has `maxWidth: 420` and is centered — looks correct on iPad already.

### Alternatives Considered

- **Sidebar navigation on iPad**: Rejected — too large a structural change for the tab system, and bottom tabs work fine on iPad. Can revisit later if needed.
- **3-column dashboard grid**: Rejected — iPad 11" is 820pt wide. Three columns with 24px padding and 16px gaps = ~240pt per column, too narrow for meaningful widget content.
- **SplitView for all list screens**: Rejected — Inventory list items are simple (name, SKU, stock badge). The detail view is also simple (one card with stats). Multi-column cards are more efficient for browsing.

### Open Questions

1. **BOM/Assembly SplitView inline detail**: This means the BOM detail content needs to be extractable as a component that can render both inline (SplitView right panel) and standalone (pushed route on phone). Should we create `BomDetailContent` and `AssemblyDetailContent` components that both the tab SplitView and the `[id]` routes share? **Recommendation: Yes**, this avoids code duplication.

---

## Step-by-Step Tasks

### Step 1: Add Responsive Spacing Hook + Constants

Add a `useResponsiveSpacing()` hook that returns iPad-aware spacing values, and add the `DETAIL_MAX_WIDTH` constant.

**Actions:**

- In `mobile/lib/hooks/useDeviceType.ts`, add:
  ```typescript
  /** Returns responsive spacing — more generous on iPad */
  export function useResponsiveSpacing() {
    const isTablet = useIsTablet();
    return {
      screenPadding: isTablet ? spacing['2xl'] : spacing.lg,
      cardPadding: isTablet ? spacing.xl : spacing.lg,
      sectionGap: isTablet ? spacing.xl : spacing.lg,
    };
  }
  ```
  (Import `spacing` from `@/constants/layout`)

- In `mobile/constants/layout.ts`, add:
  ```typescript
  /** Max content width for detail screens on iPad */
  export const DETAIL_MAX_WIDTH = 720;
  ```

**Files affected:**
- `mobile/lib/hooks/useDeviceType.ts`
- `mobile/constants/layout.ts`

---

### Step 2: Dashboard — 2-Column Widget Grid

Transform the dashboard from a vertical stack into a 2-column grid on iPad with select widgets spanning full width.

**Actions:**

- Import `ResponsiveGrid` and `useResponsiveSpacing` and `useIsTablet`
- Replace the vertical stack of `Animated.View` widgets with a layout that:
  - ActionItems: full-width (outside the grid, or span both columns)
  - WorkPipelines + StockSummaryCard: side-by-side in a `ResponsiveGrid` with `tabletColumns={2}`
  - LowStockList + InventoryTrendChart: side-by-side in another `ResponsiveGrid` with `tabletColumns={2}`
  - RecentActivity: full-width
- Update `styles.content` padding to use `useResponsiveSpacing().screenPadding`
- Keep all existing animations — just restructure the layout hierarchy

**Files affected:**
- `mobile/app/(tabs)/index.tsx`

---

### Step 3: Inventory List — 2-Column Product Cards

Convert the single-column FlatList into a 2-column grid on iPad.

**Actions:**

- Import `useIsTablet` and `useResponsiveSpacing`
- On iPad: set `FlatList` `numColumns={2}` and `columnWrapperStyle` with gap
- Each `ProductCard` needs `flex: 1` inside the column wrapper
- Update padding to use `useResponsiveSpacing().screenPadding`
- Note: `FlatList` `numColumns` requires the `key` prop to change when columns change (React Native requirement) — use `key={isTablet ? 'tablet' : 'phone'}` on the FlatList

**Files affected:**
- `mobile/app/(tabs)/inventory.tsx`

---

### Step 4: Extract BOM Detail Content Component

Before adding SplitView to the BOMs tab, extract the detail view content into a reusable component that can render inline (SplitView) or standalone (route).

**Actions:**

- Create `mobile/components/bom/BomDetailContent.tsx` — extract the entire ScrollView content from `mobile/app/boms/[id].tsx` into this component
- Props: `bomId: string`, `onBack?: () => void` (for SplitView dismiss)
- The component handles its own data fetching via `useBom(bomId)`
- Update `mobile/app/boms/[id].tsx` to use `<BomDetailContent bomId={id} />` wrapped in Header + scroll
- Verify the refactored route still works identically

**Files affected:**
- `mobile/components/bom/BomDetailContent.tsx` (new)
- `mobile/app/boms/[id].tsx`

---

### Step 5: Extract Assembly Detail Content Component

Same pattern as Step 4 for assemblies.

**Actions:**

- Create `mobile/components/assemblies/AssemblyDetailContent.tsx` — extract ScrollView content from `mobile/app/assemblies/[id].tsx`
- Props: `assemblyId: string`, `onBack?: () => void`
- Update `mobile/app/assemblies/[id].tsx` to use the extracted component
- Verify the route still works

**Files affected:**
- `mobile/components/assemblies/AssemblyDetailContent.tsx` (new)
- `mobile/app/assemblies/[id].tsx`

---

### Step 6: BOMs Tab — SplitView Master-Detail on iPad

Add SplitView to the BOMs tab so tapping a BOM card on iPad shows its detail inline.

**Actions:**

- Import `SplitView`, `useIsTablet`, `useResponsiveSpacing`, `BomDetailContent`
- Add `selectedBomId` state
- On iPad (BOM List tab active): render `SplitView` with:
  - `master`: the existing FlatList of BomCards (with `onPress` setting `selectedBomId` instead of navigating)
  - `detail`: `selectedBomId ? <BomDetailContent bomId={selectedBomId} /> : <EmptyState title="Select a BOM" ... />`
- On phone: keep existing behavior (FlatList with `router.push` on press)
- Create BOM tab stays as-is (not a SplitView scenario)
- Update padding for iPad

**Files affected:**
- `mobile/app/(tabs)/boms.tsx`

---

### Step 7: Assemblies Tab — SplitView Master-Detail on iPad

Same pattern as Step 6 for assemblies.

**Actions:**

- Import `SplitView`, `useIsTablet`, `useResponsiveSpacing`, `AssemblyDetailContent`
- Add `selectedAssemblyId` state
- On iPad: `SplitView` with assembly list as master, detail as right panel
- On phone: keep existing `router.push` navigation
- Handle tab switching (Door Shop / Fabrication / Shipping) — clear `selectedAssemblyId` when tab changes
- Update padding for iPad

**Files affected:**
- `mobile/app/(tabs)/assemblies.tsx`

---

### Step 8: Receive Tab — IPadPage Wrapper

Center the receiving flow content on iPad.

**Actions:**

- Import `IPadPage` and `useResponsiveSpacing`
- Wrap the `ScrollView` content inside `<IPadPage maxWidth={FORM_MAX_WIDTH}>`
- Update screen padding for iPad
- The ReceivingFlow and ReceiptHistory components render within the constrained width

**Files affected:**
- `mobile/app/(tabs)/receive.tsx`

---

### Step 9: Form Screens — IPadPage Wrapper

Wrap all form/create/edit screens in `IPadPage` to prevent edge-to-edge stretching.

**Actions:**

For each of these screens, wrap the form content in `<IPadPage>`:
- `mobile/app/inventory/new.tsx` — wrap ScrollView content in IPadPage
- `mobile/app/inventory/[id]/edit.tsx` — wrap ScrollView content in IPadPage
- `mobile/app/inventory/[id]/adjust.tsx` — wrap ScrollView content in IPadPage
- `mobile/app/boms/new.tsx` — wrap ScrollView content in IPadPage
- `mobile/app/assemblies/new.tsx` — wrap ScrollView content in IPadPage
- `mobile/app/bom-templates/new.tsx` — wrap ScrollView content in IPadPage
- `mobile/app/boms/review.tsx` — wrap in IPadPage

Also update padding to use `useResponsiveSpacing().screenPadding`.

**Files affected:**
- `mobile/app/inventory/new.tsx`
- `mobile/app/inventory/[id]/edit.tsx`
- `mobile/app/inventory/[id]/adjust.tsx`
- `mobile/app/boms/new.tsx`
- `mobile/app/assemblies/new.tsx`
- `mobile/app/bom-templates/new.tsx`
- `mobile/app/boms/review.tsx`

---

### Step 10: Detail Screens — Wider IPadPage + Side-by-Side Sections

Enhance detail screens with wider max-width and side-by-side card layouts on iPad.

**Actions:**

**Product Detail (`mobile/app/inventory/[id].tsx`):**
- Wrap in `<IPadPage maxWidth={DETAIL_MAX_WIDTH}>`
- On iPad: render Details card and Actions side-by-side using a `flexDirection: 'row'` wrapper when `isTablet`
- `statGrid` inside top card: change to show all 4 items in a single row on iPad (instead of 2×2 wrap)

**BOM Detail (`mobile/app/boms/[id].tsx`):**
- Already uses `BomDetailContent` from Step 4
- Wrap in `<IPadPage maxWidth={DETAIL_MAX_WIDTH}>`
- On iPad: action buttons render horizontally instead of stacked

**Assembly Detail (`mobile/app/assemblies/[id].tsx`):**
- Already uses `AssemblyDetailContent` from Step 5
- Wrap in `<IPadPage maxWidth={DETAIL_MAX_WIDTH}>`
- On iPad: specs card and actions card side-by-side

**BOM Template Detail (`mobile/app/bom-templates/[id].tsx`):**
- Wrap in `<IPadPage maxWidth={DETAIL_MAX_WIDTH}>`

**Files affected:**
- `mobile/app/inventory/[id].tsx`
- `mobile/app/boms/[id].tsx`
- `mobile/app/assemblies/[id].tsx`
- `mobile/app/bom-templates/[id].tsx`

---

### Step 11: Settings + Utility Screens — IPadPage

Constrain settings and utility screens.

**Actions:**

- `mobile/app/settings.tsx` — wrap in `<IPadPage maxWidth={SETTINGS_MAX_WIDTH}>`
- `mobile/app/cycle-counts.tsx` — wrap in `<IPadPage>`
- `mobile/app/reorder.tsx` — wrap in `<IPadPage>`
- `mobile/app/bom-templates/index.tsx` — 2-column grid on iPad (like Inventory)

**Files affected:**
- `mobile/app/settings.tsx`
- `mobile/app/cycle-counts.tsx`
- `mobile/app/reorder.tsx`
- `mobile/app/bom-templates/index.tsx`

---

### Step 12: QA — TypeScript, Visual Verification, Token Audit

Run full QA before committing.

**Actions:**

- Run `cd mobile && npx tsc --noEmit` to verify TypeScript
- Run `npx expo start` and verify on iPad Simulator (if available)
- Manually review each changed screen:
  - Dashboard: 2-column grid with full-width spans
  - Inventory: 2-column product cards
  - BOMs: SplitView with inline detail
  - Assemblies: SplitView with inline detail
  - Receive: centered content
  - All forms: centered at 600px max
  - All details: centered at 720px max
  - Settings: centered at 500px max
- Verify phone layout is unchanged (all changes are iPad-only via `useIsTablet`)
- Verify no styling inconsistencies between cards on different screens

**Files affected:**
- All modified files (read-only verification)

---

## Connections & Dependencies

### Files That Reference This Area

- `mobile/components/layout/SplitView.tsx` — currently unused, will be used by BOMs + Assemblies tabs
- `mobile/components/layout/ResponsiveGrid.tsx` — currently unused, will be used by Dashboard + Inventory
- `mobile/components/layout/iPadPage.tsx` — currently unused, will be used by all form/detail/settings screens
- `mobile/lib/hooks/useDeviceType.ts` — currently has `useIsTablet`, will add `useResponsiveSpacing`

### Updates Needed for Consistency

- `context/project-status.md` — update to reflect iPad layout work
- Memory: update project session memory after completion

### Impact on Existing Workflows

- **Phone layout**: Zero impact. All changes are gated behind `useIsTablet()` — phone renders identically.
- **Navigation**: On iPad, BOMs and Assemblies tabs will show detail inline instead of pushing routes. The pushed routes still work for deep links and phone.
- **Data fetching**: No changes. Same hooks, same API calls.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Phone layout unchanged — verified on iPhone simulator or narrow window
- [ ] Dashboard shows 2-column widget grid on iPad
- [ ] Inventory shows 2-column product cards on iPad
- [ ] BOMs tab shows SplitView master-detail on iPad
- [ ] Assemblies tab shows SplitView master-detail on iPad
- [ ] Receive tab content is centered on iPad
- [ ] All form screens (new/edit/adjust) are centered at 600px max on iPad
- [ ] All detail screens are centered at 720px max on iPad
- [ ] Settings is centered at 500px max on iPad
- [ ] Cards look identical across all screens (padding, radius, border, shadow)
- [ ] No hardcoded spacing values — all from constants
- [ ] Touch targets remain 48px minimum on iPad

---

## Success Criteria

The implementation is complete when:

1. Every screen in the app renders a distinct iPad-optimized layout that takes advantage of the 11" screen
2. Phone layouts are completely unchanged
3. BOMs and Assemblies tabs support master-detail browsing without navigation on iPad
4. All forms and detail views are properly width-constrained and centered on iPad
5. TypeScript compiles cleanly

---

## Notes

- The `SplitView` component may need minor enhancement to support scrollable master panels — verify during implementation
- If the iPad Simulator isn't available, test by resizing the Expo web view to 820px width (approximate iPad 11" portrait)
- Future enhancement: consider converting the bottom tab bar to a sidebar on iPad for a more native iPadOS feel — deferred for now as it's a larger structural change
- The `IPadPage` component's `tabletOuter` style uses `alignItems: 'center'` which is correct for centering, but verify it doesn't conflict with `ScrollView` flex behavior
