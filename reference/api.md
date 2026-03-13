# API Endpoints

RESTful routes under `/api/`. All require authentication. Role-based access enforced at route level. Use Zod for input validation.

## Inventory
```
GET    /api/inventory                     # List products (filters, search, pagination, tier)
POST   /api/inventory                     # Create product
GET    /api/inventory/[id]                # Detail + recent transactions
PUT    /api/inventory/[id]                # Update product
POST   /api/inventory/[id]/adjust         # Manual stock adjustment
```

## BOMs
```
GET    /api/boms                          # List (filter: status, job, creator)
POST   /api/boms                          # Create (supports non-catalog + tiered items)
GET    /api/boms/[id]                     # Detail with all line items (all tiers)
PUT    /api/boms/[id]                     # Update (add/remove items, status)
POST   /api/boms/[id]/approve             # Approve BOM
POST   /api/boms/[id]/checkout            # Execute checkout (Tier 1 → stock, Tier 2 → cost only)
POST   /api/boms/[id]/pickup              # Additional pickup (optional backdate)
POST   /api/boms/[id]/return              # Returns (full/partial/scrap per item)
GET    /api/boms/templates                  # List BOM templates
POST   /api/boms/templates                  # Create BOM template (or save existing BOM as template)
GET    /api/boms/templates/[id]             # Template detail with line items
PUT    /api/boms/templates/[id]             # Update template
DELETE /api/boms/templates/[id]             # Deactivate template (soft delete)
```

## Assemblies
```
GET    /api/assemblies                    # List (filter: type, status, queue)
GET    /api/assemblies/templates          # List templates
POST   /api/assemblies/templates          # Create template (incl. save-custom-as-template)
PUT    /api/assemblies/templates/[id]     # Update template
POST   /api/assemblies                    # Create assembly (template OR custom)
PUT    /api/assemblies/[id]               # Update (status, specs, components)
POST   /api/assemblies/[id]/submit-approval  # Submit door sheet for SM approval
POST   /api/assemblies/[id]/approve       # SM approves door
POST   /api/assemblies/[id]/reject        # SM rejects (with comments)
POST   /api/assemblies/[id]/start         # Start production → IN_PRODUCTION, deducts materials
POST   /api/assemblies/[id]/complete      # Complete → finished goods
POST   /api/assemblies/[id]/ship          # Ship to job
POST   /api/assemblies/[id]/change-spec   # Mid-build spec change (change log entry)
```

## Queues
```
GET    /api/queues/doors                  # Door Shop Queue (priority order)
GET    /api/queues/fabrication             # Fabrication Queue (priority order)
PUT    /api/queues/doors/reorder          # Reorder priority (Office Manager)
PUT    /api/queues/fabrication/reorder     # Reorder priority (Shop Foreman)
```

## Receiving
```
GET    /api/receiving/suppliers           # List suppliers (sorted by most recent, searchable)
GET    /api/receiving/purchase-orders     # Open POs for a supplier
POST   /api/receiving                     # Log receipt (with or without PO)
```

## Transactions
```
GET    /api/transactions                  # History (filter: product, job, type, date range)
```

## Cycle Counts
```
GET    /api/cycle-counts/suggestions      # System-suggested items to count
POST   /api/cycle-counts                  # Submit count result
GET    /api/cycle-counts/history          # Variance history over time
```

## Reports
```
GET    /api/reports/valuation             # Inventory valuation (WAC by category)
GET    /api/reports/job-costing/[jobId]   # Material usage by job (all tiers)
GET    /api/reports/usage-trends          # Usage analytics
GET    /api/reports/reorder               # Items needing reorder (three-layer demand)
GET    /api/reports/forecast              # Demand forecast (all layers)
```

## Material Planner (Phase 4)
```
GET    /api/planner/projected-jobs        # List projected jobs
POST   /api/planner/projected-jobs        # Add projected job with material estimates
PUT    /api/planner/projected-jobs/[id]   # Update
DELETE /api/planner/projected-jobs/[id]   # Remove (mark inactive)
GET    /api/planner/scenario              # "If all projected jobs land, what runs short?"
```

## Notifications
```
GET    /api/notifications                 # List for current user (filter: unread)
PUT    /api/notifications/[id]/read       # Mark as read
POST   /api/notifications/read-all        # Mark all as read
```

## Jobs
```
GET    /api/jobs                          # Active jobs (for pre-populated dropdowns)
POST   /api/jobs                          # Add job manually
PUT    /api/jobs/[id]                     # Update status
```

## AI (LLM-Powered)
```
POST   /api/ai/parse-input               # Parse voice/text → structured line items (BOM, checkout, pickup)
POST   /api/ai/search                    # Natural language inventory search
POST   /api/ai/suggest-components        # Suggest assembly components for custom builds
POST   /api/ai/suggest-po                # Suggest most likely PO for receiving
POST   /api/ai/reorder-reasoning         # LLM-generated reorder explanations
POST   /api/ai/analyze                   # Anomaly detection on stock movements
```

## Users
```
GET    /api/users                         # List users
POST   /api/users                         # Create user
PUT    /api/users/[id]                    # Update (role, status)
```

## Notification Triggers

Created server-side by relevant API endpoints (not cron jobs):

| Event | Notifies | Type |
|-------|----------|------|
| Product drops below reorder point | Admin, OM | LOW_STOCK |
| BOM submitted/approved | Foreman, OM | BOM_SUBMITTED |
| BOM job start tomorrow | Foreman | BOM_READY |
| Door sheet submitted for approval | SM | DOOR_AWAITING_APPROVAL |
| SM approves door | OM, Door Shop | DOOR_APPROVED |
| SM rejects door | OM | DOOR_REJECTED |
| Assembly completed | OM, Admin | ASSEMBLY_COMPLETED |
| Forecast: stockout within lead time | Admin, OM | REORDER_NEEDED |
| Product not counted in 30+ days | Foreman, Admin | CYCLE_COUNT_DUE |
| Non-catalog items on BOM need sourcing | OM | NEEDS_SOURCING |
