# Plan: Door Sheet Revolution — Visual Configurator

**Created:** 2026-03-24
**Status:** Implemented
**Request:** Session 3 — Transform the door creation flow with a dynamic SVG door preview that updates as users select specs, like a character customizer.

---

## Overview

### What This Plan Accomplishes

Replaces the two existing basic SVG diagrams (SwingDoorDiagram, SliderDoorDiagram) with a single unified `DoorPreview` component that renders a rich, animated door visualization. The preview shows frame type, panel finish color, hardware placement (hinges, latch, closer), temperature indicator, cutouts, and high sill — all updating in real-time as specs change. The interview-step components get an off-brand token cleanup and the preview is made persistent (always visible above each step) so users see their door "come to life" as they build it.

### Why This Matters

Gabe's vision: "like a Fortnite character customizer." The current diagrams are minimal technical sketches — gray rectangles with dimension lines. They show structure but not the door. The new preview makes the door feel REAL: white panels for WPG, silver for stainless, hinges that appear on the correct side, a snowflake badge for freezers. Workers should look at the preview and think "that's my door." This is the "show-off" feature that makes the app memorable.

---

## Skill Inputs

### Skills Invoked

| Skill | Key Contribution |
|-------|-----------------|
| `frontend-design` | Design direction: "engineering blueprint meets modern app." Navy frame with brand-blue dimension lines. Panel fill changes based on finish (white/silver/gray). Hardware as small branded circles with CSS transitions. Temperature badge as an overlay icon. All changes animate smoothly via CSS transitions on SVG properties. Blueprint grid background for engineering feel. |
| `product-skills` (UX researcher) | Flow insight: don't restructure the 16 steps — the interview pattern works for new users. Instead, make the preview persistent so every step has visual feedback. The "quick mode" already exists (AI voice parsing via `parseDoorSpecs`). The fix is making the guided path feel faster by showing progress visually, not by removing steps. |

### How Skills Shaped the Plan

Frontend-design defined the aesthetic: blueprint-grid background, navy frame, brand-colored hardware. The key insight is that the preview alone transforms the experience — users see the door materialize step by step, which makes each question feel purposeful instead of tedious. The UX researcher confirmed keeping the step structure but making it visually rewarding.

---

## Current State

### Relevant Existing Structure

| File | Current State |
|------|--------------|
| `src/components/doors/door-diagram-swing.tsx` | Basic SVG: gray frame rect, blue dashed opening, yellow sill, purple cutouts, blue dimension lines. No hardware, no finish color, no temperature. |
| `src/components/doors/door-diagram-slider.tsx` | Basic SVG: gray track, dashed opening, blue panel rect, slide direction arrow. No finish, no hardware. |
| `src/components/doors/door-builder.tsx` | 16+ steps, each renders InterviewStep with optional diagram prop. Swing steps pass SwingDoorDiagram, slider steps pass SliderDoorDiagram. |
| `src/components/doors/interview-step.tsx` | Contains off-brand tokens: `text-gray-400`, `text-gray-500`, `border-gray-200`. InterviewStep renders diagram inside the step layout. |

### Gaps or Problems Being Addressed

1. **Diagrams are minimal** — gray rectangles, no finish color, no hardware, no temperature indicator
2. **No animation** — switching specs (hinge side, finish) causes no visual transition
3. **Off-brand tokens** — interview-step.tsx has gray-400, gray-500, gray-200 instead of brand tokens
4. **Two separate components** — SwingDoorDiagram and SliderDoorDiagram duplicate common logic (dimensions, frame)
5. **Preview not persistent** — diagram only appears on dimension steps, disappears on feature/hardware steps

---

## Proposed Changes

### Summary of Changes

- Create unified `DoorPreview` component that handles both swing and slider, with hardware, finish, temperature, cutouts, sill
- Add CSS transitions to all SVG elements for smooth spec changes
- Replace SwingDoorDiagram/SliderDoorDiagram usage in door-builder with DoorPreview
- Make DoorPreview persistent across ALL builder steps (not just dimension steps)
- Fix off-brand tokens in interview-step.tsx
- Add blueprint-grid background to preview for engineering aesthetic

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/components/doors/door-preview.tsx` | Unified SVG door configurator with hardware, finish, temp, animations |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/doors/door-builder.tsx` | Replace diagram prop with persistent DoorPreview above all steps |
| `src/components/doors/interview-step.tsx` | Fix off-brand tokens (gray-400→text-text-muted, gray-500→text-text-secondary, gray-200→border-border-custom) |

### Files to Delete

None — old diagram components stay for now (used by spec sheet views). DoorPreview is additive.

---

## Design Decisions

### Key Decisions Made

1. **Unified DoorPreview accepts full specs object**: Instead of separate props for each dimension, the component takes `specs: Partial<DoorSpecs>` and renders everything from that. This means it works at every step — it just renders what's available so far.

2. **Panel finish colors mapped to fills**: `WPG` / `White/White` → `#F8F9FA` (near-white), `Stainless Steel` → `#C0C7CE` (silver), `Galvalume` → `#A8ADB3` (warm gray), `FRP` → a subtle hatched pattern, default → `#EDF2F7` (light blue-gray).

3. **Hardware as branded circles with transitions**: Hinges are 2-3 small circles on the hinge side, latch is a circle on the opposite side, closer is a small rectangle at the top. All use `transition: all 0.3s var(--ease-spring)` so they slide when hinge side changes.

4. **Temperature as a badge overlay**: A small rounded rect with snowflake/thermometer icon in the top-right of the door panel. Blue tint for freezer, cyan for cooler. Appears with fade when temperature is selected.

5. **Blueprint grid background**: Subtle grid pattern behind the SVG using a CSS background-image (repeating linear-gradient). Navy lines at very low opacity. Gives the engineering blueprint feel without cluttering the door itself.

6. **Preview is always visible in builder**: Instead of passing diagram as a prop to InterviewStep (which varies per step), the DoorPreview is rendered ABOVE the step content in the builder's return JSX, always present. It shrinks slightly on dimension steps where the input takes more space.

7. **Keep existing diagrams alive**: SwingDoorDiagram and SliderDoorDiagram are still used by DoorSpecSheet and DoorManufacturingSheet. Don't delete them — the new DoorPreview is for the builder only.

### Alternatives Considered

- **Canvas-based rendering**: Rejected — SVG is simpler, works with React state, and supports CSS transitions natively.
- **3D door rendering (Three.js)**: Rejected — massive dependency, performance concern on mobile, overkill for a 2D preview.
- **Restructuring the interview steps**: Rejected per UX researcher input — the step flow works. Visual feedback (persistent preview) is the fix, not fewer steps.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Create DoorPreview Component

Build the unified SVG door configurator.

**Actions:**

- Create `src/components/doors/door-preview.tsx`
- Props: `specs: Partial<DoorSpecs>`, `className?: string`
- SVG viewBox: `0 0 240 320` with centered door
- Elements to render (each conditional on whether the spec is set):
  - **Blueprint grid background**: `<pattern>` element with subtle grid lines
  - **Frame outline**: Rect with navy stroke. Frame width varies by `frameType` (FULL_FRAME=thick border, FACE_FRAME=thin face plate, BALLY_TYPE=angled profile)
  - **Door panel**: Rect filled based on `finish` color map. Default light gray until finish is selected.
  - **Hinges**: 2-3 small circles on `hingeSide` (LEFT=left edge, RIGHT=right edge of panel). For sliding doors, no hinges. Number: 2 for doors ≤36", 3 for wider.
  - **Latch**: Small circle on opposite side of hinges. Positioned at ~40% from top.
  - **Closer**: Small rectangle at top of door on hinge side.
  - **Temperature badge**: Rounded rect + icon text (❄ for freezer, 🌡 for cooler) in top-right corner. Blue bg for freezer, cyan for cooler.
  - **Cutouts**: Dashed rectangles positioned proportionally within the door panel.
  - **High sill**: Solid rect at bottom of door opening when `highSill` is true.
  - **Dimension labels**: Width above, height on left side, with dimension lines. Brand-blue color.
  - **Door type label**: "Swing Door" or "Sliding Door" at bottom.
- All positioned elements use `style={{ transition: 'all 0.3s var(--ease-spring)' }}` for smooth animations
- Sliding door variant: show track at top, panel offset to `slideSide`, slide direction arrow

**Files affected:**
- `src/components/doors/door-preview.tsx` (new)

---

### Step 2: Fix Off-Brand Tokens in Interview Step

Clean up the interview-step component.

**Actions:**

- Replace `text-gray-400` → `text-text-muted` (Back button, unit label)
- Replace `text-gray-500` → `text-text-secondary` (description, dimension label)
- Replace `border-gray-200` → `border-border-custom` (choice button border, input border)
- Replace `bg-blue-50` → `bg-brand-blue/8` (selected choice button)
- Replace `hover:border-blue-300` → `hover:border-brand-blue/40`
- Replace `hover:bg-blue-50/50` → `hover:bg-brand-blue/5`
- Apply `font-display` to the `<h2>` question text for visual hierarchy

**Files affected:**
- `src/components/doors/interview-step.tsx`

---

### Step 3: Integrate DoorPreview into Builder

Make the preview persistent across all builder steps.

**Actions:**

- Import `DoorPreview` in door-builder.tsx
- Remove the `diagram` prop from all `<InterviewStep>` calls (the preview will be above the step, not inside it)
- Add DoorPreview above the step content in the builder's return JSX:
  ```tsx
  <div className="space-y-4">
    <StepProgress steps={PROGRESS_LABELS} currentStep={currentGroup} />

    {/* Persistent door preview */}
    {step !== "TYPE" && (
      <div className="flex justify-center py-2 animate-fade-in">
        <DoorPreview specs={specs} className="max-w-[200px]" />
      </div>
    )}

    {/* Step content */}
    {step === "TYPE" && ( ... )}
    {step === "SWING_WIDTH" && ( ... )}
    ...
  </div>
  ```
- The preview is hidden on the TYPE step (no specs yet) and appears from SWING_WIDTH onward
- Remove `diagram={...}` prop from each InterviewStep call — the old per-step diagrams are replaced by the persistent preview
- The preview updates automatically because it reads from `specs` state

**Files affected:**
- `src/components/doors/door-builder.tsx`

---

### Step 4: Validation & QA

Type check, token audit, and visual verification.

**Actions:**

- Run `npx tsc --noEmit` — verify zero new errors
- Run `npx tsx scripts/token-audit.ts` — verify no off-brand tokens in modified files (especially interview-step.tsx cleanup)
- Verify:
  - DoorPreview renders at every builder step (except TYPE)
  - Panel color changes when finish is selected (WPG→white, SS→silver)
  - Hinges appear on correct side and slide when switching
  - Temperature badge appears when cooler/freezer selected
  - Cutouts render when added
  - High sill bar appears when enabled
  - Dimension labels update as width/height are entered
  - Sliding door shows track, panel position, direction arrow
  - All off-brand tokens fixed in interview-step.tsx
  - All interactive elements ≥ 44px touch target
  - Preview doesn't overflow on 375px viewport
  - Question headings use Sora font

**Files affected:**
- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/doors/door-creation-flow.tsx` — orchestrates the builder. Not modified — it passes `onComplete` and `onBack` which the builder uses unchanged.
- `src/components/doors/door-confirmation.tsx` — shows final specs for editing. Not modified.
- `src/components/doors/door-spec-sheet.tsx` — uses SwingDoorDiagram (kept intact).
- `src/components/doors/door-manufacturing-sheet.tsx` — uses SwingDoorDiagram (kept intact).

### Updates Needed for Consistency

- The DoorPreview color palette should use brand CSS variables where possible (navy for frame, brand-blue for accents).

### Impact on Existing Workflows

- **Door builder gets visual preview at every step** — purely additive, no step logic changes
- **Old diagrams untouched** — spec sheet and manufacturing sheet still use the original diagrams
- **Interview step token cleanup** — visual-only change, no behavioral change

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] `npx tsx scripts/token-audit.ts` shows no off-brand tokens in interview-step.tsx
- [ ] DoorPreview renders on all builder steps (except TYPE)
- [ ] Panel fill changes with finish selection
- [ ] Hinges render on correct side (2 for ≤36", 3 for wider)
- [ ] Latch renders on opposite side of hinges
- [ ] Temperature badge shows for cooler (cyan) and freezer (blue)
- [ ] Cutouts render as dashed rectangles
- [ ] High sill bar renders when enabled
- [ ] Dimension labels update live as user types
- [ ] Slider door shows track + panel + direction arrow
- [ ] All transitions animate smoothly (no snapping)
- [ ] Preview fits within 200px width on mobile
- [ ] Question headings use font-display (Sora)
- [ ] All touch targets ≥ 44px

---

## Success Criteria

The implementation is complete when:

1. **The door "comes to life"** — workers see their door materialize as they answer each question, with finish color, hardware, and temperature all visualized
2. **Every spec change animates** — switching hinge side, adding cutouts, selecting finish all transition smoothly
3. **The preview is always visible** — from the first dimension question through extras, the door preview is persistent above the interview step
4. **Off-brand tokens are eliminated** — interview-step.tsx uses only brand design tokens

---

## Notes

- The DoorPreview component can be reused in future Session 4+ work (e.g., showing a door preview on assembly cards or BOM detail pages).
- Hardware circle sizes and positions are approximations — they represent hardware placement conceptually, not to engineering scale. The exact position doesn't need to match real door specs.
- The blueprint grid uses CSS `background-image` with repeating-linear-gradient, not SVG pattern elements, for cleaner rendering.
- Finish color mapping is intentionally simple (4-5 colors). Custom finishes default to the base gray until a specific mapping is added.
- The `transition` style on SVG elements works in modern browsers (Chrome, Safari, Firefox). Capacitor's WebView (based on platform WebKit/Chromium) supports this.

---

## Implementation Notes

**Implemented:** 2026-03-24

### Summary

- Created `DoorPreview` component — unified SVG door configurator with frame type visualization, panel finish colors (WPG/stainless/galvalume), hardware circles (hinges on correct side, latch, closer), temperature badge (snowflake/thermometer), cutouts, high sill, dimension labels, and blueprint grid background
- All SVG elements use CSS transitions for smooth spec changes
- Fixed all off-brand tokens in interview-step.tsx (gray-400→text-muted, gray-500→text-secondary, gray-200→border-custom, blue-50→brand-blue/8)
- Applied font-display (Sora) to interview question headings
- Integrated DoorPreview as persistent element above all builder steps (visible from SWING_WIDTH onward)
- Removed all 6 old diagram prop references from door-builder.tsx (SwingDoorDiagram and SliderDoorDiagram)
- Old diagram components kept intact for spec sheet/manufacturing sheet views

### Deviations from Plan

- Used `style={ts}` (React CSSProperties object) instead of computed property `style={{ [transition]: "" }}` which TypeScript rejected. Same visual result, proper typing.

### Issues Encountered

- TypeScript rejected computed property key `[transition]` in style objects. Fixed by using a typed `React.CSSProperties` object variable instead.
