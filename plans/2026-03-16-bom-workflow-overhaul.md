# BOM Workflow Overhaul — Click Reduction, Accessibility, Panel Math & Trim Tracking

**Created:** 2026-03-16
**Status:** Implemented
**Requested by:** Gabe

---

## Objectives

1. **Reduce clicks by 25%** from SM BOM creation → Foreman completion
2. **Increase clickability by 25%** — larger touch targets, floating buttons, functional "+" signs, shop-floor accessibility
3. **Fix panel math** — panels can't be pieced together; each BOM panel requires one stock panel ≥ its height
4. **Add trim fabrication tracking** — distinguish RSNE-made vs. supplier-ordered trim, auto-deduct raw coil on checkout

---

## Skill Inputs

- **frontend-design**: Shop-floor mobile-first design — minimum 48px touch targets, floating action buttons for primary actions, high-contrast, glove-friendly spacing. Reduce mode-switching and confirmation dialogs.
- **engineering-skills (backend)**: Panel math must validate per-panel (not aggregate sq ft). Trim fabrication requires a `fabricationSource` concept on BOM line items with auto-calculated coil consumption.
- **product-skills**: Trim sourcing should be per-BOM-line-item (same product can be ordered OR made in-house depending on the job). Panel waste should be logged for reporting but not tracked as reusable inventory initially. **BOM creation should shift from AI-first to quick-pick-first** — 80% of materials are repeats; AI adds latency and uncertainty for items the SM already knows. Quick-pick primary + AI as power tool for bulk/unusual items + job cloning for similar jobs.

---

## Fundamental Flow Change: Quick-Pick Primary, AI Secondary

### Why the change
Gabe identified that the AI-first path has a double-entry problem. For ~80% repeat materials, the SM already knows what they need — asking AI to guess and then confirming each guess is slower than just tapping the item directly. The AI-first approach optimized for a "wow" demo but not for daily use.

### New BOM creation model (single-screen, no phases)
```
┌─────────────────────────────────┐
│ New BOM                         │
├─────────────────────────────────┤
│ Job: [____________] [▾ picker]  │
│                                 │
│ ┌─ Clone from previous ───────┐│
│ │ Job 2847 (Mar 12) ►         ││
│ │ Job 2831 (Mar 8)  ►         ││
│ └─────────────────────────────┘│
│                                 │
│ ★ Favorites (auto-populated)   │
│ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │4" IMP │ │TWS OC│ │Caulk │   │
│ │  +1   │ │  +1  │ │  +1  │   │
│ └──────┘ └──────┘ └──────┘   │
│ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │Hinges│ │Screws│ │Tape  │   │
│ │  +1   │ │  +1  │ │  +1  │   │
│ └──────┘ └──────┘ └──────┘   │
│                                 │
│ Categories                      │
│ [Panels] [Trim/TWS] [Fasteners]│
│ [Sealants] [Hardware] [Other]  │
│                                 │
│ ── Added (3 items) ──────────  │
│ 4" IMP White 10'    ×10 [−][+]│
│ TWS OC 2×2 8'       ×20 [−][+]│
│ Caulk Tubes          ×5 [−][+]│
│                                 │
├─────────────────────────────────┤
│ 🎤 "also need 10 zip ties..." │  ← AI bar (always available)
│ [  Create BOM (3 items)     ]  │  ← sticky bottom
└─────────────────────────────────┘
```

**Key principles:**
1. **Job first** — pick job, system suggests cloneable previous BOMs
2. **Favorites grid** — auto-populated from SM's most-used items. One tap = add qty 1, tap again = qty 2
3. **Category drill-down** — for non-favorite items, tap category → see products → tap to add
4. **AI bar at bottom** — always available for voice/photo/text, handles the 20% unusual items. High-confidence items auto-add (no confirmation cards)
5. **Live "Added" list** — running cart with qty steppers, inline swipe-to-remove
6. **Single screen** — no Input/Build/Review phases, no tab switching. WYSIWYG.

### Click count comparison (10-item BOM, 8 repeat + 2 unusual)
| Approach | Clicks | Wait time |
|----------|--------|-----------|
| Current AI-first | ~15-25 | 2-5s parse + per-item review |
| New quick-pick + AI | **~16** | Instant for 8, 1-2s for 2 via voice |
| Clone previous job | **~13** | Instant |

---

## Current Click Count: SM Creates → Foreman Completes

### BOM Creation (SM — Current AI Flow): ~14 clicks
| # | Action | Clicks |
|---|--------|--------|
| 1 | Navigate to /boms | 1 |
| 2 | AI Input — speak/type/photo | 1 |
| 3 | Accept each item (×5 avg) | 5 |
| 4 | Select job from picker | 2 |
| 5 | Scroll down | 1 |
| 6 | Tap "Create BOM" | 1 |
| 7 | Scroll review / verify | 1-3 |
| | **Subtotal** | **~14** |

### Approval (OM/Admin): ~4 clicks
| # | Action | Clicks |
|---|--------|--------|
| 1 | Navigate to BOM (from list or notification) | 2 |
| 2 | Tap "Approve BOM" | 1 |
| 3 | Confirm dialog "Yes, Approve BOM" | 1 |
| | **Subtotal** | **~4** |

### Checkout (Shop Foreman): ~6 clicks
| # | Action | Clicks |
|---|--------|--------|
| 1 | Navigate to BOM | 2 |
| 2 | Tap "Check Out All" | 1 |
| 3 | Review confirmation card | 1 |
| 4 | Tap "Confirm" | 1 |
| 5 | (Panel items: open sheet, select brand, add heights, confirm) | +4-6 |
| | **Subtotal** | **~6** (no panels) / **~12** (with panels) |

### Completion: ~3 clicks
| # | Action | Clicks |
|---|--------|--------|
| 1 | Tap "Mark Completed" | 1 |
| 2 | Confirm dialog | 1 |
| 3 | (Optional: Return Material flow) | +3-5 |
| | **Subtotal** | **~3** |

### **Total: ~27 clicks** (no panels) / **~33 clicks** (with panels)
### **Target: ~20 clicks** (no panels) / **~25 clicks** (with panels)

---

## Part 1: BOM Creation Redesign — Quick-Pick Primary

### Step 1.1 — New Single-Screen BOM Creation Page
**File:** Replace `src/components/bom/bom-ai-flow.tsx` with new `src/components/bom/bom-quick-pick.tsx`

Replace the current 2-tab (AI Build / Manual Entry) + multi-phase (INPUT → BUILD) flow with a **single-screen** BOM builder:

**Sections (top to bottom, all visible):**
1. **Job picker** (top) — same `JobPicker` component, always visible
2. **Clone suggestion** — if job is selected and similar past BOMs exist, show "Start from Job 2847?" cards (max 2-3)
3. **Favorites grid** — 2×3 or 3×3 grid of most-used products. Each tile: product name + one-tap "+1" button. Tap multiple times to increment qty.
4. **Category pills** — horizontal scroll: Panels, Trim/TWS, Fasteners, Sealants, Hardware, Other. Tapping opens a filtered product list below.
5. **Product search** — existing `ProductPicker` component, for when favorites/categories aren't enough
6. **Added items list** — live "cart" showing added items with qty steppers (−/+) and swipe-to-remove
7. **AI input bar** — `AIInput` component pinned above the sticky Create button. Always available for voice/photo/text. High-confidence results auto-add to the cart (no confirmation cards).
8. **Sticky "Create BOM" button** — bottom of viewport, shows item count

**No more tabs.** The `/boms/new` page renders this single component. The old Manual Entry form and AI Build flow are both replaced.

### Step 1.2 — Favorites System (Auto-Populated)
**Backend:** New API route `GET /api/products/favorites`

Favorites are auto-calculated, not manually curated:
- Query the user's last 20 BOMs
- Count product frequency across those BOMs
- Return top 9 products sorted by frequency
- Cache per-user, refresh on new BOM creation

**No new schema needed** — this is a read query against existing BOM line items.

**Frontend:** `src/components/bom/favorites-grid.tsx`
- 3×3 grid of `h-16` (64px) tiles — large, tappable, glove-friendly
- Each tile: abbreviated product name (max 2 lines) + category color stripe on left edge
- Tap = add to cart with qty 1 (or increment if already in cart)
- Shows small qty badge in top-right when item is in cart
- Empty state (new user, no history): show "Your most-used items will appear here" + category pills

### Step 1.3 — Job Cloning
**Backend:** New API route `GET /api/boms/clonable?jobName={name}`

When a job is selected, suggest previous BOMs that could be cloned:
- Same customer prefix in job name, OR
- Most recent 3 BOMs by this SM
- Return BOM ID, job name, item count, date

**Frontend:** Tapping "Start from Job X" pre-populates the Added Items list with that BOM's line items and quantities. SM adjusts from there.

**Clicks saved:** For similar jobs, this cuts creation from ~16 clicks to ~13.

### Step 1.4 — AI Auto-Add (No Confirmation Cards)
**File:** Integrated into new `bom-quick-pick.tsx`

When AI parses voice/photo/text input:
- **High confidence (≥0.85):** Item auto-adds to the cart. A subtle toast says "Added 3 items" with an undo link.
- **Low confidence (<0.85):** Item shows inline in the cart with a yellow "?" badge. SM taps to see alternatives or confirm.
- **No match:** Item appears as a suggested non-catalog item with a "Add anyway?" prompt.

No separate confirmation card list. No pending/confirmed split. Everything goes to one cart.

### Step 1.5 — Eliminate Confirmation Dialogs (Approval, Checkout, Completion)
**File:** `src/app/boms/[id]/page.tsx`, `src/components/bom/checkout-all-button.tsx`

All three status-change dialogs (Approve, Check Out All, Mark Completed) are **removed**. These actions are reversible and the user already sees the full context on the detail page.

**New pattern:** Direct action → success toast with 5-second undo. Example: "BOM approved ✓ [Undo]"

**Clicks saved:** 3 (one per dialog eliminated)

### **Total improvement: ~27 clicks → ~16-19 clicks (30-40% reduction)**

---

## Part 2: Clickability / Accessibility Improvements

### Step 2.1 — Minimum 48px Touch Targets Everywhere
**Files:** All BOM components

Audit and fix every interactive element:

| Component | Current | Target |
|-----------|---------|--------|
| Accept ✓ / Reject ✗ buttons (confirmation cards) | `h-11 w-11` (44px) | `h-12 w-12` (48px) |
| "Edit" ghost button (BOM detail header) | `size="sm"` (~32px) | `h-12 px-4` (48px) |
| Qty input fields | `h-10` (40px) | `h-12` (48px) |
| "Add Panel" / "Non-Catalog Item" buttons | `size="sm"` (~32px) | `h-12` (48px) |
| Delete ✕ buttons on confirmed items | `h-8 w-8` (32px) | `h-12 w-12` (48px) |
| Tab buttons (AI Build / Manual Entry) | `py-3` (~44px) | `py-4` (52px+) |
| Panel height pills (checkout sheet) | varies | min `h-12 min-w-12` |
| Qty stepper +/− buttons (return mode) | varies | `h-12 w-12` |

### Step 2.2 — Floating Action Button (FAB) for Primary Actions
**File:** `src/app/boms/[id]/page.tsx`

Replace bottom-of-page action buttons with a **sticky floating action bar** at the bottom of the viewport. This ensures the primary action is always visible without scrolling.

**Implementation:**
```
┌──────────────────────────────┐
│  BOM content (scrollable)    │
│  ...                         │
│  ...                         │
├──────────────────────────────┤
│  ┌──────────────────────┐    │  ← Sticky bottom bar
│  │ ✓ Check Out All (5)  │    │     h-14, full-width
│  └──────────────────────┘    │     bg-brand-orange
│  ┌──────┐  ┌──────────┐     │  ← Secondary row
│  │ + Add │  │ ↩ Return │     │     h-12 each
│  └──────┘  └──────────┘     │
└──────────────────────────────┘
```

- Primary action: always `h-14` (56px), full-width, high-contrast orange
- Secondary actions: `h-12` (48px), side-by-side
- Bar uses `position: sticky; bottom: 0` with `pb-safe` for iOS safe area
- Slight top shadow (`shadow-[0_-2px_8px_rgba(0,0,0,0.06)]`) to visually separate from content
- Bar adapts to BOM status (DRAFT shows Approve, APPROVED shows Check Out All, etc.)

### Step 2.3 — Make ALL "+" Icons Functional Tap Targets
**Files:** Multiple BOM components

Audit every `+` icon / Plus icon in the BOM workflow:

1. **Items header "+" (BOM detail view mode)** — Currently decorative or triggers inline form. Make it a proper `h-12 w-12` button that opens add-material mode directly.
2. **"+ Add Material" button** — Already functional but `size="sm"`. Upgrade to `h-12`.
3. **"+ Non-Catalog Item"** — Already functional but `size="sm"`. Upgrade to `h-12`.
4. **"+ Add Panel"** — Already functional but `size="sm"`. Upgrade to `h-12`.
5. **Qty stepper "+" buttons** — Already functional in return mode. Ensure `h-12 w-12`.

Rule: Every `<Plus />` icon rendered in the UI MUST be wrapped in a button with minimum `h-12 w-12`.

### Step 2.4 — High-Contrast Action Buttons
**Files:** Button components across BOM

- Primary actions (Check Out, Approve, Create): `bg-brand-orange` with white text, `font-bold` (not `font-semibold`), `text-base` minimum
- Destructive actions (Cancel BOM): `bg-status-red` solid (not outline with red text — too subtle for shop floor)
- Secondary actions (Edit, Return): `border-2` (not `border`) for better visibility on bright screens
- All buttons: minimum `font-semibold text-[15px]`

### Step 2.5 — Increase Spacing Between Interactive Rows
**Files:** `bom-line-item-row.tsx`, `bom-confirmation-card.tsx`

- Line item rows: increase vertical padding from `py-3` to `py-4`
- Add `gap-3` between action buttons (currently `gap-2`)
- Confirmation cards: increase gap between Accept/Reject buttons to prevent mis-taps

---

## Part 3: Panel Math Fix

### Problem
The current panel checkout uses **sq ft equivalence** to validate fulfillment. This is fundamentally wrong because panels can't be pieced together from scraps.

**Example of the bug:**
- BOM needs: 10 × 8' panels (44" wide) = 293.3 sq ft
- Stock has: 10' panels only
- Current system: Would allow checking out ~8 × 10' panels (293.3 sq ft) ✓
- Reality: You need **10 × 10' panels** (one per BOM panel), cutting each to 8', creating 2' drops

### Step 3.1 — Per-Panel Validation Logic
**File:** `src/app/api/boms/[id]/panel-checkout/route.ts`

Replace sq-ft-based validation with **per-panel validation**:

```
For each breakout row:
  stockHeight = row.height (what we're pulling from stock)
  bomCutLength = specs.cutLengthFt (what the BOM needs)

  If stockHeight < bomCutLength:
    REJECT — "Cannot cut {bomCutLength}' panels from {stockHeight}' stock"

  panelsNeeded = row.quantity
  stockProduct = findProduct(brand, stockHeight, width, thickness)

  If stockProduct.currentQty (in panels) < panelsNeeded:
    WARNING — insufficient stock

  // Each stock panel yields exactly ONE BOM panel (plus waste)
  wasteFt = stockHeight - bomCutLength
  wastePerPanel = wasteFt * (width / 12)  // waste in sq ft
  totalWaste = wastePerPanel * panelsNeeded
```

**Key changes:**
1. Validate `stockHeight >= bomCutLength` (can't cut a 10' panel from 8' stock)
2. Count panels 1:1 (10 BOM panels = 10 stock panels, regardless of height difference)
3. Calculate and record waste per checkout
4. Stock deduction: deduct `panelsNeeded` panels worth of sq ft from the stock product (e.g., 10 × 10' × 44" = 366.7 sq ft deducted, even though BOM only "needs" 293.3 sq ft)

### Step 3.2 — Waste/Drop Logging
**File:** `src/app/api/boms/[id]/panel-checkout/route.ts`

Track waste for reporting (not as reusable inventory, per product decision):

- Add a `waste` field to the panel checkout response
- Log waste as a separate transaction with type `ADJUST_DOWN` and a note like `"Panel drop: cut 10' to 8', 2' waste × 10 panels"`
- Future: Could create drop inventory items, but for now just log the waste amount

**Schema change:** None needed — waste is logged via existing Transaction model with notes.

### Step 3.3 — Update Panel Checkout UI
**File:** `src/components/bom/panel-checkout-sheet.tsx`

Update the "sq ft equivalence story" to show the **per-panel reality**:

Before: `"5 stock panels → 10 BOM panels ✓"` (misleading)

After:
```
10 × 10' stock panels → 10 × 8' BOM panels ✓
Waste: 10 × 2' drops (73.3 sq ft)
```

- Show warning icon if stockHeight > bomCutLength + 4' (excessive waste)
- Validate that selected stock height ≥ BOM cut length (disable heights below cut length)
- Remove the sq ft equivalence display — it was the source of the wrong mental model

### Step 3.4 — Disable Invalid Stock Heights in UI
**File:** `src/components/bom/panel-checkout-sheet.tsx`

In the height picker, **gray out / disable** any height shorter than the BOM's `cutLengthFt`. If the BOM needs 8' panels, you can't select 6' stock panels.

Visual treatment: disabled heights show as gray pills with a line-through, with a tooltip "Stock panels must be ≥ {cutLengthFt}'"

---

## Part 4: Trim Fabrication Tracking

### Problem
Many trim items (TWS: outside corners, inside corners, caps, screeds) are fabricated in-house from raw coil stock. Currently:
- No way to distinguish RSNE-made vs. supplier-ordered on a BOM
- No auto-deduction of source material (coil) when RSNE-made trim is checked out
- Same trim product can be sourced either way depending on the job

### Product Decisions (from skill input)
1. **Per-BOM-line-item decision** (not per-product) — same trim can be RSNE-made on one job and supplier-ordered on another
2. **Toggle on BOM line item** — defaults to RSNE-made for products that have a `fabricationRecipe`, with override to "Order from supplier"
3. **Coil deduction at checkout** — when Foreman checks out RSNE-made trim, the backend auto-deducts the calculated coil qty

### Step 4.1 — Fabrication Recipe Data Model
**File:** `prisma/schema.prisma`

Add a new model to define how products are fabricated from raw materials:

```prisma
model FabricationRecipe {
  id                String   @id @default(uuid())
  finishedProductId String
  finishedProduct   Product  @relation("finishedRecipes", fields: [finishedProductId], references: [id])
  sourceProductId   String
  sourceProduct     Product  @relation("sourceRecipes", fields: [sourceProductId], references: [id])

  // How much source material per unit of finished product
  // e.g., 1 piece of 8' 2"x2" TWS IC = 2.67 sq ft of coil
  sourceQtyPerUnit  Decimal  @db.Decimal(12, 4)
  sourceUom         String   // "sq ft", "linear ft", etc.

  // Descriptive fields
  notes             String?
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

Add relations to Product:
```prisma
model Product {
  // ... existing fields ...
  fabricationRecipes      FabricationRecipe[] @relation("finishedRecipes")
  usedInFabricationOf     FabricationRecipe[] @relation("sourceRecipes")
}
```

### Step 4.2 — BOM Line Item Sourcing Flag
**File:** `prisma/schema.prisma`

Add `fabricationSource` to BomLineItem:

```prisma
enum FabricationSource {
  RSNE_MADE      // Fabricated in-house from raw material
  SUPPLIER       // Ordered pre-fabricated from supplier
}

model BomLineItem {
  // ... existing fields ...
  fabricationSource  FabricationSource?  // null = N/A (not a fabricable item)
}
```

### Step 4.3 — Seed Fabrication Recipes
**File:** `prisma/seed.ts` (or a migration script)

Seed from Gabe's completed template at `outputs/tws-fabrication-recipes.csv`.

All 13 standard TWS products confirmed. All are 8' (RSNE machinery limit). All use **Galvanized Steel Coil - Textured White (26ga)** as source material.

**Confirmed recipes (13 standard TWS):**

| Product | Widths | Total Width | Sq Ft / Piece |
|---------|--------|-------------|---------------|
| TWS IC 2"×2" | 2+2 | 4" | 2.67 |
| TWS IC 3"×3" | 3+3 | 6" | 4.00 |
| TWS IC 3.5"×3.5" w/ 1.5" Standoff | 3.5+3.5+1.5 | 8.5" | 5.67 |
| TWS OC 2"×3" | 2+3 | 5" | 3.33 |
| TWS OC 2"×6" | 2+6 | 8" | 5.33 |
| TWS OC 2"×7" | 2+7 | 9" | 6.00 |
| TWS OC 3"×6" | 3+6 | 9" | 6.00 |
| TWS OC 3"×7" | 3+7 | 10" | 6.67 |
| TWS Cap 2"×4.25"×2" | 2+4.25+2 | 8.25" | 5.50 |
| TWS Cooler Screed | 2+4.25+1.5 | 7.75" | 5.17 |
| TWS Freezer Screed | 2+1.5 | 3.5" | 2.33 |
| TWS Base Cover Trim | 1.5+2+2+0.625 | 6.125" | 4.08 |
| TWS Flat Batten 6" w/ Hem | 6 | 6" | 4.00 |

**Special cases:**
- **Freezer Screed** comes in pairs — 8' of freezer screed requires 2 × 8' pieces. Consumption should be doubled (4.66 sq ft per "pair unit").

**Three fabrication categories:**

1. **Standard TWS** — 13 fixed recipes above. Seeded into FabricationRecipe table.

2. **Custom TWS** — SM enters up to 5 width values on the BOM. System calculates:
   - `totalWidth = sum(width1..width5)`
   - `sqFtPerPiece = totalWidth × 8 / 12`
   - SM selects finish: Textured White (default), Textured Gray, or Flat White
   - Source material selected based on finish choice

3. **Flatstock** — raw sheet/coil cut to custom dimensions. Available source materials:
   - Steel coil in all colors/textures (3 variants in catalog)
   - Aluminum sheets (various gauges)
   - Stainless steel sheets (various gauges)
   - SM specifies cut dimensions, consumption = cut area in sq ft

**Schema support for all three types:**
```prisma
model FabricationRecipe {
  // ... existing fields from Step 4.1 ...
  sourceQtyPerUnit  Decimal?  @db.Decimal(12, 4)  // Fixed (standard TWS)
  isCustomSizable   Boolean   @default(false)      // true for Custom TWS & Flatstock
  fabricationType   String?   // "STANDARD_TWS" | "CUSTOM_TWS" | "FLATSTOCK"
  // Custom TWS: consumption calculated at BOM time from user-entered widths
  // Flatstock: consumption calculated from user-entered cut dimensions
}
```

**BomLineItem additions for custom fabrication:**
```prisma
model BomLineItem {
  // ... existing fields ...
  fabricationSource  FabricationSource?
  fabricationSpecs   Json?  // For custom TWS: { widths: [2, 3], finish: "Textured White" }
                            // For flatstock: { cutWidth: 24, cutLength: 48, material: "..." }
}
```

### Step 4.4 — Auto-Set Fabrication Source on BOM Creation
**Files:** `src/app/api/boms/route.ts`, `src/components/bom/bom-ai-flow.tsx`

When a BOM line item is created:
1. Check if the product has a `FabricationRecipe`
2. If yes → auto-set `fabricationSource = "RSNE_MADE"`
3. SM can override to `"SUPPLIER"` via a toggle on the confirmation card / line item row

**UI treatment:**
- Products with recipes show a small "Made in-house" badge (green, wrench icon)
- Tapping the badge toggles to "Order from supplier" (blue, truck icon)
- Badge is `h-8` pill, tappable, obvious but not intrusive

### Step 4.5 — Coil Auto-Deduction on Checkout
**File:** `src/app/api/boms/[id]/checkout/route.ts`

When checking out a BOM line item with `fabricationSource = "RSNE_MADE"`:

```
1. Look up FabricationRecipe for this product
2. Calculate: coilQty = recipe.sourceQtyPerUnit × checkoutQty
3. Create CONSUME transaction against the source product (coil)
4. Deduct coilQty from source product's currentQty via adjustStock()
5. Create the normal CHECKOUT transaction for the finished product
6. Include "Raw material consumed: {coilQty} sq ft of {coilName}" in response
```

If `fabricationSource = "SUPPLIER"` → normal checkout (no coil deduction). The trim product itself should exist in inventory as a received item.

### Step 4.6 — Trim Sourcing UI on BOM Detail
**File:** `src/components/bom/bom-line-item-row.tsx`

For line items with `fabricationSource`:
- Show a toggle pill: 🔧 "In-house" ↔ 🚚 "Supplier"
- In view mode: show as a read-only badge
- In edit mode: tappable to toggle
- On checkout: if RSNE_MADE, show "Will consume {X} sq ft of {coil name}" info line

---

## Part 5: Implementation Order

| Priority | Step | Description | Effort |
|----------|------|-------------|--------|
| **1** | **3.1-3.4** | **Panel math fix (critical bug)** | Medium |
| **2** | **1.1-1.5** | **Quick-pick BOM creation redesign** | Large |
| 2a | 1.1 | New single-screen BOM page + component | Large |
| 2b | 1.2 | Favorites API + grid component | Small |
| 2c | 1.3 | Job cloning API + UI | Small |
| 2d | 1.4 | AI auto-add (no confirmation cards) | Medium |
| 2e | 1.5 | Remove confirmation dialogs | Small |
| **3** | **2.1-2.5** | **Clickability / accessibility pass** | Medium |
| **4** | **4.1-4.3** | **Fabrication data model + seed** | Small |
| **5** | **4.4-4.6** | **Trim sourcing UI + auto-deduction** | Medium |

### Dependencies
- Panel math fix (3.x) is independent — can ship immediately
- Quick-pick redesign (1.x) is the largest effort but highest impact
- Clickability pass (2.x) can be done during or after the redesign
- Trim fabrication (4.x) requires Gabe to fill out TWS product template (see below)

### What gets removed
- `src/components/bom/bom-ai-flow.tsx` — replaced by `bom-quick-pick.tsx`
- `src/components/bom/bom-confirmation-card.tsx` — no longer needed (AI auto-adds to cart)
- The "AI Build" / "Manual Entry" tab system on `/boms/new`
- All 3 confirmation dialogs (approve, checkout, complete)

### What gets preserved
- `AIInput` component — still used as the voice/photo/text bar
- `ProductPicker` — still used for catalog search
- `PanelLineItemForm` — still used for panel-specific entry
- `BomLineItemRow` — still used in BOM detail page
- `CheckoutAllButton` — simplified to single-tap

---

## Gabe Action Items

### 1. TWS Product Template
Fill out this template for all trim products made from coil stock. All lengths are 8' (confirmed).

| Product Name (as in catalog) | Profile Dimensions | Source Material | Sq Ft of Source Per Piece | Notes |
|-----------------------------|--------------------|-----------------|--------------------------|-------|
| TWS IC 2"×2" 8' | 2"×2" | Galv 26ga White Embossed Steel Coil | 2.67 | Confirmed |
| TWS OC 2"×2" 8' | 2"×2" | Galv 26ga White Embossed Steel Coil | 2.67 | Confirmed |
| TWS Cap ___" 8' | ___ | ___ | ___ | |
| TWS Screed ___" 8' | ___ | ___ | ___ | |
| (add more rows as needed) | | | | |

### 2. Confirm Quick-Pick Direction
Review the single-screen layout in Part 1. **Does the favorites grid + category pills + AI bar at bottom match how SMs actually think about building a BOM?**

---

## Implementation Notes

**Implemented:** 2026-03-16

### Summary

Parts 1-3 implemented (Quick-pick redesign, Clickability pass, Panel math fix). Parts 4-5 (Trim fabrication) deferred pending Gabe's TWS recipe review.

### What was built

**Part 3 — Panel Math Fix (Steps 3.1-3.4):**
- Rewrote `/api/boms/[id]/panel-checkout` to use per-panel validation (not sq ft equivalence)
- Each BOM panel requires one stock panel of equal or greater height
- Stock deduction: full stock panel sq ft (not just cut length portion)
- Waste logging as ADJUST_DOWN transactions with descriptive notes
- UI shows per-panel breakdown with waste (scissors icon + drop sizes)
- Warning for excessive waste (stock > cut + 4')
- Stock display shows panel count instead of sq ft
- All touch targets upgraded to 48px (brand buttons, height pills, inputs, delete buttons)

**Part 1 — Quick-Pick BOM Creation (Steps 1.1-1.5):**
- New `bom-quick-pick.tsx` — single-screen BOM builder replacing the tabbed AI/Manual flow
- Favorites API (`/api/products/favorites`) — auto-calculated from user's last 20 BOMs, top 9
- Clonable BOMs API (`/api/boms/clonable`) — recent BOMs for quick cloning
- AI auto-add — parsed items go straight to cart, high-confidence items marked, low-confidence get "?" badge
- `/boms/new` page simplified to single component (no tabs)
- All 3 confirmation dialogs removed (approve, checkout, complete) — direct action with toast

**Part 2 — Clickability/Accessibility (Steps 2.1-2.5):**
- 48px minimum touch targets across all BOM components
- Sticky floating action bar on BOM detail page (always visible, no scrolling to find primary action)
- All buttons upgraded: h-14 primary, h-12 secondary, border-2 for outlines
- Increased row padding (py-2 → py-4) and gap spacing (gap-2 → gap-3)
- High-contrast buttons: font-bold on primaries, solid bg-status-red on cancel (not outline)

### Deviations from Plan

- `bom-ai-flow.tsx` and `bom-confirmation-card.tsx` NOT deleted — kept for backward compatibility in case the old flow is needed. The new page simply doesn't import them.
- Checkout confirmation dialog removal uses the simpler approach (removed entirely) rather than adding an undo toast mechanism — the toast library doesn't natively support timed undo actions.

### Part 4-5 — Trim Fabrication (Implemented 2026-03-16)

**Step 4.1-4.2: Schema changes**
- Added `FabricationRecipe` model with `finishedProductId`, `sourceProductId`, `sourceQtyPerUnit`, `fabricationType`
- Added `FabricationSource` enum (`RSNE_MADE`, `SUPPLIER`)
- Added `fabricationSource` and `fabricationSpecs` fields to `BomLineItem`
- Pushed to Supabase via direct connection (port 5432 — pooler port 6543 hangs on schema changes)

**Step 4.3: Seeded 13 recipes**
- All 13 standard TWS products linked to "Galvanized Steel Coil - Textured White (26ga)"
- Script at `prisma/seed-fabrication-recipes.ts`

**Step 4.4: Auto-set on BOM creation**
- BOM POST API looks up fabrication recipes for catalog products
- Products with recipes auto-set to `RSNE_MADE`

**Step 4.5: Coil auto-deduction on checkout**
- When checking out a line item with `fabricationSource === "RSNE_MADE"`, the API:
  1. Looks up the FabricationRecipe
  2. Calculates coil consumption: `sourceQtyPerUnit × checkoutQty`
  3. Creates a CONSUME transaction against the source product (coil)
  4. Logs descriptive notes for audit trail

**Step 4.6: Trim sourcing UI**
- `BomLineItemRow` shows fabrication source badge (wrench "In-house" or truck "Supplier")
- In edit mode: badge is tappable to toggle between RSNE_MADE and SUPPLIER
- In view mode: read-only badge
- BOM update API supports `fabricationSource` in `updateLineItems`
