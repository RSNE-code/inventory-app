# UX Audit — Full App UX Quality Review

Run a comprehensive UX quality audit across the RSNE Inventory App. Goes beyond functional testing to catch visual, usability, and design consistency issues.

## Variables

focus: $ARGUMENTS (optional: "all", "boms", "receiving", "inventory", "assemblies", "dashboard", "settings", "cycle-counts")

---

## Instructions

You are performing a UX quality audit. Be thorough, systematic, and report every issue — no matter how small. **DO NOT fix anything.** Your job is to find and report problems.

**IMPORTANT:** This is a READ-ONLY audit. Do not edit any files. Only read, analyze, and report.

---

### Phase 1: Run Automated Scripts

Run all three UX scripts and capture output:

1. `npx tsx scripts/token-audit.ts 2>&1` — Design token consistency
2. `npx tsx scripts/ux-lint.ts 2>&1` — UX anti-patterns
3. `npx tsx scripts/accessibility-check.ts 2>&1` — Accessibility issues

Include all script findings in the final report as baseline.

---

### Phase 2: Design Token Consistency (manual review)

Read `src/app/globals.css` to refresh the canonical token list. Then read every page component and check:

- Are tabs/segmented controls consistent across pages? (segmented style, not underline)
- Are card shadows consistent? (all using `shadow-brand` or `shadow-brand-md`)
- Are CTAs using `bg-brand-orange` consistently?
- Are secondary actions using `bg-brand-blue` consistently?
- Is spacing consistent? (p-4 on cards, gap-3 or gap-4 between cards)
- Are status badges using the same component/colors as elsewhere?
- Are filter pills using the same active/inactive pattern? (brand-blue active, surface-secondary inactive)

---

### Phase 3: Button Affordance Audit

For every page, identify every clickable element and classify it:

- **PRIMARY:** Has `bg-brand-orange` or `bg-navy` + visible padding + rounded corners → GOOD
- **SECONDARY:** Has `bg-brand-blue` or visible `border` + padding → GOOD
- **GHOST:** Has `hover:bg-*` but no resting visual state → ACCEPTABLE only if icon button with clear icon
- **INVISIBLE:** Has `onClick` but no visual affordance (no bg, border, shadow) → BAD — flag it
- **DIV-CLICK:** Uses `<div>` or `<span>` with onClick instead of `<button>` → BAD — flag it

Flag every INVISIBLE and DIV-CLICK as errors.

---

### Phase 4: Mobile Layout Feasibility

For every page, mentally render at 375px width:

- Count horizontal flex items at each level. Flag rows with > 3 items without wrapping.
- Check for fixed-width elements that would overflow.
- Check for text truncation that hides critical info (job names, product names).
- Check that primary CTAs are full-width or at least prominent on mobile.
- Check that bottom nav (h-16) doesn't overlap content (need pb-20).
- Check that sticky bottom bars don't collide with bottom nav.
- Check that labels stack above controls on narrow screens, not side-by-side with long labels.

---

### Phase 5: Copy & Labeling Review

For every page, read all user-facing text:

- Do button labels clearly describe the action? ("Create BOM" not just "Submit")
- Are directional references correct? ("edit below" when it's actually above?)
- Are error messages helpful? (not just "Error occurred")
- Are empty states descriptive? (not just blank space)
- Is loading text appropriate? ("Finding matches..." not just "Loading...")
- Are confirmation messages clear? (what exactly is being confirmed?)

---

### Phase 6: Navigation & Flow Review

- Can the user always go back from any screen?
- Is the current location always clear (breadcrumbs, active nav item, header title)?
- Are destructive actions behind confirmation dialogs?
- Are success states communicated (toast, animation, redirect)?
- Can the user recover from errors? (retry buttons, clear error states)

---

## Output Format

Produce a structured report:

```markdown
# UX Audit Report — RSNE Inventory App
**Date:** YYYY-MM-DD
**Focus:** {focus area}

## Summary
- X critical issues (broken UX, unusable features)
- X major issues (confusing, misleading, or inconsistent)
- X minor issues (polish, consistency, accessibility)
- X suggestions (improvements, not bugs)

## Automated Script Results
### Token Audit
(paste output)
### UX Lint
(paste output)
### Accessibility Check
(paste output)

## Critical Issues
### [C1] Title
- **File:** path/to/file.tsx:line
- **Description:** What's wrong
- **Impact:** How this affects the user
- **Fix:** What should change

## Major Issues
### [M1] Title
...

## Minor Issues
### [m1] Title
...

## Suggestions
### [S1] Title
...

## Design Consistency Score: X/10
Justification for the score.
```

Save the report to `outputs/ux-audit-YYYY-MM-DD.md`.

---

## Execution Strategy

- Use parallel agents where possible:
  - Agent 1: Run automated scripts (Phase 1)
  - Agent 2: Button affordance audit (Phase 3)
  - Agent 3: Mobile layout audit (Phase 4)
  - Agent 4: Copy & navigation review (Phase 5 + 6)
- After parallel agents complete, do Phase 2 (design consistency) yourself
- Compile all findings into the final report
