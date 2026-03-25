# RSNE Inventory Management App — Development Plan

## Executive Summary

This plan outlines the development of a custom, full-stack inventory management application for Refrigerated Structures of New England (RSNE). The app is designed to replace monthly physical stock counts with real-time tracking, digitize the paper BOM workflow, and — critically — handle the fabrication side of RSNE's business (doors, panels, floors) that has made off-the-shelf tools a poor fit.

The plan is structured in four phases, starting with a usable MVP in ~4–6 weeks and building toward full production use. The app will be cloud-hosted, mobile-first, and simple enough that the Shop Foreman can use it with minimal training.

---

## Recommended Tech Stack

Given that you're new to app development and want something that's maintainable, mobile-friendly, and cost-effective, here's what I'd recommend:

**Frontend:** React with Next.js
- Works on phones, tablets, and desktops out of the box
- Next.js gives you both the frontend and the API layer in one project, which keeps things simple
- Large ecosystem means it's easy to find help and examples

**Backend/API:** Next.js API Routes (built into the same project)
- No need to manage a separate backend server
- Handles authentication, database queries, and business logic

**Database:** PostgreSQL (via Supabase)
- Supabase gives you a hosted Postgres database with a generous free tier
- Built-in authentication (login/roles), real-time subscriptions, and file storage
- You don't have to manage database servers yourself

**Hosting:** Vercel
- Deploys directly from your code repository (GitHub)
- Free tier handles moderate traffic easily
- Automatic HTTPS, fast globally, zero server maintenance

**Styling:** Tailwind CSS
- Utility-first CSS framework that makes it fast to build clean, responsive UIs
- Mobile-first by default

**Estimated Monthly Cost (at your scale):** $0–$30/month for hosting + database. Supabase free tier covers up to 500MB of database storage, and Vercel's free tier handles most small business workloads.

---

## Data Model Overview

The app needs to represent five core concepts:

### 1. Products (Raw Materials)
Every material you purchase and stock — insulated panels, sheet metal, hinges, gaskets, foam insulation, caulking, plywood, FRP, heater wire, etc.

| Field | Purpose |
|-------|---------|
| Name | e.g., "4" IMP White/White 3x20" |
| Category | Door Hardware, Insulated Metal Panel, Metal Raw Materials, etc. |
| Unit of Measure | each, linear ft, sq ft, sheet, tube, etc. |
| Current Quantity | real-time stock level |
| Reorder Point | threshold that triggers a low-stock alert |
| Location | where it lives in the shop (shelf, bay, rack) |
| Cost (weighted average) | running average cost for accurate valuation |

### 2. Bill of Materials (BOMs)
A digital version of your paper BOM — tied to a job, listing all materials needed.

| Field | Purpose |
|-------|---------|
| Job Name / Number | links to a project |
| Created By | Sales/Project Manager |
| Status | Draft → Approved → In Progress → Completed |
| Line Items | product, quantity needed, quantity actually pulled |

### 3. Assemblies (Finished Goods)
This is the key feature that off-the-shelf tools couldn't handle. An Assembly is a fabricated product — a door, a floor panel, a wall panel — that is made from raw materials and kept in inventory as a finished good.

| Field | Purpose |
|-------|---------|
| Assembly Type | Door, Floor Panel, Wall Panel |
| Specs | size, type, hardware config, job name (if job-specific) |
| Component Materials | what went into it (and how much) |
| Status | In Production → Completed → Allocated → Shipped |
| Quantity on Hand | how many finished units are in the shop |

**Assembly Templates:** For "standard" doors and panels, you'd define a template (a default recipe of materials). When the Shop Foreman builds a door, the app pre-fills the materials list from the template and he just confirms or adjusts. This mirrors the Knowify templates you already have but actually deducts from raw material inventory.

### 4. Inventory Transactions
Every movement of material gets logged — this is how the app maintains an accurate, auditable count without monthly physical counts.

| Transaction Type | When It Happens |
|------------------|-----------------|
| **Receive** | Material arrives from a supplier (PO receipt) |
| **Checkout** | Material leaves with a crew for a job (BOM checkout) |
| **Return** | Material comes back on the truck unused |
| **Consume** | Material is used in fabrication (assembly production) |
| **Adjust** | Manual correction after a spot check |
| **Transfer** | Finished good allocated to a job |

### 5. Users & Roles

| Role | Can Do |
|------|--------|
| **Admin** (you) | Everything — settings, reports, user management |
| **Manager** (Office Manager, VP Ops) | Create BOMs, receive inventory, view reports |
| **Foreman** | Check out materials, log assemblies, receive materials |
| **Crew** (future) | Check out/return materials from the field via mobile |

---

## Development Phases

### Phase 1: Foundation & Core Inventory (Weeks 1–2)

**Goal:** Get the basic app running with product management and stock tracking.

**What gets built:**
- User authentication (login, roles)
- Product catalog — add/edit/delete materials with categories, units, location, reorder points
- Manual stock adjustments (for initial data entry and corrections)
- Simple dashboard showing current stock levels and low-stock alerts
- Mobile-responsive layout that works on phones and tablets
- Search and filter by category, name, location

**What you can do after Phase 1:**
- Load your entire material catalog into the app
- See real-time stock levels on your phone
- Get alerts when stock drops below a threshold (instead of waiting for the Foreman to notice)

---

### Phase 2: BOM Workflow & Material Checkout (Weeks 3–4)

**Goal:** Digitize the paper BOM process so material movements are tracked automatically.

**What gets built:**
- Digital BOM creation — Project Manager builds the materials list for a job in the app (replaces the paper form)
- BOM templates for common job types (pre-filled material lists you can customize per job)
- **Checkout flow** — Shop Foreman opens the BOM on his tablet, checks off what's leaving with the crew. Stock levels update in real-time.
- **Return flow** — When crew comes back, Foreman marks what came back. Stock levels adjust.
- **Additional pickup flow** — If crews need more material mid-job, Foreman (or crew, in a future phase) can add items to the BOM and check them out
- Receiving — log incoming material deliveries against POs (manual PO entry for now)
- Transaction history — full audit trail of every material movement, searchable by job, date, product, or user

**What you can do after Phase 2:**
- Completely eliminate paper BOMs
- Know exactly what material went to which job, in real time
- Office Manager can allocate materials to jobs in Knowify based on actual usage data from the app (instead of estimates)
- Stop doing monthly physical counts — stock levels stay accurate through logged transactions

---

### Phase 3: Assemblies & Fabrication Tracking (Weeks 5–6)

**Goal:** Track fabricated goods (doors, panels, floors) as finished inventory.

**What gets built:**
- Assembly templates — define the "recipe" for each standard door type, panel type, etc. (mirrors your Knowify templates but connected to live inventory)
- **Production logging** — when the door shop builds a door, the Foreman selects the template, adjusts quantities if needed, and hits "Produce." Raw materials are deducted, and a finished door is added to inventory.
- Custom assemblies — for non-standard doors with special hardware, the Foreman can modify the template or build a BOM from scratch
- **Door sheet digitization** — the door spec sheet (size, type, hardware, job name) becomes a digital form in the app, linked to the assembly
- Finished goods inventory — see all completed doors, panels, and floors in the shop with their specs and allocated job
- Allocation — assign a finished good to a specific job when it ships

**What you can do after Phase 3:**
- See exactly how many doors, panels, and floors are sitting in the shop
- Know the material cost of each fabricated product (not just a template estimate — actual materials consumed)
- Track the door queue digitally instead of paper on a clipboard
- Accurate inventory valuation that includes both raw materials AND finished goods

---

### Phase 4: Reporting, Forecasting & Polish (Weeks 7–8)

**Goal:** Turn the data you're now collecting into actionable insight.

**What gets built:**
- **Inventory valuation report** — weighted average cost method, broken out by category. Replaces the "everything at most recent cost" approach.
- **Usage analytics** — see material consumption trends over time by product, category, or job type
- **Forecasting (basic)** — based on upcoming confirmed jobs and their BOMs, the app can project what materials you'll need and when, factoring in lead times. This replaces the "order when it gets low" approach.
- **Reorder report** — a single screen showing everything that's below reorder point or projected to run out before the next delivery window
- Spot check / cycle count tool — instead of full monthly counts, do quick partial counts to verify accuracy
- Dashboard improvements — KPIs like inventory turns, spend by category, stock accuracy %
- Data export (CSV) for use in QuickBooks or Knowify

**What you can do after Phase 4:**
- Generate an accurate inventory valuation at any time (no more full-day physical counts)
- Proactively order materials based on upcoming job demand + lead times
- Identify overstocked materials and reduce carrying costs
- Export data for your accountant or for job costing in Knowify

---

## Future Enhancements (Post-MVP)

These are features to consider once the core app is stable and your team is comfortable using it:

**Knowify Integration** — Sync jobs, POs, and material allocations so data flows between systems without double entry. This depends on Knowify's API availability.

**QuickBooks Integration** — Push inventory valuation and material cost data to QuickBooks for accurate financials without manual journal entries.

**Barcode/QR Scanning** — Print labels for shelf locations or high-volume items. Foreman scans to check out instead of searching by name. Most modern phones can scan QR codes with the camera — no special hardware needed.

**Crew Mobile Access** — Field crews log additional material pickups and returns from their phones on the job site.

**Supplier Portal / Blanket Order Tracking** — Track draws against blanket orders (like your door hardware supplier) so you know how much is left on the PO.

**Photo Documentation** — Attach photos to receiving logs (e.g., snap a picture of a delivery for damage verification).

---

## Key Design Principles

These principles are based on the specific challenges you described:

1. **Dead simple UI.** The Shop Foreman needs to be able to check out materials on a tablet in under 30 seconds. If it's slower or more confusing than the paper form, it won't get used. Big buttons, minimal typing, smart defaults.

2. **Mobile-first.** Every screen must work on a phone. The Foreman is on the shop floor, not at a desk.

3. **Forgiveness over rigidity.** People will make mistakes. The app should make it easy to correct errors (adjustments, undo checkouts) rather than requiring perfect data entry.

4. **Templates reduce friction.** Standard doors, common BOMs, frequent products — the app should remember patterns and pre-fill wherever possible.

5. **Offline tolerance.** Your shop may not have perfect WiFi everywhere. The app should handle brief connectivity drops gracefully (queue transactions and sync when back online).

6. **Auditability.** Every change is logged with who, what, and when. This protects against disputes and supports accurate job costing.

---

## Getting Started — What You'll Need

Before development begins, here are the things to prepare:

1. **Material catalog** — A spreadsheet (or even a list) of all materials you stock: name, category, unit of measure, typical cost, and where it's stored. This becomes your seed data.

2. **Assembly templates** — The Knowify templates for your standard door types and panel types. We'll recreate these as assembly recipes in the app.

3. **Reorder points** — For each material, a rough threshold for "we should order more." This can be refined later using actual usage data.

4. **A GitHub account** — Free. This is where the code lives and how it gets deployed to Vercel.

5. **A Supabase account** — Free tier. This is your database and authentication layer.

6. **A Vercel account** — Free tier. This is where the app is hosted.

---

## Estimated Timeline & Effort

| Phase | Duration | What's Delivered |
|-------|----------|-----------------|
| Phase 1 — Foundation | Weeks 1–2 | Product catalog, stock levels, alerts, mobile UI |
| Phase 2 — BOM Workflow | Weeks 3–4 | Digital BOMs, checkout/return, receiving, audit trail |
| Phase 3 — Assemblies | Weeks 5–6 | Fabrication tracking, door sheets, finished goods inventory |
| Phase 4 — Reporting | Weeks 7–8 | Valuation, forecasting, analytics, export |

This assumes building with Claude Code as your development assistant, working on it part-time (~10–15 hours/week). If you're able to dedicate more time, phases could compress. The app is usable after each phase — you don't have to wait until the end to start getting value.

---

## Risk Factors & Mitigations

| Risk | Mitigation |
|------|------------|
| Team doesn't adopt the tool | Start with Foreman only. Keep it simpler than paper. Get his buy-in early by involving him in testing. |
| Data entry feels like extra work | Templates, defaults, and fast checkout flows minimize friction. Material checkout should be faster than paper. |
| Inaccurate initial data | Do one careful physical count to seed the system, then use cycle counts to maintain accuracy. |
| Knowify data still needs manual sync | Phase 4 includes CSV export. Full integration is a future phase once the core app proves its value. |
| WiFi coverage in the shop | Build offline-tolerant checkout flow that queues and syncs. Consider a basic mesh WiFi setup if needed. |

---

*This plan is a living document. As development progresses, we'll refine scope and priorities based on what's working and what the team needs.*
