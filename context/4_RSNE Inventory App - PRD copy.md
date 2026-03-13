# RSNE Inventory Management App — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** March 5, 2026
**Author:** Gabe Perez, President — Refrigerated Structures of New England
**Status:** Draft

---

## 1. Product Vision

A custom, full-stack inventory management app purpose-built for RSNE that replaces manual stock counts, paper BOMs, and clipboard-based fabrication tracking with a single, mobile-first application. The app must be so simple that it requires zero training — if a workflow takes more than a few taps, it's too complex.

**This app is built around RSNE's optimal workflows. The workflows define what the app does and how. We do not build workflows around the app — that is the problem with every tool we've tried.**

---

## 2. Users & Roles

| Role | Person(s) Today | Primary Actions |
|------|----------------|-----------------|
| **Admin** | Gabe (Owner/President) | Full access. Settings, reports, user management, all workflows. |
| **Operations Manager** | VP Ops | BOM creation, receiving, forecasting, reports. |
| **Office Manager** | Office Manager | BOM creation, PO/receiving, door sheets, job material allocation. |
| **Sales Manager** | Sales Manager(s) | BOM creation and approval, door sheet approval. |
| **Shop Foreman** | Shop Foreman | Material checkout/return, panel/floor fabrication, receiving, stock alerts. Owns and prioritizes the **Fabrication Queue** (panels, floors, other non-door assemblies). |
| **Door Shop** | Door Shop Lead / Door Builder | Door fabrication from the **Door Shop Queue**. Picks up approved door sheets and builds in priority order set by the Office Manager. |
| **Crew** (Phase 2+) | Field crews | Material pickup/return logging from job sites. |

---

## 3. Inventory Classification

Not all materials are tracked the same way. The system uses a two-tier classification to balance accuracy with usability.

### Tier 1 — Tracked Items

All materials where the cost, volume, or importance justifies real-time tracking. This includes both **discrete items** (hinges, doors, panels — counted per unit) and **bulk consumables** (gasket rolls, sheet metal coils, foam insulation — purchased in bulk, consumed incrementally).

For bulk consumables, the key principle is: **the system calculates consumption automatically through assembly templates — the user never enters per-use quantities manually.**

Example: A 100' roll of gasket is received as "1 roll / 100 linear ft." When a Standard Swing Door 3x7 is built, the assembly template knows the door requires ~14 ft of gasket. The system deducts 14 ft automatically when the Foreman taps "Complete Build." The Foreman never measures or enters gasket usage — it's derived from the template.

This applies to all fabrication consumables: gasket, heater wire, sheet metal (consumed per door/panel build), foam insulation (consumed per panel build), FRP, plywood, etc. The assembly templates carry the per-unit consumption rates. Actual usage overrides are optional — the Foreman can adjust if a non-standard build used significantly more or less than the template, but this is the exception.

**Periodic reconciliation:** For bulk items tracked by sub-units (linear ft, sq ft), a cycle count where someone measures what's left on the roll/coil reconciles the system. This happens at most once per month per item — not per build.

Tier 1 covers the ~50–100 SKUs that represent 90%+ of RSNE's annual material spend ($3.1M+).

### Tier 2 — Expensed (Not Tracked)

Fasteners, screws, nails, small consumables, tape, zip ties, and any item where the cost of tracking exceeds the value of the information. These are purchased, expensed to a general shop supplies or job overhead category, and restocked when someone notices they're low. They do not exist in the inventory app.

---

## 4. BOM Scope vs. Inventory Scope

**A BOM captures everything a job needs. Inventory tracks only Tier 1 items.** These are two different scopes, and the app must respect both. This distinction is foundational — it drives how every downstream workflow behaves.

The BOM is a **job planning tool**. It should include every material the crew needs — Tier 1 tracked items, Tier 2 expensed items (screws, fasteners), non-catalog custom items (specific trim dimensions, panel variants), and finished assemblies. The SM's job is to make sure nothing is missing from the job plan. If the job needs a box of screws, that belongs on the BOM even though screws aren't tracked in inventory.

Inventory tracking only applies to **Tier 1 items**. At checkout (WF3), the Foreman sees the full BOM checklist, but only Tier 1 items deduct from inventory when checked off. Tier 2 and non-catalog items appear on the checklist (so the crew knows to grab them), but checking them off logs the item against the job for costing purposes without affecting inventory quantities.

How this applies across the app:

- **BOM Builder (WF2):** Accepts any item — catalog, non-catalog, Tier 1, Tier 2, custom. No restrictions on what can go on a BOM.
- **Checkout (WF3):** Full BOM displayed. Tier 1 items deduct from stock. Tier 2/non-catalog items are checked off for job tracking only.
- **Job Costing:** All items on the BOM contribute to the job cost report — not just tracked inventory items.
- **Reorder Alerts:** Only triggered by Tier 1 items. Tier 2/non-catalog items on a BOM do not affect stock alerts or forecasting.

---

## 5. Core Workflows

Each workflow below is defined with: the trigger, every step in sequence, who performs each step, what data must be available at each step, and the must-haves that are non-negotiable.

---

### Workflow 1: Material Receiving

**Trigger:** A material delivery arrives at the shop (from a PO or a blanket order draw).

| Step | Action | Actor | Data Required | Must-Haves |
|------|--------|-------|---------------|------------|
| 1 | Open "Receive Material" from dashboard | Foreman or Office Manager | — | One-tap access from home screen |
| 2 | Select supplier from list (or scan packing slip in future) | Foreman or Office Manager | Supplier list, open POs for that supplier | Supplier list sorted by most recent. Option to type supplier name for fast filter. |
| 3 | System suggests the most likely PO based on expected delivery/ship date (LLM-powered). User confirms or selects a different PO. For ad hoc purchases with no PO, user taps "No PO." | Foreman or Office Manager | Open POs for selected supplier with expected delivery dates | LLM pre-selects the PO most likely to match this delivery based on date and supplier. Must allow receiving WITHOUT a PO for ad hoc purchases. |
| 4 | **If PO selected:** Line items and unit costs are pre-filled from the PO. User confirms quantities received (adjust if different from PO qty). **If no PO:** User selects products and enters quantities. Unit cost defaults to last purchase cost. | Foreman or Office Manager | PO line items with expected quantities and costs; or product catalog with last cost | When a PO is selected, the user should only need to confirm — zero typing in the ideal case. Cost entry is only required for ad hoc items (no PO). |
| 5 | If received quantity differs from PO quantity (over or under), system flags the variance and requires confirmation: "PO says 50, you entered 45 — confirm?" | System + User | PO expected qty vs. entered qty | Variance alert prevents fat-finger errors. User must explicitly confirm any quantity that doesn't match the PO. |
| 6 | Review full receipt summary and confirm | Foreman or Office Manager | Summary of all items being received with costs | Show a clear summary before committing. One-tap confirm. |
| 7 | System updates: stock quantities increase, weighted average cost recalculates, transaction logged | System (automatic) | Current stock levels, cost history | Cost recalculation is automatic. Transaction includes: who, what, when, supplier, PO, cost. |

**Must-Haves for this workflow:**
- PO selection pre-fills everything — products, quantities, and costs. The user just confirms.
- LLM-powered PO suggestion: system prioritizes the most likely PO based on expected delivery date for the selected supplier
- Quantity variance from PO triggers a confirmation alert (prevents mistakes)
- Receiving without a PO is supported for ad hoc purchases (cost defaults to last purchase price)
- Receipt summary screen before confirmation
- Full transaction history linked to each receipt

---

### Workflow 2: BOM Creation (Bill of Materials for a Job)

**Trigger:** A project is sold and needs a materials list before work begins.

| Step | Action | Actor | Data Required | Must-Haves |
|------|--------|-------|---------------|------------|
| 1 | Open "Create BOM" from dashboard | Sales Manager or Office Manager | — | One-tap access |
| 2 | Select job from a pre-populated list of active jobs (name + number). Option to manually add a new job if it doesn't exist yet. | Sales Manager or Office Manager | Job list (synced from Knowify or maintained in-app). Job name and job number. | Pre-populated dropdown with search/typeahead. Jobs pulled from the system — not free-text by default. Manual entry as fallback only. |
| 3 | Optionally select a BOM template (e.g., "Standard IMP Install", "Walk-in Cooler") to pre-fill common line items | Sales Manager or Office Manager | Saved BOM templates | Templates pre-fill line items. User can edit any line. |
| 4 | **Add items via LLM-mediated input.** SM can: **(a)** tap the mic and dictate ("I need two 3x7 swing doors, 200 feet of 4-inch IMP, some galvalume angle trim, and a case of caulk"), **(b)** type naturally in a single text field ("4in galv angle 10ft, 2 sheets 3/4 ply"), or **(c)** browse the product catalog manually. Voice and typed input go through the LLM, which parses the natural language into structured line items. | Sales Manager or Office Manager | Product catalog, assembly catalog, LLM parsing | All three input methods produce the same result: structured line items. Voice/typed input is the primary path — catalog browse is the fallback. Must feel like talking to someone who knows the shop. |
| 5 | **LLM presents parsed items as confirmation cards.** Each item is shown as a structured card the SM reviews. Catalog matches show the product name, SKU, current stock, and quantity. Non-catalog items are parsed into structured fields (material type, dimension, finish, quantity, UOM) and flagged as "needs sourcing." Assembly items show name + quantity. If the LLM is unsure (e.g., "IMP" could be multiple products), it asks a quick clarifying question inline. | System (LLM) + User | Parsed input, product catalog matching, assembly catalog matching | Every item — whether from voice, text, or catalog browse — resolves to a structured card before it hits the BOM. No free text ever flows downstream. SM taps ✓ to confirm or ✎ to edit each card. Non-catalog items are structured (not a text blob) so Foreman/OM get clean data. |
| 6 | For assembly items (doors, panels), the confirmation card shows assembly name + quantity needed (e.g., "Standard Swing Door 3x7 — Qty: 2"). Component materials are collapsed underneath. | Sales Manager or Office Manager | Assembly catalog, assembly templates | Assembly items show name + quantity only by default. Expandable to reveal component materials. SM just confirms they captured the right finished items. |
| 7 | Review the full BOM — the system highlights any items where stock is insufficient | System + User | Stock levels vs. quantities needed | Color-coded status: green (in stock), yellow (low — will deplete stock), red (not enough on hand). Non-catalog items always flagged as "needs sourcing." |
| 8 | Submit/approve the BOM | Sales Manager or Office Manager | — | BOM status moves to "Approved." Foreman and Office Manager are notified (in-app notification). BOM always shows who created it so Foreman/OM know who to ask with questions. |
| 9 | System flags items needing reorder or sourcing (stock below what's needed for this BOM + reorder point, plus all non-catalog items) | System (automatic) | Reorder points, current stock, BOM quantities, non-catalog item list | Reorder alerts and non-catalog sourcing requests appear on the dashboard and in a dedicated "Needs Ordering" view visible to the Office Manager and Foreman. |

**Role-based views after BOM submission:**
- **Sales Manager:** Sees a confirmation summary — "You've captured X items for [Job Name]. BOM submitted." Their job is done. They just need to know they got everything.
- **Shop Foreman:** Sees the approved BOM with item locations, quantities, stock status, and who created it. Focused on what to pull and when — knows who to call with questions.
- **Office Manager:** Sees a "Needs Ordering" view — items where stock is insufficient plus all non-catalog items that need to be sourced. BOM creator shown so they know who to follow up with. This is their action list.

**Must-Haves for this workflow:**
- **LLM-mediated input (voice + typed)** — the primary way to add items. SM speaks or types naturally; the LLM parses into structured line items. Catalog browse is available but secondary.
- **No free text flows downstream.** Every item — catalog or non-catalog — resolves to structured data (material type, dimension, finish, qty, UOM) before it reaches the Foreman or Office Manager. The LLM handles the translation at the point of entry.
- **Non-catalog items are structured, not free-text blobs.** The LLM parses "4 inch galvalume angle trim, 10 feet" into fields: Category=Metal Trim, Dimension=4", Finish=Galvalume, Shape=Angle, Qty=10, UOM=linear ft. These items are flagged as "needs sourcing" and can optionally be added to the catalog later.
- Live stock visibility while building the BOM — this is the #1 feature that prevents over-ordering
- Pre-populated job list (not free-text) to prevent duplicates and typos
- BOM templates for common job types (editable per job)
- Assembly items displayed as name + quantity, expandable for component detail
- Insufficient stock is flagged immediately, not after the fact
- BOM always displays who created it — Foreman and Office Manager need to know who to go to with questions
- BOM approval triggers a notification to the Foreman and Office Manager
- Non-catalog items are surfaced to the Office Manager as items needing sourcing/ordering

---

### Workflow 3: Material Checkout (Job Departure)

**Trigger:** A crew is about to leave for a job. The Foreman pulls materials.

| Step | Action | Actor | Data Required | Must-Haves |
|------|--------|-------|---------------|------------|
| 1 | Open the BOM for the job (from dashboard or search) | Shop Foreman | Approved BOMs, sorted by upcoming job date | BOMs should be sorted by job start date. Today's jobs at the top. |
| 2 | Review the full materials list — includes all items (Tier 1 tracked, Tier 2 expensed, non-catalog, assemblies). Tier 1 items show current stock inline. | Shop Foreman | BOM line items with quantities needed, stock levels for Tier 1 items | Clear, scannable list. Large font. Checkbox-style interface. Tier 1 items show stock. Tier 2/non-catalog items show on the checklist but are visually distinguished (e.g., lighter weight or "non-tracked" badge). |
| 3 | For each item: tap to confirm it's going on the truck. Adjust quantity if different from planned. | Shop Foreman | BOM line items, current stock (Tier 1 only) | Default = full quantity. Foreman only needs to tap and adjust exceptions. One tap per item if quantity matches. |
| 4 | Add any unplanned items (not on original BOM) using LLM-mediated input — same voice/type/browse interface as the BOM Builder for consistency. Items are parsed into structured line items and matched against the catalog. | Shop Foreman | Product catalog, LLM parsing | Same LLM-mediated input as WF2 for consistency. In practice, the Foreman will almost always match to catalog items since they're pulling from what's physically in the shop. |
| 5 | Confirm checkout | Shop Foreman | Summary of all items being checked out | Summary screen with total item count. One-tap confirm. |
| 6 | System updates: **Tier 1 items** — stock quantities decrease, transactions logged against the job. **Tier 2/non-catalog items** — checked off and logged against the job for costing, but no inventory deduction. All items timestamped with user attribution. | System (automatic) | Current stock levels (Tier 1), BOM record | Each item transaction linked to: job, BOM, user, timestamp. Tier 1 items create inventory transactions. Tier 2/non-catalog items create job cost entries only. |

**Must-Haves for this workflow:**
- This workflow must be completable in under 60 seconds for a typical 10-15 item BOM
- Checkbox-style tapping — not typing quantities unless different from planned
- Full BOM displayed regardless of tier — the Foreman sees everything the job needs
- Only Tier 1 items deduct from inventory. Tier 2/non-catalog items are tracked for job costing only.
- Adding unplanned items uses the same LLM-mediated input as the BOM Builder
- Foreman should never have to leave this screen to complete a checkout

---

### Workflow 4: Additional Material Pickup (Mid-Job)

**Trigger:** Crew returns to the shop for additional materials not on the original BOM.

| Step | Action | Actor | Data Required | Must-Haves |
|------|--------|-------|---------------|------------|
| 1 | Open the active BOM for the job | Shop Foreman (or Crew in future phase) | Active BOMs | Quick access — search by job name or select from "Active Jobs" list |
| 2 | Tap "Add Pickup" | Shop Foreman | — | Distinct action from the original checkout. Clearly labeled as an addition. |
| 3 | Add items using LLM-mediated input (voice/type/browse) — same interface as WF2 and WF3. Items parsed and matched against catalog. | Shop Foreman | Product catalog, LLM parsing, current stock | Same LLM-mediated input for consistency. Foreman will almost always match to catalog items. |
| 4 | Optionally adjust the pickup date/time if logging after the fact. Defaults to now. | Shop Foreman | Current date/time | Date defaults to right now. Foreman can backdate if they're logging a pickup that already happened (e.g., grabbed material yesterday, logging today). Simple date picker — not required to touch if logging in real time. |
| 5 | Confirm pickup | Shop Foreman | Pickup summary | One-tap confirm |
| 6 | System updates: stock decreases, items added to the BOM as "additional pickup" with the recorded timestamp | System (automatic) | Current stock, BOM record | Must be distinguishable from original checkout in the transaction log (for job costing accuracy). Uses the Foreman's selected date, not just system time. |

**Must-Haves for this workflow:**
- Additional pickups are appended to the BOM — they don't replace the original checkout
- Every pickup is timestamped and attributed to a user
- Foreman can backdate a pickup if logging after the fact — defaults to now so it's zero friction when logging in real time
- The BOM view clearly shows "Original Checkout" vs. "Additional Pickup(s)"

---

### Workflow 5: Material Return (Post-Job)

**Trigger:** Crew returns from a job with unused materials.

| Step | Action | Actor | Data Required | Must-Haves |
|------|--------|-------|---------------|------------|
| 1 | Open the active BOM for the job | Shop Foreman | Active BOMs | Same access pattern as checkout |
| 2 | Tap "Log Returns" | Shop Foreman | Items that were checked out for this BOM | Only show items that were actually checked out (not the full catalog) |
| 3 | For each returned item: tap to mark as returned, select return condition — **Full**, **Partial**, or **Scrap**. | Shop Foreman | Checked-out items with quantities | Default = no return (quantity 0). Foreman only touches items that actually came back. |
| 4 | **Full return:** quantity returns to stock at the same SKU. **Partial return:** Foreman enters the usable quantity — returns to the same SKU at reduced quantity. **Scrap:** written off — no stock increase, full cost stays on the job. | Shop Foreman | Return condition, usable quantity (partial only) | Partial returns: Foreman enters usable quantity. Scrap: zero data entry beyond selecting "Scrap." All materials follow the same logic — no special cases. |
| 5 | Confirm returns | Shop Foreman | Return summary | One-tap confirm. Summary shows what's going back to stock vs. what's scrap. |
| 6 | System updates: stock quantities increase (full/partial), scrap written off. BOM shows net usage (checked out minus returned). | System (automatic) | Current stock, BOM checkout quantities | The BOM now reflects actual material consumed on the job. |

**Must-Haves for this workflow:**
- Only shows items from this specific BOM checkout — not the whole catalog
- Three return conditions: Full, Partial, Scrap — one tap to select, same logic for all materials
- Scrap is written off with zero friction — select "Scrap" and move on. Cost stays on the job.
- Net usage per job is calculated automatically (used for job costing data export)
- Return transactions are logged separately from the original checkout

---

### Workflow 6: Door Fabrication (Assembly Production)

**Trigger:** A door needs to be built for an upcoming job.

| Step | Action | Actor | Data Required | Must-Haves |
|------|--------|-------|---------------|------------|
| 1 | Open "Build Assembly" → select "Door" | Office Manager | — | One-tap from dashboard |
| 2 | Select door template (e.g., "Standard Swing Door 3x7", "Sliding Door 5x8") | Office Manager | Assembly templates with specs | Templates contain: all standard component materials with default quantities, plus spec fields (size, type). |
| 3 | Fill in the door sheet fields: size, type, hardware config, job name, any special requests | Office Manager | Door templates, job list | This IS the digital door sheet. It replaces the paper form. Fields should match the existing paper form exactly. |
| 4 | Review/adjust the component materials list | Office Manager | Template materials, current stock for each | If a customer wants non-standard hardware (e.g., a window, specific hinge type), Office Manager swaps components here. Stock is shown inline. |
| 5 | Check stock availability — system highlights any materials not in stock | System + Office Manager | Current stock vs. required materials | Red/green indicators per component. If anything is short, show exactly how much is needed. |
| 6 | If materials are short, flag for ordering (or defer production) | Office Manager | Shortage list | Office Manager can trigger ordering directly from this screen or defer production until materials arrive. |
| 7 | **Submit door sheet to Sales Manager for approval.** SM receives a notification with the complete door sheet — specs, hardware, materials, job name. SM reviews and either approves or sends back with comments. | Office Manager → Sales Manager | Complete door sheet (specs + materials + job) | SM approval is **required** before production can begin. This is the quality gate — the SM is confirming the door is configured correctly for what the customer ordered. SM can approve in one tap or reject with a note. Door cannot move to production without SM sign-off. |
| 8 | **Approved door appears in the Door Shop Queue.** The queue shows all approved doors in priority order (set by the Office Manager). Door Shop picks up the next door when ready. | System (automatic) | Approved door sheets, priority ranking | The Door Shop Queue is the handoff mechanism. Approved doors land here automatically. Door Shop doesn't need to hunt through notifications — they open their queue and see what's next. |
| 9 | Begin production — Door Shop taps "Start Build" on their next queued item. The digital door sheet is the live reference throughout the build (one shared tablet in the door shop to start — expand to more if needed). | Door Shop | Approved door sheet, all components confirmed available | This locks the materials list. Components are deducted from raw material inventory. Status moves from "Not Started" to "In Progress" on the queue. |
| 10 | During production, if any spec changes are needed (e.g., substituting hardware, adjusting a dimension), the Door Shop updates the digital door sheet directly. Changes are logged with who changed what and when. | Door Shop | Active build record, door sheet specs | All spec changes must be captured in the digital door sheet — not on paper, not verbally. This is the single source of truth. Change history is preserved so the SM and Office Manager can see what was modified during the build. |
| 11 | Complete production — tap "Complete" | Door Shop | Active build record | A finished door is added to finished goods inventory with the final specs (including any mid-build changes) and component cost. Status moves to "Complete" on the queue. |
| 12 | System updates: raw materials deducted, finished door added to inventory with full cost breakdown and final specs | System (automatic) | Raw material stock, component costs | Total door cost = sum of all component material costs (weighted average). If specs were changed during the build, the final door record reflects what was actually built, not what was originally approved. |

**Door Shop Queue:**
The Door Shop Queue is a dedicated view for the door shop showing all approved doors. It is NOT a dashboard — it's an action list. It shows:
- **Not Started:** Approved doors awaiting production, listed in priority order set by the Office Manager
- **In Progress:** Doors currently being built
- **Complete:** Finished doors not yet shipped

The Office Manager controls priority order. The Door Shop works top to bottom. No ambiguity about what to build next.

**Must-Haves for this workflow:**
- **The digital door sheet is the single source of truth — no paper copies.** One shared tablet in the door shop to start. Expand to more devices if needed.
- **All spec changes during the build must be captured digitally.** If something changes mid-build (hardware swap, dimension adjustment), the Door Shop updates the door sheet in the app. Change history is logged — who changed what and when.
- **Office Manager sets up the door sheet. Sales Manager approves it. Door Shop builds it.** Clear separation of responsibility.
- **SM approval is mandatory before production.** This prevents building doors to the wrong spec — a known pain point. The SM owns the accuracy of the door sheet.
- **Door Shop Queue** is the single source of truth for what the door shop should be working on, in what order
- Office Manager controls queue priority — Door Shop executes in order
- Templates pre-fill everything — Office Manager adjusts exceptions only
- Component material swaps are easy (for custom hardware requests)
- Stock check before production starts — cannot build what you don't have (with override for emergencies)
- Finished door record reflects what was **actually built** (including mid-build changes), not just what was originally approved — with full cost breakdown
- **System must capture production timestamps from day one** — when a door moves to "In Progress" and when it hits "Complete." This data is required for Phase 2 features.

**Phase 2 Parking Lot (Door Shop Queue):**
1. **Estimated start dates** based on historical build durations by door type and current queue depth. Requires accumulated production timestamp data before it can predict accurately.
2. **LLM-driven priority suggestions** based on job start dates, customer, door type complexity, time in queue, and business rules defined by Admin. Goal: data-driven prioritization that supplements (or replaces) manual ordering. Requires Admin to define what "good prioritization" means for RSNE — job deadline? Customer revenue? Margin? — and enough queue history for the LLM to reason over.

---

### Workflow 7: Panel / Floor Fabrication (Batch Assembly)

**Trigger:** Panels or floor sections need to be fabricated for an upcoming job.

| Step | Action | Actor | Data Required | Must-Haves |
|------|--------|-------|---------------|------------|
| 1 | Open "Build Assembly" → select "Panel" or "Floor" | Shop Foreman | — | Same entry point as door fabrication |
| 2 | **Select an existing template OR build a new assembly.** If template exists (e.g., "4\" Floor Panel", "IMP Wall Panel"), select it. If the build is non-standard (different size, different materials, custom finish), tap "New Assembly" to define it from scratch. | Shop Foreman | Assembly templates, product catalog | Templates cover the common builds. "New Assembly" handles everything else — different dimensions, a flat white shell instead of standard embossed, a one-off panel size. Must be equally easy to use either path. |
| 3 | **If new assembly:** Select assembly type (Panel or Floor), enter specs (dimensions, finish, materials), and build the component list by selecting products from the catalog and entering quantities per unit. The LLM can suggest a starting component list based on the specs entered (e.g., "4-inch panel" triggers a suggested list based on similar templates). Option to save as a new template for future reuse. | Shop Foreman | Product catalog, existing templates for LLM reference | Building a new assembly should not feel like a data entry chore. LLM suggests components based on what the Foreman enters for specs. Foreman confirms/adjusts. Option to save as template is offered but not required. |
| 4 | Enter batch quantity (how many panels/floors are being made in this press run) | Shop Foreman | Template or custom materials | Quantities auto-multiply by batch size |
| 5 | Enter job name (if job-specific) or mark as "stock" (made for general inventory) | Shop Foreman | Job list | Must support both job-specific AND general stock production |
| 6 | Review materials — adjust if actual usage differs from template or custom spec | Shop Foreman | Materials × batch quantity, current stock | Show total materials needed for the batch vs. what's on hand |
| 7 | Confirm production — item appears in the **Fabrication Queue** | Shop Foreman | Summary | One-tap confirm. Item enters the Fabrication Queue as "In Progress." |
| 8 | Complete production — tap "Complete" | Shop Foreman | Active build record | Finished panels/floors added to finished goods inventory. Status moves to "Complete" on the queue. |
| 9 | System updates: raw materials deducted for the batch, finished items added to inventory (quantity = batch size) with full cost breakdown | System (automatic) | Stock levels, costs | Each panel/floor carries its proportional material cost. System must capture production timestamps (start and complete) from day one. |

**Fabrication Queue:**
The Fabrication Queue is the Shop Foreman's action list for all non-door assemblies (panels, floors, and any future assembly types). Same concept as the Door Shop Queue but owned and prioritized by the Shop Foreman. It shows:
- **Not Started:** Approved assemblies awaiting production, in priority order set by the Shop Foreman
- **In Progress:** Builds currently underway
- **Complete:** Finished items not yet shipped

The Shop Foreman controls priority. This is his queue — he decides what to build next.

**Must-Haves for this workflow:**
- **Two paths to production: template or new assembly.** Templates for repeatable builds, "New Assembly" for anything custom. Both paths feed into the same queue and cost tracking.
- **LLM-assisted new assembly creation.** When building a custom assembly, the LLM suggests a component list based on specs entered. Foreman confirms or adjusts — not starting from a blank page.
- **Option to save a custom assembly as a new template** for future reuse. Offered but not required — the Foreman shouldn't be forced to template something they'll only build once.
- Batch production: one action produces multiple units
- Job-specific vs. general stock toggle
- Leftover panels from jobs are retained in finished goods inventory (not "consumed")
- Material cost is divided proportionally across the batch
- **Fabrication Queue** is the Foreman's single source of truth for what to build and in what order
- System captures production timestamps from day one

**Phase 2 Parking Lot (Fabrication Queue):**
1. **Estimated start/completion dates** based on historical build durations by assembly type and current queue depth.
2. **LLM-driven priority suggestions** based on job dates, assembly complexity, time in queue, and business rules.

---

### Workflow 8: Finished Goods Allocation & Shipment

**Trigger:** A completed door, panel, or floor section is loaded for delivery to a job site.

| Step | Action | Actor | Data Required | Must-Haves |
|------|--------|-------|---------------|------------|
| 1 | Open "Ship Finished Goods" or access from the job's BOM | Shop Foreman | Completed assemblies in inventory, job list | Accessible from the assembly inventory view OR from the job BOM |
| 2 | Select the finished goods to ship (door serial/ID, panel batch) | Shop Foreman | Finished goods inventory with specs | Easy identification — show key specs (size, type, job assignment if pre-allocated) |
| 3 | Assign to job (if not already assigned) | Shop Foreman | Job list | If already assigned during production, this is pre-filled |
| 4 | Confirm shipment | Shop Foreman | Summary | One-tap confirm |
| 5 | System updates: finished good moves from "Completed" to "Shipped." Removed from on-hand inventory. Logged against the job. | System (automatic) | Inventory, job record | Transaction logged with timestamp, user, job. |

**Must-Haves for this workflow:**
- Finished goods must be trackable from production through shipment
- Pre-allocated assemblies (built for a specific job) should surface automatically on that job's BOM

**Note on job-site-direct materials returning to the shop:**
Materials sometimes ship directly to a job site and never pass through the shop. The PO/billing system (Knowify/QBO) handles job costing for those materials — that's out of scope for this app. However, when leftover material from a job site comes back to the shop, it needs to enter inventory. This is handled through the standard **Receiving workflow (WF1)** as a manual entry, with the job name attached for traceability. The app tracks what's in the shop — not what's on a job site.

---

### Workflow 9: Stock Monitoring & Reorder Alerts

**Trigger:** Continuous / dashboard-driven.

| Step | Action | Actor | Data Required | Must-Haves |
|------|--------|-------|---------------|------------|
| 1 | Dashboard shows real-time stock status with color-coded indicators | System → All users | Current stock vs. reorder points | Always visible on the home screen. No clicks required. |
| 2 | "Needs Ordering" view shows all items with projected demand across all three layers (see below), sorted by urgency | System → Office Manager, Admin | Stock levels, reorder points, lead times, all demand layers | Sorted by urgency (factoring in lead time). Shows projected stockout date. Each item shows where the demand is coming from — firm, projected, or baseline. |
| 3 | Office Manager can run "what if" scenarios: "If all projected jobs land as scheduled, what do we run out of and when?" | Office Manager | All demand layers, current stock, lead times | The material planner surfaces conflicts early — e.g., "If Job A and Job B both start in March, you'll need 40 panels but only have 25 and lead time is 5 weeks." |
| 4 | For blanket order items, show current draw vs. PO total (future) | System | Blanket order tracking | Post-MVP: track how much has been drawn from blanket orders |
| 5 | Office Manager places orders externally (Knowify PO or phone call) | Office Manager | Reorder list | The app does NOT place orders — it tells you what to order. Export/copy reorder list capability. |

**Three Layers of Demand:**

The reorder system cannot rely solely on approved BOMs — by the time a BOM is created, it may be too late for long-lead-time materials. Demand is calculated across three layers:

1. **Firm Demand (BOMs + Fabrication Queues):** Materials committed to approved BOMs, plus all components needed for items in the Door Shop Queue and Fabrication Queue. This is the floor — these materials are spoken for. It's rare for a door to be pulled from the queue once it's in, so queue demand should be treated as firm.

2. **Projected Demand (Material Planner):** Jobs that are sold or likely but don't have BOMs yet. The Office Manager (or SM) can tag an upcoming job with an estimated material profile — either manually or by referencing a similar past job. This is the planning layer that closes the gap between "job is sold" and "BOM is created." Projected demand is shown separately from firm demand so the Office Manager can see what's confirmed vs. what's anticipated.

3. **Historical Baseline:** Average consumption rates over the trailing 90 days, used as a backstop for items that get consumed steadily regardless of specific jobs (e.g., caulk, gasket, fabrication supplies). If an item has no firm or projected demand but historically moves X units per week, the system factors that in.

The "Needs Ordering" view shows all three layers for each item, clearly distinguished. The Office Manager sees the full picture: what's committed, what's coming, and what the baseline trend looks like — then decides what to order.

**Must-Haves for this workflow:**
- Dashboard alerts are passive — the system tells you what needs attention without being asked
- **Demand forecasting uses all three layers** — not just approved BOMs. Firm demand is the floor, projected demand extends visibility, historical baseline catches the rest.
- **Fabrication queue demand is treated as firm** — once a door or assembly is in the queue, its component materials are effectively committed.
- Lead time awareness: an item with a 6-week lead time triggers earlier than one with a 1-week lead time
- **Material planner for projected demand** — Office Manager can input anticipated jobs and their rough material needs before a BOM exists, so long-lead-time items get ordered in time
- Scenario planning: "If these jobs all land as scheduled, what runs short?" — surfaces conflicts before they become emergencies

---

### Workflow 10: Inventory Adjustment (Cycle Count / Spot Check)

**Trigger:** Periodic verification or when a discrepancy is noticed.

| Step | Action | Actor | Data Required | Must-Haves |
|------|--------|-------|---------------|------------|
| 1 | Open "Cycle Count" — system suggests a set of products to count (rotating through the full catalog over time) | System → Foreman or Admin | Product catalog, last count date per product | System suggests items that haven't been counted recently or have high transaction volume |
| 2 | Foreman physically counts the item | Shop Foreman | Location in shop | Product card shows storage location for easy finding |
| 3 | Enter the actual count | Shop Foreman | System quantity for comparison | Show system quantity AFTER the user enters their count (prevents anchoring bias) |
| 4 | If discrepancy: system prompts for a reason (optional note) | Shop Foreman | Variance | Pre-populated reason options: "Damaged/Scrap," "Miscounted," "Used but not logged," "Found extra" + free text |
| 5 | Confirm adjustment | Shop Foreman | Adjustment summary | Clear display of old qty → new qty |
| 6 | System updates: stock adjusted, variance logged for reporting | System (automatic) | — | Adjustment history is retained and reportable (to identify chronic discrepancy areas) |

**Must-Haves for this workflow:**
- System-guided counts (don't rely on the Foreman to decide what to count)
- Show system qty AFTER entry to prevent bias
- Variance tracking over time (identifies systemic issues)
- Quick and simple — counting one item should take under 15 seconds in the app

---

## 6. Design System & UI Guidelines

### Philosophy

**"So easy a 3-year-old can do it."** — Follow Apple's design philosophy. Every screen should have one clear primary action. Minimize text input. Maximize taps over typing. If you have to explain how to use it, redesign it.

### Brand Colors

Derived from [rsofne.com](https://www.rsofne.com):

| Token | Hex | Usage |
|-------|-----|-------|
| `--navy` | `#0B1D3A` | Primary background (headers, nav), primary text on light backgrounds |
| `--navy-light` | `#132C52` | Secondary backgrounds, cards on dark surfaces |
| `--blue-accent` | `#2E7DBA` | Interactive elements (buttons, links, active states) |
| `--blue-bright` | `#3A8FD4` | Hover states, secondary actions |
| `--orange` | `#E8792B` | Primary CTA buttons, alerts requiring action, highlights |
| `--orange-hover` | `#D06820` | CTA hover/active state |
| `--white` | `#FFFFFF` | Page backgrounds, card backgrounds |
| `--off-white` | `#F4F6F8` | Secondary backgrounds, alternating rows |
| `--gray-light` | `#E2E6EB` | Borders, dividers |
| `--gray-mid` | `#8899AB` | Placeholder text, disabled states |
| `--gray-text` | `#4A5B6E` | Secondary text, labels |
| `--green` | `#22C55E` | In-stock, success, confirmed |
| `--yellow` | `#EAB308` | Low stock, warnings |
| `--red` | `#EF4444` | Out of stock, errors, critical alerts |

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | Plus Jakarta Sans | 700 (Bold) | 24–32px |
| Subheadings | Plus Jakarta Sans | 600 (Semibold) | 18–20px |
| Body text | DM Sans | 400 (Regular) | 16px |
| Labels / captions | DM Sans | 500 (Medium) | 14px |
| Button text | DM Sans | 600 (Semibold) | 16px |
| Numbers / quantities | DM Sans Mono or tabular figures | 500 | 18–24px |

### Layout Principles

1. **Mobile-first.** Design for a phone screen (375px wide) first. Tablet and desktop are progressive enhancements.
2. **Bottom navigation.** Primary nav at the bottom of the screen (thumb-reachable). Max 4-5 tabs: Dashboard, BOMs, Inventory, Assemblies, More.
3. **Card-based UI.** Everything is a card — products, BOMs, assemblies, transactions. Cards are tappable, swipeable, scannable.
4. **Large touch targets.** Minimum 48x48px for any tappable element. Primary action buttons are full-width on mobile.
5. **One primary action per screen.** The main thing the user can do should be immediately obvious — a single prominent button (orange CTA).
6. **Progressive disclosure.** Show the essential info first. Details on tap. Don't overwhelm with data.
7. **Status colors everywhere.** Green/yellow/red indicators on stock, BOMs, assemblies — the user should be able to assess status without reading.
8. **Smooth transitions.** Screen changes should animate (slide, fade). Confirming an action should have tactile feedback (subtle animation, checkmark, haptic if supported).

### Screen Templates (Key Screens)

**Dashboard (Home)**
- Greeting + role-based quick actions ("Check Out Materials", "Receive Material", "Build Door")
- Alert cards: items needing attention (low stock, pending BOMs, assemblies in production)
- Today's jobs (BOMs departing today)
- Stock health summary (pie or bar — % of items green/yellow/red)
- Unread notification badge

**Inventory List**
- Search bar at top (always visible) — supports natural language via LLM
- Category filter chips (horizontal scroll)
- Product cards showing: name, category, current qty, status color, location
- Tap card → product detail (stock history chart, recent transactions, cost info)

**BOM Builder**
- Pre-populated job name/number selector (from active jobs list)
- Unified LLM input field: voice dictation, typed natural language, or browse catalog — all resolve to structured line items
- Confirmation cards: each item parsed by LLM shown as a card (product name, qty, unit) with edit/remove options
- Assembly items show name + qty (expandable to see components)
- Non-catalog items captured with structured fields (name, qty, unit, est. cost) via LLM parsing
- Role-based views: SM sees confirmation + submit; Foreman/OM sees what needs ordering
- Creator attribution (SM who built the BOM)

**BOM Detail / Checkout Screen**
- Job name + status + BOM creator at top
- Full BOM displayed (all tiers) — Tier 1 items have checkboxes for stock deduction; Tier 2 items shown but grayed (tracked for costing only)
- Tap checkbox = confirmed at full quantity. Tap quantity to adjust.
- "Add Item" via LLM-mediated input (same as BOM Builder)
- Bottom bar: "Confirm Checkout" (orange CTA)

**Door Sheet (Digital)**
- Door specs: dimensions, hardware, insulation, finish — large clear fields
- SM approval status badge (Draft → Pending Approval → Approved)
- Component materials list (auto-populated from template, editable)
- Change log: every mid-build spec change recorded with who, what, when
- No print option — single digital source of truth

**Door Shop Queue**
- Three swimlanes or filtered list: Not Started → In Progress → Complete
- Each card: door name, job, specs summary, priority (set by Office Manager)
- Tap card → opens full digital door sheet
- Priority is drag-to-reorder (Office Manager) or read-only (Door Shop)

**Fabrication Queue**
- Same layout as Door Shop Queue but for panels, floors, other assemblies
- Priority set by Shop Foreman
- Each card: assembly name, type, job, batch size, status

**Assembly Production Screen**
- Two paths: select from template OR build new assembly
- Template selector (visual cards with door/panel images or icons)
- New assembly: LLM-assisted component suggestion based on description
- Spec form (big, clear fields)
- Component materials list (expandable, pre-filled from template)
- Stock status per component (green/yellow/red)
- "Start Build" → "Complete Build" flow with clear state transitions
- Option to save custom assembly as new template

**Material Planner (Phase 4)**
- Input projected jobs with estimated material profiles (Layer 2 demand)
- Scenario planning: toggle jobs on/off to see impact on projected stockouts
- Visual timeline showing firm demand (BOMs/queues) + projected demand layered on top
- Alerts for items where combined demand exceeds supply within lead time window

---

## 7. Data & Reporting Requirements

### Inventory Valuation
- Weighted average cost (WAC) method — recalculated on every receipt
- Valuation report by category: raw materials, finished goods (fabricated), finished goods (purchased)
- Exportable to CSV for QuickBooks journal entries

### Job Costing Export
- Per-job material usage report: every material checked out, returned, and net consumed — with costs
- Includes both raw materials and finished goods (doors, panels) allocated to the job
- Exportable to CSV in a format compatible with Knowify's import

### Usage Analytics
- Material consumption over time (weekly, monthly, quarterly) by product and category
- Trend identification: which materials are you burning through fastest?
- Basis for forecasting

### Demand Forecasting (Three-Layer Model)
The forecasting system uses three layers of demand, as defined in Workflow 9:
- **Layer 1 — Firm Demand:** Approved BOMs + Door Shop Queue + Fabrication Queue. Materials are committed.
- **Layer 2 — Projected Demand:** Jobs that are sold or likely but don't have BOMs yet. Office Manager or SM inputs estimated material profiles for upcoming jobs.
- **Layer 3 — Historical Baseline:** Trailing 90-day average consumption as a backstop for steady-use items.

Reports should show:
- Projected material needs by week across all three layers, clearly distinguished
- Projected stockout dates factoring in lead times
- Scenario planning: "If all projected jobs land as scheduled, what runs short and when?"
- Items needing ordering now given lead times vs. projected demand

### Stock Accuracy
- Cycle count variance report: system qty vs. actual qty, by product and over time
- Highlights chronic discrepancy areas (indicates process or tracking gaps)

---

## 8. High-Level Rules

These are non-negotiable architectural and product rules:

1. **LLM-Native Architecture.** The app must be built to advance as the underlying LLMs advance. Minimize hard-coded business logic and scripting. Maximize use of LLM capabilities for natural language search, smart suggestions, anomaly detection, and conversational interfaces. The architecture should expose clean APIs and data structures that LLMs can reason over.

2. **No External Tool Constraints.** The app design (front and back end) cannot be limited by Knowify or QuickBooks capabilities in any way. Claude determines the optimal data model and workflows. Knowify and QBO must work around the app, not the other way around. Integrations are adapters, not constraints.

3. **Claude-Driven Development.** Development and debugging must be performed by Claude (via Claude Code). The user (Gabe) has no development experience. Claude must be able to build, test, debug, and deploy autonomously with Gabe providing product direction and feedback.

4. **Modular Architecture.** The app architecture must support easy bolt-on of additional features without refactoring core systems. Examples of future modules: phone-based barcode/QR scanning, OCR for packing slips and invoices, photo documentation, supplier portals, Knowify/QBO sync. Each module is independent and connects via clean APIs.

5. **No Scope Creep.** We are focused on inventory first and foremost. Every feature must directly serve one of the 10 core workflows defined in this PRD. If a feature doesn't serve a workflow, it doesn't get built.

6. **Direct API Integration.** Data flows into and out of the app via direct API connections or MCP. Zapier, n8n, and other workflow orchestration tools are an absolute last resort. The default is to build native integrations.

7. **Self-Contained Data.** The app owns its own data. It does not depend on Knowify or QBO as a source of truth for anything. It may sync with those systems, but the inventory app is the single source of truth for all inventory data.

---

## 9. Phased Delivery

### Phase 1: Foundation (Weeks 1–2)
- User auth + roles
- Product catalog (CRUD, categories, units, locations, reorder points, costs)
- Manual stock adjustments
- Dashboard with stock health and alerts
- Mobile-responsive layout with RSNE branding
- Search and filter

### Phase 2: BOM & Material Flow (Weeks 3–4)
- BOM creation with templates
- Material checkout workflow (Workflow 3)
- Additional pickup workflow (Workflow 4)
- Material return workflow (Workflow 5)
- Material receiving workflow (Workflow 1)
- Transaction history (audit trail)
- In-app notifications for Foreman

### Phase 3: Fabrication & Finished Goods (Weeks 5–6)
- Assembly templates (doors, panels, floors)
- Door fabrication workflow (Workflow 6) including digital door sheet with SM approval gate
- Panel/floor batch production workflow (Workflow 7) with save-as-template option
- Door Shop Queue (prioritized by Office Manager) and Fabrication Queue (prioritized by Shop Foreman)
- Finished goods inventory view (fabricated vs. purchased, with visual badges)
- Finished goods allocation & shipment (Workflow 8)

### Phase 4: Intelligence & Reporting (Weeks 7–8)
- Inventory valuation report (WAC)
- Job costing material export (CSV)
- Usage analytics and trends
- Three-layer demand forecasting (firm + projected + historical baseline)
- Reorder report with lead time awareness (Workflow 9)
- Cycle count tool (Workflow 10)
- Material planner for projected job demand (Layer 2 input)
- Dashboard KPIs (inventory turns, spend by category, stock accuracy)

---

## 10. Success Criteria

The app is successful when:

1. Monthly full-day physical counts are eliminated — replaced by cycle counts taking <30 minutes/week
2. Zero paper BOMs — all material checkout/return is tracked digitally
3. All fabricated goods (doors, panels, floors) are tracked from production through shipment
4. Real-time inventory valuation is available at any moment without manual counting
5. Material is ordered proactively based on upcoming job demand, not reactively when "it gets low"
6. The Shop Foreman voluntarily uses the app without being reminded — because it's faster than the paper process

---

*This document is the source of truth for what gets built. All technical decisions in the TRD must trace back to a requirement in this PRD.*
