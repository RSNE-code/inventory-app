# Phased Build Order

## Setup

```bash
npx create-next-app@latest rsne-inventory --typescript --tailwind --app --src-dir
cd rsne-inventory
npm install prisma @prisma/client @supabase/supabase-js @tanstack/react-query lucide-react recharts
npm install ai @ai-sdk/anthropic
npx prisma init
npx shadcn-ui@latest init
```

### Environment Variables
```
DATABASE_URL=                    # Supabase Postgres connection string
DIRECT_URL=                      # Supabase direct (for migrations)
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=       # Server-side only
ANTHROPIC_API_KEY=               # For AI features
```

---

## Phase 1: Foundation (Weeks 1–2)

1. Project scaffolding (Next.js, Tailwind, shadcn/ui, Prisma, Supabase)
2. Database schema — Products, Categories, Suppliers, Users, Jobs, Transactions
3. Auth — Supabase email/password, role-based middleware (all 7 roles)
4. Product catalog CRUD — list, create, edit, search, filter by category, tier designation
5. Manual stock adjustment workflow
6. Dashboard — stock health summary, low-stock alerts, role-based quick actions
7. Mobile layout — bottom nav, responsive cards, brand styling
8. Seed data — categories, sample products, sample jobs

## Phase 2: BOM & Material Flow (Weeks 3–4)

1. Database schema — BOMs, BomLineItems (tier + non-catalog support)
2. LLM-mediated input component (voice + typed + browse → parsed items → confirmation cards)
3. BOM creation with LLM input, templates, non-catalog items, assemblies (WF2)
4. BOM approval with creator attribution and role-based views
5. Material checkout — full BOM display, tier-aware stock deduction (WF3)
6. Additional pickup with optional backdate (WF4)
7. Material return — Full/Partial/Scrap (WF5)
8. Material receiving with PO pre-fill and LLM PO suggestion (WF1)
9. Transaction history with filters
10. In-app notification system (badge + drawer)

## Phase 3: Fabrication & Finished Goods (Weeks 5–6)

1. Database schema — AssemblyTemplates, Assemblies, Components, ChangeLog
2. Assembly template management (CRUD, save-custom-as-template)
3. Door fabrication — OM setup → SM approval → Door Shop Queue (WF6)
4. Digital door sheet with mid-build change tracking (who, what, when)
5. Door Shop Queue (OM priority, Door Shop executes)
6. Panel/floor batch production — template OR custom assembly paths (WF7)
7. LLM-assisted component suggestions for custom assemblies
8. Fabrication Queue (Foreman priority)
9. Finished goods inventory view (In Stock / Allocated / Shipped)
10. Finished goods allocation and shipment (WF8)

## Phase 4: Intelligence & Reporting (Weeks 7–8)

1. Inventory valuation report (WAC by category)
2. Job costing export (CSV — all tiers + non-catalog + finished goods)
3. Usage trend analytics (charts by product and category)
4. Three-layer demand forecasting — firm + projected + historical (WF9)
5. Reorder report with urgency ranking + LLM reasoning layer
6. Material planner — projected demand input + scenario planning
7. Cycle count with system suggestions + variance tracking (WF10)
8. Dashboard KPIs (inventory turns, spend by category, stock accuracy)
9. AI natural language search
10. Anomaly detection on stock movements

---

## Testing Strategy

1. **TypeScript strict mode** — catches most errors at build time
2. **Prisma `$transaction`** — all stock-changing operations are atomic
3. **Zod validation** — all API inputs validated with clear error messages
4. **Seed data** — comprehensive dev/test data
5. **Error boundaries** — React error boundary on every page
6. **Structured logging** — console.error with full context on API failures
7. **Build checks** — `npm run build` must pass with zero errors before deploy

## Module Extension Pattern

New modules (barcode, OCR, supplier portal):
1. `src/app/[module]/` — pages
2. `src/api/[module]/` — API routes
3. `src/components/[module]/` — components
4. Prisma migration for new tables
5. Conditional nav items (feature flags)
6. Connects via established API — never bypasses transaction system
