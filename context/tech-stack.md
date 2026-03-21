# Tech Stack & Architecture

The app lives in `rsne-inventory/`. It's a Next.js 16 app with TypeScript, Tailwind CSS v4, Prisma 7, and Supabase.

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (CSS-based config in `globals.css`, NOT `tailwind.config.ts`)
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma 7 (datasource config in `prisma.config.ts`, NOT in `schema.prisma`)
- **Auth:** Supabase Auth via `@supabase/ssr`
- **AI:** Anthropic Claude API via Vercel AI SDK (`@ai-sdk/anthropic` + `ai`)
- **UI Components:** shadcn/ui
- **Data Fetching:** React Query (TanStack Query)
- **Validation:** Zod
- **Native Mobile:** Capacitor 8 (iOS + Android wrapper around the deployed web app)

## Key Architecture Rules
- **AI-first interaction model.** Voice, photo, and natural language are the primary inputs. Traditional forms are fallback only.
- **ALL stock changes** go through `src/lib/stock.ts` — never update `product.currentQty` directly
- **Tier 1 items** deduct from stock on checkout; **Tier 2** logs transactions for costing only
- **WAC (Weighted Average Cost)** recalculates on RECEIVE via `src/lib/cost.ts`
- Prisma 7 uses `Prisma.Decimal` (from `@prisma/client`), NOT `Decimal` from `@prisma/client/runtime/library`

## Run Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build
npx prisma db push   # Push schema to database
npx prisma db seed   # Seed with real RSNE inventory data (483 items)
npx prisma generate  # Regenerate Prisma client
```

## Native App Commands
```bash
npx cap sync         # Sync web assets + plugins to native projects
npm run cap:ios      # Sync + open Xcode
npm run cap:android  # Sync + open Android Studio
npx cap run ios      # Build + run on iOS Simulator
npx cap run android  # Build + run on Android Emulator
```
