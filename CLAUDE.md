# CLAUDE.md

## Skill Usage Rules — BLOCKING

Skill gates are enforced via `.claude/rules/skill-gates.md` — read it. The full gate table, triggers, and process are there. Summary:

- **UI/frontend** → `frontend-design` + `design-inspiration` first
- **API/backend/architecture** → `engineering-skills` first
- **Schema/security/infra** → `engineering-advanced-skills` first
- **Product/UX decisions** → `product-skills` first
- **Every session** → `/si:review` periodically to keep memory clean

**The process, always:** Skill Gate → Write Code → QA → Commit/Push. No shortcuts.

---

## The Claude-User Relationship

Claude is the **sole developer**. Gabe is the owner/product director — no coding experience, does not review code or manage infrastructure.

- **Gabe**: Product direction, priorities, feedback.
- **Claude**: All technical decisions, all code, all infrastructure. Never asks Gabe technical questions. If something needs doing, Claude does it or gives exact click-by-click instructions when identity is required.

---

## Workspace Structure

```
.
├── CLAUDE.md              # This file
├── .claude/
│   ├── commands/          # /prime, /create-plan, /implement, /qa, /ux-audit, /walkthrough, /si:*
│   └── rules/             # Scoped rule files (skill-gates, design-references, workflow-conventions)
├── context/               # PRD, project goals, tech stack, AI module, project status
├── plans/
│   ├── active/            # Draft or in-progress plans
│   └── completed/         # Implemented plans (historical reference)
├── outputs/               # qa-reports/, audits/, data/, images/
├── reference/             # docs/, data/, images/
└── scripts/               # UX lint, token audit, accessibility check
```

After any workspace change, check: does CLAUDE.md, context/, or reference/ need updating?

---

## Commands

| Command | Purpose |
|---------|---------|
| `/prime` | Initialize session — reads CLAUDE.md + context files |
| `/create-plan [request]` | Create a dated plan in `plans/active/` before making changes |
| `/implement [plan-path]` | Execute a plan step-by-step with QA at each step |
| `/ux-audit [focus]` | UX quality audit — runs `npm run ux:all` + manual review |
| `/walkthrough [workflow]` | Simulate a user workflow, identify friction points |
| `/si:review` | Audit auto-memory — find promotion candidates, stale entries |
| `/si:promote` | Graduate a memory pattern → CLAUDE.md or `.claude/rules/` |
| `/si:status` | Memory health dashboard |
| `/si:remember` | Explicitly save knowledge to auto-memory |
| `/si:extract` | Turn a proven pattern into a reusable skill |

**Session workflow:** `/prime` → work → `/create-plan` for significant changes → `/implement` → commit/push.

**UX scripts:** `npm run ux:lint` · `npm run ux:tokens` · `npm run ux:a11y` · `npm run ux:all`

---

## RSNE Inventory App

Context files — read when working on the app:

| File | Contents |
|------|----------|
| `context/tech-stack.md` | Tech stack, architecture rules, run commands |
| `context/ai-module.md` | AI module structure, door sheet system |
| `context/project-status.md` | Phase completion status, deployment info |

---

## UI Rules

**Don't over-redesign.** Make minimal, targeted changes. If the original works, keep it.

Locked patterns (do not change without explicit request):
- PO cards: navy badge, job name on its own line with Briefcase icon, Building2 supplier icon
- Mic button: simple Mic/MicOff toggle (no animated orbs or Shazam-style redesigns)
- Attribute pills: full-size with icons (no compact/dot-separator variants)

**No breadcrumbs** in workflow pages. The Header `showBack` prop is the only navigation needed.

**Consistent data structure.** Every data display must show the same columns/rows for all items. Never conditionally hide empty fields — show "Not specified" instead. Think of it like a table: every row must have the same columns.

Changes that reduce readability or break established layout patterns will be rejected.

**Never use `router.push()` for card/item click navigation.** It silently fails in this app. Always use `window.location.href = \`/path/${id}\`` in onClick handlers. This has broken twice — once for the New Door button, once for AssemblyCard + BomCard refactors. `<Link>` wrappers are fine for simple cases, but when the card has interactive children (buttons, badges) that need `stopPropagation`, use `window.location.href` on the parent.

---

## Workflow Rules

**Always commit and push after implementation.** After any code changes: `git add` the specific files, commit with a descriptive message, push to `origin/main`. Do not wait to be asked.

**Mirror existing workflows element-by-element.** Before building a new workflow that parallels an existing one, read the existing workflow file line-by-line and make an explicit checklist of every UI element. Copy exact patterns (classes, structure, icons) — don't recreate from memory. See `.claude/rules/workflow-conventions.md`.
