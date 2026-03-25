# Plan: BOM Module UX Fixes — Round 2

**Created:** 2026-03-13
**Status:** Implemented
**Request:** Fix 7 UX issues found during hands-on BOM module testing

---

## Overview

### What This Plan Accomplishes

Addresses 7 usability issues discovered through real testing: return flow friction (no Return All, manual number entry), lost work on nav-away, confusing Add Items flow, panel checkout not recognizing sq ft equivalence, inline checkout confirmation, and premature return option visibility.

### Why This Matters

These are daily-use workflows for shop foremen and crew. Every extra tap or confusing state slows down real work on the shop floor. The panel sq ft bug is a showstopper — it makes it impossible to check out panels using different stock heights than what the BOM specifies.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` (initial) | Stepper UI pattern, modal design, inline form layout for Add Items |
| `frontend-design` (amendment) | Panel conversion display: arrow story ("5 stock → 10 BOM ✓"), scissors icon for cut-down context, green fulfilled badge, industrial-utilitarian design for gloves-on use |
| `engineering-skills` (amendment) | Backend sq ft aggregation: use `StockTransaction` aggregate within Prisma `$transaction`, validate BEFORE for-loop for early rejection, `Math.floor` for equivalent panels, confirmed quantities stored positive (no `Math.abs` needed), edge case handling for mixed heights/returns/floats |

### How Skills Shaped the Plan

Frontend-design guided the stepper control pattern (+/− flanking a display value), the decision to use Dialog instead of inline Card for checkout confirmation, and the compact inline form approach for Add Items.

For the panel amendment, frontend-design provided the conversion story pattern (arrow `→` connecting stock panels to BOM panels), the scissors icon as a universal "cutting" indicator readable with gloves on, and the principle that the foreman should never see sq ft driving decisions — panels are the mental model, sq ft is behind the scenes.

Engineering-skills confirmed the aggregation approach (query `StockTransaction` within the same `$transaction` block so newly-created records are visible), flagged the sign convention (positive — verified in `adjustStock` line 49: `Math.abs(input.quantity)`), and recommended `Math.floor` over `Math.round` for equivalent panel calculation (9.8 panels ≠ 10 fulfilled).

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `src/app/boms/[id]/page.tsx` | BOM detail — view, edit, checkout, return modes (784 lines) |
| `src/components/bom/bom-line-item-row.tsx` | Row component — view/edit/checkout/return renders (283 lines) |
| `src/components/bom/checkout-all-button.tsx` | Inline Card confirmation for bulk checkout (97 lines) |
| `src/components/bom/panel-checkout-sheet.tsx` | Panel checkout bottom sheet (395 lines) |
| `src/app/api/boms/[id]/panel-checkout/route.ts` | Panel checkout API — validates by panel count (211 lines) |
| `src/app/boms/new/page.tsx` | New BOM page — AI + Manual tabs (443 lines) |
| `src/components/bom/bom-ai-flow.tsx` | AI-based BOM creation flow (481 lines) |
| `src/lib/panels.ts` | Panel utility functions (`panelSqFt`, `buildPanelProductName`) |

### Gaps or Problems Being Addressed

1. **No "Return All"** — user must enter return qty for every item individually
2. **Manual number input for returns** — should be +/− stepper defaulting to outstanding amount
3. **No nav-away protection** — navigating away from BOM creation loses all work silently
4. **Add Items flow is confusing** — no non-catalog option, no voice in the text box, overly complex layout
5. **Panel checkout counts panels, not sq ft** — 5×20' panels should satisfy 10×10' but shows "5 remaining"
6. **Checkout confirmation inline** — Card renders below list instead of centered scrollable Dialog
7. **Return shows too early** — visible after first partial checkout, should only appear after full BOM checkout

---

## Proposed Changes

### Summary of Changes

- Add "Return All" button at top of return mode that pre-fills all items to max outstanding
- Replace return Input with +/− stepper; default to outstanding amount, cap at outstanding
- Add `beforeunload` listener + in-app navigation guard on BOM creation pages; offer "Save as Draft" or "Discard"
- Redesign Add Items on detail page: `+` button → inline area below items with catalog search (mic in input), "Add Panel" pill, "Non-Catalog Item" pill
- Change panel fulfillment from panel-count to sq-ft equivalence in both API and frontend; show "Fulfilled" badge in green
- Convert CheckoutAllButton from inline Card to centered Dialog modal with scrollable item list
- Show "Return Material" button only when all line items have been fully checked out (qtyCheckedOut >= qtyNeeded)

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/boms/[id]/page.tsx` | Return All prefill, return visibility condition, add-material mode redesign, panel fulfilled display |
| `src/components/bom/bom-line-item-row.tsx` | Replace return mode Input with +/− stepper, default qty to outstanding |
| `src/components/bom/checkout-all-button.tsx` | Replace inline Card with Dialog modal |
| `src/components/bom/panel-checkout-sheet.tsx` | Sq ft validation, allow checkout when sq ft target met regardless of panel count |
| `src/app/api/boms/[id]/panel-checkout/route.ts` | Sq ft equivalence validation, update qtyCheckedOut based on sq ft fulfillment |
| `src/app/boms/new/page.tsx` | beforeunload + nav guard for ManualBomForm |
| `src/components/bom/bom-ai-flow.tsx` | beforeunload + nav guard for AI flow |

### Files to Create

None.

---

## Design Decisions

### Key Decisions Made

1. **Return stepper defaults to outstanding qty, not zero**: Most common action is returning everything. Start at max, minus down = fewer taps.

2. **Panel fulfillment via sq ft equivalence, display in panels**: The foreman uses bigger stock panels (e.g., 20') that get cut down to fulfill the BOM's required cut length (e.g., 10'). So 5×20' panels cut down = 10 panels at 10' cut. The API aggregates sq ft from `StockTransaction` records (quantities stored as positive values — `adjustStock` uses `Math.abs()`), then sets `qtyCheckedOut` to the equivalent panel count via `Math.floor(totalSqFtCheckedOut / sqFtPerBomPanel)`. Display stays in panels — that's how the foreman thinks. The running total uses an arrow to tell the conversion story: "5 stock panels → 10 BOM panels ✓". A scissors icon + "Cut from 20' stock to 10' pieces" explains why fewer panels work. The frontend's existing `remaining = qtyNeeded - qtyCheckedOut` logic works automatically.

3. **Return gating = all items fully checked out**: "Return Material" only appears when every line item has `qtyCheckedOut >= qtyNeeded`. This matches Gabe's mental model: "return after the BOM's been checked out." If some items still need checkout, the user should finish checking out first.

4. **Add Items matches manual entry page pattern**: The detail page's Add Items area should mirror the manual BOM form: text input for catalog search (with mic icon inside), "Add Panel" pill, "Non-Catalog Item" pill. Same non-catalog form (name, category, UOM, qty, est cost).

5. **Nav-away uses beforeunload + layout-level guard**: `beforeunload` catches browser back/refresh. For in-app routing, we wrap the BOM creation pages in a guard that intercepts navigation and shows a save/discard Dialog.

6. **Checkout confirmation as Dialog, not Card**: All other confirmations (approve, cancel, complete) use Dialog. Checkout should match for consistency. Dialog centers on screen and is scrollable by default.

### Open Questions

None — all resolved.

---

## Step-by-Step Tasks

### Step 1: Return All Button + Stepper UI

**What**: Add "Return All" button at top of return mode. Replace return qty Input with +/− stepper that defaults to outstanding amount.

**Actions in `src/app/boms/[id]/page.tsx`:**

- Add `handleReturnAllPrefill()` that sets every item's return qty to its outstanding amount:
  ```typescript
  function handleReturnAllPrefill() {
    const prefilled: Record<string, number> = {}
    allItems.forEach((item) => {
      const outstanding = Number(item.qtyCheckedOut || 0) - Number(item.qtyReturned || 0)
      if (outstanding > 0) {
        prefilled[item.id as string] = outstanding
      }
    })
    setReturnQtys(prefilled)
  }
  ```
- In the return mode header (around line 376), add a "Return All" button next to the "Return Material" heading:
  ```tsx
  {mode === "return" && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleReturnAllPrefill}
      className="text-status-green text-xs font-semibold"
    >
      Return All
    </Button>
  )}
  ```
- When entering return mode, auto-prefill all return quantities to outstanding amount (call `handleReturnAllPrefill()` when `setMode("return")` is called)

**Actions in `src/components/bom/bom-line-item-row.tsx`:**

- Replace the return mode render (lines 115-148) Input with a +/− stepper:
  ```tsx
  // Replace lines 130-144 (the Input section) with:
  <div className="flex items-center gap-0 shrink-0">
    <button
      type="button"
      onClick={() => onReturnQtyChange?.(Math.max(0, (returnQty || 0) - 1))}
      className="h-9 w-9 flex items-center justify-center rounded-l-lg border border-border-custom bg-surface-secondary text-navy font-bold text-lg hover:bg-gray-100 active:bg-gray-200"
    >
      −
    </button>
    <div className="h-9 w-14 flex items-center justify-center border-y border-border-custom text-sm font-semibold text-navy tabular-nums">
      {returnQty ?? outstanding}
    </div>
    <button
      type="button"
      onClick={() => onReturnQtyChange?.(Math.min(outstanding, (returnQty ?? outstanding) + 1))}
      disabled={(returnQty ?? outstanding) >= outstanding}
      className="h-9 w-9 flex items-center justify-center rounded-r-lg border border-border-custom bg-surface-secondary text-navy font-bold text-lg hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30"
    >
      +
    </button>
    <span className="text-xs text-text-muted w-8 ml-1.5">{activeInputUnit}</span>
  </div>
  ```
- The stepper defaults to `returnQty ?? outstanding` (shows outstanding if not yet overridden)
- Minus button: floor at 0
- Plus button: ceiling at outstanding, disabled when at max

**Files affected:**
- `src/app/boms/[id]/page.tsx`
- `src/components/bom/bom-line-item-row.tsx`

---

### Step 2: Checkout Confirmation Modal

**What**: Convert CheckoutAllButton from inline Card to centered Dialog.

**Actions in `src/components/bom/checkout-all-button.tsx`:**

- Add Dialog imports: `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter`
- Replace the `showConfirm` Card render (lines 61-95) with:
  ```tsx
  <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <div className="flex justify-center mb-2">
          <div className="h-12 w-12 rounded-full bg-brand-orange/10 flex items-center justify-center">
            <PackageCheck className="h-6 w-6 text-brand-orange" />
          </div>
        </div>
        <DialogTitle className="text-center">Confirm Full Checkout</DialogTitle>
        <DialogDescription className="text-center">
          {remainingItems.length} item{remainingItems.length !== 1 ? "s" : ""} will be pulled from inventory
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
        {remainingItems.map((item) => {
          const remaining = item.qtyNeeded - item.qtyCheckedOut
          return (
            <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-700 truncate flex-1 mr-2">{item.name}</span>
              <span className="text-navy font-semibold shrink-0">
                {remaining} {item.unitOfMeasure}
              </span>
            </div>
          )
        })}
      </div>
      <DialogFooter className="sm:flex-col gap-2">
        <Button
          onClick={handleConfirm}
          disabled={isPending}
          className="w-full h-11 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold"
        >
          <Check className="h-4 w-4 mr-1" />
          {isPending ? "Processing..." : "Confirm Checkout"}
        </Button>
        <Button onClick={() => setShowConfirm(false)} variant="outline" className="w-full h-11 text-sm">
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  ```
- Keep the trigger button unchanged (the orange "Check Out All" button)
- Dialog is centered and scrollable by default via shadcn Dialog

**Files affected:**
- `src/components/bom/checkout-all-button.tsx`

---

### Step 3: Panel Sq Ft Equivalence

**What**: Fix panel checkout to track fulfillment by square footage. 5×20' stock panels should satisfy a 10×10' BOM requirement when the total sq ft matches. Display stays in panels with a conversion story the foreman can read at a glance.

**Skill inputs applied:**
- `frontend-design`: Arrow conversion display ("5 stock panels → 10 BOM panels ✓"), scissors icon for cut-down context, green fulfilled badge with conditional "cut from larger stock" note
- `engineering-skills` (backend): Aggregate from `StockTransaction` within the Prisma transaction, validate BEFORE the for-loop for early rejection, use `Math.floor` for equivalent panels (not `Math.round`), quantities are stored as positive values (no `Math.abs` needed)

**Actions in `src/app/api/boms/[id]/panel-checkout/route.ts`:**

- **BEFORE the for-loop** (early validation, around line 66), replace panel-count validation with sq-ft validation:
  ```typescript
  // Calculate sq ft this checkout would add
  const newCheckoutSqFt = data.breakout.reduce((sum, r) =>
    sum + panelSqFt(r.height, width) * r.quantity, 0)

  // Get existing sq ft from prior transactions (quantities stored as positive values)
  const existingSqFtAgg = await tx.stockTransaction.aggregate({
    _sum: { quantity: true },
    where: { bomLineItemId: lineItem.id, type: "CHECKOUT" },
  })
  const existingSqFtTotal = Number(existingSqFtAgg._sum.quantity || 0)

  const cutLengthFt = specs.cutLengthFt as number
  const sqFtPerBomPanel = panelSqFt(cutLengthFt, width)
  const totalNeededSqFt = sqFtPerBomPanel * needed

  // Allow 1% tolerance for floating point
  if (existingSqFtTotal + newCheckoutSqFt > totalNeededSqFt * 1.01) {
    throw new Error(
      `Checkout would exceed needed coverage (${(existingSqFtTotal + newCheckoutSqFt).toFixed(1)} sq ft > ${totalNeededSqFt.toFixed(1)} sq ft needed)`
    )
  }
  ```
  Remove the old panel-count validation block (lines 66-75).

- **AFTER the for-loop** (around line 141), replace the existing `qtyCheckedOut` update with sq ft equivalence:
  ```typescript
  // Aggregate total sq ft checked out (includes transactions just created above —
  // visible within the same Prisma $transaction)
  const sqFtAgg = await tx.stockTransaction.aggregate({
    _sum: { quantity: true },
    where: {
      bomLineItemId: lineItem.id,
      type: "CHECKOUT",
    },
  })
  const totalSqFtCheckedOut = Number(sqFtAgg._sum.quantity || 0)

  // Convert to equivalent BOM panel count
  // Use Math.floor — 9.8 equivalent panels ≠ 10 fulfilled panels
  const equivalentPanels = totalNeededSqFt > 0
    ? Math.min(needed, Math.floor(totalSqFtCheckedOut / sqFtPerBomPanel))
    : alreadyCheckedOut + totalBreakoutPanels

  // Update qtyCheckedOut to reflect sq ft equivalence
  await tx.bomLineItem.update({
    where: { id: lineItem.id },
    data: { qtyCheckedOut: new Prisma.Decimal(equivalentPanels) },
  })
  ```
  This replaces the existing simple `qtyCheckedOut: alreadyCheckedOut + totalBreakoutPanels` update (lines 142-148).

- **Edge cases handled**:
  - Mixed height checkouts (some 10', some 20'): aggregate handles naturally since all transactions are in sq ft
  - Returns: filtered out by `type: "CHECKOUT"` — return transactions won't affect fulfillment calculation
  - Floating point: 1% tolerance on validation, `Math.floor` on equivalent panels

**Actions in `src/components/bom/panel-checkout-sheet.tsx`:**

- Add computed values at the top of the component:
  ```typescript
  const neededSqFt = panelSqFt(panelSpecs.cutLengthFt, panelSpecs.widthIn) * qtyNeeded
  const sqFtPerBomPanel = panelSqFt(panelSpecs.cutLengthFt, panelSpecs.widthIn)
  const equivalentBomPanels = sqFtPerBomPanel > 0
    ? Math.min(remaining, Math.floor(totalSqFtValue / sqFtPerBomPanel))
    : totalPanels
  const isFulfilled = totalSqFtValue >= neededSqFt * 0.99 // 1% tolerance
  const hasLargerPanels = rows.some(r => r.height && r.height > panelSpecs.cutLengthFt)
  ```
  Note: `neededSqFt` here uses `qtyNeeded` (total), but for the checkout sheet we care about the `remaining` panels. Adjust: `const remainingSqFt = sqFtPerBomPanel * remaining`

- Replace the running total display (lines 327-357) with the conversion story:
  ```tsx
  {rows.length > 0 && (
    <div className="mt-3 p-3 rounded-lg bg-navy/5 border border-navy/10">
      {/* Conversion story: stock panels → BOM panels */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-navy">Total</span>
        <div className="text-right">
          <span className={cn(
            "text-lg font-bold tabular-nums",
            isFulfilled ? "text-green-600" :
            totalSqFtValue > remainingSqFt * 1.01 ? "text-red-500" : "text-navy"
          )}>
            {totalPanels} stock panel{totalPanels !== 1 ? "s" : ""}
          </span>
          {hasLargerPanels && equivalentBomPanels > 0 && (
            <span className="text-sm text-text-muted ml-1">
              → {equivalentBomPanels} BOM panel{equivalentBomPanels !== 1 ? "s" : ""}
              {isFulfilled && " ✓"}
            </span>
          )}
        </div>
      </div>

      {/* Cut-down context — only when using larger stock */}
      {hasLargerPanels && (
        <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
          <SawIcon (custom inline SVG — circular saw blade) className="h-3 w-3" />
          Cut from larger stock to {panelSpecs.cutLengthDisplay} pieces
        </p>
      )}

      {/* Sq ft as secondary info */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-text-muted">Coverage</span>
        <span className="text-sm font-medium text-navy tabular-nums">
          {formatQuantity(totalSqFtValue)} sq ft
        </span>
      </div>

      {/* Exceeds warning */}
      {totalSqFtValue > remainingSqFt * 1.01 && (
        <p className="text-xs text-red-500 mt-1">
          Exceeds need by ~{Math.ceil((totalSqFtValue - remainingSqFt) / sqFtPerBomPanel)} panels worth
        </p>
      )}
    </div>
  )}
  ```
  Import `SawIcon (custom inline SVG — circular saw blade)` from `lucide-react`.

- Update submit button disabled check (line 378-382) to use sq ft:
  ```typescript
  disabled={
    panelCheckout.isPending ||
    !selectedBrand ||
    totalSqFtValue === 0 ||
    totalSqFtValue > remainingSqFt * 1.01
  }
  ```

- Update submit button label to show stock panel count:
  ```tsx
  {panelCheckout.isPending
    ? "Processing..."
    : `Check Out ${totalPanels} Panel${totalPanels !== 1 ? "s" : ""}`}
  ```
  (This already matches — no change needed here.)

**Actions in `src/app/boms/[id]/page.tsx`:**

- In the panel button section (lines 491-508), replace the `if (panelRemaining <= 0) return null` with a fulfilled badge:
  ```tsx
  {isPanelItem && canCheckout && mode === "view" && ["APPROVED", "IN_PROGRESS"].includes(bom.status) && (
    (() => {
      const panelQtyNeeded = Number(item.qtyNeeded)
      const panelQtyCheckedOut = Number(item.qtyCheckedOut || 0)
      const panelRemaining = panelQtyNeeded - panelQtyCheckedOut

      // Fulfilled — show green badge
      if (panelRemaining <= 0) {
        // Determine if larger panels were used: qtyCheckedOut < qtyNeeded means
        // fewer physical panels fulfilled the same sq ft (the API set equivalentPanels = qtyNeeded)
        // We can't tell from just these numbers — but if qtyCheckedOut === qtyNeeded,
        // the conversion happened in the API. Show a simple fulfilled badge.
        return (
          <div className="w-full flex flex-col items-center gap-0.5 py-2 px-3 -mt-1 mb-2 rounded-lg bg-status-green/10">
            <div className="flex items-center gap-1.5 text-status-green text-sm font-semibold">
              <Check className="h-4 w-4" />
              Panels Fulfilled
            </div>
          </div>
        )
      }

      // Not fulfilled — show checkout button
      return (
        <button
          type="button"
          onClick={() => setPanelCheckoutItem(lineId)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 -mt-1 mb-2 rounded-lg bg-brand-orange/10 text-brand-orange text-sm font-semibold hover:bg-brand-orange/20 transition-colors"
        >
          <Layers className="h-4 w-4" />
          Check Out Panels ({panelRemaining} remaining)
        </button>
      )
    })()
  )}
  ```
  Import `SawIcon (custom inline SVG — circular saw blade)` from `lucide-react` (already have `Check` imported).

**Files affected:**
- `src/app/api/boms/[id]/panel-checkout/route.ts`
- `src/components/bom/panel-checkout-sheet.tsx`
- `src/app/boms/[id]/page.tsx`

---

### Step 4: Nav-Away Draft Save Warning

**What**: Warn users when navigating away from BOM creation with unsaved work. Offer to save as draft.

**Actions in `src/components/bom/bom-ai-flow.tsx`:**

- Track unsaved changes: `const hasUnsavedChanges = confirmedItems.length > 0 || pendingMatches.length > 0`
- Add `beforeunload` listener:
  ```typescript
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasUnsavedChanges])
  ```
- Add an in-app nav guard Dialog state:
  ```typescript
  const [showNavGuard, setShowNavGuard] = useState(false)
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null)
  ```
- Intercept in-app navigation: use `window.addEventListener("popstate", ...)` and override `router.push` via a wrapper, OR use a simpler approach — intercept clicks on sidebar/header navigation links by adding an `onBeforeNavigate` callback prop to the Header/sidebar components
- Show Dialog with three options:
  - **Save as Draft**: call `createBom.mutateAsync()` with status DRAFT, then navigate
  - **Discard**: navigate without saving
  - **Cancel**: close dialog, stay on page

**Actions in `src/app/boms/new/page.tsx` (ManualBomForm):**

- Same pattern: `hasUnsavedChanges = lineItems.length > 0 || jobName.trim() !== ""`
- Same `beforeunload` listener
- Same nav guard Dialog with Save Draft / Discard / Cancel

**Implementation note**: Since Next.js App Router doesn't have `router.events`, the simplest cross-cutting approach is:
1. `beforeunload` for browser back/refresh/close
2. For in-app links: monkey-patch or wrap `useRouter` is fragile. Instead, use the `next/navigation` pattern of catching `popstate` and adding a click listener on internal links. OR: the BOM creation pages can check on mount if there's draft data in `sessionStorage` from a previous interrupted session.

**Practical approach**: Use `beforeunload` for browser navigation. For in-app nav, since the sidebar and header are the main nav vectors, add an `onClick` interceptor on the BOM new page that catches nav attempts and shows the dialog. This is simpler than a global router wrapper.

**Files affected:**
- `src/components/bom/bom-ai-flow.tsx`
- `src/app/boms/new/page.tsx`

---

### Step 5: Add Additional Items Redesign

**What**: Simplify the "Add Additional Items" flow on the BOM detail page. Plus button → inline form below items with catalog search (mic in text box), "Add Panel" pill, "Non-Catalog Item" pill.

**Actions in `src/app/boms/[id]/page.tsx`:**

- Add state for the inline add form:
  ```typescript
  const [showAddItems, setShowAddItems] = useState(false)
  const [showNonCatalogForm, setShowNonCatalogForm] = useState(false)
  // Non-catalog form fields (same as ManualBomForm)
  const [ncName, setNcName] = useState("")
  const [ncCategory, setNcCategory] = useState("")
  const [ncUom, setNcUom] = useState("")
  const [ncQty, setNcQty] = useState("")
  const [ncCost, setNcCost] = useState("")
  ```

- Replace the current `add-material` mode section (lines 399-424) with a simpler inline area below the items list. The new UI appears inside the items Card, below the last item:
  ```tsx
  {/* Add items area — shown when plus button tapped */}
  {canCheckout && mode !== "edit" && mode !== "return" && (showAddItems || mode === "add-material") && (
    <div className="mt-2 space-y-2 pt-2 border-t border-border-custom">
      {/* Catalog search with mic icon */}
      <AIInput
        onParseComplete={handleAIAddItems}
        placeholder="Search catalog or speak to add items..."
        compact
      />

      {/* Non-catalog form */}
      {showNonCatalogForm ? (
        <div className="space-y-1.5 p-2.5 bg-surface-secondary rounded-lg">
          {/* Same form as ManualBomForm non-catalog section */}
          ...
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowNonCatalogForm(true)} className="flex-1">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Non-Catalog Item
          </Button>
        </div>
      )}
    </div>
  )}
  ```

- Change the "Add Material" / "Adjust & Check Out" buttons (lines 609-616, 637-643) to a simpler `+` button in the items card header that toggles `showAddItems`:
  ```tsx
  {canCheckout && mode === "view" && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setShowAddItems(!showAddItems)}
      className="text-brand-blue"
    >
      <Plus className="h-4 w-4" />
    </Button>
  )}
  ```

- Keep the existing `handleAIAddItems` and `handleAddProduct` logic — they already add items to the BOM and populate checkout quantities
- Non-catalog items: add `handleAddNonCatalog()` function (same as ManualBomForm's) that calls `updateBom.mutateAsync({ id, addLineItems: [{ isNonCatalog: true, ... }] })`
- The `ProductPicker` catalog search can be embedded inside `AIInput` or shown separately below — the key is having both text search and mic in one input area

**Note on AIInput**: The existing `AIInput` component already has a mic button and text input. It may need a `compact` prop to render smaller, or we can use `ProductPicker` with an adjacent mic button. Check if `AIInput` can serve double duty as a catalog search (it currently sends to AI parse endpoint, not product search). If not, use `ProductPicker` for text search with a separate mic button that routes to AI parse.

**Practical approach**: Use `ProductPicker` for catalog text search (existing, works well), add a mic button next to it that opens voice input via `useVoiceInput` hook, and keep AI parse for voice results. Below that, show "Non-Catalog Item" pill.

**Files affected:**
- `src/app/boms/[id]/page.tsx`

---

### Step 6: Return Option Timing

**What**: Only show "Return Material" after the BOM has been fully checked out.

**Actions in `src/app/boms/[id]/page.tsx`:**

- Add a computed value:
  ```typescript
  const allItemsFullyCheckedOut = allItems.every((item) => {
    const needed = Number(item.qtyNeeded)
    const checkedOut = Number(item.qtyCheckedOut || 0)
    return needed > 0 && checkedOut >= needed
  })
  ```

- Change the Return Material button condition (line 644):
  ```tsx
  // Old: {hasOutstandingMaterial && (
  // New:
  {hasOutstandingMaterial && allItemsFullyCheckedOut && (
  ```

- This means: Return only appears when:
  1. BOM is IN_PROGRESS (already checked by parent condition on line 629)
  2. There IS outstanding material (items checked out but not returned)
  3. ALL items have been fully checked out (qtyCheckedOut >= qtyNeeded)

- If user needs more material than the BOM specifies, they use "Add Material" to increase the BOM first, then check out. The return flow is strictly "after the fact."

**Files affected:**
- `src/app/boms/[id]/page.tsx`

---

### Step 7: Build & Validate

**Actions:**

- Run `cd rsne-inventory && npm run build` to catch type errors
- Test each fix in the dev server:
  - [ ] Return mode: "Return All" pre-fills all items to max, stepper +/− works, can't exceed outstanding
  - [ ] Checkout confirmation: centered Dialog, scrollable with many items, mobile-friendly
  - [ ] Panel checkout: 5×20' panels satisfy 10×10' requirement → shows "Panels Fulfilled" in green
  - [ ] Panel sheet: running total shows sq ft comparison, validation uses sq ft not panel count
  - [ ] Nav-away: browser back/refresh shows "Leave site?" prompt when BOM creation has unsaved data
  - [ ] Add Items: `+` button in items header → inline area with catalog search + mic + non-catalog pill
  - [ ] Non-catalog form works on detail page (same as manual entry page)
  - [ ] Return button: hidden when any item has qtyCheckedOut < qtyNeeded
  - [ ] Existing approve, cancel, complete dialogs still work unchanged

**Files affected:**
- All modified files

---

## Connections & Dependencies

### Files That Reference This Area

- `src/hooks/use-boms.ts` — React Query hooks (no changes needed)
- `src/app/api/boms/[id]/checkout/route.ts` — Regular checkout API (no changes needed)
- `src/components/ai/ai-input.tsx` — AI input component (reused as-is)
- `src/hooks/use-voice-input.ts` — Voice input hook (may be used for Add Items mic button)
- `src/lib/panels.ts` — `panelSqFt()` utility (reused, no changes)

### Updates Needed for Consistency

- `context/project-status.md` — Add BOM UX fixes note after implementation
- Panel fulfillment logic must be consistent between API validation, panel checkout sheet display, and detail page display

### Impact on Existing Workflows

- Return flow: additive (stepper + Return All on top of existing)
- Checkout confirmation: visual only (same data, Dialog instead of Card)
- Panel equivalence: **changes fundamental fulfillment logic** — existing panel checkouts will be recalculated on next checkout; previously "partial" checkouts may now show as "fulfilled" if sq ft was already met
- Nav-away: new behavior, only affects BOM creation pages
- Add Items: simplified UX, same underlying API calls
- Return timing: more restrictive (hidden until full checkout), but more correct

---

## Validation Checklist

- [ ] Return All button pre-fills all return quantities to outstanding
- [ ] +/− stepper works for returns, floor at 0, ceiling at outstanding
- [ ] Stepper defaults to outstanding amount (not zero)
- [ ] Checkout confirmation renders as centered scrollable Dialog
- [ ] Panel checkout: 5×20' panels satisfies 10×10' BOM (sq ft equivalence)
- [ ] "Panels Fulfilled" badge shows green when sq ft target met
- [ ] Panel checkout sheet shows sq ft comparison in running total
- [ ] Panel checkout sheet validates by sq ft, not panel count
- [ ] Nav-away from BOM creation shows browser "Leave site?" prompt
- [ ] In-app nav-away shows save/discard Dialog
- [ ] Add Items: `+` button reveals inline form below items
- [ ] Catalog search with mic works in Add Items
- [ ] Non-catalog item form works on detail page
- [ ] Return button hidden until all items fully checked out
- [ ] `npm run build` passes with no type errors
- [ ] Existing approve/cancel/complete dialogs unchanged

---

## Success Criteria

1. All 7 UX issues are resolved and the BOM module builds without errors
2. Panel checkout correctly shows "Fulfilled" when sq ft equivalence is met (5×20' = 10×10')
3. Users cannot lose BOM work by accidentally navigating away
4. Return flow is faster (Return All + stepper vs manual input for each item)

---

## Notes

- **Step 3 (Panel Sq Ft)** is the most complex change — it modifies API validation logic and how `qtyCheckedOut` is calculated. The approach avoids schema changes by computing sq ft equivalence from existing `StockTransaction` records.
- **Step 4 (Nav Guard)** has a known limitation: Next.js App Router doesn't expose router events. The `beforeunload` approach handles browser nav. For in-app nav, we may need to intercept click events on nav links or use `sessionStorage` to persist draft state. The initial implementation should at minimum handle `beforeunload` (covers browser back/refresh/close), with in-app interception as a fast follow.
- **Step 5 (Add Items)**: The AIInput component sends text to the AI parse endpoint, which may be overkill for simple catalog search. Consider using `ProductPicker` for catalog text search and only routing voice input through AI parse. This gives instant catalog results for text and AI-powered results for voice.
- The order of implementation matters: Steps 1-2 and 6 are independent UI changes. Step 3 requires API + frontend coordination. Steps 4-5 are self-contained.

---

## Implementation Notes

**Implemented:** 2026-03-13

### Summary

All 7 UX issues implemented:
1. Return All button + auto-prefill when entering return mode
2. +/− stepper for return quantities (replaces manual input)
3. Panel sq ft equivalence in API + frontend (with saw icon for cut-down context)
4. Nav-away `beforeunload` protection on BOM creation pages
5. Inline add-items form via `+` button in items header (catalog search + voice/text)
6. Checkout confirmation converted from inline Card to centered Dialog modal
7. Return button gated behind `allItemsFullyCheckedOut`

### Deviations from Plan

- **Step 3 API**: Used `tx.transaction.aggregate()` instead of `tx.stockTransaction.aggregate()` — the Prisma model is `Transaction`, not `StockTransaction`
- **Step 4 Nav Guard**: Implemented `beforeunload` only (covers browser back/refresh/close). In-app navigation interception deferred as a fast follow since Next.js App Router doesn't expose router events
- **Step 5 Add Items**: Kept the existing `add-material` mode intact (for add+checkout flow). Added the `+` button as an additional way to add items in view mode without entering checkout mode. Uses ProductPicker + AIInput below the items list
- **SawIcon**: Used inline SVG (circular saw blade) since Lucide has no saw icon

### Issues Encountered

- None — build passes clean
