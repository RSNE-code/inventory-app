# Senior Product Manager QA + UX Review System

**Date:** 2026-03-22
**Status:** Implemented
**Priority:** High — directly addresses recurring UX issues that reach Gabe

---

## The Problem

Gabe keeps finding obvious UX issues that should be caught proactively:
- Buttons that look like plain text (not visually clickable)
- Layouts that overflow on mobile (375px)
- Misleading UX copy ("edit below" when editor is above)
- Design inconsistencies across pages (different tab styles, card shadows, color tokens)
- AI matching results missing expected items

Current e2e tests only test functional flows. `/qa` only covers functional correctness. Nothing systematically catches visual/UX quality issues.

---

## System Architecture — 4 Layers

```
Layer 1: Automated Scripts (npm scripts, CI-ready)
  scripts/ux-lint.ts              — Static UX anti-pattern linter
  scripts/token-audit.ts          — Design token consistency checker
  scripts/accessibility-check.ts  — Touch targets, contrast, semantics

Layer 2: Slash Commands (Claude-driven analysis)
  .claude/commands/ux-audit.md    — Full UX audit command
  .claude/commands/walkthrough.md — Workflow walkthrough simulation

Layer 3: Enhanced /qa
  .claude/commands/qa.md          — Add Phase 7: UX Quality

Layer 4: Proactive Integration
  .claude/commands/implement.md   — Add UX verification after UI changes
  reference/ux-checklist.md       — Checklist Claude consults after any UI work
```

---

## Layer 1: Automated Scripts

### `scripts/ux-lint.ts` — UX Anti-Pattern Linter

| Check | Rule | Detection |
|-------|------|-----------|
| UX-001 | Clickable elements without visual affordance | `<button` or `onClick` lacking `bg-`, `border-`, `shadow-`, or `underline` |
| UX-002 | Div/span with onClick (should be button/a) | `<(div|span)[^>]*onClick` |
| UX-003 | Text-only buttons (no icon, no bg, no border) | `<button` with only text/font classes |
| UX-004 | Too many flex children without wrapping | `flex` without `flex-wrap` with 4+ siblings |
| UX-005 | Hardcoded widths that overflow 375px | `w-[` values > 350px |
| UX-006 | Missing minimum touch target | Interactive elements without h-10+ |
| UX-007 | Horizontal scroll without indicators | `overflow-x-auto` without scroll indicator |

### `scripts/token-audit.ts` — Design Token Checker

| Check | Rule | Flags |
|-------|------|-------|
| TK-001 | Off-brand text colors | `text-gray-*` → `text-text-{primary\|secondary\|muted}` |
| TK-002 | Off-brand backgrounds | `bg-gray-*` → `bg-surface`, `bg-surface-secondary` |
| TK-003 | Off-brand borders | `border-gray-*` → `border-border-custom` |
| TK-004 | Inconsistent shadows | `shadow-sm/md/lg` → `shadow-brand`/`shadow-brand-md` |
| TK-005 | Inconsistent radius on cards | `rounded-md/lg` → `rounded-xl` |
| TK-006 | Raw hex colors | `bg-[#...]` → use a token |

### `scripts/accessibility-check.ts` — Accessibility Checker

| Check | Rule |
|-------|------|
| A11Y-001 | Buttons/links without accessible text |
| A11Y-002 | Images without alt text |
| A11Y-003 | Form inputs without labels |
| A11Y-004 | Icon-only buttons without aria-label |
| A11Y-005 | Color-only status indicators |
| A11Y-006 | Touch targets < 44px |

### npm scripts
```json
"ux:lint": "tsx scripts/ux-lint.ts",
"ux:tokens": "tsx scripts/token-audit.ts",
"ux:a11y": "tsx scripts/accessibility-check.ts",
"ux:all": "tsx scripts/ux-lint.ts && tsx scripts/token-audit.ts && tsx scripts/accessibility-check.ts"
```

---

## Layer 2: Slash Commands

### `/ux-audit` — Full UX Audit

6-phase comprehensive review:

1. **Run Automated Scripts** — capture baseline findings
2. **Design Token Consistency** — manual review of every page for token/pattern consistency
3. **Button Affordance Audit** — classify every clickable element as PRIMARY/SECONDARY/GHOST/INVISIBLE/DIV-CLICK
4. **Mobile Layout Feasibility** — mentally render at 375px, flag overflow risks
5. **Copy & Labeling Review** — check button labels, directional references, error messages, empty states
6. **Navigation & Flow Review** — back buttons, location clarity, destructive action confirmations

Output: `outputs/ux-audit-YYYY-MM-DD.md`

### `/walkthrough [workflow]` — Workflow Simulation

Predefined workflows:
- `bom-creation` — Job picker → Photo → AI → Review → Create
- `bom-photo` — Photo capture → Upload → Processing → Results
- `bom-checkout` — Open BOM → Checkout All → Confirm → Complete
- `receiving` — Input → Parse → PO match → Review → Confirm
- `door-creation` — Entry → Type select → Interview → Confirm
- `inventory-adjust` — Select → Direction → Quantity → Submit
- `cycle-count` — View due → Start → Enter → Submit → Review

At each step, evaluates: Discoverability, Feedback, Error recovery, Data clarity, Mobile usability, Edge cases.

Output: `outputs/walkthrough-{workflow}-YYYY-MM-DD.md`

---

## Layer 3: Enhanced `/qa`

Add **Phase 7: UX Quality** to existing `qa.md`:
1. Run all 3 UX scripts
2. Button affordance spot-check (5 random pages)
3. Mobile overflow spot-check (5 random pages)
4. Copy consistency spot-check
5. Design consistency score (1-10)

---

## Layer 4: Proactive Integration

### `/implement` Enhancement — Phase 3b: UX Verification

After any step that touches `.tsx` files:
1. Run token audit on changed files only
2. Run button affordance check on changed files
3. Mobile sanity check at 375px
4. Copy review of new/changed strings
5. Design consistency check vs similar existing components

**Fix issues BEFORE marking step complete.**

### `reference/ux-checklist.md` — Quick Reference

Checklist covering: Visual affordance, Design tokens, Mobile (375px), Copy, Consistency.
Claude consults this after every UI change.

---

## Build Order (prioritized)

| Priority | Item | Why |
|----------|------|-----|
| **P1** | `reference/ux-checklist.md` | Zero-effort win — once it exists, Claude consults it after every UI change |
| **P1** | Modify `implement.md` (add Phase 3b) | Proactive behavior that prevents issues from reaching Gabe |
| **P2** | `scripts/token-audit.ts` | 105+ occurrences of `text-gray-*` — most prevalent design inconsistency |
| **P2** | `scripts/ux-lint.ts` | Catches structural UX issues (div onClick, missing affordance, overflow) |
| **P2** | `package.json` script additions | Wire up npm commands |
| **P3** | `.claude/commands/ux-audit.md` | Full comprehensive sweep on demand |
| **P3** | Modify `qa.md` (add Phase 7) | Integrate UX into existing QA flow |
| **P4** | `.claude/commands/walkthrough.md` | Deep workflow tracing |
| **P5** | `scripts/accessibility-check.ts` | Important but lower priority for internal team app |
| **P6** | Update `CLAUDE.md` | Document new commands |

---

## Future Enhancements

- **Screenshot-based validation:** Use Playwright to render every page at 375px, screenshot, and let Claude visually inspect
- **Custom walkthrough flows:** Freeform mode where you specify a starting URL
- **CI integration:** Add `npm run ux:all` to GitHub Actions
- **Design system enforcement:** Block builds when off-brand tokens are found (after cleanup)
