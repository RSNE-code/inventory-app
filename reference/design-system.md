# Design System & UI

## Philosophy
**"So easy a 3-year-old can do it."** One clear primary action per screen. Minimize typing. Maximize taps. If you have to explain it, redesign it.

## Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `navy` | `#0B1D3A` | Primary bg (headers, nav), primary text on light |
| `navy-light` | `#132C52` | Secondary bg, cards on dark |
| `brand-blue` | `#2E7DBA` | Interactive elements (buttons, links, active) |
| `brand-blue-bright` | `#3A8FD4` | Hover states, secondary actions |
| `brand-orange` | `#E8792B` | Primary CTA, alerts, highlights |
| `brand-orange-hover` | `#D06820` | CTA hover/active |
| `surface` | `#FFFFFF` | Page bg, card bg |
| `surface-secondary` | `#F4F6F8` | Secondary bg, alternating rows |
| `border` | `#E2E6EB` | Borders, dividers |
| `text-muted` | `#8899AB` | Placeholder, disabled |
| `text-secondary` | `#4A5B6E` | Labels, secondary text |
| `status-green` | `#22C55E` | In-stock, success |
| `status-yellow` | `#EAB308` | Low stock, warnings |
| `status-red` | `#EF4444` | Out of stock, errors |

## Tailwind Config

```typescript
const config = {
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0B1D3A', light: '#132C52', dark: '#071428' },
        'brand-blue': { DEFAULT: '#2E7DBA', bright: '#3A8FD4' },
        'brand-orange': { DEFAULT: '#E8792B', hover: '#D06820' },
        surface: { DEFAULT: '#FFFFFF', secondary: '#F4F6F8' },
        border: '#E2E6EB',
        'text-primary': '#0B1D3A',
        'text-secondary': '#4A5B6E',
        'text-muted': '#8899AB',
        'status-green': '#22C55E',
        'status-yellow': '#EAB308',
        'status-red': '#EF4444',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
};
```

## Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | Plus Jakarta Sans | 700 | 24–32px |
| Subheadings | Plus Jakarta Sans | 600 | 18–20px |
| Body | DM Sans | 400 | 16px |
| Labels | DM Sans | 500 | 14px |
| Buttons | DM Sans | 600 | 16px |
| Numbers | DM Sans tabular | 500 | 18–24px |

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap');
```

## Layout Rules

1. **Mobile-first.** Design for 375px. Tablet/desktop are progressive enhancements.
2. **Bottom nav.** Max 5 tabs: Dashboard, BOMs, Inventory, Assemblies, More.
3. **Card-based.** Everything is a card — tappable, scannable.
4. **Large touch targets.** Min `h-12 min-w-[48px]`. Primary CTAs full-width on mobile.
5. **One primary action per screen.** Prominent orange CTA.
6. **Progressive disclosure.** Essentials first, details on tap.
7. **Status colors everywhere.** Green/yellow/red — assess status without reading.
8. **Smooth transitions.** `transition-all duration-200 ease-out` on interactives.

## Component Conventions

- Base: shadcn/ui customized with RSNE tokens
- Cards: `rounded-xl shadow-sm border border-border p-4`
- CTA buttons: `bg-brand-orange text-white font-semibold rounded-lg` (full-width mobile)
- Status badges: small rounded pills with status color bg
- LLM input: unified component — mic icon (voice) + text input + catalog browse button
- Confirmation cards: parsed items with ✓ confirm and ✎ edit
- Queues: list/swimlane with drag-to-reorder (owner) or read-only (workers)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (nav, auth)
│   ├── page.tsx            # Dashboard
│   ├── inventory/          # List + detail
│   ├── boms/               # Create, detail, checkout
│   ├── assemblies/         # Templates, production
│   ├── queues/
│   │   ├── doors/          # Door Shop Queue
│   │   └── fabrication/    # Fabrication Queue
│   ├── receiving/
│   ├── cycle-counts/
│   ├── reports/
│   ├── planner/            # Phase 4
│   ├── settings/
│   └── api/                # All API routes
├── components/
│   ├── ui/                 # shadcn/ui base
│   ├── layout/             # Nav, header, bottom bar
│   ├── inventory/
│   ├── boms/               # Incl. LLM input components
│   ├── assemblies/
│   ├── queues/
│   ├── door-sheet/
│   └── shared/             # Search, filters, badges, LLM input
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── auth.ts
│   ├── stock.ts            # Atomic stock operations
│   ├── cost.ts             # WAC calculation
│   ├── forecast.ts         # Three-layer demand
│   ├── llm-input.ts        # LLM parsing utilities
│   └── utils.ts
├── hooks/
│   ├── use-llm-input.ts
│   └── use-voice.ts        # Web Speech API
├── types/
└── styles/globals.css
```

## Key Architectural Decisions

1. **Server Components by default.** `"use client"` only for forms, state, event handlers.
2. **Optimistic UI.** React Query `useMutation` with optimistic updates for checkout/return/receive.
3. **Soft deletes.** `isActive` flags on Products and Templates. Never hard-delete.
4. **Flexible specs.** JSON columns for assembly specs and non-catalog item specs.
5. **API-first.** Every operation through an API route (even from server components).
6. **Tier-aware everywhere.** BOM views show all tiers. Inventory views and alerts show Tier 1 only.
