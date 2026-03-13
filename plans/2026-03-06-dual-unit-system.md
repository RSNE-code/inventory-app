# Plan: Shop Unit — Display Inventory in the Unit the Shop Thinks In

**Created:** 2026-03-06
**Status:** Implemented
**Request:** Add a "Shop Unit" field so inventory displays in the unit the shop actually works in (ft, sq ft), while keeping the ordering unit for POs and receiving.

---

## Overview

### What This Plan Accomplishes

Adds one optional field — **Shop Unit** — to products. When set, the inventory list, detail page, dashboard, and BOM show quantities converted using the product's dimensions. Products without a Shop Unit (the majority) work exactly as today.

### Why This Matters

A gasket roll tracked as "5 rolls" means nothing to the shop. They think in feet. Diamond plate tracked as "10 ea" is fine — they think in sheets. The system should speak each product's language.

---

## The Approach

### One new field: `shopUnit`

- Optional string on Product (null by default)
- Options: ft, in, sq ft (or blank = use unitOfMeasure as-is)
- Uses existing dimensions for conversion math — no conversion factor field needed

### How it works

**currentQty stays in purchase units (rolls, ea, etc.).** Display is calculated on the fly:

| shopUnit | Display formula | Example |
|---|---|---|
| null | `currentQty` in `unitOfMeasure` | 10 ea |
| ft | `currentQty × dimLength` in ft | 5 rolls × 100 ft = 500 ft |
| sq ft | `currentQty × dimLength × dimWidth` in sq ft | 15 ea × 3×11 = 495 sq ft |
| in | `currentQty × dimLength (in inches)` in in | 5 ea × 96 in = 480 in |

### Examples

**Gasket roll:** unitOfMeasure=roll, shopUnit=ft, dimLength=100ft
- Inventory shows: 500 ft
- Receive 2 rolls → 700 ft
- Use 5 ft on BOM → deduct 0.05 rolls → 695 ft

**Diamond plate:** unitOfMeasure=ea, shopUnit=null, dimLength=4ft, dimWidth=8ft, dimThickness=0.125in
- Inventory shows: 10 ea (dimensions are for identification only)

**Panel:** unitOfMeasure=ea, shopUnit=sq ft, dimLength=3ft, dimWidth=11ft
- Inventory shows: 495 sq ft

**Fitting:** unitOfMeasure=ea, shopUnit=null, no dimensions
- Inventory shows: 24 ea

---

## Step-by-Step Tasks

### Step 1: Schema — add shopUnit to Product
- Add `shopUnit String?` to Product model in schema.prisma
- Push to database

### Step 2: Utility function — getDisplayQty
- Create `src/lib/units.ts` with a function that takes product data and returns `{ qty, unit }`
- Handles ft, sq ft, in conversion using dimensions
- Falls back to raw currentQty + unitOfMeasure when no shopUnit

### Step 3: API routes — include shopUnit
- Add to create/update schemas in inventory routes
- Include in all product selects (inventory, dashboard, boms, transactions)

### Step 4: Product form — Shop Unit dropdown
- Add dropdown: None, ft, in, sq ft
- Place near dimensions section
- Label: "Shop Unit" with helper text "How the shop measures this item"

### Step 5: Product detail + edit pages
- Use getDisplayQty for the main quantity display
- Show ordering info: "Ordered in: rolls"
- Pass shopUnit to edit form

### Step 6: Product card + inventory list
- Pass dimension data and shopUnit through
- Use getDisplayQty for display

### Step 7: Dashboard low stock
- Include shopUnit + dimensions in query
- Use getDisplayQty for display

### Step 8: Stock adjustment page
- Display and accept input in shop unit
- Convert back to purchase units before calling adjustStock

### Step 9: BOM components
- Include shopUnit in product picker results
- Use shopUnit for display in BOM line items

### Step 10: Build + deploy

---

## Success Criteria

1. Product with shopUnit=ft shows inventory in feet (currentQty × dimLength)
2. Product without shopUnit displays exactly as before
3. Receiving adds in purchase units, display updates automatically
4. Stock adjustments work in shop units
5. App builds and deploys without errors
