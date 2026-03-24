// Types shared across all AI parsing features

export interface ParsedLineItem {
  rawText: string
  name: string
  quantity: number
  unitOfMeasure: string
  category?: string
  dimensions?: {
    length?: number
    lengthUnit?: string
    width?: number
    widthUnit?: string
    thickness?: number
    thicknessUnit?: string
  }
  finish?: string
  material?: string
  specs?: Record<string, string>
  estimatedCost?: number
  confidence: number // 0-1, how confident the AI is in the parse
}

export interface CatalogMatch {
  parsedItem: ParsedLineItem
  matchedProduct: {
    id: string
    name: string
    sku: string | null
    unitOfMeasure: string
    currentQty: number
    tier: string
    categoryName: string
    lastCost: number
    avgCost: number
    reorderPoint: number
    dimLength: number | null
    dimLengthUnit: string | null
    dimWidth: number | null
    dimWidthUnit: string | null
  } | null
  matchConfidence: number // 0-1
  /** Confidence tier for UI rendering: auto (green), suggested (blue), flagged (orange), none (gray) */
  matchTier?: "auto" | "suggested" | "flagged" | "none"
  isNonCatalog: boolean
  alternativeMatches?: {
    id: string
    name: string
    matchConfidence: number
  }[]
  /** Assembly template ID if matched to a fabrication item (door, slider, floor, etc.) */
  assemblyTemplateId?: string
  /** Panel specs extracted from AI parse — brand-agnostic, decided at checkout */
  panelSpecs?: {
    type: "panel"
    thickness: number
    cutLengthFt: number
    cutLengthDisplay: string
    widthIn: number
    profile: string
    color: string
  }
}

export interface ParseResult {
  items: CatalogMatch[]
  rawInput: string
  inputType: "text" | "voice" | "image"
}

export interface ReceivingParseResult extends ParseResult {
  supplier?: string
  supplierId?: string
  poNumber?: string
  poId?: string
  deliveryDate?: string
}

export interface ConfirmedBomItem {
  productId: string | null
  productName: string
  sku: string | null
  unitOfMeasure: string
  tier: "TIER_1" | "TIER_2"
  qtyNeeded: number
  isNonCatalog: boolean
  nonCatalogName: string | null
  nonCatalogCategory: string | null
  nonCatalogUom: string | null
  nonCatalogEstCost: number | null
  currentQty: number
  reorderPoint: number
  dimLength: number | null
  dimLengthUnit: string | null
  dimWidth: number | null
  dimWidthUnit: string | null
  catalogMatch: CatalogMatch
}

export interface POLineItemData {
  id: string
  description: string
  sku: string | null
  productId: string | null
  productName: string | null
  qtyOrdered: number
  qtyReceived: number
  unitCost: number
}

export interface POReceiptHistoryItem {
  id: string
  receivedAt: string
  isVoided: boolean
  items: Array<{
    productName: string
    quantity: number
    unitCost: number | null
  }>
}

export interface MatchedPO {
  id: string
  poNumber: string
  supplierName: string
  supplierLogoUrl: string | null
  supplierId: string
  amount: number | null
  jobName: string | null
  clientName: string | null
  createdAt: string
  confidence: number // 0-1
  lineItems: POLineItemData[]
  receipts?: POReceiptHistoryItem[]
}

export interface ConfirmedReceivingItem {
  productId: string | null
  productName: string
  quantity: number
  unitCost: number
  unitOfMeasure: string
  isNonCatalog: boolean
  catalogMatch?: CatalogMatch
  poLineItemId?: string
  // Panel breakout fields (set when item comes from panel breakout)
  isPanelBreakout?: boolean
  panelHeight?: number
  panelBrand?: string
  panelThickness?: number
  panelColor?: string
  panelWidth?: number
  panelProfile?: string
}
