# LLM Integration Architecture

## Design Philosophy

1. **Structured data → LLM reasoning.** LLM reads from DB, reasons, returns structured suggestions. Never writes to DB directly — generates recommendations that user confirms.
2. **API-mediated access.** All LLM calls via server-side `/api/ai/*` routes. Client never calls Anthropic API directly. Enables rate limiting, cost control, prompt versioning, model swapping.
3. **Tool-use pattern.** Define tools as database queries (`get_product_stock`, `get_upcoming_bom_demand`). LLM picks which data it needs, calls tools, synthesizes response.

## LLM-Mediated Input (`lib/llm-input.ts`)

The primary input method for BOM building (WF2), checkout additions (WF3), and additional pickups (WF4).

**Three input paths, one output format:**

```typescript
interface ParsedLineItem {
  // Catalog match
  productId?: string;
  productName?: string;
  sku?: string;

  // Non-catalog
  isNonCatalog: boolean;
  nonCatalogName?: string;       // "4\" Galvalume Angle Trim"
  nonCatalogCategory?: string;
  nonCatalogSpecs?: Record<string, string>; // { dimension, finish, shape }
  nonCatalogUom?: string;
  nonCatalogEstCost?: number;

  // Common
  quantity: number;
  unitOfMeasure: string;
  tier: 'TIER_1' | 'TIER_2';
  confidence: number;            // 0-1
  clarificationNeeded?: string;  // If ambiguous

  // Assembly
  isAssembly: boolean;
  assemblyTemplateId?: string;
}
```

**POST /api/ai/parse-input**
- Input: `{ text: string, context?: 'bom' | 'checkout' | 'pickup' }`
- Output: `{ items: ParsedLineItem[], clarifications: ClarificationQuestion[] }`
- LLM receives: raw text + full product catalog + assembly catalog + context
- Returns structured items rendered as confirmation cards in the UI

**Input paths:**
1. **Voice:** Web Speech API → transcription → `/api/ai/parse-input`
2. **Typed:** User types naturally → `/api/ai/parse-input`
3. **Catalog browse:** Manual selection → `ParsedLineItem` directly (no LLM)

All three produce identical `ParsedLineItem[]`. UI renders them as confirmation cards (✓ confirm / ✎ edit).

## React Hook (`hooks/use-llm-input.ts`)

Unified hook that manages:
- Voice recording state (via `use-voice.ts` wrapping Web Speech API)
- Text input state
- API call to `/api/ai/parse-input`
- Parsed results as confirmation cards
- Edit/remove/confirm per card
- Final confirmed items ready for submission

## Features by Phase

### Phase 2: Core Input
- **`POST /api/ai/parse-input`** — Voice/text → structured line items. Most important LLM feature.
- **`POST /api/ai/suggest-po`** — During receiving (WF1), suggests most likely PO based on supplier + expected delivery date.

### Phase 3: Assembly Intelligence
- **`POST /api/ai/suggest-components`** — Custom assembly (WF7): suggests component list based on specs + similar templates.

### Phase 4: Intelligence Layer
- **`POST /api/ai/search`** — NL inventory search. "How many 4-inch panels?" → structured query → results.
- **`POST /api/ai/reorder-reasoning`** — Takes deterministic forecast data, returns plain-English explanations displayed as "AI Analysis" cards.
- **`POST /api/ai/analyze`** — Anomaly detection: unusual spikes, BOMs with no returns, frequent receiving.

## Future (Post-MVP, Architecture-Ready)

- **Conversational BOM creation:** "Create a BOM for a 10x12 walk-in cooler at ABC Corp" → full materials list from historical patterns
- **Photo-based receiving:** Packing slip photo → OCR + LLM → pre-filled receiving form
- **Predictive ordering:** Seasonal patterns + job pipeline + market conditions → optimal order timing
- **Natural language reports:** "What did we spend on door hardware last quarter?" → query + formatted answer

Architecture supports all of these via clean APIs, structured data, and server-side tool-use LLM access.
