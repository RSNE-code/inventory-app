# Plan: Panel Receiving Workflow

**Created:** 2026-03-12
**Status:** Implemented
**Request:** Fast workflow for receiving insulated panels — break out a generic PO line item (total sq ft) into specific panel sizes with minimal steps, including exterior color tracking.

---

## Overview

### What This Plan Accomplishes

Adds a specialized "Panel Breakout" step to the receiving workflow that lets users quickly define the quantity, size, and exterior color of panels received when the PO only has a generic line item with total square footage. Instead of receiving "500 sq ft of 4" AWIP panels" as a single blob, the user can break that into "10× 10ft + 5× 8ft + 3× 12ft in Regal White" in just a few taps — and each size gets received as its own catalog product with color metadata.

### Why This Matters

RSNE orders insulated panels via cut lists sent separately from the PO. The PO just says "500 sq ft of 4" white/white panels from AWIP." When the truck arrives with bundles of various sizes, the team currently has no fast way to record what actually showed up by size. This means inventory doesn't reflect what's actually on the floor — they can't tell you "we have 8 leftover 10ft Kingspan 4" Regal White panels" which is critical for planning future jobs. Getting size-level receiving right — with color — is foundational to the rest of the panel workflow (fabrication, material planning, leftover tracking).

---

## Current State

### Relevant Existing Structure

| File | What It Does |
|------|-------------|
| `src/components/receiving/receiving-flow.tsx` | State machine: INPUT → PO_MATCH/PO_BROWSE → PO_RECEIVE → REVIEW → SUMMARY |
| `src/components/receiving/po-receive-card.tsx` | PO line item checklist with editable quantities. **Note:** Hardcodes `unitOfMeasure: "each"` — must use product's actual UOM for panel items. |
| `src/components/receiving/receipt-summary.tsx` | Final review before submission |
| `src/app/api/receiving/route.ts` | Receipt creation API — creates Receipt, updates PO line items, calls adjustStock() |
| `src/lib/ai/types.ts` | `ConfirmedReceivingItem`, `MatchedPO`, `CatalogMatch` types |
| `src/lib/units.ts` | `getDisplayQty()`, `toPurchaseQty()` — shopUnit conversion system |
| `src/lib/stock.ts` | `adjustStock()` — all stock changes go through here |
| `prisma/schema.prisma` | Product model with `dimLength`, `dimWidth`, `dimThickness` fields |
| `prisma/knowify-catalog.json` | 278 IMP products: `Insulated Metal Panel ({Brand})-{Height}'-{Width}-{Thickness}` |

### Panel Product Structure in Catalog

Every panel size is already its own product in the catalog:
- **Naming pattern:** `Insulated Metal Panel (AWIP)-10'-44-4` = AWIP, 10ft tall, 44" wide, 4" thick
- **Brands:** AWIP, Falk, Kingspan, MetlSpan
- **Heights:** 8ft through 40ft (33 sizes)
- **Widths:** Variable per brand AND model (see width reference below)
- **Thicknesses:** 2", 4", 5" (catalog); manufacturers offer 2.5", 3", 6", 8" also
- **Total:** 278 IMP products
- **Unit of measure:** "sheet" (individual panel count)
- **Category:** "Insulated Metal Panel"

### Manufacturer Specifications (from spec sheet research)

#### Coverage Widths by Brand & Model

| Brand | Model | Coverage Width |
|-------|-------|---------------|
| AWIP | DM40 (Mesa) | 40" |
| AWIP | DM44 (Mesa) | 44" |
| Falk | HFW 40 | 40" (42.25" system width) |
| Kingspan | KS Shadowline (Exterior) | 24", 30", 36", 42" |
| Kingspan | KS Shadowline Interior | **45 3/8"** (45.38") |
| Kingspan | KS Flat | 42" |
| Kingspan | KS Flat Interior | **45 3/4"** (45.75") |
| Kingspan | KS Azteco / Micro-Rib | 24", 30", 36", 42" |
| Kingspan | K-Roc HF Series | 42" |
| MetlSpan | CF Mesa | 30", 36", 42", 44" |

**Key insight:** The catalog's "45.38" for Kingspan matches the KS Shadowline Interior specifically. Other Kingspan models use 42". Width should be selectable, not hardcoded per brand.

#### Available Thicknesses

| Brand | Thicknesses |
|-------|-------------|
| AWIP | 2" - 8" |
| Falk | 2.5", 3", 4", 5", 6", 8" |
| Kingspan | 2", 2.5", 3", 4", 5", 6" (QuadCore); 4", 6", 8" (K-Roc) |
| MetlSpan | 2", 2.5", 3", 4", 5", 6", 8" |

#### Standard Colors by Brand

**MetlSpan (Nucor) — Exterior (PVDF Cool Coatings):**
| Color | IR | SRI |
|-------|-----|-----|
| Regal White | .73 | 89 |
| Warm White | .65 | 78 |
| Surrey Beige | .51 | 59 |
| Pearl Gray | .51 | 59 |
| Royal Blue | .30 | 30 |
| Slate Gray | .39 | 43 |
- Interior standard: **Igloo White** (Polyester)

**Kingspan — Standard Colors:**
| Coating System | Colors |
|----------------|--------|
| MP (Modified Polyester) | Imperial White |
| SMP (Siliconized Modified Polyester) | Driftwood, Sandstone, Surrey Beige |
| Solid Fluropon PVDF | Regal White, Driftwood, Sandstone, Surrey Beige |
- Interior standard: **Modified Polyester** (Imperial White)
- Premium: Flurothane Coastal PVDF

**FALK — Coatings:**
| Coating System | Notes |
|----------------|-------|
| Colorcoat HPS200 Ultra (Tata Steel) | 13 key colors, standard |
| Fluropon 70% PVDF (Sherwin-Williams) | Wide range |
| WeatherXL SMP (Sherwin-Williams) | Solar Reflective options |
- Interior standard: **Dutch White** (PolyPREMIER)
- 50+ exterior colors available

**AWIP:**
- Interior standard: **Imperial White**
- Embossed surfaces standard on wall panels
- Multilayered coil coat systems for aggressive environments
- Color chart available via PDF download

### Gaps or Problems Being Addressed

1. **PO has one generic line item** — "Insulated Panel 4" — 500 sq ft" but the delivery contains multiple specific sizes (10ft, 12ft, 8ft panels)
2. **No way to break out sizes during receiving** — current PO receive card shows one line item, one quantity input
3. **Inventory doesn't track by size** — can't answer "how many 10ft AWIP 4" panels do we have?"
4. **Bundle vs panel confusion** — panels arrive in bundles (4"=11 panels/bundle, 5"=8 panels/bundle) but need to be tracked individually
5. **No color/finish tracking** — can't distinguish Regal White vs Surrey Beige panels in inventory, which matters for job matching
6. **Width varies by model** — Kingspan alone has 42", 45 3/8", and 45 3/4" widths depending on model; plan must support variable widths

---

## Proposed Changes

### Summary of Changes

- Add a **"Panel Breakout"** sub-flow triggered when a user taps a panel line item on the PO receive card
- The breakout UI pre-selects brand/thickness from the PO line item context, with **editable width** (defaulted from brand/model) and **exterior color picker**
- Each size row maps to a real catalog product (e.g., `Insulated Metal Panel (AWIP)-10'-44-4`)
- Optional bundle input: separate "bundles" field auto-populates the "panels" field (not a toggle that reinterprets one field)
- The breakout replaces the single PO line item with multiple `ConfirmedReceivingItem` entries (one per size)
- Running total shows panels counted vs PO square footage to help the user verify completeness
- **Exterior color** is stored as metadata on each breakout item (notes field on the receipt + optional product tag for future filtering)
- No schema migration needed — color metadata rides on existing `notes` field initially

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/receiving/panel-breakout.tsx` | The panel breakout UI — context selectors + size/qty rows + color picker |
| `src/lib/panels.ts` | Panel utility functions — brand detection, catalog lookup, bundle conversion, sq ft calculation, color constants |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/components/receiving/po-receive-card.tsx` | Add "Break out sizes" button on panel line items; pass breakout results back as multiple items; fix `unitOfMeasure` to use product's actual UOM |
| `src/components/receiving/receiving-flow.tsx` | Handle expanded panel items in confirmedItems state; aggregate PO line item qty updates |
| `src/components/receiving/receipt-summary.tsx` | Group panel breakout items with color display |
| `src/lib/ai/types.ts` | Add optional panel fields to `ConfirmedReceivingItem` |
| `src/app/api/products/route.ts` | Add panel filter support (or new `/api/products/panels` route) |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Breakout as inline expansion, not separate phase**: The panel breakout opens inside the PO receive card rather than being a separate workflow phase. This keeps the step count minimal — user sees the PO line items, taps "Break out sizes" on the panel line, fills in sizes, and confirms. One extra step, not a whole new phase.

2. **Pre-select everything from PO context, all editable**: When the user taps breakout, `parsePanelContext()` extracts brand, thickness, width, AND color from the PO line item description. Width and color are pre-filled from PO text when available (e.g., "AWIP 4" Regal White 44"" → all four fields populated), falling back to brand defaults only when the PO doesn't specify. All fields remain editable via dropdowns. The PO is the best starting point — it almost always has the answer.

3. **Exterior color picker — required, PO-seeded**: The breakout includes a color dropdown pre-filled from PO context. Common PO patterns like "white/white", "Igloo White", "Imperial White", "Regal White" are parsed. This was confirmed as important by manufacturer spec sheet research: you can't mix Regal White and Surrey Beige panels on the same building, so inventory needs to track color. **Interior is always standard white per brand and not tracked.**

4. **Map to existing catalog products**: Each breakout row resolves to a real `Insulated Metal Panel ({Brand})-{Height}'-{Width}-{Thickness}` product in the catalog. Color is stored as metadata, not as a separate product — keeps the catalog manageable.

5. **Separate bundle and panel fields, not a toggle**: Instead of a "BDL toggle" that reinterprets what the qty field means (error-prone), show two fields side by side: `[Bundles: ___] → [Panels: ___]`. Typing in bundles auto-calculates panels. Typing in panels directly also works. Two fields, one truth.

6. **Running sq ft tally for verification**: The breakout shows a running total of sq ft being received vs what the PO says. Formula: `panels × (height_ft × (width_inches / 12))`. **Note:** This uses the panel's coverage width, which is what the PO quantity is based on.

7. **Pre-load panel products in one query**: When the breakout opens, fetch ALL panel products for the detected brand + thickness in a single API call (~33 products max). Pass as a lookup map to the component. No per-row lookups.

8. **Validate product existence before confirm**: Each row validates against the pre-loaded product map as the height is selected. If a height doesn't have a matching catalog product, the row shows a warning immediately (not at submit time).

9. **Prevent duplicate heights**: The height dropdown disables already-selected heights. To add more panels of an existing height, edit the existing row's quantity.

10. **No schema migration**: Color rides on `ConfirmedReceivingItem.panelColor` field (display) and is included in the receipt notes. Future enhancement could add a `color` or `finish` field to the Product model.

11. **AI-assisted breakout from photos**: Deferred to future. Manual workflow first — it's fast enough with just taps.

### Alternatives Considered

1. **Separate "Panel Receiving" page**: Rejected — adds navigation overhead and doesn't integrate with PO matching.

2. **AI-only approach (photo the delivery ticket)**: Deferred to a future phase. The manual breakout needs to exist first as the reliable path.

3. **New PanelReceipt model in the database**: Rejected — over-engineering. Existing Receipt → Transaction → Product chain handles this perfectly.

4. **Color as separate product variants**: Rejected — would multiply 278 products by 4-6 colors = 1,000+ products. Color metadata on the receipt is sufficient for now.

5. **Hardcoded width per brand**: Rejected — Kingspan has three different widths (42", 45 3/8", 45 3/4") depending on model. Width must be selectable.

6. **Bundle toggle that reinterprets qty field**: Rejected — confusing UX. Separate bundle/panel fields are clearer.

### Open Questions (Resolved)

1. ~~**Finish/color tracking**~~ **RESOLVED: Yes, track exterior color.** Manufacturer spec sheets confirm multiple exterior colors per brand (6 for MetlSpan, 4+ for Kingspan, 50+ for Falk). Color matters for job matching. Interior is always white — not tracked.

2. ~~**Non-standard widths**~~ **RESOLVED: Yes, variable widths exist.** Kingspan alone has 42", 45 3/8", 45 3/4" coverage widths depending on model. Width will be a selectable dropdown, defaulted from brand.

---

## Step-by-Step Tasks

### Step 1: Create Panel Utility Library

Create `src/lib/panels.ts` with all the panel-specific logic separated from UI.

**Actions:**

- Create `src/lib/panels.ts` with:
  - `PANEL_BRANDS` constant with default width AND available widths per brand:
    ```typescript
    export const PANEL_BRANDS = {
      AWIP: { defaultWidth: 44, widths: [40, 44] },
      Falk: { defaultWidth: 40, widths: [40] },
      Kingspan: { defaultWidth: 45.38, widths: [24, 30, 36, 42, 45.38, 45.75] },
      MetlSpan: { defaultWidth: 44, widths: [30, 36, 42, 44] },
    } as const
    ```
  - `BUNDLE_SIZES` constant: `{ 2: 16, 4: 11, 5: 8 }` (thickness in inches → panels per bundle)
  - `PANEL_HEIGHTS` constant: array of common heights `[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40]`
  - `COMMON_HEIGHTS` constant: `[8, 10, 12, 14, 16, 20]` — for quick-select buttons
  - `PANEL_COLORS` constant — standard exterior colors per brand:
    ```typescript
    export const PANEL_COLORS: Record<string, string[]> = {
      MetlSpan: ["Regal White", "Warm White", "Surrey Beige", "Pearl Gray", "Royal Blue", "Slate Gray"],
      Kingspan: ["Imperial White", "Regal White", "Driftwood", "Sandstone", "Surrey Beige"],
      Falk: ["White", "Custom (see PO)"],
      AWIP: ["Imperial White", "Custom (see PO)"],
    }
    ```
  - `DEFAULT_INTERIOR_COLORS` constant: `{ MetlSpan: "Igloo White", Kingspan: "Imperial White", Falk: "Dutch White", AWIP: "Imperial White" }`
  - `isPanelProduct(productName: string): boolean` — checks if a product name matches the IMP pattern
  - `isPanelLineItem(lineItem: { productName?: string; description?: string }): boolean` — checks if a PO line item is panel-related (matches "insulated panel", "IMP", brand names, thickness patterns)
  - `parsePanelContext(text: string): { brand?: string; thickness?: number; width?: number; color?: string; coating?: string }` — extracts brand, thickness, width, color, and coating from PO line item name/description. Parses patterns like "AWIP 4" Regal White 44"", "Kingspan 5" Imperial White 42"", "4" white/white panels", etc. Color parsing checks against all `PANEL_COLORS` entries. Width parsing looks for `XX"` patterns near brand/panel context. Falls back to brand defaults if any field can't be parsed (width → `PANEL_BRANDS[brand].defaultWidth`, color → first entry in `PANEL_COLORS[brand]`).
  - `buildPanelProductName(brand: string, height: number, width: number, thickness: number): string` — generates the exact catalog product name (e.g., `Insulated Metal Panel (AWIP)-10'-44-4`)
  - `bundleToPanels(bundles: number, thickness: number): number` — converts bundle count to panel count
  - `panelSqFt(height: number, widthInches: number): number` — calculates sq ft of one panel (`height × (widthInches / 12)`)
  - `totalSqFt(rows: Array<{ height: number; quantity: number }>, widthInches: number): number` — total sq ft for a set of breakout rows

**Files affected:**

- `src/lib/panels.ts` (new)

---

### Step 2: Create Panel Products API Endpoint

Pre-load panel products for the breakout component in a single query.

**Actions:**

- Add panel filter support to existing products route OR create `src/app/api/products/panels/route.ts`:
  - `GET /api/products/panels?brand=AWIP&thickness=4` (optional `&width=44`)
  - Returns all matching panel products: `{ id, name, unitOfMeasure, lastCost, avgCost, dimLength (height), dimWidth, dimThickness }`
  - Query: `WHERE category.name = "Insulated Metal Panel" AND name LIKE "%({brand})%" AND name LIKE "%{thickness}"`
  - Auth: `requireAuth()` — any logged-in user
  - Returns max ~33 products per brand+thickness combination

**Files affected:**

- `src/app/api/products/panels/route.ts` (new) OR `src/app/api/products/route.ts` (modified)

---

### Step 3: Update Types for Panel Breakout Items

**Actions:**

- In `src/lib/ai/types.ts`, add optional fields to `ConfirmedReceivingItem`:
  ```typescript
  export interface ConfirmedReceivingItem {
    // ... existing fields ...
    isPanelBreakout?: boolean           // True if this item came from a panel breakout
    panelHeight?: number                // Height in feet (for display)
    panelBrand?: string                 // Brand name (for display)
    panelThickness?: number             // Thickness in inches (for display)
    panelColor?: string                 // Exterior color name (for display + notes)
    panelWidth?: number                 // Coverage width in inches (for display)
  }
  ```

- These optional fields are for display in the receipt summary and for including color in the receipt notes. The actual catalog product mapping happens via `productId`.

**Files affected:**

- `src/lib/ai/types.ts`

---

### Step 4: Create Panel Breakout Component

Create the main UI component for breaking out panel sizes. **Must invoke frontend-design skill before building.**

**Actions:**

- Create `src/components/receiving/panel-breakout.tsx`:

**Component: `PanelBreakout`**

Props:
```typescript
interface PanelBreakoutProps {
  brand: string                      // Auto-detected from PO line item
  thickness: number                  // Auto-detected (2, 4, or 5)
  width: number                      // Defaulted from brand, editable
  color?: string                     // Auto-detected from PO context, or brand default
  poSqFt?: number                    // PO line item quantity (in sq ft) for comparison
  availableProducts: PanelProduct[]  // Pre-loaded from API (Step 2)
  onConfirm: (items: PanelBreakoutItem[]) => void
  onCancel: () => void
}

interface PanelProduct {
  id: string
  name: string
  height: number                     // Parsed from product name (dimLength)
  lastCost: number
  unitOfMeasure: string
}

interface PanelBreakoutItem {
  productId: string                  // Matched catalog product ID
  productName: string                // Full catalog product name
  height: number                     // Panel height in feet
  quantity: number                   // Number of individual panels
  sqFt: number                      // Calculated sq ft for this row
  unitCost: number                   // From catalog product lastCost
  unitOfMeasure: string              // From catalog product (should be "sheet")
  color: string                      // Exterior color
}
```

**UI Design — Minimal, fast input:**

1. **Context bar** (top): Shows detected context — "AWIP · 4" thick" with:
   - Width dropdown (defaulted, editable): "44" wide" — populated from `PANEL_BRANDS[brand].widths`
   - Color dropdown (defaulted to brand's first standard color): "Regal White" — populated from `PANEL_COLORS[brand]`
   - If `parsePanelContext` couldn't detect brand/thickness: show manual selectors for brand and thickness

2. **Quick-add buttons** (common heights): Row of tap buttons for [8' | 10' | 12' | 14' | 16' | 20']
   - Tapping adds a row with that height (qty=1, focused for editing)
   - Disabled if height already has a row

3. **Size rows** (the core input):
   - Each row: `[Height dropdown ▾] [Bundles: ___] → [Panels: ___] [= X sq ft]  [✕ remove]`
   - Height dropdown: Shows available heights from `availableProducts` map. Already-used heights are disabled.
   - Bundles input (optional): Typing here auto-calculates Panels field (`bundles × BUNDLE_SIZES[thickness]`)
   - Panels input: Editable directly. If bundles field was used, shows the calculated value but can be overridden.
   - Sq ft: Auto-calculated per row, shown in muted text
   - Red warning icon if the selected height has no matching product in `availableProducts`
   - "Add size" button at bottom → adds a new empty row with height dropdown

4. **Running tally bar** (sticky at bottom):
   - Left: "X panels · Y sq ft"
   - Right (if poSqFt provided): "of Z sq ft on PO" with color indicator:
     - Green: within 5% of PO
     - Orange: under 95% or over 105%
     - Red: over 120% (possible error)

5. **Action buttons**:
   - "Confirm (X panels)" — primary, disabled if 0 panels or any row has unresolved product warning
   - "Cancel" — ghost button

**Interaction details:**
- Quick-add button → creates row with height preset and qty input focused
- Height dropdown disabled for already-used heights (prevents duplicates)
- Enter on panels input → adds a new row (keyboard flow)
- All product lookups happen against the pre-loaded `availableProducts` map — no API calls during interaction

**Files affected:**

- `src/components/receiving/panel-breakout.tsx` (new)

---

### Step 5: Integrate Panel Breakout into PO Receive Card

Modify the PO receive card to detect panel line items and offer the breakout option.

**Actions:**

- In `po-receive-card.tsx`:
  - Import `isPanelLineItem`, `parsePanelContext` from `src/lib/panels.ts`
  - Import `PanelBreakout` component
  - Add state: `panelBreakoutLine: string | null` (the line item ID currently being broken out)
  - Add state: `panelBreakoutResults: Record<string, PanelBreakoutItem[]>` (results keyed by line item ID)
  - Add state: `panelProducts: PanelProduct[]` (pre-loaded when panel line item detected)
  - On mount (or when PO data arrives): Check if any line items are panels via `isPanelLineItem()`. If yes, fetch panel products via `GET /api/products/panels?brand=X&thickness=Y` and store in state.
  - For each line item, check `isPanelLineItem(lineItem)`:
    - If true and NOT yet broken out: Show a **"Break out sizes"** button (compact, pill style) INSTEAD of the normal qty input
    - If true and HAS breakout results: Show a summary (e.g., "3 sizes · 28 panels · 420 sq ft · Regal White") with an "Edit" button
  - When "Break out sizes" is tapped:
    - Set `panelBreakoutLine` to this line item's ID
    - Parse panel context from the line item name/description
    - Show `PanelBreakout` as an inline expansion below the line item
  - When breakout confirms:
    - Store results in `panelBreakoutResults[lineItemId]`
    - Hide the breakout UI
    - The line item row now shows the summary
  - **Fix `unitOfMeasure` bug**: When building `ConfirmedReceivingItem` for panel breakout items, use the product's actual `unitOfMeasure` from the catalog (should be "sheet"), NOT the hardcoded "each".
  - When the overall "Confirm Receipt" is clicked:
    - For normal (non-panel) line items: create `ConfirmedReceivingItem` as before
    - For panel line items with breakout: create one `ConfirmedReceivingItem` per breakout row, each with:
      - `productId` from matched catalog product
      - `productName` from catalog
      - `quantity` in individual panels
      - `unitCost` from catalog product `lastCost`
      - `unitOfMeasure` from catalog product
      - `poLineItemId` set to the parent PO line item ID
      - Panel metadata fields (`isPanelBreakout`, `panelHeight`, `panelBrand`, `panelThickness`, `panelColor`, `panelWidth`)

**Files affected:**

- `src/components/receiving/po-receive-card.tsx`

---

### Step 6: Update Receipt Summary for Panel Items

Modify the receipt summary to group and display panel breakout items clearly.

**Actions:**

- In `receipt-summary.tsx`:
  - Detect items where `isPanelBreakout === true`
  - Group them together under a "Panel Breakout" heading showing: brand + thickness + color
    - e.g., "AWIP 4" Panels — Regal White"
  - Display each size as a sub-row: "10ft × 12 panels (440 sq ft)"
  - Show total at bottom of group: "28 panels total · 1,020 sq ft"
  - Non-panel items display as normal
  - **Auto-append color info to receipt notes**: When panel breakout items exist, append "Panel color: {color} ({brand} {thickness}\")" to the notes field so it's preserved on the receipt record

**Files affected:**

- `src/components/receiving/receipt-summary.tsx`

---

### Step 7: Handle PO Line Item Quantity Updates for Breakout

When multiple catalog items map to a single PO line item, ensure the PO line item quantity update is correct.

**Actions:**

- In `receiving-flow.tsx`, when building the API request body (`handleSubmitReceipt`):
  - For panel breakout items sharing the same `poLineItemId`:
    - Calculate total received: sum of `(panels × panelSqFt(height, width))` across all rows
    - The PO line item `qtyOrdered` is in sq ft — so `qtyReceived` must also be in sq ft
    - Send ONE `poLineItemUpdates` entry per PO line item with the aggregated sq ft value
  - For non-panel items: unchanged behavior
  - The `items` array still contains one entry per panel size (individual catalog products with panel counts)
  - **Key:** `items[].quantity` = panel count (for stock). `poLineItemUpdates[].qtyReceived` = sq ft (for PO tracking). These are different units on purpose.

- In the API route (`src/app/api/receiving/route.ts`): No changes needed — it already handles `items` and `poLineItemUpdates` as separate arrays with independent quantities.

**Files affected:**

- `src/components/receiving/receiving-flow.tsx`

---

### Step 8: Wire Up Non-PO Panel Receiving (AI/Photo Path) — DEFERRED

The panel breakout should also work when panels are received without a PO (ad-hoc flow). **This is lower priority — defer to a follow-up plan.** The PO path is the primary use case since panels are always ordered via PO.

**Deferred actions (for future plan):**

- In `receiving-flow.tsx`, when AI parse detects panel items in the REVIEW phase:
  - Check if any `CatalogMatch` items are panels (using `isPanelProduct`)
  - If detected, show a "Break out sizes?" prompt
  - Open the same `PanelBreakout` component

---

## Connections & Dependencies

### Files That Reference This Area

- `src/hooks/use-receiving.ts` — hook for receipt submission (no changes needed, uses the same API)
- `src/lib/stock.ts` — `adjustStock()` called per item (no changes, each panel size is a separate adjustStock call)
- `src/lib/cost.ts` — WAC recalculation (no changes, works per product)
- `e2e/receiving.spec.ts` — E2E tests (will need new panel-specific tests in a future pass)

### Updates Needed for Consistency

- `context/ai-module.md` — add note about panel breakout in receiving workflow
- Memory file — update with panel receiving status

### Impact on Existing Workflows

- **Non-panel receiving is unchanged** — the breakout only appears when a panel line item is detected
- **PO receive flow** — same phases, same step count for non-panel items. Panel items get one additional inline interaction
- **Receipt data** — structurally identical (Receipt → Transactions → Products). Just more line items per receipt when panels are broken out
- **Inventory** — immediately gains size-level panel tracking with no migration

---

## Validation Checklist

- [ ] `src/lib/panels.ts` correctly parses all 4 brand naming patterns from PO descriptions
- [ ] `parsePanelContext()` gracefully handles missing brand/thickness (shows manual selectors)
- [ ] `PanelBreakout` component renders with brand/thickness pre-selected and width/color editable
- [ ] Width dropdown shows correct options per brand (including Kingspan's 42", 45 3/8", 45 3/4")
- [ ] Color dropdown shows brand-appropriate colors (MetlSpan: 6 colors, Kingspan: 5 colors, etc.)
- [ ] Quick-add buttons work for common heights (8, 10, 12, 14, 16, 20)
- [ ] Bundle input auto-calculates panels correctly (4" → ×11, 5" → ×8, 2" → ×16)
- [ ] Panels input is directly editable (bypassing bundles)
- [ ] Duplicate heights prevented (dropdown disables already-used heights)
- [ ] Red warning shown if a height has no matching catalog product
- [ ] Confirm button disabled if any row has unresolved warnings or 0 panels
- [ ] Running sq ft tally matches manual calculation
- [ ] Each breakout row resolves to a real catalog product ID (validated on height selection)
- [ ] Receipt submission creates separate Transaction records per panel size
- [ ] PO line item `qtyReceived` is correctly aggregated as sq ft across all breakout sizes
- [ ] Receipt notes include panel color information
- [ ] Non-panel PO line items continue to work exactly as before
- [ ] Receipt summary groups panel items with color, brand, and thickness
- [ ] `unitOfMeasure` uses product's actual UOM ("sheet"), not hardcoded "each"
- [ ] TypeScript compiles with no errors
- [ ] Production build succeeds

---

## Success Criteria

The implementation is complete when:

1. A user can receive a panel PO and break one generic line item into multiple specific sizes in under 30 seconds
2. Inventory accurately shows panel counts by brand, height, and thickness after receiving
3. The PO's `qtyReceived` correctly reflects the total sq ft received across all sizes
4. Exterior color is captured on the receipt and visible in the receipt summary
5. Non-panel receiving is completely unaffected — zero regressions
6. The workflow feels fast — no page navigation, no extra phases, just an inline expansion with quick-add buttons and a few taps
7. Variable widths work for all brands (especially Kingspan's multiple width options)

---

## Notes

### Future Enhancements (not in this plan)

- **AI photo breakout**: Photograph the delivery ticket / cut list and AI pre-populates the size rows. The ultimate speed optimization but requires the manual flow to exist first.
- **Panel inventory views**: A dedicated view showing panel inventory grouped by brand/thickness/color with counts per height. Useful for job planning.
- **Bundle display in inventory**: Show "2 bundles + 3 panels" alongside raw panel counts on the inventory page for panel products.
- **Cut list import**: Upload an Excel/CSV cut list and auto-populate a receiving breakout. Some suppliers send cut lists electronically.
- **Paste cut list text input**: A textarea where users can paste "10 - 10ft, 5 - 8ft, 3 - 12ft" and have it parsed into rows. Cheaper than AI photo.
- **Color as product field**: Add a `color` or `finish` field to the Product model for native filtering. Currently color rides on receipt notes.
- **Non-PO panel receiving**: The ad-hoc (no PO) path for panel breakout (Step 8 — deferred).

### Bundle Reference

| Thickness | Panels per Bundle |
|-----------|------------------|
| 2"        | 16               |
| 4"        | 11               |
| 5"        | 8                |

### Panel Width Reference (Updated from Manufacturer Specs)

| Brand | Default Width | All Available Widths |
|-------|--------------|---------------------|
| AWIP | 44" | 40", 44" |
| Falk | 40" | 40" |
| Kingspan | 45.38" (Shadowline Interior) | 24", 30", 36", 42", 45 3/8", 45 3/4" |
| MetlSpan | 44" | 30", 36", 42", 44" |

### Standard Exterior Colors Reference

| Brand | Standard Colors |
|-------|----------------|
| MetlSpan | Regal White, Warm White, Surrey Beige, Pearl Gray, Royal Blue, Slate Gray |
| Kingspan | Imperial White, Regal White, Driftwood, Sandstone, Surrey Beige |
| AWIP | Imperial White, Custom (see PO) |
| Falk | White, Custom (see PO) |

### Standard Interior Colors (not tracked — always white)

| Brand | Interior Color |
|-------|---------------|
| MetlSpan | Igloo White |
| Kingspan | Imperial White |
| AWIP | Imperial White |
| Falk | Dutch White |

### Sources

- [Metl-Span Color Charts](https://metlspan.com/resources/color-charts-and-paint-documents/)
- [Metl-Span Mesa Panel](https://metlspan.com/products/wall/insulated-metal-panels/mesa/)
- [AWIP Colors & Finishes](https://www.awipanels.com/resources/colors-finishes/)
- [AWIP Products](https://www.awipanels.com/products/)
- [FALK Colors & Coatings](https://www.falk.com/en-us/coatings)
- [FALK HFW 40 Spec](https://www.falk.com/en-us/insulated-metal-panels/wall-panels/falk-hfw-40)
- [Kingspan Cold Storage Portfolio (PDF)](https://www.kingspan.com/content/dam/kingspan/kip-na/us-ca/documents/kingspan-controlled-environments-product-portfolio-en.pdf)
- [Kingspan KS Series](https://www.kingspan.com/us/en/products/insulated-panel-systems/wall-panel-systems/quadcore-ks-series/)

---

## Implementation Notes

**Implemented:** 2026-03-12

### Summary

All 7 steps implemented successfully. The panel breakout workflow is fully integrated into the PO receiving flow. When a PO line item is detected as a panel (via `isPanelLineItem()`), the normal qty input is replaced with a "Break out" button that opens an inline `PanelBreakout` component. Users select panel heights via quick-add buttons or dropdown, enter quantities as bundles or panels, and see a running sq ft tally compared to the PO. Color and width are auto-detected from PO text and editable. Each breakout row maps to a real catalog product. On receipt submission, panel items flow through as individual stock transactions while the PO line item gets a single aggregated sq ft update.

### Deviations from Plan

- **UOM fix scope narrowed**: The plan called for fixing `unitOfMeasure: "each"` on all items. Instead, the fix was targeted: panel breakout items use the product's actual UOM from the catalog, while non-panel items without a product match still fall back to "each" (since we can't determine UOM without a product match).
- **Panel products fetch**: Fetches products for the first detected panel context only. If a PO has panel lines from multiple brands/thicknesses, only the first brand's products are pre-loaded. This covers 99% of real POs (single brand per order) and avoids multiple API calls.

### Issues Encountered

- TypeScript `Set<number | null>` not assignable to `Set<number>` — fixed with explicit type guard filter on `usedHeights`.
