## Skill Invocation Gates — BLOCKING

These rules are non-negotiable. Skipping them will produce work that gets rejected.

---

### THE GOLDEN RULE — NO EXCEPTIONS

**You may NOT edit, write, or commit ANY file until you have invoked the relevant skill gate(s).**

This applies to ALL changes — no matter how small. "It's just data," "it's one line," "it's only config" are NOT valid reasons to skip. If you are about to call the Edit or Write tool, STOP and ask yourself: "Have I invoked the relevant skill for this change?" If the answer is no, invoke it FIRST.

**You may NOT commit or push code that was not produced through this process.** If you skipped a gate and already made edits, you must invoke the skill BEFORE committing. Code that bypassed the process must never be committed.

---

### Gate: UI / Frontend
**Trigger:** ANY file in `src/components/`, `src/app/` (pages), or ANY change that affects what users see — including data/config that populates UI (e.g., standard size lists, template definitions, display labels).
**Action:** Invoke `frontend-design` skill FIRST.

### Gate: API / Backend
**Trigger:** ANY file in `src/app/api/`, `src/lib/` (business logic), or server-side functions.
**Action:** Invoke `engineering-skills` (backend) FIRST.

### Gate: Architecture / New Modules
**Trigger:** New files, new directories, new patterns, or structural changes.
**Action:** Invoke `engineering-skills` (architecture or fullstack) FIRST.

### Gate: Database / Schema
**Trigger:** ANY change to `prisma/schema.prisma`, migrations, or seed files.
**Action:** Invoke `engineering-advanced-skills` (database design) FIRST.

### Gate: Security
**Trigger:** Auth, payments, API keys, environment variables, or access control.
**Action:** Invoke `engineering-advanced-skills` (security auditing) FIRST.

### Gate: Product / UX Decisions
**Trigger:** Feature prioritization, UX flow changes, or product decisions.
**Action:** Invoke `product-skills` (product manager, UX researcher, or product strategist) FIRST.

### Gate: Plan Amendments
**Trigger:** ANY revision to an existing plan based on user feedback — even "small" changes.
**Action:** Re-invoke the same skill gates that applied to the original plan BEFORE amending.

---

### How to apply:
1. **Before ANY Edit/Write tool call:** Identify which gates apply. Invoke them. No exceptions.
2. At the START of `/create-plan`: identify gates, invoke skills, include "Skill Inputs" section.
3. At the START of each `/implement` step: if the step touches a gated area, invoke the skill first.
4. For direct requests (no plan): invoke relevant skill(s) before writing any code.
5. If multiple gates apply (e.g., UI + API), invoke all — design first, then implement.
6. **Before committing:** Verify every changed file went through its skill gate. If any didn't, invoke the skill before committing.

### Common rationalizations that are NOT valid:
- "It's just adding data to an existing structure" — **NO.** Data that populates UI goes through `frontend-design`.
- "It's a one-line fix" — **NO.** One line can break the app. Invoke the skill.
- "The skill won't add anything for this" — **NO.** You don't get to decide that. Invoke it.
- "I'll invoke it after" — **NO.** The skill informs the work. After is too late.
- "The hook warned me but it's fine" — **NO.** The hook exists because you keep skipping. Listen to it.
