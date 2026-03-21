# Project Status

## Phase Summary
- **Phase 1 (Foundation):** Complete — dashboard, inventory CRUD, stock adjustments, login, settings
- **Phase 2A (Shop Unit):** Complete — dual-unit display system (shopUnit field + dimension-based conversion)
- **Phase 2B (Material Checkout):** Rebuilt AI-first (see Step 4 below)

## AI-First Redesign
Complete — see `plans/2026-03-07-ai-first-redesign.md`

- **Step 1 (AI Input Foundation):** Complete — parsing, catalog matching, voice, photo, confirmation UI
- **Step 2 (Receiving WF1):** Complete — AI-first receiving with photo/voice/text, supplier auto-match, confirmation cards, receipt summary
- **Step 3 (BOM Creation WF2):** Complete — AI-first BOM builder with voice/text/photo, stock status, tier classification, confirmation cards
- **Step 4 (Checkout & Returns WF3-5):** Complete — CheckoutAllButton, AI voice/text additions, return mode
- **Step 5 (Fabrication WF6-8):** Complete — Door Shop Queue, Fabrication Queue, assembly creation with templates, digital door sheet, approval flow, production tracking, material deduction on build start
- **Step 6 (Intelligence WF9-10):** Complete — dashboard alerts (stock, approvals, cycle counts), fabrication status cards, AI-guided cycle counts with variance tracking

## PO Match & Receiving
- **PO Seed:** 375 Knowify POs loaded (header-level, no line items yet)
- **PO Match:** Auto-match from packing slip photo (PO number, vendor, amount)
- **Receiving Flow:** 4-step when PO detected (Input → PO Match → Review → Summary)
- **Receipt ↔ PO linking:** Receipts link to POs via purchaseOrderId for traceability
- See `plans/2026-03-11-po-match-receiving.md`

## Native App (Capacitor)
- **Status:** Configured — iOS and Android projects initialized, plugins installed
- **Architecture:** Thin native wrapper loading the deployed Vercel URL in a WebView
- **Plugins:** Push Notifications, Camera, Haptics, Status Bar, Splash Screen
- **iOS permissions:** Camera, Microphone, Speech Recognition configured in Info.plist
- **Android permissions:** Camera, Record Audio, Post Notifications configured in AndroidManifest.xml
- **Next steps:** Install full Xcode for simulator testing, set up Apple/Google developer accounts for store distribution
- See `plans/2026-03-19-capacitor-native-app.md`

## Deployment
- **Live at:** inventory-app-three-tan.vercel.app (Phase 1 + 2A only; AI-first redesign ready to deploy)
