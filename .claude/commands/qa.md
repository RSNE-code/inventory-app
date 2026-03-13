# QA — Full App Quality Check

Run a comprehensive quality assurance audit across the entire RSNE Inventory App. Test every layer: types, builds, API routes, UI flows, data consistency, imports, and logic.

## Variables

focus: all (optional focus area: "all", "api", "ui", "types", "flows", "doors", "boms", "receiving", "inventory")

---

## Instructions

You are performing a full QA audit of the RSNE Inventory App (`rsne-inventory/`). Be thorough, systematic, and report every issue you find — no matter how small. DO NOT fix anything. Your job is to find and report problems.

**IMPORTANT:** This is a READ-ONLY audit. Do not edit any files. Only read, analyze, and report.

---

### Phase 1: Build & Type Safety

1. **TypeScript compilation** — Run `cd rsne-inventory && npx tsc --noEmit 2>&1` and report ALL errors
2. **Production build** — Run `npm run build 2>&1` and report ALL warnings and errors
3. **Prisma schema sync** — Run `npx prisma validate 2>&1` and check for schema issues

Report:
- Every type error with file path and line number
- Every build warning or error
- Any schema validation issues

---

### Phase 2: Import & Export Consistency

For each layer, verify all imports resolve correctly:

1. **Read every file in `src/lib/`** — Check that all exported functions/types are used somewhere. Check that all imports in these files resolve to real exports.
2. **Read every file in `src/hooks/`** — Verify each hook's API route path matches an actual route in `src/app/api/`. Check that response shapes match what the hook expects.
3. **Read every file in `src/components/`** — Check that all imported lib functions, hooks, and types exist and match their definitions.
4. **Dead exports** — Flag any exported function/type/constant that is never imported by another file (use grep to verify).

Report:
- Missing imports (imported but doesn't exist)
- Unused exports (exported but never imported)
- Shape mismatches between hooks and API routes

---

### Phase 3: API Route Audit

For EVERY route file in `src/app/api/`:

1. **Read the route file** and check:
   - Does it call `requireAuth()`?
   - Does it validate input with Zod?
   - Does it handle errors properly (ZodError → 400, "Unauthorized" → 401, other → 500)?
   - Are Prisma queries correct? (correct model names, correct field names per schema.prisma)
   - Does it return `{ data: ... }` consistently?
   - Are there any SQL injection or input validation gaps?

2. **Cross-reference with Prisma schema** — Read `prisma/schema.prisma` and verify:
   - Every model field referenced in API routes actually exists in the schema
   - Every relation used in `include` blocks is valid
   - Decimal fields are handled correctly (not treated as plain numbers)
   - Date fields are properly converted (string → Date)

3. **Cross-reference with hooks** — For each API route, find the corresponding hook in `src/hooks/` and verify:
   - The HTTP method matches (GET/POST/PUT/PATCH/DELETE)
   - The URL path matches
   - The request body shape matches the Zod schema
   - The response shape matches what the hook destructures

Report:
- Auth gaps (routes missing requireAuth)
- Validation gaps (routes not validating input)
- Schema mismatches (API references non-existent fields)
- Hook/route mismatches (different URLs, methods, or shapes)
- Error handling inconsistencies

---

### Phase 4: UI Flow Audit

Test the logical flow of every major user-facing feature by reading the components:

#### 4a. Door Creation Flow
- Read `door-creation-flow.tsx`, `door-builder.tsx`, `door-confirmation.tsx`
- Trace every possible path through the wizard:
  - ENTRY → BUILDER → TYPE → Swing branch (all steps) → CONFIRM → Submit
  - ENTRY → BUILDER → TYPE → Slider branch (all steps) → CONFIRM → Submit
  - ENTRY → TEMPLATE_SELECT → select template → CONFIRM → Submit
- Check: Can the user get stuck? Are there unreachable states? Does back navigation work from every step?
- Check: Does the state machine in door-builder.tsx cover all transitions?
- Check: Are all DoorSpecs fields properly passed from builder → confirmation → submission?
- Check: Does `calculateHeaterCable()` handle edge cases (0 dimensions, non-freezer, missing fields)?
- Check: Is `getStandardHardware()` called with correct args at the right time?

#### 4b. BOM Flow
- Read `bom-ai-flow.tsx`, `bom-confirmation-card.tsx`, `checkout-all-button.tsx`
- Trace: Create BOM → add items → confirm → submit
- Trace: Open BOM → checkout all → confirmation → complete
- Trace: Open BOM → return items
- Check: Does tier logic (TIER_1 vs TIER_2) work correctly?
- Check: Are quantities properly converted via `toPurchaseQty()`?

#### 4c. Receiving Flow
- Read `receiving-flow.tsx`, `receiving-confirmation-card.tsx`, `receipt-summary.tsx`
- Trace: INPUT → parse (text/voice/photo) → REVIEW → edit quantities → SUMMARY → confirm
- Check: Does supplier matching work? Are costs properly tracked?

#### 4d. Inventory Management
- Read inventory pages and components
- Check: CRUD operations (create, read, update, adjust)
- Check: Stock adjustment flow (adjust up/down with reason)
- Check: Category filter, search, pagination

#### 4e. Assembly/Fabrication Flow
- Read assembly pages and hooks
- Check: Queue display, status transitions, approval flow
- Check: Material deduction on build start
- Check: Door spec sheet and manufacturing sheet display

#### 4f. Dashboard & Cycle Counts
- Read dashboard page and components
- Check: Alert logic (low stock, approvals, cycle counts due)
- Read cycle count page
- Check: Variance calculation, count submission

Report:
- Dead-end states (user can get stuck with no way forward or back)
- Unreachable code paths
- State management bugs (state not reset, stale state)
- Missing error handling in UI (what happens when API calls fail?)
- Missing loading states
- Accessibility issues (missing labels, non-interactive elements used as buttons)
- Inconsistent UX patterns across flows

---

### Phase 5: Data Integrity & Business Logic

1. **Stock management** — Read `src/lib/stock.ts` and verify:
   - All transaction types are handled
   - `currentQty` is always updated atomically (Prisma transaction)
   - WAC recalculation is correct
   - No path exists to update `product.currentQty` outside of `adjustStock()`

2. **Cost calculations** — Read `src/lib/cost.ts` and verify:
   - WAC formula is correct
   - Edge cases: zero quantity, zero cost, first receipt

3. **Unit conversions** — Read `src/lib/units.ts` and verify:
   - `getDisplayQty()` and `toPurchaseQty()` are inverses
   - All unit types handled (ft, in, sq ft)
   - Edge cases: missing dimensions, zero values

4. **Door specs** — Read `src/lib/door-specs.ts` and verify:
   - `getStandardHardware()` covers all door sizes
   - `calculateHeaterCable()` formula is correct
   - `findSpecGaps()` catches all required fields
   - `resolveGapAnswer()` handles all field types
   - New fields (cutouts, sillHeight, frameCustom, etc.) are properly typed

5. **AI parsing** — Read `src/lib/ai/parse.ts`, `catalog-match.ts`, `parse-door-specs.ts`:
   - Are parsed results properly validated before use?
   - Can malformed AI responses crash the app?
   - Is the catalog matching logic sound?

Report:
- Business logic errors
- Race conditions or atomicity issues
- Edge cases that would cause crashes or data corruption
- Missing validation at system boundaries

---

### Phase 6: Cross-Cutting Concerns

1. **Error boundaries** — Are there error boundaries? What happens when a component throws?
2. **Loading states** — Does every page that fetches data show a loading indicator?
3. **Empty states** — Does every list/grid handle the "no items" case?
4. **Mobile responsiveness** — Check for hardcoded widths, overflow issues, touch targets too small
5. **Environment variables** — Are all required env vars referenced? Any secrets in client code?
6. **Security** — Check for XSS vectors (dangerouslySetInnerHTML, unescaped user input), auth bypass, IDOR vulnerabilities

Report:
- Missing error boundaries
- Missing loading/empty states
- Responsive design issues
- Security vulnerabilities

---

## Output Format

Produce a structured report with severity levels:

```markdown
# QA Report — RSNE Inventory App
**Date:** YYYY-MM-DD
**Focus:** {focus area}

## Summary
- X critical issues found
- X major issues found
- X minor issues found
- X suggestions

## Critical Issues (app crashes, data loss, security)
### [C1] Title
- **File:** path/to/file.ts:line
- **Description:** What's wrong
- **Impact:** What breaks
- **Reproduction:** How to trigger it

## Major Issues (broken flows, wrong data, bad UX)
### [M1] Title
...

## Minor Issues (cosmetic, inconsistency, missing polish)
### [m1] Title
...

## Suggestions (not bugs, but improvements)
### [S1] Title
...

## Files Audited
- List every file that was read and checked
```

---

## Execution Strategy

- Use **parallel agents** wherever possible to speed up the audit:
  - Agent 1: Build & type safety (Phase 1)
  - Agent 2: API route audit (Phase 3)
  - Agent 3: UI flow audit (Phase 4)
  - Agent 4: Business logic audit (Phase 5)
- After parallel agents complete, do Phase 2 (imports) and Phase 6 (cross-cutting) yourself
- Compile all findings into the final report
- Save the report to `outputs/qa-report-YYYY-MM-DD.md`

If the `focus` variable is set to something other than "all", only run the relevant phases for that area. For example:
- `focus: doors` → Phase 1 + Phase 4a + door-related parts of Phase 5
- `focus: api` → Phase 1 + Phase 3
- `focus: flows` → Phase 4 (all sub-sections)
