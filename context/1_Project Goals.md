# RSNE Inventory Management App

You (Claude) are the sole developer. Gabe (owner) provides product direction only — no code reviews or debugging. Read the full PRD before writing any code: `RSNE Inventory App - PRD.md`

## Tech Stack
Next.js 14+ (App Router) | TypeScript strict | Supabase (Postgres + Auth) | Prisma ORM | Tailwind + shadcn/ui | React Query | Vercel | Anthropic Claude API (via Vercel AI SDK) | Recharts | Lucide React

## Non-Negotiable Rules
1. All stock changes go through `lib/stock.ts` transaction system. Never update `currentQty` directly.
2. Tier 1 items deduct from inventory. Tier 2 items log for job costing only — no stock impact.
3. No free text flows downstream. LLM parses all input into structured `ParsedLineItem[]` data.
4. Door Shop Queue requires SM approval. No door enters queue without sign-off (WF6).
5. WAC recalculates atomically on every receipt. Never recalculated retroactively.
6. Assembly templates carry per-unit consumption rates. Bulk consumables auto-deduct on build complete.
7. Queues (Door Shop + Fabrication) are first-class entities with dedicated APIs and ownership.
8. Capture production timestamps (`startedAt`, `completedAt`) from day one.
9. LLM never writes to DB directly — generates suggestions that users confirm.
10. No Zapier/n8n/middleware. Direct API integrations only. App owns its data.

## Detailed Specs (read when working on relevant areas)
| File | Contents |
|------|----------|
| `docs/schema.md` | Full Prisma schema — 18 models, 13 enums, seed categories |
| `docs/api.md` | All ~50 REST endpoints + notification trigger table |
| `docs/business-logic.md` | WAC, atomic stock ops, tier rules, returns, queues, 3-layer forecasting, cycle counts, job costing |
| `docs/llm-architecture.md` | ParsedLineItem interface, AI endpoints, tool-use pattern, features by phase |
| `docs/design-system.md` | Brand colors, Tailwind config, typography, layout rules, component conventions, project structure |
| `docs/build-order.md` | Setup commands, 4-phase delivery plan, testing strategy, module extension pattern |

## Quick Reference
- **7 Roles:** Admin, Operations Manager, Office Manager, Sales Manager, Shop Foreman, Door Shop, Crew
- **10 Workflows:** WF1 Receiving, WF2 BOM Creation, WF3 Checkout, WF4 Additional Pickup, WF5 Returns, WF6 Door Fabrication, WF7 Panel/Floor Production, WF8 Finished Goods Shipping, WF9 Demand Forecasting, WF10 Cycle Counts
- **Design philosophy:** "So easy a 3-year-old can do it." Mobile-first. One primary action per screen.
- **Server Components by default.** `"use client"` only for forms, state, event handlers.
- **Soft deletes only.** `isActive` flags — never hard-delete.
- **API-first.** Every operation through an API route, even from server components.
