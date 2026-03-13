export type { StockStatus } from "@/lib/utils"

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface StockSummary {
  totalProducts: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
}

export interface DashboardAlert {
  type: string
  title: string
  message: string
  link?: string
}

export interface FabricationSummary {
  pendingApprovals: number
  inProduction: number
  completed: number
}

export interface DashboardData {
  summary: StockSummary
  lowStockItems: LowStockItem[]
  recentTransactions: RecentTransaction[]
  activeBomCount: number
  alerts: DashboardAlert[]
  fabrication: FabricationSummary
}

export interface LowStockItem {
  id: string
  name: string
  currentQty: number
  reorderPoint: number
  unitOfMeasure: string
  shopUnit?: string | null
  dimLength?: number | null
  dimLengthUnit?: string | null
  dimWidth?: number | null
  dimWidthUnit?: string | null
  categoryName: string
}

export interface RecentTransaction {
  id: string
  type: string
  productName: string
  quantity: number
  userName: string
  createdAt: string
}

// ─── BOM Types ───

export interface BomLineItemData {
  id?: string
  productId?: string | null
  tier: "TIER_1" | "TIER_2"
  qtyNeeded: number
  isNonCatalog: boolean
  nonCatalogName?: string | null
  nonCatalogCategory?: string | null
  nonCatalogUom?: string | null
  nonCatalogEstCost?: number | null
  product?: {
    id: string
    name: string
    sku: string | null
    unitOfMeasure: string
    currentQty: number
  } | null
  qtyCheckedOut?: number
  qtyReturned?: number
}

export interface BomWithDetails {
  id: string
  jobName: string
  jobNumber: string | null
  status: string
  jobStartDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
  approvedAt: string | null
  lineItems: BomLineItemData[]
  _count?: { lineItems: number }
}

// ─── Receiving Types ───

export interface SupplierBasic {
  id: string
  name: string
  website: string | null
  logoUrl: string | null
  contactInfo: string | null
}

export interface ReceiptItem {
  productId: string
  productName?: string
  quantity: number
  unitCost: number
}

export interface ReceiptWithDetails {
  id: string
  supplierId: string
  supplier: { name: string }
  notes: string | null
  receivedAt: string
  transactions: {
    id: string
    quantity: number
    unitCost: number | null
    product: { name: string }
  }[]
}
