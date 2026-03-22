# Walkthrough — User Workflow Simulation

Simulate a specific user workflow step-by-step, reading every component in the flow, and identify friction points, confusion points, and breaks.

## Variables

workflow: $ARGUMENTS (required: "bom-creation", "bom-photo", "bom-checkout", "receiving", "door-creation", "inventory-adjust", "cycle-count")

---

## Instructions

You are simulating a real user clicking through a specific workflow on a mobile phone (375px). Read every component file in the flow, trace the user's path, and evaluate each step for usability.

**IMPORTANT:** This is a READ-ONLY analysis. Do not edit any files. Only read, analyze, and report.

---

## Predefined Workflows

### bom-creation
**Entry:** `/boms` page → Create BOM tab
**Steps:**
1. Job picker → search/select a job
2. Photo capture → tap camera, take photo
3. AI processing → wait for results
4. Live item feed → review matched items
5. Flagged items → resolve low-confidence matches
6. Add additional items → ProductPicker at bottom
7. Cart review → check quantities
8. Create BOM → submit

**Components to read:**
- `src/app/boms/page.tsx`
- `src/components/bom/bom-photo-capture.tsx`
- `src/components/bom/live-item-feed.tsx`
- `src/components/bom/flagged-item-resolver.tsx`
- `src/components/bom/product-picker.tsx`
- `src/components/bom/job-picker.tsx`

### bom-photo
**Entry:** `/boms` page → Create BOM tab
**Steps:**
1. Photo capture → tap camera or drag-drop
2. Image compression + upload
3. NDJSON streaming → items appear one by one
4. Pass 2 refinement → confidence scores update
5. Results displayed in live feed

**Components to read:**
- `src/components/bom/bom-photo-capture.tsx` (capture + processing phases)
- `src/components/bom/live-item-feed.tsx`

### bom-checkout
**Entry:** `/boms/[id]` page
**Steps:**
1. View BOM detail with line items
2. Checkout All button → confirmation
3. Adjust quantities if needed
4. Confirm checkout → stock deducted
5. Success feedback

**Components to read:**
- `src/app/boms/[id]/page.tsx`
- `src/components/bom/checkout-all-button.tsx`

### receiving
**Entry:** `/receiving` page → AI Receive tab
**Steps:**
1. Choose input method (text/voice/photo)
2. AI parses input into items
3. PO detection + match (if PO number found)
4. Review parsed items with confirmation cards
5. Edit quantities/suppliers
6. Summary screen
7. Confirm receipt → stock updated

**Components to read:**
- `src/app/receiving/page.tsx`
- `src/components/receiving/receiving-flow.tsx`
- `src/components/receiving/receiving-confirmation-card.tsx`
- `src/components/receiving/receipt-summary.tsx`

### door-creation
**Entry:** `/assemblies/new` page
**Steps:**
1. Select build type (Door/Panel/Floor)
2. Door builder interview flow
3. Specify dimensions, frame, hardware
4. Review door spec sheet
5. Submit for approval

**Components to read:**
- `src/app/assemblies/new/page.tsx`
- `src/components/doors/door-creation-flow.tsx`
- `src/components/doors/door-builder.tsx`

### inventory-adjust
**Entry:** `/inventory/[id]` page → Adjust Stock button
**Steps:**
1. View current stock level
2. Tap "Adjust Stock"
3. Enter new quantity or delta
4. Provide reason
5. Submit → stock updated

**Components to read:**
- `src/app/inventory/[id]/page.tsx`
- `src/app/inventory/[id]/adjust/page.tsx`

### cycle-count
**Entry:** `/cycle-counts` page → Count tab
**Steps:**
1. View suggested items to count
2. Tap item to start count
3. Enter actual quantity
4. Optionally enter reason
5. Submit → see variance result
6. Done → return to list

**Components to read:**
- `src/app/cycle-counts/page.tsx`

---

## For Each Step, Evaluate

1. **Discoverability:** Is it obvious what to do next? Is the CTA visible and clearly labeled?
2. **Feedback:** When the user acts, is there immediate feedback? (loading state, animation, toast)
3. **Error recovery:** What happens if the user makes a mistake? Can they go back? Undo?
4. **Data clarity:** Is the information displayed sufficient to make a decision? Are quantities, units, prices clear?
5. **Mobile usability:** Would this step work well on a phone held in one hand?
6. **Edge cases:** What if there are 0 items? 100 items? What if the AI returns no matches? What if the network is slow?

---

## Output Format

```markdown
# Walkthrough: {Workflow Name}
**Date:** YYYY-MM-DD

## Flow Diagram
Step 1 (Name) → Step 2 (Name) → Step 3 (Name) → ...

## Step-by-Step Analysis

### Step 1: {Step Name}
**Component:** `path/to/component.tsx`
**What the user sees:** Description of the screen
**What the user does:** Description of the action

**Evaluation:**
- Discoverability: ✅/⚠️/❌ — explanation
- Feedback: ✅/⚠️/❌ — explanation
- Error recovery: ✅/⚠️/❌ — explanation
- Data clarity: ✅/⚠️/❌ — explanation
- Mobile usability: ✅/⚠️/❌ — explanation
- Edge cases: ✅/⚠️/❌ — explanation

**Friction points:**
- List any issues

### Step 2: {Step Name}
...

## Summary
- X high-friction points (blocks the user or causes confusion)
- X medium-friction points (inconvenient but workaround exists)
- X low-friction points (minor polish)

## Recommended Fixes (prioritized)
1. [HIGH] Description — File: path/to/file.tsx
2. [MED] Description — File: path/to/file.tsx
3. [LOW] Description — File: path/to/file.tsx
```

Save the report to `outputs/walkthrough-{workflow}-YYYY-MM-DD.md`.
