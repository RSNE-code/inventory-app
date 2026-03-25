---
name: design-inspiration
description: >
  Enforces a unified design system for spacing, typography, layout, and visual hierarchy
  across the entire application. Use this skill whenever creating, modifying, or reviewing
  any UI component, page, layout, card, modal, form, sidebar, header, or screen. Also
  trigger when the user mentions design consistency, spacing issues, font problems, visual
  polish, "make it look better", card alignment, padding, margins, layout symmetry, or
  anything related to the look-and-feel of the interface. This skill should fire on ANY
  UI work — not just explicit design requests. If you are writing JSX, TSX, or touching
  Tailwind classes, check this skill first. Even small component changes benefit from
  consistent tokens. When in doubt, use this skill — it is always relevant to frontend work.
---

# Design Inspiration

You are building UI for a user who is NOT a designer. They can tell when
something looks "off" but they can't tell you what's wrong in design terms.
Your job is to make every screen look like it belongs in the same app — with
the polish and consistency of Monday.com or Todoist.

**The user should never need to ask for design fixes.** If you follow this
skill, the output should look correct the first time.

## Stack Context

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 (CSS-based config in `globals.css`)
- **Components**: shadcn/ui
- **Mobile**: Capacitor (native iOS/Android wrapper)

## What To Do Every Time You Touch UI Code

### 1. Read the Design System

Before writing or changing any UI, read the full reference:

```
references/design-system.md
```

This file contains every decision already made for you: which font to use,
how big headings should be, how much space goes inside cards, how wide pages
should be. You don't need to make these choices — they're already made.

### 2. Check for Visual References

Look inside `visual-references/` for screenshots the user has provided.
These show what the app should FEEL like. Match their:
- Density (how packed or airy content looks)
- Card style (borders, shadows, roundness)
- Font weight (how bold or light headings look)
- Color intensity (muted vs vibrant)

If empty, rely purely on the design system reference.

### 3. Follow the Rules, No Exceptions

The design system is not a suggestion. It is the law. Specifically:

- **Same card = same look.** Every card in the app gets identical padding,
  border-radius, border, and internal spacing. No drifting.
- **Same heading level = same size.** A page title on one screen must look
  exactly like a page title on every other screen.
- **Same spacing everywhere.** If there's 24px between sections on one page,
  there's 24px between sections on every page.
- **No made-up values.** Every number (padding, margin, gap, font size) must
  come from the design system. Never eyeball it.

### 4. Self-Check Before Finishing

Before writing code to the file, check:

- Does every card look like every other card?
- Does every heading at the same level look identical?
- Is the spacing between sections consistent across the app?
- Are all colors from the theme? No random hex codes?
- On mobile, can you tap everything easily? (44px minimum touch targets)

If anything fails, fix it. Don't ship inconsistency.

## What This Skill Does NOT Do

- It does not override explicit user requests
- It does not apply to backend/API/database code
- It does not make brand/color decisions (that's up to the user)
