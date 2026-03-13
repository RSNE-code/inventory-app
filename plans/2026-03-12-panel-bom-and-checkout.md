# Panel-Aware BOM Creation & Checkout Flow

**Created:** 2026-03-12
**Status:** IN PROGRESS

## Problem Statement

Sales managers need to add panel line items to BOMs specifying only thickness + cut length + quantity. The system should default to standard specs (44" wide, Mesa profile, White). At checkout, the shop foreman confirms the brand and decides which stock panel heights to pull from — a "breakout" that splits the BOM quantity across multiple stock products.

## Business Rules

1. **Sales Manager creates BOM panel line item:**
   - Required: thickness (2", 4", 5"), cut length (e.g., 7'6"), quantity
   - Defaults: 44" wide, Mesa profile, White color
   - Cut length is what the shop needs to prepare, NOT the stock panel height
   - No brand specified at BOM creation — that's a foreman decision

2. **Shop Foreman at checkout:**
   - Confirms the brand (AWIP, Falk, Kingspan, MetlSpan)
   - Picks which stock heights to pull from based on available inventory
   - 9'4" cut → could come from 10-footers, or half a 20-footer — judgment call
   - Each height selection becomes a separate stock adjustment transaction

3. **Defaults:** 90% of panels are standard white Mesa 44" wide. Only override when specified.

## Architecture Design

### Data Model (No schema migration needed)

Panel specs stored in existing `nonCatalogSpecs` JSON field on `BomLineItem`:

```json
{
  "type": "panel",
  "thickness": 4,
  "cutLengthFt": 7.5,
  "cutLengthDisplay": "7'6\"",
  "widthIn": 44,
  "profile": "Mesa",
  "color": "White"
}
```

BOM line item fields:
- `isNonCatalog: true` (no productId — brand/stock height unknown)
- `nonCatalogName`: "4\" IMP Panel × 7'6\" cut"
- `nonCatalogSpecs`: JSON above
- `nonCatalogUom`: "panel"
- `qtyNeeded`: number of panels
- `productId`: null (resolved at checkout)

### Checkout API Extension

New panel checkout endpoint: `POST /api/boms/[id]/panel-checkout`

Input:
```json
{
  "bomLineItemId": "uuid",
  "brand": "MetlSpan",
  "breakout": [
    { "height": 10, "quantity": 15 },
    { "height": 20, "quantity": 5 }
  ]
}
```

Logic:
1. Validate BOM status (APPROVED or IN_PROGRESS)
2. Find-or-create panel products for each height × brand × width × thickness
3. Calculate sq ft per product: height × (width/12) × quantity
4. Create CHECKOUT transactions for each product via adjustStock()
5. Update bomLineItem.qtyCheckedOut with total panels
6. Auto-transition APPROVED → IN_PROGRESS

### UI Components

**1. Panel Line Item Entry (BOM creation)**
- New `PanelLineItemForm` component
- Inputs: thickness picker, cut length (ft'in" format), quantity
- Shows computed defaults (44" wide, Mesa, White)
- "Add Panel" button creates non-catalog line item with specs JSON

**2. Panel Line Item Display (BOM detail)**
- Enhanced `BomLineItemRow` to detect panel specs and show formatted info
- Shows: "4\" IMP × 7'6\" cut — 20 panels"
- Panel badge with specs summary

**3. Panel Checkout Flow (foreman)**
- New `PanelCheckoutSheet` bottom sheet component
- Step 1: Brand confirmation (pill selector)
- Step 2: Height breakout (reuse existing breakout UI patterns)
- Shows available inventory per height
- Running total must match BOM line quantity
- Confirm → calls panel-checkout API

## Implementation Steps

### Step 1: Panel Line Item Form Component
- [x] Create `src/components/bom/panel-line-item-form.tsx`
- [x] Cut length input with ft'in" parsing
- [x] Thickness selector (2", 4", 5")
- [x] Default specs display (44" wide, Mesa, White)
- [x] Wire into BOM creation flow (both AI and manual)

### Step 2: BOM Creation API — Store Panel Specs
- [x] Update BOM creation API to pass through `nonCatalogSpecs`
- [x] Update createBom mutation type in hooks

### Step 3: Panel Display on BOM Detail
- [x] Detect panel specs in BomLineItem (uses nonCatalogSpecs.type === "panel")
- [x] Panel checkout button appears inline under panel items
- [ ] Enhanced display with panel specs summary (future polish)

### Step 4: Panel Checkout API
- [x] Create `POST /api/boms/[id]/panel-checkout` route
- [x] Find-or-create panel products (reuse receiving pattern)
- [x] Multi-product stock adjustment in single transaction
- [x] Update bomLineItem.qtyCheckedOut
- [x] Auto-transition APPROVED → IN_PROGRESS

### Step 5: Panel Checkout UI
- [x] Create `PanelCheckoutSheet` bottom sheet component
- [x] Brand selector (pill buttons for AWIP, Falk, Kingspan, MetlSpan)
- [x] Height breakout with quick-add buttons + inventory display
- [x] Running total with remaining panel count
- [x] Wire into BOM detail checkout flow
- [x] usePanelCheckout hook

### Step 6: Integration Testing
- [ ] Full flow: create BOM with panel → approve → panel checkout
- [ ] Verify stock adjustments across multiple products
- [ ] Verify edge cases (insufficient stock, partial checkout)
