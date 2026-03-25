# Business Logic

## Weighted Average Cost (WAC)

On every RECEIVE transaction:
```
new WAC = ((existing qty × existing WAC) + (received qty × purchase cost)) / (existing qty + received qty)
```
If existing qty ≤ 0, new WAC = purchase cost. Stored on Product, updated atomically with qty in a Prisma `$transaction`. Never recalculated retroactively.

## Atomic Stock Updates (`lib/stock.ts`)

ALL stock changes go through the transaction system. Never update `currentQty` directly:
1. Read current qty (with row lock)
2. Calculate new qty
3. Create Transaction record (`previousQty`, `newQty`)
4. Update Product `currentQty`
5. All in a single Prisma `$transaction`

**Tier-aware:**
- **Tier 1:** CHECKOUT, RETURN, CONSUME, PRODUCE, ADJUST all affect `currentQty`
- **Tier 2:** CHECKOUT creates a Transaction for job costing but does NOT change `currentQty`

## BOM Scope vs. Inventory Scope

A BOM captures everything a job needs. Inventory tracks only Tier 1.

| Context | Tier 1 | Tier 2 / Non-Catalog |
|---------|--------|---------------------|
| BOM Builder (WF2) | ✅ Accepted | ✅ Accepted (no restrictions) |
| Checkout (WF3) | Deducts from stock | Logged for job costing only |
| Job Costing | Included in cost report | Included in cost report |
| Reorder Alerts | Triggers alerts | Does NOT trigger alerts |

## Assembly Cost

When assembly completed:
```
assembly.cost = SUM(component.qtyUsed × product.avgCost)
```
Batch: `cost per unit = total batch cost / batchSize`

## Bulk Consumable Auto-Deduction

Assembly templates carry `qtyPerUnit` per component. On "Complete Build":
1. Read template component rates
2. Multiply by `batchSize`
3. Create CONSUME transactions per component
4. Deduct from `currentQty`

Builder can override if non-standard build used more/less. Exception, not rule.

## Return Logic (WF5)

Same logic for ALL materials — no special cases:

| Condition | Stock | Cost |
|-----------|-------|------|
| **Full** | Returns to stock at same SKU | Cost credited back from job |
| **Partial** | Reduced qty returns at same SKU | Proportional cost credited |
| **Scrap** | No stock increase | Full cost stays on job |

## Door Approval Flow (WF6)

```
OM creates door sheet (PLANNED)
  → Submits (AWAITING_APPROVAL)
    → SM reviews:
      → APPROVED → Door Shop Queue (APPROVED status)
      → REJECTED → Back to OM with comments (PLANNED)
```
Door cannot enter queue without SM approval. This prevents building doors to wrong spec.

## Queue Management

**Door Shop Queue:**
- Only APPROVED doors
- Priority: Office Manager (drag-to-reorder)
- Door Shop works top to bottom
- States: Not Started → In Progress → Complete

**Fabrication Queue:**
- Panels, floors, non-door assemblies
- Priority: Shop Foreman
- States: Not Started → In Progress → Complete

Both capture `startedAt` + `completedAt` timestamps from day one (Phase 2 feature dependency).

## Three-Layer Demand Forecasting (`lib/forecast.ts`)

```typescript
interface DemandAnalysis {
  productId: string;
  currentQty: number;
  reorderPoint: number;

  // Layer 1: Firm
  firmBomDemand: number;       // Unfulfilled BOM line items (APPROVED + IN_PROGRESS, Tier 1 only)
  firmQueueDemand: number;     // Components for queued assemblies (APPROVED + IN_PRODUCTION)
  totalFirmDemand: number;

  // Layer 2: Projected (Phase 4)
  projectedDemand: number;     // From ProjectedMaterial for active ProjectedJobs

  // Layer 3: Historical
  avgDailyUsage: number;       // Last 90 days of CHECKOUT + CONSUME + ADDITIONAL_PICKUP
  historicalProjection30d: number;

  // Analysis
  totalDemand: number;
  netAvailable: number;        // currentQty - totalFirmDemand
  daysUntilStockout: number;   // netAvailable / avgDailyUsage
  leadTimeDays: number;
  reorderByDate: Date | null;  // stockoutDate - leadTimeDays
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';
}
```

**Urgency rules:**
- CRITICAL: daysUntilStockout ≤ 0
- HIGH: reorderByDate is today or past
- MEDIUM: reorderByDate within 7 days
- LOW: below reorderPoint but no projected stockout
- OK: sufficient for all known demand

**Key rule:** Queue demand is treated as FIRM. Rare for items to leave the queue once approved.

## Cycle Count Suggestion Algorithm

```typescript
function suggestCountItems(maxItems: number = 10): Product[] {
  // Tier 1 only
  // score = (daysSinceLastCount * 2) + (txnVolume30d * 1.5) + (valueOnHand * 0.5)
  // Return top N by score, rotating categories
}
```

**Anti-anchoring:** Show system qty AFTER user enters their count, not before.

## Job Costing Export

Aggregates ALL materials for a job (Tier 1 + Tier 2 + non-catalog + finished goods shipped):

CSV columns: `Job Name, Job Number, Product, Category, Tier, Qty Sent, Qty Returned, Qty Consumed, Unit Cost, Total Cost`

Includes both raw materials (from checkout/return transactions) and fabricated goods (from assembly shipments).

## Job-Site-Direct Materials

Materials shipped directly to job sites are handled by PO/billing (Knowify/QBO) — out of scope. When leftover material comes back to the shop, it enters inventory via standard Receiving (WF1) with job name attached for traceability.
