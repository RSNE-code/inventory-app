# Plan: Phase 2A — Digital BOM Creation + Material Receiving

**Created:** 2026-03-06
**Status:** Implemented
**Request:** Implement digital BOM creation and material receiving workflows (Phase 2, first half)

---

## Overview

### What This Plan Accomplishes

Builds two core workflows: (1) creating digital Bills of Materials tied to jobs, with line items from the product catalog, and (2) logging material receipts from suppliers. After this, Gabe can create BOMs for jobs in the app and log incoming deliveries — stock levels and costs update automatically.

### Why This Matters

These two workflows are the foundation of Phase 2. BOMs replace the paper material lists and receiving replaces manual stock adjustments for incoming material. Together they enable real-time inventory tracking: material comes in via receiving, goes out via BOM checkout (next plan). WAC recalculates automatically on every receipt.

---

## Current State

### Relevant Existing Structure

- `src/lib/stock.ts` — Atomic stock transaction system (supports RECEIVE, CHECKOUT, etc.)
- `src/lib/cost.ts` — WAC calculation (triggered on RECEIVE)
- `src/lib/auth.ts` — `requireAuth()`, `requireRole()` helpers
- `src/app/api/inventory/` — Existing API pattern (Zod + auth + error handling)
- `src/hooks/use-products.ts` — React Query hook pattern
- `src/components/inventory/product-form.tsx` — Form pattern
- `src/components/layout/bottom-nav.tsx` — Already has BOMs tab (links to `/boms`)
- `prisma/schema.prisma` — All required models exist (Bom, BomLineItem, Receipt, Supplier)
- `prisma/seed.ts` — 25 suppliers already seeded

### Gaps Being Addressed

- No BOM management exists — can't create, view, or manage BOMs digitally
- No receiving workflow — incoming material requires manual stock adjustments
- BOMs tab in bottom nav currently has no destination page
- No supplier selection UI

---

## Proposed Changes

### Summary of Changes

- Create BOM list page, BOM creation page, and BOM detail page
- Create receiving workflow page
- Build 4 new API routes for BOM CRUD, receiving, and supplier listing
- Build React Query hooks for BOMs, receiving, and suppliers
- Build reusable components: BOM line item editor, supplier selector, product picker, receipt form
- Wire up `adjustStock()` with RECEIVE type for incoming material

### New Files to Create

| File Path | Purpose |
| --- | --- |
| **API Routes** | |
| `src/app/api/boms/route.ts` | GET (list) + POST (create) BOMs |
| `src/app/api/boms/[id]/route.ts` | GET (detail) + PUT (update/status change) BOM |
| `src/app/api/receiving/route.ts` | POST receipt (log incoming material) |
| `src/app/api/suppliers/route.ts` | GET suppliers list |
| **Pages** | |
| `src/app/boms/page.tsx` | BOM list — filter by status, search by job name |
| `src/app/boms/new/page.tsx` | Create new BOM — select job, add line items |
| `src/app/boms/[id]/page.tsx` | BOM detail — view line items, edit, change status |
| `src/app/receiving/page.tsx` | Receiving workflow — select supplier, add items, enter qty + cost |
| **Components** | |
| `src/components/bom/bom-card.tsx` | BOM summary card (job name, status, item count, date) |
| `src/components/bom/bom-line-item-row.tsx` | Editable line item row (product, qty, unit, tier badge) |
| `src/components/bom/bom-status-badge.tsx` | Color-coded BOM status badge (Draft/Approved/etc.) |
| `src/components/bom/product-picker.tsx` | Search + select product from catalog (reusable) |
| `src/components/receiving/receipt-line-row.tsx` | Row for receiving: product, qty received, unit cost |
| `src/components/receiving/supplier-picker.tsx` | Search + select supplier |
| **Hooks** | |
| `src/hooks/use-boms.ts` | React Query hooks for BOM operations |
| `src/hooks/use-receiving.ts` | React Query hooks for receiving + suppliers |

### Files to Modify

| File Path | Changes |
| --- | --- |
| `src/components/layout/bottom-nav.tsx` | Verify BOMs tab link points to `/boms` |
| `src/app/settings/page.tsx` | Add navigation link to Receiving |
| `src/types/index.ts` | Add BOM, Receipt, and Supplier types |
| `src/components/dashboard/quick-actions.tsx` | Add "Receive Material" quick action |
| `src/app/api/dashboard/route.ts` | Add active BOM count to dashboard data |
| `src/app/page.tsx` | Show active BOM count on dashboard |
| `CLAUDE.md` | Update project status section |

---

## Design Decisions

### Key Decisions Made

1. **No LLM integration yet**: The PRD calls for LLM-mediated BOM input (voice/text parsing). That adds significant complexity. This plan implements manual BOM creation (search catalog + add items). LLM input can be layered on top in a follow-up without changing the data model or APIs.

2. **No PO creation in this app**: Purchase orders are created in Knowify. PO data integration (importing POs from Knowify) will be handled in a separate plan. For now, receiving is ad-hoc: select a supplier, add items, enter quantities and costs.

3. **BOM creation starts from job selection**: User picks an existing job (or creates one inline), then adds line items. This matches the real workflow — you always know what job the material is for.

4. **Non-catalog items supported but simplified**: BOM line items can include non-catalog items (name, category, unit, estimated cost) for materials not yet in the system. These are tracked for costing but don't affect inventory quantities (like Tier 2).

5. **BOM status flow: DRAFT → APPROVED → IN_PROGRESS → COMPLETED**: Draft BOMs can be edited freely. Approved BOMs are ready for checkout. IN_PROGRESS means some items have been checked out. COMPLETED means the job is done.

6. **Product picker is a reusable component**: The same search-and-select-product component is used in BOM creation and receiving. Avoids duplication.

7. **Receiving is always ad-hoc for now**: Select supplier, add items from catalog, enter qty and unit cost. No PO matching until Knowify integration is built.

### Alternatives Considered

- **Starting with LLM-powered BOM entry**: Rejected for now — adds AI SDK complexity, prompt engineering, and error handling before the basic workflow is proven. Manual entry first, LLM input later.
- **Building PO creation in this app**: Rejected — Gabe confirmed POs are created in Knowify. Building duplicate PO management adds complexity with no value. Future plan will handle importing PO data from Knowify.

### Open Questions

1. **Should BOM approval require a specific role?** Plan assumes: ADMIN, OPERATIONS_MANAGER, OFFICE_MANAGER can approve. Gabe can adjust.

---

## Step-by-Step Tasks

### Step 1: Add Types

Add TypeScript types for BOM, Receipt, and Supplier to the shared types file.

**Actions:**
- Add `BomWithDetails`, `BomLineItemWithProduct`, `ReceiptWithDetails`, `SupplierBasic` types
- These mirror the Prisma models but with included relations (e.g., BomLineItem includes Product)

**Files affected:**
- `src/types/index.ts`

---

### Step 2: Create Suppliers API

Simple GET endpoint for listing suppliers (used by receiving).

**Actions:**
- GET `/api/suppliers` — returns all active suppliers, sorted alphabetically
- Supports `?search=` query param for filtering by name
- Requires auth (any role)

**Files affected:**
- `src/app/api/suppliers/route.ts` (new)

---

### Step 3: Create Receiving API

The core receiving endpoint that logs material receipts and updates stock/WAC.

**Actions:**
- `POST /api/receiving` — Log a receipt. Body: `{ supplierId, notes?, items: [{ productId, quantity, unitCost }] }`
- For each item:
  - Call `adjustStock()` with type `RECEIVE`, passing `unitCost` (triggers WAC recalculation)
  - Link transaction to the created Receipt record
- Creates a `Receipt` record linking to supplier
- Roles: ADMIN, OPERATIONS_MANAGER, OFFICE_MANAGER, SHOP_FOREMAN
- Also add `GET /api/receiving` to list recent receipts (for dashboard/history)

**Key logic:**
```typescript
// Wrap everything in a Prisma transaction for atomicity
return prisma.$transaction(async (tx) => {
  // Create the receipt record
  const receipt = await tx.receipt.create({
    data: { supplierId: input.supplierId, notes: input.notes },
  })

  // For each item: call adjustStock to update qty + WAC
  for (const item of input.items) {
    await adjustStock({
      productId: item.productId,
      quantity: item.quantity,
      type: "RECEIVE",
      userId: user.id,
      unitCost: item.unitCost,
      receiptId: receipt.id,
    })
  }

  return receipt
})
```

**Files affected:**
- `src/app/api/receiving/route.ts` (new)

---

### Step 4: Create BOMs API

CRUD endpoints for Bills of Materials.

**Actions:**
- `GET /api/boms` — List BOMs with filters (status, search by job name). Include line item count, job info. Paginated. Any auth'd user.
- `POST /api/boms` — Create BOM. Body: `{ jobName, jobNumber?, jobStartDate?, notes?, lineItems: [{ productId?, tier, qtyNeeded, isNonCatalog?, nonCatalogName?, nonCatalogCategory?, nonCatalogUom?, nonCatalogEstCost? }] }`. Roles: ADMIN, OPERATIONS_MANAGER, OFFICE_MANAGER, SALES_MANAGER.
- `GET /api/boms/[id]` — BOM detail with all line items (include product details). Any auth'd user.
- `PUT /api/boms/[id]` — Update BOM (edit line items, change status, add/remove items). Status transitions: DRAFT→APPROVED (requires approval role), APPROVED→IN_PROGRESS (auto on first checkout), IN_PROGRESS→COMPLETED.

**Zod schemas:**
```typescript
const bomLineItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  tier: z.enum(["TIER_1", "TIER_2"]).default("TIER_1"),
  qtyNeeded: z.number().positive(),
  isNonCatalog: z.boolean().default(false),
  nonCatalogName: z.string().optional().nullable(),
  nonCatalogCategory: z.string().optional().nullable(),
  nonCatalogUom: z.string().optional().nullable(),
  nonCatalogEstCost: z.number().optional().nullable(),
})

const createBomSchema = z.object({
  jobName: z.string().min(1),
  jobNumber: z.string().optional().nullable(),
  jobStartDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  lineItems: z.array(bomLineItemSchema).min(1),
})
```

**Files affected:**
- `src/app/api/boms/route.ts` (new)
- `src/app/api/boms/[id]/route.ts` (new)

---

### Step 5: Create React Query Hooks

Build hooks for all new API operations following existing patterns.

**Actions:**
- `use-boms.ts`:
  - `useBoms(filters)` — list BOMs with status/search filters
  - `useBom(id)` — single BOM detail
  - `useCreateBom()` — mutation, invalidates `["boms"]`
  - `useUpdateBom()` — mutation, invalidates `["boms"]` and `["bom", id]`
- `use-receiving.ts`:
  - `useSuppliers(search?)` — list suppliers
  - `useCreateReceipt()` — mutation, invalidates `["products"]`, `["dashboard"]`

**Files affected:**
- `src/hooks/use-boms.ts` (new)
- `src/hooks/use-receiving.ts` (new)

---

### Step 6: Build Reusable Components

Create shared components used across BOM and receiving pages.

**Actions:**

**Product Picker (`components/bom/product-picker.tsx`):**
- Search input that filters products by name/SKU
- Dropdown list of matching products showing name, SKU, current qty, unit
- On select: returns product object
- Used in: BOM builder, receiving form

**Supplier Picker (`components/receiving/supplier-picker.tsx`):**
- Search input that filters suppliers by name
- Dropdown list of matching suppliers
- On select: returns supplier object
- Used in: receiving page

**BOM Status Badge (`components/bom/bom-status-badge.tsx`):**
- Color-coded badge for BOM status
- DRAFT = gray, APPROVED = blue, IN_PROGRESS = yellow, COMPLETED = green, CANCELLED = red

**BOM Card (`components/bom/bom-card.tsx`):**
- Card showing: job name, job number, status badge, line item count, created date, creator name
- Tappable — links to BOM detail page

**BOM Line Item Row (`components/bom/bom-line-item-row.tsx`):**
- Shows: product name (or non-catalog name), qty needed, unit, tier badge
- Edit mode: editable qty, remove button
- Read mode: static display with checked-out/returned quantities

**Receipt Line Row (`components/receiving/receipt-line-row.tsx`):**
- Editable row: product (via product picker), quantity, unit cost
- Add/remove rows dynamically

**Files affected:**
- All component files listed in "New Files to Create"

---

### Step 7: Build BOM Pages

Create the BOM list, creation, and detail pages.

**Actions:**

**BOM List Page (`/boms`):**
- "use client" — has search, filter, state
- Header: "Bills of Materials"
- Search bar (by job name/number)
- Status filter tabs: All | Draft | Approved | In Progress | Completed
- List of BomCards
- Floating "+" button → navigate to `/boms/new`
- Empty state when no BOMs exist

**BOM Creation Page (`/boms/new`):**
- "use client" — full form
- Header: "New BOM" with back button
- Job section: job name input (required), job number input (optional), job start date (optional)
- Line items section:
  - "Add Item" button opens product picker
  - Each added item shows as a BomLineItemRow (editable qty, remove button)
  - "Add Non-Catalog Item" button shows inline form (name, category, unit, estimated cost)
  - Running count of items added
- Notes textarea (optional)
- "Create BOM" primary button at bottom
- On success: navigate to BOM detail page, show toast

**BOM Detail Page (`/boms/[id]`):**
- Header: job name + status badge
- Job info section: job number, start date, created by, created date
- Line items list (BomLineItemRows in read mode)
  - Show product name, qty needed, unit, tier
  - For non-catalog: show non-catalog name + category
- Action buttons based on status:
  - DRAFT: "Edit" button, "Approve" button (if authorized), "Cancel" button
  - APPROVED: "Start Checkout" button (links to future checkout page)
  - IN_PROGRESS: Shows qty checked out / qty needed per item
  - COMPLETED: Read-only view
- Notes section

**Files affected:**
- `src/app/boms/page.tsx` (new)
- `src/app/boms/new/page.tsx` (new)
- `src/app/boms/[id]/page.tsx` (new)

---

### Step 8: Build Receiving Page

Create the receiving workflow page.

**Actions:**

**Receiving Page (`/receiving`):**
- "use client"
- Header: "Receive Material"
- Step 1: Select supplier (supplier picker)
- Step 2: Add items (product picker, one at a time)
  - For each item: enter quantity received and unit cost
  - Shows list of items added so far (receipt-line-rows)
  - Can remove items
- Step 3: Review summary (total items, total cost)
- Notes textarea (optional)
- "Confirm Receipt" primary button
- On success: toast with summary ("Received 5 items from Pierce Aluminum"), option to receive more or go to dashboard
- Each confirmed receipt:
  - Creates Receipt record
  - Calls `adjustStock()` per item with type RECEIVE (updates qty + WAC)

**Files affected:**
- `src/app/receiving/page.tsx` (new)

---

### Step 9: Update Navigation and Dashboard

Add receiving links and BOM activity to the app.

**Actions:**
- Verify bottom nav BOMs tab points to `/boms`
- Add "Receive Material" to settings/more page
- Add "Receive Material" quick action to dashboard
- Add active BOM count to dashboard API and display
- Add recent receipts to dashboard

**Files affected:**
- `src/components/layout/bottom-nav.tsx` (verify)
- `src/app/settings/page.tsx` (add links)
- `src/components/dashboard/quick-actions.tsx` (add receiving action)
- `src/app/api/dashboard/route.ts` (add BOM counts)
- `src/app/page.tsx` (show BOM/receiving info)

---

### Step 10: Build, Sync, and Deploy

Build locally, sync to GitHub, push for Vercel deployment.

**Actions:**
- Run `npm run build` in `rsne-inventory/` to verify TypeScript compiles
- Sync all new and modified files to `/Users/gabeperez/Documents/GitHub/inventory-app/`
- Commit with descriptive message
- Push to trigger Vercel deployment
- Verify deployment succeeds

**Files affected:**
- All new and modified files synced to GitHub repo

---

### Step 11: Validate

Test all workflows on the deployed app.

**Actions:**
- Receive material from a supplier — verify stock qty and WAC update on product detail page
- Create a BOM for a job with catalog items
- Create a BOM with a non-catalog item
- Approve a BOM
- Verify dashboard shows active BOM count
- Verify receiving quick action works
- Test all pages on mobile viewport

**Files affected:**
- None (testing only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/layout/bottom-nav.tsx` — BOMs tab already exists
- `src/app/page.tsx` — Dashboard will show BOM/receiving data
- `src/lib/stock.ts` — Receiving calls `adjustStock()` with RECEIVE type
- `src/lib/cost.ts` — WAC recalculation triggered by RECEIVE transactions

### Updates Needed for Consistency

- `CLAUDE.md` — Update project status to reflect Phase 2A completion
- Memory file — Update status

### Impact on Existing Workflows

- Dashboard gets richer with BOM and receiving data
- Stock adjustments now also happen via receiving (not just manual adjustments)
- Product detail page could show receiving history (future enhancement)

---

## Validation Checklist

- [ ] BOM list page loads and shows BOMs filtered by status
- [ ] New BOM can be created with job name + line items from catalog
- [ ] Non-catalog items can be added to a BOM
- [ ] BOM can be approved by authorized user
- [ ] Material can be received (ad-hoc) — stock qty updates correctly
- [ ] WAC recalculates correctly on receipt
- [ ] Dashboard shows active BOM count
- [ ] Receiving quick action works from dashboard
- [ ] All pages work on mobile viewport
- [ ] Navigation links work (BOMs tab, receiving from settings/more)
- [ ] TypeScript compiles clean (`npm run build` passes)
- [ ] Deployed successfully to Vercel

---

## Success Criteria

The implementation is complete when:

1. A user can create a digital BOM for a job, add products from the catalog (and non-catalog items), and approve it
2. A user can receive incoming material from a supplier and stock levels + WAC update automatically
3. The dashboard reflects BOM and receiving activity
4. All pages are mobile-friendly and follow existing design patterns
5. The app builds and deploys to Vercel without errors

---

## Notes

- **PO creation stays in Knowify.** A separate data integration plan will handle importing PO data from Knowify into this app. The PO schema models exist and are ready for when that integration is built — receiving can be enhanced to match against imported POs at that point.
- **LLM-powered BOM input** (voice/text parsing into structured line items) is deliberately deferred. The manual catalog-search approach works first, and LLM input can be layered on top of the same APIs and data model without changes.
- **Material Checkout and Returns** (the other half of Phase 2) will be planned separately after this is complete. The BOM data model supports it — checkout just needs a new API endpoint and page that reads the approved BOM and calls `adjustStock()` with CHECKOUT type.
- **BOM Templates** are also deferred to a follow-up. The schema supports them, and they're essentially pre-filled BOM creation — easy to add once basic BOM creation works.
- The receiving workflow intentionally keeps things simple: no barcode scanning, no photo capture, no PO matching. Those are future enhancements.
