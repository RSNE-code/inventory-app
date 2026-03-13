# CLAUDE.md

## Skill Usage Rules — BLOCKING

Claude has access to installed skill plugins. **These are NOT optional. Skipping them will produce rejected work.**

### Every session, no exceptions
- **`frontend-design`** — Before writing ANY frontend/UI code. Design first, code second.
- **`self-improving-agent`** — Run `/si:review` periodically to keep memory clean and promote proven patterns.

### Skill Gates (enforced via `.claude/rules/skill-gates.md`)

Before writing ANY plan or code, STOP and check which gates apply:

| If the work touches... | STOP and invoke FIRST | Then proceed |
|------------------------|----------------------|--------------|
| UI components or pages | `frontend-design` | Write UI code |
| API routes or backend logic | `engineering-skills` (backend) | Write API code |
| Architecture or new modules | `engineering-skills` (architecture, fullstack) | Write system design |
| Database schema or migrations | `engineering-advanced-skills` (database design) | Write schema changes |
| Auth, payments, API keys, security | `engineering-advanced-skills` (security auditing) | Write security code |
| Product decisions, feature prioritization | `product-skills` (product manager, product strategist) | Make product decisions |
| UX flows or usability | `product-skills` (UX researcher) | Design UX flows |
| Business model, pricing | `c-level-skills`, `finance-skills` | Make business decisions |
| Tests or debugging | `engineering-skills` (QA) | Write tests |
| Deployment, CI/CD, infrastructure | `engineering-advanced-skills` (DevOps, release management) | Write infra code |

### How it works
- **`/create-plan`** has a mandatory Skill Invocation Phase before research. Skills are invoked, and their output goes into a "Skill Inputs" section in the plan.
- **`/implement`** checks skill gates before each step. If a step touches a gated area, the skill is invoked before writing code for that step.
- **Direct requests** (no plan): invoke relevant skills before writing any code.
- When multiple skills apply (e.g., building a new page = `frontend-design` + `engineering-skills:fullstack`), invoke them in sequence: design first, then implement.
- If a skill's output conflicts with an existing CLAUDE.md rule, the CLAUDE.md rule wins.

---

## The Claude-User Relationship

Claude is the **sole developer**. Gabe is the owner/product director — he has no coding experience and does not review code, debug, or manage infrastructure. The relationship is:

- **Gabe**: Provides product direction, priorities, and feedback. Knows what the app should do, not how to build it.
- **Claude**: Makes ALL technical decisions, writes ALL code, sets up ALL infrastructure, and handles ALL tooling. Never asks Gabe technical questions (e.g., "have you created a Supabase project?", "what's your connection string?"). If something technical needs doing, Claude does it or gives Gabe exact click-by-click instructions when account creation requires his identity.

---

## Workspace Structure

```
.
├── CLAUDE.md              # This file — core context, always loaded
├── .claude/
│   └── commands/          # Slash commands Claude can execute
│       ├── prime.md       # /prime — session initialization
│       ├── create-plan.md  # /create-plan — create implementation plans
│       ├── implement.md   # /implement — execute plans
│       └── qa.md          # /qa — full app quality audit
├── context/               # Background context about the user and project
│                          # (User should populate with role, goals, strategies)
├── plans/                 # Implementation plans created by /create-plan
├── outputs/               # Work products and deliverables
├── reference/             # Templates, examples, reusable patterns
└── scripts/               # Automation scripts (if applicable)
```

**Key directories:**

| Directory    | Purpose                                                                             |
| ------------ | ----------------------------------------------------------------------------------- |
| `context/`   | Who the user is, their role, current priorities, strategies. Read by `/prime`.      |
| `plans/`     | Detailed implementation plans. Created by `/create-plan`, executed by `/implement`. |
| `outputs/`   | Deliverables, analyses, reports, and work products.                                 |
| `reference/` | Helpful docs, templates and patterns to assist in various workflows.                |
| `scripts/`   | Any automation or tooling scripts.                                                  |

---

## Commands

### /prime

**Purpose:** Initialize a new session with full context awareness.

Run this at the start of every session. Claude will:

1. Read CLAUDE.md and context files
2. Summarize understanding of the user, workspace, and goals
3. Confirm readiness to assist

### /create-plan [request]

**Purpose:** Create a detailed implementation plan before making changes.

Use when adding new functionality, commands, scripts, or making structural changes. Produces a thorough plan document in `plans/` that captures context, rationale, and step-by-step tasks.

Example: `/create-plan add a competitor analysis command`

### /implement [plan-path]

**Purpose:** Execute a plan created by /create-plan.

Reads the plan, executes each step in order, validates the work, and updates the plan status.

Example: `/implement plans/2026-01-28-competitor-analysis-command.md`

---

## Critical Instruction: Maintain Context and Reference Files

**Whenever Claude makes changes to the workspace, Claude MUST consider whether reference and/or context files need updating.**

After any change — adding commands, scripts, workflows, or modifying structure — ask:

1. Does this change add new functionality users need to know about?
2. Does it modify the workspace structure documented above?
3. Should a new command be listed?
4. Does context/ or reference/ need new files to capture this?

If yes to any, update the relevant sections. Context files must always reflect the current state of the workspace so future sessions have accurate context.

---

## Session Workflow

1. **Start**: Run `/prime` to load context
2. **Work**: Use commands or direct Claude with tasks
3. **Plan changes**: Use `/create-plan` before significant additions
4. **Execute**: Use `/implement` to execute plans
5. **Maintain**: Claude updates CLAUDE.md and context/ as the workspace evolves

---

## UI Change Rule: Don't Over-Redesign
- **Never redesign working UI without strong justification.** Make minimal, targeted changes. If the original works, keep it.
- Specific patterns that work and must not be changed without Gabe's explicit request:
  - PO cards: navy badge, job name on its own line with Briefcase icon, Building2 supplier icon
  - Mic button: simple Mic/MicOff toggle (no animated orbs or Shazam-style redesigns)
  - Attribute pills: full-size with icons (no compact/dot-separator variants)
- Changes that reduce readability or break established layout patterns will be rejected.

## RSNE Inventory App

The app lives in `inventory-management-app/`. Detailed technical reference is split across context files — read these when working on the app:

| File | Contents |
|------|----------|
| `context/tech-stack.md` | Tech stack, architecture rules, run commands |
| `context/ai-module.md` | AI module structure, door sheet system |
| `context/project-status.md` | Phase completion status, deployment info |

---

## Notes

- Keep context minimal but sufficient — avoid bloat
- Plans live in `plans/` with dated filenames for history
- Outputs are organized by type/purpose in `outputs/`
- Reference materials go in `reference/` for reuse
