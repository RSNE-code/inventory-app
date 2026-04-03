# Plan: iPad App Critical Path — Full Feature Parity

**Created:** 2026-04-03
**Status:** Draft
**Request:** Implement the 36-item Critical Path from the master audit (outputs/master-audit-2026-04-03.md) to achieve full webapp-to-iPad feature parity. Incorporates Gabe's 7 immediate bugs.

---

## Overview

### What This Plan Accomplishes

Transforms the iPad app from a layout shell into a fully functional mirror of the webapp. 29 components already exist but are unwired — Phase 1 connects them, unlocking door creation wizards, PO-matched receiving, fab gate checks, and spec/manufacturing sheets. Phases 2-3 build the missing BOM detail features and high-priority enhancements. Phase 4 polishes iPad touch targets and layout.

### Why This Matters

Gabe's 30-second review found 7 issues Claude's audit missed. The root cause: components were built but never wired into screens. The foremen's primary device is an iPad 11" Air — every workflow they use daily in the webapp must work identically (but iPad-optimized) in the mobile app.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | iPad layout creative direction: SplitView ratios, card sizing, touch targets, form constraints |
| `design-inspiration` | Design system consistency: Apple Notes simplicity + Monday.com bold colors with RSNE brand palette. iOS stack context: Figtree typography, design token imports, iPad 11" primary target |
| `rn-feature` | Architecture patterns: screen structure (Header → useIsTablet → SplitView), API hooks (TanStack Query + queryKeys), component pattern (StyleSheet.create + design tokens), DetailContent inline/standalone pattern |
| `react-native-best-practices` | Performance: render-phase setState fix confirmed, useMemo for filtered lists, useCallback for all wired callbacks, FlatList optimization props (keyExtractor, getItemLayout, windowSize, maxToRenderPerBatch), Reanimated spring configs from constants |
| `react-best-practices` | Re-render prevention: ternary over && in RN (avoids rendering "0"), functional setState for toggle callbacks, no inline components in renderItem, derived state via useMemo not useEffect+setState |

### How Skills Shaped the Plan

Five skills informed every phase. The `rn-feature` skill mandates architecture patterns for all new files (screens, hooks, components). The `react-native-best-practices` and `react-best-practices` skills identified 8 specific performance requirements that apply across all steps — documented below as Cross-Cutting Rules. The `design-inspiration` and `frontend-design` skills enforce visual consistency (44pt touch targets, /15 opacity badges, SPRING_CONFIG animations, design token imports).

---

## Cross-Cutting Rules (Apply to ALL Steps)

These rules come from the skill review and apply universally. Every step must satisfy them.

### Performance (react-native-best-practices + react-best-practices)

1. **Stable callbacks:** Every callback passed to a child component, FlatList renderItem, or onPress handler MUST use `useCallback` with explicit deps.
2. **useMemo for computed lists:** Any filtered, sorted, or derived list MUST use `useMemo` — never raw `.filter()` in the render body for lists that change infrequently.
3. **Ternary over &&:** Use `condition ? <Component /> : null` — never `condition && <Component />`. In React Native, `0 && <X/>` renders "0" as text.
4. **Functional setState for toggles:** When updating state based on previous state (e.g., `setSelected(prev => ...)`), always use the functional form.
5. **No inline components:** Never define a component inside another component's render body. Extract to module-level functions.
6. **Direct imports:** Import components directly (`from "@/components/ui/Card"`) — never use barrel files.

### Architecture (rn-feature)

7. **New components:** Every new `.tsx` file MUST use `StyleSheet.create()` at module level. All values come from design token imports: `colors`, `typography`, `spacing`, `radius` from `@/constants/*`. No magic numbers.
8. **New hooks:** New React Query hooks go in `hooks/use-<domain>.ts` using `queryKeys` from `@/lib/query-keys`. Use `useQuery` for reads, `useMutation` for writes with `onSuccess: () => qc.invalidateQueries(...)`.
9. **iPad-first:** All new components must call `useIsTablet()` or `useResponsiveSpacing()` if they have layout differences. Touch targets: 44pt minimum (phone), 48pt on iPad.

### Design (design-inspiration + frontend-design)

10. **Card consistency:** All new cards match existing Card component styling — same padding, border-radius, accent bar pattern.
11. **Status badges:** Use `/15` opacity minimum (not `/8`). Status colors from `colors.status*` tokens.
12. **Animations:** Use `SPRING_CONFIG` (damping 20), `STAGGER_DELAY`, `CARD_ENTER_DELAY` from `@/constants/animations`. No arbitrary spring values.
13. **Typography:** All text uses spreads from `@/constants/typography` (e.g., `...typography.cardTitle`). Font families via `fontFamily.*` tokens only.

---

## Current State

### Relevant Existing Structure

**29 components exist but are unwired:**
- `components/doors/` — DoorCreationFlow, DoorBuilder, DoorSpecSheet, DoorManufacturingSheet, DoorDiagram, DoorConfirmation, TapeMeasureInput
- `components/bom/` — FabGateSection, PanelCheckoutSheet, LiveItemFeed, FlaggedItemResolver, PanelDimensionEditor, MatchCorrectionSheet, BomAIFlow, UnitConversionPrompt
- `components/receiving/` — POMatchCard, POReceiveCard, PanelBreakout, ReceivingConfirmationCard, ReceiptSummary
- `components/shipping/` — FinishedGoodsList
- `components/fab/` — FabCreationFlow, PanelSpecForm, RampSpecForm
- `components/shared/` — CelebrationOverlay, StartBuildModal
- `components/ai/` — ConfirmationCard, VoiceOrb (VoiceOrb NOT needed per CLAUDE.md)
- `components/ui/` — SwipeableRow, SupplierLogo
- `components/inventory/` — StockoutRiskCard, InventoryForecastChart

**5 components need to be built:**
- CartBar (expandable bottom cart for New BOM)
- PanelLineItemForm (panel-specific form for BOM creation)
- ReceivingConfirmationList (bulk confirm wrapper)
- Assembly Approval Card (approve/reject with notes)
- Toast notification system

### Gaps or Problems Being Addressed

**Gabe's 7 immediate bugs:**
1. Browse POs button has empty `onPress` handler
2. No PO detail route exists (`/pos/[id].tsx`)
3. BOM Create tab shows "Packing Slip" first (should be "Browse Products" first)
4. Job picker results not in ScrollView — can't scroll beyond 8 items
5. Door cards may have text alignment issues (needs visual verification)
6. Door summary cards use generic key-value instead of formatted spec sheets
7. No Spec Sheet or Manufacturing Sheet toggle in door assembly detail

---

## Proposed Changes

### Summary of Changes

**Phase 0 (Quick Fixes):** Fix Gabe's 7 immediate bugs — 5 are code fixes, 2 resolved by Phase 1.

**Phase 1 (Wire Existing Components):** Connect 15 existing components into 6 screens. This is the biggest single improvement — most code is already written, it just needs to be imported and rendered.

**Phase 2 (Build BOM Detail Features):** Build mode system (Edit/Add-Material/Return), per-item checkout, approval flow, and completion actions for BOM detail.

**Phase 3 (High Priority Features):** Wire FinishedGoodsList, build CartBar, toast system, celebration overlay, Receipt History improvements, Product Detail transaction history, Assembly card enhancements.

**Phase 4 (iPad Optimization):** Touch target fixes, Sheet width constraints, Cycle Counts layout.

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `app/(tabs)/boms.tsx` | Swap card order (Browse Products first), fix render-phase setState |
| `components/shared/JobPicker.tsx` | Wrap results in ScrollView with maxHeight |
| `app/assemblies/new.tsx` | Replace inline forms with DoorCreationFlow + FabCreationFlow |
| `components/assemblies/AssemblyDetailContent.tsx` | Wire DoorSpecSheet, DoorManufacturingSheet, approval card |
| `components/assemblies/AssemblyCard.tsx` | Add door spec pills, BOM match badges |
| `components/bom/BomDetailContent.tsx` | Wire FabGateSection, PanelCheckoutSheet, mode system, approval/completion |
| `app/boms/new.tsx` | Wire LiveItemFeed, FlaggedItemResolver, CartBar |
| `components/receiving/ReceivingFlow.tsx` | Wire POMatchCard, POReceiveCard, PanelBreakout, fix Browse POs button |
| `app/(tabs)/assemblies.tsx` | Wire FinishedGoodsList in Shipping tab, fix render-phase setState |
| `app/(tabs)/receive.tsx` | Wire ReceivingConfirmationCard, ReceiptSummary |
| `app/(tabs)/index.tsx` | Add ActionItems row navigation, wire dashboard navigation |
| `components/layout/Header.tsx` | Increase icon button touch targets |
| `components/ui/Sheet.tsx` | Constrain width on iPad |

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `components/bom/BomModeBar.tsx` | Edit/Add-Material/Return mode banner and switching |
| `components/bom/PickCheckoutSection.tsx` | Per-item checkout with select-all + qty steppers |
| `components/bom/CartBar.tsx` | Expandable bottom cart for New BOM flow |
| `components/assemblies/ApprovalCard.tsx` | Approve/Reject with notes textarea |
| `components/shared/Toast.tsx` | Toast notification system (success/error) |
| `hooks/use-toast.ts` | Toast state management hook |

---

## Design Decisions

### Key Decisions Made

1. **Phase 1 first (wiring):** 29 components already exist. Wiring is lower risk and higher reward than building new features. One wiring task for DoorCreationFlow enables the entire 3-step door wizard.

2. **Fix immediate bugs in Phase 0:** Gabe sees these every time he opens the app. Fixing them first builds confidence that the app is improving.

3. **BOM modes as separate phase:** The Edit/Add-Material/Return mode system is the most complex build task. Isolating it prevents it from blocking simpler wins.

4. **Toast over Alert:** React Native's `Alert.alert()` is jarring and blocks interaction. A toast system (auto-dismiss, non-blocking) matches the webapp's sonner pattern.

5. **DoorCreationFlow replaces inline form entirely:** The inline form in `assemblies/new.tsx` is a placeholder with a comment saying "full door spec builder will be available in the enhanced version." DoorCreationFlow is that enhanced version.

### Alternatives Considered

- **Build CartBar as bottom sheet:** Rejected — webapp uses sticky bottom bar, more accessible on iPad.
- **Separate PO detail route:** Not needed — POs are viewed inline during receiving, not as standalone pages. The "tap on PO returns error" is actually a UX flow issue, not a missing route.

### Open Questions

1. Should "Browse Products" or "Packing Slip" be first on the BOM Create tab? (Gabe's bug #3 implies Browse Products should be first — implementing that.)

---

## Step-by-Step Tasks

### Phase 0: Quick Fixes (Gabe's Immediate Bugs)

#### Step 0.1: Swap BOM Create card order

**Bug #3:** "Packing Slip" shows first, should be "Browse Products" first.

**Actions:**
- In `app/(tabs)/boms.tsx`, swap the two `Animated.View` blocks so Browse Products (ShoppingCart icon, blue) renders first and Packing Slip (Camera icon, orange) renders second
- Keep the animation delay stagger (first card has no delay, second card has STAGGER_DELAY)

**Files affected:**
- `app/(tabs)/boms.tsx` (lines 207-239)

---

#### Step 0.2: Fix JobPicker scrollable results

**Bug #4:** Results don't scroll — can't access jobs beyond visible area.

**Actions:**
- Replace the `jobs.slice(0, 8).map(...)` block (lines 93-107) with a `FlatList` inside the dropdown Card
- FlatList props: `keyExtractor={(job) => job.id}`, `maxHeight: 240`, `nestedScrollEnabled`
- Use `useCallback` for `renderItem` (stable reference)
- Remove the `slice(0, 8)` — let FlatList virtualize naturally (set `maxToRenderPerBatch={10}`)

**Files affected:**
- `components/shared/JobPicker.tsx`

---

#### Step 0.3: Fix render-phase setState in boms.tsx and assemblies.tsx

**Actions:**
- Move `setSelectedBomId(displayBoms[0].id)` into a `useEffect` with `[displayBoms, selectedBomId, isTablet]` deps
- Same pattern for `setSelectedAssemblyId` in assemblies.tsx

**Files affected:**
- `app/(tabs)/boms.tsx` (line 84-86)
- `app/(tabs)/assemblies.tsx` (line 79-81)

---

#### Step 0.4: Fix Browse POs button handler

**Bug #1:** Empty `onPress` handler on Browse POs entry card.

**Actions:**
- Add state `showPOBrowser` to ReceivingFlow
- Browse POs button sets `showPOBrowser(true)` and scrolls to POBrowser section
- Or: scroll to the POBrowser component that's already rendered below

**Files affected:**
- `components/receiving/ReceivingFlow.tsx`

---

#### QA Gate: Phase 0

**Run before committing Phase 0 changes.**

1. **TypeScript:** `npx tsc --noEmit` — must pass
2. **Performance audit on changed files:**
   - `boms.tsx` and `assemblies.tsx`: auto-select now in `useEffect`, no render-phase setState
   - `JobPicker.tsx`: FlatList has `keyExtractor`, `renderItem` uses `useCallback`
   - No `&&` conditional renders in changed code
3. **Functional walk-through:**
   - Open BOM Create tab → "Browse Products" card appears FIRST (left on iPad), "Packing Slip" SECOND
   - Open JobPicker → type a search → results scroll beyond visible area → can tap any result
   - Open BOM List on iPad → first BOM auto-selects without console warnings
   - Open Assemblies on iPad → first assembly auto-selects without console warnings
   - Receive tab → tap "Browse POs" → navigates to PO browser (not a dead button)

---

### Phase 1: Wire Existing Components

#### Step 1.1: Wire DoorCreationFlow into assemblies/new.tsx

**CRITICAL.** The entire 3-step door wizard (Name > Specs > Confirm) exists as a component. Currently, `assemblies/new.tsx` has an inline form with a placeholder comment.

**Actions:**
- Import `DoorCreationFlow` from `@/components/doors/DoorCreationFlow`
- Replace the DOOR phase block (lines ~138-157) with `<DoorCreationFlow />`
- DoorCreationFlow already handles its own state, StepProgress, and `useCreateAssembly` mutation
- DoorCreationFlow already calls `router.back()` + navigation on success
- Remove now-unused state variables (name, jobName for door) from the parent
- Wrap in `IPadPage` if DoorCreationFlow doesn't already include responsive sizing
- Keep the CHOOSE phase (type selector) as-is

**Files affected:**
- `app/assemblies/new.tsx`

---

#### Step 1.2: Wire Door Spec/Manufacturing Sheets into AssemblyDetailContent

**CRITICAL.** Resolves bugs #6 and #7. Both sheet components exist.

**Actions:**
- Import `DoorSpecSheet` and `DoorManufacturingSheet`
- Add `useState<"spec" | "manufacturing">("spec")` for sheet toggle
- For door assemblies (`isDoor` is already computed), replace the generic specs card with:
  - A `Tabs` component with "Spec Sheet" / "Manufacturing Sheet" tabs
  - Conditionally render `<DoorSpecSheet specs={assembly.specs} />` or `<DoorManufacturingSheet specs={assembly.specs} name={assembly.name} />`
- Keep generic specs card for non-door assemblies (panels, ramps, floors)

**Files affected:**
- `components/assemblies/AssemblyDetailContent.tsx`

---

#### Step 1.3: Wire FabGateSection into BomDetailContent

**CRITICAL.** Component exists with props `{ unfabricatedCount, assemblyNames }`.

**Actions:**
- Import `FabGateSection` from `@/components/bom/FabGateSection`
- For BOMs in DRAFT or PENDING_REVIEW status with fabrication items:
  - Compute unfabricated count with `useMemo`: `const { unfabricatedCount, assemblyNames } = useMemo(() => { ... }, [lineItems])`
  - Render `<FabGateSection unfabricatedCount={count} assemblyNames={names} />` above the action buttons (use ternary: `unfabricatedCount > 0 ? <FabGateSection ... /> : null`)
  - Disable "Approve BOM" button when unfabricatedCount > 0

**Files affected:**
- `components/bom/BomDetailContent.tsx`

---

#### Step 1.4: Wire PanelCheckoutSheet into BomDetailContent

**CRITICAL.** Component exists with props `{ visible, onClose, productName, onCheckout, loading }`.

**Actions:**
- Import `PanelCheckoutSheet`
- Add state: `panelCheckoutItem` (the line item being checked out) and `showPanelCheckout`
- When a panel line item's checkout button is pressed, set the item and show the sheet
- `onCheckout` callback calls the existing checkout mutation with panel dimensions

**Files affected:**
- `components/bom/BomDetailContent.tsx`

---

#### Step 1.5: Wire LiveItemFeed + FlaggedItemResolver into New BOM

**CRITICAL.** Both components exist. LiveItemFeed accepts `{ items: FeedItem[] }`, FlaggedItemResolver accepts `{ rawText, suggestedName, onResolve, onKeepAsWritten, onRemove }`.

**Actions:**
- Import both components into `app/boms/new.tsx`
- During AI parsing phase (after photo/text submission):
  - Render `<LiveItemFeed items={parsedItems} />` to show streaming results
  - For any flagged/low-confidence items, render `<FlaggedItemResolver>` inline below the item
- Replace the current simple review card list with this richer flow
- Wire `onResolve` to update the item's product match
- Wire `onKeepAsWritten` to accept the raw text as-is
- Wire `onRemove` to remove the item

**Files affected:**
- `app/boms/new.tsx`

---

#### Step 1.6: Wire POMatchCard + POReceiveCard into ReceivingFlow

**CRITICAL.** Resolves bugs #1 and #2. Both components exist.

**Actions:**
- Import `POMatchCard` and `POReceiveCard`
- Add new phases to ReceivingFlow: `PO_MATCH` and `PO_RECEIVE` (between INPUT and REVIEW)
- When "Browse POs" is tapped or AI finds a PO number:
  - Transition to `PO_MATCH` phase
  - Render `<POMatchCard>` with confidence level
  - `onAccept` transitions to `PO_RECEIVE` phase
  - `onReject` returns to INPUT or shows POBrowser
- In `PO_RECEIVE` phase:
  - Render `<POReceiveCard poNumber={...} lineItems={...} />`
  - Add per-item qty steppers
  - "Confirm Receipt" button submits

**Files affected:**
- `components/receiving/ReceivingFlow.tsx`

---

#### Step 1.7: Wire PanelBreakout into Receiving

**CRITICAL.** Component exists with props `{ brand, thickness, panels }`.

**Actions:**
- Import `PanelBreakout` into ReceivingFlow
- When receiving panel items in PO_RECEIVE phase:
  - Detect panel line items (by category or product type)
  - Render `<PanelBreakout>` for each panel group
  - Allow breakdown entry (height x width x qty)

**Files affected:**
- `components/receiving/ReceivingFlow.tsx`

---

#### Step 1.8: Build Assembly Approval Card

**CRITICAL.** This component doesn't exist yet — needs to be built.

**Actions:**
- Create `components/assemblies/ApprovalCard.tsx`
- Props: `{ assemblyId, onApproved, onRejected }`
- UI: notes textarea + "Approve" (green, Check icon) + "Reject" (red, X icon) buttons
- Use `StyleSheet.create()` with design tokens — `colors.statusGreen`/`colors.statusRed` for buttons, `spacing.*` for padding, `typography.cardTitle` for header
- Buttons: 48pt min height on iPad (use `useIsTablet()` → conditional minHeight)
- Animations: `FadeInDown.springify().damping(20)` on the card entering
- Calls `useUpdateAssembly` mutation with status change and approval notes
- Wire into `AssemblyDetailContent.tsx` for AWAITING_APPROVAL status assemblies (ternary: `status === "AWAITING_APPROVAL" ? <ApprovalCard ... /> : null`)

**Files affected:**
- NEW: `components/assemblies/ApprovalCard.tsx`
- `components/assemblies/AssemblyDetailContent.tsx`

---

#### QA Gate: Phase 1

**Run before committing Phase 1 changes.**

1. **TypeScript:** `npx tsc --noEmit` — must pass
2. **Performance audit on all changed files:**
   - All callbacks passed to child components use `useCallback`
   - All filtered/computed data uses `useMemo` (e.g., unfabricated count in Step 1.3)
   - No `&&` conditional renders — all use ternary
   - No inline component definitions
   - All imports are direct (no barrel files)
3. **Design token audit on ApprovalCard.tsx (new file):**
   - Uses `StyleSheet.create()` at module level
   - All colors from `colors.*`, spacing from `spacing.*`, typography from `typography.*`
   - No hex codes, no raw pixel values
   - Touch targets ≥ 44pt (48pt on iPad)
   - `FadeInDown.springify().damping(20)` entering animation
4. **Functional walk-through:**
   - Create new door assembly → DoorCreationFlow 3-step wizard renders (Name → Specs → Confirm)
   - Open door assembly detail → Spec Sheet / Manufacturing Sheet tabs toggle correctly
   - Open BOM with assembly items → FabGateSection renders with unfabricated count → Approve button disabled
   - Open BOM → tap a panel item → PanelCheckoutSheet opens with product name
   - Start new BOM → submit photo → LiveItemFeed streams items → FlaggedItemResolver appears for low-confidence items → resolve/keep/remove work
   - Receive tab → Browse POs button scrolls to POBrowser (or opens PO flow)
   - AI finds PO number → POMatchCard appears with confidence → accept transitions to POReceiveCard
   - Receive panels → PanelBreakout renders for panel line items
   - Open AWAITING_APPROVAL assembly → ApprovalCard renders with approve/reject buttons

---

### Phase 2: Build Missing BOM Detail Features

#### Step 2.1: Build BOM Mode System (Edit/Add-Material/Return)

**CRITICAL.** Largest build task. The webapp has 3 modes with a colored banner.

**Actions:**
- Create `components/bom/BomModeBar.tsx`:
  - Props: `{ mode: "view" | "edit" | "add-material" | "return"; onModeChange }`
  - Colors: `colors.brandBlue` (edit), `colors.brandOrange` (add-material), `colors.statusGreen` (return)
  - `StyleSheet.create()` with design tokens. Use `Animated.View` with `FadeInDown` entering animation
  - Shows mode name + "Exit" pressable (48pt touch target on iPad)
- In `BomDetailContent.tsx`:
  - Add mode state: `const [mode, setMode] = useState<"view" | "edit" | "add-material" | "return">("view")`
  - Render mode bar with ternary: `mode !== "view" ? <BomModeBar ... /> : null`
  - All mode-change callbacks wrapped in `useCallback`
  - In edit mode: line items become editable (qty stepper, delete button)
  - In add-material mode: show AIInput + ProductPicker at top
  - In return mode: show per-item return qty inputs

**Files affected:**
- NEW: `components/bom/BomModeBar.tsx`
- `components/bom/BomDetailContent.tsx`

---

#### Step 2.2: Build Per-Item Checkout with PickCheckoutSection

**CRITICAL.** Replace "Checkout All Items" with individual item selection.

**Actions:**
- Create `components/bom/PickCheckoutSection.tsx`:
  - Props: `{ lineItems, onCheckout }`
  - Select-all checkbox at top
  - Per-item rows with checkbox + qty stepper (defaulting to remaining qty)
  - "Checkout Selected" button with item count
- Wire into `BomDetailContent.tsx` for APPROVED/IN_PROGRESS BOMs

**Files affected:**
- NEW: `components/bom/PickCheckoutSection.tsx`
- `components/bom/BomDetailContent.tsx`

---

#### Step 2.3: Build BOM Approval Action

**CRITICAL.** "Approve BOM" button for PENDING_REVIEW status with fab gate validation.

**Actions:**
- Add "Approve BOM" button to BomDetailContent actions section
- Before approval: check FabGateSection — if unfabricated items exist, show Alert
- On approval: call update mutation with `{ status: "APPROVED" }`
- Add "Cancel BOM" button (sets status to CANCELLED)

**Files affected:**
- `components/bom/BomDetailContent.tsx`

---

#### Step 2.4: Build BOM Completion and Edit Draft Actions

**CRITICAL.** "Complete BOM" for IN_PROGRESS, "Edit Draft" for DRAFT.

**Actions:**
- Add "Mark as Complete" button for IN_PROGRESS BOMs
- Add "Edit Draft" button for DRAFT BOMs (enters edit mode from Step 2.1)
- Add "Add Material" button (Plus icon) for APPROVED/IN_PROGRESS BOMs (enters add-material mode)
- Add "Return Material" button (Undo2 icon) for APPROVED/IN_PROGRESS BOMs (enters return mode)

**Files affected:**
- `components/bom/BomDetailContent.tsx`

---

#### QA Gate: Phase 2

**Run before committing Phase 2 changes.**

1. **TypeScript:** `npx tsc --noEmit` — must pass
2. **Performance audit on BomDetailContent.tsx:**
   - `mode` state transitions use `useCallback` for `onModeChange`
   - Filtered line item lists (e.g., checked-out items, returnable items) use `useMemo`
   - No `&&` conditional renders for mode-specific UI
   - PickCheckoutSection select-all uses functional setState
3. **Design token audit on new files:**
   - `BomModeBar.tsx` — colors from `colors.*`, typography from `typography.*`, spacing from `spacing.*`
   - `PickCheckoutSection.tsx` — same checks, plus checkbox/stepper touch targets ≥ 44pt
4. **Functional walk-through (BOM detail only):**
   - Open a DRAFT BOM → "Edit Draft" button enters edit mode → BomModeBar shows blue banner → line items are editable (qty stepper, delete) → "Exit" returns to view mode
   - Open an APPROVED BOM → "Add Material" enters add-material mode → orange banner → AIInput + ProductPicker appear → "Exit" returns
   - "Return Material" → green banner → per-item return qty inputs → "Exit" returns
   - Per-item checkout: select individual items via checkboxes, select-all works, qty steppers adjust, "Checkout Selected" submits
   - "Approve BOM" blocked when FabGateSection shows unfabricated items
   - "Mark as Complete" works for IN_PROGRESS BOMs
   - "Cancel BOM" works with confirmation

---

### Phase 3: High Priority Features

#### Step 3.1: Wire FabCreationFlow + PanelSpecForm + RampSpecForm

**Actions:**
- Import `FabCreationFlow` from `@/components/fab/FabCreationFlow`
- Replace the FAB phase in `assemblies/new.tsx` with `<FabCreationFlow initialType={fabType} />`
- FabCreationFlow already manages its own state and uses PanelSpecForm/RampSpecForm internally

**Files affected:**
- `app/assemblies/new.tsx`

---

#### Step 3.2: Wire FinishedGoodsList into Shipping tab

**Actions:**
- Import `FinishedGoodsList` from `@/components/shipping/FinishedGoodsList`
- In `assemblies.tsx`, when `queueTab === "SHIPPING"`:
  - Add `selectedShipIds` state (string[])
  - Use functional setState for toggle: `setSelectedShipIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])`
  - Wrap `onToggleSelect` and `onBatchShip` callbacks in `useCallback`
  - Render with ternary: `isShipping ? <FinishedGoodsList ... /> : null`
  - If FinishedGoodsList uses a list internally, ensure it has FlatList optimization props: `keyExtractor`, `windowSize={5}`, `maxToRenderPerBatch={10}`
  - Wire batch ship to `useUpdateAssembly` mutation with status "SHIPPED"

**Files affected:**
- `app/(tabs)/assemblies.tsx`

---

#### Step 3.3: Build Toast Notification System

**Actions:**
- Create `components/shared/Toast.tsx`:
  - Auto-dismiss notification (3s default, 5s for errors)
  - Colors: `colors.statusGreen` (success), `colors.statusRed` (error), `colors.brandBlue` (info)
  - `StyleSheet.create()` with design tokens, `Animated.View` with `FadeInDown`/`FadeOutUp` transitions
  - Position: top of screen below safe area insets, centered, max width 400 on iPad
  - 48pt min height, `radius.xl` border radius, `shadowBrand` shadow
- Create `hooks/use-toast.ts`: context provider + `useToast()` hook returning `{ showToast }` function
- Wire into root layout `app/_layout.tsx`
- Replace `Alert.alert()` calls in BomDetailContent, AssemblyDetailContent, ReceivingFlow with toast

**Files affected:**
- NEW: `components/shared/Toast.tsx`
- NEW: `hooks/use-toast.ts`
- `app/_layout.tsx`

---

#### Step 3.4: Wire CelebrationOverlay

**Actions:**
- Import `CelebrationOverlay` and `useCelebration` hook
- Wire into root layout
- Trigger on: BOM creation, receipt confirmation, assembly completion

**Files affected:**
- `app/_layout.tsx`

---

#### Step 3.5: Wire SwipeableRow into BOM line items

**Actions:**
- Import `SwipeableRow` from `@/components/ui/SwipeableRow`
- Wrap each `BomLineItemRow` in `<SwipeableRow onDelete={...}>`
- Only enable in edit mode

**Files affected:**
- `components/bom/BomDetailContent.tsx`

---

#### Step 3.6: Build CartBar for New BOM

**Actions:**
- Create `components/bom/CartBar.tsx`:
  - Sticky bottom bar with item count badge (use `colors.brandOrange` for badge background)
  - Expandable via Reanimated `useAnimatedStyle` + `useSharedValue` — expand/collapse height animated with `SPRING_CONFIG`
  - When expanded: FlatList of items with qty steppers and remove buttons (`keyExtractor`, stable `renderItem` via `useCallback`)
  - "Save Draft" + "Create BOM" buttons with 48pt min height on iPad
  - Custom item form (name, qty, unit) when expanded
  - `StyleSheet.create()` with design tokens — `shadowBrand` on the bar, `radius.xl` top corners
- Wire into `app/boms/new.tsx` during review phase

**Files affected:**
- NEW: `components/bom/CartBar.tsx`
- `app/boms/new.tsx`

---

#### Step 3.7: Add AssemblyCard door spec pills + BOM match badges

**Actions:**
- For door assemblies, add spec pills below the type meta line:
  - Temperature pill (Snowflake/Thermometer icon + "Freezer"/"Cooler")
  - Dimensions pill (Ruler icon + "36×84")
  - Frame type pill
- For all assemblies with linked BOMs, add BOM status badge row

**Files affected:**
- `components/assemblies/AssemblyCard.tsx`

---

#### Step 3.8: Add ActionItems row navigation on Dashboard

**Actions:**
- Each ActionItems row should navigate to the relevant filtered page:
  - "Out of stock" → `/inventory?status=out`
  - "Below reorder" → `/reorder`
  - "Pending BOMs" → switch to BOM list tab with PENDING_REVIEW filter
- Use `router.push()` (works in React Native, unlike webapp)

**Files affected:**
- `app/(tabs)/index.tsx` or `components/dashboard/ActionItems.tsx`

---

#### Step 3.9: Wire ReceivingConfirmationCard with Accept/Reject

**Actions:**
- Import `ReceivingConfirmationCard` into ReceivingFlow REVIEW phase
- Replace simple item cards with confirmation cards that have:
  - Confidence color coding
  - Accept (green) / Reject (red) per item
  - "Confirm All" button for high-confidence batches

**Files affected:**
- `components/receiving/ReceivingFlow.tsx`

---

#### Step 3.10: Build Receipt History expandable detail + void

**Actions:**
- Make receipt cards expandable (ChevronDown toggle)
- Show individual received items, timestamp, notes when expanded
- Add "Void Receipt" button with confirmation dialog
- Add "Voided" badge on voided receipts

**Files affected:**
- `components/receiving/ReceiptHistory.tsx`

---

#### Step 3.11: Build Product Detail transaction history

**Actions:**
- Add "Recent Activity" card to product detail page
- Show last 10 transactions: type (Received/Adjusted/Checked Out), user, date, qty change
- Use existing transaction data from API

**Files affected:**
- `app/inventory/[id].tsx`

---

#### Step 3.12: Fix Reorder List accessibility

**Actions:**
- Add navigation link from ActionItems "Below reorder point" row
- Fix IPadPage wrapping (currently inside renderItem, should wrap FlatList)
- Consider `numColumns={2}` on iPad

**Files affected:**
- `app/reorder.tsx`

---

#### QA Gate: Phase 3

**Run before committing Phase 3 changes.**

1. **TypeScript:** `npx tsc --noEmit` — must pass
2. **Performance audit on changed files:**
   - All callbacks passed to children use `useCallback` (grep for `onPress=\{[^u]` or inline arrows in JSX)
   - All computed/filtered lists use `useMemo`
   - No `&&` conditional renders (grep for `&& <`)
   - No inline component definitions inside render functions
3. **Design token audit on changed files:**
   - Grep for hex codes (`#[0-9a-fA-F]`), raw pixel values, or missing typography spreads
   - All new components use `StyleSheet.create()` at module level
   - Status badges at `/15` opacity minimum
   - Animations use `SPRING_CONFIG` / `STAGGER_DELAY` from constants
4. **Functional walk-through:**
   - Create a fab assembly → FabCreationFlow renders with spec forms
   - Open Shipping tab → FinishedGoodsList renders, multi-select works, batch ship submits
   - Toast appears on success actions (not Alert.alert)
   - CelebrationOverlay fires on BOM creation and receipt confirmation
   - Swipe-to-delete works on BOM line items in edit mode only
   - CartBar expands/collapses smoothly, item count badge updates
   - AssemblyCard shows door spec pills + BOM match badges
   - Dashboard ActionItems rows navigate to filtered views
   - ReceivingConfirmationCard shows confidence colors and accept/reject
   - Receipt History cards expand to show items, void button works
   - Product Detail shows transaction history
   - Reorder List has proper IPadPage wrapping

---

### Phase 4: iPad Optimization Fixes

#### Step 4.1: Constrain Sheet.tsx width on iPad

**Actions:**
- In Sheet component, when `useIsTablet()` is true:
  - Set `maxWidth: 600` on the sheet container
  - Center horizontally with `alignSelf: "center"`

**Files affected:**
- `components/ui/Sheet.tsx`

---

#### Step 4.2: Increase Header icon button touch targets

**Actions:**
- Use `useTouchTarget()` hook to get min size (44pt phone, 48pt iPad)
- Apply to back button and menu button in Header
- Set `minWidth` and `minHeight` on icon button Pressable

**Files affected:**
- `components/layout/Header.tsx`

---

#### Step 4.3: Fix Cycle Counts iPad layout

**Actions:**
- Wrap count tab in `IPadPage` with `DETAIL_MAX_WIDTH`
- Use `useResponsiveSpacing()` for padding
- Consider 2-column grid for count suggestions on iPad

**Files affected:**
- `app/cycle-counts.tsx`

---

#### Step 4.4: Increase stepper button sizes

**Actions:**
- BomQuickPick stepper buttons: from 32x32 to 44pt minimum
- AIInput icon buttons: from 40pt to 48pt on iPad (use `useTouchTarget()`)

**Files affected:**
- `components/bom/BomQuickPick.tsx`
- `components/ai/AIInput.tsx`

---

#### QA Gate: Phase 4

**Run before committing Phase 4 changes.**

1. **TypeScript:** `npx tsc --noEmit` — must pass
2. **Touch target audit:** For every changed file, verify all Pressable/Button elements have `minWidth`/`minHeight` >= 44pt (48pt on iPad)
3. **Design token audit:** Grep changed files for raw pixel values — any `width: 32`, `height: 36`, `padding: 10`, etc. must be replaced with `spacing.*` or touch target constants
4. **iPad simulator check:** Open Sheet, Header, Cycle Counts, and BomQuickPick on iPad simulator:
   - Sheet centered and ≤ 600px wide
   - Header icons have comfortable tap zones
   - Cycle Counts uses IPadPage wrapper
   - Stepper buttons visually large enough for gloved hands
5. **Phone regression:** Verify same screens on iPhone simulator — touch targets should be 44pt (not 48pt)

---

## Connections & Dependencies

### Files That Reference This Area

- `app/_layout.tsx` — root layout, where Toast and CelebrationOverlay providers go
- `types/api.ts` — Assembly, Bom, PurchaseOrder type definitions
- `hooks/use-assemblies.ts`, `hooks/use-boms.ts` — React Query hooks for mutations
- `lib/door-specs.ts`, `lib/door-field-labels.ts`, `lib/door-recipes.ts` — door spec utilities
- `lib/panel-specs.ts` — panel/ramp spec utilities

### Updates Needed for Consistency

- After Phase 1, the master audit should be updated to reflect wired components
- CLAUDE.md may need updating if new patterns are established (e.g., Toast system)

### Impact on Existing Workflows

- Door creation: from 1-step (name only) to 3-step wizard with full specs
- BOM detail: from read-only to full edit/approve/checkout lifecycle
- Receiving: from ad-hoc only to PO-matched flow
- Shipping: from generic cards to multi-select batch shipping

---

## Validation Checklist

**Functional:**
- [ ] All 7 of Gabe's immediate bugs are resolved
- [ ] DoorCreationFlow renders 3-step wizard when creating a door
- [ ] DoorSpecSheet and DoorManufacturingSheet toggle works in assembly detail
- [ ] FabGateSection blocks BOM approval when fab items exist
- [ ] LiveItemFeed shows streaming items during AI parse
- [ ] POMatchCard appears during PO receiving flow
- [ ] Assembly approval card shows for AWAITING_APPROVAL assemblies
- [ ] BOM modes (Edit/Add-Material/Return) switch correctly
- [ ] Per-item checkout works with qty steppers
- [ ] BOM approval, completion, and cancel actions work
- [ ] FinishedGoodsList renders in Shipping tab with multi-select
- [ ] Toast notifications replace Alert.alert() calls
- [ ] SwipeableRow works on BOM line items in edit mode
- [ ] Receipt History cards expand to show items
- [ ] Sheet.tsx constrained to 600px on iPad
- [ ] All touch targets meet 44pt minimum

**Performance (from skill review):**
- [ ] No render-phase setState warnings in console
- [ ] All filtered/computed lists use `useMemo`
- [ ] All callbacks passed to children use `useCallback`
- [ ] No `&&` conditional renders — all use ternary
- [ ] No inline component definitions inside render bodies
- [ ] All imports are direct (no barrel files)
- [ ] FlatList instances have `keyExtractor` and optimization props

**Design (from skill review):**
- [ ] All new components use `StyleSheet.create()` with design tokens only — no magic numbers
- [ ] All text uses typography tokens from `@/constants/typography`
- [ ] All colors from `@/constants/colors` — no hex codes
- [ ] All spacing from `@/constants/layout` — no pixel literals
- [ ] Status badges use `/15` opacity minimum
- [ ] Animations use `SPRING_CONFIG` from `@/constants/animations`

**Build:**
- [ ] TypeScript passes: `npx tsc --noEmit`

---

## Success Criteria

1. Every CRITICAL item from the master audit Critical Path is implemented and functional
2. Every HIGH item from the master audit Critical Path is implemented and functional
3. All 7 of Gabe's immediate bugs are fixed
4. Every new component is iPad-optimized (responsive spacing, proper touch targets, SplitView-aware)
5. No regressions in existing functionality

---

## Notes

- **Scope:** This is a multi-session plan. Phase 0 + Phase 1 are the highest priority and should be completed first. Phases 2-4 can be done in subsequent sessions.
- **Testing:** Each step should be verified on the iPad simulator before moving to the next.
- **Component interfaces are verified:** All 29 "exists unwired" components have been confirmed to exist with their prop interfaces documented.
- **DoorCreationFlow and FabCreationFlow are self-contained:** They manage their own state, call their own mutations, and handle navigation. Wiring them is mostly replacing inline forms with a single component render.
