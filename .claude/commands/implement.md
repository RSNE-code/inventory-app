# Implement

Execute an implementation plan created by `/create-plan`. Read the plan thoroughly, execute each step in order, and report on the completed work.

## Variables

plan_path: $ARGUMENTS (path to the plan file, e.g., `plans/2026-01-28-add-guest-research-command.md`)

---

## Instructions

### Phase 1: Understand the Plan

1. **Read the plan file completely.** Do not skim — understand every section.
2. **Verify prerequisites:**
   - Are there open questions that need answers before proceeding?
   - Are there dependencies on external resources or user decisions?
   - If blockers exist, stop and ask the user before proceeding.
3. **Confirm the plan is ready:**
   - Status should be "Draft" or "Ready"
   - All sections should be filled out (no placeholder text remaining)

---

### Phase 2: Execute the Plan

1. **Follow the Step-by-Step Tasks in exact order.**
   - Complete each step fully before moving to the next
   - If a step involves creating a file, write the complete file — not a stub
   - If a step involves modifying a file, read the file first, then apply changes precisely

2. **Skill gate check — BEFORE writing code for each step:**
   - Does this step touch UI/frontend? → Invoke `frontend-design` skill before writing UI code for this step.
   - Does this step touch API/backend? → Invoke `engineering-skills` (backend) before writing API code for this step.
   - Does this step touch database/schema? → Invoke `engineering-advanced-skills` (database design) before writing schema changes.
   - Does this step touch security? → Invoke `engineering-advanced-skills` (security auditing) before writing security code.
   - If the plan already has a "Skill Inputs" section and the skill was invoked during planning, you may skip re-invocation for that same area UNLESS the implementation has diverged from the plan.

3. **For each task:**
   - Read any files that will be affected
   - Make the changes specified
   - Verify the change is correct before proceeding

3. **Handle issues gracefully:**
   - If a step can't be completed as written, note the issue and adapt if the intent is clear
   - If you're unsure how to proceed, ask the user rather than guessing
   - Document any deviations from the plan

---

### Phase 3b: UX Verification (after any UI change)

If ANY step in the plan touched UI components (`.tsx` files in `src/components/` or `src/app/`):

1. **Read `reference/docs/ux-checklist.md`** and run through every checkbox on the changed files.

2. **Run token audit on changed files:**
   Run `npx tsx scripts/token-audit.ts` (if the script exists). Otherwise, manually check each changed `.tsx` file for off-brand tokens: `text-gray-*`, `bg-gray-*`, `border-gray-*`, `shadow-sm/md/lg`, `rounded-md/lg` on cards.

3. **Run button affordance check on changed files:**
   For every `<button>` or element with `onClick` in changed files, verify it has visual affordance (bg color, border, or shadow). Flag any that look like plain text.

4. **Mobile sanity check:**
   For each changed page/component, mentally render at 375px and flag:
   - Horizontal overflow risks (too many flex items, no wrapping)
   - Touch targets < 44px
   - Text that would truncate and hide critical info
   - Labels beside controls that should stack on mobile

5. **Copy review:**
   Read all new/changed user-facing strings. Flag:
   - Vague button labels (just "OK", "Submit")
   - Directional references ("below", "above", "here") that may be wrong
   - Missing error/empty state messages

6. **Design consistency check:**
   Compare the changed component's styling to similar existing components. Flag inconsistencies in: card shadows, border radius, spacing, color tokens, tab styles, filter pills.

**CRITICAL:** Fix ALL issues found BEFORE marking the step complete. Do not leave UX issues for a separate pass.

---

### Phase 3: Validate

1. **Run through the Validation Checklist** from the plan
   - Check off each item
   - Note any that fail

2. **Verify Success Criteria** are met
   - Confirm each criterion is satisfied
   - Note any gaps

3. **Check cross-references and consistency:**
   - Ensure new files are referenced where they should be
   - Verify CLAUDE.md is updated if workspace structure changed
   - Confirm naming conventions are followed

---

### Phase 4: Update Plan Status

After implementation, update the plan file:

1. Change `**Status:** Draft` to `**Status:** Implemented`
2. Add an Implementation Notes section at the end:

```markdown
---

## Implementation Notes

**Implemented:** <YYYY-MM-DD>

### Summary

<Brief summary of what was done>

### Deviations from Plan

<List any changes made during implementation, or "None">

### Issues Encountered

<List any problems hit and how they were resolved, or "None">
```

---

## Quality Standards

- **Thoroughness:** Every step in the plan is executed, not skipped
- **Precision:** Changes match what the plan specifies
- **Completeness:** Files are fully written, not stubbed out
- **Consistency:** All cross-references and documentation updated
- **Traceability:** Deviations are documented

---

## Report

After implementation, provide:

1. **Summary:** Bulleted list of work completed
2. **Files changed:** List all files created, modified, or deleted
3. **Validation results:** Status of each checklist item
4. **Deviations:** Any changes from the original plan
5. **Next steps:** Any follow-up actions needed (if applicable)

Format:

```
## Implementation Complete

### Summary
- <What was done>
- <What was done>

### Files Changed
**Created:**
- `path/to/new-file.md`

**Modified:**
- `path/to/modified-file.md`

**Deleted:**
- (none)

### Validation
- [x] <Passed check>
- [x] <Passed check>

### Deviations from Plan
<None, or list deviations>

### Plan Status
Updated `plans/YYYY-MM-DD-{name}.md` status to "Implemented"
```
