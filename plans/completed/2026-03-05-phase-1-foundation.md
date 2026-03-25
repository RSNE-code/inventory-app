# Plan: Phase 1 Foundation — Project Setup, Schema, Auth, Product Catalog & Dashboard

**Created:** 2026-03-05
**Status:** Implemented
**Request:** Plan the full Phase 1 foundation for the RSNE Inventory Management App

---

## Overview

### What This Plan Accomplishes

Sets up the entire Next.js project from scratch with Supabase, Prisma, Tailwind/shadcn, and the RSNE design system. Implements the complete database schema (all 27 models), authentication with role-based access, the product catalog CRUD, manual stock adjustment, a stock health dashboard with low-stock alerts, mobile-first layout with bottom nav, and seed data. By the end, the app is deployed to Vercel and usable on a phone.

### Why This Matters

This is the foundation everything else builds on. Without a running app with auth, products, and stock tracking, no BOM workflows, assembly tracking, or reporting can happen. Phase 1 delivers immediate value: Gabe can load the material catalog, see real-time stock levels on his phone, and get low-stock alerts — replacing the guesswork of monthly physical counts.

---

## Current State

### Relevant Existing Structure

- `reference/schema.md` — Complete Prisma schema (27 models, 13 enums, 11 seed categories)
- `reference/api.md` — REST endpoints for inventory CRUD, users, jobs
- `reference/business-logic.md` — WAC calculation, atomic stock operations, tier-aware logic
- `reference/design-system.md` — Brand colors, typography, layout rules, project structure, component conventions
- `reference/build-order.md` — Setup commands, Phase 1 scope, testing strategy
- `reference/llm-architecture.md` — LLM integration patterns (Phase 2+, but architecture established now)
- `reference/TRD-vs-PRD-AUDIT.md` — Confirms schema completeness (BomTemplate gap resolved)
- `context/1_Project Goals.md` — Tech stack, non-negotiable rules, quick reference

### Gaps or Problems Being Addressed

- No application code exists — the entire project needs to be scaffolded
- No database is connected — schema needs to be applied to Supabase
- No auth system — users can't log in or have role-based access
- No product management — can't view or manage inventory
- No stock tracking — no transaction system for adjustments
- No dashboard — no visibility into stock health
- No mobile layout — no way to use the app on the shop floor

---

## Proposed Changes

### Summary of Changes

- Scaffold Next.js 14+ project with TypeScript, Tailwind, App Router, src directory
- Install all dependencies (Prisma, Supabase, React Query, shadcn/ui, Recharts, Lucide, AI SDK)
- Configure Tailwind with RSNE brand colors, typography, and design tokens
- Initialize and customize shadcn/ui components
- Set up Prisma with the complete 27-model schema
- Configure Supabase auth with email/password login
- Build role-based auth middleware
- Create product catalog pages (list, create, edit, detail)
- Implement `lib/stock.ts` atomic transaction system
- Build manual stock adjustment workflow
- Create dashboard with stock health summary, low-stock alerts, role-based quick actions
- Build mobile-first layout with bottom navigation bar
- Create seed data script (categories, sample products, sample jobs, test users)
- Set up environment variable templates
- Configure for Vercel deployment

### New Files to Create

The app will be created in a new directory `rsne-inventory/` at the workspace root.

| File Path | Purpose |
| --- | --- |
| `rsne-inventory/` | Next.js project root (created by create-next-app) |
| `rsne-inventory/.env.local.example` | Environment variable template |
| `rsne-inventory/prisma/schema.prisma` | Complete database schema (27 models) |
| `rsne-inventory/prisma/seed.ts` | Seed data: categories, products, jobs, users |
| `rsne-inventory/src/lib/db.ts` | Prisma client singleton |
| `rsne-inventory/src/lib/auth.ts` | Supabase auth helpers + role check utilities |
| `rsne-inventory/src/lib/stock.ts` | Atomic stock operations (the core transaction system) |
| `rsne-inventory/src/lib/cost.ts` | WAC calculation logic |
| `rsne-inventory/src/lib/utils.ts` | Shared utilities (cn, formatters) |
| `rsne-inventory/src/lib/supabase/server.ts` | Server-side Supabase client |
| `rsne-inventory/src/lib/supabase/client.ts` | Client-side Supabase client |
| `rsne-inventory/src/lib/supabase/middleware.ts` | Auth middleware for Supabase |
| `rsne-inventory/src/types/index.ts` | Shared TypeScript types |
| `rsne-inventory/src/app/layout.tsx` | Root layout (fonts, providers, nav shell) |
| `rsne-inventory/src/app/page.tsx` | Dashboard page |
| `rsne-inventory/src/app/login/page.tsx` | Login page |
| `rsne-inventory/src/app/inventory/page.tsx` | Product list (search, filter, pagination) |
| `rsne-inventory/src/app/inventory/new/page.tsx` | Create product form |
| `rsne-inventory/src/app/inventory/[id]/page.tsx` | Product detail + recent transactions |
| `rsne-inventory/src/app/inventory/[id]/edit/page.tsx` | Edit product form |
| `rsne-inventory/src/app/inventory/[id]/adjust/page.tsx` | Manual stock adjustment |
| `rsne-inventory/src/app/settings/page.tsx` | Settings placeholder (user management in Phase 1) |
| `rsne-inventory/src/app/api/inventory/route.ts` | GET (list) + POST (create) products |
| `rsne-inventory/src/app/api/inventory/[id]/route.ts` | GET (detail) + PUT (update) product |
| `rsne-inventory/src/app/api/inventory/[id]/adjust/route.ts` | POST stock adjustment |
| `rsne-inventory/src/app/api/users/route.ts` | GET (list) + POST (create) users |
| `rsne-inventory/src/app/api/users/[id]/route.ts` | GET + PUT user |
| `rsne-inventory/src/app/api/jobs/route.ts` | GET (list) + POST (create) jobs |
| `rsne-inventory/src/app/api/jobs/[id]/route.ts` | GET + PUT job |
| `rsne-inventory/src/app/api/transactions/route.ts` | GET transaction history |
| `rsne-inventory/src/app/api/dashboard/route.ts` | GET dashboard summary data |
| `rsne-inventory/src/components/layout/bottom-nav.tsx` | Mobile bottom navigation (5 tabs) |
| `rsne-inventory/src/components/layout/header.tsx` | Page header with back nav + actions |
| `rsne-inventory/src/components/layout/providers.tsx` | React Query + Supabase providers |
| `rsne-inventory/src/components/inventory/product-card.tsx` | Product list card (stock status colors) |
| `rsne-inventory/src/components/inventory/product-form.tsx` | Reusable product create/edit form |
| `rsne-inventory/src/components/inventory/stock-badge.tsx` | Green/yellow/red stock status badge |
| `rsne-inventory/src/components/inventory/category-filter.tsx` | Category filter pills |
| `rsne-inventory/src/components/shared/search-input.tsx` | Search input component |
| `rsne-inventory/src/components/shared/empty-state.tsx` | Empty state placeholder |
| `rsne-inventory/src/components/dashboard/stock-summary-card.tsx` | Stock health summary card |
| `rsne-inventory/src/components/dashboard/low-stock-list.tsx` | Low stock alerts list |
| `rsne-inventory/src/components/dashboard/quick-actions.tsx` | Role-based quick action buttons |
| `rsne-inventory/src/hooks/use-products.ts` | React Query hooks for product CRUD |
| `rsne-inventory/src/hooks/use-dashboard.ts` | React Query hook for dashboard data |
| `rsne-inventory/src/middleware.ts` | Next.js middleware (auth + role checks) |

### Files to Modify

| File Path | Changes |
| --- | --- |
| `rsne-inventory/tailwind.config.ts` | Add RSNE brand colors, fonts, design tokens |
| `rsne-inventory/src/app/globals.css` | Add Google Fonts import, custom CSS variables |
| `rsne-inventory/package.json` | Add prisma seed script |
| `rsne-inventory/tsconfig.json` | Ensure strict mode, path aliases |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **All 27 schema models deployed from day one**: Even though Phase 1 only uses ~8 models actively, deploying the full schema avoids migration headaches later. Empty tables cost nothing. The BomTemplate models (identified as critical gap in TRD audit) are included.

2. **`lib/stock.ts` built before any stock-changing UI**: The atomic transaction system is the most critical piece of business logic. It must exist and be tested before any UI touches stock levels. Every stock change in the entire app will flow through this one module.

3. **Supabase Auth (not NextAuth)**: Supabase provides auth natively with the database. Email/password auth is simple, role syncing is straightforward (store role in Prisma User, sync with Supabase metadata), and it avoids adding another dependency.

4. **Server Components by default**: Pages that just display data (product list, dashboard) are Server Components. Only forms, interactive filters, and state-dependent UI get `"use client"`. This follows Next.js best practices and the PRD's architectural decision.

5. **Bottom nav with 5 tabs (Dashboard, BOMs, Inventory, Assemblies, More)**: BOMs and Assemblies tabs will show "Coming Soon" placeholders in Phase 1. This avoids layout changes when Phase 2/3 land — the nav is already in place.

6. **Project lives in `rsne-inventory/` subdirectory**: Keeps the planning workspace separate from the app code. The workspace can reference the app but stays clean.

7. **React Query for all client-side data fetching**: Provides caching, optimistic updates, and background refetching. Critical for the checkout/return flows in Phase 2 but worth establishing the pattern now.

8. **Zod validation on all API routes from day one**: Prevents bad data from entering the system. Every POST/PUT route validates input with Zod schemas before touching the database.

### Alternatives Considered

- **NextAuth instead of Supabase Auth**: Rejected because we're already using Supabase for the database. Adding NextAuth creates two auth systems to manage. Supabase auth is simpler for email/password with role-based access.

- **Deploy schema incrementally per phase**: Rejected because it creates migration complexity. Adding 20+ tables across 4 phases means 4 rounds of migration testing. Deploying all at once is cleaner — empty tables have zero cost.

- **Separate backend (Express/Fastify)**: Rejected per PRD — Next.js API routes keep frontend and backend in one project. Simpler deployment, shared types, no CORS issues.

- **App code in workspace root**: Rejected because the planning workspace (CLAUDE.md, context/, plans/, reference/) serves a different purpose than the app code. Keeping them separate prevents confusion.

### Open Questions

None — all decisions resolved:

- **Supabase/GitHub/Vercel**: Claude will set up all infrastructure and provide Gabe with step-by-step account creation instructions where his identity is required.
- **Initial user**: Gabe (gabe@rsofne.com) as Admin. Additional team members added later.
- **Seed data**: Real RSNE inventory from `reference/January 2026 Inventory_v1 copy.xlsx` (~300 items across 7 categories with actual SKUs, costs, quantities, and suppliers). The "DEC Inventory Master" sheet has the richest data (CAT-ID, VAR-ID, vendor, part numbers, PO descriptions, units).

---

## Step-by-Step Tasks

### Step 1: Scaffold Next.js Project

Create the Next.js application with all required dependencies.

**Actions:**

- Run `npx create-next-app@latest rsne-inventory --typescript --tailwind --app --src-dir --eslint`
  - When prompted: use App Router, use src/ directory, use Tailwind, use ESLint, no import alias customization (keep `@/`)
- Install core dependencies:
  ```bash
  cd rsne-inventory
  npm install prisma @prisma/client @supabase/supabase-js @supabase/ssr @tanstack/react-query lucide-react recharts zod
  npm install ai @ai-sdk/anthropic
  npm install -D ts-node @types/node
  ```
- Initialize Prisma: `npx prisma init`
- Initialize shadcn/ui: `npx shadcn-ui@latest init`
  - Style: Default
  - Base color: Neutral
  - CSS variables: Yes
- Install shadcn/ui components needed for Phase 1:
  ```bash
  npx shadcn-ui@latest add button card input label select badge dialog sheet tabs separator dropdown-menu toast form
  ```

**Files affected:**

- `rsne-inventory/` (entire project scaffold)
- `rsne-inventory/package.json`
- `rsne-inventory/prisma/schema.prisma` (initialized)
- `rsne-inventory/components.json` (shadcn config)

---

### Step 2: Configure Design System

Apply the RSNE brand identity to Tailwind, fonts, and global styles.

**Actions:**

- Update `tailwind.config.ts` with RSNE color palette:
  - Navy: `#0B1D3A` (primary), `#132C52` (light), `#071428` (dark)
  - Brand Blue: `#2E7DBA` (default), `#3A8FD4` (bright)
  - Brand Orange: `#E8792B` (default), `#D06820` (hover)
  - Surface: `#FFFFFF` (default), `#F4F6F8` (secondary)
  - Border: `#E2E6EB`
  - Text: primary `#0B1D3A`, secondary `#4A5B6E`, muted `#8899AB`
  - Status: green `#22C55E`, yellow `#EAB308`, red `#EF4444`
- Add font families: Plus Jakarta Sans (headings), DM Sans (body)
- Update `globals.css`:
  - Import Google Fonts (Plus Jakarta Sans 500/600/700, DM Sans 400/500/600)
  - Set base font to DM Sans
  - Add CSS custom properties for colors if needed by shadcn
  - Set smooth transitions on interactive elements: `transition-all duration-200 ease-out`

**Files affected:**

- `rsne-inventory/tailwind.config.ts`
- `rsne-inventory/src/app/globals.css`

---

### Step 3: Set Up Environment Variables

Create the environment variable template and configure for local development.

**Actions:**

- Create `rsne-inventory/.env.local.example` with all required variables:
  ```
  # Supabase
  DATABASE_URL=
  DIRECT_URL=
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=

  # AI (Phase 2+)
  ANTHROPIC_API_KEY=
  ```
- Add `.env.local` to `.gitignore` (should already be there from create-next-app)

**Files affected:**

- `rsne-inventory/.env.local.example`
- `rsne-inventory/.gitignore` (verify)

---

### Step 4: Write Complete Prisma Schema

Deploy the full 27-model schema from `reference/schema.md`.

**Actions:**

- Write the complete Prisma schema to `rsne-inventory/prisma/schema.prisma`
- Include all 27 models: User, Product, Category, Supplier, PurchaseOrder, POLineItem, Transaction, Bom, BomLineItem, BomTemplate, BomTemplateLineItem, AssemblyTemplate, AssemblyTemplateComponent, Assembly, AssemblyComponent, AssemblyChangeLog, Receipt, CycleCount, ProjectedJob, ProjectedMaterial, Notification, Job
- Include all 13 enums: Role, InventoryTier, POStatus, TransactionType, BomStatus, AssemblyType, AssemblyStatus, ApprovalStatus, QueueType, NotificationType, ProjectedConfidence, JobStatus
- Configure Prisma datasource for Supabase PostgreSQL:
  ```prisma
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }

  generator client {
    provider = "prisma-client-js"
  }
  ```
- All IDs are UUIDs (`@id @default(uuid())`)
- All monetary values use `Decimal(12,4)`
- All models with temporal tracking have `createdAt` and `updatedAt`

**Files affected:**

- `rsne-inventory/prisma/schema.prisma`

---

### Step 5: Create Core Library Files

Build the foundational lib files that everything depends on.

**Actions:**

- **`src/lib/db.ts`** — Prisma client singleton:
  ```typescript
  // Standard Next.js Prisma singleton pattern
  // globalThis to prevent multiple instances in dev
  ```

- **`src/lib/stock.ts`** — Atomic stock operations:
  - `adjustStock(productId, quantity, type, userId, metadata)` function
  - Uses Prisma `$transaction` for atomicity
  - Reads current qty, calculates new qty, creates Transaction record, updates Product
  - Tier-aware: Tier 1 updates `currentQty`, Tier 2 creates Transaction only
  - Handles all TransactionType variants
  - Returns the created Transaction
  - This is the ONLY way stock levels change in the entire app

- **`src/lib/cost.ts`** — WAC calculation:
  - `calculateWAC(existingQty, existingWAC, receivedQty, purchaseCost)` function
  - Formula: `((existingQty * existingWAC) + (receivedQty * purchaseCost)) / (existingQty + receivedQty)`
  - Edge case: if existingQty <= 0, return purchaseCost
  - Pure function, no side effects — called by stock.ts during RECEIVE transactions

- **`src/lib/utils.ts`** — Shared utilities:
  - `cn()` — Tailwind class merger (from shadcn)
  - `formatCurrency(value)` — Format Decimal to `$X,XXX.XX`
  - `formatQuantity(value, unit)` — Format quantity with unit
  - `getStockStatus(currentQty, reorderPoint)` — Returns 'in-stock' | 'low' | 'out'

- **`src/lib/auth.ts`** — Auth utilities:
  - `getCurrentUser(request)` — Get authenticated user from Supabase session
  - `requireRole(user, allowedRoles[])` — Throw if user lacks required role
  - `requireAuth(request)` — Middleware helper that returns user or 401

- **`src/lib/supabase/server.ts`** — Server-side Supabase client (using `@supabase/ssr`)
- **`src/lib/supabase/client.ts`** — Client-side Supabase client
- **`src/lib/supabase/middleware.ts`** — Supabase auth middleware helper

- **`src/types/index.ts`** — Shared types:
  - Re-export Prisma generated types
  - `StockStatus` type: `'in-stock' | 'low' | 'out'`
  - API response types: `ApiResponse<T>`, `PaginatedResponse<T>`
  - Dashboard types: `StockSummary`, `LowStockItem`

**Files affected:**

- `rsne-inventory/src/lib/db.ts`
- `rsne-inventory/src/lib/stock.ts`
- `rsne-inventory/src/lib/cost.ts`
- `rsne-inventory/src/lib/utils.ts`
- `rsne-inventory/src/lib/auth.ts`
- `rsne-inventory/src/lib/supabase/server.ts`
- `rsne-inventory/src/lib/supabase/client.ts`
- `rsne-inventory/src/lib/supabase/middleware.ts`
- `rsne-inventory/src/types/index.ts`

---

### Step 6: Build Auth Middleware & Login Page

Set up authentication flow with Supabase.

**Actions:**

- **`src/middleware.ts`** — Next.js middleware:
  - Check for Supabase session on every request
  - Redirect unauthenticated users to `/login`
  - Allow `/login` without auth
  - Look up user role from Prisma User table (via session email)
  - Pass role info via request headers for API routes to consume

- **`src/app/login/page.tsx`** — Login page:
  - Simple email/password form using shadcn Input + Button
  - RSNE branding (navy background, logo placeholder, brand colors)
  - Error display for invalid credentials
  - Redirect to dashboard on success
  - `"use client"` (form with state)

- **`src/app/api/auth/callback/route.ts`** — Auth callback for Supabase

**Files affected:**

- `rsne-inventory/src/middleware.ts`
- `rsne-inventory/src/app/login/page.tsx`
- `rsne-inventory/src/app/api/auth/callback/route.ts`

---

### Step 7: Build Layout Shell (Root Layout, Bottom Nav, Header)

Create the mobile-first app shell that wraps all pages.

**Actions:**

- **`src/app/layout.tsx`** — Root layout:
  - Load Plus Jakarta Sans + DM Sans fonts via `next/font/google`
  - Wrap children in Providers (React Query, Supabase)
  - Include bottom nav (hidden on `/login`)
  - Set metadata (title: "RSNE Inventory", description)
  - `<body>` uses DM Sans, navy text

- **`src/components/layout/providers.tsx`** — Client provider wrapper:
  - QueryClientProvider (React Query)
  - Supabase auth state listener
  - `"use client"`

- **`src/components/layout/bottom-nav.tsx`** — Bottom navigation:
  - 5 tabs: Dashboard, BOMs, Inventory, Assemblies, More
  - Icons from Lucide: LayoutDashboard, ClipboardList, Package, Factory, MoreHorizontal
  - Active state uses brand-blue
  - Fixed to bottom, `h-16`, `bg-white`, top border
  - BOMs + Assemblies show "Coming Soon" toast when tapped in Phase 1
  - `"use client"` (uses `usePathname`)

- **`src/components/layout/header.tsx`** — Page header:
  - Title + optional back button
  - Optional right-side action button
  - `h-14`, navy background, white text
  - Responsive: collapses gracefully

**Files affected:**

- `rsne-inventory/src/app/layout.tsx`
- `rsne-inventory/src/components/layout/providers.tsx`
- `rsne-inventory/src/components/layout/bottom-nav.tsx`
- `rsne-inventory/src/components/layout/header.tsx`

---

### Step 8: Build Inventory API Routes

Create the REST API for product CRUD and stock adjustment.

**Actions:**

- **`src/app/api/inventory/route.ts`**:
  - `GET` — List products with:
    - Search by name/SKU (`?search=`)
    - Filter by category (`?category=`)
    - Filter by tier (`?tier=`)
    - Filter by stock status (`?status=in-stock|low|out`)
    - Pagination (`?page=&limit=`)
    - Sort by name, currentQty, updatedAt
    - Include category relation
    - Only return `isActive: true`
  - `POST` — Create product:
    - Zod validation: name (required), categoryId (required), tier, unitOfMeasure (required), reorderPoint, location, notes, leadTimeDays
    - Returns created product

- **`src/app/api/inventory/[id]/route.ts`**:
  - `GET` — Product detail:
    - Include category, recent transactions (last 20), current stock status
  - `PUT` — Update product:
    - Zod validation for all editable fields
    - Cannot update `currentQty` directly (enforced — must use adjust endpoint)
    - Returns updated product

- **`src/app/api/inventory/[id]/adjust/route.ts`**:
  - `POST` — Manual stock adjustment:
    - Zod validation: quantity (required, positive), direction ('up' | 'down'), reason (required)
    - Calls `lib/stock.ts` adjustStock function
    - Creates ADJUST_UP or ADJUST_DOWN transaction
    - Auth: requires ADMIN, OPERATIONS_MANAGER, OFFICE_MANAGER, or SHOP_FOREMAN role

- All routes use `lib/auth.ts` for authentication and role checking

**Files affected:**

- `rsne-inventory/src/app/api/inventory/route.ts`
- `rsne-inventory/src/app/api/inventory/[id]/route.ts`
- `rsne-inventory/src/app/api/inventory/[id]/adjust/route.ts`

---

### Step 9: Build Supporting API Routes (Users, Jobs, Transactions, Dashboard)

**Actions:**

- **`src/app/api/users/route.ts`**:
  - `GET` — List users (Admin only)
  - `POST` — Create user (Admin only) — creates Supabase auth user + Prisma User record

- **`src/app/api/users/[id]/route.ts`**:
  - `GET` — User detail
  - `PUT` — Update user (role, name)

- **`src/app/api/jobs/route.ts`**:
  - `GET` — List active jobs (for dropdowns)
  - `POST` — Create job (name, number)

- **`src/app/api/jobs/[id]/route.ts`**:
  - `GET` — Job detail
  - `PUT` — Update job status

- **`src/app/api/transactions/route.ts`**:
  - `GET` — Transaction history with filters:
    - By product (`?productId=`)
    - By job (`?jobName=`)
    - By type (`?type=`)
    - By date range (`?from=&to=`)
    - Pagination
    - Include product and user relations

- **`src/app/api/dashboard/route.ts`**:
  - `GET` — Dashboard summary:
    - Total products count (Tier 1 active)
    - Total inventory value (SUM of currentQty * avgCost, Tier 1)
    - Low stock count (currentQty <= reorderPoint AND currentQty > 0)
    - Out of stock count (currentQty <= 0)
    - Low stock items list (top 10, sorted by urgency)
    - Recent transactions (last 10)

**Files affected:**

- `rsne-inventory/src/app/api/users/route.ts`
- `rsne-inventory/src/app/api/users/[id]/route.ts`
- `rsne-inventory/src/app/api/jobs/route.ts`
- `rsne-inventory/src/app/api/jobs/[id]/route.ts`
- `rsne-inventory/src/app/api/transactions/route.ts`
- `rsne-inventory/src/app/api/dashboard/route.ts`

---

### Step 10: Build Shared UI Components

Create reusable components used across inventory and dashboard pages.

**Actions:**

- **`src/components/shared/search-input.tsx`**:
  - Search icon + text input with debounced onChange
  - `"use client"`

- **`src/components/shared/empty-state.tsx`**:
  - Icon + title + description + optional action button
  - Used when lists are empty

- **`src/components/inventory/stock-badge.tsx`**:
  - Small rounded pill showing stock status
  - Green bg + "In Stock" / Yellow bg + "Low" / Red bg + "Out"
  - Takes `currentQty` and `reorderPoint` as props

- **`src/components/inventory/category-filter.tsx`**:
  - Horizontal scrollable row of category pills
  - "All" + each category from DB
  - Active state with brand-blue
  - `"use client"`

- **`src/components/inventory/product-card.tsx`**:
  - Card showing: product name, category badge, current qty + unit, stock status badge, location
  - Tappable → navigates to product detail
  - `rounded-xl shadow-sm border border-border p-4`

- **`src/components/inventory/product-form.tsx`**:
  - Reusable form for create + edit
  - Fields: name, SKU (optional), category (select), tier (select), unit of measure, reorder point, location, notes, lead time days
  - Zod validation matching API
  - shadcn form components
  - `"use client"`

**Files affected:**

- `rsne-inventory/src/components/shared/search-input.tsx`
- `rsne-inventory/src/components/shared/empty-state.tsx`
- `rsne-inventory/src/components/inventory/stock-badge.tsx`
- `rsne-inventory/src/components/inventory/category-filter.tsx`
- `rsne-inventory/src/components/inventory/product-card.tsx`
- `rsne-inventory/src/components/inventory/product-form.tsx`

---

### Step 11: Build Inventory Pages

Create the product catalog UI.

**Actions:**

- **`src/app/inventory/page.tsx`** — Product list:
  - Server Component that fetches initial data
  - Search bar at top
  - Category filter pills below search
  - Product cards in a responsive grid/list
  - Floating "+" FAB (brand-orange) to add new product
  - Empty state when no products match
  - Pagination at bottom

- **`src/app/inventory/new/page.tsx`** — Create product:
  - Header: "Add Product" with back button
  - ProductForm component
  - On submit: POST to /api/inventory, redirect to product detail
  - `"use client"`

- **`src/app/inventory/[id]/page.tsx`** — Product detail:
  - Product name, category, tier badge
  - Current stock level (large number) with status color
  - Key info: unit, location, reorder point, avg cost, last cost
  - "Adjust Stock" button (brand-orange CTA)
  - "Edit" button (secondary)
  - Recent transactions list (last 20)
  - Server Component with client interactive sections

- **`src/app/inventory/[id]/edit/page.tsx`** — Edit product:
  - ProductForm pre-filled with current values
  - On submit: PUT to /api/inventory/[id]
  - `"use client"`

- **`src/app/inventory/[id]/adjust/page.tsx`** — Stock adjustment:
  - Current stock displayed prominently
  - Direction toggle: "Add" / "Remove"
  - Quantity input (large, easy to tap)
  - Reason field (required) — dropdown with common reasons + "Other" free text
  - Preview: "Current: 24 → New: 30 (+6)"
  - Submit button (brand-orange)
  - `"use client"`

**Files affected:**

- `rsne-inventory/src/app/inventory/page.tsx`
- `rsne-inventory/src/app/inventory/new/page.tsx`
- `rsne-inventory/src/app/inventory/[id]/page.tsx`
- `rsne-inventory/src/app/inventory/[id]/edit/page.tsx`
- `rsne-inventory/src/app/inventory/[id]/adjust/page.tsx`

---

### Step 12: Build React Query Hooks

Create data-fetching hooks for client components.

**Actions:**

- **`src/hooks/use-products.ts`**:
  - `useProducts(filters)` — List with search, category, status, pagination
  - `useProduct(id)` — Single product detail
  - `useCreateProduct()` — Mutation
  - `useUpdateProduct()` — Mutation
  - `useAdjustStock()` — Mutation with optimistic update on product detail

- **`src/hooks/use-dashboard.ts`**:
  - `useDashboard()` — Dashboard summary data
  - Auto-refetch every 30 seconds (stock levels stay fresh)

**Files affected:**

- `rsne-inventory/src/hooks/use-products.ts`
- `rsne-inventory/src/hooks/use-dashboard.ts`

---

### Step 13: Build Dashboard Page

Create the main dashboard with stock health and quick actions.

**Actions:**

- **`src/components/dashboard/stock-summary-card.tsx`**:
  - Four stat cards in a 2x2 grid:
    - Total Products (number, brand-blue)
    - Inventory Value (formatted currency, brand-blue)
    - Low Stock (number, status-yellow)
    - Out of Stock (number, status-red)
  - Each card is tappable (navigates to filtered inventory view)

- **`src/components/dashboard/low-stock-list.tsx`**:
  - "Needs Attention" section
  - List of products below reorder point
  - Shows: name, current qty vs reorder point, category
  - Red/yellow status indicators
  - Tappable → product detail
  - "View All" link to inventory filtered by low stock

- **`src/components/dashboard/quick-actions.tsx`**:
  - Role-based action buttons:
    - Admin/OM: "Add Product", "Adjust Stock", "View All Inventory"
    - Foreman: "Adjust Stock", "View Low Stock"
    - All roles: "Search Inventory"
  - Large, tappable buttons with icons
  - `"use client"` (needs user role)

- **`src/app/page.tsx`** — Dashboard page:
  - Greeting: "Good [morning/afternoon], [Name]"
  - Stock Summary Cards
  - Low Stock List
  - Quick Actions
  - Recent activity feed (last 5 transactions)

**Files affected:**

- `rsne-inventory/src/components/dashboard/stock-summary-card.tsx`
- `rsne-inventory/src/components/dashboard/low-stock-list.tsx`
- `rsne-inventory/src/components/dashboard/quick-actions.tsx`
- `rsne-inventory/src/app/page.tsx`

---

### Step 14: Create Seed Data Script

Build comprehensive seed data for development and testing.

**Actions:**

- **`rsne-inventory/prisma/seed.ts`**:
  - **Data source:** `reference/January 2026 Inventory_v1 copy.xlsx` — real RSNE inventory
    - 4 sheets: Summary, JAN Inventory (~300 items), Lakeville (~300 items), DEC Inventory Master (~1000 rows)
    - DEC Master has richest data: CAT-ID, VAR-ID, item name, unit cost, unit, PO description, vendor, part #, quantities, category
    - JAN Inventory has current stock levels (Jan 2026 counts)
    - Total inventory value: ~$336K across 7 categories
  - **Categories** (7 from actual data + 4 for future use):
    1. Door Hardware & Parts ($67K value, largest item count)
    2. Metal Raw Materials ($102K value — diamond plate, aluminum, galvanized steel)
    3. Insulated Metal Panels ($102K value — tracked by manufacturer/length/thickness: AWIP, MetlSpan, Falk)
    4. Trim & Accessories ($40K value — PVC battens/corners, T-bar, vapor guard tape)
    5. Foam Insulation ($14K value — Dow boards, EPS, Trymer, Froth-Pak)
    6. Miscellaneous Materials ($9K value — plywood, poly film, anchors)
    7. Doors by Others ($748 value — replacement strip curtains)
    8-11. Fabrication Supplies, Caulking & Sealants, Plywood & Substrates, FRP (future use)
  - **Products** — Import ALL items from DEC Inventory Master cross-referenced with JAN Inventory for current quantities
  - **Suppliers** (from Vendor column): Pierce Aluminum, Kason, Dent, Hadco, Adfast, Dupont, NEFCO, Fastener Systems Inc., Industrial Products
  - **User**: Gabe Perez, gabe@rsofne.com, ADMIN role
  - **Jobs**: 3-5 placeholder jobs
  - **Transactions**: ADJUST_UP records simulating initial inventory load

- Update `package.json` to add seed script:
  ```json
  "prisma": { "seed": "ts-node --compiler-options {\"module\":\"commonjs\"} prisma/seed.ts" }
  ```

**Files affected:**

- `rsne-inventory/prisma/seed.ts`
- `rsne-inventory/package.json`

---

### Step 15: Settings Page (User Management Placeholder)

**Actions:**

- **`src/app/settings/page.tsx`** — Settings page:
  - User management section (Admin only): list users, add user button
  - App info section: version, phase
  - Placeholder sections for future settings
  - Accessed via "More" tab in bottom nav

**Files affected:**

- `rsne-inventory/src/app/settings/page.tsx`

---

### Step 16: Final Configuration & Validation

Ensure everything builds and is ready for deployment.

**Actions:**

- Verify `tsconfig.json` has `"strict": true`
- Run `npx prisma generate` to generate Prisma client
- Run `npx prisma db push` (or `migrate dev`) to apply schema to Supabase
- Run `npx prisma db seed` to populate test data
- Run `npm run build` — must pass with zero errors
- Test locally: `npm run dev`
  - Verify login flow
  - Verify product list loads with seed data
  - Verify search and category filtering
  - Verify product create/edit
  - Verify stock adjustment creates transaction
  - Verify dashboard shows correct summary
  - Verify mobile layout and bottom nav
  - Verify low-stock alerts display correctly
- Deploy to Vercel (if GitHub repo + Vercel project exist)

**Files affected:**

- `rsne-inventory/tsconfig.json` (verify)
- Supabase database (schema applied)

---

## Connections & Dependencies

### Files That Reference This Area

- `CLAUDE.md` — Will need updating to reference the app codebase location
- `context/1_Project Goals.md` — References docs/ paths that now live in reference/
- `reference/build-order.md` — Phase 1 scope definition (this plan implements it)

### Updates Needed for Consistency

- Update `CLAUDE.md` to document the `rsne-inventory/` app directory and how to run it
- Update `context/strategy.md` with current Phase 1 priorities (currently a template)

### Impact on Existing Workflows

- `/create-plan` and `/implement` workflows are unchanged
- Future plans for Phase 2-4 will build on the codebase created here
- The planning workspace remains separate from the app code

---

## Validation Checklist

How to verify the implementation is complete and correct:

- [ ] `npm run build` passes with zero errors in `rsne-inventory/`
- [ ] Login page authenticates against Supabase and redirects to dashboard
- [ ] Dashboard displays stock summary (total products, value, low/out counts)
- [ ] Dashboard shows low-stock alerts with correct status colors
- [ ] Product list page loads with search and category filtering
- [ ] Product create form validates and creates product in database
- [ ] Product edit form loads current values and saves updates
- [ ] Stock adjustment creates ADJUST_UP/ADJUST_DOWN transaction via `lib/stock.ts`
- [ ] Stock adjustment updates `currentQty` atomically (verified via product detail)
- [ ] Transaction history displays on product detail page
- [ ] Bottom nav shows 5 tabs, navigates correctly, highlights active tab
- [ ] Mobile layout works at 375px width (no horizontal scroll, large touch targets)
- [ ] All API routes validate input with Zod and return proper error responses
- [ ] Role-based access: non-admin users cannot access user management
- [ ] Seed data populates categories, products, jobs, and users
- [ ] `CLAUDE.md` updated with app directory and run instructions

---

## Success Criteria

The implementation is complete when:

1. A user can log in, view the dashboard with stock health summary, see low-stock alerts, browse the product catalog with search/filter, create/edit products, and adjust stock levels — all from a mobile phone
2. Every stock change goes through `lib/stock.ts` and creates an auditable Transaction record with previousQty and newQty
3. The app builds without errors and is deployable to Vercel
4. Seed data provides enough sample products and transactions to demonstrate all features
5. The codebase follows all architectural decisions: Server Components by default, API-first, soft deletes, tier-aware, Zod validation

---

## Notes

- **Phase 2 readiness**: The full schema is deployed, React Query patterns are established, and the API-first architecture means Phase 2 (BOMs, LLM input, checkout/return) can build directly on this foundation without refactoring
- **The critical `lib/stock.ts` module** is the single most important piece of code in the entire app. It must be correct, atomic, and well-tested. Every future phase depends on it.
- **Supabase Auth + Prisma User table**: These are two separate things. Supabase handles authentication (email/password). Prisma User table stores application-level data (role, name). They're linked by email. On first login, if no Prisma User exists for the email, we can auto-create one with CREW role (lowest privilege).
- **No LLM features in Phase 1**: The AI SDK is installed but not used yet. This avoids complexity while establishing the foundation. Phase 2 introduces the LLM input component.
- **Offline tolerance** (mentioned in PRD) is a Phase 2+ concern. For Phase 1, the app requires connectivity. Service worker caching can be added later.

---

## Implementation Notes

**Implemented:** 2026-03-05

### Summary

All 16 steps executed. The full Next.js 16 app is built with complete UI, API routes, Prisma schema, seed data, auth, and business logic. TypeScript compilation passes with zero errors under strict mode.

### Deviations from Plan

- **Tailwind v4**: Plan assumed Tailwind v3 with `tailwind.config.ts`. Tailwind v4 uses CSS-based config — all RSNE brand tokens placed directly in `globals.css` using `@theme inline`.
- **Prisma 7 Decimal import**: `@prisma/client/runtime/library` no longer exports `Decimal`. Changed to `Prisma.Decimal` from `@prisma/client` in `stock.ts`, and removed Decimal import entirely from `cost.ts` and `utils.ts` (using `{ toString(): string }` union type instead since values are immediately converted to `number`).
- **Prisma 7 directUrl**: `directUrl` not supported in `prisma.config.ts` `datasource` block. Removed it.
- **Zod v4**: `ZodError.errors` renamed to `ZodError.issues`. Updated all API route error handlers.
- **React 19 useRef**: `useRef<T>()` now requires an initial value. Fixed to `useRef<T>(null)`.
- **Next.js 16 middleware deprecation**: `middleware.ts` works but shows deprecation warning suggesting migration to `proxy`. Left as-is for now — still functional.

### Issues Encountered

- Build fails at page data collection because no database is connected yet (expected — Supabase project not yet created). TypeScript compilation itself passes clean.
- Supplier seed data used `upsert` with undefined IDs; fixed with `create().catch()` pattern.
