## Skill Invocation Gates — BLOCKING

These rules are non-negotiable. Skipping them will produce work that gets rejected.

### Before ANY plan or code that touches UI/frontend:
STOP. Invoke `frontend-design` skill FIRST. Use its output to inform component design, layout, and interaction patterns. Do not write UI code or plan UI changes without this step.

### Before ANY plan or code that touches API routes or backend logic:
STOP. Invoke `engineering-skills` (backend) skill FIRST. Use its output for API design patterns, validation, and error handling.

### Before ANY plan or code that involves architecture decisions or new modules:
STOP. Invoke `engineering-skills` (architecture or fullstack) skill FIRST. Use its output for system design, module boundaries, and data flow.

### Before ANY plan or code that touches database schema or migrations:
STOP. Invoke `engineering-advanced-skills` (database design) skill FIRST. Use its output for schema changes, migration safety, and data integrity.

### Before ANY plan or code that touches auth, payments, API keys, or security:
STOP. Invoke `engineering-advanced-skills` (security auditing) skill FIRST. Use its output to identify and prevent vulnerabilities.

### Before ANY product decision, feature prioritization, or UX flow:
STOP. Invoke `product-skills` (product manager, UX researcher, or product strategist) skill FIRST. Use its output to validate the approach from a user-centered perspective.

### Before ANY plan amendment or revision based on user feedback:
STOP. Re-invoke the same skill gates that applied to the original plan BEFORE making changes. User feedback (e.g., "keep it at panels", "change the layout", "add a field") is new input that must go through the same skill process. Do not amend or update a plan on your own without running the relevant skills first — even if the change seems small.

### How to apply:
1. At the START of `/create-plan`: identify which skill gates apply, invoke them, and include a "Skill Inputs" section in the plan documenting what each skill contributed.
2. At the START of each `/implement` step: if the step touches a gated area, invoke the relevant skill before writing code for that step.
3. For direct requests (no plan): invoke the relevant skill(s) before writing any code.
4. If multiple gates apply (e.g., UI + API), invoke all relevant skills — design first, then implement.
5. When user provides feedback or refinements to an existing plan: re-invoke the relevant skill gates before amending the plan. The skills must process the new input just as they would for the original plan.
