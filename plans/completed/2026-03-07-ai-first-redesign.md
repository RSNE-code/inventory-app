# AI-First Redesign — Workflow Audit & Interaction Layer Plan

**Date:** 2026-03-07
**Status:** Implemented
**Purpose:** Audit all 10 PRD workflows against reality, determine what the app owns vs. bridges, and redesign the interaction layer to be AI-first.

---

## The Core Problem

We built a traditional CRUD app with forms and tables. The PRD calls for an LLM-native app where AI-mediated input is primary and manual entry is the fallback. We violated that from the start. This plan corrects course.

## The Guiding Principles

1. **AI is the primary interface.** Conversational input, photo parsing, voice — forms exist but are secondary.
2. **Capture data at the point of contact.** The person physically touching the material should be the one who records it. No handoff chains.
3. **The app is the source of truth for inventory.** Everything that affects what's physically in the shop lives here.
4. **Don't duplicate what already has a home.** If Knowify owns POs and job costing, don't rebuild PO management. Sync what's needed.
5. **"So easy a 3-year-old can do it."** One action, one confirmation. If it takes more than that, redesign it.

---

## Current Tool Landscape (from PRD + context)

| Tool | What It Owns Today | Relationship to Our App |
|------|--------------------|------------------------|
| **Knowify** | POs, job management, job costing, billing, supplier management | App ingests POs and job list from Knowify. PO data is used for receiving match. Knowify consumes material usage data FROM our app. Knowify does NOT own inventory. |
| **QuickBooks** | Accounting, financials | App exports valuation/costing data to QBO. No real-time integration needed initially. |
| **Paper BOMs** | Job material lists (current process) | Eliminated by our app. Replaced by AI-parsed BOM creation. |
| **Paper door sheets** | Door specs for fabrication | Eliminated by our app. Replaced by digital door sheet. |
| **Packing slips (paper)** | Proof of delivery | Captured by photo in our app at receiving. No more scanning/uploading chain. |
| **Spreadsheets** | Ad hoc inventory tracking | Eliminated. App is the source of truth. |

---

## Workflow-by-Workflow Audit

### WF1: Receiving

**Current real-world process:**
1. Shipment arrives at the shop
2. Shop Foreman receives it physically
3. Foreman hands packing slip to Office Manager
4. Office Manager scans the packing slip
5. Office Manager uploads scan to the job in Knowify
6. Office Manager marks PO as received in Knowify

**What's wrong:** 5 steps and 2 people for what should be 1 step and 1 person. The foreman is AT the material. He should capture it right there.

**What the app owns:** Receiving IS inventory. The app owns this completely.

**AI-first interaction (two paths, both end in one-tap confirm):**

**Path A — Photo first (no PO context):**
- Foreman snaps a photo of the packing slip
- AI parses: supplier, items, quantities, PO number (if visible)
- AI matches parsed items against open POs synced from Knowify — selects the most likely PO match
- AI also matches items to catalog products (fuzzy matching — packing slips never match catalog names exactly)
- Foreman sees a confirmation card: "Matched to PO #4521 from ABC Supply — 20 sheets 4" IMP White/White, 5 boxes hinges, 2 cases caulk. Confirm?"
- One tap to confirm. Stock updates. PO marked partially/fully received. Transaction logged. Packing slip image stored.
- If AI can't match an item, it asks: "I see '4in IMP W/W 3x20' — is this '4" IMP White/White 3x20'?" Foreman taps yes/no.

**Path B — PO first (foreman knows which order it is):**
- Foreman selects the PO from a list of open POs (synced from Knowify)
- App shows expected items and quantities from that PO
- Foreman snaps a photo of the packing slip
- AI parses the photo and confirms quantities received against the PO — highlights any discrepancies (short shipments, extras, wrong items)
- Foreman reviews and confirms. One tap.

Both paths end the same way: stock updates, PO receipt status updates, WAC recalculates (if cost is on the packing slip — otherwise cost comes from the PO data synced from Knowify), packing slip image stored.

**PO ingestion from Knowify:** Open POs sync from Knowify into the app automatically. This gives us the expected items, quantities, costs, and supplier for each order. The app does NOT create POs — ordering stays in Knowify. But when materials arrive, the app matches the receipt against the PO and owns the receiving record.

**What about Knowify?** The app can push receiving status back to Knowify via API so the Office Manager doesn't have to mark it received there separately. Even if that push-back doesn't exist on day one, receiving in the app still eliminates the 5-step handoff chain.

**Fallback (manual):** Traditional form — select supplier, scan/search items, enter quantities. Available but not the default path.

---

### WF2: BOM Creation

**Current real-world process:**
- Sales Manager writes a paper BOM listing everything a job needs
- Or dictates it / types it from memory while reviewing plans

**What the app owns:** BOM creation and management — completely.

**AI-first interaction:**
- SM opens "New BOM," selects job from list (synced from Knowify or managed in-app)
- **Primary input: natural language.** SM types or voice-dictates: "20 feet of copper pipe, 4 90-degree elbows, box of screws, 2 tubes silicone, one 3x7 swing door standard hardware"
- AI parses into structured line items, matches to catalog, identifies tier (1 or 2), flags non-catalog items
- Each item appears as a confirmation card the SM can tap to edit or remove
- Non-catalog items are structured by the AI (not left as free text): "4in galvalume angle trim, 10ft" becomes Category=Metal Trim, Dimension=4", Finish=Galvalume, Shape=Angle, Qty=10, UOM=linear ft
- **Photo input:** SM can also snap a photo of a handwritten BOM or a plan detail — AI parses it the same way
- Live stock visibility shows green/yellow/red per item as the BOM is built
- Submit sends to appropriate views per role (per PRD)

**What about Knowify?** Job list can sync from Knowify. Material usage data flows back to Knowify for job costing. BOM creation itself lives entirely in our app.

**Fallback (manual):** Browse catalog, search products, add line items with quantity fields. Available but secondary.

---

### WF3: Material Checkout

**Current real-world process:**
- Foreman gets the approved BOM (paper or digital)
- Pulls materials from shelves
- Loads the truck

**What the app owns:** Checkout tracking, stock deduction — completely.

**AI-first interaction:**
- Foreman opens the BOM for the job (one tap from dashboard — "Today's Jobs" shows BOMs departing today)
- Sees the full checklist. For each item: product name, qty needed, location in shop, stock status
- **Bulk confirm:** "Check out all" button for the common case where everything goes as planned. One tap, everything deducted. Done.
- **Partial/adjusted:** Tap individual items to change quantity (took 18ft instead of 20ft). Or voice: "Only took 15 sheets of IMP instead of 20"
- **Add items:** Voice or typed: "Also grabbing a tube of caulk and 10 zip ties" — AI adds to the BOM, handles tier classification
- Confirm checkout. Stock updates. Transaction logged.

**Key simplification from current build:** The current checkout flow is too granular. Most of the time, the foreman takes exactly what's on the BOM. The default should be "confirm all" with exceptions, not item-by-item checkbox clicking.

**Fallback (manual):** Item-by-item checkboxes with quantity adjustment fields. Available but not default.

---

### WF4: Additional Pickup

**Current real-world process:**
- Crew needs more material mid-job
- Someone calls/texts the shop
- Foreman pulls it, crew picks it up

**What the app owns:** Tracking the additional material against the job.

**AI-first interaction:**
- Foreman (or crew in Phase 2) opens the job BOM
- Voice or typed: "Adding 5 more sheets of IMP and 2 tubes caulk for Hannaford job"
- AI adds items, deducts stock, logs transaction
- One confirmation tap

**This is essentially the same as WF3 with an "add items" step.** It doesn't need a separate workflow or screen. It's just "open BOM, add and check out more stuff."

---

### WF5: Returns

**Current real-world process:**
- Crew comes back with leftover material on the truck
- Foreman puts it back on the shelf
- (Ideally) someone records what came back

**What the app owns:** Return tracking, stock adjustment — completely.

**AI-first interaction:**
- Foreman opens the job BOM
- Voice or typed: "Returning 5 sheets IMP and 8 feet copper pipe. Scrapped 2 tubes caulk."
- AI parses: 5 IMP → Full return, 8ft copper → Partial return, 2 caulk → Scrap
- Confirmation card shows: return to stock, partial return, scrap write-off
- One tap. Stock adjusts. Net usage calculated automatically.

**Fallback (manual):** Item list with return condition selector (Full/Partial/Scrap) and quantity fields.

---

### WF6: Door Fabrication

**Current real-world process:**
- Office Manager fills out a paper door sheet with specs
- Sales Manager approves the spec
- Paper door sheet goes to the door shop
- Door shop builds from the paper sheet
- Changes during build are noted on paper (or not noted at all)

**What the app owns:** Digital door sheet, approval flow, door shop queue, production tracking, material deduction — completely. This is a major pain point that no existing tool solves for RSNE.

**AI-first interaction:**
- **Door sheet creation (Office Manager):** Select door template (or describe: "Standard 3x7 swing door, stainless hinges, window insert, for Hannaford job"). AI pre-fills the spec sheet and component list from the template. OM reviews and adjusts.
- **Approval (Sales Manager):** Gets a notification. Sees the complete door sheet. One tap to approve or reject with a voice/typed note.
- **Queue (Door Shop):** Approved doors appear in priority order. Door Shop taps "Start Build." The digital door sheet IS the build reference — no paper.
- **Mid-build changes:** Door Shop voice-inputs changes: "Swapped standard hinges for heavy-duty." AI updates the spec, logs who/what/when.
- **Completion:** Tap "Complete." Raw materials deducted, finished door added to inventory with actual specs and cost.

**This workflow is complex but it's genuinely unique to RSNE — no off-the-shelf tool handles it.** The AI-first approach here is about reducing the data entry burden at each step, not eliminating the workflow steps themselves. The approval gate and queue structure are correct as designed.

---

### WF7: Panel / Floor Fabrication

**What the app owns:** Production tracking, material deduction, fabrication queue — completely.

**AI-first interaction:**
- Foreman: "Building 6 standard 4-inch floor panels for the Market Basket job"
- AI selects the template, sets batch qty to 6, assigns to job, multiplies materials
- Foreman reviews component list (AI pre-filled from template), adjusts if needed
- "Start Build" → queue. "Complete" → materials deducted, finished goods added.
- **New assembly (no template):** Foreman describes: "Custom 5-inch wall panel, galvalume exterior, white interior, 4x10." AI suggests a component list based on similar templates. Foreman confirms/adjusts. Option to save as new template.

**Same pattern as WF6 but simpler** — no approval gate, foreman owns the queue.

---

### WF8: Finished Goods Shipment

**What the app owns:** Tracking finished goods from completion to job site.

**AI-first interaction:**
- Doors, panels, and floors are already assigned to a job from the moment they enter the queue (WF6/WF7). By the time they're built and sitting in the shop, the job is already attached.
- Foreman opens the job or taps "Ship" from the completed items view
- App shows everything that's completed and assigned to that job — doors, panels, floors
- Foreman confirms what's going on the truck. One tap.
- Items move from inventory to shipped. Logged with timestamp.
- For the rare case where a finished good needs to be reassigned (e.g., a stock panel allocated to a different job than originally planned), the foreman can override — but the default is the job it was built for.

**This is the simplest workflow.** The job assignment is already done. Shipping is just confirming "these items left the building."

---

### WF9: Stock Monitoring & Reorder Alerts

**What the app owns:** Stock level tracking, alerts, demand forecasting.

**AI-first interaction:**
- **Passive:** Dashboard shows what needs attention without being asked. Low stock alerts, projected stockouts, items to reorder.
- **Active:** "What are we low on?" or "Do we have enough IMP for the next 3 jobs?" — AI answers from live data.
- **Forecasting:** Three-layer demand model (firm from BOMs/queues + projected from upcoming jobs + historical baseline). AI surfaces: "You'll run out of R-404A in 2 weeks if the Patterson and Ellis jobs both start on schedule."
- **Scenario planning:** "What happens if we push the Patterson job to April?" — AI recalculates.

**What about Knowify?** Job schedule data from Knowify feeds the projected demand layer. Material ordering still happens externally (Knowify PO or phone). The app tells you WHAT to order and WHEN — it doesn't place orders.

**This workflow is almost entirely AI-driven by nature.** No forms needed. It's analysis and alerts.

---

### WF10: Cycle Counts

**What the app owns:** Stock accuracy verification — completely.

**AI-first interaction:**
- App suggests what to count (items not counted recently, high-variance items, high-value items)
- Foreman goes to the shelf, counts
- Voice or typed: "I count 14 sheets of IMP White/White"
- System shows variance AFTER entry (prevents anchoring bias per PRD)
- If variance: "That's 3 less than system shows. Reason?" Foreman taps a reason or says "used but not logged"
- Adjustment confirmed. Variance logged for trend tracking.

**Fallback (manual):** Product list with quantity entry field. But voice input is faster when you're standing at a shelf with your hands full.

---

## What Changes in the Existing Codebase

### Keep (foundation is solid)
- Database schema and Prisma models (27 models, relationships, enums)
- Stock management logic (`src/lib/stock.ts`) — all stock changes through one system
- WAC calculation logic (`src/lib/cost.ts`)
- Auth and roles (Supabase Auth)
- Shop unit conversion system (`src/lib/units.ts`)
- API route structure (the plumbing)
- Deployment infrastructure (Vercel, Supabase, GitHub)

### Rethink (interaction layer)
- **Every page that's currently form-first needs an AI-first input mode as the primary path**
- BOM creation page — needs LLM-mediated input (text/voice/photo) as the primary method
- Checkout page — needs "confirm all" as default, with voice input for adjustments
- Receiving — needs photo-based packing slip parsing as the primary method
- Inventory list — natural language search ("do we have 4-inch IMP?") alongside traditional filters

### Build New
- **AI input service** — central service that handles: text parsing, voice transcription, image/photo parsing (OCR + LLM reasoning), catalog matching (fuzzy), structured output generation
- **Conversational UI component** — reusable chat-style input that works across BOM creation, checkout, receiving, returns, adjustments
- **Photo capture + parsing pipeline** — camera integration, image upload, AI extraction, confirmation cards
- **Knowify integration layer** — job list sync, and eventually receiving/PO data sync

---

## Proposed Rebuild Sequence

### Step 1: AI Input Foundation
Build the core AI service that powers everything else:
- Text-to-structured-data parsing (natural language → `ParsedLineItem[]`)
- Photo-to-structured-data parsing (packing slip photo → items list; handwritten BOM photo → items list)
- Catalog fuzzy matching (packing slip says "4in IMP W/W 3x20" → matches to "4" IMP White/White 3x20")
- Confirmation card UI component (shows AI interpretation, allows edit/accept/reject)
- Conversational input component (text field + camera button + voice button)

This is the engine that makes everything else AI-first.

### Step 2: Receiving (WF1) — AI-First
Rebuild receiving as the showcase AI workflow:
- Foreman snaps packing slip → AI parses → confirm → done
- This is the highest-impact workflow to demonstrate the AI-first approach because:
  - It eliminates a 5-step, 2-person handoff chain
  - It's the most frequent inventory action
  - The foreman is already the point of contact
  - It proves the photo parsing pipeline works

### Step 3: BOM Creation (WF2) — AI-First
Rebuild BOM builder with LLM-mediated input:
- Natural language / voice as primary input
- Photo of handwritten BOM as input
- Catalog matching, tier classification, non-catalog structuring
- All per the PRD spec that we should have followed from the start

### Step 4: Checkout & Returns (WF3, WF4, WF5) — Simplified
Rebuild checkout with "confirm all" default:
- Most checkouts are "take everything on the BOM" — make that one tap
- Adjustments and additions via voice/text input
- Returns via voice input with condition classification (full/partial/scrap)

### Step 5: Fabrication (WF6, WF7, WF8)
Build door sheet, queues, and fabrication tracking:
- AI-assisted template selection and component suggestions
- Digital door sheet as single source of truth
- Queue management with priority ordering
- Voice input for mid-build spec changes

### Step 6: Intelligence (WF9, WF10)
Build the analysis and forecasting layer:
- Dashboard alerts and stock monitoring
- Three-layer demand forecasting
- Conversational queries ("what are we low on?")
- AI-guided cycle counts

---

## Key Technical Decisions Needed

1. **LLM provider for in-app AI:** Anthropic Claude API (via Vercel AI SDK) is already in the tech stack per the PRD. Use Claude for all parsing, matching, and conversational features.

2. **Voice input:** Web Speech API (browser-native) for transcription, then send text to Claude for parsing. No separate speech service needed initially.

3. **Photo/OCR pipeline:** Send images directly to Claude's vision capabilities. Claude can read packing slips, handwritten BOMs, and extract structured data. No separate OCR service needed.

4. **Knowify API:** Need to investigate Knowify's API capabilities for PO ingestion, job list sync, and pushing receiving data back. PO ingestion is critical — receiving matches against open POs. This is a research task.

---

## What This Plan Does NOT Cover

- Detailed UI/UX mockups for each screen (separate task once this plan is approved)
- Knowify API integration specifics (requires API documentation research)
- QuickBooks export format (Phase 4)
- Offline support (important but separate concern)
- Barcode/QR scanning (future enhancement, not core AI-first redesign)

---

## Decision Points for Gabe

1. **Receiving ownership is confirmed:** The app owns receiving. Foreman captures at point of contact. Office Manager no longer needs to be in the receiving chain. (Decided: YES)

2. **PO ingestion from Knowify confirmed:** POs are created in Knowify. Open POs sync into the app so receiving can match against them. The app does not create POs. (Decided: YES)

3. **Knowify relationship:** Knowify feeds us POs and job list. Whether we can push receiving records and material usage back to Knowify depends on their API — needs investigation. If their API doesn't support it, we may need CSV export or the Office Manager references our app directly instead of Knowify for that data. Either way, the app is the source of truth for inventory. (Decided: YES on ingest; push-back TBD pending Knowify API research)

4. **Voice input priority:** Must-have. The foreman needs to speak to the app, not type. This elevates voice from a nice-to-have to a core input method alongside photo. Web Speech API handles transcription, Claude handles parsing. (Decided: MUST-HAVE)

5. **Phase 2B (current checkout code):** Hold off on deploying. We'll rebuild it AI-first before anyone uses it. (Decided: HOLD)

---

*This plan replaces the previous phased approach. Once approved, I'll begin with Step 1 (AI Input Foundation) and work through sequentially.*
