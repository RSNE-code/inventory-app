# AI Module & Door Sheet System

## AI Module (`src/lib/ai/`)
- **`parse.ts`** — Core AI parsing: text->structured items, image->structured items (uses Claude via Vercel AI SDK `generateObject`)
- **`parse-door-specs.ts`** — Door spec AI parser: voice/text->structured door specifications + gap questions (25+ fields matching real RSNE door sheets)
- **`catalog-match.ts`** — Fuzzy matching of parsed items against the product catalog (token-based + abbreviation expansion)
- **`types.ts`** — `ParsedLineItem`, `CatalogMatch`, `ParseResult`, `ReceivingParseResult`
- **API routes:** `POST /api/ai/parse` (text), `POST /api/ai/parse-image` (photo/FormData), `POST /api/ai/parse-door-specs` (door spec text)
- **UI components:** `AIInput` (text + voice + camera input bar), `ConfirmationCard`/`ConfirmationList` (shows AI results for user confirmation)
- **Door components (`src/components/doors/`):** `DoorSpecSheet` (full engineering spec view), `DoorManufacturingSheet` (clipboard-style shop view), `DoorCreationFlow` (AI conversational door creation)
- **Voice hook:** `useVoiceInput` in `src/hooks/use-voice-input.ts` (Web Speech API)

## Door Sheet System
- **Two-document flow:** SM/OM describes door via AI -> Door Spec Sheet (approval) -> Door Manufacturing Sheet (shop floor)
- **Spec fields:** `src/lib/door-specs.ts` — DoorSpecs interface (25+ fields), gap detection, field metadata
- **Door categories:** Hinged Cooler, Hinged Freezer, Manual Horizontal Sliding
- **Role-aware views:** Door shop sees manufacturing sheet by default, managers see spec sheet. Toggle between views.
- **Specs stored as JSON** in Assembly.specs field — no schema migration needed
