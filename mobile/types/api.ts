/**
 * API response types — matches the Next.js API endpoint contracts.
 */

// ── Dashboard ──

export interface DashboardAlert {
  type: "critical" | "warning" | "info";
  label: string;
  count: number;
  href: string;
}

export interface DashboardData {
  summary: {
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  lowStockItems: LowStockItem[];
  recentTransactions: RecentTransaction[];
  activeBomCount: number;
  bomStatusCounts: Record<string, number>;
  alerts: DashboardAlert[];
  fabrication: {
    pendingApprovals: number;
    inProduction: number;
    completed: number;
  };
}

export interface LowStockItem {
  id: string;
  name: string;
  currentQty: number;
  reorderPoint: number;
  unit: string;
}

export interface RecentTransaction {
  id: string;
  productName: string;
  type: string;
  quantity: number;
  userName: string;
  createdAt: string;
}

// ── Inventory ──

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  categoryId: string | null;
  currentQty: number;
  reorderPoint: number;
  unit: string;
  shopUnit: string | null;
  location: string | null;
  tier: number;
  unitCost: number;
  totalValue: number;
  dimensions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

// ── BOMs ──

export type BomStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Bom {
  id: string;
  jobName: string;
  jobNumber: string | null;
  status: BomStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { lineItems: number };
}

export interface BomLineItem {
  id: string;
  bomId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  checkedOutQty: number;
  unit: string;
  isCustom: boolean;
  product?: Product;
}

export interface BomWithDetails extends Bom {
  lineItems: BomLineItem[];
}

// ── Assemblies ──

export type AssemblyStatus =
  | "PLANNED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "IN_PRODUCTION"
  | "COMPLETED"
  | "SHIPPED";

export type AssemblyType = "DOOR" | "PANEL" | "FLOOR" | "RAMP";

export interface Assembly {
  id: string;
  name: string;
  type: AssemblyType;
  status: AssemblyStatus;
  priority: number;
  jobName: string | null;
  jobNumber: string | null;
  specs: Record<string, unknown> | null;
  templateId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Receiving ──

export interface Receipt {
  id: string;
  supplierName: string;
  supplierId: string | null;
  purchaseOrderId: string | null;
  notes: string | null;
  totalAmount: number;
  createdAt: string;
  _count?: { lineItems: number };
}

export interface ReceiptLineItem {
  id: string;
  receiptId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitCost: number;
  unit: string;
}

// ── Suppliers & POs ──

export interface Supplier {
  id: string;
  name: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

// ── Jobs ──

export interface Job {
  id: string;
  name: string;
  number: string | null;
}

// ── Cycle Counts ──

export interface CycleCountSuggestion {
  productId: string;
  productName: string;
  currentQty: number;
  unit: string;
  location: string | null;
  reason: string;
}

export interface CycleCount {
  id: string;
  productId: string;
  productName: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
  reason: string | null;
  countedBy: string;
  createdAt: string;
}

// ── Pagination ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
