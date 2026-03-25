# Design System Reference

Every design decision in this file is FINAL. Do not deviate. Do not invent
alternatives. Do not "improve" these values for individual components. The
whole point is that every screen in the app uses the exact same rules.

The visual feel we're going for: **Monday.com meets Todoist.** Clean,
friendly, productive. Not flashy, not sterile — warm and organized.
The kind of app where everything feels like it fits together.

---

## 1. Font: Figtree

The app uses **Figtree** — the same font family Monday.com uses for their
platform. It's friendly, highly readable, and works beautifully at every
size from tiny labels to large page titles.

**Import it in your layout or globals:**
```css
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
```

**Set it as the default in Tailwind CSS v4 (globals.css):**
```css
@theme {
  --font-sans: 'Figtree', ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
}
```

**Weights to load (and their uses):**
| Weight | Name       | When to use                              |
|--------|-----------|------------------------------------------|
| 400    | Regular   | Body text, descriptions, paragraphs      |
| 500    | Medium    | Subtitles, labels, form field labels     |
| 600    | Semibold  | Card titles, section titles, nav items   |
| 700    | Bold      | Page titles, hero headings only          |

**Never use weights outside this set.** No 300 (too wispy), no 800/900
(too heavy). Four weights is all you need for clear hierarchy.

---

## 2. Text Sizes — The Complete Type Scale

Every piece of text in the app maps to exactly ONE of these roles.
Never invent a custom size. Never use arbitrary values like `text-[19px]`.

| Role              | Tailwind Class                              | Size   | Weight    | Use for                                     |
|-------------------|---------------------------------------------|--------|-----------|----------------------------------------------|
| **Page title**    | `text-2xl font-bold tracking-tight`         | 24px   | 700 bold  | Top of every page, one per screen            |
| **Section title** | `text-lg font-semibold`                     | 18px   | 600 semi  | Group headings within a page                 |
| **Card title**    | `text-base font-semibold`                   | 16px   | 600 semi  | Title at top of each card                    |
| **Subtitle**      | `text-sm font-medium`                       | 14px   | 500 med   | Supporting text below a title                |
| **Body**          | `text-sm font-normal`                       | 14px   | 400 reg   | Regular paragraph and content text           |
| **Caption**       | `text-xs font-normal`                       | 12px   | 400 reg   | Timestamps, metadata, helper text            |
| **Label**         | `text-xs font-medium uppercase tracking-wide` | 12px | 500 med   | Form labels, overlines, category tags        |

### Why these sizes work

The scale is tight (12 → 14 → 16 → 18 → 24) which creates the compact,
information-dense feel that Monday.com and Todoist have. These are not big
fluffy marketing sizes — they're productivity app sizes where you want to
see a lot of content at once without feeling crowded.

### Text color rules

- **Primary text** (titles, body): `text-foreground`
- **Secondary text** (subtitles, descriptions): `text-muted-foreground`
- **Tertiary text** (captions, timestamps): Use a lighter muted tone
- **Links and actions**: `text-primary`

Never hardcode colors like `text-gray-500`. Always use semantic tokens.

### Capitalization

Follow Monday.com's approach:
- **Sentence case for everything.** "Manage your projects" not "Manage Your Projects"
- **No ALL CAPS for emphasis.** Only the Label role uses uppercase.
- **No title case** except in the Label role.

---

## 3. Cards — One Look, Every Card

This is the #1 source of inconsistency. Lock it down.

**Every card in the app uses these exact classes:**

```tsx
<div className="rounded-xl border border-border bg-card p-5 space-y-3">
  {/* Card Title (text-base font-semibold) */}
  {/* Card Content */}
</div>
```

| Property       | Value             | Tailwind Class     | Why                                  |
|---------------|-------------------|--------------------|--------------------------------------|
| Padding       | 20px              | `p-5`              | Roomy but not wasteful               |
| Border radius | 12px              | `rounded-xl`       | Soft, modern, friendly               |
| Border        | 1px solid         | `border border-border` | Clean separation, not heavy      |
| Shadow        | None              | (no shadow class)  | Border-based design, like Monday.com |
| Background    | Card surface      | `bg-card`          | Semantic, supports dark mode         |
| Internal gap  | 12px              | `space-y-3`        | Keeps content grouped but breathing  |

**No shadows on cards.** We use borders, not shadows, as the primary
separation strategy. This is the Monday.com approach — flat, clean, border-
defined surfaces. Do not add `shadow-sm` or any shadow to cards.

**These values are non-negotiable.** If you're making a settings panel,
a data card, a list item card, a modal body, a sidebar section — they all
use `rounded-xl border border-border bg-card p-5 space-y-3`.

---

## 4. Spacing Scale

All spacing uses a 4px base. Here are the values you'll actually use:

| Tailwind | Pixels | Use for                                          |
|----------|--------|--------------------------------------------------|
| `1`      | 4px    | Tiny gaps (icon to text)                          |
| `1.5`    | 6px    | Tag padding, tight button padding                 |
| `2`      | 8px    | Inline gaps, compact elements side by side        |
| `3`      | 12px   | Inside cards between items, form field gaps        |
| `4`      | 16px   | Standard gap between related things               |
| `5`      | 20px   | Card padding (the card standard)                  |
| `6`      | 24px   | Gap between cards in a grid, section sub-gaps     |
| `8`      | 32px   | Between major page sections, page side padding    |
| `12`     | 48px   | Page top padding                                  |
| `16`     | 64px   | Hero-level breathing room                         |

**NEVER use arbitrary values.** No `p-[13px]`, `gap-[7px]`, `mt-[22px]`.
If something doesn't fit the scale, round to the nearest value.

### The Spacing Cheat Sheet

When in doubt, reach for these:

| Question                                  | Answer         |
|-------------------------------------------|----------------|
| Space inside a card?                      | `p-5` (20px)   |
| Space between items inside a card?        | `space-y-3` (12px) |
| Space between cards in a grid?            | `gap-6` (24px) |
| Space between page sections?              | `space-y-8` (32px) |
| Page side padding on mobile?              | `px-4` (16px)  |
| Page side padding on desktop?             | `px-8` (32px)  |
| Space between a section title and content?| `space-y-4` (16px) |
| Space between icon and text?              | `gap-2` (8px)  |

---

## 5. Page Layout

Every page follows this structure:

```tsx
<div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 lg:pt-12">
  <div className="space-y-8">
    {/* Page title */}
    {/* Section 1 */}
    {/* Section 2 */}
  </div>
</div>
```

| Setting          | Value                                      |
|------------------|--------------------------------------------|
| Max width        | `max-w-5xl` (64rem / 1024px) for most pages |
| Max width (data) | `max-w-7xl` (80rem) for dashboards/tables   |
| Max width (form) | `max-w-lg` (32rem) for auth/forms           |
| Side padding     | `px-4` mobile → `px-6` tablet → `px-8` desktop |
| Top padding      | `pt-6` mobile → `pt-8` tablet → `pt-12` desktop |
| Section gap      | `space-y-8` (32px between major sections)   |

### Card Grids

```tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {/* Cards here */}
</div>
```

The gap between cards is always `gap-6` (24px). Never `gap-4`, never `gap-8`
for card grids. This creates the right visual rhythm.

---

## 6. Buttons

| Variant      | When                               | Look                          |
|-------------|-------------------------------------|-------------------------------|
| Primary     | Main action (1 per visible area)    | Solid fill, high contrast     |
| Secondary   | Supporting action                   | Outline or muted fill         |
| Ghost       | Tertiary, cancel, navigation        | No background, text only      |
| Destructive | Delete, remove, dangerous stuff     | Red tones                     |

**Button sizing:**
- Default: `h-9 px-4 text-sm` — most buttons
- Small: `h-8 px-3 text-xs` — inline actions, table rows
- Large: `h-11 px-6 text-base` — hero CTAs, standalone forms

**Mobile (Capacitor):** Every tappable element must be at least 44×44px
in its touch area. Use min-height or padding to achieve this.

---

## 7. Form Fields

All form inputs share the same sizing:

| Property      | Value          | Tailwind                |
|--------------|----------------|-------------------------|
| Height       | 36px           | `h-9`                   |
| Padding-x    | 12px           | `px-3`                  |
| Font size    | 14px           | `text-sm`               |
| Border radius| 12px (match cards) | `rounded-xl`        |
| Border       | 1px            | `border border-input`   |

**Every input on the same page must be the same height.** A 36px input
next to a 40px dropdown looks broken.

**Labels** use the Label type role: `text-xs font-medium uppercase tracking-wide`.

---

## 8. Colors — Rules, Not Specific Hex Values

You pick the brand colors. This system tells you how to USE them:

**Always use semantic tokens:**
- `bg-background` — page base
- `bg-card` — card/surface (slightly different from page, or same with border)
- `bg-muted` — recessed areas, input backgrounds, code blocks
- `text-foreground` — primary text
- `text-muted-foreground` — secondary text
- `text-primary` — links, active states
- `border-border` — all borders

**Never hardcode hex values** like `bg-blue-500` or `text-gray-400`. If you
need a new semantic color, define it as a CSS variable first.

**Accent colors are rare.** The primary accent appears ONLY on: main CTA
button, active nav indicator, active toggles, focus rings, and links. If
accent color appears everywhere, it means nothing.

---

## 9. Shadows & Elevation

We use a flat, border-based design (like Monday.com). Shadows are reserved
for things that float above the page:

| Element          | Shadow         | Tailwind       |
|-----------------|----------------|----------------|
| Cards           | None           | (no shadow)    |
| Dropdowns       | Subtle         | `shadow-md`    |
| Modals          | Medium         | `shadow-lg`    |
| Toasts/popovers | Medium         | `shadow-lg`    |

**Do not add shadows to cards.** Borders handle separation.

---

## 10. Transitions

Keep it simple and consistent:

| Interaction    | Duration | Tailwind                        |
|---------------|----------|---------------------------------|
| Hover states  | 150ms    | `transition-colors duration-150`|
| Expand/collapse| 200ms   | `transition-all duration-200`   |
| Modal open    | 200ms    | `duration-200 ease-out`         |
| Modal close   | 150ms    | `duration-150 ease-in`          |

Never animate width/height directly — animate `transform` and `opacity`.

---

## 11. Mobile / Capacitor Rules

- Respect `safe-area-inset-*` on iOS (notch, home indicator)
- Bottom nav needs safe-area padding
- All tap targets minimum 44×44px
- No hover-only interactions — everything must work with tap
- Use `:active` states instead of `:hover` for touch feedback
- Text inputs must be at least 16px font to prevent iOS auto-zoom

---

## 12. Anti-Patterns — Things That Break Consistency

If you catch yourself doing any of these, STOP and fix it:

1. **One card has `p-4`, another has `p-6`.** ALL cards use `p-5`.
2. **A heading is `text-lg` here but `text-xl` there** for the same role.
   Map it to the type scale.
3. **Cards use `rounded-lg` but inputs use `rounded-md`.** Everything
   uses `rounded-xl`.
4. **Random margins** — `mt-3` here, `mt-5` there. Use the spacing scale.
5. **Color drift** — `text-gray-500` in one place, `text-gray-400` in
   another for the same purpose. Use semantic tokens.
6. **Mixed icon sizes** — 16px here, 20px there, 24px elsewhere. Standard
   is: inline icons 16px, standalone icons 20px, feature icons 24px.
7. **Shadows on cards** — we use borders, not shadows.
8. **Arbitrary Tailwind values** — `p-[13px]`, `text-[15px]`, `gap-[7px]`.
   Use the scale values.

---

## Quick Reference Card

Pin this to the top of your mental model when writing ANY UI code:

```
Font:             Figtree (400, 500, 600, 700)
Page title:       text-2xl font-bold tracking-tight
Section title:    text-lg font-semibold
Card title:       text-base font-semibold
Body text:        text-sm (14px)
Small text:       text-xs (12px)

Card:             rounded-xl border border-border bg-card p-5 space-y-3
Card grid gap:    gap-6
Section gap:      space-y-8
Page max width:   max-w-5xl (or max-w-7xl for data pages)
Page padding:     px-4 sm:px-6 lg:px-8

Buttons:          h-9 px-4 text-sm (default)
Inputs:           h-9 px-3 text-sm rounded-xl
Border radius:    rounded-xl (everywhere)

Shadows:          NONE on cards. Only on floating elements.
Transitions:      transition-colors duration-150
Mobile tap target: 44px minimum
```
