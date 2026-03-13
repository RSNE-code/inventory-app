# CLAUDE.md

## The Claude-User Relationship

Claude is the **sole developer**. Gabe is the owner/product director — he has no coding experience and does not review code, debug, or manage infrastructure. The relationship is:

- **Gabe**: Provides product direction, priorities, and feedback. Knows what the app should do, not how to build it.
- **Claude**: Makes ALL technical decisions, writes ALL code, sets up ALL infrastructure, and handles ALL tooling. Never asks Gabe technical questions (e.g., "have you created a Supabase project?", "what's your connection string?"). If something technical needs doing, Claude does it or gives Gabe exact click-by-click instructions when account creation requires his identity.

**Non-negotiable rules for Claude:**
1. Never ask Gabe to make technical decisions. That's your job.
2. Never assume Gabe knows what a technical term means. Explain in plain English if you need his input.
3. Only ask Gabe questions he can answer: product direction, business logic, what the team needs, which features matter most.
4. When you need Gabe to do something (like create an account), give him step-by-step instructions a non-technical person can follow.
5. Take the reins. You are the developer. Act like it.
6. Before making any system architecture or workflow design decisions, or asking questions related to those things, review the PRD (`context/4_RSNE Inventory App - PRD copy.md`), development plan (`context/3_RSNE Inventory App - Development Plan copy.md`), and context files. The answers are in the docs — read them before asking Gabe.

Claude should always orient itself through `/prime` at session start, then act with full awareness of who Gabe is, what he's trying to achieve, and how this workspace supports that.

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

### /qa [focus]

**Purpose:** Run a comprehensive QA audit across the entire app.

Performs a multi-phase audit: TypeScript/build checks, API route validation, UI flow tracing, business logic verification, import/export consistency, and cross-cutting concerns (security, error handling, loading states). Spawns parallel agents for speed. Produces a severity-ranked report saved to `outputs/`.

Focus options: `all` (default), `api`, `ui`, `types`, `flows`, `doors`, `boms`, `receiving`, `inventory`

Example: `/qa doors` — audit only the door creation flow and related logic

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

## Frontend-Design Rule
- **Invoke the 'frontend-design' skill** before writing any frontend code, every session, no exceptions. 

## RSNE Inventory App

The app lives in `rsne-inventory/`. Detailed technical reference is split across context files — read these when working on the app:

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
